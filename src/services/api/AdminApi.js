import { getDataService } from '../../core/DataService.js';
import { AuthService } from '../auth/AuthService.js';
import { AuthMiddleware } from './middleware/AuthMiddleware.js';
import { ApiResponse } from './utils/ApiResponse.js';
import { globalConfig } from '../../core/ConfigManager.js';

/**
 * 管理员相关API路由
 */
export class AdminApi {
    constructor(app, authService) {
        this.app = app;
        this.authService = authService;
        this.dataService = getDataService();
        this.authMiddleware = new AuthMiddleware(authService);
    }

    /**
     * 注册所有管理员相关API路由
     */
    registerRoutes() {
        // 获取所有群列表（管理员）
        this.app.get('/api/admin/groups', 
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            ApiResponse.asyncHandler(async (req, res) => {
                // 获取所有群ID
                const groupRows = await this.dataService.dbService.all(
                    'SELECT DISTINCT group_id FROM user_stats'
                );
                
                // 格式化群信息
                const groups = await Promise.all(groupRows.map(async (row) => {
                    const groupId = row.group_id;
                    const groupName = await this.dataService.dbService.getFormattedGroupName(groupId);
                    return {
                        group_id: groupId,
                        group_name: groupName
                    };
                }));
                
                ApiResponse.success(res, groups);
            }, '获取群列表失败')
        );

        // 清除群统计（管理员）
        this.app.delete('/api/admin/stats/:groupId',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            ApiResponse.asyncHandler(async (req, res) => {
                const { groupId } = req.params;
                await this.dataService.clearGroupStats(groupId);
                ApiResponse.success(res, null, '清除成功');
            }, '清除统计失败')
        );

        // 获取用户列表（管理员）
        this.app.get('/api/admin/users',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            ApiResponse.asyncHandler(async (req, res) => {
                const users = await this.authService.getAllUsers();
                ApiResponse.success(res, users);
            }, '获取用户列表失败')
        );

        // 获取权限信息（管理员）
        this.app.get('/api/admin/permission',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            ApiResponse.asyncHandler(async (req, res) => {
                ApiResponse.success(res, req.auth.permission);
            }, '获取权限信息失败')
        );

        // 更新用户角色（管理员）
        this.app.put('/api/admin/users/:userId/role',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            this.authMiddleware.requireParams(['role']),
            ApiResponse.asyncHandler(async (req, res) => {
                const { userId } = req.params;
                const { role } = req.body;

                if (role !== 'admin' && role !== 'user') {
                    return ApiResponse.error(res, '角色必须是 admin 或 user', 400);
                }

                const result = await this.authService.updateUserRole(userId, role);

                if (!result.success) {
                    return ApiResponse.error(res, result.message || '更新角色失败', 400);
                }

                ApiResponse.success(res, null, result.message || '角色更新成功');
            }, '更新用户角色失败')
        );

        // 获取统计概览（管理员）
        this.app.get('/api/admin/overview',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            ApiResponse.asyncHandler(async (req, res) => {
                // 获取统计概览
                const totalGroups = await this.dataService.dbService.get(
                    'SELECT COUNT(DISTINCT group_id) as count FROM user_stats'
                );
                
                const totalUsers = await this.dataService.dbService.get(
                    'SELECT COUNT(DISTINCT user_id) as count FROM user_stats'
                );
                
                const totalMessages = await this.dataService.dbService.get(
                    'SELECT SUM(total_count) as total FROM user_stats'
                );

                // 使用 LEFT JOIN 一次性获取群名和统计数据
                const groupStats = await this.dataService.dbService.all(`
                    SELECT 
                        us.group_id,
                        COALESCE(gi.group_name, '') as group_name,
                        COUNT(DISTINCT us.user_id) as user_count,
                        SUM(us.total_count) as message_count
                    FROM user_stats us
                    LEFT JOIN group_info gi ON us.group_id = gi.group_id
                    GROUP BY us.group_id, gi.group_name
                    ORDER BY message_count DESC
                    LIMIT 10
                `);

                // 格式化群信息，确保有默认群名
                const formattedGroupStats = await Promise.all(groupStats.map(async (row) => {
                    const groupName = row.group_name || await this.dataService.dbService.getFormattedGroupName(row.group_id);
                    return {
                        group_id: row.group_id,
                        group_name: groupName,
                        user_count: parseInt(row.user_count || 0, 10),
                        message_count: parseInt(row.message_count || 0, 10)
                    };
                }));

                // 获取今日统计
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                // date_key 格式为 YYYY-MM-DD
                const todayDateKey = today.toISOString().split('T')[0];
                
                const todayMessages = await this.dataService.dbService.get(
                    'SELECT SUM(message_count) as total FROM daily_stats WHERE date_key >= $1',
                    todayDateKey
                );
                
                // 获取活跃群数（最近7天有消息的群）
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                sevenDaysAgo.setHours(0, 0, 0, 0);
                const sevenDaysAgoDateKey = sevenDaysAgo.toISOString().split('T')[0];
                
                const activeGroups = await this.dataService.dbService.get(
                    'SELECT COUNT(DISTINCT group_id) as count FROM daily_stats WHERE date_key >= $1',
                    sevenDaysAgoDateKey
                );
                
                // 获取近7天的每日消息统计（用于图表）
                let dailyStats = [];
                try {
                    dailyStats = await this.dataService.dbService.all(
                        'SELECT date_key as date, SUM(message_count) as count FROM daily_stats WHERE date_key >= $1 GROUP BY date_key ORDER BY date_key ASC',
                        sevenDaysAgoDateKey
                    );
                } catch (error) {
                    console.warn('获取每日统计失败:', error);
                    dailyStats = [];
                }
                
                // 确保有7天的数据，缺失的日期补0
                const dailyStatsMap = new Map(dailyStats.map(item => [item.date, parseInt(item.count || 0, 10)]));
                const completeDailyStats = [];
                for (let i = 6; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateKey = date.toISOString().split('T')[0];
                    completeDailyStats.push({
                        date: date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
                        count: dailyStatsMap.get(dateKey) || 0
                    });
                }
                
                // 获取今日新增用户数（从 user_stats 表的 created_at 字段）
                // 根据数据库类型使用不同的查询方式
                let todayNewUsers;
                try {
                    // 尝试 PostgreSQL 方式（使用 DATE 函数）
                    todayNewUsers = await this.dataService.dbService.get(
                        'SELECT COUNT(DISTINCT user_id) as count FROM user_stats WHERE DATE(created_at) >= $1',
                        todayDateKey
                    );
                } catch (error) {
                    // 如果失败，尝试 SQLite 方式（使用日期字符串比较）
                    try {
                        todayNewUsers = await this.dataService.dbService.get(
                            'SELECT COUNT(DISTINCT user_id) as count FROM user_stats WHERE date(created_at) >= $1',
                            todayDateKey
                        );
                    } catch (error2) {
                        // 如果还是失败，使用字符串比较（SQLite datetime 格式）
                        const todayStart = `${todayDateKey} 00:00:00`;
                        todayNewUsers = await this.dataService.dbService.get(
                            'SELECT COUNT(DISTINCT user_id) as count FROM user_stats WHERE created_at >= $1',
                            todayStart
                        ).catch(() => ({ count: 0 }));
                    }
                }

                // 获取用户消息分布统计（用于图表）
                let userMessageDistribution = [0, 0, 0, 0, 0]; // [0-100, 101-500, 501-1000, 1001-5000, 5000+]
                try {
                    // 分别查询每个范围，兼容不同数据库
                    const range0 = await this.dataService.dbService.get(
                        'SELECT COUNT(*) as count FROM user_stats WHERE total_count <= 100'
                    ).catch(() => ({ count: 0 }));
                    
                    const range1 = await this.dataService.dbService.get(
                        'SELECT COUNT(*) as count FROM user_stats WHERE total_count > 100 AND total_count <= 500'
                    ).catch(() => ({ count: 0 }));
                    
                    const range2 = await this.dataService.dbService.get(
                        'SELECT COUNT(*) as count FROM user_stats WHERE total_count > 500 AND total_count <= 1000'
                    ).catch(() => ({ count: 0 }));
                    
                    const range3 = await this.dataService.dbService.get(
                        'SELECT COUNT(*) as count FROM user_stats WHERE total_count > 1000 AND total_count <= 5000'
                    ).catch(() => ({ count: 0 }));
                    
                    const range4 = await this.dataService.dbService.get(
                        'SELECT COUNT(*) as count FROM user_stats WHERE total_count > 5000'
                    ).catch(() => ({ count: 0 }));
                    
                    userMessageDistribution = [
                        parseInt(range0?.count || 0, 10),
                        parseInt(range1?.count || 0, 10),
                        parseInt(range2?.count || 0, 10),
                        parseInt(range3?.count || 0, 10),
                        parseInt(range4?.count || 0, 10)
                    ];
                } catch (error) {
                    console.warn('获取用户消息分布失败:', error);
                }
                
                // 获取近7天每日新增用户数（用于图表）
                let dailyNewUsers = [];
                try {
                    const sevenDaysAgoDate = new Date();
                    sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
                    sevenDaysAgoDate.setHours(0, 0, 0, 0);
                    const sevenDaysAgoDateKey = sevenDaysAgoDate.toISOString().split('T')[0];
                    
                    // 尝试不同的日期查询方式
                    let newUsersQuery = [];
                    try {
                        // PostgreSQL 方式
                        newUsersQuery = await this.dataService.dbService.all(
                            `SELECT DATE(created_at) as date, COUNT(DISTINCT user_id) as count 
                             FROM user_stats 
                             WHERE DATE(created_at) >= $1 
                             GROUP BY DATE(created_at) 
                             ORDER BY DATE(created_at) ASC`,
                            sevenDaysAgoDateKey
                        );
                    } catch (error) {
                        try {
                            // SQLite 方式
                            newUsersQuery = await this.dataService.dbService.all(
                                `SELECT date(created_at) as date, COUNT(DISTINCT user_id) as count 
                                 FROM user_stats 
                                 WHERE date(created_at) >= $1 
                                 GROUP BY date(created_at) 
                                 ORDER BY date(created_at) ASC`,
                                sevenDaysAgoDateKey
                            );
                        } catch (error2) {
                            // 字符串比较方式
                            const sevenDaysAgoStart = `${sevenDaysAgoDateKey} 00:00:00`;
                            newUsersQuery = await this.dataService.dbService.all(
                                `SELECT created_at as date, COUNT(DISTINCT user_id) as count 
                                 FROM user_stats 
                                 WHERE created_at >= $1 
                                 GROUP BY created_at 
                                 ORDER BY created_at ASC`,
                                sevenDaysAgoStart
                            ).catch(() => []);
                        }
                    }
                    
                    // 确保有7天的数据，缺失的日期补0
                    const newUsersMap = new Map();
                    newUsersQuery.forEach(item => {
                        let dateKey;
                        if (typeof item.date === 'string') {
                            dateKey = item.date.split(' ')[0] || item.date.split('T')[0];
                        } else {
                            dateKey = new Date(item.date).toISOString().split('T')[0];
                        }
                        newUsersMap.set(dateKey, parseInt(item.count || 0, 10));
                    });
                    
                    for (let i = 6; i >= 0; i--) {
                        const date = new Date();
                        date.setDate(date.getDate() - i);
                        const dateKey = date.toISOString().split('T')[0];
                        dailyNewUsers.push(newUsersMap.get(dateKey) || 0);
                    }
                } catch (error) {
                    console.warn('获取每日新增用户失败:', error);
                    dailyNewUsers = Array(7).fill(0);
                }

                ApiResponse.success(res, {
                    totalGroups: totalGroups?.count || 0,
                    totalUsers: totalUsers?.count || 0,
                    totalMessages: totalMessages?.total || 0,
                    todayMessages: todayMessages?.total || 0,
                    activeGroups: activeGroups?.count || 0,
                    todayNewUsers: todayNewUsers?.count || 0,
                    groupStats: formattedGroupStats,
                    dailyStats: completeDailyStats,
                    userMessageDistribution: userMessageDistribution,
                    dailyNewUsers: dailyNewUsers
                });
            }, '获取统计概览失败')
        );

        // 获取全局配置（管理员）
        this.app.get('/api/admin/config',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            ApiResponse.asyncHandler(async (req, res) => {
                const config = globalConfig.getConfig();
                ApiResponse.success(res, config);
            }, '获取配置失败')
        );

        // 保存全局配置（管理员）
        this.app.post('/api/admin/config',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            ApiResponse.asyncHandler(async (req, res) => {
                const { config } = req.body;
                
                if (!config || typeof config !== 'object') {
                    return ApiResponse.error(res, '配置数据无效', 400);
                }
                
                try {
                    globalConfig.saveConfig(config);
                    ApiResponse.success(res, null, '配置保存成功');
                } catch (error) {
                    return ApiResponse.error(res, `保存配置失败: ${error.message}`, 500);
                }
            }, '保存配置失败')
        );

        // 更新单个配置项（管理员）
        this.app.put('/api/admin/config/:key',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            ApiResponse.asyncHandler(async (req, res) => {
                const { key } = req.params;
                const { value } = req.body;
                
                try {
                    globalConfig.updateConfig(key, value);
                    ApiResponse.success(res, null, '配置更新成功');
                } catch (error) {
                    return ApiResponse.error(res, `更新配置失败: ${error.message}`, 500);
                }
            }, '更新配置失败')
        );
    }
}
