import plugin from '../../../../lib/plugins/plugin.js'
import { getDataService } from './DataService.js'
import { getMessageRecorder } from './MessageRecorder.js'
import { RankCommands } from '../commands/RankCommands.js'
import { UserCommands } from '../commands/UserCommands.js'
import { AdminCommands } from '../commands/AdminCommands.js'
import { HelpCommands } from '../commands/HelpCommands.js'
import { AchievementCommands } from '../commands/AchievementCommands.js'
import { BackgroundManager } from '../managers/BackgroundManager.js'
import { globalConfig } from './ConfigManager.js'

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
                ...AchievementCommands.getRules(),
                ...BackgroundManager.getRules()
            ]
        });

        // 获取单例的数据服务实例和消息记录器实例
        this.dataService = getDataService()
        this.messageRecorder = getMessageRecorder(this.dataService)

        this.rankCommands = new RankCommands(this.dataService)
        this.userCommands = new UserCommands(this.dataService)
        this.adminCommands = new AdminCommands(this.dataService)
        this.helpCommands = new HelpCommands(this.dataService)
        this.achievementCommands = new AchievementCommands(this.dataService)
        this.backgroundCommands = new BackgroundManager()

        globalConfig.debug('[发言统计] 插件实例创建完成')
    }

    static _initialized = false
    static _initializing = false

    /**
     * 插件初始化
     * 启动Web服务器
     */
    async init() {
        if (Plugin._initialized) {
            globalConfig.debug('[发言统计] 插件已初始化，跳过重复初始化')
            return
        }

        if (Plugin._initializing) {
            globalConfig.debug('[发言统计] 插件正在初始化中，请稍候...')
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
        try {
            // 优化 key.json 文件（移除明文秘钥）
                const { PathResolver } = await import('./utils/PathResolver.js')
                const fs = await import('fs')
                const path = await import('path')
                const keyFilePath = path.join(PathResolver.getDataDir(), 'key.json')
                
                if (fs.existsSync(keyFilePath)) {
                    const content = fs.readFileSync(keyFilePath, 'utf8').trim()
                    if (content) {
                        const keyData = JSON.parse(content)
                        let cleanedCount = 0
                        let optimized = false
                        
                        for (const [userId, userData] of Object.entries(keyData)) {
                            if (!userData || typeof userData !== 'object') continue
                            
                            if (userData.originalKey) {
                                delete userData.originalKey
                                cleanedCount++
                                optimized = true
                            }
                            
                            if (!userData.role) {
                                userData.role = 'user'
                                optimized = true
                            } else if (userData.role !== 'admin' && userData.role !== 'user') {
                                userData.role = 'user'
                                optimized = true
                            }
                        }
                        
                        if (optimized) {
                            const keyFileDir = path.dirname(keyFilePath)
                            if (!fs.existsSync(keyFileDir)) fs.mkdirSync(keyFileDir, { recursive: true })
                            fs.writeFileSync(keyFilePath, JSON.stringify(keyData, null, 2), 'utf8')
                            if (cleanedCount > 0) {
                                global.logger?.mark?.(`[发言统计] key.json 优化完成，清理了 ${cleanedCount} 个用户的明文秘钥`) || globalConfig.debug(`[发言统计] key.json 优化完成，清理了 ${cleanedCount} 个用户的明文秘钥`)
                            }
                        }
                    }
                }
            } catch (optimizeErr) {
                globalConfig.warn('[发言统计] key.json 优化失败:', optimizeErr)
            }

            const { getWebServer } = await import('../services/WebServer.js')
            const webServer = getWebServer()
            
            if (webServer.isRunning) {
                globalConfig.debug('[发言统计] Web服务器已在运行')
                Plugin._initialized = true
                Plugin._initializing = false
                return
            }
            
            await webServer.start()
            globalConfig.debug('[发言统计] Web服务器启动成功')
            
            this.startArchivedGroupsCleanupTask()
            
            Plugin._initialized = true
        } catch (err) {
            globalConfig.error('[发言统计] Web服务器启动失败:', err)
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

    async openWebPage(e) {
        return await this.userCommands.openWebPage(e)
    }

    async clearRanking(e) {
        return await this.adminCommands.clearRanking(e)
    }

    async setDisplayCount(e) {
        return await this.adminCommands.setDisplayCount(e)
    }

    async setUseForward(e) {
        return await this.adminCommands.setUseForward(e)
    }

    async setUsePicture(e) {
        return await this.adminCommands.setUsePicture(e)
    }

    async toggleRecordMessage(e) {
        return await this.adminCommands.toggleRecordMessage(e)
    }

    async toggleDebugLog(e) {
        return await this.adminCommands.toggleDebugLog(e)
    }

    async updatePlugin(e) {
        return await this.adminCommands.updatePlugin(e)
    }

    async refreshAchievements(e) {
        return await this.adminCommands.refreshAchievements(e)
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

    async clearCache(e) {
        return await this.adminCommands.clearCache(e)
    }

    async showUserAchievements(e) {
        return await this.achievementCommands.showUserAchievements(e)
    }

    async showUserBadges(e) {
        return await this.achievementCommands.showUserBadges(e)
    }

    async setDisplayAchievement(e) {
        return await this.achievementCommands.setDisplayAchievement(e)
    }

    async showAchievementStatistics(e) {
        return await this.achievementCommands.showAchievementStatistics(e)
    }

    async grantUserAchievement(e) {
        return await this.achievementCommands.grantUserAchievement(e)
    }

    async addUserAchievement(e) {
        return await this.achievementCommands.addUserAchievement(e)
    }

    async showHelp(e) {
        return await this.helpCommands.showHelp(e)
    }

    async openBackgroundPage(e) {
        return await this.backgroundCommands.openBackgroundPage(e)
    }

    async removeBackground(e) {
        return await this.backgroundCommands.removeBackground(e)
    }

    async showBackgroundHelp(e) {
        return await this.backgroundCommands.showBackgroundHelp(e)
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

