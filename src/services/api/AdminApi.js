import { BaseApi } from './BaseApi.js';
import { getDataService } from '../../core/DataService.js';
import { getMessageRecorder } from '../../core/MessageRecorder.js';
import { AuthService } from '../auth/AuthService.js';
import { AuthMiddleware } from './middleware/AuthMiddleware.js';
import { ApiResponse } from './utils/ApiResponse.js';
import { globalConfig } from '../../core/ConfigManager.js';
import { TimeUtils } from '../../core/utils/TimeUtils.js';
import { GroupManagementApi } from './admin/GroupManagementApi.js';
import { UserManagementApi } from './admin/UserManagementApi.js';
import { AchievementManagementApi } from './admin/AchievementManagementApi.js';

/**
 * 管理员相关API路由（核心功能：概览、统计、词云、配置）
 */
export class AdminApi extends BaseApi {
    constructor(app, authService) {
        super(app);
        this.authService = authService;
        this.dataService = getDataService();
        this.authMiddleware = new AuthMiddleware(authService);
        
        // 初始化子模块
        this.groupManagementApi = new GroupManagementApi(app, authService);
        this.userManagementApi = new UserManagementApi(app, authService);
        this.achievementManagementApi = new AchievementManagementApi(app, authService);
    }

    /**
     * 注册所有管理员相关API路由
     */
    registerRoutes() {
        // 注册子模块路由
        this.groupManagementApi.registerRoutes();
        this.userManagementApi.registerRoutes();
        this.achievementManagementApi.registerRoutes();

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

                // 使用 LEFT JOIN 一次性获取群名和统计数据（用于群组活跃度分布和消息密度散点图）
                const groupStats = await this.dataService.dbService.all(`
                    SELECT 
                        us.group_id,
                        COALESCE(gi.group_name, '') as group_name,
                        COUNT(DISTINCT us.user_id) as user_count,
                        SUM(us.total_count) as message_count
                    FROM user_stats us
                    LEFT JOIN group_info gi ON us.group_id = gi.group_id
                    GROUP BY us.group_id, gi.group_name
                    ORDER BY SUM(us.total_count) DESC
                    LIMIT 10
                `);
                
                // 获取所有群组的数据（用于消息密度散点图）
                const allGroupStats = await this.dataService.dbService.all(`
                    SELECT 
                        us.group_id,
                        COALESCE(gi.group_name, '') as group_name,
                        COUNT(DISTINCT us.user_id) as user_count,
                        SUM(us.total_count) as message_count
                    FROM user_stats us
                    LEFT JOIN group_info gi ON us.group_id = gi.group_id
                    GROUP BY us.group_id, gi.group_name
                    HAVING COUNT(DISTINCT us.user_id) > 0 AND SUM(us.total_count) > 0
                    ORDER BY SUM(us.total_count) DESC
                `);
                
                // 格式化所有群组信息
                const formattedAllGroupStats = await Promise.all(allGroupStats.map(async (row) => {
                    const groupName = row.group_name || await this.dataService.dbService.getFormattedGroupName(row.group_id);
                    return {
                        group_id: row.group_id,
                        group_name: groupName,
                        user_count: parseInt(row.user_count || 0, 10),
                        message_count: parseInt(row.message_count || 0, 10)
                    };
                }));

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

                // 获取今日统计（使用 UTC+8 时区，与数据库中 date_key 的生成方式一致）
                const todayUTC8 = TimeUtils.getUTC8Date();
                todayUTC8.setHours(0, 0, 0, 0);
                // date_key 格式为 YYYY-MM-DD（UTC+8）
                const todayDateKey = TimeUtils.formatDate(todayUTC8);
                // 使用 = 精确匹配今天的日期，确保数据一致性
                const todayMessages = await this.dataService.dbService.get(
                    'SELECT SUM(message_count) as total FROM daily_stats WHERE date_key = $1',
                    todayDateKey
                );
                
                // 获取活跃群数（最近7天有消息的群）
                const sevenDaysAgoUTC8 = new Date(todayUTC8);
                sevenDaysAgoUTC8.setDate(sevenDaysAgoUTC8.getDate() - 7);
                const sevenDaysAgoDateKey = TimeUtils.formatDate(sevenDaysAgoUTC8);
                
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
                
                // 确保有7天的数据，缺失的日期补0（使用 UTC+8 时区，与数据库中 date_key 的生成方式一致）
                const dailyStatsMap = new Map(dailyStats.map(item => [item.date, parseInt(item.count || 0, 10)]));
                const completeDailyStats = [];
                for (let i = 6; i >= 0; i--) {
                    const dateUTC8 = new Date(todayUTC8);
                    dateUTC8.setDate(dateUTC8.getDate() - i);
                    const dateKey = TimeUtils.formatDate(dateUTC8);
                    completeDailyStats.push({
                        date: dateUTC8.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
                        count: dailyStatsMap.get(dateKey) || 0
                    });
                }
                
                // 获取今日按小时的消息统计（用于活跃时段分布）
                let hourlyStats = [];
                try {
                    // 优先从消息记录器的历史消息中获取真实的小时分布
                    const messageRecorder = getMessageRecorder(this.dataService);
                    if (messageRecorder && messageRecorder.historicalMessageTexts && messageRecorder.historicalMessageTexts.length > 0) {
                        // 获取今日的消息
                        const now = Date.now();
                        const todayStart = new Date();
                        todayStart.setHours(0, 0, 0, 0);
                        const todayStartTime = todayStart.getTime();
                        
                        // 统计今日各小时的消息数
                        const hourlyCountMap = new Map();
                        for (let hour = 0; hour < 24; hour++) {
                            hourlyCountMap.set(hour, 0);
                        }
                        
                        // 从历史消息中统计
                        for (const msg of messageRecorder.historicalMessageTexts) {
                            if (msg.timestamp >= todayStartTime && msg.timestamp < now) {
                                const msgDate = new Date(msg.timestamp);
                                // 使用本地时间（UTC+8）
                                const hour = msgDate.getHours();
                                const count = hourlyCountMap.get(hour) || 0;
                                hourlyCountMap.set(hour, count + 1);
                            }
                        }
                        
                        // 转换为数组格式
                        hourlyStats = Array.from(hourlyCountMap.entries())
                            .map(([hour, count]) => ({
                                hour: hour,
                                count: count
                            }))
                            .filter(item => item.count > 0);
                    }
                    
                    // 如果历史消息数据不足，使用数据库统计作为补充
                    if (hourlyStats.length === 0 || hourlyStats.reduce((sum, item) => sum + item.count, 0) < 100) {
                        // 从 daily_stats 表获取今日的消息统计
                        const todayDailyStats = await this.dataService.dbService.all(
                            'SELECT SUM(message_count) as total FROM daily_stats WHERE date_key = $1',
                            todayDateKey
                        ).catch(() => []);
                        
                        const todayTotal = todayDailyStats[0]?.total || 0;
                        
                        if (todayTotal > 0) {
                            // 从 user_stats 表获取今日活跃用户的更新时间分布
                            // 使用 updated_at 的小时分布来估算消息分布
                            // 根据数据库类型选择相应的查询语句
                            const dbType = this.dataService.dbService.getDatabaseType();
                            let userHourlyStats = [];
                            
                            if (dbType === 'postgresql') {
                                // PostgreSQL 查询
                                userHourlyStats = await this.dataService.dbService.all(`
                                    SELECT 
                                        EXTRACT(HOUR FROM updated_at AT TIME ZONE 'Asia/Shanghai')::INTEGER as hour,
                                        COUNT(DISTINCT user_id) as user_count
                                    FROM user_stats
                                    WHERE DATE(updated_at AT TIME ZONE 'Asia/Shanghai') = CURRENT_DATE
                                    GROUP BY EXTRACT(HOUR FROM updated_at AT TIME ZONE 'Asia/Shanghai')
                                    ORDER BY hour ASC
                                `).catch(() => []);
                            } else {
                                // SQLite 查询
                                userHourlyStats = await this.dataService.dbService.all(`
                                    SELECT 
                                        CAST(strftime('%H', datetime(updated_at, 'localtime')) AS INTEGER) as hour,
                                        COUNT(DISTINCT user_id) as user_count
                                    FROM user_stats
                                    WHERE date(updated_at) = date('now', 'localtime')
                                    GROUP BY hour
                                    ORDER BY hour ASC
                                `).catch(() => []);
                            }
                            
                            // 如果有用户活跃数据，按用户数比例分配消息
                            if (userHourlyStats.length > 0) {
                                const totalUsers = userHourlyStats.reduce((sum, item) => sum + parseInt(item.user_count || 0, 10), 0);
                                if (totalUsers > 0) {
                                    hourlyStats = userHourlyStats.map(item => {
                                        const userCount = parseInt(item.user_count || 0, 10);
                                        const ratio = userCount / totalUsers;
                                        return {
                                            hour: parseInt(item.hour || 0, 10),
                                            count: Math.round(todayTotal * ratio)
                                        };
                                    });
                                }
                            }
                        }
                    }
                } catch (error) {
                    globalConfig.error('获取每小时统计失败:', error);
                    hourlyStats = [];
                }
                
                // 确保有24小时的数据，缺失的小时补0
                const hourlyStatsMap = new Map(hourlyStats.map(item => [parseInt(item.hour || 0, 10), parseInt(item.count || 0, 10)]));
                const completeHourlyStats = [];
                for (let hour = 0; hour < 24; hour++) {
                    completeHourlyStats.push({
                        hour: hour,
                        count: hourlyStatsMap.get(hour) || 0
                    });
                }
                
                // 获取今日新增用户数（从 user_stats 表的 created_at 字段）
                // 根据数据库类型使用不同的查询方式，使用=精确匹配今天
                let todayNewUsers;
                try {
                    const dbType = this.dataService.dbService.getDatabaseType();
                    if (dbType === 'postgresql') {
                        // PostgreSQL 查询
                        todayNewUsers = await this.dataService.dbService.get(
                            'SELECT COUNT(DISTINCT user_id) as count FROM user_stats WHERE DATE(created_at AT TIME ZONE \'Asia/Shanghai\') = $1',
                            todayDateKey
                        );
                    } else {
                        // SQLite 查询
                        todayNewUsers = await this.dataService.dbService.get(
                            'SELECT COUNT(DISTINCT user_id) as count FROM user_stats WHERE date(created_at, \'localtime\') = $1',
                            todayDateKey
                        );
                    }
                } catch (error) {
                    // 如果失败，使用字符串比较（SQLite datetime 格式）
                    try {
                        const todayStart = `${todayDateKey} 00:00:00`;
                        const todayEnd = `${todayDateKey} 23:59:59`;
                        todayNewUsers = await this.dataService.dbService.get(
                            'SELECT COUNT(DISTINCT user_id) as count FROM user_stats WHERE created_at >= $1 AND created_at <= $2',
                            [todayStart, todayEnd]
                        ).catch(() => ({ count: 0 }));
                    } catch (error2) {
                        todayNewUsers = { count: 0 };
                    }
                }

                // 获取近7天的新增用户趋势（按日期统计新增用户数）
                let newUserStats = [];
                try {
                    // 使用 user_stats 表的 created_at 字段统计每日新增用户数
                    // 根据数据库类型选择相应的查询语句
                    const dbType = this.dataService.dbService.getDatabaseType();
                    
                    if (dbType === 'postgresql') {
                        // PostgreSQL 查询
                        newUserStats = await this.dataService.dbService.all(`
                            SELECT 
                                DATE(created_at AT TIME ZONE 'Asia/Shanghai') as date,
                                COUNT(DISTINCT user_id) as count
                            FROM user_stats
                            WHERE DATE(created_at AT TIME ZONE 'Asia/Shanghai') >= $1
                            GROUP BY DATE(created_at AT TIME ZONE 'Asia/Shanghai')
                            ORDER BY DATE(created_at AT TIME ZONE 'Asia/Shanghai') ASC
                        `, sevenDaysAgoDateKey).catch(() => []);
                    } else {
                        // SQLite 查询
                        newUserStats = await this.dataService.dbService.all(`
                            SELECT 
                                date(created_at, 'localtime') as date,
                                COUNT(DISTINCT user_id) as count
                            FROM user_stats
                            WHERE date(created_at, 'localtime') >= $1
                            GROUP BY date(created_at, 'localtime')
                            ORDER BY date(created_at, 'localtime') ASC
                        `, sevenDaysAgoDateKey).catch(() => []);
                    }
                } catch (error) {
                    globalConfig.error('获取新增用户趋势失败:', error);
                    newUserStats = [];
                }
                
                // 确保有7天的数据，缺失的日期补0（使用 UTC+8 时区，确保数据一致性）
                // 将查询结果转换为标准日期格式的Map（处理可能的日期格式差异）
                const newUserMap = new Map();
                newUserStats.forEach(item => {
                    // 处理日期格式：可能是 'YYYY-MM-DD' 或 Date 对象
                    let dateStr = item.date;
                    if (dateStr instanceof Date) {
                        dateStr = TimeUtils.formatDate(dateStr);
                    } else if (typeof dateStr === 'string') {
                        // 确保日期格式为 YYYY-MM-DD
                        dateStr = dateStr.split('T')[0]; // 处理可能的 datetime 格式
                    }
                    const count = parseInt(item.count || 0, 10);
                    newUserMap.set(dateStr, count);
                });
                
                const completeNewUserStats = [];
                for (let i = 6; i >= 0; i--) {
                    const dateUTC8 = new Date(todayUTC8);
                    dateUTC8.setDate(dateUTC8.getDate() - i);
                    const dateKey = TimeUtils.formatDate(dateUTC8);
                    completeNewUserStats.push({
                        date: dateUTC8.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
                        count: newUserMap.get(dateKey) || 0
                    });
                }
                

                ApiResponse.success(res, {
                    totalGroups: totalGroups?.count || 0,
                    totalUsers: totalUsers?.count || 0,
                    totalMessages: totalMessages?.total || 0,
                    todayMessages: todayMessages?.total || 0,
                    activeGroups: activeGroups?.count || 0,
                    todayNewUsers: todayNewUsers?.count || 0,
                    groupStats: formattedGroupStats,
                    allGroupStats: formattedAllGroupStats, // 所有群组数据，用于消息密度散点图
                    dailyStats: completeDailyStats,
                    hourlyStats: completeHourlyStats,
                    newUserStats: completeNewUserStats // 新增用户趋势数据（近7天）
                });
            }, '获取统计概览失败')
        );

        // 获取统计数据（管理员）- 支持日期范围查询
        this.app.get('/api/admin/statistics',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            ApiResponse.asyncHandler(async (req, res) => {
                const { startDate, endDate } = req.query;
                
                if (!startDate || !endDate) {
                    return ApiResponse.error(res, '缺少日期参数', 400);
                }
                
                // 验证日期格式
                const start = new Date(startDate);
                const end = new Date(endDate);
                if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                    return ApiResponse.error(res, '日期格式错误', 400);
                }
                
                if (start > end) {
                    return ApiResponse.error(res, '开始日期不能大于结束日期', 400);
                }
                
                // 计算日期范围（UTC+8）
                const startUTC8 = new Date(start);
                startUTC8.setHours(0, 0, 0, 0);
                const endUTC8 = new Date(end);
                endUTC8.setHours(23, 59, 59, 999);
                
                const startDateKey = TimeUtils.formatDate(startUTC8);
                const endDateKey = TimeUtils.formatDate(endUTC8);
                
                // 获取日期范围内的统计数据
                const dailyStats = await this.dataService.dbService.all(
                    `SELECT 
                        date_key as date,
                        SUM(message_count) as message_count,
                        SUM(word_count) as word_count,
                        COUNT(DISTINCT user_id) as active_users,
                        COUNT(DISTINCT group_id) as active_groups
                    FROM daily_stats 
                    WHERE date_key >= $1 AND date_key <= $2 
                    GROUP BY date_key 
                    ORDER BY date_key ASC`,
                    startDateKey,
                    endDateKey
                ).catch(() => []);
                
                // 计算总统计
                const totalStats = await this.dataService.dbService.get(
                    `SELECT 
                        SUM(message_count) as total_messages,
                        SUM(word_count) as total_words,
                        COUNT(DISTINCT user_id) as total_active_users,
                        COUNT(DISTINCT group_id) as total_active_groups
                    FROM daily_stats 
                    WHERE date_key >= $1 AND date_key <= $2`,
                    startDateKey,
                    endDateKey
                ).catch(() => ({
                    total_messages: 0,
                    total_words: 0,
                    total_active_users: 0,
                    total_active_groups: 0
                }));
                
                // 获取上一期的统计数据（用于对比）
                const daysDiff = Math.ceil((endUTC8 - startUTC8) / (1000 * 60 * 60 * 24)) + 1;
                const prevStartUTC8 = new Date(startUTC8);
                prevStartUTC8.setDate(prevStartUTC8.getDate() - daysDiff);
                const prevEndUTC8 = new Date(startUTC8);
                prevEndUTC8.setDate(prevEndUTC8.getDate() - 1);
                prevEndUTC8.setHours(23, 59, 59, 999);
                
                const prevStartDateKey = TimeUtils.formatDate(prevStartUTC8);
                const prevEndDateKey = TimeUtils.formatDate(prevEndUTC8);
                
                const prevStats = await this.dataService.dbService.get(
                    `SELECT 
                        SUM(message_count) as total_messages,
                        SUM(word_count) as total_words,
                        COUNT(DISTINCT user_id) as total_active_users,
                        COUNT(DISTINCT group_id) as total_active_groups
                    FROM daily_stats 
                    WHERE date_key >= $1 AND date_key <= $2`,
                    prevStartDateKey,
                    prevEndDateKey
                ).catch(() => ({
                    total_messages: 0,
                    total_words: 0,
                    total_active_users: 0,
                    total_active_groups: 0
                }));
                
                // 计算变化百分比
                const calculateChange = (current, previous) => {
                    if (!previous || previous === 0) return current > 0 ? 100 : 0;
                    return Math.round(((current - previous) / previous) * 100);
                };
                
                // 格式化每日数据
                const formattedDailyStats = dailyStats.map(item => ({
                    date: item.date,
                    message_count: parseInt(item.message_count || 0, 10),
                    word_count: parseInt(item.word_count || 0, 10),
                    active_users: parseInt(item.active_users || 0, 10),
                    active_groups: parseInt(item.active_groups || 0, 10)
                }));
                
                // 生成日期范围内的所有日期（补全缺失日期）
                const allDates = [];
                const dailyStatsMap = new Map(formattedDailyStats.map(item => [item.date, item]));
                const currentDate = new Date(startUTC8);
                while (currentDate <= endUTC8) {
                    const dateKey = TimeUtils.formatDate(currentDate);
                    const stats = dailyStatsMap.get(dateKey) || {
                        date: dateKey,
                        message_count: 0,
                        word_count: 0,
                        active_users: 0,
                        active_groups: 0
                    };
                    allDates.push({
                        ...stats,
                        date_label: currentDate.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
                    });
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                
                // 获取每日消息趋势数据（用于图表）
                const trendData = allDates.map(item => ({
                    date: item.date_label,
                    messages: item.message_count
                }));
                
                // 获取每日活跃用户数据（用于图表）
                const userActivityData = allDates.map(item => ({
                    date: item.date_label,
                    users: item.active_users
                }));
                
                ApiResponse.success(res, {
                    total_messages: parseInt(totalStats?.total_messages || 0, 10),
                    total_words: parseInt(totalStats?.total_words || 0, 10),
                    total_active_users: parseInt(totalStats?.total_active_users || 0, 10),
                    total_active_groups: parseInt(totalStats?.total_active_groups || 0, 10),
                    changes: {
                        messages: calculateChange(
                            parseInt(totalStats?.total_messages || 0, 10),
                            parseInt(prevStats?.total_messages || 0, 10)
                        ),
                        words: calculateChange(
                            parseInt(totalStats?.total_words || 0, 10),
                            parseInt(prevStats?.total_words || 0, 10)
                        ),
                        users: calculateChange(
                            parseInt(totalStats?.total_active_users || 0, 10),
                            parseInt(prevStats?.total_active_users || 0, 10)
                        ),
                        groups: calculateChange(
                            parseInt(totalStats?.total_active_groups || 0, 10),
                            parseInt(prevStats?.total_active_groups || 0, 10)
                        )
                    },
                    daily_data: formattedDailyStats,
                    trend_data: trendData,
                    user_activity_data: userActivityData
                });
            }, '获取统计数据失败')
        );

        // 获取词云数据（管理员）
        this.app.get('/api/admin/wordcloud',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            ApiResponse.asyncHandler(async (req, res) => {
                try {
                    // 获取消息记录器实例
                    const messageRecorder = getMessageRecorder(this.dataService);
                    
                    // 获取所有可用的消息文本
                    const allMessages = this.getAllMessageTexts(messageRecorder);
                    
                    if (allMessages.length === 0) {
                        // 如果没有消息，返回空数组
                        return ApiResponse.success(res, {
                            words: [],
                            updatedAt: new Date().toISOString()
                        });
                    }
                    
                    // 合并所有消息文本
                    const combinedText = allMessages.join(' ');
                    
                    // 进行中文分词和词频统计
                    const wordFreq = this.extractWordFrequency(combinedText);
                    
                    // 转换为词云数据格式，取Top 100
                    const wordCloudData = wordFreq
                        .slice(0, 100)
                        .map(item => ({
                            name: item.word,
                            value: item.count
                        }));
                    
                    ApiResponse.success(res, {
                        words: wordCloudData,
                        updatedAt: new Date().toISOString()
                    });
                } catch (error) {
                    globalConfig.error('获取词云数据失败:', error);
                    // 返回空数据而不是错误，避免前端显示错误
                    ApiResponse.success(res, {
                        words: [],
                        updatedAt: new Date().toISOString()
                    });
                }
            }, '获取词云数据失败')
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
    
    /**
     * 获取所有可用的消息文本（用于词云分析）
     * @param {MessageRecorder} messageRecorder 消息记录器实例
     * @param {number} hours 获取最近多少小时的消息（默认24小时）
     * @returns {Array<string>} 消息文本数组
     */
    getAllMessageTexts(messageRecorder, hours = 24) {
        if (!messageRecorder) {
            return [];
        }
        
        // 优先使用历史消息列表（24小时数据）
        if (messageRecorder.getHistoricalMessageTexts && typeof messageRecorder.getHistoricalMessageTexts === 'function') {
            return messageRecorder.getHistoricalMessageTexts(hours);
        }
        
        // 降级方案：从 recentMessageTexts 获取（1分钟内）
        const messages = [];
        if (messageRecorder.recentMessageTexts) {
            const now = Date.now();
            const timeLimit = now - hours * 60 * 60 * 1000;
            
            for (const [key, data] of messageRecorder.recentMessageTexts.entries()) {
                if (data && data.text && data.timestamp && data.timestamp >= timeLimit) {
                    const text = String(data.text).trim();
                    if (text.length > 0) {
                        messages.push(text);
                    }
                }
            }
        }
        
        return messages;
    }
    
    /**
     * 从文本中提取词频（改进版，更准确的分词）
     * @param {string} text 文本内容
     * @returns {Array<{word: string, count: number}>} 词频数组（按频率降序）
     */
    extractWordFrequency(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }
        
        // 停用词列表（常见的中文停用词和网络用语）
        const stopWords = new Set([
            // 单字停用词
            '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '他', '她', '它', '们',
            // 常见双字停用词
            '一个', '这个', '那个', '什么', '怎么', '为什么', '因为', '所以', '但是', '如果', '然后', '还是', '可以', '应该', '可能', '也许', '大概', '好像', '似乎', '仿佛',
            '已经', '正在', '将要', '曾经', '一直', '总是', '经常', '偶尔', '非常', '特别', '十分', '相当', '比较', '有点', '稍微',
            '或者', '而且', '并且', '同时', '另外', '此外', '因此', '于是', '接着', '最后', '终于',
            '虽然', '然而', '不过', '可是', '只是', '假如', '要是', '只要', '除非', '无论', '不管',
            '为了', '由于', '从而', '关于', '对于', '至于', '等等', '之类', '什么的', '之类的',
            // 语气词和网络用语
            '啊', '呢', '吧', '吗', '呀', '哦', '嗯', '哈', '呵', '唉', '哎', '喂', '嗯嗯', '哈哈', '呵呵', '嘿嘿', '嘻嘻', '嘿嘿', '额', '呃',
            // 无意义词汇
            '图片', '表情', '语音', '视频', '文件', '链接', 'http', 'https', 'www', 'com', 'cn', 'org', 'net',
            // 常见游戏/聊天用语
            '这样', '那样', '这里', '那里', '这时', '那时', '现在', '刚才', '刚才', '刚才'
        ]);
        
        // 改进的分词策略：提取2-4个字符的中文词汇（避免过长的无意义组合）
        // 优先提取2-3字的词汇，4字词汇需要更严格的过滤
        const wordFreqMap = new Map();
        
        // 提取2字词
        const twoCharRegex = /[\u4e00-\u9fa5]{2}/g;
        const twoCharWords = text.match(twoCharRegex) || [];
        for (const word of twoCharWords) {
            if (!stopWords.has(word) && !/^\d+$/.test(word)) {
                const count = wordFreqMap.get(word) || 0;
                wordFreqMap.set(word, count + 1);
            }
        }
        
        // 提取3字词
        const threeCharRegex = /[\u4e00-\u9fa5]{3}/g;
        const threeCharWords = text.match(threeCharRegex) || [];
        for (const word of threeCharWords) {
            if (!stopWords.has(word) && !/^\d+$/.test(word)) {
                // 过滤明显无意义的组合（如：连续重复字符）
                if (word[0] === word[1] && word[1] === word[2]) {
                    continue;
                }
                const count = wordFreqMap.get(word) || 0;
                wordFreqMap.set(word, count + 1);
            }
        }
        
        // 提取4字词（更严格过滤）
        const fourCharRegex = /[\u4e00-\u9fa5]{4}/g;
        const fourCharWords = text.match(fourCharRegex) || [];
        for (const word of fourCharWords) {
            if (!stopWords.has(word) && !/^\d+$/.test(word)) {
                // 过滤明显无意义的组合
                if (word[0] === word[1] && word[2] === word[3]) {
                    continue;
                }
                // 过滤包含停用词的组合
                let hasStopWord = false;
                for (let i = 0; i < word.length - 1; i++) {
                    const subWord = word.substring(i, i + 2);
                    if (stopWords.has(subWord)) {
                        hasStopWord = true;
                        break;
                    }
                }
                if (!hasStopWord) {
                    const count = wordFreqMap.get(word) || 0;
                    wordFreqMap.set(word, count + 1);
                }
            }
        }
        
        // 转换为数组并按频率排序
        const wordFreqArray = Array.from(wordFreqMap.entries())
            .map(([word, count]) => ({ word, count }))
            .sort((a, b) => {
                // 先按频率排序
                if (b.count !== a.count) {
                    return b.count - a.count;
                }
                // 频率相同时，优先短词
                return a.word.length - b.word.length;
            });
        
        return wordFreqArray;
    }
}
