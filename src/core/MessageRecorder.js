import { getDataService } from './DataService.js';
import { AchievementService } from './AchievementService.js';
import { globalConfig } from './ConfigManager.js';
import { TimeUtils } from './utils/TimeUtils.js';
import { AchievementUtils } from './utils/AchievementUtils.js';
import { ErrorHandler } from './utils/ErrorHandler.js';

/**
 * 消息记录处理类
 * 负责监听群消息并更新用户统计数据
 */
class MessageRecorder {
    constructor(dataService = null) {
        this.dataService = dataService || getDataService();
        this.achievementService = null; // 延迟加载
        this.batchWriteQueue = new Map(); // 批量写入队列
        this.batchWriteTimer = null; // 批量写入定时器
        this.maxBatchSize = 50; // 最大批量大小
        this.batchWriteInterval = 2000; // 批量写入间隔（毫秒）
        this.achievementCheckQueue = new Set(); // 成就检查队列
        this.achievementCheckTimer = null; // 成就检查定时器
        this.isProcessingAchievements = false; // 是否正在处理成就检查（严格的单例锁）
        this.processingPromise = null; // 正在处理的 Promise（用于确保真正的单例）
        this.processedLogTimes = new Set(); // 已处理的日志时间戳集合（用于去重，包括消息统计和成就解锁）
        this.recentMessageTexts = new Map(); // 最新消息文本缓存（1分钟内，用于成就检查）
        this.processedMessages = new Set(); // 已处理的消息ID集合（用于去重）
        this.recordMessageLock = false; // 记录消息的锁（防止并发处理）
        this.messageQueue = []; // 消息队列（用于处理并发情况下的消息）
        this.isProcessingQueue = false; // 是否正在处理消息队列
        this.failureCount = 0; // 失败计数
        this.maxFailures = 100; // 最大失败次数（达到后进入降级模式）
        this.degradedMode = false; // 降级模式标志
        this.lastFailureTime = 0; // 最后失败时间
        this.degradedModeResetInterval = 5 * 60 * 1000; // 5分钟后尝试退出降级模式
        
        // 设置消息记录器引用到数据服务
        this.dataService.setMessageRecorder(this);
    }

    /**
     * 获取成就服务实例（延迟加载）
     * @returns {AchievementService|null} 成就服务实例
     */
    getAchievementService() {
        // 检查成就系统是否启用
        if (!globalConfig.getConfig('achievements.enabled')) {
            return null;
        }

        // 如果还没有创建实例，则创建
        if (!this.achievementService) {
            this.achievementService = new AchievementService(this.dataService);
        }

        return this.achievementService;
    }

    /**
     * 根据稀有度获取对应的颜色函数
     * @param {string} rarity 稀有度
     * @returns {Function} chalk 颜色函数
     */
    getRarityColor(rarity) {
        // 安全检查：确保 global.logger 存在且有所需方法
        const logger = global.logger;
        const hasLogger = logger && typeof logger === 'object';
        
        // 默认函数：如果 logger 不存在或方法不存在，返回原字符串
        const defaultColor = (text) => text;
        
        // 安全获取颜色方法
        const getColorMethod = (methodName, fallback = defaultColor) => {
            if (hasLogger && typeof logger[methodName] === 'function') {
                try {
                    return logger[methodName].bind(logger);
                } catch (error) {
                    globalConfig.error(`[MessageRecorder] 获取颜色方法 ${methodName} 失败:`, error);
                    return fallback;
                }
            }
            return fallback;
        };
        
        const colorMap = {
            common: getColorMethod('gray', defaultColor),
            uncommon: getColorMethod('green', defaultColor),
            rare: getColorMethod('blue', defaultColor),
            epic: getColorMethod('magenta', defaultColor),
            legendary: getColorMethod('yellow', defaultColor),
            mythic: getColorMethod('red', defaultColor),
            festival: getColorMethod('red', defaultColor),
            special: (hasLogger && typeof logger.rainbow === 'function') 
                ? getColorMethod('rainbow', defaultColor)
                : getColorMethod('cyan', defaultColor)
        };
        
        return colorMap[rarity?.toLowerCase()] || colorMap.common;
    }

    /**
     * 记录消息
     * @param {Object} e 消息事件对象
     * @returns {Promise<void>}
     */
    async recordMessage(e) {
        // 先进行消息去重检查（在加锁之前，避免不必要的锁竞争）
        let messageId = null;
        if (e.message_id) {
            messageId = `msg_${e.message_id}`;
        } else if (e.seq) {
            messageId = `seq_${e.seq}`;
        } else if (e.time && e.group_id && e.sender?.user_id) {
            // 使用时间戳+群ID+用户ID+毫秒时间戳（确保唯一性）
            const uniqueTime = e.time.toString() + (Date.now() % 1000000).toString();
            messageId = `time_${e.group_id}_${e.sender.user_id}_${uniqueTime}`;
        } else {
            // 如果所有标识都不存在，使用群ID+用户ID+时间戳+随机数组合（确保唯一性）
            const uniqueId = `${e.group_id || 'unknown'}_${e.sender?.user_id || 'unknown'}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            messageId = `fallback_${uniqueId}`;
        }
        
        // 如果消息ID为空，生成一个备用ID（不应该发生，但为了安全）
        if (!messageId) {
            messageId = `unknown_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        }
        
        // 检查是否已处理过（使用消息ID去重）
        if (this.processedMessages.has(messageId)) {
            return;
        }
        
        // 检查基本条件（在入队前检查，避免无效消息入队）
        // 检查是否启用消息记录
        if (!globalConfig.getConfig('global.recordMessage')) {
            return;
        }

        // 只处理群消息
        if (!e.group_id || !e.sender || !e.sender.user_id) {
            return;
        }

        const groupId = String(e.group_id);
        
        // 检查群组是否已归档，如果是则恢复（异步执行，不阻塞消息处理）
        // 使用缓存优化：避免每次消息都查询数据库
        if (!this.archivedGroupsCache) {
            this.archivedGroupsCache = new Map(); // 缓存已归档的群组ID
            this.archivedGroupsCacheTime = new Map(); // 缓存时间戳
            
            // 定期清理过期缓存（每10分钟清理一次）
            if (!this.archivedGroupsCacheCleanupTimer) {
                this.archivedGroupsCacheCleanupTimer = setInterval(() => {
                    this.cleanupArchivedGroupsCache();
                }, 10 * 60 * 1000); // 10分钟
            }
        }
        
        // 检查缓存（5分钟TTL）
        const cacheKey = groupId;
        const cachedTime = this.archivedGroupsCacheTime.get(cacheKey) || 0;
        const cacheTTL = 5 * 60 * 1000; // 5分钟
        const isCached = Date.now() - cachedTime < cacheTTL;
        
        if (isCached && this.archivedGroupsCache.has(cacheKey)) {
            // 从缓存中获取归档状态
            const isArchived = this.archivedGroupsCache.get(cacheKey);
            if (isArchived) {
                // 恢复归档的群组（先恢复，成功后再更新活动时间）
                this.dataService.restoreGroupStats(groupId).then(() => {
                    // 恢复成功，清除缓存
                    this.archivedGroupsCache.delete(cacheKey);
                    this.archivedGroupsCacheTime.delete(cacheKey);
                    
                    if (globalConfig.getConfig('global.debugLog')) {
                        globalConfig.debug(`[消息记录] 检测到归档群组 ${groupId} 有新消息，已自动恢复`);
                    }
                }).catch(error => {
                    // 恢复失败，至少更新活动时间延长保留期
                    this.dataService.dbService.updateArchivedGroupActivity(groupId)
                        .catch(ErrorHandler.createNonCriticalHandler('消息记录-更新活动时间'));
                    globalConfig.error(`[消息记录] 恢复归档群组失败: ${groupId}`, error);
                });
            }
        } else {
            // 缓存未命中或过期，查询数据库
            this.dataService.isGroupArchived(groupId).then(isArchived => {
                // 更新缓存
                this.archivedGroupsCache.set(cacheKey, isArchived);
                this.archivedGroupsCacheTime.set(cacheKey, Date.now());
                
                if (isArchived) {
                    // 恢复归档的群组（先恢复，成功后再更新活动时间）
                    this.dataService.restoreGroupStats(groupId).then(() => {
                        // 恢复成功，清除缓存
                        this.archivedGroupsCache.delete(cacheKey);
                        this.archivedGroupsCacheTime.delete(cacheKey);
                        
                        if (globalConfig.getConfig('global.debugLog')) {
                            globalConfig.debug(`[消息记录] 检测到归档群组 ${groupId} 有新消息，已自动恢复`);
                        }
                    }).catch(error => {
                        // 恢复失败，至少更新活动时间延长保留期
                        this.dataService.dbService.updateArchivedGroupActivity(groupId)
                            .catch(ErrorHandler.createNonCriticalHandler('消息记录-更新活动时间'));
                        globalConfig.error(`[消息记录] 恢复归档群组失败: ${groupId}`, error);
                    });
                }
            }).catch(error => {
                // 静默处理错误，不影响消息记录
                if (globalConfig.getConfig('global.debugLog')) {
                    globalConfig.debug(`[消息记录] 检查群组归档状态失败: ${groupId}`, error);
                }
            });
        }

        // 如果正在处理消息，将消息加入队列（而不是直接跳过）
        // 这样可以确保所有消息都会被处理，只是顺序可能稍有延迟
        if (this.recordMessageLock) {
            // 将消息加入队列，等待处理
            this.messageQueue.push({ e, messageId });
            // 如果队列处理未启动，启动队列处理
            if (!this.isProcessingQueue) {
                this.processQueue();
            }
            return;
        }
        
        // 设置锁（立即处理消息）
        this.recordMessageLock = true;
        
        try {
            // 再次检查消息ID（防止在锁竞争期间消息被重复处理）
            if (this.processedMessages.has(messageId)) {
                return; // 已处理过，直接返回
            }

            // 标记为已处理（保留最近2000条消息的ID，避免内存泄漏）
            this.processedMessages.add(messageId);
            if (this.processedMessages.size > 2000) {
                // 清理一半的旧记录，保持内存占用合理
                const keysToDelete = Array.from(this.processedMessages).slice(0, 1000);
                keysToDelete.forEach(key => this.processedMessages.delete(key));
            }

            const groupId = String(e.group_id);
            const userId = String(e.sender.user_id);
            const nickname = e.sender.card || e.sender.nickname || '未知用户';

            // 获取并保存群信息（如果有群名称）
            const groupName = e.group?.name;
            if (groupName) {
                try {
                    await this.dataService.dbService.saveGroupInfo(groupId, groupName);
                } catch (error) {
                    // 静默处理，不影响消息记录
                    if (globalConfig.getConfig('global.debugLog')) {
                        globalConfig.debug(`保存群信息失败: group_id=${groupId}`, error);
                    }
                }
            }

            // 提取消息文本
            const messageText = this.extractMessageText(e);
            
            // 获取消息时间戳（用于日志去重和 Redis 存储）
            const messageTime = e.time || Date.now();
            
            // 保存最新消息文本（用于成就检查）
            this.saveRecentMessageText(groupId, userId, messageText);

            // 计算消息字数
            let wordCount = 0;
            if (globalConfig.getConfig('global.enableWordCount')) {
                wordCount = this.calculateWordCount(messageText);
            }
            
            // 使用已计算的 messageId 作为日志去重的唯一标识
            const logMessageId = messageId;
            
            // 如果在降级模式，跳过统计更新（但仍记录错误）
            if (this.degradedMode) {
                return;
            }

            // 更新用户统计（传递消息ID用于日志去重）
            await this.dataService.updateUserStats(groupId, userId, nickname, wordCount, messageTime, logMessageId);
            
            // 成功处理，重置失败计数（每次成功减少1，避免累积过多）
            if (this.failureCount > 0) {
                this.failureCount = Math.max(0, this.failureCount - 1);
            }
            
            // 调试日志：仅在调试模式下输出（减少日志噪音）
            // 消息成功记录的信息已经通过水群统计日志输出，这里不需要重复

            // 添加到成就检查队列
            if (globalConfig.getConfig('achievements.enabled')) {
                this.addToAchievementCheck(groupId, userId);
            }
        } catch (error) {
            this.failureCount++;
            this.lastFailureTime = Date.now();
            
            // 如果失败次数过多，进入降级模式
            if (this.failureCount >= this.maxFailures && !this.degradedMode) {
                this.degradedMode = true;
                globalConfig.warn(`[消息记录] 失败次数过多 (${this.failureCount})，进入降级模式（仅记录错误，不更新统计）`);
            }
            
            // 在降级模式下，只记录错误，不抛出异常
            if (this.degradedMode) {
                globalConfig.warn(`[消息记录] 降级模式: 记录消息失败: ${messageId}, user_id=${e.sender?.user_id}, group_id=${e.group_id}`, error.message);
            } else {
                globalConfig.error(`记录消息失败: ${messageId}, user_id=${e.sender?.user_id}, group_id=${e.group_id}`, error);
            }
            
            // 尝试退出降级模式（如果距离最后失败时间超过重置间隔）
            if (this.degradedMode && Date.now() - this.lastFailureTime > this.degradedModeResetInterval) {
                this.degradedMode = false;
                this.failureCount = 0;
                globalConfig.mark('[消息记录] 退出降级模式，恢复正常处理');
            }
        } finally {
            // 释放锁（必须在 finally 中执行，确保锁被释放）
            this.recordMessageLock = false;
            
            // 处理队列中的消息
            if (this.messageQueue.length > 0 && !this.isProcessingQueue) {
                this.processQueue();
            }
        }
    }

    /**
     * 处理消息队列（按顺序处理队列中的消息）
     */
    async processQueue() {
        // 如果正在处理队列或队列为空，直接返回
        if (this.isProcessingQueue || this.messageQueue.length === 0) {
            return;
        }
        
        // 设置队列处理标志
        this.isProcessingQueue = true;
        
        try {
            // 循环处理队列中的消息
            while (this.messageQueue.length > 0) {
                // 如果正在处理其他消息，等待一小段时间后再试
                if (this.recordMessageLock) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    continue;
                }
                
                // 从队列中取出一个消息
                const item = this.messageQueue.shift();
                if (!item) {
                    break;
                }
                
                // 检查是否已处理过
                if (this.processedMessages.has(item.messageId)) {
                    continue; // 跳过已处理的消息
                }
                
                // 递归调用 recordMessage 处理消息（这次会立即处理，因为锁已释放）
                await this.recordMessage(item.e);
            }
        } catch (error) {
            globalConfig.error('处理消息队列失败:', error);
        } finally {
            // 清除队列处理标志
            this.isProcessingQueue = false;
        }
    }

    /**
     * 提取消息文本
     * @param {Object} e 消息事件对象
     * @returns {string} 消息文本
     */
    extractMessageText(e) {
        if (!e.msg) return '';

        // 处理不同类型的消息
        if (typeof e.msg === 'string') {
            return e.msg;
        }

        // 处理数组格式的消息（可能包含图片、表情等）
        if (Array.isArray(e.msg)) {
            return e.msg
                .filter(item => item.type === 'text')
                .map(item => item.text || '')
                .join('');
        }

        // 处理对象格式的消息
        if (typeof e.msg === 'object' && e.msg.text) {
            return e.msg.text;
        }

        return '';
    }

    /**
     * 保存最新消息文本（用于成就检查）
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} text 消息文本
     */
    saveRecentMessageText(groupId, userId, text) {
        const key = `recent_text_${groupId}_${userId}`;
        const now = Date.now();
        
        // 确保 recentMessageTexts 存在
        if (!this.recentMessageTexts) {
            this.recentMessageTexts = new Map();
        }
        
        // 保存最新消息（用于成就检查，只保留1分钟）
            this.recentMessageTexts.set(key, {
                text: text,
            timestamp: now
        });
        
    }

    /**
     * 获取最新消息文本（用于成就检查）
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {string} 最新消息文本
     */
    getRecentMessageText(groupId, userId) {
        const key = `recent_text_${groupId}_${userId}`;
        if (this.recentMessageTexts && this.recentMessageTexts.has(key)) {
            const data = this.recentMessageTexts.get(key);
            // 只返回1分钟内的消息
            if (Date.now() - data.timestamp < 60 * 1000) {
                return data.text;
            }
        }
        return '';
    }
    

    /**
     * 计算消息字数
     * @param {string} text 消息文本
     * @returns {number} 字数
     */
    calculateWordCount(text) {
        if (!text || typeof text !== 'string') return 0;

        const textStr = String(text);
        
        // 快速检测：空字符串或只包含空白字符
        if (textStr.trim().length === 0) return 0;
        
        // 检测特殊消息类型（卡片消息、聊天记录等），这些消息只计算为1个字
        if (this.isSpecialMessage(textStr)) {
            return 1;
        }
        
        // 优化：使用正则表达式一次性匹配所有非空白字符，提高性能
        // 中文字符按1个字计算，其他非空白字符按1个字计算
        // 空白字符（空格、制表符、换行等）不计算
        const nonWhitespacePattern = /\S/g;
        
        // 统计所有非空白字符数量（包括中文、英文、数字、符号等）
        const matches = textStr.match(nonWhitespacePattern);
        return matches ? matches.length : 0;
    }

    /**
     * 检测是否为特殊消息类型（卡片消息、聊天记录等）
     * 这些消息包含大量JSON结构，应该只计算为1个字
     * @param {string} text 消息文本
     * @returns {boolean} 是否为特殊消息
     */
    isSpecialMessage(text) {
        if (!text || typeof text !== 'string' || text.length === 0) return false;

        const textStr = String(text);
        const textLength = textStr.length;
        
        // 快速检测：如果文本很短，不可能是JSON消息
        if (textLength < 50) return false;
        
        // 优化：优先检测最常见的特殊消息类型（提前返回，避免不必要的计算）
        // 检测1: QQ小程序卡片消息（最常见）
        if (textStr.includes('"app":"com.tencent.miniapp') || 
            textStr.includes('"app":"com.tencent.miniapp_')) {
            return true;
        }
        
        // 检测2: 聊天记录转发消息
        if (textStr.includes('"app":"com.tencent.multimsg"')) {
            return true;
        }
        
        // 检测3: 包含 "view":"view_" 和 "app":" 的消息（卡片消息特征）
        if (textStr.includes('"view":"view_') && textStr.includes('"app":"')) {
            return true;
        }
        
        // 如果已经检测到明确的特殊消息类型，直接返回
        // 否则继续检测JSON结构特征（需要统计大括号）
        
        // 统计 { 和 } 的数量（使用单次遍历）
        let openBraces = 0;
        let closeBraces = 0;
        for (let i = 0; i < textLength; i++) {
            const char = textStr[i];
            if (char === '{') openBraces++;
            else if (char === '}') closeBraces++;
        }
        
        // 检测4: 包含大量 {} 结构的消息（JSON格式）
        // 如果包含超过5个 { 或 }，且占文本长度的一定比例，可能是JSON消息
        if (openBraces >= 5 || closeBraces >= 5) {
            const braceRatio = (openBraces + closeBraces) / textLength;
            // 如果大括号占比超过5%，可能是JSON消息
            if (braceRatio > 0.05) {
                return true;
            }
        }
        
        // 检测5: 包含 "meta": 和大量嵌套JSON的消息（卡片消息特征）
        if (textStr.includes('"meta":') && (openBraces >= 3 || closeBraces >= 3)) {
            return true;
        }
        
        // 检测6: 包含 "config": 和 "prompt": 的消息（卡片消息特征）
        if (textStr.includes('"config":') && textStr.includes('"prompt":') && 
            (openBraces >= 3 || closeBraces >= 3)) {
            return true;
        }
        
        return false;
    }

    /**
     * 添加到成就检查队列
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     */
    addToAchievementCheck(groupId, userId) {
        const key = `${groupId}_${userId}`;
        
        // 如果用户已经在队列中，直接返回（Set会自动去重）
        if (this.achievementCheckQueue.has(key)) {
            return;
        }
        
        // 添加到队列
        this.achievementCheckQueue.add(key);

        // 如果正在处理，不需要创建新定时器（队列会被处理）
        if (this.isProcessingAchievements || this.processingPromise) {
            return;
        }

        // 如果已经有定时器，不需要创建新定时器
        if (this.achievementCheckTimer) {
            return;
        }

        // 创建定时器（延迟1秒执行，批量处理）
        // 使用定时器引用确保只有一个定时器在执行
        const timerRef = setTimeout(() => {
            // 检查定时器是否仍然有效（防止在回调执行前定时器被清除）
            if (this.achievementCheckTimer !== timerRef) {
                return;
            }
            
            // 立即清理定时器
            this.achievementCheckTimer = null;
            
            // 原子性地检查并设置锁（防止并发执行）
            // 关键：先检查处理标志和 Promise，如果任何一个已存在，直接返回
            if (this.isProcessingAchievements || this.processingPromise) {
                // 如果正在处理或已有 Promise，直接返回（不等待，避免阻塞）
                return;
            }
            
            // 立即设置处理标志（在检查后立即设置，减少时间窗口）
            // 这是关键：必须在检查后立即设置，确保原子性
            this.isProcessingAchievements = true;
            
            // 再次检查 Promise（双重检查，防止竞态条件）
            // 如果在设置标志期间，另一个定时器也设置了标志并创建了 Promise
            if (this.processingPromise) {
                // 恢复标志，让已有的 Promise 处理
                this.isProcessingAchievements = false;
                return;
            }
            
            // 原子性地创建 Promise（必须在检查之后立即创建）
            // 这是唯一的执行点，确保只有一个定时器回调能够执行到这里
            this.processingPromise = this._doProcessAchievementChecks();
            
            // 执行 Promise 并清理
            this.processingPromise.finally(() => {
                this.processingPromise = null;
            }).catch(() => {
                // 忽略错误，已在 _doProcessAchievementChecks 中处理
            });
        }, 1000);
        this.achievementCheckTimer = timerRef;
    }

    /**
     * 处理成就检查队列（已废弃：现在由定时器回调直接处理）
     * @deprecated 现在由定时器回调直接调用 _doProcessAchievementChecks
     */
    async processAchievementChecks() {
        // 如果已经有 Promise 在执行，直接返回
        if (this.processingPromise) {
            return;
        }

        // 立即清理定时器，防止多个定时器同时触发
        if (this.achievementCheckTimer) {
            clearTimeout(this.achievementCheckTimer);
            this.achievementCheckTimer = null;
        }

        // 创建处理 Promise，确保同一时间只有一个处理在进行
        this.processingPromise = this._doProcessAchievementChecks();
        
        try {
            await this.processingPromise;
        } finally {
            this.processingPromise = null;
        }
    }

    /**
     * 实际执行成就检查处理（内部方法）
     * @private
     */
    async _doProcessAchievementChecks() {
        // 注意：处理标志已在定时器回调中设置，这里不需要再次设置

        try {
            // 获取队列数据并清空队列（必须在锁内进行，原子操作）
            const queue = Array.from(this.achievementCheckQueue);
            this.achievementCheckQueue.clear();

            // 如果队列为空，直接返回
            if (queue.length === 0) {
                return;
            }

            const achievementService = this.getAchievementService();
            if (!achievementService) {
                return;
            }

            // 去重：同一个用户在同一批处理中只检查一次
            const uniqueKeys = [...new Set(queue)];
            const processedUsers = new Set();
            let totalNewAchievements = 0;

            // 批量检查成就
            for (const key of uniqueKeys) {
                try {
                    const [groupId, userId] = key.split('_');
                    const userKey = `${groupId}_${userId}`;
                    
                    // 避免重复处理同一个用户
                    if (processedUsers.has(userKey)) {
                        continue;
                    }
                    processedUsers.add(userKey);

                    const userData = await this.dataService.getUserData(groupId, userId);

                    if (userData) {
                        const newAchievements = await achievementService.checkAndUpdateAchievements(
                            groupId,
                            userId,
                            userData
                        );

                        if (newAchievements.length > 0) {
                            totalNewAchievements += newAchievements.length;
                            // 输出成就解锁日志（带颜色，带去重）
                            const userNickname = userData?.nickname || userId;
                            
                            // 检查是否需要自动设置显示成就
                            // 规则：史诗及以上成就自动佩戴，使用解锁时间（unlocked_at）作为 auto_display_at
                            let shouldAutoSetDisplay = false;
                            let bestAchievement = null;
                            
                            // 检查当前是否有显示成就（手动或自动）
                            const currentDisplay = await achievementService.dataService.dbService.getDisplayAchievement(groupId, userId);
                            const hasManualDisplay = currentDisplay && currentDisplay.is_manual === true;
                            
                            // 如果没有手动设置的显示成就，检查新解锁的成就是否符合自动佩戴条件
                            // 注意：即使已有自动佩戴的成就，新解锁的更高稀有度成就也会替换
                            if (!hasManualDisplay) {
                                for (const achievement of newAchievements) {
                                    const rarity = achievement.rarity || 'common';
                                    // 检查是否是史诗及以上
                                    if (AchievementUtils.isRarityOrHigher(rarity, 'epic')) {
                                        // 选择稀有度最高的成就，如果稀有度相同，选择最新解锁的
                                        if (!bestAchievement || 
                                            AchievementUtils.compareRarity(rarity, bestAchievement.rarity) > 0 ||
                                            (AchievementUtils.compareRarity(rarity, bestAchievement.rarity) === 0 && 
                                             new Date(achievement.unlockedAt).getTime() > new Date(bestAchievement.unlockedAt).getTime())) {
                                            bestAchievement = achievement;
                                            shouldAutoSetDisplay = true;
                                        }
                                    }
                                }
                            }
                            
                            // 如果符合条件，自动设置为显示成就
                            // 使用解锁时间（unlocked_at）作为 auto_display_at，24小时后自动卸下
                            if (shouldAutoSetDisplay && bestAchievement) {
                                try {
                                    // 获取成就的解锁时间（UTC+8 时区的字符串格式）
                                    const unlockedAt = bestAchievement.unlockedAt || TimeUtils.formatDateTime(TimeUtils.getUTC8Date());
                                    
                                    // 检查是否是全局成就（特殊成就或节日成就）
                                    const isGlobal = AchievementUtils.isGlobalAchievement(bestAchievement.rarity);
                                    
                                    if (isGlobal) {
                                        // 全局成就：在所有群都自动佩戴
                                        const userGroups = await achievementService.dataService.dbService.getUserGroups(userId);
                                        for (const gId of userGroups) {
                                            await achievementService.setDisplayAchievement(
                                                gId,
                                                userId,
                                                bestAchievement.id,
                                                bestAchievement.name || bestAchievement.id,
                                                bestAchievement.rarity || 'common',
                                                false,  // isManual = false，自动佩戴
                                                unlockedAt  // 使用解锁时间作为 auto_display_at
                                            );
                                        }
                                    } else {
                                        // 普通成就：只在当前群自动佩戴
                                    await achievementService.setDisplayAchievement(
                                        groupId,
                                        userId,
                                        bestAchievement.id,
                                        bestAchievement.name || bestAchievement.id,
                                        bestAchievement.rarity || 'common',
                                            false,  // isManual = false，自动佩戴
                                            unlockedAt  // 使用解锁时间作为 auto_display_at
                                    );
                                    }
                                } catch (error) {
                                    globalConfig.error('自动设置显示成就失败:', error);
                                }
                            }
                            
                            newAchievements.forEach(achievement => {
                                const rarity = achievement.rarity || 'common';
                                const rarityColor = this.getRarityColor(rarity);
                                const achievementName = achievement.name || achievement.id;
                                
                                // 生成成就日志唯一标识
                                const achievementLogKey = `achievement_${groupId}_${userId}_${achievement.id}`;
                                
                                // 使用 size 变化判断：先添加，然后通过 size 变化判断是否是我们添加的
                                // 这样可以确保原子性，防止并发问题
                                const sizeBefore = this.processedLogTimes.size;
                                this.processedLogTimes.add(achievementLogKey);
                                const sizeAfter = this.processedLogTimes.size;
                                
                                // 如果大小增加了，说明是我们添加的（之前不存在），应该输出日志
                                if (sizeAfter > sizeBefore) {
                                    // 定期清理旧记录，避免内存泄漏
                                    if (this.processedLogTimes.size > 200) {
                                        const keysArray = Array.from(this.processedLogTimes);
                                        // 移除最旧的100条
                                        keysArray.slice(0, 100).forEach(key => {
                                            this.processedLogTimes.delete(key);
                                        });
                                    }
                                    
                                    // 输出日志（检查配置开关）
                                    if (globalConfig.getConfig('global.enableAchievementLog') !== false) {
                                        try {
                                            const logger = global.logger;
                                            if (logger && typeof logger.mark === 'function') {
                                                const cyan = (logger.cyan && typeof logger.cyan === 'function') ? logger.cyan.bind(logger) : (text) => text;
                                                const green = (logger.green && typeof logger.green === 'function') ? logger.green.bind(logger) : (text) => text;
                                                logger.mark(
                                                    `${cyan('[成就解锁]')} ${green(userNickname)}(${userId}) 在群 ${groupId} 解锁成就: ${rarityColor(achievementName)}`
                                                );
                                            } else {
                                                // 降级方案：使用 globalConfig 输出日志
                                                globalConfig.info(`[成就解锁] ${userNickname}(${userId}) 在群 ${groupId} 解锁成就: ${achievementName}`);
                                            }
                                        } catch (error) {
                                            // 如果日志输出失败，使用降级方案
                                            globalConfig.info(`[成就解锁] ${userNickname}(${userId}) 在群 ${groupId} 解锁成就: ${achievementName}`);
                                        }
                                    }
                                }
                            });
                        }
                    }
                } catch (error) {
                    globalConfig.error(`成就检查失败 ${key}:`, error);
                }
            }

        } catch (error) {
            globalConfig.error('批量成就检查失败:', error);
        } finally {
            // 清除处理标志（必须在 finally 中执行，确保锁被释放）
            this.isProcessingAchievements = false;
        }
    }

    /**
     * 清理归档群组缓存中的过期条目
     */
    cleanupArchivedGroupsCache() {
        if (!this.archivedGroupsCache || !this.archivedGroupsCacheTime) {
            return;
        }
        
        const now = Date.now();
        const cacheTTL = 5 * 60 * 1000; // 5分钟
        const keysToDelete = [];
        
        // 找出所有过期的缓存条目
        for (const [key, timestamp] of this.archivedGroupsCacheTime.entries()) {
            if (now - timestamp >= cacheTTL) {
                keysToDelete.push(key);
            }
        }
        
        // 删除过期条目
        for (const key of keysToDelete) {
            this.archivedGroupsCache.delete(key);
            this.archivedGroupsCacheTime.delete(key);
        }
        
        // 限制缓存大小，防止内存泄漏（最多保留1000个条目）
        if (this.archivedGroupsCache.size > 1000) {
            const allKeys = Array.from(this.archivedGroupsCache.keys());
            const keysToRemove = allKeys.slice(0, this.archivedGroupsCache.size - 1000);
            for (const key of keysToRemove) {
                this.archivedGroupsCache.delete(key);
                this.archivedGroupsCacheTime.delete(key);
            }
        }
        
        if (globalConfig.getConfig('global.debugLog') && keysToDelete.length > 0) {
            globalConfig.debug(`[消息记录] 清理归档群组缓存: 删除了 ${keysToDelete.length} 个过期条目`);
        }
    }


}

// 单例模式
let messageRecorderInstance = null;

/**
 * 获取消息记录器实例（单例）
 * @param {DataService} dataService 数据服务实例
 * @returns {MessageRecorder} 消息记录器实例
 */
export function getMessageRecorder(dataService = null) {
    if (!messageRecorderInstance) {
        messageRecorderInstance = new MessageRecorder(dataService);
    }
    return messageRecorderInstance;
}

export { MessageRecorder };
export default MessageRecorder;

