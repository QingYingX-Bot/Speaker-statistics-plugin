import { CommonUtils } from '../core/utils/CommonUtils.js'

/**
 * 文本格式化器
 * 负责生成排行榜和统计信息的文本格式
 */
class TextFormatter {
    /**
     * 格式化用户排名信息
     * @param {Object} user 用户数据
     * @param {number} rank 排名
     * @param {number} totalMessages 总消息数（用于计算占比）
     * @returns {string} 格式化后的排名信息
     */
    formatUserRank(user, rank, totalMessages) {
            const count = user.count || user.total || 0
        const percentage = totalMessages > 0 ? ((count / totalMessages * 100).toFixed(2)) : 0
        const lastSpeakingTime = user.last_speaking_time || '未知'
        return `第${rank}名：『${user.nickname || '未知'}』· ${CommonUtils.formatNumber(count)}次（占比${percentage}%）· 字数${CommonUtils.formatNumber(user.period_words || 0)} · 活跃${user.active_days || 0}天 · 最后发言: ${lastSpeakingTime}`
    }

    /**
     * 格式化排行榜消息
     * @param {Array} rankData 排行榜数据
     * @param {string} timeRange 时间范围
     * @param {Object|null} userRankData 用户个人排名数据（如果不在显示范围内）
     * @returns {string} 格式化后的消息
     */
    formatRankingMessage(rankData, timeRange, userRankData = null) {
        const totalMessages = rankData.reduce((sum, user) => sum + (user.count || user.total || 0), 0)
        const msg = [`${timeRange}排行榜:`]
        
        for (let i = 0; i < rankData.length; i++) {
            msg.push(this.formatUserRank(rankData[i], i + 1, totalMessages))
        }
        
        if (userRankData && userRankData.rank) {
            msg.push('')
            msg.push('━━━━━━━━━━━━━━')
            msg.push('个人排名:')
            const userCount = userRankData.count || 0
            const userTotalForPercentage = totalMessages + userCount
            msg.push(this.formatUserRank({ ...userRankData, count: userCount }, userRankData.rank, userTotalForPercentage))
        }
        
        return msg.join('\n')
    }
}

export { TextFormatter }
export default TextFormatter

