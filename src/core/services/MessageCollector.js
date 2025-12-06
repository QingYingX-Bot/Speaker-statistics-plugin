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
            const targetUserId = parseInt(userId);
            const queryDays = days || this.retentionDays;
            const useCountLimit = days === null;

            globalConfig.debug(`开始查询用户 ${targetUserId} 的消息，天数: ${queryDays}，数量限制: ${useCountLimit ? count : '无'}`);

            // 从今天开始往前查询
            for (let i = 0; i < queryDays && (useCountLimit ? userMessages.length < count : true); i++) {
                const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
                const key = this.getMessageKey(groupId, date);

                let dayMessages = [];
                try {
                    if (typeof redis !== 'undefined' && redis) {
                        dayMessages = await redis.lRange(key, 0, -1);
                        globalConfig.debug(`查询日期 ${date}，获取到 ${dayMessages.length} 条消息`);
                    } else {
                        globalConfig.warn('Redis 未配置，无法获取用户消息');
                        return [];
                    }
                } catch (err) {
                    globalConfig.error(`Redis查询失败: ${err}`);
                    continue;
                }

                // 倒序遍历(从最新的消息开始)
                for (let j = dayMessages.length - 1; j >= 0 && (useCountLimit ? userMessages.length < count : true); j--) {
                    try {
                        const msg = JSON.parse(dayMessages[j]);

                        // 检查是否是目标用户的消息
                        if (msg.user_id === targetUserId) {
                            globalConfig.debug(`找到用户消息: time=${msg.time}, beforeTime=${beforeTime}, message=${msg.message}`);

                            // 如果指定了时间限制,只获取该时间之前的消息
                            if (beforeTime && msg.time >= beforeTime) {
                                globalConfig.debug(`消息时间 ${msg.time} >= ${beforeTime}，跳过`);
                                continue;
                            }

                            userMessages.push({
                                message: msg.message || msg.text || '',
                                time: msg.time,
                                images: msg.images || [],
                                faces: msg.faces || {}
                            });

                            globalConfig.debug(`已收集 ${userMessages.length}/${count} 条消息`);
                        }
                    } catch (err) {
                        globalConfig.debug(`解析消息失败: ${err}`);
                    }
                }
            }

            // 按时间倒序排列(最新的在前)
            userMessages.sort((a, b) => b.time - a.time);

            globalConfig.debug(`最终获取到 ${userMessages.length} 条用户消息`);
            return useCountLimit ? userMessages.slice(0, count) : userMessages;
        } catch (err) {
            globalConfig.error(`获取用户最近消息失败: ${err}`);
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

