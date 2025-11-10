import { getDataService } from '../../core/DataService.js';
import { AuthService } from '../auth/AuthService.js';
import { AuthMiddleware } from './middleware/AuthMiddleware.js';
import { ApiResponse } from './utils/ApiResponse.js';

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
                    try {
                        const groupInfo = await this.dataService.dbService.get(
                            'SELECT group_name FROM group_info WHERE group_id = $1',
                            groupId
                        );
                        return {
                            group_id: groupId,
                            group_name: groupInfo?.group_name || `群${groupId}`
                        };
                    } catch (error) {
                        return {
                            group_id: groupId,
                            group_name: `群${groupId}`
                        };
                    }
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
                const formattedGroupStats = groupStats.map(row => ({
                    group_id: row.group_id,
                    group_name: row.group_name || `群${row.group_id}`,
                    user_count: parseInt(row.user_count || 0, 10),
                    message_count: parseInt(row.message_count || 0, 10)
                }));

                ApiResponse.success(res, {
                    totalGroups: totalGroups?.count || 0,
                    totalUsers: totalUsers?.count || 0,
                    totalMessages: totalMessages?.total || 0,
                    topGroups: formattedGroupStats
                });
            }, '获取统计概览失败')
        );
    }
}
