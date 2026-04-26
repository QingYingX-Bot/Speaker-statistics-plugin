import plugin from '../../../lib/plugins/plugin.js'
import { getDataService } from './DataService.js'
import { getMessageRecorder } from './MessageRecorder.js'
import { RankCommands } from '../apps/commands/RankCommands.js'
import { UserCommands } from '../apps/commands/UserCommands.js'
import { AdminCommands } from '../apps/commands/AdminCommands.js'
import { HelpCommands } from '../apps/commands/HelpCommands.js'
import { ReportCommands } from '../apps/commands/ReportCommands.js'
import { WordCloudCommands } from '../apps/commands/WordCloudCommands.js'
import { globalConfig } from './ConfigManager.js'
import { ImageGenerator } from './render/ImageGenerator.js'

/**
 * 主插件类
 */
class Plugin extends plugin {
    constructor() {
        super({
            name: '发言次数统计',
            dsc: '统计并显示群成员的发言次数和活跃情况。',
            event: 'message',
            priority: -100000,
            rule: [
                ...UserCommands.getRules(),
                ...RankCommands.getRules(),
                ...AdminCommands.getRules(),
                ...HelpCommands.getRules(),
                ...ReportCommands.getRules(),
                ...WordCloudCommands.getRules()
            ]
        });

        // 共享核心组件，避免框架多次实例化时重复构建
        if (!Plugin._sharedCore) {
            const dataService = getDataService()
            const messageRecorder = getMessageRecorder(dataService)
            const imageGenerator = new ImageGenerator(dataService)
            Plugin._sharedCore = {
                dataService,
                messageRecorder,
                imageGenerator,
                rankCommands: new RankCommands(dataService, imageGenerator),
                userCommands: new UserCommands(dataService, imageGenerator),
                adminCommands: new AdminCommands(dataService),
                helpCommands: new HelpCommands(dataService, imageGenerator),
                reportCommands: new ReportCommands(),
                wordCloudCommands: new WordCloudCommands()
            }
            globalConfig.debug('插件核心组件初始化完成')
        }

        this.dataService = Plugin._sharedCore.dataService
        this.messageRecorder = Plugin._sharedCore.messageRecorder
        this.rankCommands = Plugin._sharedCore.rankCommands
        this.userCommands = Plugin._sharedCore.userCommands
        this.adminCommands = Plugin._sharedCore.adminCommands
        this.helpCommands = Plugin._sharedCore.helpCommands
        this.reportCommands = Plugin._sharedCore.reportCommands
        this.wordCloudCommands = Plugin._sharedCore.wordCloudCommands

        // 群聊报告定时任务挂载到主插件，保持“单主插件”结构
        const reportTasks = this.reportCommands?.getTasks?.() || []
        this.task = Array.isArray(reportTasks) ? reportTasks : []
    }

    static _initialized = false
    static _initializing = false
    static _sharedCore = null

    /**
     * 插件初始化
     */
    async init() {
        if (Plugin._initialized) {
            globalConfig.debug('插件已初始化，跳过重复初始化')
            return
        }

        if (Plugin._initializing) {
            globalConfig.debug('插件正在初始化中，请稍候...')
            let waitCount = 0
            while (Plugin._initializing && waitCount < 50) {
                await new Promise(resolve => setTimeout(resolve, 100))
                waitCount++
            }
            if (Plugin._initialized) {
                return
            }
        }

        Plugin._initializing = true

        try {
            this.startArchivedGroupsCleanupTask()

            await Promise.all([
                this.reportCommands?.init?.().catch(err => {
                    globalConfig.warn('群聊报告功能初始化失败:', err?.message || err)
                }),
                this.wordCloudCommands?.init?.().catch(err => {
                    globalConfig.warn('词云功能初始化失败:', err?.message || err)
                })
            ])
            
            Plugin._initialized = true
        } catch (err) {
            globalConfig.error('插件初始化失败:', err)
            Plugin._initialized = true
        } finally {
            Plugin._initializing = false
        }
    }

    async showTotalRank(e) {
        return await this.rankCommands.showTotalRank(e)
    }

    async showDailyRank(e) {
        return await this.rankCommands.showDailyRank(e)
    }

    async showWeeklyRank(e) {
        return await this.rankCommands.showWeeklyRank(e)
    }

    async showMonthlyRank(e) {
        return await this.rankCommands.showMonthlyRank(e)
    }

    async showYearlyRank(e) {
        return await this.rankCommands.showYearlyRank(e)
    }

    async showGroupStats(e) {
        return await this.rankCommands.showGroupStats(e)
    }

    async showGroupInfo(e) {
        return await this.rankCommands.showGroupInfo(e)
    }

    async showGlobalStats(e) {
        return await this.rankCommands.showGlobalStats(e)
    }

    async showTrend(e) {
        return await this.rankCommands.showTrend(e)
    }

    async queryUserStats(e) {
        return await this.userCommands.queryUserStats(e)
    }

    async listUserGroups(e) {
        return await this.userCommands.listUserGroups(e)
    }

    async clearRanking(e) {
        return await this.adminCommands.clearRanking(e)
    }

    async setDisplayCount(e) {
        return await this.adminCommands.setDisplayCount(e)
    }

    async toggleSetting(e) {
        return await this.adminCommands.toggleSetting(e)
    }

    async updatePlugin(e) {
        return await this.adminCommands.updatePlugin(e)
    }

    async cleanZombieGroups(e) {
        return await this.adminCommands.cleanZombieGroups(e)
    }

    async confirmCleanZombieGroups(e) {
        return await this.adminCommands.confirmCleanZombieGroups(e)
    }

    async viewArchivedGroups(e) {
        return await this.adminCommands.viewArchivedGroups(e)
    }

    async refreshNicknames(e) {
        return await this.adminCommands.refreshNicknames(e)
    }

    async refreshAllNicknames(e) {
        return await this.adminCommands.refreshAllNicknames(e)
    }

    async cleanInvalidRecords(e) {
        return await this.adminCommands.cleanInvalidRecords(e)
    }

    async cleanAllInvalidRecords(e) {
        return await this.adminCommands.cleanAllInvalidRecords(e)
    }

    async clearCache(e) {
        return await this.adminCommands.clearCache(e)
    }

    async showHelp(e) {
        return await this.helpCommands.showHelp(e)
    }

    async generateReport(e) {
        return await this.reportCommands.generateReport(e)
    }

    async forceGenerateReport(e) {
        return await this.reportCommands.forceGenerateReport(e)
    }

    async generateFriendReport(e) {
        return await this.reportCommands.generateFriendReport(e)
    }

    async generateWordCloud(e) {
        return await this.wordCloudCommands.generateWordCloud(e)
    }

    async generatePersonalWordCloud(e) {
        return await this.wordCloudCommands.generatePersonalWordCloud(e)
    }

    async accept(e) {
        if (e.msg && typeof e.msg === 'string') {
            e.msg = e.msg.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
            e.msg = e.msg.replace(/[\u2000-\u200A\u2028-\u2029]/g, ' ')
            e.msg = e.msg.replace(/[\s\u00A0]+/g, ' ')
            e.msg = e.msg.trim()
        }
        
        if (globalConfig.getConfig('global.enableStatistics') && 
            globalConfig.getConfig('global.recordMessage')) {
            this.messageRecorder.recordMessage(e).catch(err => {
                if (globalConfig.getConfig('global.debugLog')) {
                    globalConfig.debug('[消息记录] 记录消息异常:', err.message || err)
                }
            })
        }
        
        return false
    }

    startArchivedGroupsCleanupTask() {
        if (Plugin._cleanupTaskStarted) {
            return
        }
        Plugin._cleanupTaskStarted = true

        const cleanupConfig = globalConfig.getConfig('archivedGroups.cleanup') || {}
        const enabled = cleanupConfig.enabled !== false
        const scheduleHour = cleanupConfig.scheduleHour ?? 2
        const scheduleMinute = cleanupConfig.scheduleMinute ?? 0
        const intervalHours = cleanupConfig.intervalHours ?? 24
        const retentionDays = cleanupConfig.retentionDays ?? 60

        if (!enabled) {
            globalConfig.debug('[发言统计] 归档群组清理任务已禁用')
            return
        }

        const now = new Date()
        const utc8Offset = 8 * 60 * 60 * 1000
        const utc8Now = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + utc8Offset)
        
        const nextRun = new Date(utc8Now)
        nextRun.setHours(scheduleHour, scheduleMinute, 0, 0)
        if (nextRun <= utc8Now) {
            nextRun.setDate(nextRun.getDate() + 1)
        }
        
        const msUntilNextRun = nextRun.getTime() - utc8Now.getTime()
        const intervalMs = intervalHours * 60 * 60 * 1000
        
        this.cleanupRetentionDays = retentionDays
        
        setTimeout(async () => {
            await this.runArchivedGroupsCleanup()
            
            setInterval(async () => {
                await this.runArchivedGroupsCleanup()
            }, intervalMs)
        }, msUntilNextRun)
        
        globalConfig.debug(`[发言统计] 归档群组清理任务已启动，将在 ${new Date(Date.now() + msUntilNextRun).toLocaleString('zh-CN')} 首次执行`)
        globalConfig.debug(`[发言统计] 清理配置：执行时间 ${scheduleHour}:${String(scheduleMinute).padStart(2, '0')}，执行间隔 ${intervalHours} 小时，保留天数 ${retentionDays} 天`)
    }

    async runArchivedGroupsCleanup() {
        try {
            const retentionDays = this.cleanupRetentionDays || 60
            globalConfig.debug(`[发言统计] 开始清理超过 ${retentionDays} 天的归档群组...`)
            const deletedCount = await this.dataService.dbService.cleanupArchivedGroups(retentionDays)
            if (deletedCount > 0) {
                global.logger?.mark?.(`[发言统计] 清理完成，已永久删除 ${deletedCount} 个超过 ${retentionDays} 天的归档群组`) || globalConfig.debug(`[发言统计] 清理完成，已永久删除 ${deletedCount} 个超过 ${retentionDays} 天的归档群组`)
            } else {
                globalConfig.debug('[发言统计] 没有需要清理的归档群组')
            }
        } catch (err) {
            globalConfig.error('[发言统计] 清理归档群组失败:', err)
        }
    }
}

Plugin._cleanupTaskStarted = false

export { Plugin }
export default Plugin
