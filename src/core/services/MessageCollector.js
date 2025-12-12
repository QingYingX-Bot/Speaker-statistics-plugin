import moment from 'moment';
import { globalConfig } from '../ConfigManager.js';

/**
 * 消息收集器适配器
 * 适配到 Speaker-statistics-plugin 架构
 * 使用全局 redis 对象存储消息
 */
class MessageCollector {
    constructor(config = {}) {
        this.config = config;
        this.retentionDays = config.retentionDays || 7;
        this.maxMessageLength = config.maxMessageLength || 500;
    }

    /**
     * 获取消息键名
     * @param {string} groupId - 群号
     * @param {string} date - 日期 (YYYY-MM-DD)
     * @returns {string} Redis 键名
     */
    getMessageKey(groupId, date) {
        return `Speaker-statistics:messages:${groupId}:${date}`;
    }

    /**
     * 获取群消息历史
     * @param {string} groupId - 群号
     * @param {number} days - 天数
     * @param {string|null} targetDate - 目标日期 (YYYY-MM-DD)，不传则为今天
     * @returns {Promise<Array>} 消息列表
     */
    async getMessages(groupId, days = 1, targetDate = null) {
        try {
            const messages = [];
            const startDate = targetDate ? moment(targetDate) : moment();
            
            for (let i = 0; i < days; i++) {
                const date = startDate.clone().subtract(i, 'days').format('YYYY-MM-DD');
                const key = this.getMessageKey(groupId, date);
                
                try {
                    // 使用全局 redis 对象
                    if (typeof redis !== 'undefined' && redis) {
                        const dayMessages = await redis.lRange(key, 0, -1);
                        for (const msgStr of dayMessages) {
                            try {
                                const msg = JSON.parse(msgStr);
                                messages.push({
                                    message: msg.message || msg.text || '',
                                    time: msg.time,
                                    user_id: msg.user_id,
                                    nickname: msg.nickname,
                                    images: msg.images || [],
                                    faces: msg.faces || {}
                                });
                            } catch (err) {
                                globalConfig.debug(`解析消息失败: ${err}`);
                            }
                        }
                    } else {
                        globalConfig.warn('Redis 未配置，无法获取消息历史');
                        return [];
                    }
                } catch (err) {
                    globalConfig.error(`Redis查询失败: ${err}`);
                    continue;
                }
            }

            // 按时间排序（最新的在前）
            messages.sort((a, b) => b.time - a.time);
            return messages;
        } catch (err) {
            globalConfig.error(`获取消息失败: ${err}`);
            return [];
        }
    }

    /**
     * 获取指定用户最近的N条消息
     * @param {string} groupId - 群号
     * @param {string} userId - 用户ID
     * @param {number} count - 消息数量
     * @param {number} beforeTime - 时间戳(秒),只获取该时间点之前的消息
     * @param {number|null} days - 指定天数，设置后忽略 count 限制，获取该天数内的所有消息
     * @returns {Promise<Array>} 消息数组,按时间倒序排列
     */
    async getRecentUserMessages(groupId, userId, count = 1, beforeTime = null, days = null) {
        try {
            const userMessages = [];
            // 支持字符串和数字类型的用户ID匹配
            const targetUserIdStr = String(userId).trim();
            const targetUserIdNum = parseInt(userId);
            const queryDays = days || this.retentionDays;
            const useCountLimit = days === null;

            globalConfig.debug(`[词云] 开始查询用户 ${targetUserIdStr} (${targetUserIdNum}) 的消息，群组: ${groupId}，天数: ${queryDays}，数量限制: ${useCountLimit ? count : '无'}`);

            // 检查 Redis 是否可用
            if (typeof redis === 'undefined' || !redis) {
                globalConfig.warn('[词云] Redis 未配置，无法获取用户消息');
                return [];
            }

            // 检查消息收集是否启用
            const enableCollection = globalConfig.getConfig('wordcloud.enableMessageCollection');
            if (!enableCollection) {
                globalConfig.warn('[词云] 消息收集功能未启用，请在配置中启用 wordcloud.enableMessageCollection');
            }

            let totalMessagesChecked = 0;
            let matchedMessages = 0;
            let skippedMessages = 0;

            // 从今天开始往前查询
            for (let i = 0; i < queryDays && (useCountLimit ? userMessages.length < count : true); i++) {
                const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
                const key = this.getMessageKey(groupId, date);

                let dayMessages = [];
                try {
                    dayMessages = await redis.lRange(key, 0, -1);
                    totalMessagesChecked += dayMessages.length;
                    globalConfig.debug(`[词云] 查询日期 ${date}，获取到 ${dayMessages.length} 条消息`);
                } catch (err) {
                    globalConfig.error(`[词云] Redis查询失败 (${date}): ${err}`);
                    continue;
                }

                // 倒序遍历(从最新的消息开始)
                for (let j = dayMessages.length - 1; j >= 0 && (useCountLimit ? userMessages.length < count : true); j--) {
                    try {
                        const msg = JSON.parse(dayMessages[j]);
                        
                        // 改进用户ID匹配：支持字符串和数字类型
                        const msgUserId = msg.user_id;
                        const isMatch = msgUserId === targetUserIdNum || 
                                       msgUserId === targetUserIdStr || 
                                       String(msgUserId) === targetUserIdStr ||
                                       parseInt(msgUserId) === targetUserIdNum;

                        if (isMatch) {
                            // 如果指定了时间限制,只获取该时间之前的消息
                            if (beforeTime && msg.time >= beforeTime) {
                                globalConfig.debug(`[词云] 消息时间 ${msg.time} >= ${beforeTime}，跳过`);
                                skippedMessages++;
                                continue;
                            }

                            // 获取消息文本，支持多种字段名
                            const messageText = msg.message || msg.text || '';
                            
                            // 过滤空消息和无效消息
                            if (!messageText || messageText.trim().length === 0) {
                                skippedMessages++;
                                continue;
                            }

                            // 过滤特殊消息（JSON格式的小程序消息等）
                            if (messageText.trim().startsWith('{') && messageText.includes('"app"')) {
                                skippedMessages++;
                                continue;
                            }

                            userMessages.push({
                                message: messageText,
                                time: msg.time,
                                images: msg.images || [],
                                faces: msg.faces || {}
                            });

                            matchedMessages++;
                            if (globalConfig.getConfig('global.debugLog')) {
                                globalConfig.debug(`[词云] 已收集 ${userMessages.length} 条消息，最新: ${messageText.substring(0, 20)}...`);
                            }
                        }
                    } catch (err) {
                        globalConfig.debug(`[词云] 解析消息失败: ${err}`);
                    }
                }
            }

            // 按时间倒序排列(最新的在前)
            userMessages.sort((a, b) => b.time - a.time);

            globalConfig.debug(`[词云] 查询完成：检查了 ${totalMessagesChecked} 条消息，匹配到 ${matchedMessages} 条，跳过 ${skippedMessages} 条，最终返回 ${userMessages.length} 条`);
            
            return useCountLimit ? userMessages.slice(0, count) : userMessages;
        } catch (err) {
            globalConfig.error(`[词云] 获取用户最近消息失败: ${err}`);
            globalConfig.error(err.stack);
            return [];
        }
    }

    /**
     * 保存消息到 Redis（可选，如果需要实时收集消息）
     * @param {string} groupId - 群号
     * @param {Object} messageData - 消息数据
     */
    async saveMessage(groupId, messageData) {
        try {
            if (typeof redis === 'undefined' || !redis) {
                return;
            }

            const date = moment.unix(messageData.time).format('YYYY-MM-DD');
            const key = this.getMessageKey(groupId, date);
            const messageStr = JSON.stringify(messageData);

            await redis.lPush(key, messageStr);
            
            // 设置过期时间（保留 retentionDays 天）
            await redis.expire(key, this.retentionDays * 24 * 60 * 60);
        } catch (err) {
            globalConfig.error(`保存消息失败: ${err}`);
        }
    }
}

export { MessageCollector };
export default MessageCollector;

