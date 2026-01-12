import { BaseApi } from './BaseApi.js'
import { AchievementService } from '../../core/AchievementService.js'
import { AuthService } from '../auth/AuthService.js'
import { AuthMiddleware } from './middleware/AuthMiddleware.js'
import { ApiResponse } from './utils/ApiResponse.js'

/**
 * 成就相关API路由
 */
export class AchievementApi extends BaseApi {
    constructor(app, achievementService, authService) {
        super(app)
        this.achievementService = achievementService
        this.authService = authService
        this.authMiddleware = new AuthMiddleware(authService)
    }

    /**
     * 注册所有成就相关API路由
     */
    registerRoutes() {
        // 获取成就列表
        this.get('/api/achievements/list/:groupId', async (req, res) => {
                const { groupId } = req.params
                const { userId } = req.query
                
                const definitions = this.achievementService.getAchievementDefinitions()
                const achievements = []
                
                // 如果提供了userId，获取用户的成就数据
                let userAchievements = {}
                let displayAchievement = null
                if (userId) {
                    try {
                        const userAchievementsData = await this.achievementService.getUserAchievements(groupId, userId)
                        userAchievements = userAchievementsData.achievements || {}
                        displayAchievement = userAchievementsData.displayAchievement || null
                    } catch (error) {
                        // 静默失败，继续处理
                    }
                }
                
                for (const [id, def] of Object.entries(definitions)) {
                    const unlocked = userAchievements[id]?.unlocked || false
                    const isDisplay = displayAchievement && displayAchievement.id === id
                    
                    achievements.push({
                        id,
                        ...def,
                        unlocked,
                        is_display: isDisplay || false
                    })
                }

                const responseData = {
                    achievements: achievements
                }
                if (displayAchievement) {
                    responseData.current_display = displayAchievement.id
                    responseData.display_info = {
                        id: displayAchievement.id,
                        isManual: displayAchievement.isManual || false,
                        autoDisplayAt: displayAchievement.autoDisplayAt || null
                    }
                }
                ApiResponse.success(res, responseData)
        }, '获取成就列表失败')

        // 获取用户成就
        this.get('/api/achievements/user/:userId/:groupId', async (req, res) => {
                const { userId, groupId } = req.params
                const userAchievements = await this.achievementService.getUserAchievements(groupId, userId)
                ApiResponse.success(res, userAchievements)
        }, '获取用户成就失败')

        // 获取成就统计
        this.get('/api/achievements/stats/:groupId', async (req, res) => {
                const { groupId } = req.params
                const definitions = this.achievementService.getAchievementDefinitions()
                const stats = []
                
                const dataService = this.achievementService.dataService
                
                for (const [id, def] of Object.entries(definitions)) {
                    const isGlobal = def.rarity === 'Special' || def.rarity === 'Festival'
                    const unlockCount = await dataService.dbService.getAchievementUnlockCount(
                        id,
                        isGlobal ? null : groupId,
                        isGlobal
                    )
                    
                    stats.push({
                        id,
                        name: def.name || id,
                        rarity: def.rarity || 'Common',
                        unlockCount
                    })
                }
                
                // 按解锁人数降序，相同人数按稀有度排序
                stats.sort((a, b) => {
                    if (a.unlockCount !== b.unlockCount) {
                        return b.unlockCount - a.unlockCount
                    }
                    const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Festival', 'Special']
                    return rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity)
                })
                
                ApiResponse.success(res, stats)
        }, '获取成就统计失败')

        // 设置显示成就
        this.app.post('/api/achievements/set-display',
            this.authMiddleware.requireParams(['userId', 'groupId', 'achievementId', 'secretKey']),
            this.authMiddleware.requireSecretKey.bind(this.authMiddleware),
            ApiResponse.asyncHandler(async (req, res) => {
                const { groupId, achievementId } = req.body
                const { userId } = req.auth

                // 验证成就是否已解锁
                const userAchievements = await this.achievementService.getUserAchievements(groupId, userId)
                const unlocked = userAchievements.achievements?.[achievementId]?.unlocked || false
                if (!unlocked) {
                    return ApiResponse.error(res, '成就尚未解锁', 400)
                }

                // 获取成就定义以获取名称和稀有度
                const definitions = this.achievementService.getAchievementDefinitions()
                const definition = definitions[achievementId]
                if (!definition) {
                    return ApiResponse.error(res, '成就定义不存在', 400)
                }
                
                await this.achievementService.setDisplayAchievement(
                    groupId, 
                    userId, 
                    achievementId, 
                    definition.name || achievementId,
                    definition.rarity || 'Common',
                    true // isManual
                )
                
                // 获取更新后的显示成就信息
                const updatedUserAchievements = await this.achievementService.getUserAchievements(groupId, userId)
                const currentDisplay = updatedUserAchievements.displayAchievement
                const displayId = currentDisplay ? currentDisplay.id : achievementId
                
                ApiResponse.success(res, {
                    current_display: displayId,
                    displayAchievementId: displayId
                }, '设置成功')
            }, '设置显示成就失败')
        )
    }
}
