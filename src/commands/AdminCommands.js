import { DataService } from '../core/DataService.js';
import { AchievementService } from '../core/AchievementService.js';
import { globalConfig } from '../core/ConfigManager.js';
import { CommonUtils } from '../core/utils/CommonUtils.js';
import { PathResolver } from '../core/utils/PathResolver.js';
import { CommandWrapper } from '../core/utils/CommandWrapper.js';
import { TimeUtils } from '../core/utils/TimeUtils.js';
import { AchievementUtils } from '../core/utils/AchievementUtils.js';
import fs from 'fs';
import path from 'path';

/**
 * 管理员命令处理类
 */
class AdminCommands {
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
            }
        ];
    }

    /**
     * 清除统计
     */
    async clearRanking(e) {
        // 验证管理员权限和群消息
        if (!CommandWrapper.validateAndReply(e, CommonUtils.validateAdminPermission(e))) return;
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
        if (!CommandWrapper.validateAndReply(e, CommonUtils.validateAdminPermission(e))) return;

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
        if (!CommandWrapper.validateAndReply(e, CommonUtils.validateAdminPermission(e))) return;

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
        if (!CommandWrapper.validateAndReply(e, CommonUtils.validateAdminPermission(e))) return;

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
        if (!CommandWrapper.validateAndReply(e, CommonUtils.validateAdminPermission(e))) return;
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
        await e.reply(`🔄 开始刷新群组 ${groupId} 的成就显示...`);
        
        // 获取所有显示中的成就
        const allDisplayAchievements = await this.achievementService.dbService.all(
            'SELECT * FROM user_display_achievements WHERE group_id = $1',
            groupId
        );
        
        if (!allDisplayAchievements || allDisplayAchievements.length === 0) {
            return e.reply(`✅ 群组 ${groupId} 没有显示中的成就`);
        }
        
        const result = await this.processGroupAchievements(groupId, allDisplayAchievements);
        
        // 构建合并转发消息
        const forwardMsg = [
            {
                message: `✅ 群组 ${groupId} 成就刷新完成\n\n📊 统计信息：\n- 已刷新: ${result.refreshedCount} 个\n- 已卸下: ${result.removedCount} 个`
            }
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
            forwardMsg.push({ message: errorMsg });
        }
        
        // 发送合并转发消息
        if (e.group && e.group.makeForwardMsg) {
            return e.reply(await e.group.makeForwardMsg(forwardMsg));
        } else {
            // 如果不是群聊，直接发送文本消息
            const textMsg = forwardMsg.map(msg => msg.message).join('');
            return e.reply(textMsg);
        }
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
                allErrors.push(...result.errors.map(err => `群 ${groupId}: ${err}`));
                
                groupResults.push({
                    groupId,
                    refreshedCount: result.refreshedCount,
                    removedCount: result.removedCount,
                    errorCount: result.errors.length
                });
            } catch (error) {
                globalConfig.error(`刷新群组 ${groupId} 成就失败:`, error);
                allErrors.push(`群 ${groupId}: ${error.message || '未知错误'}`);
            }
        }
        
        // 构建合并转发消息
        const forwardMsg = [
            {
                message: `✅ 所有群组成就刷新完成\n\n📊 总体统计：\n- 已处理群组: ${groupIds.length} 个\n- 已刷新成就: ${totalRefreshedCount} 个\n- 已卸下成就: ${totalRemovedCount} 个`
            }
        ];
        
        // 显示各群组统计（拆分成多条消息，每条最多10个群组）
        if (groupResults.length > 0) {
            const chunkSize = 10; // 每条消息最多显示10个群组
            for (let i = 0; i < groupResults.length; i += chunkSize) {
                const chunk = groupResults.slice(i, i + chunkSize);
                let groupDetailMsg = `📋 群组详情 ${Math.floor(i / chunkSize) + 1}：\n`;
                for (const result of chunk) {
                    groupDetailMsg += `- 群 ${result.groupId}: 刷新 ${result.refreshedCount} 个, 卸下 ${result.removedCount} 个`;
                    if (result.errorCount > 0) {
                        groupDetailMsg += ` (${result.errorCount} 个错误)`;
                    }
                    groupDetailMsg += '\n';
                }
                if (i + chunkSize < groupResults.length) {
                    groupDetailMsg += `  ... 还有 ${groupResults.length - i - chunkSize} 个群组\n`;
                }
                forwardMsg.push({ message: groupDetailMsg });
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
                forwardMsg.push({ message: errorMsg });
            }
        }
        
        // 发送合并转发消息
        if (e.group && e.group.makeForwardMsg) {
            return e.reply(await e.group.makeForwardMsg(forwardMsg));
        } else {
            // 如果不是群聊，直接发送文本消息
            const textMsg = forwardMsg.map(msg => msg.message).join('');
            return e.reply(textMsg);
        }
    }

    /**
     * 处理单个群组的成就
     */
    async processGroupAchievements(groupId, allDisplayAchievements) {
        // 获取所有成就定义
        const allDefinitions = this.achievementService.getAllAchievementDefinitions(groupId);
        
        let removedCount = 0;
        let refreshedCount = 0;
        const errors = [];
        
        // 检查每个显示的成就
        for (const displayAchievement of allDisplayAchievements) {
            try {
                const userId = String(displayAchievement.user_id);
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
                // 先检查当前群的成就
                const userAchievements = await this.achievementService.dbService.getAllUserAchievements(groupId, userId);
                let userAchievement = userAchievements.find(a => a.achievement_id === achievementId);
                
                // 如果是全局成就（特殊成就或节日成就），需要检查其他群是否已解锁
                if ((!userAchievement || !userAchievement.unlocked) && AchievementUtils.isGlobalAchievement(definition.rarity)) {
                    // 检查其他群是否已解锁
                    const otherGroupAchievement = await this.achievementService.dbService.getAchievementFromAnyGroup(userId, achievementId);
                    if (otherGroupAchievement && otherGroupAchievement.unlocked) {
                        // 其他群已解锁，视为已解锁（全局成就）
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
                    continue;
                }
                
                // 3. 检查自动佩戴的成就是否超过24小时
                if (!displayAchievement.is_manual && displayAchievement.auto_display_at) {
                    await this.achievementService.checkAndRemoveExpiredAutoDisplay(groupId, userId);
                    
                    // 检查是否已被卸下
                    const stillDisplayed = await this.achievementService.dbService.getDisplayAchievement(groupId, userId);
                    if (!stillDisplayed) {
                        removedCount++;
                        continue;
                    }
                }
                
                refreshedCount++;
            } catch (error) {
                globalConfig.error(`刷新成就失败: 用户 ${displayAchievement.user_id}, 成就 ${displayAchievement.achievement_id}`, error);
                errors.push(`用户 ${displayAchievement.user_id}: ${error.message || '未知错误'}`);
            }
        }
        
        return {
            refreshedCount,
            removedCount,
            errors
        };
    }

}

export { AdminCommands };
export default AdminCommands;

