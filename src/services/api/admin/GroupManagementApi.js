import { BaseApi } from '../BaseApi.js'
import { getDataService } from '../../../core/DataService.js'
import { AuthMiddleware } from '../middleware/AuthMiddleware.js'
import { ApiResponse } from '../utils/ApiResponse.js'

/**
 * 群组管理API路由
 */
export class GroupManagementApi extends BaseApi {
    constructor(app, authService) {
        super(app)
        this.authService = authService
        this.dataService = getDataService()
        this.authMiddleware = new AuthMiddleware(authService)
    }

    /**
     * 注册所有群组管理相关API路由
     */
    registerRoutes() {
        // 获取所有群列表（管理员）
        this.app.get('/api/admin/groups',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            ApiResponse.asyncHandler(async (req, res) => {
                // 获取所有群ID
                const groupRows = await this.dataService.dbService.all(
                    'SELECT DISTINCT group_id FROM user_stats'
                )
                
                // 格式化群信息
                const groups = await Promise.all(groupRows.map(async (row) => {
                    const groupId = row.group_id
                    const groupName = await this.dataService.dbService.getFormattedGroupName(groupId)
                    return {
                        group_id: groupId,
                        group_name: groupName
                    }
                }))
                
                ApiResponse.success(res, groups)
            }, '获取群列表失败')
        )

        // 清除群统计（管理员）
        this.app.delete('/api/admin/stats/:groupId',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            ApiResponse.asyncHandler(async (req, res) => {
                const { groupId } = req.params
                await this.dataService.clearGroupStats(groupId)
                ApiResponse.success(res, null, '清除成功')
            }, '清除统计失败')
        )

        // 获取归档群组列表（管理员）
        this.app.get('/api/admin/archived-groups',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            ApiResponse.asyncHandler(async (req, res) => {
                const { page = 1, pageSize = 20 } = req.query
                const pageNum = Math.max(1, parseInt(page, 10) || 1)
                const size = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20))

                // 获取归档群组总数
                const totalResult = await this.dataService.dbService.get(
                    'SELECT COUNT(*) as count FROM archived_groups'
                )
                const total = parseInt(totalResult?.count || 0, 10)

                // 获取归档群组列表（分页）
                const archivedGroups = await this.dataService.dbService.all(
                    `SELECT group_id, group_name, archived_at, last_activity_at 
                     FROM archived_groups 
                     ORDER BY archived_at DESC 
                     LIMIT $1 OFFSET $2`,
                    size,
                    (pageNum - 1) * size
                )

                // 格式化返回数据
                const groups = archivedGroups.map(group => ({
                    group_id: group.group_id,
                    group_name: group.group_name || group.group_id,
                    archived_at: group.archived_at,
                    last_activity_at: group.last_activity_at
                }))

                ApiResponse.success(res, {
                    groups,
                    pagination: {
                        page: pageNum,
                        pageSize: size,
                        total,
                        totalPages: Math.ceil(total / size)
                    }
                })
            }, '获取归档群组列表失败')
        )

        // 恢复归档群组（管理员）
        this.app.post('/api/admin/archived-groups/:groupId/restore',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            ApiResponse.asyncHandler(async (req, res) => {
                const { groupId } = req.params
                
                // 检查群组是否已归档
                const isArchived = await this.dataService.isGroupArchived(groupId)
                if (!isArchived) {
                    return ApiResponse.error(res, '群组未归档，无需恢复', 400)
                }

                // 恢复群组
                const success = await this.dataService.restoreGroupStats(groupId)
                if (success) {
                    ApiResponse.success(res, null, '恢复成功')
                } else {
                    ApiResponse.error(res, '恢复失败', 500)
                }
            }, '恢复归档群组失败')
        )

        // 立即删除归档群组（管理员）
        this.app.delete('/api/admin/archived-groups/:groupId',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            ApiResponse.asyncHandler(async (req, res) => {
                const { groupId } = req.params
                
                // 检查群组是否已归档
                const isArchived = await this.dataService.isGroupArchived(groupId)
                if (!isArchived) {
                    return ApiResponse.error(res, '群组未归档，无需删除', 400)
                }

                // 永久删除群组数据（包括归档表中的记录）
                await this.dataService.dbService.deleteGroupData(groupId)
                ApiResponse.success(res, null, '删除成功')
            }, '删除归档群组失败')
        )
    }
}

