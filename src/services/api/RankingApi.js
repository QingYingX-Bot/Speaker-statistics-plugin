import { getDataService } from '../../core/DataService.js';
import { ApiResponse } from './utils/ApiResponse.js';

/**
 * 排行榜相关API路由
 */
export class RankingApi {
    constructor(app) {
        this.app = app;
        this.dataService = getDataService();
    }

    /**
     * 注册所有排行榜相关API路由
     */
    registerRoutes() {
        // 获取排行榜
        this.app.get('/api/rankings/:type/:groupId',
            ApiResponse.asyncHandler(async (req, res) => {
                const { type, groupId } = req.params;
                const { limit = 20, page = 1 } = req.query;
                const actualLimit = parseInt(limit, 10);
                const actualPage = parseInt(page, 10);
                
                // 处理全局查询（groupId为'all'）
                const actualGroupId = groupId === 'all' ? null : groupId;
                
                const rankings = await this.dataService.getRankingData(actualGroupId, type, {
                    limit: actualLimit,
                    page: actualPage
                });

                ApiResponse.success(res, rankings);
            }, '获取排行榜失败')
        );
    }
}
