import { DataService } from '../core/DataService.js'
import { globalConfig } from '../core/ConfigManager.js'
import { CommonUtils } from '../core/utils/CommonUtils.js'
import { CommandWrapper } from '../core/utils/CommandWrapper.js'
import { UserParser } from '../core/utils/UserParser.js'
import { TimeUtils } from '../core/utils/TimeUtils.js'
import { ImageGenerator } from '../render/ImageGenerator.js'
import { TextFormatter } from '../render/TextFormatter.js'
import { segment } from 'oicq'
import common from '../../../../lib/common/common.js'

/**
 * 用户查询命令处理类
 */
class UserCommands {
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

    /**
     * 获取命令规则
     */
    static getRules() {
        return [
            {
                reg: '^#水群查询(\\s+@.*)?$',
                fnc: 'queryUserStats'
            },
            {
                reg: '^#水群查询群列表(\\s+@.*)?$',
                fnc: 'listUserGroups'
            },
            {
                reg: '^#水群网页$',
                fnc: 'openWebPage'
            }
        ]
    }

    /**
     * 查询个人统计数据（所有群聊数据总和）
     */
    async queryUserStats(e) {
        const validation = CommonUtils.validateGroupMessage(e, false)
        if (!validation.valid) {
            return e.reply(validation.message)
        }

        return await CommandWrapper.safeExecute(async () => {
            const userInfo = UserParser.parseUser(e, { allowMention: true, defaultToSelf: true })
            if (!userInfo?.userId) {
                return e.reply('无法获取用户信息')
            }

            const userId = userInfo.userId
            const dbService = this.dataService.dbService
            const userStats = await dbService.getUserStatsAllGroups(userId)
            
            if (!userStats || (
                (!userStats.total_count || userStats.total_count === 0) && 
                (!userStats.total_words || userStats.total_words === 0) && 
                (!userStats.active_days || userStats.active_days === 0)
            )) {
                return e.reply(`${userInfo.nickname} 暂无统计数据`)
            }
            
            let nickname = userStats.nickname || userInfo.nickname
            const totalCount = parseInt(userStats.total_count || 0, 10)
            const totalWords = parseInt(userStats.total_words || 0, 10)
            const totalActiveDays = parseInt(userStats.active_days || 0, 10)
            const maxContinuousDays = parseInt(userStats.continuous_days || 0, 10)
            const lastSpeakingTime = userStats.last_speaking_time || null
            
            const timeInfo = TimeUtils.getCurrentDateTime()
            const todayDate = timeInfo.formattedDate
            const monthKey = timeInfo.monthKey
            
            const todayStat = await dbService.getUserDailyStatsAllGroups(userId, todayDate)
            const monthStat = await dbService.getUserMonthlyStatsAllGroups(userId, monthKey)
            
            const todayStats = todayStat ? {
                count: parseInt(todayStat.message_count || 0, 10),
                words: parseInt(todayStat.word_count || 0, 10)
            } : { count: 0, words: 0 }
            
            const monthStats = monthStat ? {
                count: parseInt(monthStat.message_count || 0, 10),
                words: parseInt(monthStat.word_count || 0, 10)
            } : { count: 0, words: 0 }

            let globalRank = null
            let totalUsers = 0
            let totalMessages = 0
            let groupCount = 0
            try {
                const userRankData = await this.dataService.getUserRankData(userId, null, 'total', {})
                if (userRankData) {
                    globalRank = userRankData.rank
                }
                
                const globalStats = await this.dataService.getGlobalStats(1, 1)
                totalUsers = globalStats.totalUsers || 0
                totalMessages = globalStats.totalMessages || 0
                
                const currentGroupIds = this.dataService.getCurrentGroupIdsForFilter()
                if (currentGroupIds && currentGroupIds.length > 0) {
                    const placeholders = currentGroupIds.map((_, i) => `$${i + 2}`).join(',')
                    const groupCountResult = await dbService.get(
                        `SELECT COUNT(DISTINCT group_id) as group_count FROM user_agg_stats WHERE user_id = $1 AND group_id IN (${placeholders}) AND group_id NOT IN (SELECT group_id FROM archived_groups)`,
                        userId,
                        ...currentGroupIds
                    )
                    groupCount = parseInt(groupCountResult?.group_count || 0, 10)
                } else {
                    const userStatsList = await dbService.all(
                        'SELECT COUNT(DISTINCT group_id) as group_count FROM user_agg_stats WHERE user_id = $1 AND group_id NOT IN (SELECT group_id FROM archived_groups)',
                        userId
                    )
                    if (userStatsList?.length > 0) groupCount = parseInt(userStatsList[0].group_count || 0, 10)
                }
            } catch {
                globalConfig.debug('获取排名信息失败')
            }

            const messagePercentage = totalMessages > 0 
                ? ((totalCount / totalMessages) * 100).toFixed(2) 
                : '0.00'
            const userPercentage = totalUsers > 0 
                ? ((1 / totalUsers) * 100).toFixed(4) 
                : '0.0000'

            const userData = {
                user_id: userId,
                nickname: nickname,
                total: totalCount,
                total_count: totalCount,
                total_number_of_words: totalWords,
                active_days: totalActiveDays,
                continuous_days: maxContinuousDays,
                last_speaking_time: lastSpeakingTime,
                daily_stats: { [todayDate]: todayStats },
                monthly_stats: { [monthKey]: monthStats },
                global_rank: globalRank,
                message_percentage: messagePercentage,
                user_percentage: userPercentage,
                today_count: todayStats.count,
                today_words: todayStats.words,
                month_count: monthStats.count,
                month_words: monthStats.words,
                group_count: groupCount
            }

            try {
                const imagePath = await this.imageGenerator.generateUserStatsImage(
                    userData,
                    null,
                    '全局统计',
                    userId,
                    nickname
                )
                return e.reply(this.formatImageSegment(imagePath))
            } catch (err) {
                globalConfig.error('生成用户统计图片失败，回退到文本模式:', err)
            }

            let text = `📊 ${nickname} 的统计数据（所有群聊总和）\n\n`
            text += `总发言: ${CommonUtils.formatNumber(totalCount)} 条\n`
            text += `总字数: ${CommonUtils.formatNumber(totalWords)} 字\n`
            text += `活跃天数: ${totalActiveDays} 天\n`
            text += `连续天数: ${maxContinuousDays} 天\n`
            text += `今日发言: ${CommonUtils.formatNumber(todayStats.count)} 条\n`
            text += `今日字数: ${CommonUtils.formatNumber(todayStats.words)} 字\n`
            text += `本月发言: ${CommonUtils.formatNumber(monthStats.count)} 条\n`
            text += `本月字数: ${CommonUtils.formatNumber(monthStats.words)} 字\n`
            text += `最后发言: ${lastSpeakingTime || '未知'}`

            return e.reply(text)
        }, '查询用户统计失败', async () => {
            return e.reply('查询失败，请稍后重试')
        })
    }

    /**
     * 查询用户群列表
     */
    async listUserGroups(e) {
        const validation = CommonUtils.validateGroupMessage(e, false)
        if (!validation.valid) {
            return e.reply(validation.message)
        }

        return await CommandWrapper.safeExecute(async () => {
            const userInfo = UserParser.parseUser(e, { allowMention: true, defaultToSelf: true })
            if (!userInfo?.userId) {
                return e.reply('无法获取用户信息')
            }

            const userId = userInfo.userId
            let nickname = userInfo.nickname
            const mentionedUser = userInfo.isMentioned ? userInfo : null
            const dbService = this.dataService.dbService
            
            let userStatsList = await dbService.all(
                `SELECT *
                 FROM user_agg_stats
                 WHERE user_id = $1 AND group_id NOT IN (SELECT group_id FROM archived_groups)
                 ORDER BY total_msg DESC`,
                userId
            )
            userStatsList = (userStatsList || []).map(row => {
                let statsJson = {}
                try {
                    if (typeof row.stats_json === 'string') {
                        statsJson = JSON.parse(row.stats_json)
                    } else if (row.stats_json && typeof row.stats_json === 'object') {
                        statsJson = row.stats_json
                    }
                } catch {}
                return {
                    ...row,
                    nickname: statsJson.nickname || '',
                    total_count: parseInt(row.total_msg || 0, 10),
                    total_words: parseInt(row.total_word || 0, 10),
                    active_days: parseInt(statsJson.active_days || 0, 10)
                }
            })
            const currentGroupIds = this.dataService.getCurrentGroupIdsForFilter()
            if (currentGroupIds && currentGroupIds.length > 0) {
                const currentSet = new Set(currentGroupIds.map(String))
                userStatsList = (userStatsList || []).filter(row => currentSet.has(String(row.group_id)))
            }

            if (!userStatsList?.length) {
                const message = mentionedUser 
                    ? `${nickname} 在任何群中都没有统计数据`
                    : '你在任何群中都没有统计数据'
                return e.reply(message)
            }

            const userGroups = []
            for (const userStats of userStatsList) {
                const totalCount = parseInt(userStats.total_count || 0, 10)
                const totalWords = parseInt(userStats.total_words || 0, 10)
                const activeDays = parseInt(userStats.active_days || 0, 10)
                
                if (totalCount > 0 || totalWords > 0 || activeDays > 0) {
                    let groupName = this.dataService.getDefaultGroupDisplayName(userStats.group_id)
                    try {
                        groupName = await this.dataService.getPreferredGroupName(userStats.group_id, e)
                    } catch {
                        globalConfig.debug('获取群名称失败')
                    }

                    userGroups.push({
                        groupId: userStats.group_id,
                        groupName: groupName,
                        totalCount: totalCount,
                        totalWords: totalWords,
                        activeDays: activeDays,
                        lastSpeakingTime: userStats.last_speaking_time || '未知'
                    })
                }
            }

            if (userGroups.length === 0) {
                const message = mentionedUser 
                    ? `${nickname} 在任何群中都没有统计数据`
                    : '你在任何群中都没有统计数据'
                return e.reply(message)
            }

            try {
                const firstStat = userStatsList[0]
                if (firstStat?.nickname) {
                    nickname = firstStat.nickname
                }
            } catch {}

            const msg = []
            const titleText = mentionedUser 
                ? `📊 ${nickname} 在以下群聊的统计数据：\n`
                : `📊 你在以下群聊的统计数据：\n`
            msg.push([titleText, `共 ${userGroups.length} 个群聊\n`])

            userGroups.forEach((group, index) => {
                const maskedGroupId = CommonUtils.maskGroupId(group.groupId)
                msg.push([
                    `${index + 1}. ${group.groupName}\n`,
                    `群号: ${maskedGroupId}\n`,
                    `总发言: ${CommonUtils.formatNumber(group.totalCount)} 条\n`,
                    `总字数: ${CommonUtils.formatNumber(group.totalWords)} 字\n`,
                    `活跃天数: ${group.activeDays} 天\n`,
                    `最后发言: ${group.lastSpeakingTime}`
                ])
            })

            const totalCount = userGroups.reduce((sum, g) => sum + g.totalCount, 0)
            const totalWords = userGroups.reduce((sum, g) => sum + g.totalWords, 0)
            msg.push([
                `📊 总计统计\n`,
                `总发言: ${CommonUtils.formatNumber(totalCount)} 条\n`,
                `总字数: ${CommonUtils.formatNumber(totalWords)} 字`
            ])

            // 优先发送合并转发消息；若运行环境不支持 forward，自动回落到纯文本
            try {
                return e.reply(common.makeForwardMsg(e, msg, '水群查询群列表'))
            } catch (err) {
                globalConfig.warn('合并转发不可用，回落到文本发送:', err?.message || err)

                const plainText = []
                plainText.push(titleText.trim())
                for (const group of userGroups) {
                    const maskedGroupId = CommonUtils.maskGroupId(group.groupId)
                    plainText.push(
                        `${group.groupName}\n` +
                        `群号: ${maskedGroupId}\n` +
                        `总发言: ${CommonUtils.formatNumber(group.totalCount)} 条\n` +
                        `总字数: ${CommonUtils.formatNumber(group.totalWords)} 字\n` +
                        `活跃天数: ${group.activeDays} 天\n` +
                        `最后发言: ${group.lastSpeakingTime}`
                    )
                }
                plainText.push(
                    `📊 总计统计\n` +
                    `总发言: ${CommonUtils.formatNumber(totalCount)} 条\n` +
                    `总字数: ${CommonUtils.formatNumber(totalWords)} 字`
                )

                return e.reply(plainText.join('\n\n'))
            }
        }, '查询用户群列表失败', async () => {
            return e.reply('查询失败，请稍后重试')
        })
    }

    /**
     * 打开网页（生成带token的链接）
     */
    async openWebPage(e) {
        return await CommandWrapper.safeExecute(async () => {
            const userId = String(e.user_id)
            const { WebLinkGenerator } = await import('../core/utils/WebLinkGenerator.js')
            const result = await WebLinkGenerator.generateWebPageLink(userId)
            
            if (!result.success) {
                return e.reply(`❌ ${result.message}`)
            }
            
            return e.reply(`📊 你的统计网页链接：\n${result.url}\n\n⚠️ 链接24小时内有效，请勿分享给他人`)
        }, '生成网页链接失败', async () => {
            return e.reply('❌ 生成链接失败，请稍后重试')
        })
    }

}

export { UserCommands }
export default UserCommands
