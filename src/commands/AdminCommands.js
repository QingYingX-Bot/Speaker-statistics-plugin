import { DataService } from '../core/DataService.js';
import { AchievementService } from '../core/AchievementService.js';
import { globalConfig } from '../core/ConfigManager.js';
import { CommonUtils } from '../core/utils/CommonUtils.js';
import { PathResolver } from '../core/utils/PathResolver.js';
import { CommandWrapper } from '../core/utils/CommandWrapper.js';
import { TimeUtils } from '../core/utils/TimeUtils.js';
import { AchievementUtils } from '../core/utils/AchievementUtils.js';
import common from '../../../../lib/common/common.js';
import fs from 'fs';
import path from 'path';

/**
 * 管理员命令处理类
 */
class AdminCommands {
    // 存储待清理的僵尸群列表，key: userId, value: { groups: [], timestamp: number }
    static pendingCleanGroups = new Map();

    constructor(dataService = null) {
        this.dataService = dataService || new DataService();
        this.achievementService = new AchievementService(this.dataService);
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
            },
            {
                reg: '^#水群清空词云统计$',
                fnc: 'clearWordCloudData'
            }
        ];
    }

    /**
     * 清除统计
     */
    async clearRanking(e) {
        // 验证管理员权限和群消息
        if (!(await CommandWrapper.validateAndReply(e, CommonUtils.validateAdminPermission(e)))) return;
        if (!CommandWrapper.validateAndReply(e, CommonUtils.validateGroupMessage(e))) return;

        return await CommandWrapper.safeExecute(
            async () => {
                const groupId = String(e.group_id);
                const success = await this.dataService.clearGroupStats(groupId);
                return e.reply(success ? '统计数据已清除' : '清除统计数据失败');
            },
            '清除统计失败',
            () => e.reply('清除失败，请稍后重试')
        );
    }

    /**
     * 设置显示人数
     */
    async setDisplayCount(e) {
        // 验证管理员权限
        if (!(await CommandWrapper.validateAndReply(e, CommonUtils.validateAdminPermission(e)))) return;

        return await CommandWrapper.safeExecute(
            async () => {
                const match = e.msg.match(/^#水群设置人数\+(\d+)$/);
                if (!match) {
                    return e.reply('格式错误，正确格式：#水群设置人数+数字');
                }

                const count = parseInt(match[1]);
                const numValidation = CommonUtils.validateNumber(String(count), 1, 100, '显示人数');
                if (!numValidation.valid) {
                    return e.reply(numValidation.message);
                }

                globalConfig.updateConfig('display.displayCount', count);
                return e.reply(`显示人数已设置为 ${count}`);
            },
            '设置显示人数失败',
            () => e.reply('设置失败，请稍后重试')
        );
    }

    /**
     * 切换设置
     */
    async toggleSetting(e) {
        // 验证管理员权限
        if (!(await CommandWrapper.validateAndReply(e, CommonUtils.validateAdminPermission(e)))) return;

        return await CommandWrapper.safeExecute(
            async () => {
                const match = e.msg.match(/^#水群设置(开启|关闭)(转发|图片|记录|日志)$/);
                if (!match) {
                    return e.reply('格式错误');
                }

                const toggle = match[1] === '开启';
                const setting = match[2];

                // 设置映射表
                const settingMap = {
                    '转发': { key: 'display.useForward', name: '转发消息' },
                    '图片': { key: 'display.usePicture', name: '图片模式' },
                    '记录': { key: 'global.recordMessage', name: '消息记录' },
                    '日志': { key: 'global.debugLog', name: '调试日志' }
                };

                const settingConfig = settingMap[setting];
                if (!settingConfig) {
                    return e.reply('未知设置项');
                }

                globalConfig.updateConfig(settingConfig.key, toggle);
                return e.reply(`${settingConfig.name}已${toggle ? '开启' : '关闭'}`);
            },
            '切换设置失败',
            () => e.reply('设置失败，请稍后重试')
        );
    }

    /**
     * 更新插件
     */
    async updatePlugin(e) {
        // 验证管理员权限
        if (!(await CommandWrapper.validateAndReply(e, CommonUtils.validateAdminPermission(e)))) return;

        try {
            const isForce = e.msg.includes('强制');
            const pluginDir = PathResolver.getPluginDir();
            
            // 检查是否是git仓库
            const gitDir = path.join(pluginDir, '.git');
            if (!fs.existsSync(gitDir)) {
                return e.reply('❌ 当前插件目录不是git仓库，无法更新');
            }

            await e.reply(`🔄 开始${isForce ? '强制' : ''}更新插件...`);

            // 执行git命令
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);

            let stdout = '';
            let stderr = '';

            if (isForce) {
                // 强制更新：先获取当前分支，然后重置到远程分支
                try {
                    // 获取当前分支名
                    const branchResult = await execAsync('git branch --show-current', {
                        cwd: pluginDir,
                        timeout: 10000
                    });
                    const currentBranch = branchResult.stdout.trim() || 'main';
                    
                    // 获取远程分支
                    await execAsync('git fetch origin', {
                        cwd: pluginDir,
                        timeout: 30000
                    });
                    
                    // 重置到远程分支
                    const resetResult = await execAsync(`git reset --hard origin/${currentBranch}`, {
                        cwd: pluginDir,
                        timeout: 10000
                    });
                    stdout = resetResult.stdout;
                    stderr = resetResult.stderr || '';
                } catch (error) {
                    stderr = error.message || '';
                    throw error;
                }
            } else {
                // 普通更新：拉取最新代码
                const pullResult = await execAsync('git pull', {
                    cwd: pluginDir,
                    timeout: 60000 // 60秒超时
                });
                stdout = pullResult.stdout;
                stderr = pullResult.stderr || '';
            }

            const output = stdout + (stderr ? '\n' + stderr : '');
            
            // 检查是否已是最新
            if (/Already up to date|已经是最新/.test(output)) {
                return e.reply('✅ 插件已是最新版本');
            }

            // 检查是否有package.json变更，需要重新安装依赖
            const needInstall = /package\.json/.test(output);
            
            let replyMsg = `✅ 插件${isForce ? '强制' : ''}更新成功\n\n更新日志：\n${output.substring(0, 500)}`;
            
            if (needInstall) {
                replyMsg += '\n\n⚠️ 检测到依赖变更，重启后请运行 pnpm install 安装新依赖';
            }
            
            replyMsg += '\n\n🔄 正在自动重启以应用更新...';
            
            // 发送回复消息
            await e.reply(replyMsg);
            
            // 延迟一下，确保消息发送成功
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 使用系统重启功能
            try {
                // 导入 Restart 类（使用相对路径从插件目录到 other 目录）
                const { Restart } = await import('../../../other/restart.js');
                const restartInstance = new Restart(e);
                // 调用重启方法（会自动保存重启信息到 redis 并在重启后发送提示）
                await restartInstance.restart();
            } catch (restartError) {
                globalConfig.error('[更新插件] 自动重启失败:', restartError);
                // 如果重启失败，至少提示用户手动重启
                try {
                    await e.reply('⚠️ 自动重启失败，请手动重启插件以应用更新');
                } catch (replyError) {
                    // 如果连回复都失败了，至少记录日志
                    globalConfig.error('[更新插件] 无法发送重启失败提示:', replyError);
                }
            }
        } catch (error) {
            globalConfig.error('更新插件失败:', error);
            
            let errorMsg = '❌ 更新失败：';
            if (error.message) {
                errorMsg += error.message.substring(0, 200);
            } else {
                errorMsg += '未知错误';
            }
            
            return e.reply(errorMsg);
        }
    }

    /**
     * 刷新所有显示的成就
     */
    async refreshAchievements(e) {
        // 验证管理员权限和群消息
        if (!(await CommandWrapper.validateAndReply(e, CommonUtils.validateAdminPermission(e)))) return;
        if (!CommandWrapper.validateAndReply(e, CommonUtils.validateGroupMessage(e))) return;

        return await CommandWrapper.safeExecute(
            async () => {
                // 检查是否有"全群"参数
                const isAllGroups = e.msg.includes('全群');
                
                if (isAllGroups) {
                    // 刷新所有群组的成就
                    return await this.refreshAllGroupsAchievements(e);
                } else {
                    // 只刷新当前群组的成就
                    return await this.refreshSingleGroupAchievements(e, String(e.group_id));
                }
            },
            '刷新成就失败',
            () => e.reply('刷新失败，请稍后重试')
        );
    }

    /**
     * 刷新单个群组的成就
     */
    async refreshSingleGroupAchievements(e, groupId) {
        const maskedGroupId = CommonUtils.maskGroupId(groupId);
        await e.reply(`🔄 开始刷新群组 ${maskedGroupId} 的成就显示...`);
        
        // 获取所有显示中的成就
        const allDisplayAchievements = await this.achievementService.dbService.all(
            'SELECT * FROM user_display_achievements WHERE group_id = $1',
            groupId
        );
        
        if (!allDisplayAchievements || allDisplayAchievements.length === 0) {
            return e.reply(`✅ 群组 ${maskedGroupId} 没有显示中的成就`);
        }
        
        const result = await this.processGroupAchievements(groupId, allDisplayAchievements);
        
        // 构建合并转发消息
        const msg = [
            [
                `✅ 群组 ${maskedGroupId} 成就刷新完成\n\n📊 统计信息：\n- 已处理用户: ${result.refreshedCount} 个\n- 已卸下成就: ${result.removedCount} 个\n- 已自动佩戴: ${result.autoWornCount} 个`
            ]
        ];
        
        // 如果有错误，添加到转发消息中
        if (result.errors.length > 0) {
            let errorMsg = `⚠️ 错误: ${result.errors.length} 个\n`;
            if (result.errors.length <= 10) {
                errorMsg += result.errors.map(err => `  - ${err}`).join('\n');
            } else {
                errorMsg += result.errors.slice(0, 10).map(err => `  - ${err}`).join('\n');
                errorMsg += `\n  ... 还有 ${result.errors.length - 10} 个错误`;
            }
            msg.push([errorMsg]);
        }
        
        // 发送合并转发消息
        return e.reply(common.makeForwardMsg(e, msg, `群组 ${maskedGroupId} 成就刷新完成`));
    }

    /**
     * 刷新所有群组的成就
     */
    async refreshAllGroupsAchievements(e) {
        await e.reply('🔄 开始刷新所有群组的成就显示...');
        
        // 获取所有群组ID
        const groupRows = await this.achievementService.dbService.all(
            'SELECT DISTINCT group_id FROM user_display_achievements'
        );
        
        if (!groupRows || groupRows.length === 0) {
            return e.reply('✅ 没有找到任何显示中的成就');
        }
        
        const groupIds = groupRows.map(row => String(row.group_id));
        
        let totalRefreshedCount = 0;
        let totalRemovedCount = 0;
        let totalAutoWornCount = 0;
        const allErrors = [];
        const groupResults = [];
        
        // 遍历每个群组
        for (const groupId of groupIds) {
            try {
                // 获取该群组的所有显示成就
                const allDisplayAchievements = await this.achievementService.dbService.all(
                    'SELECT * FROM user_display_achievements WHERE group_id = $1',
                    groupId
                );
                
                if (!allDisplayAchievements || allDisplayAchievements.length === 0) {
                    continue;
                }
                
                // 处理该群组的成就
                const result = await this.processGroupAchievements(groupId, allDisplayAchievements);
                
                totalRefreshedCount += result.refreshedCount;
                totalRemovedCount += result.removedCount;
                totalAutoWornCount += result.autoWornCount;
                const maskedGroupId = CommonUtils.maskGroupId(groupId);
                allErrors.push(...result.errors.map(err => `群 ${maskedGroupId}: ${err}`));
                
                groupResults.push({
                    groupId,
                    refreshedCount: result.refreshedCount,
                    removedCount: result.removedCount,
                    autoWornCount: result.autoWornCount,
                    errorCount: result.errors.length
                });
            } catch (error) {
                const maskedGroupId = CommonUtils.maskGroupId(groupId);
                globalConfig.error(`刷新群组 ${maskedGroupId} 成就失败:`, error);
                allErrors.push(`群 ${maskedGroupId}: ${error.message || '未知错误'}`);
            }
        }
        
        // 构建合并转发消息
        const msg = [
            [
                `✅ 所有群组成就刷新完成\n\n📊 总体统计：\n- 已处理群组: ${groupIds.length} 个\n- 已处理用户: ${totalRefreshedCount} 个\n- 已卸下成就: ${totalRemovedCount} 个\n- 已自动佩戴: ${totalAutoWornCount} 个`
            ]
        ];
        
        // 显示各群组统计（拆分成多条消息，每条最多10个群组）
        if (groupResults.length > 0) {
            const chunkSize = 10; // 每条消息最多显示10个群组
            for (let i = 0; i < groupResults.length; i += chunkSize) {
                const chunk = groupResults.slice(i, i + chunkSize);
                let groupDetailMsg = `📋 群组详情 ${Math.floor(i / chunkSize) + 1}：\n`;
                for (const result of chunk) {
                    const maskedGroupId = CommonUtils.maskGroupId(result.groupId);
                    groupDetailMsg += `- 群 ${maskedGroupId}: 用户 ${result.refreshedCount} 个, 卸下 ${result.removedCount} 个, 自动佩戴 ${result.autoWornCount} 个`;
                    if (result.errorCount > 0) {
                        groupDetailMsg += ` (${result.errorCount} 个错误)`;
                    }
                    groupDetailMsg += '\n';
                }
                if (i + chunkSize < groupResults.length) {
                    groupDetailMsg += `  ... 还有 ${groupResults.length - i - chunkSize} 个群组\n`;
                }
                msg.push([groupDetailMsg]);
            }
        }
        
        // 如果有错误，添加到转发消息中
        if (allErrors.length > 0) {
            const errorChunkSize = 10; // 每条消息最多显示10个错误
            for (let i = 0; i < allErrors.length; i += errorChunkSize) {
                const chunk = allErrors.slice(i, i + errorChunkSize);
                let errorMsg = `⚠️ 错误 ${Math.floor(i / errorChunkSize) + 1} (共 ${allErrors.length} 个)：\n`;
                errorMsg += chunk.map(err => `  - ${err}`).join('\n');
                if (i + errorChunkSize < allErrors.length) {
                    errorMsg += `\n  ... 还有 ${allErrors.length - i - errorChunkSize} 个错误`;
                }
                msg.push([errorMsg]);
            }
        }
        
        // 发送合并转发消息
        return e.reply(common.makeForwardMsg(e, msg, '所有群组成就刷新完成'));
    }

    /**
     * 处理单个群组的成就
     * 新逻辑：先卸下所有自动佩戴的成就，然后重新检查并自动佩戴符合条件的成就
     */
    async processGroupAchievements(groupId, allDisplayAchievements) {
        // 获取所有成就定义
        const allDefinitions = this.achievementService.getAllAchievementDefinitions(groupId);
        
        let removedCount = 0;
        let autoWornCount = 0;
        const errors = [];
        
        if (globalConfig.getConfig('global.debugLog')) {
            globalConfig.debug(`开始处理群组 ${groupId} 的成就，共 ${allDisplayAchievements.length} 个`);
        }
        
        // 第一步：先检查并卸下过期的自动佩戴成就，然后卸下所有自动佩戴的成就（保留手动设置的成就）
        const userIds = new Set();
        for (const displayAchievement of allDisplayAchievements) {
            try {
                const userId = String(displayAchievement.user_id);
                userIds.add(userId);
                
                // 检查是否是手动设置的成就
                // 注意：PostgreSQL 返回的 is_manual 可能是布尔值，SQLite 返回的可能是 0/1
                const isManual = displayAchievement.is_manual === true || displayAchievement.is_manual === 1;
                
                if (!isManual) {
                    // 自动佩戴的成就，先检查是否过期
                    await this.achievementService.checkAndRemoveExpiredAutoDisplay(groupId, userId);
                    
                    // 检查是否已被卸下（过期卸下）
                    const stillDisplayed = await this.achievementService.dbService.getDisplayAchievement(groupId, userId);
                    if (!stillDisplayed) {
                        removedCount++;
                        if (globalConfig.getConfig('global.debugLog')) {
                            globalConfig.debug(`卸下过期的自动佩戴成就: 用户 ${userId}, 成就 ${displayAchievement.achievement_id}`);
                        }
                        continue;
                    }
                    
                    // 如果未过期，也直接卸下（后续会重新检查并自动佩戴）
                    const deleteResult = await this.achievementService.dbService.run(
                        'DELETE FROM user_display_achievements WHERE group_id = $1 AND user_id = $2',
                        groupId,
                        userId
                    );
                    
                    // 验证删除是否成功
                    const verifyDeleted = await this.achievementService.dbService.getDisplayAchievement(groupId, userId);
                    if (verifyDeleted) {
                        globalConfig.error(`删除显示成就失败: 用户 ${userId}, 群 ${groupId}, 成就 ${displayAchievement.achievement_id}`);
                    } else {
                        removedCount++;
                        if (globalConfig.getConfig('global.debugLog')) {
                            globalConfig.debug(`✅ 成功卸下自动佩戴的成就: 用户 ${userId}, 成就 ${displayAchievement.achievement_id}`);
                        }
                    }
                } else {
                    // 手动设置的成就，检查是否仍然有效
                    const achievementId = displayAchievement.achievement_id;
                    
                    // 1. 检查成就是否存在
                    const definition = allDefinitions[achievementId];
                    if (!definition) {
                        // 成就不存在，卸下
                        await this.achievementService.dbService.run(
                            'DELETE FROM user_display_achievements WHERE group_id = $1 AND user_id = $2',
                            groupId,
                            userId
                        );
                        removedCount++;
                        if (globalConfig.getConfig('global.debugLog')) {
                            globalConfig.debug(`卸下不存在的成就: 用户 ${userId}, 成就 ${achievementId}`);
                        }
                        continue;
                    }
                    
                    // 2. 检查用户是否解锁了该成就
                    const userAchievements = await this.achievementService.dbService.getAllUserAchievements(groupId, userId);
                    let userAchievement = userAchievements.find(a => a.achievement_id === achievementId);
                    
                    // 如果是全局成就（特殊成就或节日成就），需要检查其他群是否已解锁
                    if ((!userAchievement || !userAchievement.unlocked) && AchievementUtils.isGlobalAchievement(definition.rarity)) {
                        const otherGroupAchievement = await this.achievementService.dbService.getAchievementFromAnyGroup(userId, achievementId);
                        if (otherGroupAchievement && otherGroupAchievement.unlocked) {
                            userAchievement = { unlocked: true };
                        }
                    }
                    
                    if (!userAchievement || !userAchievement.unlocked) {
                        // 用户未解锁该成就，卸下
                        await this.achievementService.dbService.run(
                            'DELETE FROM user_display_achievements WHERE group_id = $1 AND user_id = $2',
                            groupId,
                            userId
                        );
                        removedCount++;
                        if (globalConfig.getConfig('global.debugLog')) {
                            globalConfig.debug(`卸下未解锁的成就: 用户 ${userId}, 成就 ${achievementId}`);
                        }
                    }
                }
            } catch (error) {
                globalConfig.error(`检查成就失败: 用户 ${displayAchievement.user_id}, 成就 ${displayAchievement.achievement_id}`, error);
                errors.push(`用户 ${displayAchievement.user_id}: ${error.message || '未知错误'}`);
            }
        }
        
        // 第二步：重新检查所有用户，自动佩戴符合条件的成就（史诗及以上，使用解锁时间+24小时）
        for (const userId of userIds) {
            try {
                // 检查用户当前是否有显示成就（手动设置的）
                const currentDisplay = await this.achievementService.dbService.getDisplayAchievement(groupId, userId);
                const hasManualDisplay = currentDisplay && (currentDisplay.is_manual === true || currentDisplay.is_manual === 1);
                
                // 如果没有手动设置的显示成就，检查是否有史诗及以上成就可以自动佩戴
                if (!hasManualDisplay) {
                    // 获取用户的所有成就
                    const userAchievementsData = await this.achievementService.getUserAchievements(groupId, userId);
                    const achievements = userAchievementsData.achievements || {};
                    
                    // 筛选史诗及以上已解锁的成就，并检查是否过期（解锁时间+24小时）
                    const now = TimeUtils.getUTC8Date();
                    const epicOrHigher = Object.entries(achievements)
                        .filter(([achievementId, achievementData]) => {
                            if (!achievementData.unlocked) return false;
                            const definition = allDefinitions[achievementId];
                            if (!definition) return false;
                            if (!AchievementUtils.isRarityOrHigher(definition.rarity, 'epic')) return false;
                            
                            // 检查成就是否过期（解锁时间+24小时）
                            const unlockedAt = achievementData.unlocked_at;
                            if (!unlockedAt) return false;
                            
                            // 解析解锁时间
                            let unlockedAtDate;
                            if (unlockedAt instanceof Date) {
                                unlockedAtDate = unlockedAt;
                            } else if (typeof unlockedAt === 'string') {
                                if (unlockedAt.includes('T')) {
                                    // ISO 8601 格式
                                    unlockedAtDate = new Date(unlockedAt);
                                    if (unlockedAt.endsWith('Z')) {
                                        const utc8Offset = 8 * 60 * 60 * 1000;
                                        unlockedAtDate = new Date(unlockedAtDate.getTime() + utc8Offset);
                                    }
                                } else {
                                    // 普通格式：YYYY-MM-DD HH:mm:ss
                                    const [datePart, timePart] = unlockedAt.split(' ');
                                    if (datePart && timePart) {
                                        const [year, month, day] = datePart.split('-').map(Number);
                                        const [hour, minute, second] = timePart.split(':').map(Number);
                                        const utc8Offset = 8 * 60 * 60 * 1000;
                                        const utcTimestamp = Date.UTC(year, month - 1, day, hour, minute, second || 0);
                                        unlockedAtDate = new Date(utcTimestamp - utc8Offset);
                                    } else {
                                        return false;
                                    }
                                }
                            } else {
                                return false;
                            }
                            
                            if (!unlockedAtDate || isNaN(unlockedAtDate.getTime())) {
                                return false;
                            }
                            
                            // 计算卸下时间：解锁时间 + 24小时
                            const removeAt = new Date(unlockedAtDate.getTime() + 24 * 60 * 60 * 1000);
                            
                            // 如果当前时间 >= 卸下时间，说明已过期，不自动佩戴
                            if (now.getTime() >= removeAt.getTime()) {
                                if (globalConfig.getConfig('global.debugLog')) {
                                    globalConfig.debug(`成就已过期，不自动佩戴: 用户 ${userId}, 成就 ${achievementId}, 解锁时间 ${unlockedAt}, 卸下时间 ${TimeUtils.formatDateTime(removeAt)}`);
                                }
                                return false;
                            }
                            
                            return true;
                        })
                        .map(([achievementId, achievementData]) => ({
                            achievement_id: achievementId,
                            unlocked: achievementData.unlocked,
                            unlocked_at: achievementData.unlocked_at,
                            definition: allDefinitions[achievementId]
                        }));
                    
                    // 按稀有度和解锁时间排序
                    if (epicOrHigher.length > 0) {
                        AchievementUtils.sortUnlockedAchievements(
                            epicOrHigher,
                            (item) => item.definition?.rarity || 'common',
                            (item) => new Date(item.unlocked_at).getTime()
                        );
                        
                        const topAchievement = epicOrHigher[0];
                        const definition = topAchievement.definition || allDefinitions[topAchievement.achievement_id];
                        const unlockedAt = topAchievement.unlocked_at || TimeUtils.formatDateTimeForDB();
                        
                        // 检查是否是全局成就
                        const isGlobal = AchievementUtils.isGlobalAchievement(definition.rarity);
                        
                        if (isGlobal) {
                            // 全局成就：在所有群都自动佩戴
                            const userGroups = await this.achievementService.dbService.getUserGroups(userId);
                            for (const gId of userGroups) {
                                // 检查该群是否已有手动设置的成就
                                const gDisplay = await this.achievementService.dbService.getDisplayAchievement(gId, userId);
                                const gHasManual = gDisplay && (gDisplay.is_manual === true || gDisplay.is_manual === 1);
                                
                                if (!gHasManual) {
                                    await this.achievementService.setDisplayAchievement(
                                        gId,
                                        userId,
                                        topAchievement.achievement_id,
                                        definition?.name || topAchievement.achievement_id,
                                        definition?.rarity || 'common',
                                        false,  // isManual = false，自动佩戴
                                        unlockedAt  // 使用解锁时间作为 auto_display_at
                                    );
                                    autoWornCount++;
                                    if (globalConfig.getConfig('global.debugLog')) {
                                        globalConfig.debug(`自动佩戴全局成就: 用户 ${userId}, 群 ${gId}, 成就 ${topAchievement.achievement_id}, 解锁时间 ${unlockedAt}`);
                                    }
                                }
                            }
                        } else {
                            // 普通成就：只在当前群自动佩戴
                            await this.achievementService.setDisplayAchievement(
                                groupId,
                                userId,
                                topAchievement.achievement_id,
                                definition?.name || topAchievement.achievement_id,
                                definition?.rarity || 'common',
                                false,  // isManual = false，自动佩戴
                                unlockedAt  // 使用解锁时间作为 auto_display_at
                            );
                            autoWornCount++;
                            if (globalConfig.getConfig('global.debugLog')) {
                                globalConfig.debug(`自动佩戴成就: 用户 ${userId}, 群 ${groupId}, 成就 ${topAchievement.achievement_id}, 解锁时间 ${unlockedAt}`);
                            }
                        }
                    }
                }
            } catch (error) {
                globalConfig.error(`自动佩戴成就失败: 用户 ${userId}`, error);
                errors.push(`用户 ${userId}: ${error.message || '未知错误'}`);
            }
        }
        
        return {
            refreshedCount: userIds.size,  // 处理的用户数
            removedCount,
            autoWornCount,
            errors
        };
    }

    /**
     * 归档僵尸群（列出待归档的群组，等待确认）
     */
    async cleanZombieGroups(e) {
        // 验证管理员权限
        if (!(await CommandWrapper.validateAndReply(e, CommonUtils.validateAdminPermission(e)))) return;

        return await CommandWrapper.safeExecute(
            async () => {
                const userId = String(e.user_id);
                
                // 获取机器人当前所在的所有群组（Bot.gl）
                const currentGroups = new Set();
                if (global.Bot && global.Bot.gl) {
                    for (const [groupId] of global.Bot.gl) {
                        // 排除标准输入
                        if (groupId !== 'stdin') {
                            currentGroups.add(String(groupId));
                        }
                    }
                }
                
                // 查询数据库中的所有群组信息
                const allGroups = await this.dataService.dbService.all(
                    'SELECT group_id, group_name, updated_at FROM group_info ORDER BY updated_at ASC'
                );
                
                if (!allGroups || allGroups.length === 0) {
                    return e.reply('✅ 没有找到任何群组数据');
                }
                
                // 筛选僵尸群：数据库中存在，但不在 Bot.gl 中
                const zombieGroups = [];
                const now = TimeUtils.getUTC8Date();
                
                for (const group of allGroups) {
                    const groupId = String(group.group_id);
                    
                    // 如果不在当前群列表中，就是僵尸群
                    if (!currentGroups.has(groupId)) {
                        let updatedAt;
                        if (group.updated_at instanceof Date) {
                            updatedAt = group.updated_at;
                        } else if (typeof group.updated_at === 'string') {
                            updatedAt = new Date(group.updated_at);
                        } else {
                            updatedAt = new Date();
                        }
                        
                        const daysAgo = Math.floor((now.getTime() - updatedAt.getTime()) / (24 * 60 * 60 * 1000));
                        
                        zombieGroups.push({
                            groupId: group.group_id,
                            groupName: group.group_name || group.group_id,
                            updatedAt: TimeUtils.formatDateTime(updatedAt),
                            daysAgo
                        });
                    }
                }
                
                if (zombieGroups.length === 0) {
                    return e.reply('✅ 没有找到僵尸群（所有数据库中的群组都在当前群列表中）');
                }
                
                // 保存待清理的群组列表（5分钟内有效）
                AdminCommands.pendingCleanGroups.set(userId, {
                    groups: zombieGroups,
                    timestamp: Date.now()
                });
                
                // 构建合并转发消息
                const msg = [
                    [
                        `🔍 找到 ${zombieGroups.length} 个僵尸群（数据库中存在但机器人已不在群中）\n\n💡 归档说明：\n- 数据将移到暂存表，不会立即删除\n- 如果群有用户重新发言，数据将自动恢复\n- 60天后无用户发言，数据将被永久删除\n\n💡 如需归档，请发送：\n#水群确认归档\n\n⏰ 确认有效期为5分钟`
                    ]
                ];
                
                // 分批显示群组信息，每批15个
                const batchSize = 15;
                for (let i = 0; i < zombieGroups.length; i += batchSize) {
                    const batch = zombieGroups.slice(i, i + batchSize);
                    let batchText = `📋 群组列表 ${Math.floor(i / batchSize) + 1}：\n\n`;
                    
                    batch.forEach((group, index) => {
                        const groupIndex = i + index + 1;
                        const maskedGroupId = CommonUtils.maskGroupId(group.groupId);
                        batchText += `${groupIndex}. ${group.groupName} (${maskedGroupId})\n`;
                        batchText += `   最后更新: ${group.updatedAt} (${group.daysAgo}天前)\n\n`;
                    });
                    
                    if (i + batchSize < zombieGroups.length) {
                        batchText += `... 还有 ${zombieGroups.length - i - batchSize} 个群组\n`;
                    }
                    
                    msg.push([batchText]);
                }
                
                // 发送合并转发消息
                return e.reply(common.makeForwardMsg(e, msg, '僵尸群列表'));
            },
            '归档僵尸群失败',
            () => e.reply('查询失败，请稍后重试')
        );
    }

    /**
     * 确认归档僵尸群
     */
    async confirmCleanZombieGroups(e) {
        // 验证管理员权限
        if (!(await CommandWrapper.validateAndReply(e, CommonUtils.validateAdminPermission(e)))) return;

        return await CommandWrapper.safeExecute(
            async () => {
                const userId = String(e.user_id);
                
                // 检查是否有待归档的群组列表
                const pendingData = AdminCommands.pendingCleanGroups.get(userId);
                if (!pendingData) {
                    return e.reply('❌ 没有待归档的群组列表，请先使用 #水群归档僵尸群 查看');
                }
                
                // 检查是否过期（5分钟）
                const now = Date.now();
                if (now - pendingData.timestamp > 5 * 60 * 1000) {
                    AdminCommands.pendingCleanGroups.delete(userId);
                    return e.reply('❌ 确认已过期，请重新使用 #水群归档僵尸群 查看');
                }
                
                const zombieGroups = pendingData.groups;
                if (!zombieGroups || zombieGroups.length === 0) {
                    AdminCommands.pendingCleanGroups.delete(userId);
                    return e.reply('❌ 待归档的群组列表为空');
                }
                
                await e.reply(`🔄 开始归档 ${zombieGroups.length} 个僵尸群到暂存表...\n\n💡 提示：如果这些群有用户重新发言，数据将自动恢复\n⏰ 60天后无用户发言，数据将被永久删除`);
                
                let successCount = 0;
                let failCount = 0;
                const errors = [];
                
                // 逐个归档群组（移到暂存表，不删除）
                for (const group of zombieGroups) {
                    try {
                        const success = await this.dataService.clearGroupStats(group.groupId);
                        if (success) {
                            successCount++;
                            if (globalConfig.getConfig('global.debugLog')) {
                                globalConfig.debug(`成功归档僵尸群: ${group.groupId}`);
                            }
                        } else {
                            failCount++;
                            errors.push(`${group.groupName} (${CommonUtils.maskGroupId(group.groupId)}): 归档失败`);
                        }
                    } catch (error) {
                        failCount++;
                        const maskedGroupId = CommonUtils.maskGroupId(group.groupId);
                        errors.push(`${group.groupName} (${maskedGroupId}): ${error.message || '未知错误'}`);
                        globalConfig.error(`归档僵尸群失败: ${group.groupId}`, error);
                    }
                }
                
                // 清除待归档列表
                AdminCommands.pendingCleanGroups.delete(userId);
                
                // 构建合并转发消息
                const msg = [
                    [
                        `✅ 僵尸群归档完成\n\n📊 统计信息：\n- 成功归档: ${successCount} 个\n- 归档失败: ${failCount} 个\n\n💡 提示：\n- 如果这些群有用户重新发言，数据将自动恢复\n- 60天后无用户发言，数据将被永久删除`
                    ]
                ];
                
                // 如果有错误，添加到转发消息中
                if (errors.length > 0) {
                    const errorChunkSize = 10; // 每条消息最多显示10个错误
                    for (let i = 0; i < errors.length; i += errorChunkSize) {
                        const chunk = errors.slice(i, i + errorChunkSize);
                        let errorMsg = `⚠️ 错误信息 ${Math.floor(i / errorChunkSize) + 1} (共 ${errors.length} 个)：\n`;
                        errorMsg += chunk.map(err => `- ${err}`).join('\n');
                        if (i + errorChunkSize < errors.length) {
                            errorMsg += `\n... 还有 ${errors.length - i - errorChunkSize} 个错误`;
                        }
                        msg.push([errorMsg]);
                    }
                }
                
                // 发送合并转发消息
                return e.reply(common.makeForwardMsg(e, msg, '僵尸群归档完成'));
            },
            '确认归档失败',
            () => e.reply('清理失败，请稍后重试')
        );
    }

    /**
     * 查看归档群组列表
     */
    async viewArchivedGroups(e) {
        // 验证管理员权限
        if (!(await CommandWrapper.validateAndReply(e, CommonUtils.validateAdminPermission(e)))) return;

        return await CommandWrapper.safeExecute(
            async () => {
                // 获取归档群组总数
                const totalCount = await this.dataService.dbService.getArchivedGroupsCount();
                
                if (totalCount === 0) {
                    return e.reply('✅ 当前没有已归档的群组');
                }

                // 获取归档群组列表（最多显示50个）
                const archivedGroups = await this.dataService.dbService.getArchivedGroups(50, 0);
                
                if (!archivedGroups || archivedGroups.length === 0) {
                    return e.reply('✅ 当前没有已归档的群组');
                }

                // 构建合并转发消息
                const msg = [
                    [
                        `📋 归档群组列表\n\n📊 统计信息：\n- 归档总数: ${totalCount} 个\n- 显示数量: ${archivedGroups.length} 个\n\n💡 说明：\n- 归档的群组数据已移到暂存表\n- 如果群有用户重新发言，数据将自动恢复\n- 60天后无用户发言，数据将被永久删除`
                    ]
                ];

                // 分批显示群组信息，每批15个
                const batchSize = 15;
                for (let i = 0; i < archivedGroups.length; i += batchSize) {
                    const batch = archivedGroups.slice(i, i + batchSize);
                    let batchText = `📋 群组列表 ${Math.floor(i / batchSize) + 1}：\n\n`;
                    
                    batch.forEach((group, index) => {
                        const groupIndex = i + index + 1;
                        const maskedGroupId = CommonUtils.maskGroupId(group.group_id);
                        const groupName = group.group_name || group.group_id;
                        
                        // 格式化归档时间
                        let archivedAt = '未知';
                        if (group.archived_at) {
                            if (group.archived_at instanceof Date) {
                                archivedAt = TimeUtils.formatDateTime(group.archived_at);
                            } else if (typeof group.archived_at === 'string') {
                                try {
                                    archivedAt = TimeUtils.formatDateTime(new Date(group.archived_at));
                                } catch {
                                    archivedAt = group.archived_at;
                                }
                            }
                        }
                        
                        // 格式化最后活动时间
                        let lastActivityAt = '无';
                        if (group.last_activity_at) {
                            if (group.last_activity_at instanceof Date) {
                                lastActivityAt = TimeUtils.formatDateTime(group.last_activity_at);
                            } else if (typeof group.last_activity_at === 'string') {
                                try {
                                    lastActivityAt = TimeUtils.formatDateTime(new Date(group.last_activity_at));
                                } catch {
                                    lastActivityAt = group.last_activity_at;
                                }
                            }
                        }
                        
                        batchText += `${groupIndex}. ${groupName} (${maskedGroupId})\n`;
                        batchText += `   归档时间: ${archivedAt}\n`;
                        batchText += `   最后活动: ${lastActivityAt}\n\n`;
                    });
                    
                    if (i + batchSize < archivedGroups.length) {
                        batchText += `... 还有 ${archivedGroups.length - i - batchSize} 个群组\n`;
                    }
                    
                    msg.push([batchText]);
                }

                // 发送合并转发消息
                return e.reply(common.makeForwardMsg(e, msg, '归档群组列表'));
            },
            '查看归档列表失败',
            () => e.reply('查询失败，请稍后重试')
        );
    }

    /**
     * 清理缓存
     */
    async clearCache(e) {
        // 验证管理员权限
        if (!(await CommandWrapper.validateAndReply(e, CommonUtils.validateAdminPermission(e)))) return;

        return await CommandWrapper.safeExecute(
            async () => {
                // 清理所有缓存
                const result = this.dataService.clearAllCache();
                
                const msg = `✅ 缓存清理完成\n\n📊 清理统计：\n` +
                    `- 用户数据缓存: ${result.userCache} 条\n` +
                    `- 群统计缓存: ${result.groupStatsCache} 条\n` +
                    `- 排行榜缓存: ${result.rankingCache} 条\n` +
                    `- 全局统计缓存: ${result.globalStatsCache} 条\n` +
                    `- 总计: ${result.total} 条\n\n` +
                    `💡 提示：清理缓存后，下次查询将重新从数据库加载数据`;
                
                return e.reply(msg);
            },
            '清理缓存失败',
            () => e.reply('清理缓存失败，请稍后重试')
        );
    }

    /**
     * 清空词云统计
     */
    async clearWordCloudData(e) {
        // 验证管理员权限
        if (!(await CommandWrapper.validateAndReply(e, CommonUtils.validateAdminPermission(e)))) return;

        return await CommandWrapper.safeExecute(
            async () => {
                // 检查 Redis 是否可用
                if (typeof redis === 'undefined' || !redis) {
                    return e.reply('❌ Redis 未配置，无法清空词云统计', true);
                }

                // 检查消息收集是否启用
                const enableCollection = globalConfig.getConfig('wordcloud.enableMessageCollection');
                if (!enableCollection) {
                    return e.reply('❌ 消息收集功能未启用，无需清空词云统计', true);
                }

                await e.reply('🔄 正在清空词云统计数据，请稍候...');

                // 获取 MessageCollector 实例
                const { WordCloudServices } = await import('../core/services/WordCloudServices.js');
                const messageCollector = WordCloudServices.getMessageCollector();

                if (!messageCollector) {
                    return e.reply('❌ 词云服务未初始化', true);
                }

                // 清空所有词云统计数据
                const result = await messageCollector.clearAllWordCloudData();

                const msg = `✅ 词云统计清空完成\n\n📊 清理统计：\n` +
                    `- 个人消息键: ${result.userKeys} 个\n` +
                    `- 群消息键: ${result.groupKeys} 个\n` +
                    `- 全局消息键: ${result.globalKeys} 个\n` +
                    (result.oldKeys > 0 ? `- 旧格式键: ${result.oldKeys} 个\n` : '') +
                    `- 总计: ${result.total} 个键\n\n` +
                    `💡 提示：清空后，词云功能将从新收集的消息开始统计`;

                return e.reply(msg);
            },
            '清空词云统计失败',
            () => e.reply('清空词云统计失败，请稍后重试')
        );
    }

}

export { AdminCommands };
export default AdminCommands;

