import { DataService } from '../../core/DataService.js'
import { globalConfig } from '../../core/ConfigManager.js'
import { CommonUtils } from '../../core/utils/CommonUtils.js'
import { PathResolver } from '../../core/utils/PathResolver.js'
import { CommandWrapper } from '../../core/utils/CommandWrapper.js'
import { TimeUtils } from '../../core/utils/TimeUtils.js'
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
    }

    /**
     * 格式化日期时间为字符串
     * @param {Date|string} date 日期对象或字符串
     * @returns {string} 格式化后的日期时间字符串
     */
    formatDateTime(date) {
        if (!date) return '未知'
        if (date instanceof Date) {
            if (Number.isNaN(date.getTime())) return '未知'
            return TimeUtils.formatDateTime(date)
        }
        if (typeof date === 'string') {
            try {
                const parsedDate = new Date(date)
                if (Number.isNaN(parsedDate.getTime())) {
                    return date
                }
                return TimeUtils.formatDateTime(parsedDate)
            } catch {
                return date
            }
        }
        return '未知'
    }

    /**
     * 刷新 Bot.gl 群列表（与 #群列表 / #群员统计 保持一致）
     */
    async refreshBotGroupList() {
        try {
            if (global.Bot && global.Bot.uin && Array.isArray(global.Bot.uin)) {
                for (const uin of global.Bot.uin) {
                    if (uin === 'stdin') continue
                    const bot = global.Bot[uin]
                    if (bot && typeof bot.reloadGroupList === 'function') {
                        await bot.reloadGroupList()
                    }
                }
            } else if (global.Bot && typeof global.Bot.reloadGroupList === 'function') {
                await global.Bot.reloadGroupList()
            }
        } catch (err) {
            globalConfig.warn('[发言统计] 刷新 Bot.gl 失败，使用当前缓存:', err?.message || err)
        }
    }

    /**
     * 获取当前可用于归档判定的群组集合
     * 优先 Bot.gl，空时回退 DataService 缓存，避免误归档
     * @param {string} contextLog 日志上下文
     * @returns {Promise<Set<string>>}
     */
    async getCurrentGroupsForArchiveCheck(contextLog = '#水群归档僵尸群') {
        await this.refreshBotGroupList()

        let currentGroups = new Set()
        if (global.Bot && global.Bot.gl) {
            for (const [groupId] of global.Bot.gl) {
                if (groupId !== 'stdin') {
                    currentGroups.add(String(groupId))
                }
            }
        }

        if (currentGroups.size === 0 && this.dataService.getCurrentGroupIdsForFilter()) {
            currentGroups = new Set(this.dataService.getCurrentGroupIdsForFilter())
            global.logger?.mark?.(`[发言统计] ${contextLog} 当前群列表: 来源=缓存(Bot.gl 为空), 群数=${currentGroups.size}`)
        } else {
            global.logger?.mark?.(`[发言统计] ${contextLog} 当前群列表: 来源=Bot.gl, 群数=${currentGroups.size}`)
        }

        return currentGroups
    }

    /**
     * 获取命令规则
     */
    static getRules() {
        return [
            {
                reg: '^#水群清除统计$',
                fnc: 'clearRanking',
                permission: 'master'
            },
            {
                reg: '^#水群设置人数\\+(\\d+)$',
                fnc: 'setDisplayCount',
                permission: 'master'
            },
            {
                reg: '^#水群设置(开启|关闭)(转发|图片|记录|日志)$',
                fnc: 'toggleSetting',
                permission: 'master'
            },
            {
                reg: '^#水群(强制)?更新$',
                fnc: 'updatePlugin',
                permission: 'master'
            },
            {
                reg: '^#水群归档僵尸群$',
                fnc: 'cleanZombieGroups',
                permission: 'master'
            },
            {
                reg: '^#水群确认归档$',
                fnc: 'confirmCleanZombieGroups',
                permission: 'master'
            },
            {
                reg: '^#水群查看归档列表$',
                fnc: 'viewArchivedGroups',
                permission: 'master'
            },
            {
                reg: '^#水群清理缓存$',
                fnc: 'clearCache',
                permission: 'master'
            }
        ]
    }

    /**
     * 清除统计
     */
    async clearRanking(e) {
        const validation = CommonUtils.validateGroupMessage(e)
        if (!validation.valid) {
            return e.reply(validation.message)
        }

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
        return await CommandWrapper.safeExecute(
            async () => {
                const match = e.msg.match(/^#水群设置人数\+(\d+)$/)
                if (!match) {
                    return e.reply('格式错误，正确格式：#水群设置人数+数字')
                }

                const count = parseInt(match[1], 10)
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
        const buildUpdateErrorMessage = (rawMessage = '', forceMode = false) => {
            const msg = String(rawMessage || '')

            if (!forceMode && /Not possible to fast-forward|fast-forward/i.test(msg)) {
                return '❌ 更新失败：当前分支不是 fast-forward 状态。\n请先处理分支分叉，或使用 #水群强制更新 覆盖到远端版本。'
            }

            if (/couldn.t find remote ref|remote ref does not exist/i.test(msg)) {
                return '❌ 更新失败：未找到远端分支引用。请检查仓库默认分支或远端配置。'
            }

            if (/Authentication failed|Permission denied|access denied/i.test(msg)) {
                return '❌ 更新失败：远端仓库认证失败，请检查 Git 凭据与访问权限。'
            }

            if (/Could not resolve host|Failed to connect|Connection timed out|network/i.test(msg)) {
                return '❌ 更新失败：网络连接异常，请检查网络后重试。'
            }

            const shortMsg = msg.substring(0, 200) || '未知错误'
            return `❌ 更新失败：${shortMsg}`
        }

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
                    const branchResult = await execAsync('git rev-parse --abbrev-ref HEAD', {
                        cwd: pluginDir,
                        timeout: 10000
                    })
                    let currentBranch = branchResult.stdout.trim()

                    if (!currentBranch || currentBranch === 'HEAD') {
                        try {
                            const remoteHead = await execAsync('git symbolic-ref refs/remotes/origin/HEAD --short', {
                                cwd: pluginDir,
                                timeout: 10000
                            })
                            currentBranch = remoteHead.stdout.trim().replace(/^origin\//, '')
                        } catch {
                            // 忽略，后续走默认分支回退
                        }
                    }

                    if (!currentBranch) currentBranch = 'main'

                    await execAsync('git fetch origin', {
                        cwd: pluginDir,
                        timeout: 30000
                    })

                    // 主分支名称容错：若 origin/main 不存在，自动回退 origin/master
                    const verifyRef = async (branch) => {
                        try {
                            await execAsync(`git show-ref --verify --quiet refs/remotes/origin/${branch}`, {
                                cwd: pluginDir,
                                timeout: 10000
                            })
                            return true
                        } catch {
                            return false
                        }
                    }

                    if (!(await verifyRef(currentBranch)) && currentBranch === 'main' && (await verifyRef('master'))) {
                        currentBranch = 'master'
                    }

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
                // 常规更新禁止带本地改动执行，避免产生不可预期冲突
                const statusResult = await execAsync('git status --porcelain --untracked-files=no', {
                    cwd: pluginDir,
                    timeout: 10000
                })
                if (statusResult.stdout.trim()) {
                    return e.reply('❌ 检测到本地已修改文件。请先提交/备份改动，或使用 #水群强制更新 覆盖本地修改。')
                }

                const pullResult = await execAsync('git pull --ff-only', {
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

            const needInstall = /package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock/.test(output)
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

            const isForce = e.msg.includes('强制')
            return e.reply(buildUpdateErrorMessage(err?.message || '', isForce))
        }
    }

    /**
     * 归档僵尸群（列出待归档的群组，等待确认）
     * 与 #群列表 一致：当前群 = Bot.gl（排除 stdin）
     * 第一步：已归档的群若当前在 Bot.gl 中则自动恢复（移出归档）。
     * 第二步：数据库中有统计记录(user_agg_stats)但不在 Bot.gl 中的群 = 僵尸，可确认后归档；归档后不计入统计、不可查询；60 天后自动清理；群重加回来会恢复。
     */
    async cleanZombieGroups(e) {
        return await CommandWrapper.safeExecute(
            async () => {
                const userId = String(e.user_id)
                global.logger?.mark?.('[发言统计] #水群归档僵尸群 开始，先刷新 Bot.gl 以与 #群列表 一致')
                const currentGroups = await this.getCurrentGroupsForArchiveCheck('#水群归档僵尸群')
                if (currentGroups.size === 0) {
                    return e.reply('❌ 无法获取当前群列表（Bot.gl 与缓存均无）。请先在任意群内发一条消息或使用 #群列表 后再试 #水群归档僵尸群。')
                }

                // 第一步：已在 Bot.gl 的群若在归档表中则恢复（重加回来的群移出归档）
                const archivedList = await this.dataService.dbService.all('SELECT group_id FROM archived_groups').catch(() => [])
                let restoredCount = 0
                for (const row of archivedList || []) {
                    const gid = String(row.group_id)
                    if (currentGroups.has(gid)) {
                        try {
                            const ok = await this.dataService.restoreGroupStats(gid)
                            if (ok) restoredCount++
                        } catch (err) {
                            globalConfig.warn(`[发言统计] 恢复归档群 ${gid} 失败:`, err?.message || err)
                        }
                    }
                }
                if (restoredCount > 0) {
                    global.logger?.mark?.(`[发言统计] #水群归档僵尸群 已恢复 ${restoredCount} 个群（当前在 Bot.gl，已移出归档）`)
                }

                // 第二步：数据库中不在 Bot.gl 的群 = 僵尸（待归档）；数据来源与统计一致用 user_agg_stats
                const dbGroupsRows = await this.dataService.dbService.all(
                    `SELECT us.group_id, COALESCE(gi.group_name, '') as group_name, gi.updated_at
                     FROM (SELECT DISTINCT group_id FROM user_agg_stats) us
                     LEFT JOIN group_info gi ON us.group_id = gi.group_id
                     ORDER BY gi.updated_at ASC`
                ).catch(() => [])
                const allGroups = dbGroupsRows && dbGroupsRows.length > 0
                    ? dbGroupsRows
                    : await this.dataService.dbService.all(
                        'SELECT group_id, group_name, updated_at FROM group_info ORDER BY updated_at ASC'
                    ).catch(() => [])

                if (!allGroups || allGroups.length === 0) {
                    return e.reply('✅ 没有找到任何群组数据')
                }

                const archivedCount = await this.dataService.dbService.get('SELECT COUNT(*) as count FROM archived_groups').then(r => parseInt(r?.count || 0, 10)).catch(() => 0)
                global.logger?.mark?.(`[发言统计] #水群归档僵尸群 数据库群数(有统计记录的)=${allGroups.length}, 已归档群数=${archivedCount}`)

                const zombieGroups = []
                const now = TimeUtils.getUTC8Date()

                for (const group of allGroups) {
                    const groupId = String(group.group_id)

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
                
                global.logger?.mark?.(`[发言统计] #水群归档僵尸群 计算完成: 僵尸群数=${zombieGroups.length} (数据库中不在 Bot.gl 且未归档)`)

                if (zombieGroups.length === 0) {
                    const noZombieMsg = restoredCount > 0
                        ? `✅ 已自动恢复 ${restoredCount} 个已重加的群（已移出归档）。\n✅ 没有找到僵尸群（所有有统计记录的群都在当前群列表中）`
                        : '✅ 没有找到僵尸群（所有数据库中的群组都在当前群列表中）'
                    return e.reply(noZombieMsg)
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

                // 二次安全校验：确认前重新获取当前群列表，避免 5 分钟窗口内群状态变化导致误归档
                const currentGroups = await this.getCurrentGroupsForArchiveCheck('#水群确认归档')
                if (currentGroups.size === 0) {
                    return e.reply('❌ 无法获取当前群列表（Bot.gl 与缓存均无），为避免误归档已中止本次确认。请先执行 #群列表 后重试。')
                }

                const eligibleGroups = []
                const skippedGroups = []
                for (const group of zombieGroups) {
                    const groupId = String(group.groupId)
                    if (currentGroups.has(groupId)) {
                        skippedGroups.push(`${group.groupName} (${CommonUtils.maskGroupId(groupId)}): 当前已在群列表中，已跳过`)
                        continue
                    }
                    eligibleGroups.push(group)
                }

                if (eligibleGroups.length === 0) {
                    AdminCommands.pendingCleanGroups.delete(userId)
                    return e.reply('✅ 待归档群组已全部恢复到当前群列表，未执行任何归档操作。')
                }

                await e.reply(`🔄 开始归档 ${eligibleGroups.length} 个僵尸群到暂存表...\n\n💡 提示：如果这些群有用户重新发言，数据将自动恢复\n⏰ 60天后无用户发言，数据将被永久删除`)
                
                let successCount = 0
                let failCount = 0
                const errors = []
                
                for (const group of eligibleGroups) {
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
                        `✅ 僵尸群归档完成\n\n📊 统计信息：\n- 待归档总数: ${zombieGroups.length} 个\n- 本次执行: ${eligibleGroups.length} 个\n- 成功归档: ${successCount} 个\n- 归档失败: ${failCount} 个\n- 安全跳过: ${skippedGroups.length} 个\n\n💡 提示：\n- 如果这些群有用户重新发言，数据将自动恢复\n- 60天后无用户发言，数据将被永久删除`
                ]]

                if (skippedGroups.length > 0) {
                    const skippedChunkSize = 10
                    for (let i = 0; i < skippedGroups.length; i += skippedChunkSize) {
                        const chunk = skippedGroups.slice(i, i + skippedChunkSize)
                        let skippedMsg = `ℹ️ 安全跳过 ${Math.floor(i / skippedChunkSize) + 1} (共 ${skippedGroups.length} 个)：\n`
                        skippedMsg += chunk.map(item => `- ${item}`).join('\n')
                        if (i + skippedChunkSize < skippedGroups.length) {
                            skippedMsg += `\n... 还有 ${skippedGroups.length - i - skippedChunkSize} 个`
                        }
                        msg.push([skippedMsg])
                    }
                }
                
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
