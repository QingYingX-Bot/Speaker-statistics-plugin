import { DataService } from '../core/DataService.js'
import { AchievementService } from '../core/AchievementService.js'
import { globalConfig } from '../core/ConfigManager.js'
import { CommonUtils } from '../core/utils/CommonUtils.js'
import { AchievementUtils } from '../core/utils/AchievementUtils.js'
import { ImageGenerator } from '../render/ImageGenerator.js'
import { CommandWrapper } from '../core/utils/CommandWrapper.js'
import { segment } from 'oicq'

/**
 * 成就命令处理类
 */
class AchievementCommands {
    constructor(dataService = null) {
        this.dataService = dataService || new DataService()
        this.achievementService = new AchievementService(dataService)
        this.imageGenerator = new ImageGenerator(dataService)
    }

    /**
     * 格式化图片路径为 segment 格式
     * @param {string} imagePath 图片路径
     * @returns {Object} segment 图片对象
     */
    formatImageSegment(imagePath) {
        return segment.image(`file:///${imagePath.replace(/\\/g, '/')}`)
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
            },
            {
                reg: '^#水群成就给予\\s+(\\d+)\\s+(.+)$',
                fnc: 'grantUserAchievement'
            },
            {
                reg: '^#水群配置成就\\s+.+',
                fnc: 'addUserAchievement'
            }
        ]
    }

    /**
     * 显示用户徽章列表（所有可获取的成就：默认+自定义+群专属）
     */
    async showUserBadges(e) {
        const validation = CommonUtils.validateGroupMessage(e)
        if (!validation.valid) {
            return e.reply(validation.message)
        }

        return await CommandWrapper.safeExecute(async () => {
            const groupId = String(e.group_id)
            const userId = String(e.sender.user_id)
            const allDefinitions = this.achievementService.getAllAchievementDefinitions(groupId)
            const achievementData = await this.achievementService.getUserAchievements(groupId, userId)

            try {
                const imagePath = await this.imageGenerator.generateAchievementListImage(
                    allDefinitions,
                    achievementData.achievements,
                    groupId,
                    userId,
                    achievementData.displayAchievement
                )
                return e.reply(this.formatImageSegment(imagePath))
            } catch (err) {
                globalConfig.error('生成成就列表图片失败:', err)
                
                let text = `🏆 成就列表\n\n`
                text += `已解锁: ${achievementData.unlockedCount} / ${Object.keys(allDefinitions).length} 个\n\n`
                
                const achievementEntries = Object.entries(allDefinitions)
                    .map(([id, def]) => ({ id, definition: def }))
                
                AchievementUtils.sortLockedAchievements(
                    achievementEntries,
                    (item) => item.definition.rarity,
                    (item) => item.definition.name
                )
                
                const sortedAchievements = achievementEntries.map(item => [item.id, item.definition])

                for (const [id, definition] of sortedAchievements) {
                    const isUnlocked = achievementData.achievements[id]?.unlocked || false
                    const status = isUnlocked ? '✅' : '❌'
                    text += `${status} ${definition.name} (${definition.rarity})\n`
                }

                return e.reply(text)
            }
        }, '显示成就列表失败', async () => {
            return e.reply('查询失败，请稍后重试')
        })
    }

    /**
     * 设置显示成就
     */
    async setDisplayAchievement(e) {
        const validation = CommonUtils.validateGroupMessage(e)
        if (!validation.valid) {
            return e.reply(validation.message)
        }

        return await CommandWrapper.safeExecute(async () => {
            const match = e.msg.match(/^#水群设置显示成就\s+(.+)$/)
            if (!match) {
                return e.reply('格式错误，正确格式：#水群设置显示成就 [成就名]')
            }

            const achievementName = match[1].trim()
            const groupId = String(e.group_id)
            const userId = String(e.sender.user_id)
            const definitions = this.achievementService.getAllAchievementDefinitions(groupId)
            let foundAchievement = null

            for (const [id, def] of Object.entries(definitions)) {
                if (def.name === achievementName || id === achievementName) {
                    foundAchievement = { id, ...def }
                    break
                }
            }

            if (!foundAchievement) {
                return e.reply(`未找到成就: ${achievementName}`)
            }

            const achievementData = await this.achievementService.getUserAchievements(groupId, userId)
            if (!achievementData.achievements[foundAchievement.id]?.unlocked) {
                return e.reply(`你尚未解锁成就: ${foundAchievement.name}`)
            }

            await this.achievementService.setDisplayAchievement(
                groupId,
                userId,
                foundAchievement.id,
                foundAchievement.name,
                foundAchievement.rarity || 'common',
                true
            )

            return e.reply(`已设置显示成就: ${foundAchievement.name}`)
        }, '设置显示成就失败', async () => {
            return e.reply('设置失败，请稍后重试')
        })
    }

    /**
     * 显示成就统计（每个成就的获取情况）
     */
    async showAchievementStatistics(e) {
        const validation = CommonUtils.validateGroupMessage(e)
        if (!validation.valid) {
            return e.reply(validation.message)
        }

        return await CommandWrapper.safeExecute(async () => {
            const groupId = String(e.group_id)
            const globalDefinitions = this.achievementService.getAchievementDefinitions()
            const groupDefinitions = this.achievementService.getAllAchievementDefinitions(groupId)
            const groupOnlyDefinitions = {}
            
            for (const [id, def] of Object.entries(groupDefinitions)) {
                if (!globalDefinitions[id]) {
                    groupOnlyDefinitions[id] = def
                }
            }

            const globalStats = []
            for (const [achievementId, definition] of Object.entries(globalDefinitions)) {
                const isGlobal = AchievementUtils.isGlobalAchievement(definition.rarity)
                const unlockCount = await this.dataService.dbService.getAchievementUnlockCount(
                    achievementId,
                    isGlobal ? null : groupId,
                    isGlobal
                )
                globalStats.push({
                    id: achievementId,
                    definition,
                    unlockCount,
                    isGlobal
                })
            }

            const groupStats = []
            if (Object.keys(groupOnlyDefinitions).length > 0) {
                for (const [achievementId, definition] of Object.entries(groupOnlyDefinitions)) {
                    const unlockCount = await this.dataService.dbService.getAchievementUnlockCount(
                        achievementId,
                        groupId,
                        false
                    )
                    groupStats.push({
                        id: achievementId,
                        definition,
                        unlockCount,
                        isGlobal: false
                    })
                }
            }

            const sortStats = (a, b) => {
                if (b.unlockCount !== a.unlockCount) {
                    return b.unlockCount - a.unlockCount
                }
                return AchievementUtils.compareRarity(b.definition.rarity, a.definition.rarity)
            }
            globalStats.sort(sortStats)
            groupStats.sort(sortStats)

            try {
                const imagePath = await this.imageGenerator.generateAchievementStatisticsImage(
                    globalStats,
                    groupStats,
                    groupId
                )
                return e.reply(this.formatImageSegment(imagePath))
            } catch (err) {
                globalConfig.error('生成成就统计图片失败:', err)
                
                const rarityEmojiMap = {
                            common: '🥉',
                            uncommon: '🥈',
                            rare: '🥇',
                            epic: '💎',
                            legendary: '👑',
                            mythic: '🔥',
                            festival: '🎊',
                            special: '✨'
                }
                
                let text = `📊 成就统计\n\n【全局成就】\n`
                if (globalStats.length === 0) {
                    text += `暂无全局成就\n\n`
                } else {
                    for (const stat of globalStats) {
                        const rarityEmoji = rarityEmojiMap[stat.definition.rarity] || '🏆'
                        const scopeText = stat.isGlobal ? '（全局）' : ''
                        text += `${rarityEmoji} ${stat.definition.name}${scopeText}\n`
                        text += `   获取人数: ${stat.unlockCount} 人\n`
                        text += `   描述: ${stat.definition.description || '暂无描述'}\n\n`
                    }
                }

                if (groupStats.length > 0) {
                    text += `【群专属成就】\n`
                    for (const stat of groupStats) {
                        const rarityEmoji = rarityEmojiMap[stat.definition.rarity] || '🏆'
                        text += `${rarityEmoji} ${stat.definition.name}（群专属）\n`
                        text += `   获取人数: ${stat.unlockCount} 人\n`
                        text += `   描述: ${stat.definition.description || '暂无描述'}\n\n`
                    }
                }

                return e.reply(text)
            }
        }, '显示成就统计失败', async () => {
            return e.reply('查询失败，请稍后重试')
        })
    }

    /**
     * 授予用户成就（管理员命令）
     */
    async grantUserAchievement(e) {
        return await CommandWrapper.wrap(async (e) => {
            const match = e.msg.match(/^#水群成就给予\s+(\d+)\s+(.+)$/)
            if (!match) {
                return e.reply('格式错误，正确格式：#水群成就给予 <用户ID> <成就ID>\n示例：#水群成就给予 123456789 achievement_id')
            }

            const targetUserId = match[1].trim()
            const achievementId = match[2].trim()
            const groupId = String(e.group_id)

            if (!/^\d+$/.test(targetUserId)) {
                return e.reply('用户ID必须是数字')
            }

            const result = await this.achievementService.grantUserAchievement(
                groupId,
                targetUserId,
                achievementId
            )

            if (result.success) {
                return e.reply(`✅ ${result.message}`)
            } else {
                if (result.message?.includes('未找到成就定义')) {
                    return e.reply(`❌ 此成就不存在: ${achievementId}\n\n💡 可以使用以下命令添加成就：\n#水群配置成就 <成就ID> <成就名称> <成就描述>\n\n示例：\n#水群配置成就 ${achievementId} 特殊成就 这是一个特殊成就`)
                }
                return e.reply(`❌ ${result.message}`)
            }
        }, {
            requireAdmin: true,
            requireGroup: true,
            errorMessage: '授予用户成就失败'
        })(e)
    }

    /**
     * 添加用户成就（管理员命令）
     */
    async addUserAchievement(e) {
        return await CommandWrapper.wrap(async (e) => {
            const parts = e.msg.replace(/^#水群配置成就\s+/, '').split(/\s+/)
            
            if (parts.length < 3) {
                return e.reply('格式错误，正确格式：#水群配置成就 <成就ID> <成就名称> <成就描述>\n示例：#水群配置成就 special_1 特殊成就 这是一个特殊成就')
            }

            const achievementId = parts[0].trim()
            const achievementName = parts[1].trim()
            const achievementDescription = parts.slice(2).join(' ').trim()

            if (/\s/.test(achievementId)) {
                return e.reply('成就ID不能包含空格')
            }

            const existingAchievements = globalConfig.getUsersAchievementsConfig()

            if (existingAchievements[achievementId]) {
                return e.reply(`❌ 成就ID "${achievementId}" 已存在，请使用其他ID`)
            }

            const newAchievement = {
                id: achievementId,
                name: achievementName,
                description: achievementDescription,
                rarity: 'mythic',
                category: 'basic',
                condition: {
                    type: 'manual_grant'
                }
            }

            existingAchievements[achievementId] = newAchievement
            const success = globalConfig.setUsersAchievementsConfig(existingAchievements)

            if (success) {
                this.achievementService.reloadAchievements()
                return e.reply(`✅ 成功添加用户成就：${achievementName}\n成就ID: ${achievementId}\n稀有度: mythic（神话等级）\n\n现在可以使用 #水群成就给予 <用户ID> ${achievementId} 来授予此成就`)
            } else {
                return e.reply('❌ 保存成就失败，请查看日志')
            }
        }, {
            requireAdmin: true,
            requireGroup: true,
            errorMessage: '添加用户成就失败'
        })(e)
    }
}

export { AchievementCommands }
export default AchievementCommands

