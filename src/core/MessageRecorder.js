import { getDataService } from './DataService.js'
import { globalConfig } from './ConfigManager.js'
import { TimeUtils } from './utils/TimeUtils.js'

/**
 * 消息记录处理类
 * 负责监听群消息并更新用户统计数据
 */
class MessageRecorder {
    constructor(dataService = null) {
        this.dataService = dataService || getDataService()
        this.batchWriteQueue = new Map() // 批量写入队列
        this.batchWriteTimer = null // 批量写入定时器
        this.maxBatchSize = 50 // 最大批量大小
        this.batchWriteInterval = 2000 // 批量写入间隔（毫秒）
        this.processedMessages = new Set() // 已处理的消息ID集合（用于去重）
        this.botIdsCache = null // 机器人ID缓存（降低每条消息重复扫描开销）
        this.botIdsCacheTime = 0
        this.botIdsCacheTTL = 60 * 1000 // 60秒
        this.recordMessageLock = false // 记录消息的锁（防止并发处理）
        this.messageQueue = [] // 消息队列（用于处理并发情况下的消息）
        this.isProcessingQueue = false // 是否正在处理消息队列
        this.failureCount = 0 // 失败计数
        this.maxFailures = 100 // 最大失败次数（达到后进入降级模式）
        this.degradedMode = false // 降级模式标志
        this.lastFailureTime = 0 // 最后失败时间
        this.degradedModeResetInterval = 5 * 60 * 1000 // 5分钟后尝试退出降级模式
        
        // 设置消息记录器引用到数据服务
        this.dataService.setMessageRecorder(this)
    }

    /**
     * 从事件中提取群 ID（兼容 QQ/Discord/Telegram）
     * @param {Object} e 消息事件
     * @returns {string}
     */
    extractEventGroupId(e) {
        const rawGroupId = e?.group_id
            ?? e?.group?.id
            ?? e?.channel_id
            ?? e?.channel?.id
            ?? e?.chat_id
            ?? e?.chat?.id

        if (rawGroupId === null || rawGroupId === undefined) return ''
        return String(rawGroupId).trim()
    }

    /**
     * 从事件中提取用户 ID（兼容 QQ/Discord/Telegram）
     * @param {Object} e 消息事件
     * @returns {string}
     */
    extractEventUserId(e) {
        const rawUserId = e?.sender?.user_id
            ?? e?.user_id
            ?? e?.author?.id
            ?? e?.from?.id

        if (rawUserId === null || rawUserId === undefined) return ''
        return String(rawUserId).trim()
    }

    /**
     * 从事件中提取昵称
     * @param {Object} e 消息事件
     * @returns {string}
     */
    extractEventNickname(e) {
        return e?.sender?.card
            || e?.sender?.nickname
            || e?.nickname
            || e?.author?.global_name
            || e?.author?.username
            || e?.from?.first_name
            || e?.from?.username
            || '未知用户'
    }

    /**
     * 获取已知机器人 ID 集合（字符串）
     * @returns {Set<string>}
     */
    getKnownBotIds() {
        const now = Date.now()
        if (this.botIdsCache && now - this.botIdsCacheTime < this.botIdsCacheTTL) {
            return this.botIdsCache
        }

        const globalBot = typeof Bot !== 'undefined' ? Bot : null
        const ids = new Set()
        const addId = (id) => {
            if (id === null || id === undefined) return
            const normalizedId = String(id).trim()
            if (normalizedId) {
                ids.add(normalizedId)
            }
        }

        const botUins = Array.isArray(globalBot?.uin) ? globalBot.uin : []
        for (const botUin of botUins) {
            addId(botUin)
        }

        if (globalBot && typeof globalBot === 'object') {
            for (const [key, value] of Object.entries(globalBot)) {
                addId(key)
                addId(value?.uin)
                addId(value?.self_id)
                addId(value?.id)
            }
        }

        this.botIdsCache = ids
        this.botIdsCacheTime = now
        return ids
    }

    /**
     * 判断当前消息是否来自机器人
     * @param {Object} e 消息事件
     * @param {string} userId 用户ID
     * @returns {boolean}
     */
    isBotMessage(e, userId) {
        if (!e || typeof e !== 'object') return false

        const botFlags = [
            e.is_bot,
            e.isBot,
            e.bot,
            e.from_me,
            e.is_self,
            e.self,
            e?.sender?.is_bot,
            e?.sender?.bot,
            e?.author?.bot,
            e?.from?.is_bot,
            e?.from?.bot
        ]

        if (botFlags.some(flag => flag === true)) {
            return true
        }

        const normalizedUserId = String(userId || '').trim()
        if (!normalizedUserId) return false

        const selfCandidates = [e.self_id, e.bot_id, e.robot_id, e.client_id]
        for (const selfId of selfCandidates) {
            if (selfId === null || selfId === undefined) continue
            const normalizedSelfId = String(selfId).trim()
            if (!normalizedSelfId) continue

            if (normalizedSelfId === normalizedUserId) {
                return true
            }

            if (`dc_${normalizedSelfId}` === normalizedUserId || `tg_${normalizedSelfId}` === normalizedUserId) {
                return true
            }
        }

        const knownBotIds = this.getKnownBotIds()
        if (knownBotIds.has(normalizedUserId)) {
            return true
        }

        const strippedUserId = normalizedUserId.replace(/^(dc|tg)_/i, '')
        return knownBotIds.has(strippedUserId)
    }

    /**
     * 记录消息
     * @param {Object} e 消息事件对象
     * @returns {Promise<void>}
     */
    async recordMessage(e) {
        const groupId = this.extractEventGroupId(e)
        const userId = this.extractEventUserId(e)

        // 先进行消息去重检查（在加锁之前，避免不必要的锁竞争）
        let messageId = null
        if (e.message_id) {
            messageId = `msg_${e.message_id}`
        } else if (e.seq) {
            messageId = `seq_${e.seq}`
        } else if (e.time && groupId && userId) {
            // 使用时间戳+群ID+用户ID+毫秒时间戳（确保唯一性）
            const uniqueTime = e.time.toString() + (Date.now() % 1000000).toString()
            messageId = `time_${groupId}_${userId}_${uniqueTime}`
        } else {
            // 如果所有标识都不存在，使用群ID+用户ID+时间戳+随机数组合（确保唯一性）
            const uniqueId = `${groupId || 'unknown'}_${userId || 'unknown'}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
            messageId = `fallback_${uniqueId}`
        }
        
        // 如果消息ID为空，生成一个备用ID（不应该发生，但为了安全）
        if (!messageId) {
            messageId = `unknown_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        }
        
        // 检查是否已处理过（使用消息ID去重）
        if (this.processedMessages.has(messageId)) {
            return
        }
        
        // 检查基本条件（在入队前检查，避免无效消息入队）
        // 检查是否启用消息记录
        if (!globalConfig.getConfig('global.recordMessage')) {
            return
        }

        // 只处理群消息
        if (!groupId || !userId) {
            return
        }

        // 刷新“当前群列表”缓存（节流 60s），供 Web 全局统计与 #群列表 一致
        this.dataService.refreshCurrentGroupIdsFromBot(60 * 1000)
        
        // 检查群组是否已归档，如果是则恢复（异步执行，不阻塞消息处理）
        // 使用缓存优化：避免每次消息都查询数据库
        if (!this.archivedGroupsCache) {
            this.archivedGroupsCache = new Map() // 缓存已归档的群组ID
            this.archivedGroupsCacheTime = new Map() // 缓存时间戳
            
            // 定期清理过期缓存（每10分钟清理一次）
            if (!this.archivedGroupsCacheCleanupTimer) {
                this.archivedGroupsCacheCleanupTimer = setInterval(() => {
                    this.cleanupArchivedGroupsCache()
                }, 10 * 60 * 1000) // 10分钟
            }
        }
        
        // 检查缓存（5分钟TTL）
        const cacheKey = groupId
        const cachedTime = this.archivedGroupsCacheTime.get(cacheKey) || 0
        const cacheTTL = 5 * 60 * 1000 // 5分钟
        const isCached = Date.now() - cachedTime < cacheTTL
        
        if (isCached && this.archivedGroupsCache.has(cacheKey)) {
            // 从缓存中获取归档状态
            const isArchived = this.archivedGroupsCache.get(cacheKey)
            if (isArchived) {
                // 恢复归档的群组（先恢复，成功后再更新活动时间）
                this.dataService.restoreGroupStats(groupId).then(() => {
                    // 恢复成功，清除缓存
                    this.archivedGroupsCache.delete(cacheKey)
                    this.archivedGroupsCacheTime.delete(cacheKey)
                    
                    if (globalConfig.getConfig('global.debugLog')) {
                        globalConfig.debug(`[消息记录] 检测到归档群组 ${groupId} 有新消息，已自动恢复`)
                    }
                }).catch(err => {
                    // 恢复失败，至少更新活动时间延长保留期
                    this.dataService.dbService.updateArchivedGroupActivity(groupId)
                        .catch(() => {
                            if (globalConfig.getConfig('global.debugLog')) {
                                globalConfig.debug('[消息记录-更新活动时间] 非关键错误')
                            }
                        })
                    globalConfig.error(`[消息记录] 恢复归档群组失败: ${groupId}`, err)
                })
            }
        } else {
            // 缓存未命中或过期，查询数据库
            this.dataService.isGroupArchived(groupId).then(isArchived => {
                // 更新缓存
                this.archivedGroupsCache.set(cacheKey, isArchived)
                this.archivedGroupsCacheTime.set(cacheKey, Date.now())
                
                if (isArchived) {
                    // 恢复归档的群组（先恢复，成功后再更新活动时间）
                    this.dataService.restoreGroupStats(groupId).then(() => {
                        // 恢复成功，清除缓存
                        this.archivedGroupsCache.delete(cacheKey)
                        this.archivedGroupsCacheTime.delete(cacheKey)
                        
                        if (globalConfig.getConfig('global.debugLog')) {
                            globalConfig.debug(`[消息记录] 检测到归档群组 ${groupId} 有新消息，已自动恢复`)
                        }
                    }).catch(err => {
                        // 恢复失败，至少更新活动时间延长保留期
                        this.dataService.dbService.updateArchivedGroupActivity(groupId)
                            .catch(() => {
                                if (globalConfig.getConfig('global.debugLog')) {
                                    globalConfig.debug('[消息记录-更新活动时间] 非关键错误')
                                }
                            })
                        globalConfig.error(`[消息记录] 恢复归档群组失败: ${groupId}`, err)
                    })
                }
            }).catch(err => {
                // 静默处理错误，不影响消息记录
                if (globalConfig.getConfig('global.debugLog')) {
                    globalConfig.debug(`[消息记录] 检查群组归档状态失败: ${groupId}`, err)
                }
            })
        }

        // 如果正在处理消息，将消息加入队列（而不是直接跳过）
        // 这样可以确保所有消息都会被处理，只是顺序可能稍有延迟
        if (this.recordMessageLock) {
            // 将消息加入队列，等待处理
            this.messageQueue.push({ e, messageId })
            // 如果队列处理未启动，启动队列处理
            if (!this.isProcessingQueue) {
                this.processQueue()
            }
            return
        }
        
        // 设置锁（立即处理消息）
        this.recordMessageLock = true
        
        try {
            // 再次检查消息ID（防止在锁竞争期间消息被重复处理）
            if (this.processedMessages.has(messageId)) {
                return // 已处理过，直接返回
            }

            // 标记为已处理（保留最近2000条消息的ID，避免内存泄漏）
            this.processedMessages.add(messageId)
            if (this.processedMessages.size > 2000) {
                // 清理一半的旧记录，保持内存占用合理
                const keysToDelete = Array.from(this.processedMessages).slice(0, 1000)
                keysToDelete.forEach(key => this.processedMessages.delete(key))
            }

            let nickname = this.extractEventNickname(e)

            // Discord 事件：仅使用 global_name / username（依赖缓存，不会高频走远程）
            if (this.dataService.detectGroupPlatform(groupId) === 'discord') {
                const eventGlobalName = String(e?.author?.global_name || '').trim()
                const eventUsername = String(e?.author?.username || '').trim()
                const discordUserInfo = await this.dataService.getDiscordUserInfo(userId).catch(() => null)
                const preferredName = String(
                    discordUserInfo?.globalName
                    || discordUserInfo?.username
                    || eventGlobalName
                    || eventUsername
                    || ''
                ).trim()

                if (preferredName) {
                    nickname = preferredName
                } else {
                    nickname = userId
                }
            }

            // 获取并保存群信息（事件 -> Bot.gl）
            try {
                const groupName = this.dataService.extractGroupNameFromEvent(e, groupId)
                if (groupName) {
                    await this.dataService.dbService.saveGroupInfo(groupId, groupName)
                }
            } catch (err) {
                if (globalConfig.getConfig('global.debugLog')) {
                    globalConfig.debug(`保存群信息失败: group_id=${groupId}`, err)
                }
            }

            // 提取消息文本
            const messageText = this.extractMessageText(e)
            
            // 获取消息时间戳（用于日志去重和 Redis 存储）
            const messageTime = e.time || Date.now()

            // 可选过滤：是否统计机器人消息
            const countBotMessages = globalConfig.getConfig('message.countBotMessages') === true
            if (!countBotMessages && this.isBotMessage(e, userId)) {
                if (globalConfig.getConfig('global.debugLog')) {
                    globalConfig.debug(`[消息记录] 已跳过机器人消息: group_id=${groupId}, user_id=${userId}`)
                }
                return
            }

            // 可选过滤：是否仅统计包含文本内容的消息
            const onlyTextMessages = globalConfig.getConfig('message.onlyTextMessages') === true
            if (onlyTextMessages && messageText.trim().length === 0) {
                if (globalConfig.getConfig('global.debugLog')) {
                    globalConfig.debug(`[消息记录] 已跳过非文本消息: group_id=${groupId}, user_id=${userId}`)
                }
                return
            }
            
            // 计算消息字数
            let wordCount = 0
            if (globalConfig.getConfig('global.enableWordCount')) {
                wordCount = this.calculateWordCount(messageText)
            }
            
            // 使用已计算的 messageId 作为日志去重的唯一标识
            const logMessageId = messageId
            
            // 如果在降级模式，跳过统计更新（但仍记录错误）
            if (this.degradedMode) {
                return
            }

            // 更新用户统计（传递消息ID用于日志去重）
            await this.dataService.updateUserStats(groupId, userId, nickname, wordCount, messageTime, logMessageId)
            
            // 成功处理，重置失败计数（每次成功减少1，避免累积过多）
            if (this.failureCount > 0) {
                this.failureCount = Math.max(0, this.failureCount - 1)
            }
            
            // 调试日志：仅在调试模式下输出（减少日志噪音）
            // 消息成功记录的信息已经通过水群统计日志输出，这里不需要重复

        } catch (err) {
            this.failureCount++
            this.lastFailureTime = Date.now()
            
            if (this.failureCount >= this.maxFailures && !this.degradedMode) {
                this.degradedMode = true
                globalConfig.warn(`[消息记录] 失败次数过多 (${this.failureCount})，进入降级模式（仅记录错误，不更新统计）`)
            }
            
            if (this.degradedMode) {
                globalConfig.warn(`[消息记录] 降级模式: 记录消息失败: ${messageId}, user_id=${userId || e.sender?.user_id}, group_id=${groupId || e.group_id}`, err.message)
            } else {
                globalConfig.error(`记录消息失败: ${messageId}, user_id=${userId || e.sender?.user_id}, group_id=${groupId || e.group_id}`, err)
            }
            
            if (this.degradedMode && Date.now() - this.lastFailureTime > this.degradedModeResetInterval) {
                this.degradedMode = false
                this.failureCount = 0
                globalConfig.mark('[消息记录] 退出降级模式，恢复正常处理')
            }
        } finally {
            // 释放锁（必须在 finally 中执行，确保锁被释放）
            this.recordMessageLock = false
            
            // 处理队列中的消息
            if (this.messageQueue.length > 0 && !this.isProcessingQueue) {
                this.processQueue()
            }
        }
    }

    /**
     * 处理消息队列（按顺序处理队列中的消息）
     */
    async processQueue() {
        // 如果正在处理队列或队列为空，直接返回
        if (this.isProcessingQueue || this.messageQueue.length === 0) {
            return
        }
        
        // 设置队列处理标志
        this.isProcessingQueue = true
        
        try {
            // 循环处理队列中的消息
            while (this.messageQueue.length > 0) {
                // 如果正在处理其他消息，等待一小段时间后再试
                if (this.recordMessageLock) {
                    await new Promise(resolve => setTimeout(resolve, 10))
                    continue
                }
                
                // 从队列中取出一个消息
                const item = this.messageQueue.shift()
                if (!item) {
                    break
                }
                
                // 检查是否已处理过
                if (this.processedMessages.has(item.messageId)) {
                    continue // 跳过已处理的消息
                }
                
                // 递归调用 recordMessage 处理消息（这次会立即处理，因为锁已释放）
                await this.recordMessage(item.e)
            }
        } catch (err) {
            globalConfig.error('处理消息队列失败:', err)
        } finally {
            // 清除队列处理标志
            this.isProcessingQueue = false
        }
    }

    /**
     * 提取消息文本
     * @param {Object} e 消息事件对象
     * @returns {string} 消息文本
     */
    extractMessageText(e) {
        if (!e.msg) return ''

        // 处理不同类型的消息
        if (typeof e.msg === 'string') {
            return e.msg
        }

        // 处理数组格式的消息（可能包含图片、表情等）
        if (Array.isArray(e.msg)) {
            return e.msg
                .filter(item => item.type === 'text')
                .map(item => item.text || '')
                .join('')
        }

        // 处理对象格式的消息
        if (typeof e.msg === 'object' && e.msg.text) {
            return e.msg.text
        }

        return ''
    }

    /**
     * 计算消息字数
     * @param {string} text 消息文本
     * @returns {number} 字数
     */
    calculateWordCount(text) {
        if (!text || typeof text !== 'string') return 0

        const textStr = String(text)
        
        // 快速检测：空字符串或只包含空白字符
        if (textStr.trim().length === 0) return 0
        
        // 检测特殊消息类型（卡片消息、聊天记录等），这些消息只计算为1个字
        if (this.isSpecialMessage(textStr)) {
            return 1
        }
        
        // 优化：使用正则表达式一次性匹配所有非空白字符，提高性能
        // 中文字符按1个字计算，其他非空白字符按1个字计算
        // 空白字符（空格、制表符、换行等）不计算
        const nonWhitespacePattern = /\S/g
        
        // 统计所有非空白字符数量（包括中文、英文、数字、符号等）
        const matches = textStr.match(nonWhitespacePattern)
        return matches ? matches.length : 0
    }

    /**
     * 检测是否为特殊消息类型（卡片消息、聊天记录等）
     * 这些消息包含大量JSON结构，应该只计算为1个字
     * @param {string} text 消息文本
     * @returns {boolean} 是否为特殊消息
     */
    isSpecialMessage(text) {
        if (!text || typeof text !== 'string' || text.length === 0) return false

        const textStr = String(text)
        const textLength = textStr.length
        
        // 快速检测：如果文本很短，不可能是JSON消息
        if (textLength < 50) return false
        
        // 优化：优先检测最常见的特殊消息类型（提前返回，避免不必要的计算）
        // 检测1: QQ小程序卡片消息（最常见）
        if (textStr.includes('"app":"com.tencent.miniapp') || 
            textStr.includes('"app":"com.tencent.miniapp_')) {
            return true
        }
        
        // 检测2: 聊天记录转发消息
        if (textStr.includes('"app":"com.tencent.multimsg"')) {
            return true
        }
        
        // 检测3: 包含 "view":"view_" 和 "app":" 的消息（卡片消息特征）
        if (textStr.includes('"view":"view_') && textStr.includes('"app":"')) {
            return true
        }
        
        // 如果已经检测到明确的特殊消息类型，直接返回
        // 否则继续检测JSON结构特征（需要统计大括号）
        
        // 统计 { 和 } 的数量（使用单次遍历）
        let openBraces = 0
        let closeBraces = 0
        for (let i = 0; i < textLength; i++) {
            const char = textStr[i]
            if (char === '{') openBraces++
            else if (char === '}') closeBraces++
        }
        
        // 检测4: 包含大量 {} 结构的消息（JSON格式）
        // 如果包含超过5个 { 或 }，且占文本长度的一定比例，可能是JSON消息
        if (openBraces >= 5 || closeBraces >= 5) {
            const braceRatio = (openBraces + closeBraces) / textLength
            // 如果大括号占比超过5%，可能是JSON消息
            if (braceRatio > 0.05) {
                return true
            }
        }
        
        // 检测5: 包含 "meta": 和大量嵌套JSON的消息（卡片消息特征）
        if (textStr.includes('"meta":') && (openBraces >= 3 || closeBraces >= 3)) {
            return true
        }
        
        // 检测6: 包含 "config": 和 "prompt": 的消息（卡片消息特征）
        if (textStr.includes('"config":') && textStr.includes('"prompt":') && 
            (openBraces >= 3 || closeBraces >= 3)) {
            return true
        }
        
        return false
    }

    /**
     * 清理归档群组缓存中的过期条目
     */
    cleanupArchivedGroupsCache() {
        if (!this.archivedGroupsCache || !this.archivedGroupsCacheTime) {
            return
        }
        
        const now = Date.now()
        const cacheTTL = 5 * 60 * 1000; // 5分钟
        const keysToDelete = []
        
        // 找出所有过期的缓存条目
        for (const [key, timestamp] of this.archivedGroupsCacheTime.entries()) {
            if (now - timestamp >= cacheTTL) {
                keysToDelete.push(key)
            }
        }
        
        // 删除过期条目
        for (const key of keysToDelete) {
            this.archivedGroupsCache.delete(key)
            this.archivedGroupsCacheTime.delete(key)
        }
        
        // 限制缓存大小，防止内存泄漏（最多保留1000个条目）
        if (this.archivedGroupsCache.size > 1000) {
            const allKeys = Array.from(this.archivedGroupsCache.keys())
            const keysToRemove = allKeys.slice(0, this.archivedGroupsCache.size - 1000)
            for (const key of keysToRemove) {
                this.archivedGroupsCache.delete(key)
                this.archivedGroupsCacheTime.delete(key)
            }
        }
        
        if (globalConfig.getConfig('global.debugLog') && keysToDelete.length > 0) {
            globalConfig.debug(`[消息记录] 清理归档群组缓存: 删除了 ${keysToDelete.length} 个过期条目`)
        }
    }


}

// 单例模式
let messageRecorderInstance = null

/**
 * 获取消息记录器实例（单例）
 * @param {DataService} dataService 数据服务实例
 * @returns {MessageRecorder} 消息记录器实例
 */
export function getMessageRecorder(dataService = null) {
    if (!messageRecorderInstance) {
        messageRecorderInstance = new MessageRecorder(dataService)
    }
    return messageRecorderInstance
}

export { MessageRecorder }
export default MessageRecorder
