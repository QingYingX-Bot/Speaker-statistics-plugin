import { BaseApi } from './BaseApi.js'
import { ApiResponse } from './utils/ApiResponse.js'
import { TimeUtils } from '../../core/utils/TimeUtils.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 统计数据相关API路由（包含排行榜功能）
 */
export class StatsApi extends BaseApi {

    /**
     * 注册所有统计数据相关API路由
     */
    registerRoutes() {
        // 获取用户统计
        this.get('/api/stats/user/:userId', async (req, res) => {
                const { userId } = req.params
                const { groupId } = req.query
                
                if (!groupId) {
                    return ApiResponse.error(res, '缺少groupId参数', 400)
                }

                const userData = await this.dataService.getUserData(groupId, userId)
                if (!userData) {
                    return ApiResponse.error(res, '用户数据不存在', 404)
                }

                // 获取用户排名
                const userRank = await this.dataService.getUserRankData(userId, groupId, 'total', {})
                
                ApiResponse.success(res, {
                    ...userData,
                    rank: userRank?.rank || null
                })
        }, '获取用户统计失败')

        // 获取群统计
        this.get('/api/stats/group/:groupId', async (req, res) => {
                const { groupId } = req.params
                
                // 获取格式化的群名称
                const groupName = await this.dataService.dbService.getFormattedGroupName(groupId)
                
                // 获取群用户总数
                const userCountResult = await this.dataService.dbService.get(
                    'SELECT COUNT(DISTINCT user_id) as count FROM user_stats WHERE group_id = $1',
                    groupId
                )
                const userCount = parseInt(userCountResult?.count || 0, 10)
                
                // 获取总消息数
                const totalMessagesResult = await this.dataService.dbService.get(
                    'SELECT SUM(total_count) as total FROM user_stats WHERE group_id = $1',
                    groupId
                )
                const totalMessages = parseInt(totalMessagesResult?.total || 0, 10)
                
                // 获取总字数
                const totalWordsResult = await this.dataService.dbService.get(
                    'SELECT SUM(total_words) as total FROM user_stats WHERE group_id = $1',
                    groupId
                )
                const totalWords = parseInt(totalWordsResult?.total || 0, 10)
                
                ApiResponse.success(res, {
                    group_id: groupId,
                    group_name: groupName,
                    user_count: userCount,
                    total_messages: totalMessages,
                    total_words: totalWords
                })
        }, '获取群统计失败')

        // 获取用户所在的所有群列表
        this.get('/api/stats/user/:userId/groups', async (req, res) => {
                const { userId } = req.params
                const groupIds = await this.dataService.dbService.getUserGroups(userId)
                
                // 格式化群信息，获取群名称
                const groups = await Promise.all(groupIds.map(async (groupId) => {
                    const groupName = await this.dataService.dbService.getFormattedGroupName(groupId)
                    return {
                        group_id: groupId,
                        group_name: groupName
                    }
                }))
                
                ApiResponse.success(res, groups)
        }, '获取用户群列表失败')

        // 获取系统版本信息
        this.get('/api/system/version', async (req, res) => {
                try {
                    // 读取 package.json 文件
                    const packagePath = path.resolve(__dirname, '../../../package.json')
                    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
                    
                    ApiResponse.success(res, {
                        name: packageData.name || 'speaker-statistics-plugin',
                        version: packageData.version || '1.0.0',
                        author: packageData.author || '',
                        description: packageData.description || ''
                    })
                } catch (error) {
                    // 如果读取失败，返回默认值
                    ApiResponse.success(res, {
                        name: 'speaker-statistics-plugin',
                        version: '1.0.0',
                        author: '',
                        description: ''
                    })
                }
        }, '获取系统版本信息失败')

        // 获取排行榜（原 RankingApi 功能）
        this.get('/api/rankings/:type/:groupId', async (req, res) => {
                const { type, groupId } = req.params
                const { 
                    limit = 20, 
                    page = 1, 
                    sortBy = 'count', 
                    order = 'desc',
                    search 
                } = req.query
                
                const actualLimit = parseInt(limit, 10)
                const actualPage = parseInt(page, 10)
                const actualOrder = order.toLowerCase() === 'asc' ? 'asc' : 'desc'
                
                // 处理全局查询（groupId为'all'）
                const actualGroupId = groupId === 'all' ? null : groupId
                
                // 获取排行榜数据（获取更多数据以便进行排序和搜索）
                const allRankings = await this.dataService.getRankingData(actualGroupId, type, {
                    limit: 10000, // 获取足够多的数据以便排序和搜索
                    page: 1
                })

                // 搜索过滤
                let filteredRankings = allRankings
                if (search && search.trim()) {
                    const searchLower = search.toLowerCase().trim()
                    filteredRankings = allRankings.filter(item => {
                        const nickname = (item.nickname || '').toLowerCase()
                        const userId = String(item.user_id || '').toLowerCase()
                        return nickname.includes(searchLower) || userId.includes(searchLower)
                    })
                }

                // 排序
                const sortField = sortBy.toLowerCase()
                filteredRankings.sort((a, b) => {
                    let aValue, bValue
                    
                    switch (sortField) {
                        case 'words':
                            aValue = parseInt(a.period_words || 0, 10)
                            bValue = parseInt(b.period_words || 0, 10)
                            break
                        case 'active_days':
                            aValue = parseInt(a.active_days || 0, 10)
                            bValue = parseInt(b.active_days || 0, 10)
                            break
                        case 'continuous_days':
                            aValue = parseInt(a.continuous_days || 0, 10)
                            bValue = parseInt(b.continuous_days || 0, 10)
                            break
                        case 'count':
                        default:
                            aValue = parseInt(a.count || 0, 10)
                            bValue = parseInt(b.count || 0, 10)
                            break
                    }
                    
                    if (actualOrder === 'asc') {
                        return aValue - bValue
                    } else {
                        return bValue - aValue
                    }
                })

                // 分页
                const total = filteredRankings.length
                const startIndex = (actualPage - 1) * actualLimit
                const endIndex = startIndex + actualLimit
                const pagedRankings = filteredRankings.slice(startIndex, endIndex)

                ApiResponse.success(res, {
                    data: pagedRankings,
                    total: total,
                    page: actualPage,
                    limit: actualLimit,
                    totalPages: Math.ceil(total / actualLimit)
                })
        }, '获取排行榜失败')

        // 获取群组时间分布统计
        this.get('/api/stats/group/:groupId/time-distribution', async (req, res) => {
                const { groupId } = req.params
                const { 
                    type = 'hourly', 
                    startDate, 
                    endDate 
                } = req.query
                
                const distribution = await this.dataService.getTimeDistribution(
                    groupId, 
                    type, 
                    { startDate, endDate }
                )
                
                ApiResponse.success(res, distribution)
        }, '获取时间分布统计失败')

        // 获取用户时间分布统计
        this.get('/api/stats/user/:userId/time-distribution', async (req, res) => {
                const { userId } = req.params
                const { 
                    groupId,
                    type = 'hourly', 
                    startDate, 
                    endDate 
                } = req.query
                
                if (!groupId) {
                    return ApiResponse.error(res, '缺少groupId参数', 400)
                }
                
                const distribution = await this.dataService.getUserTimeDistribution(
                    userId,
                    groupId,
                    type,
                    { startDate, endDate }
                )
                
                ApiResponse.success(res, distribution)
        }, '获取用户时间分布统计失败')

        // 获取群组消息趋势
        this.get('/api/stats/group/:groupId/trend', async (req, res) => {
                const { groupId } = req.params
                const { 
                    period = 'daily', 
                    days = 7, 
                    metric = 'messages' 
                } = req.query
                
                const trend = await this.dataService.getGroupTrend(
                    groupId, 
                    period, 
                    { 
                        days: parseInt(days, 10), 
                        metric 
                    }
                )
                
                ApiResponse.success(res, trend)
        }, '获取群组消息趋势失败')

        // 获取用户消息趋势
        this.get('/api/stats/user/:userId/trend', async (req, res) => {
                const { userId } = req.params
                const { 
                    groupId,
                    period = 'daily', 
                    days = 7, 
                    metric = 'messages' 
                } = req.query
                
                if (!groupId) {
                    return ApiResponse.error(res, '缺少groupId参数', 400)
                }
                
                const trend = await this.dataService.getUserTrend(
                    userId,
                    groupId,
                    period,
                    { 
                        days: parseInt(days, 10), 
                        metric 
                    }
                )
                
                ApiResponse.success(res, trend)
        }, '获取用户消息趋势失败')

        // 获取全局统计
        this.get('/api/stats/global', async (req, res) => {
                const { includeGroups = false } = req.query
                const page = parseInt(req.query.page || 1, 10)
                const pageSize = parseInt(req.query.pageSize || 9, 10)
                
                const globalStats = await this.dataService.getGlobalStats(page, pageSize)
                
                // 根据 includeGroups 参数决定是否包含群组列表
                const result = {
                    total_users: globalStats.totalUsers,
                    total_groups: globalStats.totalGroups,
                    total_messages: globalStats.totalMessages,
                    total_words: globalStats.totalWords,
                    today_messages: 0, // 需要从今日统计中计算
                    active_groups_today: 0, // 需要从今日统计中计算
                    new_users_today: 0 // 需要从今日统计中计算
                }

                // 计算今日消息数（从今日的 daily_stats 中统计）
                try {
                    const timeInfo = TimeUtils.getCurrentDateTime()
                    const todayStats = await this.dataService.dbService.all(
                        `SELECT SUM(message_count) as total 
                         FROM daily_stats 
                         WHERE date_key = $1`,
                        timeInfo.formattedDate
                    )
                    result.today_messages = parseInt(todayStats[0]?.total || 0, 10)

                    // 计算今日活跃群组数
                    const activeGroups = await this.dataService.dbService.all(
                        `SELECT COUNT(DISTINCT group_id) as count 
                         FROM daily_stats 
                         WHERE date_key = $1 AND message_count > 0`,
                        timeInfo.formattedDate
                    )
                    result.active_groups_today = parseInt(activeGroups[0]?.count || 0, 10)
                } catch (error) {
                    // 如果计算失败，保持默认值 0
                }

                if (includeGroups === 'true' || includeGroups === true) {
                    result.groups = globalStats.groups
                }

                ApiResponse.success(res, result)
        }, '获取全局统计失败')
    }
}
