import { DataService } from '../core/DataService.js';
import { AchievementService } from '../core/AchievementService.js';
import { globalConfig } from '../core/ConfigManager.js';
import { CommonUtils } from '../core/utils/CommonUtils.js';

/**
 * 成就命令处理类
 */
class AchievementCommands {
    constructor(dataService = null) {
        this.dataService = dataService || new DataService();
        this.achievementService = new AchievementService(dataService);
    }

    /**
     * 获取命令规则
     */
    static getRules() {
        return [
            {
                reg: '^#水群成就$',
                fnc: 'showUserAchievements'
            },
            {
                reg: '^#水群成就列表$',
                fnc: 'showUserBadges'
            },
            {
                reg: '^#水群设置显示成就\\s+(.+)$',
                fnc: 'setDisplayAchievement'
            }
        ];
    }

    /**
     * 显示用户成就
     */
    async showUserAchievements(e) {
        const validation = CommonUtils.validateGroupMessage(e);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        try {
            const groupId = String(e.group_id);
            const userId = String(e.sender.user_id);

            const achievementData = await this.achievementService.getUserAchievements(groupId, userId);

            let text = `🏆 成就列表\n\n`;
            text += `已解锁: ${achievementData.unlockedCount} 个\n\n`;

            if (achievementData.displayAchievement) {
                text += `当前显示: ${achievementData.displayAchievement.name} (${achievementData.displayAchievement.rarity})\n\n`;
            }

            // 显示部分成就
            const unlocked = Object.entries(achievementData.achievements)
                .filter(([_, data]) => data.unlocked)
                .slice(0, 10);

            if (unlocked.length > 0) {
                text += `已解锁成就:\n`;
                for (const [id, data] of unlocked) {
                    const definition = this.achievementService.getAchievementDefinitions()[id];
                    if (definition) {
                        text += `  • ${definition.name}\n`;
                    }
                }
            }

            return e.reply(text);
        } catch (error) {
            globalConfig.error('显示用户成就失败:', error);
            return e.reply('查询失败，请稍后重试');
        }
    }

    /**
     * 显示用户徽章列表
     */
    async showUserBadges(e) {
        return await this.showUserAchievements(e);
    }

    /**
     * 设置显示成就
     */
    async setDisplayAchievement(e) {
        const validation = CommonUtils.validateGroupMessage(e);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        try {
            const match = e.msg.match(/^#水群设置显示成就\s+(.+)$/);
            if (!match) {
                return e.reply('格式错误，正确格式：#水群设置显示成就 [成就名]');
            }

            const achievementName = match[1].trim();
            const groupId = String(e.group_id);
            const userId = String(e.sender.user_id);

            // 查找成就
            const definitions = this.achievementService.getAllAchievementDefinitions(groupId);
            let foundAchievement = null;

            for (const [id, def] of Object.entries(definitions)) {
                if (def.name === achievementName || id === achievementName) {
                    foundAchievement = { id, ...def };
                    break;
                }
            }

            if (!foundAchievement) {
                return e.reply(`未找到成就: ${achievementName}`);
            }

            // 检查是否已解锁
            const achievementData = await this.achievementService.getUserAchievements(groupId, userId);
            if (!achievementData.achievements[foundAchievement.id]?.unlocked) {
                return e.reply(`你尚未解锁成就: ${foundAchievement.name}`);
            }

            // 设置显示成就
            await this.achievementService.setDisplayAchievement(
                groupId,
                userId,
                foundAchievement.id,
                foundAchievement.name,
                foundAchievement.rarity || 'common'
            );

            return e.reply(`已设置显示成就: ${foundAchievement.name}`);
        } catch (error) {
            globalConfig.error('设置显示成就失败:', error);
            return e.reply('设置失败，请稍后重试');
        }
    }
}

export { AchievementCommands };
export default AchievementCommands;

