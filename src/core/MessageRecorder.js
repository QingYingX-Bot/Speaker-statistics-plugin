import { getDataService } from './DataService.js';
import { AchievementService } from './AchievementService.js';
import { globalConfig } from './ConfigManager.js';
import { TimeUtils } from './utils/TimeUtils.js';

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
        this.recentMessageTexts = new Map(); // 最新消息文本缓存
        this.processedMessages = new Set(); // 已处理的消息ID集合（用于去重）
        this.recordMessageLock = false; // 记录消息的锁（防止并发处理）
        this.messageQueue = []; // 消息队列（用于处理并发情况下的消息）
        this.isProcessingQueue = false; // 是否正在处理消息队列
        
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
        const colorMap = {
            common: global.logger.gray.bind(global.logger),
            uncommon: global.logger.green.bind(global.logger),
            rare: global.logger.blue.bind(global.logger),
            epic: global.logger.magenta.bind(global.logger),
            legendary: global.logger.yellow.bind(global.logger),
            mythic: global.logger.red.bind(global.logger),
            festival: global.logger.red.bind(global.logger)
        };
        return colorMap[rarity] || colorMap.common;
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
                    if (globalConfig.getConfig('debug.enabled')) {
                        globalConfig.debug(`保存群信息失败: group_id=${groupId}`, error);
                    }
                }
            }

            // 提取消息文本
            const messageText = this.extractMessageText(e);
            
            // 保存最新消息文本（用于成就检查）
            this.saveRecentMessageText(groupId, userId, messageText);

            // 计算消息字数
            let wordCount = 0;
            if (globalConfig.getConfig('global.enableWordCount')) {
                wordCount = this.calculateWordCount(messageText);
            }

            // 获取消息时间戳（用于日志去重）
            const messageTime = e.time || Date.now();
            
            // 使用已计算的 messageId 作为日志去重的唯一标识
            const logMessageId = messageId;
            
            // 更新用户统计（传递消息ID用于日志去重）
            await this.dataService.updateUserStats(groupId, userId, nickname, wordCount, messageTime, logMessageId);
            
            // 调试日志：仅在调试模式下输出（减少日志噪音）
            // 消息成功记录的信息已经通过水群统计日志输出，这里不需要重复

            // 添加到成就检查队列
            if (globalConfig.getConfig('achievements.enabled')) {
                this.addToAchievementCheck(groupId, userId);
            }
        } catch (error) {
            globalConfig.error(`记录消息失败: ${messageId}, user_id=${e.sender?.user_id}, group_id=${e.group_id}`, error);
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
        // 可以存储在内存或数据库中，这里简化处理
        // 实际使用时可以从数据库读取用户数据的最新消息字段
        if (this.recentMessageTexts) {
            this.recentMessageTexts.set(key, {
                text: text,
                timestamp: Date.now()
            });
        } else {
            this.recentMessageTexts = new Map();
            this.recentMessageTexts.set(key, {
                text: text,
                timestamp: Date.now()
            });
        }
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

        // 确保是字符串类型
        const textStr = String(text);
        
        // 中文字符按1个字计算，其他非空白字符按1个字计算
        // 空白字符（空格、制表符、换行等）不计算
        let count = 0;
        for (let i = 0; i < textStr.length; i++) {
            const char = textStr.charAt(i);
            // 判断是否为中文字符（包括中文标点等扩展字符）
            if (/[\u4e00-\u9fa5\u3400-\u4dbf\uf900-\ufaff]/.test(char)) {
                count += 1;
            } else if (char.trim()) {
                // 非空白字符按1计算（包括英文、数字、符号等）
                count += 1;
            }
            // 空白字符（空格、制表符、换行等）不计算
        }

        return count;
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
                                    
                                    // 输出日志
                                    global.logger.mark(
                                        `${global.logger.cyan('[成就解锁]')} ${global.logger.green(userNickname)}(${userId}) 在群 ${groupId} 解锁成就: ${rarityColor(achievementName)}`
                                    );
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

