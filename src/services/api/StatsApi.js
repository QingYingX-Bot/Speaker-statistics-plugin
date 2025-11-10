import { getDataService } from '../../core/DataService.js';
import { ApiResponse } from './utils/ApiResponse.js';

/**
 * 统计数据相关API路由
 */
export class StatsApi {
    constructor(app) {
        this.app = app;
        this.dataService = getDataService();
    }

    /**
     * 注册所有统计数据相关API路由
     */
    registerRoutes() {
        // 获取用户统计
        this.app.get('/api/stats/user/:userId',
            ApiResponse.asyncHandler(async (req, res) => {
                const { userId } = req.params;
                const { groupId } = req.query;
                
                if (!groupId) {
                    return ApiResponse.error(res, '缺少groupId参数', 400);
                }

                const userData = await this.dataService.getUserData(groupId, userId);
                if (!userData) {
                    return ApiResponse.error(res, '用户数据不存在', 404);
                }

                // 获取用户排名
                const userRank = await this.dataService.getUserRankData(userId, groupId, 'total', {});
                
                ApiResponse.success(res, {
                    ...userData,
                    rank: userRank?.rank || null
                });
            }, '获取用户统计失败')
        );

        // 获取群统计
        this.app.get('/api/stats/group/:groupId',
            ApiResponse.asyncHandler(async (req, res) => {
                const { groupId } = req.params;
                
                // 获取格式化的群名称
                const groupName = await this.dataService.dbService.getFormattedGroupName(groupId);
                
                // 获取群用户总数
                const userCountResult = await this.dataService.dbService.get(
                    'SELECT COUNT(DISTINCT user_id) as count FROM user_stats WHERE group_id = $1',
                    groupId
                );
                const userCount = parseInt(userCountResult?.count || 0, 10);
                
                // 获取总消息数
                const totalMessagesResult = await this.dataService.dbService.get(
                    'SELECT SUM(total_count) as total FROM user_stats WHERE group_id = $1',
                    groupId
                );
                const totalMessages = parseInt(totalMessagesResult?.total || 0, 10);
                
                // 获取总字数
                const totalWordsResult = await this.dataService.dbService.get(
                    'SELECT SUM(total_words) as total FROM user_stats WHERE group_id = $1',
                    groupId
                );
                const totalWords = parseInt(totalWordsResult?.total || 0, 10);
                
                ApiResponse.success(res, {
                    group_id: groupId,
                    group_name: groupName,
                    user_count: userCount,
                    total_messages: totalMessages,
                    total_words: totalWords
                });
            }, '获取群统计失败')
        );

        // 获取用户所在的所有群列表
        this.app.get('/api/stats/user/:userId/groups',
            ApiResponse.asyncHandler(async (req, res) => {
                const { userId } = req.params;
                const groupIds = await this.dataService.dbService.getUserGroups(userId);
                
                // 格式化群信息，获取群名称
                const groups = await Promise.all(groupIds.map(async (groupId) => {
                    const groupName = await this.dataService.dbService.getFormattedGroupName(groupId);
                    return {
                        group_id: groupId,
                        group_name: groupName
                    };
                }));
                
                ApiResponse.success(res, groups);
            }, '获取用户群列表失败')
        );
    }
}
