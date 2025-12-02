import plugin from '../../../../lib/plugins/plugin.js';
import { getDataService } from './DataService.js';
import { getMessageRecorder } from './MessageRecorder.js';
import { RankCommands } from '../commands/RankCommands.js';
import { UserCommands } from '../commands/UserCommands.js';
import { AdminCommands } from '../commands/AdminCommands.js';
import { HelpCommands } from '../commands/HelpCommands.js';
import { AchievementCommands } from '../commands/AchievementCommands.js';
import { BackgroundManager } from '../managers/BackgroundManager.js';
import { globalConfig } from './ConfigManager.js';

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
        this.dataService = getDataService();
        this.messageRecorder = getMessageRecorder(this.dataService);

        // 创建命令处理器
        this.rankCommands = new RankCommands(this.dataService);
        this.userCommands = new UserCommands(this.dataService);
        this.adminCommands = new AdminCommands(this.dataService);
        this.helpCommands = new HelpCommands(this.dataService);
        this.achievementCommands = new AchievementCommands(this.dataService);
        this.backgroundCommands = new BackgroundManager();

        logger.debug('[发言统计] 插件实例创建完成');
    }

    // 静态标志，防止多次初始化
    static _initialized = false;
    static _initializing = false;

    /**
     * 插件初始化
     * 启动Web服务器
     */
    async init() {
        // 如果已经初始化完成，直接返回
        if (Plugin._initialized) {
            logger.debug('[发言统计] 插件已初始化，跳过重复初始化');
            return;
        }

        // 如果正在初始化，等待完成
        if (Plugin._initializing) {
            logger.debug('[发言统计] 插件正在初始化中，请稍候...');
            let waitCount = 0;
            while (Plugin._initializing && waitCount < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waitCount++;
            }
            // 等待完成后，如果已初始化则返回
            if (Plugin._initialized) {
                return;
            }
        }

        // 设置初始化标志
        Plugin._initializing = true;

        try {
            // 优化 key.json 文件（移除明文秘钥）
            try {
                const { KeyFileOptimizer } = await import('./utils/KeyFileOptimizer.js');
                const optimizeResult = await KeyFileOptimizer.optimizeKeyFile();
                if (optimizeResult.cleaned > 0) {
                    logger.mark(`[发言统计] key.json 优化完成，清理了 ${optimizeResult.cleaned} 个用户的明文秘钥`);
                }
            } catch (optimizeError) {
                logger.warn('[发言统计] key.json 优化失败:', optimizeError);
            }

            const { getWebServer } = await import('../services/WebServer.js');
            const webServer = getWebServer();
            
            // 检查是否已在运行，避免重复启动
            if (webServer.isRunning) {
                logger.info('[发言统计] Web服务器已在运行');
                Plugin._initialized = true;
                Plugin._initializing = false;
                return;
            }
            
            await webServer.start();
            logger.info('[发言统计] Web服务器启动成功');
            Plugin._initialized = true;
        } catch (error) {
            logger.error('[发言统计] Web服务器启动失败:', error);
            // 即使失败也标记为已初始化，避免重复尝试
            Plugin._initialized = true;
        } finally {
            Plugin._initializing = false;
        }
    }

    // 命令处理方法 - 排行榜相关
    async showTotalRank(e) {
        return await this.rankCommands.showTotalRank(e);
    }

    async showDailyRank(e) {
        return await this.rankCommands.showDailyRank(e);
    }

    async showWeeklyRank(e) {
        return await this.rankCommands.showWeeklyRank(e);
    }

    async showMonthlyRank(e) {
        return await this.rankCommands.showMonthlyRank(e);
    }

    async showYearlyRank(e) {
        return await this.rankCommands.showYearlyRank(e);
    }

    async showGroupStats(e) {
        return await this.rankCommands.showGroupStats(e);
    }

    async showGroupInfo(e) {
        return await this.rankCommands.showGroupInfo(e);
    }

    async showGlobalStats(e) {
        return await this.rankCommands.showGlobalStats(e);
    }

    // 用户查询相关
    async queryUserStats(e) {
        return await this.userCommands.queryUserStats(e);
    }

    async listUserGroups(e) {
        return await this.userCommands.listUserGroups(e);
    }

    async openWebPage(e) {
        return await this.userCommands.openWebPage(e);
    }

    // 管理员命令
    async clearRanking(e) {
        return await this.adminCommands.clearRanking(e);
    }

    async setDisplayCount(e) {
        return await this.adminCommands.setDisplayCount(e);
    }

    async setUseForward(e) {
        return await this.adminCommands.setUseForward(e);
    }

    async setUsePicture(e) {
        return await this.adminCommands.setUsePicture(e);
    }

    async toggleRecordMessage(e) {
        return await this.adminCommands.toggleRecordMessage(e);
    }

    async toggleDebugLog(e) {
        return await this.adminCommands.toggleDebugLog(e);
    }

    async updatePlugin(e) {
        return await this.adminCommands.updatePlugin(e);
    }

    async refreshAchievements(e) {
        return await this.adminCommands.refreshAchievements(e);
    }

    async cleanZombieGroups(e) {
        return await this.adminCommands.cleanZombieGroups(e);
    }

    async confirmCleanZombieGroups(e) {
        return await this.adminCommands.confirmCleanZombieGroups(e);
    }

    // 成就相关
    async showUserAchievements(e) {
        return await this.achievementCommands.showUserAchievements(e);
    }

    async showUserBadges(e) {
        return await this.achievementCommands.showUserBadges(e);
    }

    async setDisplayAchievement(e) {
        return await this.achievementCommands.setDisplayAchievement(e);
    }

    async showAchievementStatistics(e) {
        return await this.achievementCommands.showAchievementStatistics(e);
    }

    async grantUserAchievement(e) {
        return await this.achievementCommands.grantUserAchievement(e);
    }

    async addUserAchievement(e) {
        return await this.achievementCommands.addUserAchievement(e);
    }

    // 帮助命令
    async showHelp(e) {
        return await this.helpCommands.showHelp(e);
    }

    // 背景设置
    async openBackgroundPage(e) {
        return await this.backgroundCommands.openBackgroundPage(e);
    }

    async removeBackground(e) {
        return await this.backgroundCommands.removeBackground(e);
    }

    async showBackgroundHelp(e) {
        return await this.backgroundCommands.showBackgroundHelp(e);
    }

    // 消息处理
    async accept(e) {
        // 清理消息文本，移除零宽字符和不可见字符，解决复制命令无法触发的问题
        if (e.msg && typeof e.msg === 'string') {
            // 移除零宽字符（Zero-width characters）
            e.msg = e.msg.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');
            // 移除其他不可见字符（但保留空格、换行等常见空白字符）
            e.msg = e.msg.replace(/[\u2000-\u200A\u2028-\u2029]/g, ' ');
            // 规范化空白字符：将多个连续空白字符替换为单个空格
            e.msg = e.msg.replace(/[\s\u00A0]+/g, ' ');
            // 移除首尾空白
            e.msg = e.msg.trim();
        }
        
        // 记录消息（recordMessage 内部已有去重机制，这里只需要调用即可）
        if (globalConfig.getConfig('global.enableStatistics') && 
            globalConfig.getConfig('global.recordMessage')) {
            // 使用 await 确保消息记录完成（但不会阻塞消息传递）
            // 注意：recordMessage 内部已经有完整的去重和锁机制，不需要在这里再次去重
            this.messageRecorder.recordMessage(e).catch(error => {
                // 静默处理错误，不影响消息传递（不输出到控制台）
                // 只在调试模式下输出错误
                if (globalConfig.getConfig('global.debugLog')) {
                    globalConfig.debug('[消息记录] 记录消息异常:', error.message || error);
                }
            });
        }
        
        return false; // 不阻止消息传递
    }
}

export { Plugin };
export default Plugin;

