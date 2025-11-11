import { DataService } from '../core/DataService.js';
import { globalConfig } from '../core/ConfigManager.js';
import { CommonUtils } from '../core/utils/CommonUtils.js';
import { PathResolver } from '../core/utils/PathResolver.js';
import { RestartInfoManager } from '../core/utils/RestartInfoManager.js';
import fs from 'fs';
import path from 'path';

/**
 * 管理员命令处理类
 */
class AdminCommands {
    constructor(dataService = null) {
        this.dataService = dataService || new DataService();
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
            }
        ];
    }

    /**
     * 清除统计
     */
    async clearRanking(e) {
        const validation = CommonUtils.validateAdminPermission(e);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        const validationGroup = CommonUtils.validateGroupMessage(e);
        if (!validationGroup.valid) {
            return e.reply(validationGroup.message);
        }

        try {
            const groupId = String(e.group_id);
            const success = await this.dataService.clearGroupStats(groupId);

            if (success) {
                return e.reply('统计数据已清除');
            } else {
                return e.reply('清除统计数据失败');
            }
        } catch (error) {
            globalConfig.error('清除统计失败:', error);
            return e.reply('清除失败，请稍后重试');
        }
    }

    /**
     * 设置显示人数
     */
    async setDisplayCount(e) {
        const validation = CommonUtils.validateAdminPermission(e);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        try {
            const match = e.msg.match(/^#水群设置人数\+(\d+)$/);
            if (!match) {
                return e.reply('格式错误，正确格式：#水群设置人数+数字');
            }

            const count = parseInt(match[1]);
            if (count < 1 || count > 100) {
                return e.reply('显示人数必须在1-100之间');
            }

            globalConfig.updateConfig('display.displayCount', count);
            return e.reply(`显示人数已设置为 ${count}`);
        } catch (error) {
            globalConfig.error('设置显示人数失败:', error);
            return e.reply('设置失败，请稍后重试');
        }
    }

    /**
     * 切换设置
     */
    async toggleSetting(e) {
        const validation = CommonUtils.validateAdminPermission(e);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        try {
            const match = e.msg.match(/^#水群设置(开启|关闭)(转发|图片|记录|日志)$/);
            if (!match) {
                return e.reply('格式错误');
            }

            const toggle = match[1] === '开启';
            const setting = match[2];

            let configKey = '';
            let settingName = '';

            switch (setting) {
                case '转发':
                    configKey = 'display.useForward';
                    settingName = '转发消息';
                    break;
                case '图片':
                    configKey = 'display.usePicture';
                    settingName = '图片模式';
                    break;
                case '记录':
                    configKey = 'global.recordMessage';
                    settingName = '消息记录';
                    break;
                case '日志':
                    configKey = 'global.debugLog';
                    settingName = '调试日志';
                    break;
                default:
                    return e.reply('未知设置项');
            }

            globalConfig.updateConfig(configKey, toggle);
            return e.reply(`${settingName}已${toggle ? '开启' : '关闭'}`);
        } catch (error) {
            globalConfig.error('切换设置失败:', error);
            return e.reply('设置失败，请稍后重试');
        }
    }

    /**
     * 更新插件
     */
    async updatePlugin(e) {
        const validation = CommonUtils.validateAdminPermission(e);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

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
            
            // 保存重启信息到内存（用于重启后发送提示）
            RestartInfoManager.saveRestartInfo({
                userId: String(e.user_id),
                groupId: e.group_id ? String(e.group_id) : null,
                updateType: isForce ? 'force' : 'normal',
                updateLog: output.substring(0, 500)
            });
            
            // 发送回复消息
            await e.reply(replyMsg);
            
            // 延迟一下，确保消息发送成功
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 自动重启
            try {
                // 检查 Bot 对象是否可用
                if (typeof Bot !== 'undefined' && typeof Bot.restart === 'function') {
                    globalConfig.debug('[更新插件] 使用 Bot.restart() 重启');
                    // 使用 Bot.restart() 重启
                    await Bot.restart();
                } else if (typeof process !== 'undefined' && process.exit) {
                    // 如果 Bot.restart 不可用，使用 process.exit 退出（由进程管理器重启）
                    globalConfig.warn('[更新插件] Bot.restart 不可用，使用 process.exit(0) 退出');
                    // 延迟一下，确保消息已发送
                    setTimeout(() => {
                        process.exit(0);
                    }, 500);
                } else {
                    throw new Error('无法找到重启方法');
                }
            } catch (restartError) {
                globalConfig.error('[更新插件] 自动重启失败:', restartError);
                // 清除重启信息（因为重启失败）
                RestartInfoManager.getAndClearRestartInfo();
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

}

export { AdminCommands };
export default AdminCommands;

