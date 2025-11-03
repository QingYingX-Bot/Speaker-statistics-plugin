import { DataService } from '../core/DataService.js';
import { AchievementService } from '../core/AchievementService.js';
import { globalConfig } from '../core/ConfigManager.js';
import { CommonUtils } from '../core/utils/CommonUtils.js';
import { AchievementUtils } from '../core/utils/AchievementUtils.js';
import { ImageGenerator } from '../render/ImageGenerator.js';
import { segment } from 'oicq';

/**
 * 成就命令处理类
 */
class AchievementCommands {
    constructor(dataService = null) {
        this.dataService = dataService || new DataService();
        this.achievementService = new AchievementService(dataService);
        this.imageGenerator = new ImageGenerator(dataService);
    }

    /**
     * 获取命令规则
     */
    static getRules() {
        return [
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
     * 显示用户徽章列表（所有可获取的成就：默认+自定义+群专属）
     */
    async showUserBadges(e) {
        const validation = CommonUtils.validateGroupMessage(e);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        try {
            const groupId = String(e.group_id);
            const userId = String(e.sender.user_id);

            // 获取所有成就定义（默认+自定义+群专属）
            const allDefinitions = this.achievementService.getAllAchievementDefinitions(groupId);
            
            // 获取用户的成就解锁状态
            const achievementData = await this.achievementService.getUserAchievements(groupId, userId);

            // 生成成就列表图片
            try {
                const imagePath = await this.imageGenerator.generateAchievementListImage(
                    allDefinitions,
                    achievementData.achievements,
                    groupId,
                    userId
                );
                return e.reply(segment.image(`file:///${imagePath.replace(/\\/g, '/')}`));
            } catch (error) {
                globalConfig.error('生成成就列表图片失败:', error);
                // 回退到文本模式
                let text = `🏆 成就列表\n\n`;
                text += `已解锁: ${achievementData.unlockedCount} / ${Object.keys(allDefinitions).length} 个\n\n`;
                
                // 按稀有度排序显示
                const achievementEntries = Object.entries(allDefinitions)
                    .map(([id, def]) => ({ id, definition: def }));
                
                AchievementUtils.sortLockedAchievements(
                    achievementEntries,
                    (item) => item.definition.rarity,
                    (item) => item.definition.name
                );
                
                const sortedAchievements = achievementEntries.map(item => [item.id, item.definition]);

                for (const [id, definition] of sortedAchievements) {
                    const isUnlocked = achievementData.achievements[id]?.unlocked || false;
                    const status = isUnlocked ? '✅' : '❌';
                    text += `${status} ${definition.name} (${definition.rarity})\n`;
                }

                return e.reply(text);
            }
        } catch (error) {
            globalConfig.error('显示成就列表失败:', error);
            return e.reply('查询失败，请稍后重试');
        }
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

