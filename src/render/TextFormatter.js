import { DataService } from '../core/DataService.js';
import { globalConfig } from '../core/ConfigManager.js';
import { CommonUtils } from '../core/utils/CommonUtils.js';

/**
 * 文本格式化器
 * 负责生成排行榜和统计信息的文本格式
 */
class TextFormatter {
    constructor(dataService = null) {
        this.dataService = dataService || new DataService();
    }

    /**
     * 格式化排行榜文本
     * @param {Object} e 消息事件对象
     * @param {Array} rankData 排行榜数据
     * @param {string} title 标题
     * @returns {string} 格式化后的文本
     */
    formatRankText(e, rankData, title) {
        const groupId = e.group_id;
        const groupName = e.group?.name || '未知群聊';
        const totalMessages = rankData.reduce((sum, user) => sum + (user.count || user.total || 0), 0);

        rankData.sort((a, b) => (b.count || b.total || 0) - (a.count || a.total || 0));
        const limit = globalConfig.getConfig('display.displayCount') || 20;
        const topUsers = rankData.slice(0, limit);

        let msg = [
            `群名: ${groupName}`,
            `群号: ${groupId}`,
            `${title}: ${CommonUtils.formatNumber(totalMessages)}`,
            `━━━━━━━━━━━━━━`,
            `排行榜:`
        ];

        for (let i = 0; i < topUsers.length; i++) {
            const user = topUsers[i];
            const count = user.count || user.total || 0;
            const percentage = totalMessages > 0 ? ((count / totalMessages) * 100).toFixed(2) : 0;
            msg.push(`\n第${i + 1}名：『${user.nickname || '未知'}』· ${CommonUtils.formatNumber(count)}次（占比${percentage}%）· 活跃${user.active_days || 0}天`);
        }

        // 显示用户自己的排名
        const userId = String(e.sender?.user_id || '');
        if (userId && !topUsers.some(user => String(user.user_id) === userId)) {
            for (let i = 0; i < rankData.length; i++) {
                if (String(rankData[i].user_id) === userId) {
                    const user = rankData[i];
                    const count = user.count || user.total || 0;
                    const percentage = totalMessages > 0 ? ((count / totalMessages) * 100).toFixed(2) : 0;
                    msg.push(`\n━━━━━━━━━━━━━━`);
                    msg.push(`\n你的排名：第${i + 1}名 · ${CommonUtils.formatNumber(count)}次（占比${percentage}%）· 活跃${user.active_days || 0}天`);
                    break;
                }
            }
        }

        return msg.join('\n');
    }

    /**
     * 生成排行榜文本
     * @param {Array} data 排行榜数据
     * @param {string} groupId 群号
     * @param {string} groupName 群名称
     * @param {string} title 标题
     * @returns {string|Array} 排行榜文本或转发消息数组
     */
    generateRankingText(data, groupId, groupName, title) {
        const totalCount = data.reduce((sum, item) => sum + (item.count || 0), 0);
        const messages = [];

        messages.push(
            `${groupName} (${groupId})\n` +
            `${title}\n` +
            `总消息数: ${CommonUtils.formatNumber(totalCount)}\n` +
            `━━━━━━━━━━━━━━`
        );

        data.forEach((item, index) => {
            const count = item.count || 0;
            const percentage = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : 0;
            messages.push(
                `\n${index + 1}. ${item.nickname || '未知'}\n` +
                `   发言次数: ${CommonUtils.formatNumber(count)} (${percentage}%)\n` +
                `   最后发言: ${item.last_speaking_time || '未知'}`
            );
        });

        if (globalConfig.getConfig('display.useForward')) {
            return [messages.join('\n')];
        } else {
            return messages.join('\n');
        }
    }

    /**
     * 格式化排行榜消息
     * @param {Array} rankData 排行榜数据
     * @param {string} timeRange 时间范围
     * @param {Object|null} userRankData 用户个人排名数据（如果不在显示范围内）
     * @returns {string} 格式化后的消息
     */
    formatRankingMessage(rankData, timeRange, userRankData = null) {
        const totalMessages = rankData.reduce((sum, user) => sum + (user.count || user.total || 0), 0);
        let msg = [`${timeRange}排行榜:`];
        
        for (let i = 0; i < rankData.length; i++) {
            const user = rankData[i];
            const count = user.count || user.total || 0;
            const percentage = totalMessages > 0 ? ((count / totalMessages * 100).toFixed(2)) : 0;
            const lastSpeakingTime = user.last_speaking_time || '未知';
            msg.push(
                `第${i + 1}名：『${user.nickname || '未知'}』· ${CommonUtils.formatNumber(count)}次（占比${percentage}%）· 字数${CommonUtils.formatNumber(user.period_words || 0)} · 活跃${user.active_days || 0}天 · 最后发言: ${lastSpeakingTime}`
            );
        }
        
        // 如果用户不在显示范围内且有个人排名数据，显示个人卡片
        if (userRankData && userRankData.rank) {
            msg.push('');
            msg.push('━━━━━━━━━━━━━━');
            msg.push('个人排名:');
            const userTotalMessages = rankData.reduce((sum, user) => sum + (user.count || user.total || 0), 0);
            const userCount = userRankData.count || 0;
            const userPercentage = (userTotalMessages + userCount) > 0 ? ((userCount / (userTotalMessages + userCount) * 100).toFixed(2)) : 0;
            const lastSpeakingTime = userRankData.last_speaking_time || '未知';
            msg.push(
                `第${userRankData.rank}名：『${userRankData.nickname || '未知'}』· ${CommonUtils.formatNumber(userCount)}次（占比${userPercentage}%）· 字数${CommonUtils.formatNumber(userRankData.period_words || 0)} · 活跃${userRankData.active_days || 0}天 · 最后发言: ${lastSpeakingTime}`
            );
        }
        
        return msg.join('\n');
    }

    /**
     * 获取用户显示名称
     * @param {string} userId 用户ID
     * @param {string} groupId 群号
     * @param {Object} userData 用户数据
     * @returns {string} 用户显示名称
     */
    getUserDisplayName(userId, groupId, userData) {
        let displayName = userData?.nickname || userId;
        
        try {
            // 尝试从群成员列表中获取用户信息
            if (typeof Bot !== 'undefined' && Bot.gml) {
                const userList = Bot.gml.get(groupId);
                if (userList) {
                    const userInfo = userList.get(userId);
                    if (userInfo) {
                        displayName = userInfo.card || userInfo.nickname || userData?.nickname || userId;
                        // 清理不可见字符
                        displayName = displayName.replace(/[^\p{L}\p{N}\p{P}\p{S}\p{Z}]/gu, '').trim();
                        if (!displayName) {
                            displayName = userData?.nickname || userId;
                        }
                    }
                }
            }
        } catch (err) {
            // 如果获取失败，使用默认名称
            displayName = userData?.nickname || userId;
        }
        
        return displayName;
    }

    /**
     * 格式化用户统计文本
     * @param {Object} userData 用户数据
     * @param {string} nickname 用户昵称
     * @returns {string} 格式化后的文本
     */
    formatUserStats(userData, nickname) {
        if (!userData || userData.total === 0) {
            return `${nickname} 暂无统计数据`;
        }

        let text = `📊 ${nickname} 的统计数据\n\n`;
        text += `总发言: ${CommonUtils.formatNumber(userData.total)} 条\n`;
        text += `总字数: ${CommonUtils.formatNumber(userData.total_number_of_words || 0)} 字\n`;
        text += `活跃天数: ${userData.active_days || 0} 天\n`;
        text += `连续天数: ${userData.continuous_days || 0} 天\n`;
        
        if (userData.last_speaking_time) {
            text += `最后发言: ${userData.last_speaking_time}\n`;
        }

        return text;
    }
}

export { TextFormatter };
export default TextFormatter;

