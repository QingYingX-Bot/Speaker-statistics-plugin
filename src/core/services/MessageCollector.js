import moment from 'moment';
import { globalConfig } from '../ConfigManager.js';

/**
 * 消息收集器（重构版）
 * 使用 Redis 分离存储个人、群、全局三种类型的消息
 * 
 * Redis 键名结构：
 * - 个人消息：Speaker-statistics:wordcloud:user:${groupId}:${userId}:${date}
 * - 群消息：Speaker-statistics:wordcloud:group:${groupId}:${date}
 * - 全局消息：Speaker-statistics:wordcloud:global:${date}
 */
class MessageCollector {
    constructor(config = {}) {
        this.config = config;
        this.retentionDays = config.retentionDays || 7;
        this.maxMessageLength = config.maxMessageLength || 500;
    }

    /**
     * 获取个人消息键名
     * @param {string} groupId - 群号
     * @param {string} userId - 用户ID
     * @param {string} date - 日期 (YYYY-MM-DD)
     * @returns {string} Redis 键名
     */
    getUserMessageKey(groupId, userId, date) {
        return `Speaker-statistics:wordcloud:user:${groupId}:${userId}:${date}`;
    }

    /**
     * 获取群消息键名
     * @param {string} groupId - 群号
     * @param {string} date - 日期 (YYYY-MM-DD)
     * @returns {string} Redis 键名
     */
    getGroupMessageKey(groupId, date) {
        return `Speaker-statistics:wordcloud:group:${groupId}:${date}`;
    }

    /**
     * 获取全局消息键名
     * @param {string} date - 日期 (YYYY-MM-DD)
     * @returns {string} Redis 键名
     */
    getGlobalMessageKey(date) {
        return `Speaker-statistics:wordcloud:global:${date}`;
    }

    /**
     * 检查 Redis 是否可用
     * @returns {boolean}
     */
    isRedisAvailable() {
        return typeof redis !== 'undefined' && redis;
    }

    /**
     * 检查消息收集是否启用
     * @returns {boolean}
     */
    isCollectionEnabled() {
        return globalConfig.getConfig('wordcloud.enableMessageCollection') === true;
    }

    /**
     * 保存消息到 Redis（同时保存到个人、群、全局）
     * @param {string} groupId - 群号
     * @param {string} userId - 用户ID
     * @param {string} messageText - 消息文本
     * @param {number} messageTime - 消息时间戳（秒）
     * @param {string} nickname - 用户昵称（可选）
     * @returns {Promise<boolean>} 是否成功
     */
    async saveMessage(groupId, userId, messageText, messageTime, nickname = null) {
        try {
            if (!this.isRedisAvailable() || !this.isCollectionEnabled()) {
                return false;
            }

            // 过滤空消息和无效消息
            if (!messageText || messageText.trim().length === 0) {
                return false;
            }

            // 过滤特殊消息（JSON格式的小程序消息等）
            const trimmedText = messageText.trim();
            if (trimmedText.startsWith('{') && 
                (trimmedText.includes('"app"') || 
                 trimmedText.includes('"prompt"') || 
                 trimmedText.includes('com.tencent.miniapp'))) {
                return false;
            }

            const date = moment.unix(messageTime).format('YYYY-MM-DD');
            const normalizedUserId = String(userId).trim();
            
            // 构建消息数据（个人和群消息）
            const messageData = {
                user_id: normalizedUserId,
                nickname: nickname || '未知用户',
                message: messageText,
                time: messageTime,
                timestamp: Date.now()
            };
            const messageStr = JSON.stringify(messageData);

            // 构建全局消息数据（包含群ID）
            const globalMessageData = {
                ...messageData,
                group_id: groupId
            };
            const globalMessageStr = JSON.stringify(globalMessageData);

            // 保存到个人消息
            const userKey = this.getUserMessageKey(groupId, normalizedUserId, date);
            await redis.lPush(userKey, messageStr);
            await redis.expire(userKey, this.retentionDays * 24 * 60 * 60);

            // 保存到群消息
            const groupKey = this.getGroupMessageKey(groupId, date);
            await redis.lPush(groupKey, messageStr);
            await redis.expire(groupKey, this.retentionDays * 24 * 60 * 60);

            // 保存到全局消息（包含群ID）
            const globalKey = this.getGlobalMessageKey(date);
            await redis.lPush(globalKey, globalMessageStr);
            await redis.expire(globalKey, this.retentionDays * 24 * 60 * 60);

            if (globalConfig.getConfig('global.debugLog')) {
                globalConfig.debug(`[词云] 已保存消息到Redis: 群组=${groupId}, 用户=${normalizedUserId}, 日期=${date}`);
            }

            return true;
        } catch (error) {
            if (globalConfig.getConfig('global.debugLog')) {
                globalConfig.debug(`[词云] 保存消息到Redis失败: ${error.message}`);
            }
            return false;
        }
    }

    /**
     * 获取个人消息（优化：使用批量查询和 pipeline）
     * @param {string} groupId - 群号
     * @param {string} userId - 用户ID
     * @param {number} days - 天数
     * @param {string|null} targetDate - 目标日期 (YYYY-MM-DD)，不传则为今天
     * @returns {Promise<Array>} 消息列表
     */
    async getUserMessages(groupId, userId, days = 1, targetDate = null) {
        try {
            if (!this.isRedisAvailable()) {
                globalConfig.warn('[词云] Redis 未配置，无法获取个人消息');
                return [];
            }

            if (!this.isCollectionEnabled()) {
                globalConfig.warn('[词云] 消息收集功能未启用');
                return [];
            }

            const normalizedUserId = String(userId).trim();
            const startDate = targetDate ? moment(targetDate) : moment();
            
            // 构建所有需要查询的键
            const keys = [];
            for (let i = 0; i < days; i++) {
                const date = startDate.clone().subtract(i, 'days').format('YYYY-MM-DD');
                keys.push(this.getUserMessageKey(groupId, normalizedUserId, date));
            }

            // 使用批量查询优化（并行查询所有键）
            const messages = await this.batchGetMessages(keys);
            
            // 按时间排序（最新的在前）
            messages.sort((a, b) => b.time - a.time);
            
            if (globalConfig.getConfig('global.debugLog')) {
                globalConfig.debug(`[词云] 获取个人消息: 群组=${groupId}, 用户=${normalizedUserId}, 天数=${days}, 消息数=${messages.length}`);
            }
            
            return messages;
        } catch (err) {
            globalConfig.error(`[词云] 获取个人消息失败: ${err}`);
            return [];
        }
    }

    /**
     * 获取群消息（优化：使用批量查询和 pipeline）
     * @param {string} groupId - 群号
     * @param {number} days - 天数
     * @param {string|null} targetDate - 目标日期 (YYYY-MM-DD)，不传则为今天
     * @returns {Promise<Array>} 消息列表
     */
    async getGroupMessages(groupId, days = 1, targetDate = null) {
        try {
            if (!this.isRedisAvailable()) {
                globalConfig.warn('[词云] Redis 未配置，无法获取群消息');
                return [];
            }

            if (!this.isCollectionEnabled()) {
                globalConfig.warn('[词云] 消息收集功能未启用');
                return [];
            }

            const startDate = targetDate ? moment(targetDate) : moment();
            
            // 构建所有需要查询的键
            const keys = [];
            for (let i = 0; i < days; i++) {
                const date = startDate.clone().subtract(i, 'days').format('YYYY-MM-DD');
                keys.push(this.getGroupMessageKey(groupId, date));
            }

            // 使用批量查询优化（并行查询所有键）
            const messages = await this.batchGetMessages(keys);
            
            // 按时间排序（最新的在前）
            messages.sort((a, b) => b.time - a.time);
            
            if (globalConfig.getConfig('global.debugLog')) {
                globalConfig.debug(`[词云] 获取群消息: 群组=${groupId}, 天数=${days}, 消息数=${messages.length}`);
            }
            
            return messages;
        } catch (err) {
            globalConfig.error(`[词云] 获取群消息失败: ${err}`);
            return [];
        }
    }

    /**
     * 获取全局消息（优化：使用批量查询和 pipeline）
     * @param {number} days - 天数
     * @param {string|null} targetDate - 目标日期 (YYYY-MM-DD)，不传则为今天
     * @returns {Promise<Array>} 消息列表
     */
    async getGlobalMessages(days = 1, targetDate = null) {
        try {
            if (!this.isRedisAvailable()) {
                globalConfig.warn('[词云] Redis 未配置，无法获取全局消息');
                return [];
            }

            if (!this.isCollectionEnabled()) {
                globalConfig.warn('[词云] 消息收集功能未启用');
                return [];
            }

            const startDate = targetDate ? moment(targetDate) : moment();
            
            // 构建所有需要查询的键
            const keys = [];
            for (let i = 0; i < days; i++) {
                const date = startDate.clone().subtract(i, 'days').format('YYYY-MM-DD');
                keys.push(this.getGlobalMessageKey(date));
            }

            // 使用批量查询优化（并行查询所有键）
            const messages = await this.batchGetMessages(keys, true); // true 表示包含 group_id
            
            // 按时间排序（最新的在前）
            messages.sort((a, b) => b.time - a.time);
            
            if (globalConfig.getConfig('global.debugLog')) {
                globalConfig.debug(`[词云] 获取全局消息: 天数=${days}, 消息数=${messages.length}`);
            }
            
            return messages;
        } catch (err) {
            globalConfig.error(`[词云] 获取全局消息失败: ${err}`);
            return [];
        }
    }

    /**
     * 批量获取消息（优化：使用并行查询）
     * @param {Array<string>} keys - Redis 键列表
     * @param {boolean} includeGroupId - 是否包含群ID（用于全局消息）
     * @returns {Promise<Array>} 消息列表
     */
    async batchGetMessages(keys, includeGroupId = false) {
        const messages = [];
        
        if (!keys || keys.length === 0) {
            return messages;
        }

        try {
            // 并行查询所有键（使用 Promise.all）
            const queries = keys.map(async (key) => {
                try {
                    const dayMessages = await redis.lRange(key, 0, -1);
                    return dayMessages || [];
                } catch (err) {
                    globalConfig.debug(`[词云] Redis查询失败 (${key}): ${err.message}`);
                    return [];
                }
            });

            // 等待所有查询完成
            const results = await Promise.all(queries);

            // 解析所有消息
            for (const dayMessages of results) {
                for (const msgStr of dayMessages) {
                    try {
                        const msg = JSON.parse(msgStr);
                        const messageObj = {
                            message: msg.message || msg.text || '',
                            time: msg.time,
                            user_id: msg.user_id,
                            nickname: msg.nickname,
                            images: msg.images || [],
                            faces: msg.faces || {}
                        };
                        
                        // 如果是全局消息，包含群ID
                        if (includeGroupId && msg.group_id) {
                            messageObj.group_id = msg.group_id;
                        }
                        
                        messages.push(messageObj);
                    } catch (err) {
                        globalConfig.debug(`[词云] 解析消息失败: ${err.message}`);
                    }
                }
            }
        } catch (err) {
            globalConfig.error(`[词云] 批量获取消息失败: ${err.message}`);
        }

        return messages;
    }

    /**
     * 获取指定用户最近的N条消息（兼容旧接口）
     * @param {string} groupId - 群号
     * @param {string} userId - 用户ID
     * @param {number} count - 消息数量
     * @param {number} beforeTime - 时间戳(秒),只获取该时间点之前的消息
     * @param {number|null} days - 指定天数，设置后忽略 count 限制，获取该天数内的所有消息
     * @returns {Promise<Array>} 消息数组,按时间倒序排列
     */
    async getRecentUserMessages(groupId, userId, count = 1, beforeTime = null, days = null) {
        try {
            const queryDays = days || this.retentionDays;
            const useCountLimit = days === null;
            
            // 使用新的 getUserMessages 方法
            const allMessages = await this.getUserMessages(groupId, userId, queryDays);
            
            // 应用时间过滤
            let filteredMessages = allMessages;
            if (beforeTime) {
                filteredMessages = allMessages.filter(msg => msg.time < beforeTime);
            }
            
            // 应用数量限制
            const result = useCountLimit ? filteredMessages.slice(0, count) : filteredMessages;
            
            if (globalConfig.getConfig('global.debugLog')) {
                globalConfig.debug(`[词云] 获取用户最近消息: 群组=${groupId}, 用户=${userId}, 返回=${result.length}条`);
            }
            
            return result;
        } catch (err) {
            globalConfig.error(`[词云] 获取用户最近消息失败: ${err}`);
            return [];
        }
    }

    /**
     * 获取群消息历史（兼容旧接口）
     * @param {string} groupId - 群号
     * @param {number} days - 天数
     * @param {string|null} targetDate - 目标日期 (YYYY-MM-DD)，不传则为今天
     * @returns {Promise<Array>} 消息列表
     */
    async getMessages(groupId, days = 1, targetDate = null) {
        return await this.getGroupMessages(groupId, days, targetDate);
    }

    /**
     * 清空所有词云统计数据
     * @returns {Promise<Object>} 清理结果统计 { userKeys, groupKeys, globalKeys, total }
     */
    async clearAllWordCloudData() {
        try {
            if (!this.isRedisAvailable()) {
                throw new Error('Redis 未配置，无法清空词云统计');
            }

            let userKeysCount = 0;
            let groupKeysCount = 0;
            let globalKeysCount = 0;

            // 清空个人消息键
            const userPattern = 'Speaker-statistics:wordcloud:user:*';
            userKeysCount = await this.deleteKeysByPattern(userPattern);

            // 清空群消息键
            const groupPattern = 'Speaker-statistics:wordcloud:group:*';
            groupKeysCount = await this.deleteKeysByPattern(groupPattern);

            // 清空全局消息键
            const globalPattern = 'Speaker-statistics:wordcloud:global:*';
            globalKeysCount = await this.deleteKeysByPattern(globalPattern);

            // 同时清空旧格式的键（兼容性）
            const oldPattern = 'Speaker-statistics:messages:*';
            const oldKeysCount = await this.deleteKeysByPattern(oldPattern);

            const total = userKeysCount + groupKeysCount + globalKeysCount + oldKeysCount;

            if (globalConfig.getConfig('global.debugLog')) {
                globalConfig.debug(`[词云] 清空统计完成: 个人=${userKeysCount}, 群=${groupKeysCount}, 全局=${globalKeysCount}, 旧格式=${oldKeysCount}, 总计=${total}`);
            }

            return {
                userKeys: userKeysCount,
                groupKeys: groupKeysCount,
                globalKeys: globalKeysCount,
                oldKeys: oldKeysCount,
                total: total
            };
        } catch (error) {
            globalConfig.error(`[词云] 清空词云统计失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 按模式删除 Redis 键（使用 scanIterator 遍历，如果失败则使用 KEYS）
     * @param {string} pattern - 键模式
     * @returns {Promise<number>} 删除的键数量
     */
    async deleteKeysByPattern(pattern) {
        try {
            let deletedCount = 0;
            const keysToDelete = [];

            // 首先尝试使用 scanIterator（node-redis v4 推荐方式，不阻塞 Redis）
            if (typeof redis.scanIterator === 'function') {
                try {
                    // 使用 scanIterator 遍历匹配的键
                    for await (const keys of redis.scanIterator({
                        MATCH: pattern,
                        COUNT: 100
                    })) {
                        if (keys && Array.isArray(keys)) {
                            keysToDelete.push(...keys);
                        } else if (keys) {
                            keysToDelete.push(keys);
                        }
                    }

                    // 批量删除收集到的键
                    if (keysToDelete.length > 0) {
                        // 分批删除，避免一次性删除太多键
                        const batchSize = 100;
                        for (let i = 0; i < keysToDelete.length; i += batchSize) {
                            const batch = keysToDelete.slice(i, i + batchSize);
                            try {
                                await redis.del(batch);
                            } catch (delError) {
                                // 如果批量删除失败，逐个删除
                                for (const key of batch) {
                                    try {
                                        await redis.del(key);
                                    } catch (err) {
                                        globalConfig.debug(`[词云] 删除键失败 (${key}): ${err.message}`);
                                    }
                                }
                            }
                        }
                        deletedCount = keysToDelete.length;
                    }

                    if (globalConfig.getConfig('global.debugLog')) {
                        globalConfig.debug(`[词云] 使用 scanIterator 删除 ${deletedCount} 个键 (${pattern})`);
                    }

                    return deletedCount;
                } catch (scanError) {
                    // scanIterator 失败，使用 KEYS 后备方案
                    globalConfig.warn(`[词云] scanIterator 失败，使用 KEYS 命令（可能影响性能）: ${scanError.message}`);
                }
            }

            // 后备方案：使用 KEYS 命令（可能阻塞 Redis，但更通用）
            if (typeof redis.keys === 'function') {
                try {
                    const keys = await redis.keys(pattern);
                    if (keys && keys.length > 0) {
                        // 分批删除，避免一次性删除太多键
                        const batchSize = 100;
                        for (let i = 0; i < keys.length; i += batchSize) {
                            const batch = keys.slice(i, i + batchSize);
                            try {
                                await redis.del(batch);
                            } catch (delError) {
                                // 如果批量删除失败，逐个删除
                                for (const key of batch) {
                                    try {
                                        await redis.del(key);
                                    } catch (err) {
                                        globalConfig.debug(`[词云] 删除键失败 (${key}): ${err.message}`);
                                    }
                                }
                            }
                        }
                        deletedCount = keys.length;
                    }

                    if (globalConfig.getConfig('global.debugLog')) {
                        globalConfig.debug(`[词云] 使用 KEYS 命令删除 ${deletedCount} 个键 (${pattern})`);
                    }

                    return deletedCount;
                } catch (keysError) {
                    globalConfig.error(`[词云] KEYS 命令失败 (${pattern}): ${keysError.message}`);
                    throw keysError;
                }
            }

            return 0;
        } catch (error) {
            globalConfig.error(`[词云] 删除键失败 (${pattern}): ${error.message}`);
            throw error;
        }
    }
}

export { MessageCollector };
export default MessageCollector;
