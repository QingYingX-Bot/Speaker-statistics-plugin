import { DataService } from '../core/DataService.js'
import { AchievementService } from '../core/AchievementService.js'
import { globalConfig } from '../core/ConfigManager.js'
import { CommonUtils } from '../core/utils/CommonUtils.js'
import { PathResolver } from '../core/utils/PathResolver.js'
import { CommandWrapper } from '../core/utils/CommandWrapper.js'
import { TimeUtils } from '../core/utils/TimeUtils.js'
import { AchievementUtils } from '../core/utils/AchievementUtils.js'
import { getPermissionManager } from '../core/utils/PermissionManager.js'
import common from '../../../../lib/common/common.js'
import fs from 'fs'
import path from 'path'

/**
 * 管理员命令处理类
 */
class AdminCommands {
    static pendingCleanGroups = new Map()

    constructor(dataService = null) {
        this.dataService = dataService || new DataService()
        this.achievementService = new AchievementService(this.dataService)
    }

    /**
     * 格式化日期时间为字符串
     * @param {Date|string} date 日期对象或字符串
     * @returns {string} 格式化后的日期时间字符串
     */
    formatDateTime(date) {
        if (!date) return '未知'
        if (date instanceof Date) {
            return TimeUtils.formatDateTime(date)
        }
        if (typeof date === 'string') {
            try {
                return TimeUtils.formatDateTime(new Date(date))
            } catch {
                return date
            }
        }
        return '未知'
    }

    /**
     * 获取命令规则
     */
    static getRules() {
        return [
            {
                reg: '^#水群清除统计$',
                fnc: 'clearRanking'
            },
            {
                reg: '^#水群设置人数\\+(\\d+)$',
                fnc: 'setDisplayCount'
            },
            {
                reg: '^#水群设置(开启|关闭)(转发|图片|记录|日志)$',
                fnc: 'toggleSetting'
            },
            {
                reg: '^#水群(强制)?更新$',
                fnc: 'updatePlugin'
            },
            {
                reg: '^#刷新(全群)?水群成就$',
                fnc: 'refreshAchievements'
            },
            {
                reg: '^#水群归档僵尸群$',
                fnc: 'cleanZombieGroups'
            },
            {
                reg: '^#水群确认归档$',
                fnc: 'confirmCleanZombieGroups'
            },
            {
                reg: '^#水群查看归档列表$',
                fnc: 'viewArchivedGroups'
            },
            {
                reg: '^#水群清理缓存$',
                fnc: 'clearCache'
            }
        ]
    }

    /**
     * 清除统计
     */
    async clearRanking(e) {
        if (!(await CommandWrapper.validateAndReply(e, getPermissionManager().validateAdminPermission(e)))) return
        if (!CommandWrapper.validateAndReply(e, CommonUtils.validateGroupMessage(e))) return

        return await CommandWrapper.safeExecute(
            async () => {
                const groupId = String(e.group_id)
                const success = await this.dataService.clearGroupStats(groupId)
                return e.reply(success ? '统计数据已清除' : '清除统计数据失败')
            },
            '清除统计失败',
            () => e.reply('清除失败，请稍后重试')
        )
    }

    /**
     * 设置显示人数
     */
    async setDisplayCount(e) {
        if (!(await CommandWrapper.validateAndReply(e, getPermissionManager().validateAdminPermission(e)))) return

        return await CommandWrapper.safeExecute(
            async () => {
                const match = e.msg.match(/^#水群设置人数\+(\d+)$/)
                if (!match) {
                    return e.reply('格式错误，正确格式：#水群设置人数+数字')
                }

                const count = parseInt(match[1])
                const numValidation = CommonUtils.validateNumber(String(count), 1, 100, '显示人数')
                if (!numValidation.valid) {
                    return e.reply(numValidation.message)
                }

                globalConfig.updateConfig('display.displayCount', count)
                return e.reply(`显示人数已设置为 ${count}`)
            },
            '设置显示人数失败',
            () => e.reply('设置失败，请稍后重试')
        )
    }

    /**
     * 切换设置
     */
    async toggleSetting(e) {
        if (!(await CommandWrapper.validateAndReply(e, getPermissionManager().validateAdminPermission(e)))) return

        return await CommandWrapper.safeExecute(
            async () => {
                const match = e.msg.match(/^#水群设置(开启|关闭)(转发|图片|记录|日志)$/)
                if (!match) {
                    return e.reply('格式错误')
                }

                const toggle = match[1] === '开启'
                const setting = match[2]

                const settingMap = {
                    '转发': { key: 'display.useForward', name: '转发消息' },
                    '图片': { key: 'display.usePicture', name: '图片模式' },
                    '记录': { key: 'global.recordMessage', name: '消息记录' },
                    '日志': { key: 'global.debugLog', name: '调试日志' }
                }

                const settingConfig = settingMap[setting]
                if (!settingConfig) {
                    return e.reply('未知设置项')
                }

                globalConfig.updateConfig(settingConfig.key, toggle)
                return e.reply(`${settingConfig.name}已${toggle ? '开启' : '关闭'}`)
            },
            '切换设置失败',
            () => e.reply('设置失败，请稍后重试')
        )
    }

    /**
     * 更新插件
     */
    async updatePlugin(e) {
        if (!(await CommandWrapper.validateAndReply(e, getPermissionManager().validateAdminPermission(e)))) return

        try {
            const isForce = e.msg.includes('强制')
            const pluginDir = PathResolver.getPluginDir()
            const gitDir = path.join(pluginDir, '.git')
            
            if (!fs.existsSync(gitDir)) {
                return e.reply('❌ 当前插件目录不是git仓库，无法更新')
            }

            await e.reply(`🔄 开始${isForce ? '强制' : ''}更新插件...`)

            const { exec } = await import('child_process')
            const { promisify } = await import('util')
            const execAsync = promisify(exec)

            let stdout = ''
            let stderr = ''

            if (isForce) {
                try {
                    const branchResult = await execAsync('git branch --show-current', {
                        cwd: pluginDir,
                        timeout: 10000
                    })
                    const currentBranch = branchResult.stdout.trim() || 'main'
                    
                    await execAsync('git fetch origin', {
                        cwd: pluginDir,
                        timeout: 30000
                    })
                    
                    const resetResult = await execAsync(`git reset --hard origin/${currentBranch}`, {
                        cwd: pluginDir,
                        timeout: 10000
                    })
                    stdout = resetResult.stdout
                    stderr = resetResult.stderr || ''
                } catch (err) {
                    stderr = err.message || ''
                    throw err
                }
            } else {
                const pullResult = await execAsync('git pull', {
                    cwd: pluginDir,
                    timeout: 60000
                })
                stdout = pullResult.stdout
                stderr = pullResult.stderr || ''
            }

            const output = stdout + (stderr ? '\n' + stderr : '')
            
            if (/Already up to date|已经是最新/.test(output)) {
                return e.reply('✅ 插件已是最新版本')
            }

            const needInstall = /package\.json/.test(output)
            let replyMsg = `✅ 插件${isForce ? '强制' : ''}更新成功\n\n更新日志：\n${output.substring(0, 500)}`
            
            if (needInstall) {
                replyMsg += '\n\n⚠️ 检测到依赖变更，重启后请运行 pnpm install 安装新依赖'
            }
            
            replyMsg += '\n\n🔄 正在自动重启以应用更新...'
            await e.reply(replyMsg)
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            try {
                const { Restart } = await import('../../../other/restart.js')
                const restartInstance = new Restart(e)
                await restartInstance.restart()
            } catch (err) {
                globalConfig.error('[更新插件] 自动重启失败:', err)
                try {
                    await e.reply('⚠️ 自动重启失败，请手动重启插件以应用更新')
                } catch {
                    globalConfig.error('[更新插件] 无法发送重启失败提示')
                }
            }
        } catch (err) {
            globalConfig.error('更新插件失败:', err)
            
            let errorMsg = '❌ 更新失败：'
            if (err.message) {
                errorMsg += err.message.substring(0, 200)
            } else {
                errorMsg += '未知错误'
            }
            
            return e.reply(errorMsg)
        }
    }

    /**
     * 刷新所有显示的成就
     */
    async refreshAchievements(e) {
        if (!(await CommandWrapper.validateAndReply(e, getPermissionManager().validateAdminPermission(e)))) return
        if (!CommandWrapper.validateAndReply(e, CommonUtils.validateGroupMessage(e))) return

        return await CommandWrapper.safeExecute(
            async () => {
                const isAllGroups = e.msg.includes('全群')
                if (isAllGroups) {
                    return await this.refreshAllGroupsAchievements(e)
                } else {
                    return await this.refreshSingleGroupAchievements(e, String(e.group_id))
                }
            },
            '刷新成就失败',
            () => e.reply('刷新失败，请稍后重试')
        )
    }

    /**
     * 刷新单个群组的成就
     */
    async refreshSingleGroupAchievements(e, groupId) {
        const maskedGroupId = CommonUtils.maskGroupId(groupId)
        await e.reply(`🔄 开始刷新群组 ${maskedGroupId} 的成就显示...`)
        
        const allDisplayAchievements = await this.achievementService.dbService.all(
            'SELECT * FROM user_display_achievements WHERE group_id = $1',
            groupId
        )
        
        if (!allDisplayAchievements?.length) {
            return e.reply(`✅ 群组 ${maskedGroupId} 没有显示中的成就`)
        }
        
        const result = await this.processGroupAchievements(groupId, allDisplayAchievements)
        
        const msg = [[
            `✅ 群组 ${maskedGroupId} 成就刷新完成\n\n📊 统计信息：\n- 已处理用户: ${result.refreshedCount} 个\n- 已卸下成就: ${result.removedCount} 个\n- 已自动佩戴: ${result.autoWornCount} 个`
        ]]
        
        if (result.errors.length > 0) {
            let errorMsg = `⚠️ 错误: ${result.errors.length} 个\n`
            if (result.errors.length <= 10) {
                errorMsg += result.errors.map(err => `  - ${err}`).join('\n')
            } else {
                errorMsg += result.errors.slice(0, 10).map(err => `  - ${err}`).join('\n')
                errorMsg += `\n  ... 还有 ${result.errors.length - 10} 个错误`
            }
            msg.push([errorMsg])
        }
        
        return e.reply(common.makeForwardMsg(e, msg, `群组 ${maskedGroupId} 成就刷新完成`))
    }

    /**
     * 刷新所有群组的成就
     */
    async refreshAllGroupsAchievements(e) {
        await e.reply('🔄 开始刷新所有群组的成就显示...')
        
        const groupRows = await this.achievementService.dbService.all(
            'SELECT DISTINCT group_id FROM user_display_achievements'
        )
        
        if (!groupRows?.length) {
            return e.reply('✅ 没有找到任何显示中的成就')
        }
        
        const groupIds = groupRows.map(row => String(row.group_id))
        
        let totalRefreshedCount = 0
        let totalRemovedCount = 0
        let totalAutoWornCount = 0
        const allErrors = []
        const groupResults = []
        
        for (const groupId of groupIds) {
            try {
                const allDisplayAchievements = await this.achievementService.dbService.all(
                    'SELECT * FROM user_display_achievements WHERE group_id = $1',
                    groupId
                )
                
                if (!allDisplayAchievements?.length) {
                    continue
                }
                
                const result = await this.processGroupAchievements(groupId, allDisplayAchievements)
                
                totalRefreshedCount += result.refreshedCount
                totalRemovedCount += result.removedCount
                totalAutoWornCount += result.autoWornCount
                const maskedGroupId = CommonUtils.maskGroupId(groupId)
                allErrors.push(...result.errors.map(err => `群 ${maskedGroupId}: ${err}`))
                
                groupResults.push({
                    groupId,
                    refreshedCount: result.refreshedCount,
                    removedCount: result.removedCount,
                    autoWornCount: result.autoWornCount,
                    errorCount: result.errors.length
                })
            } catch (err) {
                const maskedGroupId = CommonUtils.maskGroupId(groupId)
                globalConfig.error(`刷新群组 ${maskedGroupId} 成就失败:`, err)
                allErrors.push(`群 ${maskedGroupId}: ${err.message || '未知错误'}`)
            }
        }
        
        const msg = [[
            `✅ 所有群组成就刷新完成\n\n📊 总体统计：\n- 已处理群组: ${groupIds.length} 个\n- 已处理用户: ${totalRefreshedCount} 个\n- 已卸下成就: ${totalRemovedCount} 个\n- 已自动佩戴: ${totalAutoWornCount} 个`
        ]]
        
        if (groupResults.length > 0) {
            const chunkSize = 10
            for (let i = 0; i < groupResults.length; i += chunkSize) {
                const chunk = groupResults.slice(i, i + chunkSize)
                let groupDetailMsg = `📋 群组详情 ${Math.floor(i / chunkSize) + 1}：\n`
                for (const result of chunk) {
                    const maskedGroupId = CommonUtils.maskGroupId(result.groupId)
                    groupDetailMsg += `- 群 ${maskedGroupId}: 用户 ${result.refreshedCount} 个, 卸下 ${result.removedCount} 个, 自动佩戴 ${result.autoWornCount} 个`
                    if (result.errorCount > 0) {
                        groupDetailMsg += ` (${result.errorCount} 个错误)`
                    }
                    groupDetailMsg += '\n'
                }
                if (i + chunkSize < groupResults.length) {
                    groupDetailMsg += `  ... 还有 ${groupResults.length - i - chunkSize} 个群组\n`
                }
                msg.push([groupDetailMsg])
            }
        }
        
        if (allErrors.length > 0) {
            const errorChunkSize = 10
            for (let i = 0; i < allErrors.length; i += errorChunkSize) {
                const chunk = allErrors.slice(i, i + errorChunkSize)
                let errorMsg = `⚠️ 错误 ${Math.floor(i / errorChunkSize) + 1} (共 ${allErrors.length} 个)：\n`
                errorMsg += chunk.map(err => `  - ${err}`).join('\n')
                if (i + errorChunkSize < allErrors.length) {
                    errorMsg += `\n  ... 还有 ${allErrors.length - i - errorChunkSize} 个错误`
                }
                msg.push([errorMsg])
            }
        }
        
        return e.reply(common.makeForwardMsg(e, msg, '所有群组成就刷新完成'))
    }

    /**
     * 处理单个群组的成就
     * 新逻辑：先卸下所有自动佩戴的成就，然后重新检查并自动佩戴符合条件的成就
     */
    async processGroupAchievements(groupId, allDisplayAchievements) {
        const allDefinitions = this.achievementService.getAllAchievementDefinitions(groupId)
        
        let removedCount = 0
        let autoWornCount = 0
        const errors = []
        
        if (globalConfig.getConfig('global.debugLog')) {
            globalConfig.debug(`开始处理群组 ${groupId} 的成就，共 ${allDisplayAchievements.length} 个`)
        }
        
        const userIds = new Set()
        for (const displayAchievement of allDisplayAchievements) {
            try {
                const userId = String(displayAchievement.user_id)
                userIds.add(userId)
                
                const isManual = displayAchievement.is_manual === true || displayAchievement.is_manual === 1
                
                if (!isManual) {
                    await this.achievementService.checkAndRemoveExpiredAutoDisplay(groupId, userId)
                    
                    const stillDisplayed = await this.achievementService.dbService.getDisplayAchievement(groupId, userId)
                    if (!stillDisplayed) {
                        removedCount++
                        if (globalConfig.getConfig('global.debugLog')) {
                            globalConfig.debug(`卸下过期的自动佩戴成就: 用户 ${userId}, 成就 ${displayAchievement.achievement_id}`)
                        }
                        continue
                    }
                    
                    await this.achievementService.dbService.run(
                        'DELETE FROM user_display_achievements WHERE group_id = $1 AND user_id = $2',
                        groupId,
                        userId
                    )
                    
                    const verifyDeleted = await this.achievementService.dbService.getDisplayAchievement(groupId, userId)
                    if (verifyDeleted) {
                        globalConfig.error(`删除显示成就失败: 用户 ${userId}, 群 ${groupId}, 成就 ${displayAchievement.achievement_id}`)
                    } else {
                        removedCount++
                        if (globalConfig.getConfig('global.debugLog')) {
                            globalConfig.debug(`✅ 成功卸下自动佩戴的成就: 用户 ${userId}, 成就 ${displayAchievement.achievement_id}`)
                        }
                    }
                } else {
                    const achievementId = displayAchievement.achievement_id
                    const definition = allDefinitions[achievementId]
                    
                    if (!definition) {
                        await this.achievementService.dbService.run(
                            'DELETE FROM user_display_achievements WHERE group_id = $1 AND user_id = $2',
                            groupId,
                            userId
                        )
                        removedCount++
                        if (globalConfig.getConfig('global.debugLog')) {
                            globalConfig.debug(`卸下不存在的成就: 用户 ${userId}, 成就 ${achievementId}`)
                        }
                        continue
                    }
                    
                    const userAchievements = await this.achievementService.dbService.getAllUserAchievements(groupId, userId)
                    let userAchievement = userAchievements.find(a => a.achievement_id === achievementId)
                    
                    if ((!userAchievement || !userAchievement.unlocked) && AchievementUtils.isGlobalAchievement(definition.rarity)) {
                        const otherGroupAchievement = await this.achievementService.dbService.getAchievementFromAnyGroup(userId, achievementId)
                        if (otherGroupAchievement && otherGroupAchievement.unlocked) {
                            userAchievement = { unlocked: true }
                        }
                    }
                    
                    if (!userAchievement || !userAchievement.unlocked) {
                        await this.achievementService.dbService.run(
                            'DELETE FROM user_display_achievements WHERE group_id = $1 AND user_id = $2',
                            groupId,
                            userId
                        )
                        removedCount++
                        if (globalConfig.getConfig('global.debugLog')) {
                            globalConfig.debug(`卸下未解锁的成就: 用户 ${userId}, 成就 ${achievementId}`)
                        }
                    }
                }
            } catch (err) {
                globalConfig.error(`检查成就失败: 用户 ${displayAchievement.user_id}, 成就 ${displayAchievement.achievement_id}`, err)
                errors.push(`用户 ${displayAchievement.user_id}: ${err.message || '未知错误'}`)
            }
        }
        
        for (const userId of userIds) {
            try {
                const currentDisplay = await this.achievementService.dbService.getDisplayAchievement(groupId, userId)
                const hasManualDisplay = currentDisplay && (currentDisplay.is_manual === true || currentDisplay.is_manual === 1)
                
                if (!hasManualDisplay) {
                    const userAchievementsData = await this.achievementService.getUserAchievements(groupId, userId)
                    const achievements = userAchievementsData.achievements || {}
                    
                    const now = TimeUtils.getUTC8Date()
                    const epicOrHigher = Object.entries(achievements)
                        .filter(([achievementId, achievementData]) => {
                            if (!achievementData.unlocked) return false
                            const definition = allDefinitions[achievementId]
                            if (!definition) return false
                            if (!AchievementUtils.isRarityOrHigher(definition.rarity, 'epic')) return false
                            
                            const unlockedAt = achievementData.unlocked_at
                            if (!unlockedAt) return false
                            
                            let unlockedAtDate
                            if (unlockedAt instanceof Date) {
                                unlockedAtDate = unlockedAt
                            } else if (typeof unlockedAt === 'string') {
                                if (unlockedAt.includes('T')) {
                                    unlockedAtDate = new Date(unlockedAt)
                                    if (unlockedAt.endsWith('Z')) {
                                        const utc8Offset = 8 * 60 * 60 * 1000
                                        unlockedAtDate = new Date(unlockedAtDate.getTime() + utc8Offset)
                                    }
                                } else {
                                    const [datePart, timePart] = unlockedAt.split(' ')
                                    if (datePart && timePart) {
                                        const [year, month, day] = datePart.split('-').map(Number)
                                        const [hour, minute, second] = timePart.split(':').map(Number)
                                        const utc8Offset = 8 * 60 * 60 * 1000
                                        const utcTimestamp = Date.UTC(year, month - 1, day, hour, minute, second || 0)
                                        unlockedAtDate = new Date(utcTimestamp - utc8Offset)
                                    } else {
                                        return false
                                    }
                                }
                            } else {
                                return false
                            }
                            
                            if (!unlockedAtDate || isNaN(unlockedAtDate.getTime())) {
                                return false
                            }
                            
                            const removeAt = new Date(unlockedAtDate.getTime() + 24 * 60 * 60 * 1000)
                            
                            if (now.getTime() >= removeAt.getTime()) {
                                if (globalConfig.getConfig('global.debugLog')) {
                                    globalConfig.debug(`成就已过期，不自动佩戴: 用户 ${userId}, 成就 ${achievementId}, 解锁时间 ${unlockedAt}, 卸下时间 ${this.formatDateTime(removeAt)}`)
                                }
                                return false
                            }
                            
                            return true
                        })
                        .map(([achievementId, achievementData]) => ({
                            achievement_id: achievementId,
                            unlocked: achievementData.unlocked,
                            unlocked_at: achievementData.unlocked_at,
                            definition: allDefinitions[achievementId]
                        }))
                    
                    if (epicOrHigher.length > 0) {
                        AchievementUtils.sortUnlockedAchievements(
                            epicOrHigher,
                            (item) => item.definition?.rarity || 'common',
                            (item) => new Date(item.unlocked_at).getTime()
                        )
                        
                        const topAchievement = epicOrHigher[0]
                        const definition = topAchievement.definition || allDefinitions[topAchievement.achievement_id]
                        const unlockedAt = topAchievement.unlocked_at || TimeUtils.formatDateTime(TimeUtils.getUTC8Date())
                        const isGlobal = AchievementUtils.isGlobalAchievement(definition.rarity)
                        
                        if (isGlobal) {
                            const userGroups = await this.achievementService.dbService.getUserGroups(userId)
                            for (const gId of userGroups) {
                                const gDisplay = await this.achievementService.dbService.getDisplayAchievement(gId, userId)
                                const gHasManual = gDisplay && (gDisplay.is_manual === true || gDisplay.is_manual === 1)
                                
                                if (!gHasManual) {
                                    await this.achievementService.setDisplayAchievement(
                                        gId,
                                        userId,
                                        topAchievement.achievement_id,
                                        definition?.name || topAchievement.achievement_id,
                                        definition?.rarity || 'common',
                                        false,
                                        unlockedAt
                                    )
                                    autoWornCount++
                                    if (globalConfig.getConfig('global.debugLog')) {
                                        globalConfig.debug(`自动佩戴全局成就: 用户 ${userId}, 群 ${gId}, 成就 ${topAchievement.achievement_id}, 解锁时间 ${unlockedAt}`)
                                    }
                                }
                            }
                        } else {
                            await this.achievementService.setDisplayAchievement(
                                groupId,
                                userId,
                                topAchievement.achievement_id,
                                definition?.name || topAchievement.achievement_id,
                                definition?.rarity || 'common',
                                false,
                                unlockedAt
                            )
                            autoWornCount++
                            if (globalConfig.getConfig('global.debugLog')) {
                                globalConfig.debug(`自动佩戴成就: 用户 ${userId}, 群 ${groupId}, 成就 ${topAchievement.achievement_id}, 解锁时间 ${unlockedAt}`)
                            }
                        }
                    }
                }
            } catch (err) {
                globalConfig.error(`自动佩戴成就失败: 用户 ${userId}`, err)
                errors.push(`用户 ${userId}: ${err.message || '未知错误'}`)
            }
        }
        
        return {
            refreshedCount: userIds.size,
            removedCount,
            autoWornCount,
            errors
        }
    }

    /**
     * 归档僵尸群（列出待归档的群组，等待确认）
     */
    async cleanZombieGroups(e) {
        if (!(await CommandWrapper.validateAndReply(e, getPermissionManager().validateAdminPermission(e)))) return

        return await CommandWrapper.safeExecute(
            async () => {
                const userId = String(e.user_id)
                
                const currentGroups = new Set()
                if (global.Bot && global.Bot.gl) {
                    for (const [groupId] of global.Bot.gl) {
                        if (groupId !== 'stdin') {
                            currentGroups.add(String(groupId))
                        }
                    }
                }
                
                const allGroups = await this.dataService.dbService.all(
                    'SELECT group_id, group_name, updated_at FROM group_info ORDER BY updated_at ASC'
                )
                
                if (!allGroups || allGroups.length === 0) {
                    return e.reply('✅ 没有找到任何群组数据')
                }
                
                const zombieGroups = []
                const now = TimeUtils.getUTC8Date()
                
                for (const group of allGroups) {
                    const groupId = String(group.group_id)
                    
                    // 排除已归档的群组
                    const isArchived = await this.dataService.dbService.isGroupArchived(groupId)
                    if (isArchived) {
                        continue
                    }
                    
                    if (!currentGroups.has(groupId)) {
                        let updatedAt
                        if (group.updated_at instanceof Date) {
                            updatedAt = group.updated_at
                        } else if (typeof group.updated_at === 'string') {
                            updatedAt = new Date(group.updated_at)
                        } else {
                            updatedAt = new Date()
                        }
                        
                        const daysAgo = Math.floor((now.getTime() - updatedAt.getTime()) / (24 * 60 * 60 * 1000))
                        
                        zombieGroups.push({
                            groupId: group.group_id,
                            groupName: group.group_name || group.group_id,
                            updatedAt: this.formatDateTime(updatedAt),
                            daysAgo
                        })
                    }
                }
                
                if (zombieGroups.length === 0) {
                    return e.reply('✅ 没有找到僵尸群（所有数据库中的群组都在当前群列表中）')
                }
                
                AdminCommands.pendingCleanGroups.set(userId, {
                    groups: zombieGroups,
                    timestamp: Date.now()
                })
                
                const msg = [[
                    `🔍 找到 ${zombieGroups.length} 个僵尸群（数据库中存在但机器人已不在群中）\n\n💡 归档说明：\n- 数据将移到暂存表，不会立即删除\n- 如果群有用户重新发言，数据将自动恢复\n- 60天后无用户发言，数据将被永久删除\n\n💡 如需归档，请发送：\n#水群确认归档\n\n⏰ 确认有效期为5分钟`
                ]]
                
                const batchSize = 15
                for (let i = 0; i < zombieGroups.length; i += batchSize) {
                    const batch = zombieGroups.slice(i, i + batchSize)
                    let batchText = `📋 群组列表 ${Math.floor(i / batchSize) + 1}：\n\n`
                    
                    batch.forEach((group, index) => {
                        const groupIndex = i + index + 1
                        const maskedGroupId = CommonUtils.maskGroupId(group.groupId)
                        batchText += `${groupIndex}. ${group.groupName} (${maskedGroupId})\n`
                        batchText += `   最后更新: ${group.updatedAt} (${group.daysAgo}天前)\n\n`
                    })
                    
                    if (i + batchSize < zombieGroups.length) {
                        batchText += `... 还有 ${zombieGroups.length - i - batchSize} 个群组\n`
                    }
                    
                    msg.push([batchText])
                }
                
                return e.reply(common.makeForwardMsg(e, msg, '僵尸群列表'))
            },
            '归档僵尸群失败',
            () => e.reply('查询失败，请稍后重试')
        )
    }

    /**
     * 确认归档僵尸群
     */
    async confirmCleanZombieGroups(e) {
        if (!(await CommandWrapper.validateAndReply(e, getPermissionManager().validateAdminPermission(e)))) return

        return await CommandWrapper.safeExecute(
            async () => {
                const userId = String(e.user_id)
                
                const pendingData = AdminCommands.pendingCleanGroups.get(userId)
                if (!pendingData) {
                    return e.reply('❌ 没有待归档的群组列表，请先使用 #水群归档僵尸群 查看')
                }
                
                const now = Date.now()
                if (now - pendingData.timestamp > 5 * 60 * 1000) {
                    AdminCommands.pendingCleanGroups.delete(userId)
                    return e.reply('❌ 确认已过期，请重新使用 #水群归档僵尸群 查看')
                }
                
                const zombieGroups = pendingData.groups
                if (!zombieGroups || zombieGroups.length === 0) {
                    AdminCommands.pendingCleanGroups.delete(userId)
                    return e.reply('❌ 待归档的群组列表为空')
                }
                
                await e.reply(`🔄 开始归档 ${zombieGroups.length} 个僵尸群到暂存表...\n\n💡 提示：如果这些群有用户重新发言，数据将自动恢复\n⏰ 60天后无用户发言，数据将被永久删除`)
                
                let successCount = 0
                let failCount = 0
                const errors = []
                
                for (const group of zombieGroups) {
                    try {
                        const success = await this.dataService.clearGroupStats(group.groupId)
                        if (success) {
                            successCount++
                            if (globalConfig.getConfig('global.debugLog')) {
                                globalConfig.debug(`成功归档僵尸群: ${group.groupId}`)
                            }
                        } else {
                            failCount++
                            errors.push(`${group.groupName} (${CommonUtils.maskGroupId(group.groupId)}): 归档失败`)
                        }
                    } catch (err) {
                        failCount++
                        const maskedGroupId = CommonUtils.maskGroupId(group.groupId)
                        errors.push(`${group.groupName} (${maskedGroupId}): ${err.message || '未知错误'}`)
                        globalConfig.error(`归档僵尸群失败: ${group.groupId}`, err)
                    }
                }
                
                AdminCommands.pendingCleanGroups.delete(userId)
                
                const msg = [[
                    `✅ 僵尸群归档完成\n\n📊 统计信息：\n- 成功归档: ${successCount} 个\n- 归档失败: ${failCount} 个\n\n💡 提示：\n- 如果这些群有用户重新发言，数据将自动恢复\n- 60天后无用户发言，数据将被永久删除`
                ]]
                
                if (errors.length > 0) {
                    const errorChunkSize = 10
                    for (let i = 0; i < errors.length; i += errorChunkSize) {
                        const chunk = errors.slice(i, i + errorChunkSize)
                        let errorMsg = `⚠️ 错误信息 ${Math.floor(i / errorChunkSize) + 1} (共 ${errors.length} 个)：\n`
                        errorMsg += chunk.map(err => `- ${err}`).join('\n')
                        if (i + errorChunkSize < errors.length) {
                            errorMsg += `\n... 还有 ${errors.length - i - errorChunkSize} 个错误`
                        }
                        msg.push([errorMsg])
                    }
                }
                
                return e.reply(common.makeForwardMsg(e, msg, '僵尸群归档完成'))
            },
            '确认归档失败',
            () => e.reply('清理失败，请稍后重试')
        )
    }

    /**
     * 查看归档群组列表
     */
    async viewArchivedGroups(e) {
        if (!(await CommandWrapper.validateAndReply(e, getPermissionManager().validateAdminPermission(e)))) return

        return await CommandWrapper.safeExecute(
            async () => {
                const totalCount = await this.dataService.dbService.getArchivedGroupsCount()
                
                if (totalCount === 0) {
                    return e.reply('✅ 当前没有已归档的群组')
                }

                const archivedGroups = await this.dataService.dbService.getArchivedGroups(50, 0)
                
                if (!archivedGroups || archivedGroups.length === 0) {
                    return e.reply('✅ 当前没有已归档的群组')
                }

                const msg = [[
                    `📋 归档群组列表\n\n📊 统计信息：\n- 归档总数: ${totalCount} 个\n- 显示数量: ${archivedGroups.length} 个\n\n💡 说明：\n- 归档的群组数据已移到暂存表\n- 如果群有用户重新发言，数据将自动恢复\n- 60天后无用户发言，数据将被永久删除`
                ]]

                const batchSize = 15
                for (let i = 0; i < archivedGroups.length; i += batchSize) {
                    const batch = archivedGroups.slice(i, i + batchSize)
                    let batchText = `📋 群组列表 ${Math.floor(i / batchSize) + 1}：\n\n`
                    
                    batch.forEach((group, index) => {
                        const groupIndex = i + index + 1
                        const maskedGroupId = CommonUtils.maskGroupId(group.group_id)
                        const groupName = group.group_name || group.group_id
                        const archivedAt = this.formatDateTime(group.archived_at) || '未知'
                        const lastActivityAt = this.formatDateTime(group.last_activity_at) || '无'
                        
                        batchText += `${groupIndex}. ${groupName} (${maskedGroupId})\n`
                        batchText += `   归档时间: ${archivedAt}\n`
                        batchText += `   最后活动: ${lastActivityAt}\n\n`
                    })
                    
                    if (i + batchSize < archivedGroups.length) {
                        batchText += `... 还有 ${archivedGroups.length - i - batchSize} 个群组\n`
                    }
                    
                    msg.push([batchText])
                }

                return e.reply(common.makeForwardMsg(e, msg, '归档群组列表'))
            },
            '查看归档列表失败',
            () => e.reply('查询失败，请稍后重试')
        )
    }

    /**
     * 清理缓存
     */
    async clearCache(e) {
        if (!(await CommandWrapper.validateAndReply(e, getPermissionManager().validateAdminPermission(e)))) return

        return await CommandWrapper.safeExecute(
            async () => {
                const result = this.dataService.clearAllCache()
                
                const msg = `✅ 缓存清理完成\n\n📊 清理统计：\n` +
                    `- 用户数据缓存: ${result.userCache} 条\n` +
                    `- 群统计缓存: ${result.groupStatsCache} 条\n` +
                    `- 排行榜缓存: ${result.rankingCache} 条\n` +
                    `- 全局统计缓存: ${result.globalStatsCache} 条\n` +
                    `- 总计: ${result.total} 条\n\n` +
                    `💡 提示：清理缓存后，下次查询将重新从数据库加载数据`
                
                return e.reply(msg)
            },
            '清理缓存失败',
            () => e.reply('清理缓存失败，请稍后重试')
        )
    }

}

export { AdminCommands }
export default AdminCommands

