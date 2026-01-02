import { getDatabaseService } from './database/DatabaseService.js';
import { globalConfig } from './ConfigManager.js';
import { TimeUtils } from './utils/TimeUtils.js';
import { CommonUtils } from './utils/CommonUtils.js';
import { ErrorHandler } from './utils/ErrorHandler.js';

/**
 * LRU 缓存类
 */
class LRUCache {
    constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.cache = new Map();
        this.accessTimes = new Map();
    }

    set(key, value) {
        const now = Date.now();

        // 如果缓存已满，删除最旧的条目
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictOldest();
        }

        this.cache.set(key, {
            value,
            timestamp: now
        });
        this.accessTimes.set(key, now);
    }

    get(key) {
        const now = Date.now();
        const item = this.cache.get(key);

        if (!item) return null;

        // 检查是否过期
        if (now - item.timestamp > this.ttl) {
            this.cache.delete(key);
            this.accessTimes.delete(key);
            return null;
        }

        // 更新访问时间
        this.accessTimes.set(key, now);
        return item.value;
    }

    has(key) {
        return this.get(key) !== null;
    }

    delete(key) {
        this.cache.delete(key);
        this.accessTimes.delete(key);
    }

    evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;

        for (const [key, time] of this.accessTimes) {
            if (time < oldestTime) {
                oldestTime = time;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.accessTimes.delete(oldestKey);
        }
    }

    clear() {
        this.cache.clear();
        this.accessTimes.clear();
    }

    size() {
        return this.cache.size;
    }
}

/**
 * 数据服务类
 * 使用 DatabaseService 进行数据操作，提供统一的数据访问接口
 */
class DataService {
    constructor() {
        this.dbService = getDatabaseService();
        this.cache = new LRUCache(500, 10 * 60 * 1000); // 500个条目，10分钟TTL
        this.groupStatsCache = new LRUCache(200, 30 * 1000); // 群统计缓存，30秒TTL
        this.rankingCache = new LRUCache(50, 2 * 60 * 1000); // 排行榜缓存，2分钟TTL
        this.globalStatsCache = new LRUCache(10, 3 * 60 * 1000); // 全局统计缓存，3分钟TTL
        this.messageRecorder = null; // 消息记录器引用（由外部设置）
        
        // 确保数据库已初始化
        this.initialize();
    }

    /**
     * 设置消息记录器引用（用于获取最新消息文本）
     * @param {MessageRecorder} messageRecorder 消息记录器实例
     */
    setMessageRecorder(messageRecorder) {
        this.messageRecorder = messageRecorder;
    }

    /**
     * 初始化数据库
     */
    async initialize() {
        try {
            await this.dbService.initialize();
        } catch (error) {
            this.error('数据库初始化失败:', error);
            throw error;
        }
    }

    /**
     * 记录调试日志
     * @param {string} message 日志消息
     * @param {any[]} args 额外参数
     */
    debug(message, ...args) {
        globalConfig.debug(`[数据服务] ${message}`, ...args);
    }

    /**
     * 记录错误日志
     * @param {string} message 日志消息
     * @param {any[]} args 额外参数
     */
    error(message, ...args) {
        globalConfig.error(`[数据服务] ${message}`, ...args);
    }


    /**
     * 获取用户数据（带缓存）
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object|null>} 用户数据
     */
    async getUserData(groupId, userId) {
        const cacheKey = `${groupId}_${userId}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached) {
            return cached;
        }

        // 从数据库读取
        const dbStats = await this.dbService.getUserStats(groupId, userId);
        
        if (!dbStats) {
            return null;
        }

        // 转换为兼容格式
        const userData = await this.dbToUserData(dbStats, groupId, userId);
        
        // 存入缓存
        this.cache.set(cacheKey, userData);
        
        return userData;
    }

    /**
     * 保存用户数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {Object} userData 用户数据
     * @param {Object} options 可选参数，用于指定只保存当前时间维度的数据
     */
    async saveUserData(groupId, userId, userData, options = {}) {
        // 保存到数据库
        // 确保所有数值都是数字类型
        await this.dbService.saveUserStats(groupId, userId, {
            nickname: userData.nickname || '',
            total_count: parseInt(userData.total || 0, 10),
            total_words: parseInt(userData.total_number_of_words || 0, 10),
            active_days: parseInt(userData.active_days || 0, 10),
            continuous_days: parseInt(userData.continuous_days || 0, 10),
            last_speaking_time: userData.last_speaking_time || null
        });
        
        // 数据更新后清除相关缓存
        this.clearCache(groupId, userId);

        // 保存时间维度统计数据
        const timeInfo = TimeUtils.getCurrentDateTime();
        
        // 如果指定了 onlyCurrentTime，只保存当前时间维度的数据（优化性能）
        if (options.onlyCurrentTime) {
            // 只保存当前日期的日统计
            const currentDate = timeInfo.formattedDate;
            if (userData.daily_stats && userData.daily_stats[currentDate]) {
                await this.dbService.saveDailyStats(groupId, userId, currentDate, {
                    message_count: parseInt(userData.daily_stats[currentDate].count || 0, 10),
                    word_count: parseInt(userData.daily_stats[currentDate].words || 0, 10)
                });
            }

            // 只保存当前周的周统计
            const currentWeek = timeInfo.weekKey;
            if (userData.weekly_stats && userData.weekly_stats[currentWeek]) {
                await this.dbService.saveWeeklyStats(groupId, userId, currentWeek, {
                    message_count: parseInt(userData.weekly_stats[currentWeek].count || 0, 10),
                    word_count: parseInt(userData.weekly_stats[currentWeek].words || 0, 10)
                });
            }

            // 只保存当前月的月统计
            const currentMonth = timeInfo.monthKey;
            if (userData.monthly_stats && userData.monthly_stats[currentMonth]) {
                await this.dbService.saveMonthlyStats(groupId, userId, currentMonth, {
                    message_count: parseInt(userData.monthly_stats[currentMonth].count || 0, 10),
                    word_count: parseInt(userData.monthly_stats[currentMonth].words || 0, 10)
                });
            }

            // 只保存当前年的年统计
            const currentYear = timeInfo.yearKey;
            if (userData.yearly_stats && userData.yearly_stats[currentYear]) {
                await this.dbService.saveYearlyStats(groupId, userId, currentYear, {
                    message_count: parseInt(userData.yearly_stats[currentYear].count || 0, 10),
                    word_count: parseInt(userData.yearly_stats[currentYear].words || 0, 10)
                });
            }
        } else {
            // 保存所有时间维度的统计数据（完整保存模式）
            // 保存日统计
            if (userData.daily_stats) {
                for (const [dateKey, stats] of Object.entries(userData.daily_stats)) {
                    // 确保是数字类型
                    await this.dbService.saveDailyStats(groupId, userId, dateKey, {
                        message_count: parseInt(stats.count || 0, 10),
                        word_count: parseInt(stats.words || 0, 10)
                    });
                }
            }

            // 保存周统计
            if (userData.weekly_stats) {
                for (const [weekKey, stats] of Object.entries(userData.weekly_stats)) {
                    // 确保是数字类型
                    await this.dbService.saveWeeklyStats(groupId, userId, weekKey, {
                        message_count: parseInt(stats.count || 0, 10),
                        word_count: parseInt(stats.words || 0, 10)
                    });
                }
            }

            // 保存月统计
            if (userData.monthly_stats) {
                for (const [monthKey, stats] of Object.entries(userData.monthly_stats)) {
                    // 确保是数字类型
                    await this.dbService.saveMonthlyStats(groupId, userId, monthKey, {
                        message_count: parseInt(stats.count || 0, 10),
                        word_count: parseInt(stats.words || 0, 10)
                    });
                }
            }

            // 保存年统计
            if (userData.yearly_stats) {
                for (const [yearKey, stats] of Object.entries(userData.yearly_stats)) {
                    // 确保是数字类型
                    await this.dbService.saveYearlyStats(groupId, userId, yearKey, {
                        message_count: parseInt(stats.count || 0, 10),
                        word_count: parseInt(stats.words || 0, 10)
                    });
                }
            }
        }

        // 更新缓存
        const cacheKey = `${groupId}_${userId}`;
        this.cache.set(cacheKey, userData);
        
        // 清除相关缓存
        this.groupStatsCache.delete(String(groupId));
    }

    /**
     * 将数据库格式转换为用户数据格式
     * @param {Object} dbStats 数据库统计数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object>} 用户数据格式
     */
    async dbToUserData(dbStats, groupId, userId) {
        const timeInfo = TimeUtils.getCurrentDateTime();
        
        // 获取时间维度统计数据
        const dailyStats = await this.getDailyStatsForUser(groupId, userId);
        const weeklyStats = await this.getWeeklyStatsForUser(groupId, userId);
        const monthlyStats = await this.getMonthlyStatsForUser(groupId, userId);
        const yearlyStats = await this.getYearlyStatsForUser(groupId, userId);

        // 确保所有数值字段都是数字类型，避免字符串拼接问题
        return {
            user_id: userId,
            nickname: dbStats.nickname || '',
            total: parseInt(dbStats.total_count || 0, 10),
            total_number_of_words: parseInt(dbStats.total_words || 0, 10),
            active_days: parseInt(dbStats.active_days || 0, 10),
            continuous_days: parseInt(dbStats.continuous_days || 0, 10),
            last_speaking_time: dbStats.last_speaking_time || null,
            daily_stats: dailyStats,
            weekly_stats: weeklyStats,
            monthly_stats: monthlyStats,
            yearly_stats: yearlyStats
        };
    }

    /**
     * 获取用户的日统计数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object>} 日统计数据对象
     */
    async getDailyStatsForUser(groupId, userId) {
        // 获取最近30天的数据（UTC+8）
        const now = TimeUtils.getUTC8Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const startDate = TimeUtils.formatDate(thirtyDaysAgo);
        const endDate = TimeUtils.formatDate(now);
        
        const stats = await this.dbService.getDailyStatsByDateRange(groupId, userId, startDate, endDate);
        const result = {};
        
        for (const stat of stats) {
            // 确保转换为数字类型，避免字符串拼接问题
            const messageCount = parseInt(stat.message_count || 0, 10);
            const wordCount = parseInt(stat.word_count || 0, 10);
            
            result[stat.date_key] = {
                count: messageCount,
                words: wordCount
            };
        }
        
        return result;
    }

    /**
     * 获取用户的周统计数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object>} 周统计数据对象
     */
    async getWeeklyStatsForUser(groupId, userId) {
        // 获取最近12周的数据（UTC+8）
        const result = {};
        const now = TimeUtils.getUTC8Date();
        
        for (let i = 0; i < 12; i++) {
            const weekDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
            const weekKey = TimeUtils.getWeekNumber(weekDate);
            
            const stat = await this.dbService.getWeeklyStats(groupId, userId, weekKey);
            if (stat) {
                // 确保转换为数字类型，避免字符串拼接问题
                const messageCount = parseInt(stat.message_count || 0, 10);
                const wordCount = parseInt(stat.word_count || 0, 10);
                
                result[weekKey] = {
                    count: messageCount,
                    words: wordCount
                };
            }
        }
        
        return result;
    }

    /**
     * 获取用户的月统计数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object>} 月统计数据对象
     */
    async getMonthlyStatsForUser(groupId, userId) {
        // 获取最近12个月的数据（UTC+8）
        const result = {};
        const now = TimeUtils.getUTC8Date();
        
        for (let i = 0; i < 12; i++) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = TimeUtils.getMonthString(monthDate);
            
            const stat = await this.dbService.getMonthlyStats(groupId, userId, monthKey);
            if (stat) {
                // 确保转换为数字类型，避免字符串拼接问题
                const messageCount = parseInt(stat.message_count || 0, 10);
                const wordCount = parseInt(stat.word_count || 0, 10);
                
                result[monthKey] = {
                    count: messageCount,
                    words: wordCount
                };
            }
        }
        
        return result;
    }

    /**
     * 获取用户的年统计数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object>} 年统计数据对象
     */
    async getYearlyStatsForUser(groupId, userId) {
        const now = TimeUtils.getUTC8Date();
        const yearKey = now.getFullYear().toString();
        
        const stat = await this.dbService.getYearlyStats(groupId, userId, yearKey);
        
        if (stat) {
            // 确保转换为数字类型，避免字符串拼接问题
            const messageCount = parseInt(stat.message_count || 0, 10);
            const wordCount = parseInt(stat.word_count || 0, 10);
            
            return {
                [yearKey]: {
                    count: messageCount,
                    words: wordCount
                }
            };
        }
        
        return {};
    }

    /**
     * 初始化用户数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} nickname 用户昵称
     * @returns {Object} 用户数据
     */
    initUserData(groupId, userId, nickname) {
        const timeInfo = TimeUtils.getCurrentDateTime();
        return {
            user_id: userId,
            nickname: nickname,
            total: 0,
            last_speaking_time: timeInfo.formattedDateTime,
            active_days: 0,
            continuous_days: 0,
            total_number_of_words: 0,
            daily_stats: {},
            weekly_stats: {},
            monthly_stats: {},
            yearly_stats: {
                [timeInfo.yearKey]: {
                    count: 0,
                    words: 0
                }
            }
        };
    }

    /**
     * 更新用户统计数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} nickname 用户昵称
     * @param {number} wordCount 本次消息字数
     */
    async updateUserStats(groupId, userId, nickname, wordCount = 0, messageTime = null, messageId = null) {
        try {
            const timeInfo = TimeUtils.getCurrentDateTime();

            let userData = await this.getUserData(groupId, userId);
            const isNewUser = !userData;

            if (!userData) {
                userData = this.initUserData(groupId, userId, nickname);
            }

            // 确保 wordCount 是数字类型，避免字符串拼接问题
            const currentWordCount = parseInt(wordCount || 0, 10);
            
            // 更新基础统计
            // 确保是数字类型，避免字符串拼接问题
            const totalCount = parseInt(userData.total || 0, 10);
            const totalWords = parseInt(userData.total_number_of_words || 0, 10);
            const oldTotal = totalCount;
            userData.total = totalCount + 1;
            userData.total_number_of_words = totalWords + currentWordCount;
            if (userData.nickname !== nickname) {
                userData.nickname = nickname;
            }
            userData.last_speaking_time = timeInfo.formattedDateTime;

            // 初始化统计对象
            if (!userData.daily_stats) userData.daily_stats = {};
            if (!userData.weekly_stats) userData.weekly_stats = {};
            if (!userData.monthly_stats) userData.monthly_stats = {};
            if (!userData.yearly_stats) userData.yearly_stats = {};

            // 更新日统计
            if (!userData.daily_stats[timeInfo.formattedDate]) {
                userData.daily_stats[timeInfo.formattedDate] = {
                    count: 0,
                    words: 0
                };
            }
            // 确保 count 和 words 是数字类型，避免字符串拼接问题
            const dailyCount = parseInt(userData.daily_stats[timeInfo.formattedDate].count || 0, 10);
            const dailyWords = parseInt(userData.daily_stats[timeInfo.formattedDate].words || 0, 10);
            userData.daily_stats[timeInfo.formattedDate].count = dailyCount + 1;
            userData.daily_stats[timeInfo.formattedDate].words = dailyWords + currentWordCount;

            // 更新周统计
            const weekKey = timeInfo.weekKey;
            if (!userData.weekly_stats[weekKey]) {
                userData.weekly_stats[weekKey] = {
                    count: 0,
                    words: 0
                };
            }
            // 确保 count 和 words 是数字类型，避免字符串拼接问题
            const weeklyCount = parseInt(userData.weekly_stats[weekKey].count || 0, 10);
            const weeklyWords = parseInt(userData.weekly_stats[weekKey].words || 0, 10);
            userData.weekly_stats[weekKey].count = weeklyCount + 1;
            userData.weekly_stats[weekKey].words = weeklyWords + currentWordCount;

            // 更新月统计
            const monthKey = timeInfo.monthKey;
            if (!userData.monthly_stats[monthKey]) {
                userData.monthly_stats[monthKey] = {
                    count: 0,
                    words: 0
                };
            }
            // 确保 count 和 words 是数字类型，避免字符串拼接问题
            const monthlyCount = parseInt(userData.monthly_stats[monthKey].count || 0, 10);
            const monthlyWords = parseInt(userData.monthly_stats[monthKey].words || 0, 10);
            userData.monthly_stats[monthKey].count = monthlyCount + 1;
            userData.monthly_stats[monthKey].words = monthlyWords + currentWordCount;

            // 更新年统计
            const yearKey = timeInfo.yearKey;
            if (!userData.yearly_stats[yearKey]) {
                userData.yearly_stats[yearKey] = {
                    count: 0,
                    words: 0
                };
            }
            // 确保 count 和 words 是数字类型，避免字符串拼接问题
            const yearlyCount = parseInt(userData.yearly_stats[yearKey].count || 0, 10);
            const yearlyWords = parseInt(userData.yearly_stats[yearKey].words || 0, 10);
            userData.yearly_stats[yearKey].count = yearlyCount + 1;
            userData.yearly_stats[yearKey].words = yearlyWords + currentWordCount;

            // 计算活跃天数
            userData.active_days = Object.keys(userData.daily_stats).length;

            // 计算连续天数
            userData.continuous_days = this.calculateContinuousDays(userData.daily_stats);

            // 保存数据（只保存当前时间维度的数据，优化性能）
            await this.saveUserData(groupId, userId, userData, { onlyCurrentTime: true });
            
            // 输出水群数量增加的日志（使用消息唯一标识进行去重）
            // 生成日志键：优先使用消息ID，如果没有则使用消息时间戳，确保同一消息只输出一次
            let logKey = null;
            if (messageId) {
                // 使用消息ID作为唯一标识（最可靠）
                logKey = `stats_${messageId}`;
            } else if (messageTime) {
                // 如果没有消息ID，使用消息时间戳+群ID+用户ID
                logKey = `stats_${groupId}_${userId}_${messageTime}`;
            } else {
                // 如果都没有，使用群ID+用户ID+新的总数（兼容旧逻辑）
                logKey = `stats_${groupId}_${userId}_${userData.total}_${Date.now()}`;
            }
            
            // 通过messageRecorder记录日志（如果messageRecorder存在且启用了去重）
            // 使用更严格的去重机制：在检查和添加之间确保原子性，防止并发重复
            if (this.messageRecorder && this.messageRecorder.processedLogTimes) {
                // 使用 size 变化判断：先添加，然后通过 size 变化判断是否是我们添加的
                // 这样可以确保原子性，防止并发问题
                const sizeBefore = this.messageRecorder.processedLogTimes.size;
                this.messageRecorder.processedLogTimes.add(logKey);
                const sizeAfter = this.messageRecorder.processedLogTimes.size;
                
                // 如果大小增加了，说明是我们添加的（之前不存在），应该输出日志
                if (sizeAfter > sizeBefore) {
                    // 清理旧的日志键（保留最近200条，避免内存泄漏）
                    if (this.messageRecorder.processedLogTimes.size > 200) {
                        const keysArray = Array.from(this.messageRecorder.processedLogTimes);
                        // 移除最旧的100条
                        keysArray.slice(0, 100).forEach(key => {
                            this.messageRecorder.processedLogTimes.delete(key);
                        });
                    }
                    
                    // 输出日志（统一格式：只输出一次，带颜色）
                    const wordInfo = currentWordCount > 0 ? `，${global.logger.green('字数')}: ${global.logger.cyan(currentWordCount)}` : '';
                    const logMessage = `${global.logger.blue('[发言统计]')} ${global.logger.green(nickname)}(${userId}) 在群 ${groupId} 发言，水群数量: ${global.logger.yellow(oldTotal)} → ${global.logger.yellow(userData.total)}${wordInfo}`;
                    if (globalConfig.getConfig('global.debugLog')) {
                        global.logger.mark(logMessage);
                    }
                }
            }
        } catch (error) {
            this.error(`更新用户统计失败:`, error);
        }
    }

    /**
     * 计算连续天数（使用 TimeUtils 的通用方法）
     * @param {Object} dailyStats 日统计数据
     * @returns {number} 连续天数（最大连续天数）
     */
    calculateContinuousDays(dailyStats) {
        return TimeUtils.calculateContinuousDays(dailyStats, true);
    }

    /**
     * 获取群成员排行榜数据
     * @param {string} groupId 群号
     * @param {string} type 统计类型：'daily'|'weekly'|'monthly'|'yearly'|'total'
     * @param {Object} options 选项 { monthKey, limit }
     * @returns {Promise<Array>} 排行榜数据
     */
    async getRankingData(groupId, type = 'total', options = {}) {
        const timeInfo = TimeUtils.getCurrentDateTime();
        const limit = options.limit || 20;

        try {
            switch (type) {
                case 'total':
                    // 总榜：所有群聊所有时间的数据
                    // 如果 groupId 为 null 或 'all'，查询所有群聊；否则查询当前群聊
                    const queryAllGroups = !groupId || groupId === 'all';
                    
                    // 使用缓存优化总榜查询（仅对全局总榜使用缓存）
                    if (queryAllGroups) {
                        const cacheKey = `ranking:total:all:${limit}`;
                        const cached = this.rankingCache.get(cacheKey);
                        if (cached) {
                            return cached;
                        }
                    }
                    
                    let topUsers;
                    if (queryAllGroups) {
                        // 全局总榜：已排除归档群组
                        topUsers = await this.dbService.getTopUsersAllGroups(limit, 'total_count');
                    } else {
                        // 单群总榜：检查群组是否已归档
                        const isArchived = await this.dbService.isGroupArchived(groupId);
                        if (isArchived) {
                            return []; // 已归档的群组不显示排行榜
                        }
                        topUsers = await this.dbService.getTopUsers(groupId, limit, 'total_count');
                    }
                    
                    const result = topUsers.map(user => ({
                        user_id: user.user_id,
                        nickname: user.nickname,
                        count: parseInt(user.total_count || 0, 10),
                        period_words: parseInt(user.total_words || 0, 10),
                        active_days: parseInt(user.active_days || 0, 10),
                        continuous_days: parseInt(user.continuous_days || 0, 10),
                        last_speaking_time: user.last_speaking_time || null
                    }));
                    
                    // 缓存全局总榜结果
                    if (queryAllGroups) {
                        const cacheKey = `ranking:total:all:${limit}`;
                        this.rankingCache.set(cacheKey, result);
                    }
                    
                    return result;

                case 'daily':
                    // 日榜：使用批量查询优化性能（针对当前群聊，无需检查归档）
                    const todayDate = timeInfo.formattedDate;
                    const dailyStats = await this.dbService.getDailyStatsByGroupAndDate(groupId, todayDate);
                    
                    return dailyStats.slice(0, limit).map(stat => ({
                        user_id: stat.user_id,
                        nickname: stat.nickname || stat.user_id,
                        count: parseInt(stat.message_count || 0, 10),
                        period_words: parseInt(stat.word_count || 0, 10),
                        last_speaking_time: stat.last_speaking_time || null
                    }));

                case 'weekly':
                    // 周榜：使用批量查询优化性能（针对当前群聊，无需检查归档）
                    const weekKey = timeInfo.weekKey;
                    const weeklyStats = await this.dbService.getWeeklyStatsByGroupAndWeek(groupId, weekKey);
                    
                    return weeklyStats.slice(0, limit).map(stat => ({
                        user_id: stat.user_id,
                        nickname: stat.nickname || stat.user_id,
                        count: parseInt(stat.message_count || 0, 10),
                        period_words: parseInt(stat.word_count || 0, 10),
                        last_speaking_time: stat.last_speaking_time || null
                    }));

                case 'monthly':
                    // 月榜：使用批量查询优化性能（针对当前群聊，无需检查归档）
                    if (!groupId) {
                        // 如果没有群ID，返回空数组
                        return [];
                    }
                    const monthKey = options.monthKey || timeInfo.monthKey;
                    // 确保月份键格式正确：YYYY-MM
                    const validMonthKey = monthKey.match(/^\d{4}-\d{2}$/) ? monthKey : timeInfo.monthKey;
                    const monthlyStats = await this.dbService.getMonthlyStatsByGroupAndMonth(groupId, validMonthKey);
                    
                    return monthlyStats.slice(0, limit).map(stat => ({
                        user_id: stat.user_id,
                        nickname: stat.nickname || stat.user_id,
                        count: parseInt(stat.message_count || 0, 10),
                        period_words: parseInt(stat.word_count || 0, 10),
                        last_speaking_time: stat.last_speaking_time || null
                    }));

                case 'yearly':
                    // 年榜：使用批量查询优化性能（针对当前群聊，无需检查归档）
                    const yearKey = timeInfo.yearKey;
                    const yearlyStats = await this.dbService.getYearlyStatsByGroupAndYear(groupId, yearKey);
                    
                    return yearlyStats.slice(0, limit).map(stat => ({
                        user_id: stat.user_id,
                        nickname: stat.nickname || stat.user_id,
                        count: parseInt(stat.message_count || 0, 10),
                        period_words: parseInt(stat.word_count || 0, 10),
                        last_speaking_time: stat.last_speaking_time || null
                    }));

                default:
                    return [];
            }
        } catch (error) {
            this.error(`获取排行榜数据失败 (${type}):`, error);
            return [];
        }
    }

    /**
     * 获取用户个人排名数据（用于显示个人卡片）
     * @param {string} userId 用户ID
     * @param {string} groupId 群号（总榜时可为null）
     * @param {string} type 统计类型：'daily'|'weekly'|'monthly'|'yearly'|'total'
     * @param {Object} options 选项 { monthKey }
     * @returns {Promise<Object|null>} 用户排名数据 { user_id, nickname, count, period_words, active_days, continuous_days, last_speaking_time, rank }
     */
    async getUserRankData(userId, groupId, type = 'total', options = {}) {
        const timeInfo = TimeUtils.getCurrentDateTime();
        
        try {
            switch (type) {
                case 'total':
                    // 总榜：查询所有群聊的数据
                    const queryAllGroups = !groupId || groupId === 'all';
                    if (queryAllGroups) {
                        // 查询所有群聊：获取所有用户数据并计算排名
                        // 使用 getTopUsersAllGroups 方法，它已经修复了 active_days 的计算
                        const allUsers = await this.dbService.getTopUsersAllGroups(999999, 'total_count');
                        
                        // 找到用户并计算排名
                        const userIndex = allUsers.findIndex(u => String(u.user_id) === String(userId));
                        if (userIndex === -1) return null;
                        
                        const user = allUsers[userIndex];
                        return {
                            user_id: user.user_id,
                            nickname: user.nickname,
                            count: parseInt(user.total_count || 0, 10),
                            period_words: parseInt(user.total_words || 0, 10),
                            active_days: parseInt(user.active_days || 0, 10),
                            continuous_days: parseInt(user.continuous_days || 0, 10),
                            last_speaking_time: user.last_speaking_time || null,
                            rank: userIndex + 1
                        };
                    } else {
                        // 查询单个群聊：先检查群组是否已归档
                        const isArchived = await this.dbService.isGroupArchived(groupId);
                        if (isArchived) {
                            return null; // 已归档的群组不显示用户排名
                        }
                        
                        // 使用 getTopUsers 优化性能（已排序）
                        const userStats = await this.dbService.getUserStats(groupId, userId);
                        if (!userStats || !userStats.total_count || userStats.total_count === 0) {
                            return null;
                        }
                        
                        // 获取所有用户（已按 total_count DESC 排序）以计算排名
                        // 使用较大的 limit 确保包含所有用户
                        const allUsers = await this.dbService.getTopUsers(groupId, 999999, 'total_count');
                        const userIndex = allUsers.findIndex(u => String(u.user_id) === String(userId));
                        
                        return {
                            user_id: userStats.user_id,
                            nickname: userStats.nickname,
                            count: parseInt(userStats.total_count || 0, 10),
                            period_words: parseInt(userStats.total_words || 0, 10),
                            active_days: parseInt(userStats.active_days || 0, 10),
                            continuous_days: parseInt(userStats.continuous_days || 0, 10),
                            last_speaking_time: userStats.last_speaking_time || null,
                            rank: userIndex !== -1 ? userIndex + 1 : null
                        };
                    }

                case 'daily':
                    // 日榜：使用批量查询优化性能（针对当前群聊，无需检查归档）
                    if (!groupId) return null;
                    const todayDate = timeInfo.formattedDate;
                    const dailyStats = await this.dbService.getDailyStatsByGroupAndDate(groupId, todayDate);
                    
                    // 查找用户数据
                    const userDailyStat = dailyStats.find(s => String(s.user_id) === String(userId));
                    if (!userDailyStat) {
                        return null;
                    }
                    
                    // 计算排名（数据已按 count DESC 排序）
                    const dailyUserIndex = dailyStats.findIndex(s => String(s.user_id) === String(userId));
                    
                    // 获取用户基本信息
                    const userStats = await this.dbService.getUserStats(groupId, userId);
                    return {
                        user_id: userId,
                        nickname: userDailyStat.nickname || userStats?.nickname || '未知',
                        count: parseInt(userDailyStat.message_count || 0, 10),
                        period_words: parseInt(userDailyStat.word_count || 0, 10),
                        active_days: userStats?.active_days || 0,
                        continuous_days: userStats?.continuous_days || 0,
                        last_speaking_time: userDailyStat.last_speaking_time || userStats?.last_speaking_time || null,
                        rank: dailyUserIndex !== -1 ? dailyUserIndex + 1 : null
                    };

                case 'weekly':
                    // 周榜：使用批量查询优化性能（针对当前群聊，无需检查归档）
                    if (!groupId) return null;
                    const weekKey = timeInfo.weekKey;
                    const weeklyStats = await this.dbService.getWeeklyStatsByGroupAndWeek(groupId, weekKey);
                    
                    // 查找用户数据
                    const userWeeklyStat = weeklyStats.find(s => String(s.user_id) === String(userId));
                    if (!userWeeklyStat) {
                        return null;
                    }
                    
                    // 计算排名（数据已按 count DESC 排序）
                    const weeklyUserIndex = weeklyStats.findIndex(s => String(s.user_id) === String(userId));
                    
                    // 获取用户基本信息
                    const weeklyUserStats = await this.dbService.getUserStats(groupId, userId);
                    return {
                        user_id: userId,
                        nickname: userWeeklyStat.nickname || weeklyUserStats?.nickname || '未知',
                        count: parseInt(userWeeklyStat.message_count || 0, 10),
                        period_words: parseInt(userWeeklyStat.word_count || 0, 10),
                        active_days: weeklyUserStats?.active_days || 0,
                        continuous_days: weeklyUserStats?.continuous_days || 0,
                        last_speaking_time: userWeeklyStat.last_speaking_time || weeklyUserStats?.last_speaking_time || null,
                        rank: weeklyUserIndex !== -1 ? weeklyUserIndex + 1 : null
                    };

                case 'monthly':
                    // 月榜：使用批量查询优化性能（针对当前群聊，无需检查归档）
                    if (!groupId) return null;
                    const monthKey = options.monthKey || timeInfo.monthKey;
                    const validMonthKey = monthKey.match(/^\d{4}-\d{2}$/) ? monthKey : timeInfo.monthKey;
                    const monthlyStats = await this.dbService.getMonthlyStatsByGroupAndMonth(groupId, validMonthKey);
                    
                    // 查找用户数据
                    const userMonthlyStat = monthlyStats.find(s => String(s.user_id) === String(userId));
                    if (!userMonthlyStat) {
                        return null;
                    }
                    
                    // 计算排名（数据已按 count DESC 排序）
                    const monthlyUserIndex = monthlyStats.findIndex(s => String(s.user_id) === String(userId));
                    
                    // 获取用户基本信息
                    const monthlyUserStats = await this.dbService.getUserStats(groupId, userId);
                    return {
                        user_id: userId,
                        nickname: userMonthlyStat.nickname || monthlyUserStats?.nickname || '未知',
                        count: parseInt(userMonthlyStat.message_count || 0, 10),
                        period_words: parseInt(userMonthlyStat.word_count || 0, 10),
                        active_days: monthlyUserStats?.active_days || 0,
                        continuous_days: monthlyUserStats?.continuous_days || 0,
                        last_speaking_time: userMonthlyStat.last_speaking_time || monthlyUserStats?.last_speaking_time || null,
                        rank: monthlyUserIndex !== -1 ? monthlyUserIndex + 1 : null
                    };

                case 'yearly':
                    // 年榜：使用批量查询优化性能（针对当前群聊，无需检查归档）
                    if (!groupId) return null;
                    const yearKey = timeInfo.yearKey;
                    const yearlyStats = await this.dbService.getYearlyStatsByGroupAndYear(groupId, yearKey);
                    
                    // 查找用户数据
                    const userYearlyStat = yearlyStats.find(s => String(s.user_id) === String(userId));
                    if (!userYearlyStat) {
                        return null;
                    }
                    
                    // 计算排名（数据已按 count DESC 排序）
                    const yearlyUserIndex = yearlyStats.findIndex(s => String(s.user_id) === String(userId));
                    
                    // 获取用户基本信息
                    const yearlyUserStats = await this.dbService.getUserStats(groupId, userId);
                    return {
                        user_id: userId,
                        nickname: userYearlyStat.nickname || yearlyUserStats?.nickname || '未知',
                        count: parseInt(userYearlyStat.message_count || 0, 10),
                        period_words: parseInt(userYearlyStat.word_count || 0, 10),
                        active_days: yearlyUserStats?.active_days || 0,
                        continuous_days: yearlyUserStats?.continuous_days || 0,
                        last_speaking_time: userYearlyStat.last_speaking_time || yearlyUserStats?.last_speaking_time || null,
                        rank: yearlyUserIndex !== -1 ? yearlyUserIndex + 1 : null
                    };

                default:
                    return null;
            }
        } catch (error) {
            this.error(`获取用户排名数据失败 (${type}):`, error);
            return null;
        }
    }

    /**
     * 获取所有群组ID列表
     * @returns {Promise<Array<string>>} 群ID数组
     */
    async getGroupIds() {
        try {
            return await this.dbService.getAllGroupIds();
        } catch (error) {
            this.error('获取群组列表失败:', error);
            return [];
        }
    }

    /**
     * 获取全局统计数据
     * @param {number} page 页码（从1开始）
     * @param {number} pageSize 每页显示的群组数量
     * @returns {Promise<Object>} 全局统计数据
     */
    async getGlobalStats(page = 1, pageSize = 9) {
        try {
            // 使用缓存优化全局统计查询
            const cacheKey = `globalStats:${page}:${pageSize}`;
            const cached = this.globalStatsCache.get(cacheKey);
            if (cached) {
                return cached;
            }
            
            const timeInfo = TimeUtils.getCurrentDateTime();
            const todayKey = timeInfo.formattedDate;
            const monthKey = timeInfo.monthKey;

            // 优化：使用批量查询替代 N+1 查询，大幅提升性能
            const [allUsersMap, allDailyStatsMap, allMonthlyStatsMap, allGroupIds, allGroupsInfoMap, archivedGroupsCount, archivedGroupIds, totalMessagesResult, totalWordsResult] = await Promise.all([
                this.dbService.getAllGroupsUsersBatch(),
                this.dbService.getAllGroupsDailyStatsBatch(todayKey),
                this.dbService.getAllGroupsMonthlyStatsBatch(monthKey),
                this.getGroupIds(),
                this.dbService.getAllGroupsInfoBatch(),
                // 获取归档群组数量
                this.dbService.get('SELECT COUNT(*) as count FROM archived_groups').then(result => parseInt(result?.count || 0, 10)).catch(() => 0),
                // 获取已归档的群组ID列表（用于排除）
                this.dbService.all('SELECT group_id FROM archived_groups').then(groups => new Set(groups.map(g => String(g.group_id)))).catch(() => new Set()),
                // 统计所有消息总数（排除归档群组，按用户聚合，与 getTopUsersAllGroups 逻辑保持一致）
                // 注意：必须按用户聚合，因为 getTopUsersAllGroups 也是按用户聚合的
                // 这样才能确保总数与排行榜中显示的用户数据一致
                this.dbService.get(`
                    SELECT SUM(total_count) as total 
                    FROM (
                        SELECT user_id, SUM(total_count) as total_count
                        FROM user_stats
                        WHERE group_id NOT IN (SELECT group_id FROM archived_groups)
                        GROUP BY user_id
                    ) as user_aggregated
                `).then(result => parseInt(result?.total || 0, 10)).catch(() => 0),
                // 统计所有字数总数（排除归档群组，按用户聚合，与 getTopUsersAllGroups 逻辑保持一致）
                this.dbService.get(`
                    SELECT SUM(total_words) as total 
                    FROM (
                        SELECT user_id, SUM(total_words) as total_words
                        FROM user_stats
                        WHERE group_id NOT IN (SELECT group_id FROM archived_groups)
                        GROUP BY user_id
                    ) as user_aggregated
                `).then(result => parseInt(result?.total || 0, 10)).catch(() => 0)
            ]);
            
            // 创建已归档群组ID的Set，用于快速查找
            const archivedGroupIdsSet = archivedGroupIds || new Set();
            
            let totalGroups = 0;
            let totalUsersSet = new Set(); // 使用 Set 来避免重复计算用户
            // 使用直接查询的结果，避免重复计算跨群用户
            let totalMessages = totalMessagesResult || 0;
            let totalWords = totalWordsResult || 0;
            let todayActiveSet = new Set();
            let monthActive = new Set();

            const groupStatsList = [];

            // 遍历所有群组，计算统计数据（使用批量查询结果），排除已归档的群组
            for (const groupId of allGroupIds) {
                // 跳过已归档的群组
                if (archivedGroupIdsSet.has(String(groupId))) {
                    continue;
                }
                try {
                    const users = allUsersMap.get(groupId) || [];
                    if (users.length === 0) continue;

                    totalGroups++;
                    // 将所有用户ID添加到 Set 中（自动去重）
                    for (const user of users) {
                        totalUsersSet.add(user.user_id);
                    }

                    let groupMessages = 0;
                    let groupWords = 0;

                    // 从批量查询结果中获取统计数据
                    const dailyStatsList = allDailyStatsMap.get(groupId) || [];
                    const monthlyStatsList = allMonthlyStatsMap.get(groupId) || [];
                    
                    // 创建统计数据的 Map 以便快速查找
                    const dailyStatsMap = new Map(dailyStatsList.map(s => [s.user_id, s]));
                    const monthlyStatsMap = new Map(monthlyStatsList.map(s => [s.user_id, s]));

                    for (const user of users) {
                        const msgCount = parseInt(user.total_count || 0, 10);
                        const wordCount = parseInt(user.total_words || 0, 10);
                        groupMessages += msgCount;
                        groupWords += wordCount;

                        // 检查今日活跃（从批量查询结果中获取）
                        const dailyStat = dailyStatsMap.get(user.user_id);
                        if (dailyStat && parseInt(dailyStat.message_count || 0, 10) > 0) {
                            todayActiveSet.add(`${groupId}_${user.user_id}`);
                        }

                        // 检查本月活跃（从批量查询结果中获取）
                        const monthlyStat = monthlyStatsMap.get(user.user_id);
                        if (monthlyStat && parseInt(monthlyStat.message_count || 0, 10) > 0) {
                            monthActive.add(`${groupId}_${user.user_id}`);
                        }
                    }

                    // 注意：不再累加到 totalMessages 和 totalWords，因为已经通过 SQL 直接统计了

                    // 计算群组的今日和本月活跃（使用已查询的数据）
                    const groupTodayActive = dailyStatsList.length;
                    const groupMonthActive = monthlyStatsList.length;

                    // 从批量查询结果中获取群名称（优化：避免 N+1 查询）
                    let groupName = allGroupsInfoMap.get(groupId);
                    
                    // 如果数据库中没有，尝试从Bot.gl获取
                    if (!groupName && typeof Bot !== 'undefined' && Bot.gl) {
                        const botGroupInfo = Bot.gl.get(groupId);
                        if (botGroupInfo && botGroupInfo.group_name) {
                            groupName = botGroupInfo.group_name;
                            // 保存到数据库（异步，不阻塞）
                            this.dbService.saveGroupInfo(groupId, groupName)
                                .catch(ErrorHandler.createNonCriticalHandler('数据服务-保存群信息'));
                            // 更新内存中的映射，避免后续重复查询
                            allGroupsInfoMap.set(groupId, groupName);
                        }
                    }
                    
                    // 如果还是没有，使用默认值
                    if (!groupName) {
                        groupName = `群${groupId}`;
                    }

                    groupStatsList.push({
                        groupId: groupId,
                        groupName: groupName,
                        userCount: users.length,
                        totalMessages: groupMessages,
                        totalWords: groupWords,
                        todayActive: groupTodayActive,
                        monthActive: groupMonthActive
                    });
                } catch (error) {
                    this.error(`获取群组 ${groupId} 统计数据失败:`, error);
                }
            }

            // 按消息数排序
            groupStatsList.sort((a, b) => b.totalMessages - a.totalMessages);

            // 分页
            const totalPages = Math.ceil(groupStatsList.length / pageSize);
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const pagedGroups = groupStatsList.slice(startIndex, endIndex);

            // 获取最早统计时间
            let earliestTime = null;
            let statsDurationHours = 0;
            try {
                const earliestResult = await this.dbService.get(
                    'SELECT MIN(created_at) as earliest_time FROM user_stats'
                );
                earliestTime = earliestResult?.earliest_time || null;
                
                // 计算统计时长（小时）
                if (earliestTime) {
                    const earliestDate = new Date(earliestTime);
                    const now = new Date();
                    const diffMs = now - earliestDate;
                    statsDurationHours = Math.floor(diffMs / (1000 * 60 * 60)); // 转换为小时并向下取整
                }
            } catch (error) {
                this.error('获取最早统计时间失败:', error);
            }

            const result = {
                totalGroups: totalGroups,
                totalUsers: totalUsersSet.size, // 使用 Set 的大小作为唯一用户数
                totalMessages: totalMessages,
                totalWords: totalWords,
                todayActive: todayActiveSet.size,
                monthActive: monthActive.size,
                archivedGroups: archivedGroupsCount, // 归档群组数量
                groups: pagedGroups,
                currentPage: page,
                totalPages: totalPages,
                pageSize: pageSize,
                earliestTime: earliestTime,
                statsDurationHours: statsDurationHours
            };
            
            // 缓存结果
            this.globalStatsCache.set(cacheKey, result);
            
            return result;
        } catch (error) {
            this.error('获取全局统计数据失败:', error);
            return {
                totalGroups: 0,
                totalUsers: 0,
                totalMessages: 0,
                totalWords: 0,
                todayActive: 0,
                monthActive: 0,
                archivedGroups: 0,
                groups: [],
                currentPage: 1,
                totalPages: 0,
                pageSize: pageSize
            };
        }
    }

    /**
     * 获取群组时间分布统计
     * @param {string} groupId 群组ID
     * @param {string} type 统计类型：'hourly' | 'daily' | 'weekly' | 'monthly'
     * @param {Object} options 选项 { startDate, endDate }
     * @returns {Promise<Array>} 时间分布数据
     */
    async getTimeDistribution(groupId, type = 'hourly', options = {}) {
        try {
            const now = TimeUtils.getUTC8Date();
            let startDate = options.startDate;
            let endDate = options.endDate || TimeUtils.formatDate(now);

            // 如果没有指定开始日期，默认最近7天
            if (!startDate) {
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                startDate = TimeUtils.formatDate(sevenDaysAgo);
            }

            const result = [];

            switch (type) {
                case 'daily':
                    // 按日统计：查询日期范围内的日统计数据
                    const dailyStats = await this.dbService.all(
                        `SELECT date_key as date, 
                                SUM(message_count) as message_count, 
                                SUM(word_count) as word_count
                         FROM daily_stats 
                         WHERE group_id = $1 AND date_key >= $2 AND date_key <= $3
                         GROUP BY date_key 
                         ORDER BY date_key`,
                        groupId,
                        startDate,
                        endDate
                    );

                    for (const stat of dailyStats) {
                        result.push({
                            date: stat.date,
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        });
                    }
                    break;

                case 'weekly':
                    // 按周统计：查询日期范围内的周统计数据
                    // 计算日期范围对应的周范围（简化处理：获取最近12周）
                    const weeklyStats = await this.dbService.all(
                        `SELECT week_key as date, 
                                SUM(message_count) as message_count, 
                                SUM(word_count) as word_count
                         FROM weekly_stats 
                         WHERE group_id = $1 
                         GROUP BY week_key 
                         ORDER BY week_key DESC
                         LIMIT 12`,
                        groupId
                    );

                    for (const stat of weeklyStats) {
                        result.push({
                            date: stat.date,
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        });
                    }
                    break;

                case 'monthly':
                    // 按月统计：查询日期范围内的月统计数据
                    // 限制返回最近12个月的数据
                    const monthlyStats = await this.dbService.all(
                        `SELECT month_key as date, 
                                SUM(message_count) as message_count, 
                                SUM(word_count) as word_count
                         FROM monthly_stats 
                         WHERE group_id = $1 
                         GROUP BY month_key 
                         ORDER BY month_key DESC
                         LIMIT 12`,
                        groupId
                    );

                    for (const stat of monthlyStats) {
                        result.push({
                            date: stat.date,
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        });
                    }
                    break;

                case 'hourly':
                default:
                    // 按小时统计：由于 daily_stats 表没有小时级别数据，返回按日统计的数据
                    // 注意：hourly 类型实际上返回的是 daily 数据，因为数据库中没有小时级别数据
                    const hourlyStats = await this.dbService.all(
                        `SELECT date_key as date, 
                                SUM(message_count) as message_count, 
                                SUM(word_count) as word_count
                         FROM daily_stats 
                         WHERE group_id = $1 AND date_key >= $2 AND date_key <= $3
                         GROUP BY date_key 
                         ORDER BY date_key`,
                        groupId,
                        startDate,
                        endDate
                    );

                    for (const stat of hourlyStats) {
                        result.push({
                            date: stat.date,
                            hour: null, // 由于没有小时数据，设为 null
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        });
                    }
                    break;
            }

            return result;
        } catch (error) {
            this.error(`获取群组时间分布统计失败:`, error);
            return [];
        }
    }

    /**
     * 获取用户时间分布统计
     * @param {string} userId 用户ID
     * @param {string} groupId 群组ID
     * @param {string} type 统计类型：'hourly' | 'daily' | 'weekly' | 'monthly'
     * @param {Object} options 选项 { startDate, endDate }
     * @returns {Promise<Array>} 时间分布数据
     */
    async getUserTimeDistribution(userId, groupId, type = 'hourly', options = {}) {
        try {
            const now = TimeUtils.getUTC8Date();
            let startDate = options.startDate;
            let endDate = options.endDate || TimeUtils.formatDate(now);

            // 如果没有指定开始日期，默认最近7天
            if (!startDate) {
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                startDate = TimeUtils.formatDate(sevenDaysAgo);
            }

            const result = [];

            switch (type) {
                case 'daily':
                    // 按日统计：查询用户的日统计数据
                    const dailyStats = await this.dbService.getDailyStatsByDateRange(
                        groupId,
                        userId,
                        startDate,
                        endDate
                    );

                    for (const stat of dailyStats) {
                        result.push({
                            date: stat.date_key,
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        });
                    }
                    break;

                case 'weekly':
                    // 按周统计：查询用户的周统计数据
                    // 限制返回最近12周的数据
                    const weeklyStats = await this.dbService.all(
                        `SELECT week_key as date, 
                                message_count, 
                                word_count
                         FROM weekly_stats 
                         WHERE group_id = $1 AND user_id = $2
                         ORDER BY week_key DESC
                         LIMIT 12`,
                        groupId,
                        userId
                    );

                    for (const stat of weeklyStats) {
                        result.push({
                            date: stat.date,
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        });
                    }
                    break;

                case 'monthly':
                    // 按月统计：查询用户的月统计数据
                    // 限制返回最近12个月的数据
                    const monthlyStats = await this.dbService.all(
                        `SELECT month_key as date, 
                                message_count, 
                                word_count
                         FROM monthly_stats 
                         WHERE group_id = $1 AND user_id = $2
                         ORDER BY month_key DESC
                         LIMIT 12`,
                        groupId,
                        userId
                    );

                    for (const stat of monthlyStats) {
                        result.push({
                            date: stat.date,
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        });
                    }
                    break;

                case 'hourly':
                default:
                    // 按小时统计：由于 daily_stats 表没有小时级别数据，返回按日统计的数据
                    const hourlyStats = await this.dbService.getDailyStatsByDateRange(
                        groupId,
                        userId,
                        startDate,
                        endDate
                    );

                    for (const stat of hourlyStats) {
                        result.push({
                            date: stat.date_key,
                            hour: null, // 由于没有小时数据，设为 null
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        });
                    }
                    break;
            }

            return result;
        } catch (error) {
            this.error(`获取用户时间分布统计失败:`, error);
            return [];
        }
    }

    /**
     * 获取群组消息趋势
     * @param {string} groupId 群组ID
     * @param {string} period 统计周期：'daily' | 'weekly' | 'monthly'
     * @param {Object} options 选项 { days, metric }
     * @returns {Promise<Array>} 趋势数据
     */
    async getGroupTrend(groupId, period = 'daily', options = {}) {
        try {
            const days = parseInt(options.days || 7, 10);
            const metric = options.metric || 'messages';
            const now = TimeUtils.getUTC8Date();
            const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
            const startDateStr = TimeUtils.formatDate(startDate);

            const result = [];
            let previousValue = null;

            switch (period) {
                case 'daily':
                    // 按日趋势
                    const dailyStats = await this.dbService.all(
                        `SELECT date_key as date, 
                                SUM(message_count) as message_count, 
                                SUM(word_count) as word_count,
                                COUNT(DISTINCT user_id) as user_count
                         FROM daily_stats 
                         WHERE group_id = $1 AND date_key >= $2
                         GROUP BY date_key 
                         ORDER BY date_key`,
                        groupId,
                        startDateStr
                    );

                    for (const stat of dailyStats) {
                        const value = metric === 'messages' 
                            ? parseInt(stat.message_count || 0, 10)
                            : metric === 'words'
                            ? parseInt(stat.word_count || 0, 10)
                            : parseInt(stat.user_count || 0, 10);

                        const change = previousValue !== null && previousValue > 0
                            ? ((value - previousValue) / previousValue * 100).toFixed(2)
                            : null;

                        result.push({
                            date: stat.date,
                            value: value,
                            change: change ? parseFloat(change) : null
                        });

                        previousValue = value;
                    }
                    break;

                case 'weekly':
                    // 按周趋势
                    // 限制最大查询数量，防止查询过多数据
                    const safeDays = Math.min(Math.max(parseInt(days, 10) || 7, 1), 100);
                    const weeklyStats = await this.dbService.all(
                        `SELECT week_key as date, 
                                SUM(message_count) as message_count, 
                                SUM(word_count) as word_count,
                                COUNT(DISTINCT user_id) as user_count
                         FROM weekly_stats 
                         WHERE group_id = $1
                         GROUP BY week_key 
                         ORDER BY week_key DESC
                         LIMIT ${safeDays}`,
                        groupId
                    );

                    for (const stat of weeklyStats) {
                        const value = metric === 'messages' 
                            ? parseInt(stat.message_count || 0, 10)
                            : metric === 'words'
                            ? parseInt(stat.word_count || 0, 10)
                            : parseInt(stat.user_count || 0, 10);

                        const change = previousValue !== null && previousValue > 0
                            ? ((value - previousValue) / previousValue * 100).toFixed(2)
                            : null;

                        result.push({
                            date: stat.date,
                            value: value,
                            change: change ? parseFloat(change) : null
                        });

                        previousValue = value;
                    }
                    break;

                case 'monthly':
                    // 按月趋势
                    // 限制最大查询数量，防止查询过多数据
                    const safeDaysMonthly = Math.min(Math.max(parseInt(days, 10) || 7, 1), 100);
                    const monthlyStats = await this.dbService.all(
                        `SELECT month_key as date, 
                                SUM(message_count) as message_count, 
                                SUM(word_count) as word_count,
                                COUNT(DISTINCT user_id) as user_count
                         FROM monthly_stats 
                         WHERE group_id = $1
                         GROUP BY month_key 
                         ORDER BY month_key DESC
                         LIMIT ${safeDaysMonthly}`,
                        groupId
                    );

                    for (const stat of monthlyStats) {
                        const value = metric === 'messages' 
                            ? parseInt(stat.message_count || 0, 10)
                            : metric === 'words'
                            ? parseInt(stat.word_count || 0, 10)
                            : parseInt(stat.user_count || 0, 10);

                        const change = previousValue !== null && previousValue > 0
                            ? ((value - previousValue) / previousValue * 100).toFixed(2)
                            : null;

                        result.push({
                            date: stat.date,
                            value: value,
                            change: change ? parseFloat(change) : null
                        });

                        previousValue = value;
                    }
                    break;
            }

            return result;
        } catch (error) {
            this.error(`获取群组消息趋势失败:`, error);
            return [];
        }
    }

    /**
     * 获取用户消息趋势
     * @param {string} userId 用户ID
     * @param {string} groupId 群组ID
     * @param {string} period 统计周期：'daily' | 'weekly' | 'monthly'
     * @param {Object} options 选项 { days, metric }
     * @returns {Promise<Array>} 趋势数据
     */
    async getUserTrend(userId, groupId, period = 'daily', options = {}) {
        try {
            const days = parseInt(options.days || 7, 10);
            const metric = options.metric || 'messages';
            const now = TimeUtils.getUTC8Date();
            const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
            const startDateStr = TimeUtils.formatDate(startDate);

            const result = [];
            let previousValue = null;

            switch (period) {
                case 'daily':
                    // 按日趋势
                    const dailyStats = await this.dbService.getDailyStatsByDateRange(
                        groupId,
                        userId,
                        startDateStr,
                        TimeUtils.formatDate(now)
                    );

                    for (const stat of dailyStats) {
                        const value = metric === 'messages' 
                            ? parseInt(stat.message_count || 0, 10)
                            : parseInt(stat.word_count || 0, 10);

                        const change = previousValue !== null && previousValue > 0
                            ? ((value - previousValue) / previousValue * 100).toFixed(2)
                            : null;

                        result.push({
                            date: stat.date_key,
                            value: value,
                            change: change ? parseFloat(change) : null
                        });

                        previousValue = value;
                    }
                    break;

                case 'weekly':
                    // 按周趋势
                    // 限制最大查询数量，防止查询过多数据
                    const safeDaysWeekly = Math.min(Math.max(parseInt(days, 10) || 7, 1), 100);
                    const weeklyStats = await this.dbService.all(
                        `SELECT week_key as date, 
                                message_count, 
                                word_count
                         FROM weekly_stats 
                         WHERE group_id = $1 AND user_id = $2
                         ORDER BY week_key DESC
                         LIMIT ${safeDaysWeekly}`,
                        groupId,
                        userId
                    );

                    for (const stat of weeklyStats) {
                        const value = metric === 'messages' 
                            ? parseInt(stat.message_count || 0, 10)
                            : parseInt(stat.word_count || 0, 10);

                        const change = previousValue !== null && previousValue > 0
                            ? ((value - previousValue) / previousValue * 100).toFixed(2)
                            : null;

                        result.push({
                            date: stat.date,
                            value: value,
                            change: change ? parseFloat(change) : null
                        });

                        previousValue = value;
                    }
                    break;

                case 'monthly':
                    // 按月趋势
                    // 限制最大查询数量，防止查询过多数据
                    const safeDaysMonthlyUser = Math.min(Math.max(parseInt(days, 10) || 7, 1), 100);
                    const monthlyStats = await this.dbService.all(
                        `SELECT month_key as date, 
                                message_count, 
                                word_count
                         FROM monthly_stats 
                         WHERE group_id = $1 AND user_id = $2
                         ORDER BY month_key DESC
                         LIMIT ${safeDaysMonthlyUser}`,
                        groupId,
                        userId
                    );

                    for (const stat of monthlyStats) {
                        const value = metric === 'messages' 
                            ? parseInt(stat.message_count || 0, 10)
                            : parseInt(stat.word_count || 0, 10);

                        const change = previousValue !== null && previousValue > 0
                            ? ((value - previousValue) / previousValue * 100).toFixed(2)
                            : null;

                        result.push({
                            date: stat.date,
                            value: value,
                            change: change ? parseFloat(change) : null
                        });

                        previousValue = value;
                    }
                    break;
            }

            return result;
        } catch (error) {
            this.error(`获取用户消息趋势失败:`, error);
            return [];
        }
    }

    /**
     * 清除群组统计数据（归档到暂存表）
     * @param {string} groupId 群号
     * @returns {Promise<boolean>} 是否成功
     */
    async clearGroupStats(groupId) {
        try {
            // 使用数据库的归档方法将数据移到暂存表
            await this.dbService.archiveGroupData(groupId);
            
            // 清除缓存
            this.groupStatsCache.delete(String(groupId));
            this.clearCache(groupId);
            
            // 更新消息记录器中的归档缓存（如果存在）
            if (this.messageRecorder && this.messageRecorder.archivedGroupsCache) {
                this.messageRecorder.archivedGroupsCache.set(String(groupId), true);
                this.messageRecorder.archivedGroupsCacheTime?.set(String(groupId), Date.now());
            }
            
            return true;
        } catch (error) {
            this.error(`清除群组统计失败:`, error);
            return false;
        }
    }

    /**
     * 恢复归档的群组数据
     * @param {string} groupId 群号
     * @returns {Promise<boolean>} 是否成功
     */
    async restoreGroupStats(groupId) {
        try {
            // 从暂存表恢复数据
            const restored = await this.dbService.restoreGroupData(groupId);
            
            if (restored) {
                // 清除缓存，强制重新加载
                this.groupStatsCache.delete(String(groupId));
                this.clearCache(groupId);
                
                // 清除消息记录器中的归档缓存（如果存在）
                if (this.messageRecorder && this.messageRecorder.archivedGroupsCache) {
                    this.messageRecorder.archivedGroupsCache.delete(String(groupId));
                    this.messageRecorder.archivedGroupsCacheTime?.delete(String(groupId));
                }
            }
            
            return restored;
        } catch (error) {
            this.error(`恢复群组统计失败:`, error);
            return false;
        }
    }

    /**
     * 检查群组是否已归档
     * @param {string} groupId 群号
     * @returns {Promise<boolean>} 是否已归档
     */
    async isGroupArchived(groupId) {
        try {
            return await this.dbService.isGroupArchived(groupId);
        } catch (error) {
            this.error(`检查群组归档状态失败:`, error);
            return false;
        }
    }

    /**
     * 清理缓存
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     */
    clearCache(groupId, userId) {
        if (userId) {
            const cacheKey = `${groupId}_${userId}`;
            this.cache.delete(cacheKey);
        } else {
            // 清除该群的所有缓存
            const keysToDelete = [];
            for (const key of this.cache.cache.keys()) {
                if (key.startsWith(`${groupId}_`)) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => this.cache.delete(key));
        }
        
        // 清除排行榜和全局统计缓存（数据更新后需要重新查询）
        this.rankingCache.clear();
        this.globalStatsCache.clear();
        this.groupStatsCache.delete(String(groupId));
    }

    /**
     * 清理所有缓存
     * @returns {Object} 清理结果统计
     */
    clearAllCache() {
        const userCacheSize = this.cache.size();
        const groupStatsCacheSize = this.groupStatsCache.size();
        const rankingCacheSize = this.rankingCache.size();
        const globalStatsCacheSize = this.globalStatsCache.size();
        
        // 清理所有缓存
        this.cache.clear();
        this.groupStatsCache.clear();
        this.rankingCache.clear();
        this.globalStatsCache.clear();
        
        return {
            userCache: userCacheSize,
            groupStatsCache: groupStatsCacheSize,
            rankingCache: rankingCacheSize,
            globalStatsCache: globalStatsCacheSize,
            total: userCacheSize + groupStatsCacheSize + rankingCacheSize + globalStatsCacheSize
        };
    }
}

// 单例模式
let dataServiceInstance = null;

/**
 * 获取数据服务实例（单例）
 * @returns {DataService} 数据服务实例
 */
export function getDataService() {
    if (!dataServiceInstance) {
        dataServiceInstance = new DataService();
    }
    return dataServiceInstance;
}

export { DataService };
export default DataService;

