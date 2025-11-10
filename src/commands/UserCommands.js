import { DataService } from '../core/DataService.js';
import { globalConfig } from '../core/ConfigManager.js';
import { CommonUtils } from '../core/utils/CommonUtils.js';
import { TimeUtils } from '../core/utils/TimeUtils.js';
import { ImageGenerator } from '../render/ImageGenerator.js';
import { TextFormatter } from '../render/TextFormatter.js';
import { segment } from 'oicq';

/**
 * 用户查询命令处理类
 */
class UserCommands {
    constructor(dataService = null) {
        this.dataService = dataService || new DataService();
        this.imageGenerator = new ImageGenerator(dataService);
        this.textFormatter = new TextFormatter(dataService);
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
                reg: '^#水群查询群列表$',
                fnc: 'listUserGroups'
            },
            {
                reg: '^#水群网页$',
                fnc: 'openWebPage'
            }
        ];
    }

    /**
     * 解析 @ 用户或QQ号
     * @param {Object} e 消息事件
     * @returns {Object} { userId: string, nickname: string } 或 null
     */
    parseMentionedUser(e) {
        // 检查消息中是否有 @
        if (e.message) {
            for (const item of e.message) {
                if (item.type === 'at' && item.qq) {
                    return {
                        userId: String(item.qq),
                        nickname: item.text || `用户${item.qq}`
                    };
                }
            }
        }
        
        // 检查文本消息中是否有 @QQ号
        const match = e.msg?.match(/@(\d+)/);
        if (match) {
            return {
                userId: match[1],
                nickname: `用户${match[1]}`
            };
        }
        
        return null;
    }

    /**
     * 查询个人统计数据（所有群聊数据总和）
     */
    async queryUserStats(e) {
        const validation = CommonUtils.validateGroupMessage(e, false);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        try {
            // 解析 @ 用户
            let userId, nickname;
            const mentionedUser = this.parseMentionedUser(e);
            
            if (mentionedUser) {
                // 查询 @ 的用户
                userId = mentionedUser.userId;
                nickname = mentionedUser.nickname;
            } else {
                // 查询自己
                userId = String(e.sender?.user_id || e.user_id || '');
                nickname = e.sender?.card || e.sender?.nickname || '未知用户';
            }
            
            if (!userId) {
                return e.reply('无法获取用户信息');
            }

            // 使用 SQL 聚合查询获取用户在所有群聊的数据总和（性能优化）
            const dbService = this.dataService.dbService;
            const userStats = await dbService.getUserStatsAllGroups(userId);
            
            // 检查是否有统计数据（判断条件：如果有 total_count 或 total_words 或 active_days，则认为有数据）
            if (!userStats || (
                (!userStats.total_count || userStats.total_count === 0) && 
                (!userStats.total_words || userStats.total_words === 0) && 
                (!userStats.active_days || userStats.active_days === 0)
            )) {
                return e.reply(`${nickname} 暂无统计数据`);
            }
            
            // 使用数据库中的昵称（如果有），否则使用解析的昵称
            nickname = userStats.nickname || nickname;
            
            // 获取基础统计数据
            const totalCount = parseInt(userStats.total_count || 0, 10);
            const totalWords = parseInt(userStats.total_words || 0, 10);
            const totalActiveDays = parseInt(userStats.active_days || 0, 10);
            const maxContinuousDays = parseInt(userStats.continuous_days || 0, 10);
            const lastSpeakingTime = userStats.last_speaking_time || null;
            
            // 获取今日和本月的统计数据
            const timeInfo = TimeUtils.getCurrentDateTime();
            const todayDate = timeInfo.formattedDate;
            const monthKey = timeInfo.monthKey;
            
            const todayStat = await dbService.getUserDailyStatsAllGroups(userId, todayDate);
            const monthStat = await dbService.getUserMonthlyStatsAllGroups(userId, monthKey);
            
            const todayStats = todayStat ? {
                count: parseInt(todayStat.message_count || 0, 10),
                words: parseInt(todayStat.word_count || 0, 10)
            } : { count: 0, words: 0 };
            
            const monthStats = monthStat ? {
                count: parseInt(monthStat.message_count || 0, 10),
                words: parseInt(monthStat.word_count || 0, 10)
            } : { count: 0, words: 0 };
            
            const allDailyStats = { [todayDate]: todayStats };
            const allMonthlyStats = { [monthKey]: monthStats };

            // 获取全局排名和统计信息
            let globalRank = null;
            let totalUsers = 0;
            let totalMessages = 0;
            let groupCount = 0;
            try {
                // 获取用户全局排名
                const userRankData = await this.dataService.getUserRankData(userId, null, 'total', {});
                if (userRankData) {
                    globalRank = userRankData.rank;
                }
                
                // 获取全局统计
                const globalStats = await this.dataService.getGlobalStats(1, 1);
                totalUsers = globalStats.totalUsers || 0;
                totalMessages = globalStats.totalMessages || 0;
                
                // 获取用户所在的群个数
                const userStatsList = await dbService.all(
                    'SELECT COUNT(DISTINCT group_id) as group_count FROM user_stats WHERE user_id = $1',
                    userId
                );
                if (userStatsList && userStatsList.length > 0) {
                    groupCount = parseInt(userStatsList[0].group_count || 0, 10);
                }
            } catch (error) {
                globalConfig.debug('获取排名信息失败:', error);
            }

            // 计算占比
            const messagePercentage = totalMessages > 0 
                ? ((totalCount / totalMessages) * 100).toFixed(2) 
                : '0.00';
            const userPercentage = totalUsers > 0 
                ? ((1 / totalUsers) * 100).toFixed(4) 
                : '0.0000';

            // 构建用户数据对象（用于模板）
            const userData = {
                user_id: userId,
                nickname: nickname,
                total: totalCount,
                total_count: totalCount,
                total_number_of_words: totalWords,
                active_days: totalActiveDays,
                continuous_days: maxContinuousDays,
                last_speaking_time: lastSpeakingTime,
                daily_stats: allDailyStats,
                monthly_stats: allMonthlyStats,
                global_rank: globalRank,
                message_percentage: messagePercentage,
                user_percentage: userPercentage,
                today_count: todayStats.count,
                today_words: todayStats.words,
                month_count: monthStats.count,
                month_words: monthStats.words,
                group_count: groupCount
            };

            // 优先使用图片模式（使用userStatsTemplate.html，图片生成失败时回退到文本模式）
            try {
                // 使用全局统计的群名称
                const groupName = '全局统计';
                const imagePath = await this.imageGenerator.generateUserStatsImage(
                    userData,
                    null, // 全局统计，不限制群ID
                    groupName,
                    userId,
                    nickname
                );
                return e.reply(segment.image(`file:///${imagePath.replace(/\\/g, '/')}`));
            } catch (error) {
                globalConfig.error('生成用户统计图片失败，回退到文本模式:', error);
                // 回退到文本模式
            }

            // 文本模式
            let text = `📊 ${nickname} 的统计数据（所有群聊总和）\n\n`;
            text += `总发言: ${CommonUtils.formatNumber(totalCount)} 条\n`;
            text += `总字数: ${CommonUtils.formatNumber(totalWords)} 字\n`;
            text += `活跃天数: ${totalActiveDays} 天\n`;
            text += `连续天数: ${maxContinuousDays} 天\n`;
            text += `今日发言: ${CommonUtils.formatNumber(todayStats.count)} 条\n`;
            text += `今日字数: ${CommonUtils.formatNumber(todayStats.words)} 字\n`;
            text += `本月发言: ${CommonUtils.formatNumber(monthStats.count)} 条\n`;
            text += `本月字数: ${CommonUtils.formatNumber(monthStats.words)} 字\n`;
            text += `最后发言: ${lastSpeakingTime || '未知'}`;

            return e.reply(text);
        } catch (error) {
            globalConfig.error('查询用户统计失败:', error);
            return e.reply('查询失败，请稍后重试');
        }
    }

    /**
     * 查询用户群列表
     */
    async listUserGroups(e) {
        const validation = CommonUtils.validateGroupMessage(e, false);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        try {
            const userId = String(e.sender.user_id);
            const dbService = this.dataService.dbService;
            
            // 直接从数据库查询该用户所在的所有群（性能优化）
            const userStatsList = await dbService.all(
                'SELECT * FROM user_stats WHERE user_id = $1 ORDER BY total_count DESC',
                userId
            );

            if (!userStatsList || userStatsList.length === 0) {
                return e.reply('你在任何群中都没有统计数据');
            }

            const userGroups = [];

            for (const userStats of userStatsList) {
                // 确保转换为数字类型
                const totalCount = parseInt(userStats.total_count || 0, 10);
                const totalWords = parseInt(userStats.total_words || 0, 10);
                const activeDays = parseInt(userStats.active_days || 0, 10);
                
                // 只要有任何一个统计数据（发言数、字数、活跃天数），就显示该群
                if (totalCount > 0 || totalWords > 0 || activeDays > 0) {
                    // 获取群名称
                    let groupName = `群${userStats.group_id}`;
                    try {
                        if (typeof Bot !== 'undefined' && Bot.gl) {
                            const groupInfo = Bot.gl.get(userStats.group_id);
                            if (groupInfo) {
                                groupName = groupInfo.group_name || groupName;
                            }
                        }
                    } catch (err) {
                        // 忽略错误
                    }

                    userGroups.push({
                        groupId: userStats.group_id,
                        groupName: groupName,
                        totalCount: totalCount,
                        totalWords: totalWords,
                        activeDays: activeDays,
                        lastSpeakingTime: userStats.last_speaking_time || '未知'
                    });
                }
            }

            if (userGroups.length === 0) {
                return e.reply('你在任何群中都没有统计数据');
            }

            let text = `📊 你在以下群聊的统计数据：\n\n`;
            userGroups.forEach((group, index) => {
                text += `${index + 1}. ${group.groupName} (${group.groupId})\n`;
                text += `   总发言: ${CommonUtils.formatNumber(group.totalCount)} 条\n`;
                text += `   总字数: ${CommonUtils.formatNumber(group.totalWords)} 字\n`;
                text += `   活跃天数: ${group.activeDays} 天\n`;
                text += `   最后发言: ${group.lastSpeakingTime}\n\n`;
            });

            // 计算总统计
            const totalCount = userGroups.reduce((sum, g) => sum + g.totalCount, 0);
            const totalWords = userGroups.reduce((sum, g) => sum + g.totalWords, 0);
            text += `总计: ${CommonUtils.formatNumber(totalCount)} 条 / ${CommonUtils.formatNumber(totalWords)} 字`;

            return e.reply(text);
        } catch (error) {
            globalConfig.error('查询用户群列表失败:', error);
            return e.reply('查询失败，请稍后重试');
        }
    }

    /**
     * 打开网页（生成带token的链接）
     */
    async openWebPage(e) {
        try {
            const userId = String(e.user_id);
            const { WebLinkGenerator } = await import('../core/utils/WebLinkGenerator.js');
            const result = await WebLinkGenerator.generateWebPageLink(userId);
            
            if (!result.success) {
                return e.reply(`❌ ${result.message}`);
            }
            
            return e.reply([
                segment.text('📊 你的统计网页链接：\n'),
                segment.text(result.url),
                segment.text('\n\n⚠️ 链接24小时内有效，请勿分享给他人')
            ]);
        } catch (error) {
            globalConfig.error('生成网页链接失败:', error);
            return e.reply('❌ 生成链接失败，请稍后重试');
        }
    }

}

export { UserCommands };
export default UserCommands;

