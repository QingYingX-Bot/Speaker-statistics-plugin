import { BaseApi } from '../BaseApi.js';
import { getDataService } from '../../../core/DataService.js';
import { AchievementService } from '../../../core/AchievementService.js';
import { AuthMiddleware } from '../middleware/AuthMiddleware.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * 成就管理API路由
 */
export class AchievementManagementApi extends BaseApi {
    constructor(app, authService) {
        super(app);
        this.authService = authService;
        this.dataService = getDataService();
        this.achievementService = new AchievementService(this.dataService);
        this.authMiddleware = new AuthMiddleware(authService);
    }

    /**
     * 注册所有成就管理相关API路由
     */
    registerRoutes() {
        // 获取成就列表（管理员）
        this.get('/api/admin/achievements/list/:groupId',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            async (req, res) => {
                const { groupId } = req.params;
                
                const definitions = this.achievementService.getAchievementDefinitions();
                const achievements = [];
                
                for (const [id, def] of Object.entries(definitions)) {
                    achievements.push({
                        id,
                        name: def.name || id,
                        description: def.description || '',
                        category: def.category || '未分类',
                        rarity: def.rarity || 'Common',
                        ...def
                    });
                }
                
                ApiResponse.success(res, { achievements });
            }, '获取成就列表失败'
        );
        
        // 获取成就统计（管理员）
        this.get('/api/admin/achievements/stats/:groupId',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            async (req, res) => {
                const { groupId } = req.params;
                const definitions = this.achievementService.getAchievementDefinitions();
                const stats = [];
                
                // 获取群组总用户数（用于计算百分比）
                const totalUsersResult = await this.dataService.dbService.get(
                    'SELECT COUNT(DISTINCT user_id) as total FROM user_stats WHERE group_id = $1',
                    groupId
                ).catch(() => ({ total: 0 }));
                const totalUsers = parseInt(totalUsersResult?.total || 0, 10);
                
                for (const [id, def] of Object.entries(definitions)) {
                    const isGlobal = def.rarity === 'Special' || def.rarity === 'Festival';
                    const unlockCount = await this.dataService.dbService.getAchievementUnlockCount(
                        id,
                        isGlobal ? null : groupId,
                        isGlobal
                    ).catch(() => 0);
                    
                    const percentage = totalUsers > 0 
                        ? ((unlockCount / totalUsers) * 100).toFixed(2)
                        : 0;
                    
                    stats.push({
                        achievement_id: id,
                        user_count: unlockCount,
                        percentage: parseFloat(percentage)
                    });
                }
                
                ApiResponse.success(res, stats);
            }, '获取成就统计失败'
        );
        
        // 获取全部成就统计（所有群组汇总）
        this.get('/api/admin/achievements/stats/all',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            async (req, res) => {
                const definitions = this.achievementService.getAchievementDefinitions();
                const stats = [];
                
                // 获取所有群组的总用户数（去重）
                const totalUsersResult = await this.dataService.dbService.get(
                    'SELECT COUNT(DISTINCT user_id) as total FROM user_stats'
                ).catch(() => ({ total: 0 }));
                const totalUsers = parseInt(totalUsersResult?.total || 0, 10);
                
                for (const [id, def] of Object.entries(definitions)) {
                    // 对于全部统计，需要统计所有群组的数据
                    // 使用全局统计，不限制群组
                    const unlockCount = await this.dataService.dbService.get(
                        'SELECT COUNT(DISTINCT user_id) as count FROM user_achievements WHERE achievement_id = $1',
                        id
                    ).catch(() => ({ count: 0 }));
                    
                    const count = parseInt(unlockCount?.count || 0, 10);
                    const percentage = totalUsers > 0 
                        ? ((count / totalUsers) * 100).toFixed(2)
                        : 0;
                    
                    stats.push({
                        achievement_id: id,
                        user_count: count,
                        percentage: parseFloat(percentage)
                    });
                }
                
                ApiResponse.success(res, stats);
            }, '获取全部成就统计失败'
        );
    }
}

