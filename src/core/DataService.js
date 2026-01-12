import { getDatabaseService } from './database/DatabaseService.js'
import { globalConfig } from './ConfigManager.js'
import { TimeUtils } from './utils/TimeUtils.js'
import { CommonUtils } from './utils/CommonUtils.js'

/**
 * LRU 缓存类
 */
class LRUCache {
    constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
        this.maxSize = maxSize
        this.ttl = ttl
        this.cache = new Map()
        this.accessTimes = new Map()
    }

    set(key, value) {
        const now = Date.now()

        // 如果缓存已满，删除最旧的条目
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictOldest()
        }

        this.cache.set(key, {
            value,
            timestamp: now
        })
        this.accessTimes.set(key, now)
    }

    get(key) {
        const now = Date.now()
        const item = this.cache.get(key)

        if (!item) return null

        // 检查是否过期
        if (now - item.timestamp > this.ttl) {
            this.cache.delete(key)
            this.accessTimes.delete(key)
            return null
        }

        // 更新访问时间
        this.accessTimes.set(key, now)
        return item.value
    }

    has(key) {
        return this.get(key) !== null
    }

    delete(key) {
        this.cache.delete(key)
        this.accessTimes.delete(key)
    }

    evictOldest() {
        let oldestKey = null
        let oldestTime = Infinity

        for (const [key, time] of this.accessTimes) {
            if (time < oldestTime) {
                oldestTime = time
                oldestKey = key
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey)
            this.accessTimes.delete(oldestKey)
        }
    }

    clear() {
        this.cache.clear()
        this.accessTimes.clear()
    }

    size() {
        return this.cache.size
    }
}

/**
 * 数据服务类
 * 使用 DatabaseService 进行数据操作，提供统一的数据访问接口
 */
class DataService {
    constructor() {
        this.dbService = getDatabaseService()
        this.cache = new LRUCache(500, 10 * 60 * 1000) // 500个条目，10分钟TTL
        this.groupStatsCache = new LRUCache(200, 30 * 1000) // 群统计缓存，30秒TTL
        this.rankingCache = new LRUCache(50, 2 * 60 * 1000) // 排行榜缓存，2分钟TTL
        this.globalStatsCache = new LRUCache(10, 3 * 60 * 1000) // 全局统计缓存，3分钟TTL
        this.messageRecorder = null // 消息记录器引用（由外部设置）
        
        // 确保数据库已初始化
        this.initialize()
    }

    /**
     * 设置消息记录器引用（用于获取最新消息文本）
     * @param {MessageRecorder} messageRecorder 消息记录器实例
     */
    setMessageRecorder(messageRecorder) {
        this.messageRecorder = messageRecorder
    }

    /**
     * 初始化数据库
     */
    async initialize() {
        try {
            await this.dbService.initialize()
        } catch (err) {
            this.error('数据库初始化失败:', err)
            throw err
        }
    }

    /**
     * 记录调试日志
     * @param {string} message 日志消息
     * @param {any[]} args 额外参数
     */
    debug(message, ...args) {
        globalConfig.debug(`[数据服务] ${message}`, ...args)
    }

    /**
     * 记录错误日志
     * @param {string} message 日志消息
     * @param {any[]} args 额外参数
     */
    error(message, ...args) {
        globalConfig.error(`[数据服务] ${message}`, ...args)
    }


    /**
     * 获取用户数据（带缓存）
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object|null>} 用户数据
     */
    async getUserData(groupId, userId) {
        const cacheKey = `${groupId}_${userId}`
        const cached = this.cache.get(cacheKey)
        
        if (cached) {
            return cached
        }

        // 从数据库读取
        const dbStats = await this.dbService.getUserStats(groupId, userId)
        
        if (!dbStats) {
            return null
        }

        const userData = await this.dbToUserData(dbStats, groupId, userId)
        this.cache.set(cacheKey, userData)
        
        return userData
    }

    /**
     * 保存用户数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {Object} userData 用户数据
     * @param {Object} options 可选参数，用于指定只保存当前时间维度的数据
     */
    async saveUserData(groupId, userId, userData, options = {}) {
        await this.dbService.saveUserStats(groupId, userId, {
            nickname: userData.nickname || '',
            total_count: parseInt(userData.total || 0, 10),
            total_words: parseInt(userData.total_number_of_words || 0, 10),
            active_days: parseInt(userData.active_days || 0, 10),
            continuous_days: parseInt(userData.continuous_days || 0, 10),
            last_speaking_time: userData.last_speaking_time || null
        })
        
        this.clearCache(groupId, userId)

        const timeInfo = TimeUtils.getCurrentDateTime()
        
        if (options.onlyCurrentTime) {
            // 只保存当前日期的日统计
            const currentDate = timeInfo.formattedDate
            if (userData.daily_stats && userData.daily_stats[currentDate]) {
                await this.dbService.saveDailyStats(groupId, userId, currentDate, {
                    message_count: parseInt(userData.daily_stats[currentDate].count || 0, 10),
                    word_count: parseInt(userData.daily_stats[currentDate].words || 0, 10)
                })
            }

            // 只保存当前周的周统计
            const currentWeek = timeInfo.weekKey
            if (userData.weekly_stats && userData.weekly_stats[currentWeek]) {
                await this.dbService.saveWeeklyStats(groupId, userId, currentWeek, {
                    message_count: parseInt(userData.weekly_stats[currentWeek].count || 0, 10),
                    word_count: parseInt(userData.weekly_stats[currentWeek].words || 0, 10)
                })
            }

            // 只保存当前月的月统计
            const currentMonth = timeInfo.monthKey
            if (userData.monthly_stats && userData.monthly_stats[currentMonth]) {
                await this.dbService.saveMonthlyStats(groupId, userId, currentMonth, {
                    message_count: parseInt(userData.monthly_stats[currentMonth].count || 0, 10),
                    word_count: parseInt(userData.monthly_stats[currentMonth].words || 0, 10)
                })
            }

            // 只保存当前年的年统计
            const currentYear = timeInfo.yearKey
            if (userData.yearly_stats && userData.yearly_stats[currentYear]) {
                await this.dbService.saveYearlyStats(groupId, userId, currentYear, {
                    message_count: parseInt(userData.yearly_stats[currentYear].count || 0, 10),
                    word_count: parseInt(userData.yearly_stats[currentYear].words || 0, 10)
                })
            }
        } else {
            if (userData.daily_stats) {
                for (const [dateKey, stats] of Object.entries(userData.daily_stats)) {
                    await this.dbService.saveDailyStats(groupId, userId, dateKey, {
                        message_count: parseInt(stats.count || 0, 10),
                        word_count: parseInt(stats.words || 0, 10)
                    })
                }
            }

            if (userData.weekly_stats) {
                for (const [weekKey, stats] of Object.entries(userData.weekly_stats)) {
                    await this.dbService.saveWeeklyStats(groupId, userId, weekKey, {
                        message_count: parseInt(stats.count || 0, 10),
                        word_count: parseInt(stats.words || 0, 10)
                    })
                }
            }

            if (userData.monthly_stats) {
                for (const [monthKey, stats] of Object.entries(userData.monthly_stats)) {
                    await this.dbService.saveMonthlyStats(groupId, userId, monthKey, {
                        message_count: parseInt(stats.count || 0, 10),
                        word_count: parseInt(stats.words || 0, 10)
                    })
                }
            }

            if (userData.yearly_stats) {
                for (const [yearKey, stats] of Object.entries(userData.yearly_stats)) {
                    await this.dbService.saveYearlyStats(groupId, userId, yearKey, {
                        message_count: parseInt(stats.count || 0, 10),
                        word_count: parseInt(stats.words || 0, 10)
                    })
                }
            }
        }

        const cacheKey = `${groupId}_${userId}`
        this.cache.set(cacheKey, userData)
        
        // 清除相关缓存
        this.groupStatsCache.delete(String(groupId))
    }

    /**
     * 将数据库格式转换为用户数据格式
     * @param {Object} dbStats 数据库统计数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object>} 用户数据格式
     */
    async dbToUserData(dbStats, groupId, userId) {
        const timeInfo = TimeUtils.getCurrentDateTime()
        
        // 获取时间维度统计数据
        const dailyStats = await this.getDailyStatsForUser(groupId, userId)
        const weeklyStats = await this.getWeeklyStatsForUser(groupId, userId)
        const monthlyStats = await this.getMonthlyStatsForUser(groupId, userId)
        const yearlyStats = await this.getYearlyStatsForUser(groupId, userId)

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
        }
    }

    /**
     * 获取用户的日统计数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object>} 日统计数据对象
     */
    async getDailyStatsForUser(groupId, userId) {
        const now = TimeUtils.getUTC8Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const startDate = TimeUtils.formatDate(thirtyDaysAgo)
        const endDate = TimeUtils.formatDate(now)
        
        const stats = await this.dbService.getDailyStatsByDateRange(groupId, userId, startDate, endDate)
        const result = {}
        
        for (const stat of stats) {
            const messageCount = parseInt(stat.message_count || 0, 10)
            const wordCount = parseInt(stat.word_count || 0, 10)
            
            result[stat.date_key] = {
                count: messageCount,
                words: wordCount
            }
        }
        
        return result
    }

    /**
     * 获取用户的周统计数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object>} 周统计数据对象
     */
    async getWeeklyStatsForUser(groupId, userId) {
        const result = {}
        const now = TimeUtils.getUTC8Date()
        
        for (let i = 0; i < 12; i++) {
            const weekDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
            const weekKey = TimeUtils.getWeekNumber(weekDate)
            
            const stat = await this.dbService.getWeeklyStats(groupId, userId, weekKey)
            if (stat) {
                const messageCount = parseInt(stat.message_count || 0, 10)
                const wordCount = parseInt(stat.word_count || 0, 10)
                
                result[weekKey] = {
                    count: messageCount,
                    words: wordCount
                }
            }
        }
        
        return result
    }

    /**
     * 获取用户的月统计数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object>} 月统计数据对象
     */
    async getMonthlyStatsForUser(groupId, userId) {
        const result = {}
        const now = TimeUtils.getUTC8Date()
        
        for (let i = 0; i < 12; i++) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const monthKey = TimeUtils.getMonthString(monthDate)
            
            const stat = await this.dbService.getMonthlyStats(groupId, userId, monthKey)
            if (stat) {
                const messageCount = parseInt(stat.message_count || 0, 10)
                const wordCount = parseInt(stat.word_count || 0, 10)
                
                result[monthKey] = {
                    count: messageCount,
                    words: wordCount
                }
            }
        }
        
        return result
    }

    /**
     * 获取用户的年统计数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object>} 年统计数据对象
     */
    async getYearlyStatsForUser(groupId, userId) {
        const now = TimeUtils.getUTC8Date()
        const yearKey = now.getFullYear().toString()
        
        const stat = await this.dbService.getYearlyStats(groupId, userId, yearKey)
        
        if (stat) {
            // 确保转换为数字类型，避免字符串拼接问题
            const messageCount = parseInt(stat.message_count || 0, 10)
            const wordCount = parseInt(stat.word_count || 0, 10)
            
            return {
                [yearKey]: {
                    count: messageCount,
                    words: wordCount
                }
            }
        }
        
        return {}
    }

    /**
     * 初始化用户数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} nickname 用户昵称
     * @returns {Object} 用户数据
     */
    initUserData(groupId, userId, nickname) {
        const timeInfo = TimeUtils.getCurrentDateTime()
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
        }
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
            const timeInfo = TimeUtils.getCurrentDateTime()

            let userData = await this.getUserData(groupId, userId)
            const isNewUser = !userData

            if (!userData) {
                userData = this.initUserData(groupId, userId, nickname)
            }

            const currentWordCount = parseInt(wordCount || 0, 10)
            
            const totalCount = parseInt(userData.total || 0, 10)
            const totalWords = parseInt(userData.total_number_of_words || 0, 10)
            const oldTotal = totalCount
            userData.total = totalCount + 1
            userData.total_number_of_words = totalWords + currentWordCount
            if (userData.nickname !== nickname) {
                userData.nickname = nickname
            }
            userData.last_speaking_time = timeInfo.formattedDateTime

            if (!userData.daily_stats) userData.daily_stats = {}
            if (!userData.weekly_stats) userData.weekly_stats = {}
            if (!userData.monthly_stats) userData.monthly_stats = {}
            if (!userData.yearly_stats) userData.yearly_stats = {}

            if (!userData.daily_stats[timeInfo.formattedDate]) {
                userData.daily_stats[timeInfo.formattedDate] = {
                    count: 0,
                    words: 0
                }
            }
            const dailyCount = parseInt(userData.daily_stats[timeInfo.formattedDate].count || 0, 10)
            const dailyWords = parseInt(userData.daily_stats[timeInfo.formattedDate].words || 0, 10)
            userData.daily_stats[timeInfo.formattedDate].count = dailyCount + 1
            userData.daily_stats[timeInfo.formattedDate].words = dailyWords + currentWordCount

            const weekKey = timeInfo.weekKey
            if (!userData.weekly_stats[weekKey]) {
                userData.weekly_stats[weekKey] = {
                    count: 0,
                    words: 0
                }
            }
            const weeklyCount = parseInt(userData.weekly_stats[weekKey].count || 0, 10)
            const weeklyWords = parseInt(userData.weekly_stats[weekKey].words || 0, 10)
            userData.weekly_stats[weekKey].count = weeklyCount + 1
            userData.weekly_stats[weekKey].words = weeklyWords + currentWordCount

            const monthKey = timeInfo.monthKey
            if (!userData.monthly_stats[monthKey]) {
                userData.monthly_stats[monthKey] = {
                    count: 0,
                    words: 0
                }
            }
            const monthlyCount = parseInt(userData.monthly_stats[monthKey].count || 0, 10)
            const monthlyWords = parseInt(userData.monthly_stats[monthKey].words || 0, 10)
            userData.monthly_stats[monthKey].count = monthlyCount + 1
            userData.monthly_stats[monthKey].words = monthlyWords + currentWordCount

            const yearKey = timeInfo.yearKey
            if (!userData.yearly_stats[yearKey]) {
                userData.yearly_stats[yearKey] = {
                    count: 0,
                    words: 0
                }
            }
            const yearlyCount = parseInt(userData.yearly_stats[yearKey].count || 0, 10)
            const yearlyWords = parseInt(userData.yearly_stats[yearKey].words || 0, 10)
            userData.yearly_stats[yearKey].count = yearlyCount + 1
            userData.yearly_stats[yearKey].words = yearlyWords + currentWordCount

            userData.active_days = Object.keys(userData.daily_stats).length
            userData.continuous_days = this.calculateContinuousDays(userData.daily_stats)

            await this.saveUserData(groupId, userId, userData, { onlyCurrentTime: true })
            
            let logKey = null
            if (messageId) {
                logKey = `stats_${messageId}`
            } else if (messageTime) {
                logKey = `stats_${groupId}_${userId}_${messageTime}`
            } else {
                logKey = `stats_${groupId}_${userId}_${userData.total}_${Date.now()}`
            }
            
            if (this.messageRecorder && this.messageRecorder.processedLogTimes) {
                const sizeBefore = this.messageRecorder.processedLogTimes.size
                this.messageRecorder.processedLogTimes.add(logKey)
                const sizeAfter = this.messageRecorder.processedLogTimes.size
                
                if (sizeAfter > sizeBefore) {
                    if (this.messageRecorder.processedLogTimes.size > 200) {
                        const keysArray = Array.from(this.messageRecorder.processedLogTimes)
                        keysArray.slice(0, 100).forEach(key => {
                            this.messageRecorder.processedLogTimes.delete(key)
                        })
                    }
                    
                    const wordInfo = currentWordCount > 0 ? `，${global.logger.green('字数')}: ${global.logger.cyan(currentWordCount)}` : ''
                    const logMessage = `${global.logger.blue('[发言统计]')} ${global.logger.green(nickname)}(${userId}) 在群 ${groupId} 发言，水群数量: ${global.logger.yellow(oldTotal)} → ${global.logger.yellow(userData.total)}${wordInfo}`
                    if (globalConfig.getConfig('global.debugLog')) {
                        global.logger.mark(logMessage)
                    }
                }
            }
        } catch (err) {
            this.error(`更新用户统计失败:`, err)
        }
    }

    /**
     * 计算连续天数（使用 TimeUtils 的通用方法）
     * @param {Object} dailyStats 日统计数据
     * @returns {number} 连续天数（最大连续天数）
     */
    calculateContinuousDays(dailyStats) {
        return TimeUtils.calculateContinuousDays(dailyStats, true)
    }

    /**
     * 获取群成员排行榜数据
     * @param {string} groupId 群号
     * @param {string} type 统计类型：'daily'|'weekly'|'monthly'|'yearly'|'total'
     * @param {Object} options 选项 { monthKey, limit }
     * @returns {Promise<Array>} 排行榜数据
     */
    async getRankingData(groupId, type = 'total', options = {}) {
        const timeInfo = TimeUtils.getCurrentDateTime()
        const limit = options.limit || 20

        try {
            switch (type) {
                case 'total':
                    const queryAllGroups = !groupId || groupId === 'all'
                    
                    if (queryAllGroups) {
                        const cacheKey = `ranking:total:all:${limit}`
                        const cached = this.rankingCache.get(cacheKey)
                        if (cached) {
                            return cached
                        }
                    }
                    
                    let topUsers
                    if (queryAllGroups) {
                        topUsers = await this.dbService.getTopUsersAllGroups(limit, 'total_count')
                    } else {
                        const isArchived = await this.dbService.isGroupArchived(groupId)
                        if (isArchived) {
                            return []
                        }
                        topUsers = await this.dbService.getTopUsers(groupId, limit, 'total_count')
                    }
                    
                    const result = topUsers.map(user => ({
                        user_id: user.user_id,
                        nickname: user.nickname,
                        count: parseInt(user.total_count || 0, 10),
                        period_words: parseInt(user.total_words || 0, 10),
                        active_days: parseInt(user.active_days || 0, 10),
                        continuous_days: parseInt(user.continuous_days || 0, 10),
                        last_speaking_time: user.last_speaking_time || null
                    }))
                    
                    if (queryAllGroups) {
                        const cacheKey = `ranking:total:all:${limit}`
                        this.rankingCache.set(cacheKey, result)
                    }
                    
                    return result

                case 'daily':
                    const todayDate = timeInfo.formattedDate
                    const dailyStats = await this.dbService.getDailyStatsByGroupAndDate(groupId, todayDate)
                    
                    return dailyStats.slice(0, limit).map(stat => ({
                        user_id: stat.user_id,
                        nickname: stat.nickname || stat.user_id,
                        count: parseInt(stat.message_count || 0, 10),
                        period_words: parseInt(stat.word_count || 0, 10),
                        last_speaking_time: stat.last_speaking_time || null
                    }))

                case 'weekly':
                    const weekKey = timeInfo.weekKey
                    const weeklyStats = await this.dbService.getWeeklyStatsByGroupAndWeek(groupId, weekKey)
                    
                    return weeklyStats.slice(0, limit).map(stat => ({
                        user_id: stat.user_id,
                        nickname: stat.nickname || stat.user_id,
                        count: parseInt(stat.message_count || 0, 10),
                        period_words: parseInt(stat.word_count || 0, 10),
                        last_speaking_time: stat.last_speaking_time || null
                    }))

                case 'monthly':
                    if (!groupId) {
                        return []
                    }
                    const monthKey = options.monthKey || timeInfo.monthKey
                    // 确保月份键格式正确：YYYY-MM
                    const validMonthKey = monthKey.match(/^\d{4}-\d{2}$/) ? monthKey : timeInfo.monthKey
                    const monthlyStats = await this.dbService.getMonthlyStatsByGroupAndMonth(groupId, validMonthKey)
                    
                    return monthlyStats.slice(0, limit).map(stat => ({
                        user_id: stat.user_id,
                        nickname: stat.nickname || stat.user_id,
                        count: parseInt(stat.message_count || 0, 10),
                        period_words: parseInt(stat.word_count || 0, 10),
                        last_speaking_time: stat.last_speaking_time || null
                    }))

                case 'yearly':
                    const yearKey = timeInfo.yearKey
                    const yearlyStats = await this.dbService.getYearlyStatsByGroupAndYear(groupId, yearKey)
                    
                    return yearlyStats.slice(0, limit).map(stat => ({
                        user_id: stat.user_id,
                        nickname: stat.nickname || stat.user_id,
                        count: parseInt(stat.message_count || 0, 10),
                        period_words: parseInt(stat.word_count || 0, 10),
                        last_speaking_time: stat.last_speaking_time || null
                    }))

                default:
                    return []
            }
        } catch (err) {
            this.error(`获取排行榜数据失败 (${type}):`, err)
            return []
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
        const timeInfo = TimeUtils.getCurrentDateTime()
        
        try {
            switch (type) {
                case 'total':
                    const queryAllGroups = !groupId || groupId === 'all'
                    if (queryAllGroups) {
                        const allUsers = await this.dbService.getTopUsersAllGroups(999999, 'total_count')
                        
                        const userIndex = allUsers.findIndex(u => String(u.user_id) === String(userId))
                        if (userIndex === -1) return null
                        
                        const user = allUsers[userIndex]
                        return {
                            user_id: user.user_id,
                            nickname: user.nickname,
                            count: parseInt(user.total_count || 0, 10),
                            period_words: parseInt(user.total_words || 0, 10),
                            active_days: parseInt(user.active_days || 0, 10),
                            continuous_days: parseInt(user.continuous_days || 0, 10),
                            last_speaking_time: user.last_speaking_time || null,
                            rank: userIndex + 1
                        }
                    } else {
                        const isArchived = await this.dbService.isGroupArchived(groupId)
                        if (isArchived) {
                            return null
                        }
                        
                        const userStats = await this.dbService.getUserStats(groupId, userId)
                        if (!userStats || !userStats.total_count || userStats.total_count === 0) {
                            return null
                        }
                        
                        const allUsers = await this.dbService.getTopUsers(groupId, 999999, 'total_count')
                        const userIndex = allUsers.findIndex(u => String(u.user_id) === String(userId))
                        
                        return {
                            user_id: userStats.user_id,
                            nickname: userStats.nickname,
                            count: parseInt(userStats.total_count || 0, 10),
                            period_words: parseInt(userStats.total_words || 0, 10),
                            active_days: parseInt(userStats.active_days || 0, 10),
                            continuous_days: parseInt(userStats.continuous_days || 0, 10),
                            last_speaking_time: userStats.last_speaking_time || null,
                            rank: userIndex !== -1 ? userIndex + 1 : null
                        }
                    }

                case 'daily':
                    if (!groupId) return null
                    const todayDate = timeInfo.formattedDate
                    const dailyStats = await this.dbService.getDailyStatsByGroupAndDate(groupId, todayDate)
                    
                    const userDailyStat = dailyStats.find(s => String(s.user_id) === String(userId))
                    if (!userDailyStat) {
                        return null
                    }
                    
                    const dailyUserIndex = dailyStats.findIndex(s => String(s.user_id) === String(userId))
                    
                    const userStats = await this.dbService.getUserStats(groupId, userId)
                    return {
                        user_id: userId,
                        nickname: userDailyStat.nickname || userStats?.nickname || '未知',
                        count: parseInt(userDailyStat.message_count || 0, 10),
                        period_words: parseInt(userDailyStat.word_count || 0, 10),
                        active_days: userStats?.active_days || 0,
                        continuous_days: userStats?.continuous_days || 0,
                        last_speaking_time: userDailyStat.last_speaking_time || userStats?.last_speaking_time || null,
                        rank: dailyUserIndex !== -1 ? dailyUserIndex + 1 : null
                    }

                case 'weekly':
                    if (!groupId) return null
                    const weekKey = timeInfo.weekKey
                    const weeklyStats = await this.dbService.getWeeklyStatsByGroupAndWeek(groupId, weekKey)
                    
                    const userWeeklyStat = weeklyStats.find(s => String(s.user_id) === String(userId))
                    if (!userWeeklyStat) {
                        return null
                    }
                    
                    const weeklyUserIndex = weeklyStats.findIndex(s => String(s.user_id) === String(userId))
                    
                    const weeklyUserStats = await this.dbService.getUserStats(groupId, userId)
                    return {
                        user_id: userId,
                        nickname: userWeeklyStat.nickname || weeklyUserStats?.nickname || '未知',
                        count: parseInt(userWeeklyStat.message_count || 0, 10),
                        period_words: parseInt(userWeeklyStat.word_count || 0, 10),
                        active_days: weeklyUserStats?.active_days || 0,
                        continuous_days: weeklyUserStats?.continuous_days || 0,
                        last_speaking_time: userWeeklyStat.last_speaking_time || weeklyUserStats?.last_speaking_time || null,
                        rank: weeklyUserIndex !== -1 ? weeklyUserIndex + 1 : null
                    }

                case 'monthly':
                    if (!groupId) return null
                    const monthKey = options.monthKey || timeInfo.monthKey
                    const validMonthKey = monthKey.match(/^\d{4}-\d{2}$/) ? monthKey : timeInfo.monthKey
                    const monthlyStats = await this.dbService.getMonthlyStatsByGroupAndMonth(groupId, validMonthKey)
                    
                    const userMonthlyStat = monthlyStats.find(s => String(s.user_id) === String(userId))
                    if (!userMonthlyStat) {
                        return null
                    }
                    
                    const monthlyUserIndex = monthlyStats.findIndex(s => String(s.user_id) === String(userId))
                    
                    const monthlyUserStats = await this.dbService.getUserStats(groupId, userId)
                    return {
                        user_id: userId,
                        nickname: userMonthlyStat.nickname || monthlyUserStats?.nickname || '未知',
                        count: parseInt(userMonthlyStat.message_count || 0, 10),
                        period_words: parseInt(userMonthlyStat.word_count || 0, 10),
                        active_days: monthlyUserStats?.active_days || 0,
                        continuous_days: monthlyUserStats?.continuous_days || 0,
                        last_speaking_time: userMonthlyStat.last_speaking_time || monthlyUserStats?.last_speaking_time || null,
                        rank: monthlyUserIndex !== -1 ? monthlyUserIndex + 1 : null
                    }

                case 'yearly':
                    if (!groupId) return null
                    const yearKey = timeInfo.yearKey
                    const yearlyStats = await this.dbService.getYearlyStatsByGroupAndYear(groupId, yearKey)
                    
                    const userYearlyStat = yearlyStats.find(s => String(s.user_id) === String(userId))
                    if (!userYearlyStat) {
                        return null
                    }
                    
                    const yearlyUserIndex = yearlyStats.findIndex(s => String(s.user_id) === String(userId))
                    
                    const yearlyUserStats = await this.dbService.getUserStats(groupId, userId)
                    return {
                        user_id: userId,
                        nickname: userYearlyStat.nickname || yearlyUserStats?.nickname || '未知',
                        count: parseInt(userYearlyStat.message_count || 0, 10),
                        period_words: parseInt(userYearlyStat.word_count || 0, 10),
                        active_days: yearlyUserStats?.active_days || 0,
                        continuous_days: yearlyUserStats?.continuous_days || 0,
                        last_speaking_time: userYearlyStat.last_speaking_time || yearlyUserStats?.last_speaking_time || null,
                        rank: yearlyUserIndex !== -1 ? yearlyUserIndex + 1 : null
                    }

                default:
                    return null
            }
        } catch (err) {
            this.error(`获取用户排名数据失败 (${type}):`, err)
            return null
        }
    }

    /**
     * 获取所有群组ID列表
     * @returns {Promise<Array<string>>} 群ID数组
     */
    async getGroupIds() {
        try {
            return await this.dbService.getAllGroupIds()
        } catch (err) {
            this.error('获取群组列表失败:', err)
            return []
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
            const cacheKey = `globalStats:${page}:${pageSize}`
            const cached = this.globalStatsCache.get(cacheKey)
            if (cached) {
                return cached
            }
            
            const timeInfo = TimeUtils.getCurrentDateTime()
            const todayKey = timeInfo.formattedDate
            const monthKey = timeInfo.monthKey

            const [allUsersMap, allDailyStatsMap, allMonthlyStatsMap, allGroupIds, allGroupsInfoMap, archivedGroupsCount, archivedGroupIds, totalMessagesResult, totalWordsResult] = await Promise.all([
                this.dbService.getAllGroupsUsersBatch(),
                this.dbService.getAllGroupsDailyStatsBatch(todayKey),
                this.dbService.getAllGroupsMonthlyStatsBatch(monthKey),
                this.getGroupIds(),
                this.dbService.getAllGroupsInfoBatch(),
                this.dbService.get('SELECT COUNT(*) as count FROM archived_groups').then(result => parseInt(result?.count || 0, 10)).catch(() => 0),
                this.dbService.all('SELECT group_id FROM archived_groups').then(groups => new Set(groups.map(g => String(g.group_id)))).catch(() => new Set()),
                this.dbService.get(`
                    SELECT SUM(total_count) as total 
                    FROM (
                        SELECT user_id, SUM(total_count) as total_count
                        FROM user_stats
                        WHERE group_id NOT IN (SELECT group_id FROM archived_groups)
                        GROUP BY user_id
                    ) as user_aggregated
                `).then(result => parseInt(result?.total || 0, 10)).catch(() => 0),
                this.dbService.get(`
                    SELECT SUM(total_words) as total 
                    FROM (
                        SELECT user_id, SUM(total_words) as total_words
                        FROM user_stats
                        WHERE group_id NOT IN (SELECT group_id FROM archived_groups)
                        GROUP BY user_id
                    ) as user_aggregated
                `).then(result => parseInt(result?.total || 0, 10)).catch(() => 0)
            ])
            
            const archivedGroupIdsSet = archivedGroupIds || new Set()
            
            let totalGroups = 0
            let totalUsersSet = new Set()
            let totalMessages = totalMessagesResult || 0
            let totalWords = totalWordsResult || 0
            let todayActiveSet = new Set()
            let monthActive = new Set()

            const groupStatsList = []

            for (const groupId of allGroupIds) {
                if (archivedGroupIdsSet.has(String(groupId))) {
                    continue
                }
                try {
                    const users = allUsersMap.get(groupId) || []
                    if (users.length === 0) continue

                    totalGroups++
                    for (const user of users) {
                        totalUsersSet.add(user.user_id)
                    }

                    let groupMessages = 0
                    let groupWords = 0

                    const dailyStatsList = allDailyStatsMap.get(groupId) || []
                    const monthlyStatsList = allMonthlyStatsMap.get(groupId) || []
                    
                    const dailyStatsMap = new Map(dailyStatsList.map(s => [s.user_id, s]))
                    const monthlyStatsMap = new Map(monthlyStatsList.map(s => [s.user_id, s]))

                    for (const user of users) {
                        const msgCount = parseInt(user.total_count || 0, 10)
                        const wordCount = parseInt(user.total_words || 0, 10)
                        groupMessages += msgCount
                        groupWords += wordCount

                        const dailyStat = dailyStatsMap.get(user.user_id)
                        if (dailyStat && parseInt(dailyStat.message_count || 0, 10) > 0) {
                            todayActiveSet.add(`${groupId}_${user.user_id}`)
                        }

                        const monthlyStat = monthlyStatsMap.get(user.user_id)
                        if (monthlyStat && parseInt(monthlyStat.message_count || 0, 10) > 0) {
                            monthActive.add(`${groupId}_${user.user_id}`)
                        }
                    }

                    const groupTodayActive = dailyStatsList.length
                    const groupMonthActive = monthlyStatsList.length

                    let groupName = allGroupsInfoMap.get(groupId)

                    if (!groupName && typeof Bot !== 'undefined' && Bot.gl) {
                        const botGroupInfo = Bot.gl.get(groupId)
                        if (botGroupInfo && botGroupInfo.group_name) {
                            groupName = botGroupInfo.group_name
                            this.dbService.saveGroupInfo(groupId, groupName)
                                .catch(() => {
                                    if (globalConfig.getConfig('global.debugLog')) {
                                        globalConfig.debug('[数据服务-保存群信息] 非关键错误')
                                    }
                                })
                            allGroupsInfoMap.set(groupId, groupName)
                        }
                    }
                    
                    if (!groupName) {
                        groupName = `群${groupId}`
                    }

                    groupStatsList.push({
                        groupId: groupId,
                        groupName: groupName,
                        userCount: users.length,
                        totalMessages: groupMessages,
                        totalWords: groupWords,
                        todayActive: groupTodayActive,
                        monthActive: groupMonthActive
                    })
                } catch (err) {
                    this.error(`获取群组 ${groupId} 统计数据失败:`, err)
                }
            }

            groupStatsList.sort((a, b) => b.totalMessages - a.totalMessages)

            const totalPages = Math.ceil(groupStatsList.length / pageSize)
            const startIndex = (page - 1) * pageSize
            const endIndex = startIndex + pageSize
            const pagedGroups = groupStatsList.slice(startIndex, endIndex)

            let earliestTime = null
            let statsDurationHours = 0
            try {
                const earliestResult = await this.dbService.get(
                    'SELECT MIN(created_at) as earliest_time FROM user_stats'
                )
                earliestTime = earliestResult?.earliest_time || null
                
                if (earliestTime) {
                    const earliestDate = new Date(earliestTime)
                    const now = new Date()
                    const diffMs = now - earliestDate
                    statsDurationHours = Math.floor(diffMs / (1000 * 60 * 60))
                }
            } catch (err) {
                this.error('获取最早统计时间失败:', err)
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
            }
            
            this.globalStatsCache.set(cacheKey, result)
            
            return result
        } catch (err) {
            this.error('获取全局统计数据失败:', err)
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
            }
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
            const now = TimeUtils.getUTC8Date()
            let startDate = options.startDate
            let endDate = options.endDate || TimeUtils.formatDate(now)

            // 如果没有指定开始日期，默认最近7天
            if (!startDate) {
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                startDate = TimeUtils.formatDate(sevenDaysAgo)
            }

            const result = []

            switch (type) {
                case 'daily':
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
                    )

                    for (const stat of dailyStats) {
                        result.push({
                            date: stat.date,
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        })
                    }
                    break

                case 'weekly':
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
                    )

                    for (const stat of weeklyStats) {
                        result.push({
                            date: stat.date,
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        })
                    }
                    break

                case 'monthly':
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
                    )

                    for (const stat of monthlyStats) {
                        result.push({
                            date: stat.date,
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        })
                    }
                    break

                case 'hourly':
                default:
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
                    )

                    for (const stat of hourlyStats) {
                        result.push({
                            date: stat.date,
                            hour: null, // 由于没有小时数据，设为 null
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        })
                    }
                    break
            }

            return result
        } catch (err) {
            this.error(`获取群组时间分布统计失败:`, err)
            return []
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
            const now = TimeUtils.getUTC8Date()
            let startDate = options.startDate
            let endDate = options.endDate || TimeUtils.formatDate(now)

            if (!startDate) {
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                startDate = TimeUtils.formatDate(sevenDaysAgo)
            }

            const result = []

            switch (type) {
                case 'daily':
                    const dailyStats = await this.dbService.getDailyStatsByDateRange(
                        groupId,
                        userId,
                        startDate,
                        endDate
                    )

                    for (const stat of dailyStats) {
                        result.push({
                            date: stat.date_key,
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        })
                    }
                    break

                case 'weekly':
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
                    )

                    for (const stat of weeklyStats) {
                        result.push({
                            date: stat.date,
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        })
                    }
                    break

                case 'monthly':
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
                    )

                    for (const stat of monthlyStats) {
                        result.push({
                            date: stat.date,
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        })
                    }
                    break

                case 'hourly':
                default:
                    const hourlyStats = await this.dbService.getDailyStatsByDateRange(
                        groupId,
                        userId,
                        startDate,
                        endDate
                    )

                    for (const stat of hourlyStats) {
                        result.push({
                            date: stat.date_key,
                            hour: null, // 由于没有小时数据，设为 null
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        })
                    }
                    break
            }

            return result
        } catch (err) {
            this.error(`获取用户时间分布统计失败:`, err)
            return []
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
            const days = parseInt(options.days || 7, 10)
            const metric = options.metric || 'messages'
            const now = TimeUtils.getUTC8Date()
            const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
            const startDateStr = TimeUtils.formatDate(startDate)

            const result = []
            let previousValue = null

            switch (period) {
                case 'daily':
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
                    )

                    for (const stat of dailyStats) {
                        const value = metric === 'messages' 
                            ? parseInt(stat.message_count || 0, 10)
                            : metric === 'words'
                            ? parseInt(stat.word_count || 0, 10)
                            : parseInt(stat.user_count || 0, 10)

                        const change = previousValue !== null && previousValue > 0
                            ? ((value - previousValue) / previousValue * 100).toFixed(2)
                            : null

                        result.push({
                            date: stat.date,
                            value: value,
                            change: change ? parseFloat(change) : null
                        })

                        previousValue = value
                    }
                    break

                case 'weekly':
                    const safeDays = Math.min(Math.max(parseInt(days, 10) || 7, 1), 100)
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
                    )

                    for (const stat of weeklyStats) {
                        const value = metric === 'messages' 
                            ? parseInt(stat.message_count || 0, 10)
                            : metric === 'words'
                            ? parseInt(stat.word_count || 0, 10)
                            : parseInt(stat.user_count || 0, 10)

                        const change = previousValue !== null && previousValue > 0
                            ? ((value - previousValue) / previousValue * 100).toFixed(2)
                            : null

                        result.push({
                            date: stat.date,
                            value: value,
                            change: change ? parseFloat(change) : null
                        })

                        previousValue = value
                    }
                    break

                case 'monthly':
                    const safeDaysMonthly = Math.min(Math.max(parseInt(days, 10) || 7, 1), 100)
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
                    )

                    for (const stat of monthlyStats) {
                        const value = metric === 'messages' 
                            ? parseInt(stat.message_count || 0, 10)
                            : metric === 'words'
                            ? parseInt(stat.word_count || 0, 10)
                            : parseInt(stat.user_count || 0, 10)

                        const change = previousValue !== null && previousValue > 0
                            ? ((value - previousValue) / previousValue * 100).toFixed(2)
                            : null

                        result.push({
                            date: stat.date,
                            value: value,
                            change: change ? parseFloat(change) : null
                        })

                        previousValue = value
                    }
                    break
            }

            return result
        } catch (err) {
            this.error(`获取群组消息趋势失败:`, err)
            return []
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
            const days = parseInt(options.days || 7, 10)
            const metric = options.metric || 'messages'
            const now = TimeUtils.getUTC8Date()
            const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
            const startDateStr = TimeUtils.formatDate(startDate)

            const result = []
            let previousValue = null

            switch (period) {
                case 'daily':
                    const dailyStats = await this.dbService.getDailyStatsByDateRange(
                        groupId,
                        userId,
                        startDateStr,
                        TimeUtils.formatDate(now)
                    )

                    for (const stat of dailyStats) {
                        const value = metric === 'messages' 
                            ? parseInt(stat.message_count || 0, 10)
                            : parseInt(stat.word_count || 0, 10)

                        const change = previousValue !== null && previousValue > 0
                            ? ((value - previousValue) / previousValue * 100).toFixed(2)
                            : null

                        result.push({
                            date: stat.date_key,
                            value: value,
                            change: change ? parseFloat(change) : null
                        })

                        previousValue = value
                    }
                    break

                case 'weekly':
                    const safeDaysWeekly = Math.min(Math.max(parseInt(days, 10) || 7, 1), 100)
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
                    )

                    for (const stat of weeklyStats) {
                        const value = metric === 'messages' 
                            ? parseInt(stat.message_count || 0, 10)
                            : parseInt(stat.word_count || 0, 10)

                        const change = previousValue !== null && previousValue > 0
                            ? ((value - previousValue) / previousValue * 100).toFixed(2)
                            : null

                        result.push({
                            date: stat.date,
                            value: value,
                            change: change ? parseFloat(change) : null
                        })

                        previousValue = value
                    }
                    break

                case 'monthly':
                    const safeDaysMonthlyUser = Math.min(Math.max(parseInt(days, 10) || 7, 1), 100)
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
                    )

                    for (const stat of monthlyStats) {
                        const value = metric === 'messages' 
                            ? parseInt(stat.message_count || 0, 10)
                            : parseInt(stat.word_count || 0, 10)

                        const change = previousValue !== null && previousValue > 0
                            ? ((value - previousValue) / previousValue * 100).toFixed(2)
                            : null

                        result.push({
                            date: stat.date,
                            value: value,
                            change: change ? parseFloat(change) : null
                        })

                        previousValue = value
                    }
                    break
            }

            return result
        } catch (err) {
            this.error(`获取用户消息趋势失败:`, err)
            return []
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
            await this.dbService.archiveGroupData(groupId)
            
            // 清除缓存
            this.groupStatsCache.delete(String(groupId))
            this.clearCache(groupId)
            
            // 更新消息记录器中的归档缓存（如果存在）
            if (this.messageRecorder && this.messageRecorder.archivedGroupsCache) {
                this.messageRecorder.archivedGroupsCache.set(String(groupId), true)
                this.messageRecorder.archivedGroupsCacheTime?.set(String(groupId), Date.now())
            }
            
            return true
        } catch (err) {
            this.error(`清除群组统计失败:`, err)
            return false
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
            const restored = await this.dbService.restoreGroupData(groupId)
            
            if (restored) {
                // 清除缓存，强制重新加载
                this.groupStatsCache.delete(String(groupId))
                this.clearCache(groupId)
                
                // 清除消息记录器中的归档缓存（如果存在）
                if (this.messageRecorder && this.messageRecorder.archivedGroupsCache) {
                    this.messageRecorder.archivedGroupsCache.delete(String(groupId))
                    this.messageRecorder.archivedGroupsCacheTime?.delete(String(groupId))
                }
            }
            
            return restored
        } catch (err) {
            this.error(`恢复群组统计失败:`, err)
            return false
        }
    }

    /**
     * 检查群组是否已归档
     * @param {string} groupId 群号
     * @returns {Promise<boolean>} 是否已归档
     */
    async isGroupArchived(groupId) {
        try {
            return await this.dbService.isGroupArchived(groupId)
        } catch (err) {
            this.error(`检查群组归档状态失败:`, err)
            return false
        }
    }

    /**
     * 清理缓存
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     */
    clearCache(groupId, userId) {
        if (userId) {
            const cacheKey = `${groupId}_${userId}`
            this.cache.delete(cacheKey)
        } else {
            // 清除该群的所有缓存
            const keysToDelete = []
            for (const key of this.cache.cache.keys()) {
                if (key.startsWith(`${groupId}_`)) {
                    keysToDelete.push(key)
                }
            }
            keysToDelete.forEach(key => this.cache.delete(key))
        }
        
        // 清除排行榜和全局统计缓存（数据更新后需要重新查询）
        this.rankingCache.clear()
        this.globalStatsCache.clear()
        this.groupStatsCache.delete(String(groupId))
    }

    /**
     * 清理所有缓存
     * @returns {Object} 清理结果统计
     */
    clearAllCache() {
        const userCacheSize = this.cache.size()
        const groupStatsCacheSize = this.groupStatsCache.size()
        const rankingCacheSize = this.rankingCache.size()
        const globalStatsCacheSize = this.globalStatsCache.size()
        
        // 清理所有缓存
        this.cache.clear()
        this.groupStatsCache.clear()
        this.rankingCache.clear()
        this.globalStatsCache.clear()
        
        return {
            userCache: userCacheSize,
            groupStatsCache: groupStatsCacheSize,
            rankingCache: rankingCacheSize,
            globalStatsCache: globalStatsCacheSize,
            total: userCacheSize + groupStatsCacheSize + rankingCacheSize + globalStatsCacheSize
        }
    }
}

// 单例模式
let dataServiceInstance = null

/**
 * 获取数据服务实例（单例）
 * @returns {DataService} 数据服务实例
 */
export function getDataService() {
    if (!dataServiceInstance) {
        dataServiceInstance = new DataService()
    }
    return dataServiceInstance
}

export { DataService }
export default DataService

