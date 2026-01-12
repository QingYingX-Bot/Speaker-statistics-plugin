import { DataService } from '../core/DataService.js'
import { globalConfig } from '../core/ConfigManager.js'
import { CommonUtils } from '../core/utils/CommonUtils.js'
import { CommandWrapper } from '../core/utils/CommandWrapper.js'
import { ImageGenerator } from '../render/ImageGenerator.js'
import { TextFormatter } from '../render/TextFormatter.js'
import { TimeUtils } from '../core/utils/TimeUtils.js'
import { segment } from 'oicq'

/**
 * 排行榜命令处理类
 * 负责生成和发送各种类型的排行榜
 */
class RankCommands {
    constructor(dataService = null) {
        this.dataService = dataService || new DataService()
        this.imageGenerator = new ImageGenerator(dataService)
        this.textFormatter = new TextFormatter()
    }

    /**
     * 格式化图片路径为 segment 格式
     * @param {string} imagePath 图片路径
     * @returns {Object} segment 图片对象
     */
    formatImageSegment(base64) {
        return segment.image(`base64://${base64}`)
    }

    async getUserRankInfo(userId, groupId, period, rankings) {
        let userRankData = null
        let userInfo = null
        if (userId && !rankings.some(u => String(u.user_id) === userId)) {
            userRankData = await this.dataService.getUserRankData(userId, groupId, period, {})
            if (userRankData?.rank) {
                userInfo = {
                    data: {
                        user_id: userRankData.user_id,
                        nickname: userRankData.nickname,
                        count: userRankData.count,
                        period_words: userRankData.period_words,
                        active_days: userRankData.active_days,
                        continuous_days: userRankData.continuous_days,
                        last_speaking_time: userRankData.last_speaking_time
                    },
                    rank: userRankData.rank
                }
            }
        }
        return { userInfo, userRankData }
    }

    async renderRanking(e, period, periodName, emptyMsg, groupId = null, groupName = null, extraOptions = {}) {
        const userId = String(e.user_id || e.sender?.user_id || '')
        const limit = globalConfig.getConfig('display.displayCount') || 20
        const rankings = await this.dataService.getRankingData(groupId, period, { limit })
        
        if (rankings.length === 0) {
            return e.reply(emptyMsg)
        }

        const { userInfo, userRankData } = await this.getUserRankInfo(userId, groupId, period, rankings)
        const finalGroupName = groupName || (groupId ? (e.group?.name || `群${groupId}`) : '全局总榜')

        try {
            const imagePath = await this.imageGenerator.generateRankingImage(
                rankings,
                groupId,
                finalGroupName,
                periodName,
                period,
                userInfo,
                extraOptions
            )
            return e.reply(this.formatImageSegment(imagePath))
        } catch (err) {
            globalConfig.error(`生成${periodName}图片失败，回退到文本模式:`, err)
            return e.reply(this.textFormatter.formatRankingMessage(rankings, periodName, userRankData))
        }
    }

    /**
     * 获取命令规则
     * @returns {Array} 命令规则数组
     */
    static getRules() {
        return [
            {
                reg: '^#水群总榜$',
                fnc: 'showTotalRank'
            },
            {
                reg: '^#水群日榜$',
                fnc: 'showDailyRank'
            },
            {
                reg: '^#水群周榜$',
                fnc: 'showWeeklyRank'
            },
            {
                reg: '^#水群(月)?榜$',
                fnc: 'showMonthlyRank'
            },
            {
                reg: '^#水群年榜$',
                fnc: 'showYearlyRank'
            },
            {
                reg: '^#水群统计(\\s+\\d+)?$',
                fnc: 'showGroupStats'
            },
            {
                reg: '^#水群信息$',
                fnc: 'showGroupInfo'
            },
            {
                reg: '^#水群总统计(\\s+\\d+)?$|^#总水群统计(\\s+\\d+)?$',
                fnc: 'showGlobalStats'
            },
            {
                reg: '^#水群趋势(\\s+(\\d+))?$',
                fnc: 'showTrend'
            }
        ]
    }

    async showTotalRank(e) {
        const validation = CommonUtils.validateGroupMessage(e, false)
        if (!validation.valid) {
            return e.reply(validation.message)
        }

        return await CommandWrapper.safeExecute(async () => {
            const limit = globalConfig.getConfig('display.displayCount') || 20
            const rankingCacheKey = `ranking:total:all:${limit}`
            this.dataService.rankingCache.delete(rankingCacheKey)
            this.dataService.globalStatsCache.delete('globalStats:1:1')
            
            const globalStats = await this.dataService.getGlobalStats(1, 1)
            const rankings = await this.dataService.getRankingData(null, 'total', { limit })
            
            if (rankings.length === 0) {
                return e.reply('暂无排行榜数据')
            }

            const userId = String(e.user_id || e.sender?.user_id || '')
            const { userInfo, userRankData } = await this.getUserRankInfo(userId, null, 'total', rankings)

            try {
                const imagePath = await this.imageGenerator.generateRankingImage(
                    rankings,
                    null,
                    '全局总榜',
                    '总榜',
                    'total',
                    userInfo,
                    { globalTotalMessages: globalStats.totalMessages || 0 }
                )
                return e.reply(this.formatImageSegment(imagePath))
            } catch (err) {
                globalConfig.error('生成总榜图片失败，回退到文本模式:', err)
                return e.reply(this.textFormatter.formatRankingMessage(rankings, '总榜', userRankData))
            }
        }, '获取总榜失败', async () => {
            return e.reply('获取总榜失败，请稍后重试')
        })
    }

    async showDailyRank(e) {
        const validation = CommonUtils.validateGroupMessage(e)
        if (!validation.valid) {
            return e.reply(validation.message)
        }

        return await CommandWrapper.safeExecute(async () => {
            return await this.renderRanking(e, 'daily', '日榜', '今日暂无排行榜数据', String(e.group_id))
        }, '获取日榜失败', async () => {
            return e.reply('获取日榜失败，请稍后重试')
        })
    }

    async showWeeklyRank(e) {
        const validation = CommonUtils.validateGroupMessage(e)
        if (!validation.valid) {
            return e.reply(validation.message)
        }

        return await CommandWrapper.safeExecute(async () => {
            return await this.renderRanking(e, 'weekly', '周榜', '本周暂无排行榜数据', String(e.group_id))
        }, '获取周榜失败', async () => {
            return e.reply('获取周榜失败，请稍后重试')
        })
    }

    async showMonthlyRank(e) {
        const validation = CommonUtils.validateGroupMessage(e)
        if (!validation.valid) {
            return e.reply(validation.message)
        }

        return await CommandWrapper.safeExecute(async () => {
            return await this.renderRanking(e, 'monthly', '月榜', '本月暂无排行榜数据', String(e.group_id))
        }, '获取月榜失败', async () => {
            return e.reply('获取月榜失败，请稍后重试')
        })
    }

    async showYearlyRank(e) {
        const validation = CommonUtils.validateGroupMessage(e)
        if (!validation.valid) {
            return e.reply(validation.message)
        }

        return await CommandWrapper.safeExecute(async () => {
            return await this.renderRanking(e, 'yearly', '年榜', '本年暂无排行榜数据', String(e.group_id))
        }, '获取年榜失败', async () => {
            return e.reply('获取年榜失败，请稍后重试')
        })
    }

    /**
     * 显示群统计
     */
    async showGroupStats(e) {
        const validation = CommonUtils.validateGroupMessage(e)
        if (!validation.valid) {
            return e.reply(validation.message)
        }

        return await CommandWrapper.safeExecute(async () => {
            const groupId = String(e.group_id)
            const groupName = e.group?.name || `群${groupId}`
            const users = await this.dataService.dbService.getAllGroupUsers(groupId)
            
            const totalMessages = users.reduce((sum, user) => sum + parseInt(user.total_count || 0, 10), 0)
            const totalWords = users.reduce((sum, user) => sum + parseInt(user.total_words || 0, 10), 0)

            // 计算今日活跃和本月活跃
            const todayActive = await this.calculateTodayActive(groupId)
            const monthActive = await this.calculateMonthActive(groupId)

            // 获取前三用户
            const topUsers = users.slice(0, 3).map(user => ({
                user_id: user.user_id,
                nickname: user.nickname || '未知用户',
                total_count: parseInt(user.total_count || 0, 10),
                count: parseInt(user.total_count || 0, 10),
                total_words: parseInt(user.total_words || 0, 10),
                active_days: parseInt(user.active_days || 0, 10),
                continuous_days: parseInt(user.continuous_days || 0, 10)
            }))

            // 构建群统计数据
            const groupStats = {
                userCount: users.length,
                totalMessages: totalMessages,
                totalWords: totalWords,
                todayActive: todayActive,
                monthActive: monthActive
            }

            // 检查是否使用图片模式
            const usePicture = globalConfig.getConfig('display.usePicture')
            if (usePicture) {
                try {
                    const imagePath = await this.imageGenerator.generateGroupStatsImage(
                        groupStats,
                        groupId,
                        groupName,
                        topUsers
                    )
                    return e.reply(this.formatImageSegment(imagePath))
                } catch (err) {
                    globalConfig.error('生成群统计图片失败:', err)
                }
            }

            const text = `📊 群统计信息\n\n` +
                `总用户数: ${users.length}\n` +
                `总消息数: ${CommonUtils.formatNumber(totalMessages)}\n` +
                `总字数: ${CommonUtils.formatNumber(totalWords)}\n` +
                `今日活跃: ${CommonUtils.formatNumber(todayActive)} 人\n` +
                `本月活跃: ${CommonUtils.formatNumber(monthActive)} 人\n` +
                `平均消息数: ${users.length > 0 ? CommonUtils.formatNumber(Math.round(totalMessages / users.length)) : 0}`

            return e.reply(text)
        }, '获取群统计失败', async () => {
            return e.reply('获取群统计失败，请稍后重试')
        })
    }

    /**
     * 计算今日活跃人数
     */
    async calculateTodayActive(groupId) {
        try {
            const timeInfo = TimeUtils.getCurrentDateTime()
            const todayKey = timeInfo.formattedDate
            const users = await this.dataService.dbService.getAllGroupUsers(groupId)
            
            let todayActive = 0
            for (const user of users) {
                const dailyStats = await this.dataService.dbService.getDailyStats(groupId, user.user_id, todayKey)
                if (dailyStats && dailyStats.message_count > 0) {
                    todayActive++
                }
            }
            return todayActive
        } catch (err) {
            globalConfig.error('计算今日活跃人数失败:', err)
            return 0
        }
    }

    /**
     * 计算本月活跃人数
     */
    async calculateMonthActive(groupId) {
        try {
            const timeInfo = TimeUtils.getCurrentDateTime()
            const monthKey = timeInfo.monthKey
            const users = await this.dataService.dbService.getAllGroupUsers(groupId)
            
            let monthActive = 0
            for (const user of users) {
                const monthlyStats = await this.dataService.dbService.getMonthlyStats(groupId, user.user_id, monthKey)
                if (monthlyStats && monthlyStats.message_count > 0) {
                    monthActive++
                }
            }
            return monthActive
        } catch (err) {
            globalConfig.error('计算本月活跃人数失败:', err)
            return 0
        }
    }

    /**
     * 显示群信息
     */
    async showGroupInfo(e) {
        const validation = CommonUtils.validateGroupMessage(e)
        if (!validation.valid) {
            return e.reply(validation.message)
        }

        return await CommandWrapper.safeExecute(async () => {
            // 获取全局信息（所有群组）
            const allGroupIds = await this.dataService.dbService.getAllGroupIds()
            const groupCount = allGroupIds.length
            
            // 获取总用户数（不重复）
            const uniqueUsers = await this.dataService.dbService.all(
                'SELECT DISTINCT user_id FROM user_stats'
            )
            const totalUsers = uniqueUsers.length
            
            // 获取最早记录时间
            const earliestResult = await this.dataService.dbService.get(
                'SELECT MIN(created_at) as earliest_time FROM user_stats'
            )
            const earliestTime = earliestResult?.earliest_time || null

            // 格式化最早时间
            let earliestTimeStr = '未知'
            if (earliestTime) {
                try {
                    const date = new Date(earliestTime)
                    earliestTimeStr = date.toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                } catch (err) {
                    earliestTimeStr = earliestTime
                }
            }

            // 强制文本模式（不使用图片）
            let text = `📊 全局统计信息\n\n`
            text += `最早记录时间: ${earliestTimeStr}\n`
            text += `━━━━━━━━━━━━━━\n`
            text += `记录群组数: ${CommonUtils.formatNumber(groupCount)} 个\n`
            text += `记录用户数: ${CommonUtils.formatNumber(totalUsers)} 人\n`

            return e.reply(text)
        }, '获取群信息失败', async () => {
            return e.reply('获取群信息失败，请稍后重试')
        })
    }

    /**
     * 显示全局统计
     */
    async showGlobalStats(e) {
        const validation = CommonUtils.validateGroupMessage(e, false)
        if (!validation.valid) {
            return e.reply(validation.message)
        }

        return await CommandWrapper.safeExecute(async () => {
            // 解析页码参数（如果有）
            const match = e.msg.match(/\s+(\d+)/)
            const page = match ? parseInt(match[1], 10) : 1
            const pageSize = globalConfig.getConfig('display.globalStatsDisplayCount') || 10; // 从配置获取每页显示数量，默认10条

            // 获取全局统计数据
            const globalStats = await this.dataService.getGlobalStats(page, pageSize)

            // 检查是否使用图片模式
            const usePicture = globalConfig.getConfig('display.usePicture')
            if (usePicture) {
                try {
                    const imagePath = await this.imageGenerator.generateGlobalStatsImage(globalStats)
                    return e.reply(this.formatImageSegment(imagePath))
                } catch (err) {
                    globalConfig.error('生成全局统计图片失败:', err)
                    // 回退到文本模式
                }
            }

            // 文本模式
            const text = `📊 全局统计信息\n\n` +
                `统计群数: ${CommonUtils.formatNumber(globalStats.totalGroups)}\n` +
                `统计用户总数: ${CommonUtils.formatNumber(globalStats.totalUsers)}\n` +
                `消息总量: ${CommonUtils.formatNumber(globalStats.totalMessages)}\n` +
                `今日活跃人数: ${CommonUtils.formatNumber(globalStats.todayActive)}\n` +
                `本月活跃人数: ${CommonUtils.formatNumber(globalStats.monthActive)}\n\n` +
                `第 ${globalStats.currentPage} 页，共 ${globalStats.totalPages} 页\n\n`

            // 添加群组统计（前5个）
            if (globalStats.groups && globalStats.groups.length > 0) {
                const topGroups = globalStats.groups.slice(0, 5)
                let groupsText = '群组统计（前5个）:\n'
                topGroups.forEach((group, index) => {
                    groupsText += `${index + 1}. ${group.groupName || `群${group.groupId}`} (${group.groupId})\n`
                    groupsText += `   用户数: ${CommonUtils.formatNumber(group.userCount)} | `
                    groupsText += `消息数: ${CommonUtils.formatNumber(group.totalMessages)} | `
                    groupsText += `今日活跃: ${CommonUtils.formatNumber(group.todayActive)} | `
                    groupsText += `本月活跃: ${CommonUtils.formatNumber(group.monthActive)}\n`
                })
                return e.reply(text + groupsText)
            }

            return e.reply(text + '暂无群聊统计数据')
        }, '获取全局统计失败', async () => {
            return e.reply('获取全局统计失败，请稍后重试')
        })
    }

    /**
     * 显示发言趋势
     */
    async showTrend(e) {
        const validation = CommonUtils.validateGroupMessage(e, false)
        if (!validation.valid) {
            return e.reply(validation.message)
        }

        return await CommandWrapper.safeExecute(async () => {
            const groupId = e.group_id ? String(e.group_id) : null
            const match = e.msg.match(/^#水群趋势(?:\s+(\d+))?$/)
            const days = match && match[1] ? parseInt(match[1], 10) : 7
            const validDays = Math.max(1, Math.min(days, 90))
            
            // 获取趋势数据
            const trendData = await this.dataService.getGroupTrend(groupId, 'daily', { days: validDays })
            
            if (!trendData || trendData.length === 0) {
                return e.reply('暂无趋势数据')
            }

            // 计算统计数据
            const totalMessages = trendData.reduce((sum, item) => sum + item.value, 0)
            const avgMessages = totalMessages / trendData.length
            const maxMessages = Math.max(...trendData.map(item => item.value))
            const minMessages = Math.min(...trendData.map(item => item.value))
            
            // 计算趋势（最近3天 vs 前3天）
            const recent3Days = trendData.slice(-3)
            const previous3Days = trendData.slice(-6, -3)
            const recentAvg = recent3Days.reduce((sum, item) => sum + item.value, 0) / recent3Days.length
            const previousAvg = previous3Days.length > 0 
                ? previous3Days.reduce((sum, item) => sum + item.value, 0) / previous3Days.length 
                : recentAvg
            const trendChange = previousAvg > 0 
                ? ((recentAvg - previousAvg) / previousAvg * 100).toFixed(1)
                : '0.0'
            const trendIcon = parseFloat(trendChange) > 0 ? '📈' : parseFloat(trendChange) < 0 ? '📉' : '➡️'

            // 构建消息
            let text = `📊 发言趋势分析（最近${validDays}天）\n\n`
            
            if (groupId) {
                // 获取群名称
                let groupName = `群${groupId}`
                try {
                    const groupInfo = await this.dataService.dbService.getGroupInfo(groupId)
                    if (groupInfo && groupInfo.group_name) {
                        groupName = groupInfo.group_name
                    }
                } catch (err) {
                    // 忽略错误
                }
                text += `群聊: ${groupName}\n`
            } else {
                text += `范围: 所有群聊\n`
            }
            
            text += `━━━━━━━━━━━━━━\n\n`
            text += `📈 统计概览:\n`
            text += `  总消息数: ${CommonUtils.formatNumber(totalMessages)} 条\n`
            text += `  平均每日: ${CommonUtils.formatNumber(Math.round(avgMessages))} 条\n`
            text += `  最高单日: ${CommonUtils.formatNumber(maxMessages)} 条\n`
            text += `  最低单日: ${CommonUtils.formatNumber(minMessages)} 条\n`
            text += `  趋势变化: ${trendIcon} ${trendChange > 0 ? '+' : ''}${trendChange}% (最近3天 vs 前3天)\n\n`
            
            // 显示每日数据（最多显示20天，超过则只显示最近和最早的）
            const displayLimit = 20
            let displayData = trendData
            
            if (trendData.length > displayLimit) {
                // 显示最近10天和最早10天
                const recent = trendData.slice(-10)
                const earliest = trendData.slice(0, 10)
                displayData = [...earliest, { date: '...', value: null, change: null }, ...recent]
            }
            
            text += `📅 每日详情:\n`
            displayData.forEach((item, index) => {
                if (item.date === '...') {
                    text += `  ... (省略 ${trendData.length - 20} 天) ...\n`
                } else {
                    const date = item.date
                    const value = item.value
                    const change = item.change !== null ? (item.change > 0 ? `+${item.change}%` : `${item.change}%`) : '-'
                    const changeIcon = item.change !== null 
                        ? (item.change > 0 ? '↑' : item.change < 0 ? '↓' : '→')
                        : ''
                    
                    // 计算进度条长度（相对于最大值）
                    const maxValue = Math.max(...trendData.filter(d => d.value !== null).map(d => d.value))
                    const barLength = maxValue > 0 ? Math.round((value / maxValue) * 15) : 0
                    const bar = '█'.repeat(barLength) + '░'.repeat(15 - barLength)
                    
                    text += `  ${date}: ${bar} ${CommonUtils.formatNumber(value)}条 ${changeIcon}${change}\n`
                }
            })

            return e.reply(text)
        }, '获取趋势数据失败', async () => {
            return e.reply('查询失败，请稍后重试')
        })
    }

}

export { RankCommands }
export default RankCommands

