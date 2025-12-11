import { BaseApi } from '../BaseApi.js';
import { getDataService } from '../../../core/DataService.js';
import { AuthMiddleware } from '../middleware/AuthMiddleware.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * 群组管理API路由
 */
export class GroupManagementApi extends BaseApi {
    constructor(app, authService) {
        super(app);
        this.authService = authService;
        this.dataService = getDataService();
        this.authMiddleware = new AuthMiddleware(authService);
    }

    /**
     * 注册所有群组管理相关API路由
     */
    registerRoutes() {
        // 获取所有群列表（管理员）
        this.get('/api/admin/groups', 
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            async (req, res) => {
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
            }, '获取群列表失败'
        );

        // 清除群统计（管理员）
        this.delete('/api/admin/stats/:groupId',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            async (req, res) => {
                const { groupId } = req.params;
                await this.dataService.clearGroupStats(groupId);
                ApiResponse.success(res, null, '清除成功');
            }, '清除统计失败'
        );
    }
}

