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

    // 帮助命令
    async showHelp(e) {
        return await this.helpCommands.showHelp(e);
    }

    // 背景设置
    async setBackground(e) {
        return await this.backgroundCommands.setBackground(e);
    }

    async removeBackground(e) {
        return await this.backgroundCommands.removeBackground(e);
    }

    // 消息处理
    async accept(e) {
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

