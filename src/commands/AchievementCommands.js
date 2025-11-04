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
            },
            {
                reg: '^#水群成就统计$',
                fnc: 'showAchievementStatistics'
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
                    userId,
                    achievementData.displayAchievement
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

            // 设置显示成就（手动设置，无时限）
            await this.achievementService.setDisplayAchievement(
                groupId,
                userId,
                foundAchievement.id,
                foundAchievement.name,
                foundAchievement.rarity || 'common',
                true  // isManual = true，手动设置无时限
            );

            return e.reply(`已设置显示成就: ${foundAchievement.name}`);
        } catch (error) {
            globalConfig.error('设置显示成就失败:', error);
            return e.reply('设置失败，请稍后重试');
        }
    }

    /**
     * 显示成就统计（每个成就的获取情况）
     */
    async showAchievementStatistics(e) {
        const validation = CommonUtils.validateGroupMessage(e);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        try {
            const groupId = String(e.group_id);

            // 获取全局成就定义（不包括群专属）
            const globalDefinitions = this.achievementService.getAchievementDefinitions();
            
            // 获取群专属成就定义（仅当前群）
            const groupDefinitions = this.achievementService.getAllAchievementDefinitions(groupId);
            const groupOnlyDefinitions = {};
            for (const [id, def] of Object.entries(groupDefinitions)) {
                if (!globalDefinitions[id]) {
                    groupOnlyDefinitions[id] = def;
                }
            }

            // 统计全局成就
            const globalStats = [];
            for (const [achievementId, definition] of Object.entries(globalDefinitions)) {
                const isGlobal = AchievementUtils.isGlobalAchievement(definition.rarity);
                // 全局成就（特殊成就或节日成就）统计所有群，普通成就统计当前群
                const unlockCount = await this.dataService.dbService.getAchievementUnlockCount(
                    achievementId,
                    isGlobal ? null : groupId,  // 全局成就不传groupId，普通成就传当前groupId
                    isGlobal
                );
                globalStats.push({
                    id: achievementId,
                    definition,
                    unlockCount,
                    isGlobal
                });
            }

            // 统计群专属成就（仅当前群有专属成就时）
            const groupStats = [];
            if (Object.keys(groupOnlyDefinitions).length > 0) {
                for (const [achievementId, definition] of Object.entries(groupOnlyDefinitions)) {
                    const unlockCount = await this.dataService.dbService.getAchievementUnlockCount(
                        achievementId,
                        groupId,
                        false
                    );
                    groupStats.push({
                        id: achievementId,
                        definition,
                        unlockCount,
                        isGlobal: false
                    });
                }
            }

            // 按获取人数排序（降序），然后按稀有度排序
            globalStats.sort((a, b) => {
                if (b.unlockCount !== a.unlockCount) {
                    return b.unlockCount - a.unlockCount;
                }
                return AchievementUtils.compareRarity(b.definition.rarity, a.definition.rarity);
            });
            groupStats.sort((a, b) => {
                if (b.unlockCount !== a.unlockCount) {
                    return b.unlockCount - a.unlockCount;
                }
                return AchievementUtils.compareRarity(b.definition.rarity, a.definition.rarity);
            });

            // 生成成就统计图片
            try {
                const imagePath = await this.imageGenerator.generateAchievementStatisticsImage(
                    globalStats,
                    groupStats,
                    groupId
                );
                return e.reply(segment.image(`file:///${imagePath.replace(/\\/g, '/')}`));
            } catch (error) {
                globalConfig.error('生成成就统计图片失败:', error);
                // 回退到文本模式
                let text = `📊 成就统计\n\n`;
                
                // 全局成就统计
                text += `【全局成就】\n`;
                if (globalStats.length === 0) {
                    text += `暂无全局成就\n\n`;
                } else {
                    for (const stat of globalStats) {
                        const rarityEmoji = {
                            common: '🥉',
                            uncommon: '🥈',
                            rare: '🥇',
                            epic: '💎',
                            legendary: '👑',
                            mythic: '🔥',
                            festival: '🎊',
                            special: '✨'
                        }[stat.definition.rarity] || '🏆';
                        
                        const scopeText = stat.isGlobal ? '（全局）' : '';
                        text += `${rarityEmoji} ${stat.definition.name}${scopeText}\n`;
                        text += `   获取人数: ${stat.unlockCount} 人\n`;
                        text += `   描述: ${stat.definition.description || '暂无描述'}\n\n`;
                    }
                }

                // 群专属成就统计（仅当前群有专属成就时）
                if (groupStats.length > 0) {
                    text += `【群专属成就】\n`;
                    for (const stat of groupStats) {
                        const rarityEmoji = {
                            common: '🥉',
                            uncommon: '🥈',
                            rare: '🥇',
                            epic: '💎',
                            legendary: '👑',
                            mythic: '🔥',
                            festival: '🎊',
                            special: '✨'
                        }[stat.definition.rarity] || '🏆';
                        
                        text += `${rarityEmoji} ${stat.definition.name}（群专属）\n`;
                        text += `   获取人数: ${stat.unlockCount} 人\n`;
                        text += `   描述: ${stat.definition.description || '暂无描述'}\n\n`;
                    }
                }

                return e.reply(text);
            }
        } catch (error) {
            globalConfig.error('显示成就统计失败:', error);
            return e.reply('查询失败，请稍后重试');
        }
    }
}

export { AchievementCommands };
export default AchievementCommands;

