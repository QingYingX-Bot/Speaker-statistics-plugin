import { globalConfig } from '../ConfigManager.js'
import { TimeUtils } from '../utils/TimeUtils.js'
import { PostgreSQLAdapter } from './adapters/PostgreSQLAdapter.js'
import { SQLiteAdapter } from './adapters/SQLiteAdapter.js'

/**
 * 数据库服务类
 * 根据配置选择数据库适配器（PostgreSQL 或 SQLite），提供统一的数据访问接口
 */
class DatabaseService {
    constructor() {
        this.adapter = null
        this.initialized = false
        this.healthCheckInterval = null
        this.healthCheckIntervalMs = 60000
        this.reconnectAttempts = 0
        this.maxReconnectAttempts = 5
        this.reconnectDelay = 1000
    }

    /**
     * 初始化数据库连接（带重试机制）
     * @param {number} maxRetries 最大重试次数，默认5次
     * @param {number} initialDelay 初始延迟（毫秒），默认1000ms
     * @returns {Promise<void>}
     */
    async initialize(maxRetries = 5, initialDelay = 1000) {
        if (this.initialized && this.adapter) {
            try {
                await this.healthCheck()
                return
            } catch (err) {
                globalConfig.warn('[数据库服务] 健康检查失败，尝试重新初始化:', err.message)
                this.initialized = false
                this.adapter = null
            }
        }

        for (let i = 0; i < maxRetries; i++) {
            try {
                const dbConfig = globalConfig.getConfig('database') || {}
                const dbType = (dbConfig.type || 'postgresql').toLowerCase()
                
                if (dbType === 'sqlite') {
                    this.adapter = new SQLiteAdapter()
                    globalConfig.debug('[数据库服务] 使用 SQLite 适配器')
                } else {
                    this.adapter = new PostgreSQLAdapter()
                    globalConfig.debug('[数据库服务] 使用 PostgreSQL 适配器')
                }

                await this.adapter.initialize()
                await this.healthCheck()
                this.initialized = true
                this.reconnectAttempts = 0
                this.startHealthCheck()
                return
            } catch (err) {
                const isLastAttempt = i === maxRetries - 1
                
                if (isLastAttempt) {
                    if (err.message?.includes('数据库')) {
                        throw err
                    }
                    throw new Error(`数据库初始化失败（已重试${maxRetries}次）: ${err.message}`)
                }
                
                const delay = initialDelay * Math.pow(2, i)
                globalConfig.warn(`[数据库服务] 初始化失败，${delay}ms 后重试 (${i + 1}/${maxRetries}):`, err.message)
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }
    }

    /**
     * 健康检查
     * @returns {Promise<boolean>}
     */
    async healthCheck() {
        if (!this.adapter) {
            this.initialized = false
            throw new Error('数据库适配器未初始化')
        }

        try {
            await this.adapter.get('SELECT 1')
            return true
        } catch (err) {
            this.initialized = false
            throw new Error(`数据库健康检查失败: ${err.message}`)
        }
    }

    /**
     * 启动定期健康检查
     */
    startHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval)
        }

        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.healthCheck()
            } catch (err) {
                globalConfig.warn('[数据库服务] 定期健康检查失败:', err.message)
                this.handleReconnect()
            }
        }, this.healthCheckIntervalMs)
    }

    /**
     * 停止健康检查
     */
    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval)
            this.healthCheckInterval = null
        }
    }

    /**
     * 处理重连逻辑
     */
    async handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            globalConfig.error(`[数据库服务] 重连失败，已达到最大重试次数 (${this.maxReconnectAttempts})`)
            this.reconnectAttempts = 0
            return
        }

        this.reconnectAttempts++
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
        
        globalConfig.warn(`[数据库服务] 尝试重连数据库 (${this.reconnectAttempts}/${this.maxReconnectAttempts})，${delay}ms 后重试...`)
        
        setTimeout(async () => {
            try {
                await this.initialize(1, 0)
                globalConfig.mark('[数据库服务] 数据库重连成功')
            } catch (err) {
                globalConfig.error('[数据库服务] 重连失败:', err.message)
                this.handleReconnect()
            }
        }, delay)
    }

    /**
     * 执行 SQL 语句（无返回值）
     * @param {string} sql SQL 语句
     * @param {...any} params 参数
     * @returns {Promise<Object>} 执行结果 { lastID, changes }
     */
    async run(sql, ...params) {
        if (!this.adapter) {
            throw new Error('数据库未初始化')
        }
        
        try {
            return this.adapter.run(sql, ...params)
        } catch (err) {
            if (this.isConnectionError(err)) {
                await this.handleReconnect()
                return this.adapter.run(sql, ...params)
            }
            throw err
        }
    }

    /**
     * 执行 SQL 查询（返回单行）
     * @param {string} sql SQL 语句
     * @param {...any} params 参数
     * @returns {Promise<Object|null>} 查询结果
     */
    async get(sql, ...params) {
        if (!this.adapter) {
            throw new Error('数据库未初始化')
        }
        
        try {
            return this.adapter.get(sql, ...params)
        } catch (err) {
            if (this.isConnectionError(err)) {
                await this.handleReconnect()
                return this.adapter.get(sql, ...params)
            }
            throw err
        }
    }

    /**
     * 执行 SQL 查询（返回多行）
     * @param {string} sql SQL 语句
     * @param {...any} params 参数
     * @returns {Promise<Array>} 查询结果数组
     */
    async all(sql, ...params) {
        if (!this.adapter) {
            throw new Error('数据库未初始化')
        }
        
        try {
            return this.adapter.all(sql, ...params)
        } catch (err) {
            if (this.isConnectionError(err)) {
                await this.handleReconnect()
                return this.adapter.all(sql, ...params)
            }
            throw err
        }
    }

    /**
     * 判断是否是连接错误
     * @param {Error} error 错误对象
     * @returns {boolean}
     */
    isConnectionError(err) {
        if (!err) return false
        
        const errorMessage = err.message || ''
        const errorCode = err.code || ''
        
        const postgresConnectionErrors = [
            'ECONNREFUSED',
            'ETIMEDOUT',
            'ENOTFOUND',
            '57P01',
            '57P02',
            '57P03',
            '08003',
            '08006',
            '08001',
            '08004'
        ]
        
        const sqliteConnectionErrors = [
            'SQLITE_BUSY',
            'SQLITE_LOCKED',
            'SQLITE_IOERR',
            'SQLITE_CORRUPT',
            'SQLITE_CANTOPEN'
        ]
        
        if (postgresConnectionErrors.includes(errorCode) || 
            sqliteConnectionErrors.includes(errorCode)) {
            return true
        }
        
        const connectionErrorMessages = [
            'connection',
            '连接',
            'connect',
            'ECONNREFUSED',
            'ETIMEDOUT',
            'ENOTFOUND',
            'timeout',
            '超时',
            'closed',
            '关闭',
            'lost',
            '丢失',
            'refused',
            '拒绝'
        ]
        
        return connectionErrorMessages.some(msg => 
            errorMessage.toLowerCase().includes(msg.toLowerCase())
        )
    }

    /**
     * 执行 SQL 语句（用于创建表等）
     * @param {string} sql SQL 语句
     * @returns {Promise<void>}
     */
    async exec(sql) {
        if (!this.adapter) {
            throw new Error('数据库未初始化')
        }
        return this.adapter.exec(sql)
    }

    /**
     * 创建所有表
     */
    async createTables() {
        return this.adapter.createTables()
    }

    async createIndexes() {
        return this.adapter.createIndexes()
    }

    getDatabaseType() {
        if (!this.adapter) {
            return 'sqlite'
        }
        const adapterName = this.adapter.constructor.name
        if (adapterName === 'PostgreSQLAdapter') {
            return 'postgresql'
        } else if (adapterName === 'SQLiteAdapter') {
            return 'sqlite'
        }
        return 'sqlite'
    }

    /**
     * 获取当前时间字符串
     * @returns {string} 时间字符串 (YYYY-MM-DD HH:MM:SS)
     */
    getCurrentTime() {
        return TimeUtils.formatDateTime(TimeUtils.getUTC8Date())
    }

    /**
     * 清理字符串中的 null 字节（0x00），PostgreSQL 不允许 UTF-8 字符串中包含 null 字节
     * @param {string|null|undefined} str 要清理的字符串
     * @returns {string|null} 清理后的字符串，如果输入为 null 或 undefined 则返回 null
     */
    sanitizeString(str) {
        if (str === null || str === undefined) {
            return null
        }
        let cleaned = String(str)
        cleaned = cleaned.replace(/\0/g, '')
        cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '')
        return cleaned
    }

    /**
     * 规范化群 ID
     * @param {any} groupId 群 ID
     * @returns {string}
     */
    normalizeGroupId(groupId) {
        const sanitized = this.sanitizeString(groupId)
        return sanitized ? String(sanitized).trim() : ''
    }

    /**
     * 根据群 ID 生成平台感知的默认群名称
     * @param {any} groupId 群 ID
     * @returns {string}
     */
    getDefaultGroupDisplayName(groupId) {
        const normalizedGroupId = this.normalizeGroupId(groupId)
        if (!normalizedGroupId) return '未知群组'

        if (normalizedGroupId.startsWith('dc_')) {
            const channelId = normalizedGroupId.slice(3) || normalizedGroupId
            return `Discord频道${channelId}`
        }

        if (normalizedGroupId.startsWith('tg_')) {
            const chatId = normalizedGroupId.slice(3) || normalizedGroupId
            return `Telegram群组${chatId}`
        }

        return `群${normalizedGroupId}`
    }

    /**
     * 格式化日期时间为字符串（内部方法）
     * @param {Date|string|null} date 日期对象或字符串
     * @returns {string|null} 格式化后的日期时间字符串
     */
    _formatDateTime(date) {
        if (!date) return null
        if (date instanceof Date) {
            return date.toISOString().replace('T', ' ').substring(0, 19)
        }
        if (typeof date === 'string' && date.trim() !== '') {
            return date
        }
        return null
    }

    /**
     * 解析统计扩展字段
     * @param {string|Object|null} raw 原始 stats_json
     * @returns {Object}
     */
    _parseStatsJson(raw) {
        if (!raw) return {}
        if (typeof raw === 'object') return raw
        if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw)
                return parsed && typeof parsed === 'object' ? parsed : {}
            } catch {
                return {}
            }
        }
        return {}
    }

    /**
     * 将给定时间转换为 UTC+8 时间对象
     * @param {Date|string|number|null} messageTime 时间输入
     * @returns {Date}
     */
    _toUTC8Date(messageTime = null) {
        let sourceDate = null

        if (messageTime instanceof Date) {
            sourceDate = messageTime
        } else if (typeof messageTime === 'number') {
            // 兼容秒级时间戳与毫秒级时间戳
            sourceDate = new Date(messageTime > 1e12 ? messageTime : messageTime * 1000)
        } else if (typeof messageTime === 'string' && messageTime.trim() !== '') {
            const parsed = new Date(messageTime)
            if (!Number.isNaN(parsed.getTime())) {
                sourceDate = parsed
            }
        }

        if (!sourceDate || Number.isNaN(sourceDate.getTime())) {
            return TimeUtils.getUTC8Date()
        }

        const utc8Offset = 8 * 60 * 60 * 1000
        const utc8Timestamp = sourceDate.getTime() + (sourceDate.getTimezoneOffset() * 60 * 1000) + utc8Offset
        return new Date(utc8Timestamp)
    }

    /**
     * 记录单条消息并实时更新聚合表
     * @param {string} groupId 群ID
     * @param {string} userId 用户ID
     * @param {string} nickname 用户昵称
     * @param {number} msgAdd 消息增量
     * @param {number} wordAdd 字数增量
     * @param {Date|string|number|null} messageTime 消息时间
     * @returns {Promise<void>}
     */
    async recordMessage(groupId, userId, nickname = '', msgAdd = 1, wordAdd = 0, messageTime = null) {
        const safeGroupId = this.sanitizeString(groupId) || ''
        const safeUserId = this.sanitizeString(userId) || ''
        const safeNickname = this.sanitizeString(nickname) || ''
        const msgIncrement = Math.max(0, parseInt(msgAdd || 0, 10))
        const wordIncrement = Math.max(0, parseInt(wordAdd || 0, 10))
        const now = this.getCurrentTime()

        if (!safeGroupId || !safeUserId || msgIncrement <= 0) {
            return
        }

        const utc8Date = this._toUTC8Date(messageTime)
        const dayKey = TimeUtils.formatDate(utc8Date)
        const weekKey = TimeUtils.getWeekNumber(utc8Date)
        const monthKey = TimeUtils.getMonthString(utc8Date)
        const yearKey = utc8Date.getFullYear().toString()
        const statHour = `${dayKey} ${String(utc8Date.getHours()).padStart(2, '0')}:00:00`
        const lastSpeakingTime = TimeUtils.formatDateTime(utc8Date)

        // 1) 明细层：小时级聚合写入
        const existedHour = await this.get(
            'SELECT message_count, word_count FROM message_granular_stats WHERE group_id = $1 AND user_id = $2 AND stat_hour = $3',
            safeGroupId,
            safeUserId,
            statHour
        )

        if (existedHour) {
            await this.run(
                `UPDATE message_granular_stats
                 SET message_count = message_count + $1,
                     word_count = word_count + $2,
                     updated_at = $3
                 WHERE group_id = $4 AND user_id = $5 AND stat_hour = $6`,
                msgIncrement,
                wordIncrement,
                now,
                safeGroupId,
                safeUserId,
                statHour
            )
        } else {
            await this.run(
                `INSERT INTO message_granular_stats (
                    group_id, user_id, stat_hour, message_count, word_count, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                safeGroupId,
                safeUserId,
                statHour,
                msgIncrement,
                wordIncrement,
                now,
                now
            )
        }

        // 2) 聚合层：当前周期 + 总量
        const currentAgg = await this.get(
            'SELECT * FROM user_agg_stats WHERE group_id = $1 AND user_id = $2',
            safeGroupId,
            safeUserId
        )

        if (!currentAgg) {
            const statsJson = {
                nickname: safeNickname,
                active_days: 1,
                day_key: dayKey,
                week_key: weekKey,
                month_key: monthKey,
                year_key: yearKey
            }

            await this.run(
                `INSERT INTO user_agg_stats (
                    group_id, user_id,
                    day_msg, day_word, week_msg, week_word, month_msg, month_word, year_msg, year_word,
                    total_msg, total_word, stats_json, continuous_days, last_speaking_time, created_at, updated_at
                ) VALUES (
                    $1, $2,
                    $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17
                )`,
                safeGroupId,
                safeUserId,
                msgIncrement,
                wordIncrement,
                msgIncrement,
                wordIncrement,
                msgIncrement,
                wordIncrement,
                msgIncrement,
                wordIncrement,
                msgIncrement,
                wordIncrement,
                JSON.stringify(statsJson),
                1,
                lastSpeakingTime,
                now,
                now
            )
            return
        }

        const statsJson = this._parseStatsJson(currentAgg.stats_json)
        const previousDayKey = this.sanitizeString(statsJson.day_key) || null
        const yesterday = new Date(utc8Date)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayKey = TimeUtils.formatDate(yesterday)

        const sameDay = statsJson.day_key === dayKey
        const sameWeek = statsJson.week_key === weekKey
        const sameMonth = statsJson.month_key === monthKey
        const sameYear = statsJson.year_key === yearKey

        const dayMsg = (sameDay ? parseInt(currentAgg.day_msg || 0, 10) : 0) + msgIncrement
        const dayWord = (sameDay ? parseInt(currentAgg.day_word || 0, 10) : 0) + wordIncrement
        const weekMsg = (sameWeek ? parseInt(currentAgg.week_msg || 0, 10) : 0) + msgIncrement
        const weekWord = (sameWeek ? parseInt(currentAgg.week_word || 0, 10) : 0) + wordIncrement
        const monthMsg = (sameMonth ? parseInt(currentAgg.month_msg || 0, 10) : 0) + msgIncrement
        const monthWord = (sameMonth ? parseInt(currentAgg.month_word || 0, 10) : 0) + wordIncrement
        const yearMsg = (sameYear ? parseInt(currentAgg.year_msg || 0, 10) : 0) + msgIncrement
        const yearWord = (sameYear ? parseInt(currentAgg.year_word || 0, 10) : 0) + wordIncrement
        const totalMsg = parseInt(currentAgg.total_msg || 0, 10) + msgIncrement
        const totalWord = parseInt(currentAgg.total_word || 0, 10) + wordIncrement

        let continuousDays = parseInt(currentAgg.continuous_days || 0, 10)
        let activeDays = parseInt(statsJson.active_days || 0, 10)
        if (!sameDay) {
            activeDays += 1
            continuousDays = previousDayKey === yesterdayKey ? (continuousDays + 1) : 1
        }

        const mergedStatsJson = {
            ...statsJson,
            nickname: safeNickname || statsJson.nickname || '',
            active_days: Math.max(activeDays, 0),
            day_key: dayKey,
            week_key: weekKey,
            month_key: monthKey,
            year_key: yearKey
        }

        await this.run(
            `UPDATE user_agg_stats
             SET day_msg = $1,
                 day_word = $2,
                 week_msg = $3,
                 week_word = $4,
                 month_msg = $5,
                 month_word = $6,
                 year_msg = $7,
                 year_word = $8,
                 total_msg = $9,
                 total_word = $10,
                 stats_json = $11,
                 continuous_days = $12,
                 last_speaking_time = $13,
                 updated_at = $14
             WHERE group_id = $15 AND user_id = $16`,
            dayMsg,
            dayWord,
            weekMsg,
            weekWord,
            monthMsg,
            monthWord,
            yearMsg,
            yearWord,
            totalMsg,
            totalWord,
            JSON.stringify(mergedStatsJson),
            Math.max(continuousDays, 0),
            lastSpeakingTime,
            now,
            safeGroupId,
            safeUserId
        )
    }

    /**
     * 获取时间维度 SQL 表达式（兼容 PostgreSQL / SQLite）
     * @param {'date'|'week'|'month'|'year'} dimension 维度
     * @param {string} column 时间列名
     * @returns {string}
     */
    _getTimeDimensionExpr(dimension, column = 'stat_hour') {
        const dbType = this.getDatabaseType()
        const safeColumn = column

        if (dbType === 'postgresql') {
            if (dimension === 'date') return `to_char(${safeColumn}, 'YYYY-MM-DD')`
            if (dimension === 'week') return `to_char(${safeColumn}, 'IYYY-"W"IW')`
            if (dimension === 'month') return `to_char(${safeColumn}, 'YYYY-MM')`
            return `to_char(${safeColumn}, 'YYYY')`
        }

        if (dimension === 'date') return `substr(${safeColumn}, 1, 10)`
        if (dimension === 'week') {
            return `printf('%04d-W%02d', CAST(strftime('%Y', ${safeColumn}) AS INTEGER), CAST(strftime('%W', ${safeColumn}) AS INTEGER))`
        }
        if (dimension === 'month') return `substr(${safeColumn}, 1, 7)`
        return `substr(${safeColumn}, 1, 4)`
    }

    /**
     * 活跃天数字段表达式（兼容 PostgreSQL / SQLite）
     * @param {string} tableAlias 表别名
     * @returns {string}
     */
    _getActiveDaysExpr(tableAlias = 'user_agg_stats') {
        const dbType = this.getDatabaseType()
        const prefix = tableAlias ? `${tableAlias}.` : ''
        if (dbType === 'postgresql') {
            return `GREATEST(COALESCE((${prefix}stats_json->>'active_days')::INTEGER, 0), 0)`
        }
        return `COALESCE(CAST(json_extract(${prefix}stats_json, '$.active_days') AS INTEGER), 0)`
    }

    /**
     * 昵称字段表达式（兼容 PostgreSQL / SQLite）
     * @param {string} tableAlias 表别名
     * @returns {string}
     */
    _getNicknameExpr(tableAlias = 'user_agg_stats') {
        const dbType = this.getDatabaseType()
        const prefix = tableAlias ? `${tableAlias}.` : ''
        if (dbType === 'postgresql') {
            return `COALESCE(${prefix}stats_json->>'nickname', '')`
        }
        return `COALESCE(json_extract(${prefix}stats_json, '$.nickname'), '')`
    }

    /**
     * 将 user_agg_stats 行转换为旧字段结构（供上层兼容）
     * @param {Object|null} row 原始行
     * @returns {Object|null}
     */
    _mapUserAggRowToLegacy(row) {
        if (!row) return null

        const statsJson = this._parseStatsJson(row.stats_json)
        const nickname = this.sanitizeString(statsJson.nickname) || ''
        const activeDays = Math.max(parseInt(statsJson.active_days || 0, 10) || 0, 0)

        return {
            ...row,
            nickname,
            total_count: parseInt(row.total_msg || 0, 10),
            total_words: parseInt(row.total_word || 0, 10),
            active_days: activeDays
        }
    }

    /**
     * 将旧排序字段映射到新模型字段
     * @param {string} orderBy 排序字段
     * @returns {string}
     */
    _mapOrderByToAggColumn(orderBy) {
        if (orderBy === 'total_words') return 'total_word'
        if (orderBy === 'continuous_days') return 'continuous_days'
        return 'total_msg'
    }

    // ========== 用户统计相关方法 ==========

    /**
     * 获取用户基础统计
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object|null>} 用户统计数据
     */
    async getUserStats(groupId, userId) {
        const row = await this.get('SELECT * FROM user_agg_stats WHERE group_id = $1 AND user_id = $2', groupId, userId)
        return this._mapUserAggRowToLegacy(row)
    }

    /**
     * 保存或更新用户基础统计（使用 UPSERT 避免并发冲突）
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {Object} stats 统计数据
     * @returns {Promise<boolean>} 是否成功
     */
    async saveUserStats(groupId, userId, stats) {
        const now = this.getCurrentTime()
        const sanitizedGroupId = this.sanitizeString(groupId) || ''
        const sanitizedUserId = this.sanitizeString(userId) || ''
        const sanitizedNickname = this.sanitizeString(stats.nickname) || ''
        
        let lastSpeakingTime = stats.last_speaking_time || null
        if (lastSpeakingTime instanceof Date) {
            lastSpeakingTime = lastSpeakingTime.toISOString()
        } else if (lastSpeakingTime && typeof lastSpeakingTime !== 'string') {
            lastSpeakingTime = String(lastSpeakingTime)
        }
        lastSpeakingTime = this.sanitizeString(lastSpeakingTime)
        
        const existing = await this.get(
            'SELECT * FROM user_agg_stats WHERE group_id = $1 AND user_id = $2',
            sanitizedGroupId,
            sanitizedUserId
        )

        const currentStatsJson = this._parseStatsJson(existing?.stats_json)
        const mergedStatsJson = {
            ...currentStatsJson,
            nickname: sanitizedNickname || currentStatsJson.nickname || '',
            active_days: Math.max(parseInt(stats.active_days || currentStatsJson.active_days || 0, 10) || 0, 0)
        }

        if (existing) {
            await this.run(
                `UPDATE user_agg_stats
                 SET total_msg = $1,
                     total_word = $2,
                     continuous_days = $3,
                     last_speaking_time = $4,
                     stats_json = $5,
                     updated_at = $6
                 WHERE group_id = $7 AND user_id = $8`,
                parseInt(stats.total_count || existing.total_msg || 0, 10),
                parseInt(stats.total_words || existing.total_word || 0, 10),
                parseInt(stats.continuous_days || existing.continuous_days || 0, 10),
                lastSpeakingTime,
                JSON.stringify(mergedStatsJson),
                now,
                sanitizedGroupId,
                sanitizedUserId
            )
        } else {
            await this.run(
                `INSERT INTO user_agg_stats (
                    group_id, user_id,
                    day_msg, day_word, week_msg, week_word, month_msg, month_word, year_msg, year_word,
                    total_msg, total_word, stats_json, continuous_days, last_speaking_time, created_at, updated_at
                ) VALUES (
                    $1, $2,
                    0, 0, 0, 0, 0, 0, 0, 0,
                    $3, $4, $5, $6, $7, $8, $9
                )`,
                sanitizedGroupId,
                sanitizedUserId,
                parseInt(stats.total_count || 0, 10),
                parseInt(stats.total_words || 0, 10),
                JSON.stringify(mergedStatsJson),
                parseInt(stats.continuous_days || 0, 10),
                lastSpeakingTime,
                now,
                now
            )
        }

        return true
    }

    /**
     * 更新用户统计（部分字段）
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {Object} updates 要更新的字段
     * @returns {Promise<boolean>} 是否成功
     */
    async updateUserStats(groupId, userId, updates) {
        if (!updates || Object.keys(updates).length === 0) {
            return true
        }

        const current = await this.get('SELECT * FROM user_agg_stats WHERE group_id = $1 AND user_id = $2', groupId, userId)
        if (!current) {
            return this.saveUserStats(groupId, userId, updates)
        }

        const now = this.getCurrentTime()
        const setParts = []
        const values = []
        let paramIndex = 1
        const statsJson = this._parseStatsJson(current.stats_json)

        const columnMap = {
            total_count: 'total_msg',
            total_words: 'total_word',
            continuous_days: 'continuous_days',
            last_speaking_time: 'last_speaking_time',
            day_msg: 'day_msg',
            day_word: 'day_word',
            week_msg: 'week_msg',
            week_word: 'week_word',
            month_msg: 'month_msg',
            month_word: 'month_word',
            year_msg: 'year_msg',
            year_word: 'year_word'
        }

        for (const [key, value] of Object.entries(updates)) {
            if (key === 'nickname') {
                statsJson.nickname = this.sanitizeString(value) || ''
                continue
            }
            if (key === 'active_days') {
                statsJson.active_days = Math.max(parseInt(value || 0, 10) || 0, 0)
                continue
            }

            const targetColumn = columnMap[key]
            if (!targetColumn) continue

            let convertedValue = value
            if (value instanceof Date) {
                convertedValue = value.toISOString()
            } else if (value === null || value === undefined) {
                convertedValue = null
            } else if (typeof value === 'string' && /^[0-9]+$/.test(value)) {
                convertedValue = parseInt(value, 10)
            }

            setParts.push(`${targetColumn} = $${paramIndex++}`)
            values.push(convertedValue)
        }

        setParts.push(`stats_json = $${paramIndex++}`)
        values.push(JSON.stringify(statsJson))

        setParts.push(`updated_at = $${paramIndex++}`)
        values.push(now)

        const whereParam1 = paramIndex++
        const whereParam2 = paramIndex
        values.push(groupId, userId)

        const sql = `UPDATE user_agg_stats SET ${setParts.join(', ')} WHERE group_id = $${whereParam1} AND user_id = $${whereParam2}`
        await this.run(sql, ...values)
        return true
    }

    /**
     * 获取群组所有用户
     * @param {string} groupId 群号
     * @returns {Promise<Array>} 用户统计数组
     */
    async getAllGroupUsers(groupId) {
        const rows = await this.all(
            'SELECT * FROM user_agg_stats WHERE group_id = $1 ORDER BY total_msg DESC',
            groupId
        )
        return rows.map(row => this._mapUserAggRowToLegacy(row))
    }

    async getAllGroupIds() {
        const rows = await this.all('SELECT DISTINCT group_id FROM user_agg_stats')
        return rows.map(row => row.group_id)
    }

    /**
     * 批量获取所有群组的用户统计数据（优化总统计查询）
     * @returns {Promise<Map<string, Array>>} 群ID到用户列表的映射
     */
    async getAllGroupsUsersBatch() {
        const rows = await this.all('SELECT * FROM user_agg_stats ORDER BY group_id, total_msg DESC')
        const groupsMap = new Map()
        
        for (const row of rows) {
            const groupId = row.group_id
            if (!groupsMap.has(groupId)) {
                groupsMap.set(groupId, [])
            }
            groupsMap.get(groupId).push(this._mapUserAggRowToLegacy(row))
        }
        
        return groupsMap
    }

    /**
     * 批量获取所有群组的日统计数据（优化总统计查询）
     * @param {string} dateKey 日期键
     * @returns {Promise<Map<string, Array>>} 群ID到日统计列表的映射
     */
    async getAllGroupsDailyStatsBatch(dateKey) {
        const dateExpr = this._getTimeDimensionExpr('date', 'mgs.stat_hour')
        const nicknameExpr = this._getNicknameExpr('uas')
        const rows = await this.all(
            `SELECT 
                mgs.group_id,
                mgs.user_id,
                ${dateExpr} as date_key,
                SUM(mgs.message_count) as message_count,
                SUM(mgs.word_count) as word_count,
                MIN(mgs.created_at) as created_at,
                MAX(mgs.updated_at) as updated_at,
                MAX(${nicknameExpr}) as nickname,
                MAX(uas.last_speaking_time) as last_speaking_time
             FROM message_granular_stats mgs
             LEFT JOIN user_agg_stats uas ON mgs.group_id = uas.group_id AND mgs.user_id = uas.user_id
             WHERE ${dateExpr} = $1
               AND (mgs.message_count > 0 OR mgs.word_count > 0)
             GROUP BY mgs.group_id, mgs.user_id, ${dateExpr}
             ORDER BY mgs.group_id, message_count DESC`,
            dateKey
        )
        const groupsMap = new Map()
        
        for (const row of rows) {
            const groupId = row.group_id
            if (!groupsMap.has(groupId)) {
                groupsMap.set(groupId, [])
            }
            groupsMap.get(groupId).push({
                ...row,
                nickname: this.sanitizeString(row.nickname) || ''
            })
        }
        
        return groupsMap
    }

    /**
     * 批量获取所有群组的月统计数据（优化总统计查询）
     * @param {string} monthKey 月份键
     * @returns {Promise<Map<string, Array>>} 群ID到月统计列表的映射
     */
    async getAllGroupsMonthlyStatsBatch(monthKey) {
        const monthExpr = this._getTimeDimensionExpr('month', 'mgs.stat_hour')
        const nicknameExpr = this._getNicknameExpr('uas')
        const rows = await this.all(
            `SELECT 
                mgs.group_id,
                mgs.user_id,
                ${monthExpr} as month_key,
                SUM(mgs.message_count) as message_count,
                SUM(mgs.word_count) as word_count,
                MIN(mgs.created_at) as created_at,
                MAX(mgs.updated_at) as updated_at,
                MAX(${nicknameExpr}) as nickname,
                MAX(uas.last_speaking_time) as last_speaking_time
             FROM message_granular_stats mgs
             LEFT JOIN user_agg_stats uas ON mgs.group_id = uas.group_id AND mgs.user_id = uas.user_id
             WHERE ${monthExpr} = $1
               AND (mgs.message_count > 0 OR mgs.word_count > 0)
             GROUP BY mgs.group_id, mgs.user_id, ${monthExpr}
             ORDER BY mgs.group_id, message_count DESC`,
            monthKey
        )
        const groupsMap = new Map()
        
        for (const row of rows) {
            const groupId = row.group_id
            if (!groupsMap.has(groupId)) {
                groupsMap.set(groupId, [])
            }
            groupsMap.get(groupId).push({
                ...row,
                nickname: this.sanitizeString(row.nickname) || ''
            })
        }
        
        return groupsMap
    }

    /**
     * 批量获取所有群组信息（优化总统计查询）
     * @returns {Promise<Map<string, string>>} 群ID到群名称的映射
     */
    async getAllGroupsInfoBatch() {
        const rows = await this.all('SELECT group_id, group_name FROM group_info')
        const groupsMap = new Map()
        
        for (const row of rows) {
            if (row.group_name) {
                groupsMap.set(row.group_id, row.group_name)
            }
        }
        
        return groupsMap
    }

    /**
     * 归档群组数据（移到暂存表，不删除）
     * @param {string} groupId 群组ID
     * @returns {Promise<boolean>} 是否成功
     */
    async archiveGroupData(groupId) {
        try {
            const existing = await this.get('SELECT group_id FROM archived_groups WHERE group_id = $1', groupId)
            const groupInfo = await this.get('SELECT * FROM group_info WHERE group_id = $1', groupId)
            const groupName = this.sanitizeString(groupInfo?.group_name) || ''
            const archivedGroupName = groupName || String(groupId)
            // 归档前保证 group_info 中至少有一条群信息，便于后续展示
            if (!groupInfo) {
                await this.saveGroupInfo(groupId, archivedGroupName)
            }

            const lastActivity = await this.get(
                'SELECT MAX(updated_at) as last_activity FROM user_agg_stats WHERE group_id = $1',
                groupId
            )
            const lastActivityAt = this._formatDateTime(lastActivity?.last_activity)
            const now = this.getCurrentTime()

            if (existing) {
                await this.run(`
                    UPDATE archived_groups 
                    SET archived_at = $1,
                        last_activity_at = COALESCE($2, archived_groups.last_activity_at),
                        group_name = COALESCE(NULLIF($3, ''), archived_groups.group_name)
                    WHERE group_id = $4
                `, now, lastActivityAt, archivedGroupName, groupId)
                } else {
            await this.run(`
                INSERT INTO archived_groups (group_id, group_name, archived_at, last_activity_at)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (group_id) 
                DO UPDATE SET 
                    archived_at = EXCLUDED.archived_at,
                    last_activity_at = COALESCE(EXCLUDED.last_activity_at, archived_groups.last_activity_at),
                    group_name = COALESCE(NULLIF(EXCLUDED.group_name, ''), archived_groups.group_name)
                `, groupId, archivedGroupName, now, lastActivityAt)
            }
            
            return true
        } catch (err) {
            throw new Error(`归档群组数据失败: ${err.message}`)
        }
    }

    /**
     * 恢复归档的群组数据
     * @param {string} groupId 群组ID
     * @returns {Promise<boolean>} 是否成功
     */
    async restoreGroupData(groupId) {
        try {
            // 检查是否在归档表中
            const archived = await this.get('SELECT * FROM archived_groups WHERE group_id = $1', groupId)
            if (!archived) {
                return false
            }
            
            await this.run('DELETE FROM archived_groups WHERE group_id = $1', groupId)
            return true
        } catch (err) {
            throw new Error(`恢复群组数据失败: ${err.message}`)
        }
    }

    /**
     * 检查群组是否已归档
     * @param {string} groupId 群组ID
     * @returns {Promise<boolean>} 是否已归档
     */
    async isGroupArchived(groupId) {
        try {
            const archived = await this.get('SELECT group_id FROM archived_groups WHERE group_id = $1', groupId)
            return !!archived
        } catch {
            return false
        }
    }

    /**
     * 永久删除群组数据（从归档表中删除超过60天的群组）
     * @param {string} groupId 群组ID
     * @returns {Promise<boolean>} 是否成功
     */
    async deleteGroupData(groupId) {
        try {
            // 新架构仅保留真实表，归档删除直接清理各业务表
            await this.run('DELETE FROM message_granular_stats WHERE group_id = $1', groupId)
            await this.run('DELETE FROM user_agg_stats WHERE group_id = $1', groupId)
            await this.run('DELETE FROM group_info WHERE group_id = $1', groupId)
            await this.run('DELETE FROM archived_groups WHERE group_id = $1', groupId)
            return true
        } catch (err) {
            throw new Error(`删除群组数据失败: ${err.message}`)
        }
    }

    /**
     * 清理超过指定天数的归档群组（定时任务）
     * 只清理归档时间超过指定天数且最后活动时间也超过指定天数的群组
     * @param {number} retentionDays 保留天数（默认60天）
     * @returns {Promise<number>} 清理的群组数量
     */
    async cleanupArchivedGroups(retentionDays = 60) {
        try {
            const safeRetentionDays = Math.max(parseInt(retentionDays || 60, 10), 1)
            const cutoffDate = TimeUtils.getUTC8Date()
            cutoffDate.setDate(cutoffDate.getDate() - safeRetentionDays)
            cutoffDate.setMilliseconds(0)
            const cutoffDateStr = TimeUtils.formatDateTime(cutoffDate)
            
            const groupsToDelete = await this.all(
                `SELECT group_id FROM archived_groups 
                 WHERE archived_at < $1 
                 AND (last_activity_at IS NULL OR last_activity_at < $1)`,
                cutoffDateStr
            )
            
            let deletedCount = 0
            for (const group of groupsToDelete) {
                try {
                    await this.deleteGroupData(group.group_id)
                    deletedCount++
                    if (globalConfig.getConfig('global.debugLog')) {
                        globalConfig.debug(`已永久删除归档群组: ${group.group_id}`)
                    }
                } catch (err) {
                    globalConfig.error(`清理归档群组失败: ${group.group_id}`, err)
                }
            }
            
            return deletedCount
        } catch (err) {
            globalConfig.error('清理归档群组失败:', err)
            return 0
        }
    }

    /**
     * 更新归档群组的最后活动时间
     * @param {string} groupId 群组ID
     * @returns {Promise<boolean>} 是否成功
     */
    async updateArchivedGroupActivity(groupId) {
        try {
            const now = this.getCurrentTime()
            await this.run(
                `UPDATE archived_groups 
                 SET last_activity_at = $1 
                 WHERE group_id = $2`,
                now,
                groupId
            )
            return true
        } catch {
            return false
        }
    }

    /**
     * 获取归档群组列表
     * @param {number} limit 限制数量，默认50
     * @param {number} offset 偏移量，默认0
     * @returns {Promise<Array>} 归档群组列表
     */
    async getArchivedGroups(limit = 50, offset = 0) {
        try {
            const groups = await this.all(
                `SELECT group_id, group_name, archived_at, last_activity_at 
                 FROM archived_groups 
                 ORDER BY archived_at DESC 
                 LIMIT $1 OFFSET $2`,
                limit,
                offset
            )
            return groups || []
        } catch (err) {
            throw new Error(`获取归档群组列表失败: ${err.message}`)
        }
    }

    /**
     * 获取归档群组总数
     * @returns {Promise<number>} 归档群组总数
     */
    async getArchivedGroupsCount() {
        try {
            const result = await this.get('SELECT COUNT(*) as count FROM archived_groups')
            return parseInt(result?.count || 0, 10)
        } catch (err) {
            throw new Error(`获取归档群组总数失败: ${err.message}`)
        }
    }

    /**
     * 获取群组排行榜
     * @param {string} groupId 群号
     * @param {number} limit 限制数量
     * @param {string} orderBy 排序字段
     * @returns {Promise<Array>} 排行榜数据
     */
    async getTopUsers(groupId, limit, orderBy = 'total_count') {
        const allowedColumns = ['total_count', 'total_words', 'active_days', 'continuous_days']
        if (!allowedColumns.includes(orderBy)) {
            orderBy = 'total_count'
        }
        const activeDaysExpr = this._getActiveDaysExpr('user_agg_stats')
        const mappedOrderBy = orderBy === 'active_days'
            ? activeDaysExpr
            : this._mapOrderByToAggColumn(orderBy)

        const rows = await this.all(
            `SELECT * FROM user_agg_stats WHERE group_id = $1 ORDER BY ${mappedOrderBy} DESC LIMIT $2`,
            groupId,
            limit
        )

        return rows.map(row => this._mapUserAggRowToLegacy(row))
    }

    /**
     * 获取所有群聊的排行榜（用于总榜）
     * @param {number} limit 限制数量
     * @param {string} orderBy 排序字段
     * @param {string[]|null} currentGroupIds 仅统计这些群（与群列表一致）；null 则仅排除归档
     * @returns {Promise<Array>} 排行榜数据（按用户ID聚合）
     */
    async getTopUsersAllGroups(limit, orderBy = 'total_count', currentGroupIds = null) {
        const allowedColumns = ['total_count', 'total_words', 'active_days', 'continuous_days']
        if (!allowedColumns.includes(orderBy)) {
            orderBy = 'total_count'
        }
        const mappedOrderBy = this._mapOrderByToAggColumn(orderBy)
        const dateExpr = this._getTimeDimensionExpr('date', 'mgs.stat_hour')
        const dbType = this.getDatabaseType()
        const nicknameExpr = dbType === 'postgresql'
            ? `COALESCE(uas.stats_json->>'nickname', '')`
            : `COALESCE(json_extract(uas.stats_json, '$.nickname'), '')`
        const groupFilter =
            currentGroupIds && currentGroupIds.length > 0
                ? ` AND uas.group_id IN (${currentGroupIds.map((_, i) => `$${i + 1}`).join(',')})`
                : ''
        const groupFilterForMgs =
            currentGroupIds && currentGroupIds.length > 0
                ? ` AND mgs.group_id IN (${currentGroupIds.map((_, i) => `$${i + 1}`).join(',')})`
                : ''
        const baseParams = currentGroupIds && currentGroupIds.length > 0 ? currentGroupIds : []
        const limitParamIndex = baseParams.length + 1
        const sql = `WITH user_aggregated AS (
                SELECT
                    uas.user_id,
                    MAX(${nicknameExpr}) as nickname,
                    SUM(uas.total_msg) as total_count,
                    SUM(uas.total_word) as total_words,
                    MAX(uas.continuous_days) as continuous_days,
                    MAX(uas.last_speaking_time) as last_speaking_time
                FROM user_agg_stats uas
                WHERE uas.group_id NOT IN (SELECT group_id FROM archived_groups)${groupFilter}
                GROUP BY uas.user_id
            ),
            active_days_stats AS (
                SELECT mgs.user_id, COUNT(DISTINCT ${dateExpr}) as active_days
                FROM message_granular_stats mgs
                WHERE (mgs.message_count > 0 OR mgs.word_count > 0)
                  AND mgs.group_id NOT IN (SELECT group_id FROM archived_groups)${groupFilterForMgs}
                GROUP BY mgs.user_id
            )
            SELECT
                ua.user_id,
                ua.nickname,
                ua.total_count,
                ua.total_words,
                COALESCE(ads.active_days, 0) as active_days,
                ua.continuous_days,
                ua.last_speaking_time
            FROM user_aggregated ua
            LEFT JOIN active_days_stats ads ON ua.user_id = ads.user_id
            ORDER BY ${orderBy === 'active_days' ? 'COALESCE(ads.active_days, 0)' : `ua.${mappedOrderBy === 'total_msg' ? 'total_count' : mappedOrderBy === 'total_word' ? 'total_words' : 'continuous_days'}`} DESC
            LIMIT $${limitParamIndex}`
        return this.all(sql, ...baseParams, limit)
    }

    // ========== 日统计相关方法 ==========

    /**
     * 获取日统计
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} dateKey 日期键 (YYYY-MM-DD)
     * @returns {Promise<Object|null>} 日统计数据
     */
    async getDailyStats(groupId, userId, dateKey) {
        const dateExpr = this._getTimeDimensionExpr('date', 'mgs.stat_hour')
        return this.get(
            `SELECT
                mgs.group_id,
                mgs.user_id,
                ${dateExpr} as date_key,
                SUM(mgs.message_count) as message_count,
                SUM(mgs.word_count) as word_count,
                MIN(mgs.created_at) as created_at,
                MAX(mgs.updated_at) as updated_at
             FROM message_granular_stats mgs
             WHERE mgs.group_id = $1 AND mgs.user_id = $2 AND ${dateExpr} = $3
             GROUP BY mgs.group_id, mgs.user_id, ${dateExpr}`,
            groupId,
            userId,
            dateKey
        )
    }

    /**
     * 保存或更新日统计（使用 UPSERT 避免并发冲突）
     * 注意：stats 中传入的是累计值（已在内存中累加），直接使用 EXCLUDED 值进行覆盖
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} dateKey 日期键
     * @param {Object} stats 统计数据（累计值）
     * @returns {Promise<boolean>} 是否成功
     */
    async saveDailyStats(groupId, userId, dateKey, stats) {
        // 重构阶段兼容：旧接口保留但不再直接写入旧周期表/视图
        return true
    }

    /**
     * 获取日期范围内的日统计数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} startDate 开始日期 (YYYY-MM-DD)
     * @param {string} endDate 结束日期 (YYYY-MM-DD)
     * @returns {Promise<Array>} 日统计数据数组
     */
    async getDailyStatsByDateRange(groupId, userId, startDate, endDate) {
        const dateExpr = this._getTimeDimensionExpr('date', 'mgs.stat_hour')
        return this.all(
            `SELECT
                mgs.group_id,
                mgs.user_id,
                ${dateExpr} as date_key,
                SUM(mgs.message_count) as message_count,
                SUM(mgs.word_count) as word_count,
                MIN(mgs.created_at) as created_at,
                MAX(mgs.updated_at) as updated_at
             FROM message_granular_stats mgs
             WHERE mgs.group_id = $1
               AND mgs.user_id = $2
               AND ${dateExpr} >= $3
               AND ${dateExpr} <= $4
             GROUP BY mgs.group_id, mgs.user_id, ${dateExpr}
             ORDER BY date_key`,
            groupId,
            userId,
            startDate,
            endDate
        )
    }

    /**
     * 批量获取日统计（优化性能，避免 N+1 查询）
     * @param {string} groupId 群号
     * @param {string} dateKey 日期键（格式：YYYY-MM-DD）
     * @returns {Promise<Array>} 日统计数据列表（已排序）
     */
    async getDailyStatsByGroupAndDate(groupId, dateKey) {
        const dateExpr = this._getTimeDimensionExpr('date', 'mgs.stat_hour')
        const nicknameExpr = this._getNicknameExpr('uas')
        const rows = await this.all(
            `SELECT
                mgs.group_id,
                mgs.user_id,
                ${dateExpr} as date_key,
                SUM(mgs.message_count) as message_count,
                SUM(mgs.word_count) as word_count,
                MIN(mgs.created_at) as created_at,
                MAX(mgs.updated_at) as updated_at,
                MAX(${nicknameExpr}) as nickname,
                MAX(uas.last_speaking_time) as last_speaking_time
             FROM message_granular_stats mgs
             LEFT JOIN user_agg_stats uas ON mgs.group_id = uas.group_id AND mgs.user_id = uas.user_id
             WHERE mgs.group_id = $1
               AND ${dateExpr} = $2
               AND (mgs.message_count > 0 OR mgs.word_count > 0)
             GROUP BY mgs.group_id, mgs.user_id, ${dateExpr}
             ORDER BY message_count DESC`,
            groupId,
            dateKey
        )

        return rows.map(row => {
            return {
                ...row,
                nickname: this.sanitizeString(row.nickname) || ''
            }
        })
    }

    // ========== 周统计相关方法 ==========

    /**
     * 获取周统计
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} weekKey 周键 (YYYY-W##)
     * @returns {Promise<Object|null>} 周统计数据
     */
    async getWeeklyStats(groupId, userId, weekKey) {
        const weekExpr = this._getTimeDimensionExpr('week', 'mgs.stat_hour')
        return this.get(
            `SELECT
                mgs.group_id,
                mgs.user_id,
                ${weekExpr} as week_key,
                SUM(mgs.message_count) as message_count,
                SUM(mgs.word_count) as word_count,
                MIN(mgs.created_at) as created_at,
                MAX(mgs.updated_at) as updated_at
             FROM message_granular_stats mgs
             WHERE mgs.group_id = $1 AND mgs.user_id = $2 AND ${weekExpr} = $3
             GROUP BY mgs.group_id, mgs.user_id, ${weekExpr}`,
            groupId,
            userId,
            weekKey
        )
    }

    /**
     * 保存或更新周统计（使用 UPSERT 避免并发冲突）
     * 注意：stats 中传入的是累计值（已在内存中累加），直接使用 EXCLUDED 值进行覆盖
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} weekKey 周键
     * @param {Object} stats 统计数据（累计值）
     * @returns {Promise<boolean>} 是否成功
     */
    async saveWeeklyStats(groupId, userId, weekKey, stats) {
        // 重构阶段兼容：旧接口保留但不再直接写入旧周期表/视图
        return true
    }

    /**
     * 批量获取周统计（优化性能，避免 N+1 查询）
     * @param {string} groupId 群号
     * @param {string} weekKey 周键（格式：YYYY-WW）
     * @returns {Promise<Array>} 周统计数据列表（已排序）
     */
    async getWeeklyStatsByGroupAndWeek(groupId, weekKey) {
        const weekExpr = this._getTimeDimensionExpr('week', 'mgs.stat_hour')
        const nicknameExpr = this._getNicknameExpr('uas')
        const rows = await this.all(
            `SELECT
                mgs.group_id,
                mgs.user_id,
                ${weekExpr} as week_key,
                SUM(mgs.message_count) as message_count,
                SUM(mgs.word_count) as word_count,
                MIN(mgs.created_at) as created_at,
                MAX(mgs.updated_at) as updated_at,
                MAX(${nicknameExpr}) as nickname,
                MAX(uas.last_speaking_time) as last_speaking_time
             FROM message_granular_stats mgs
             LEFT JOIN user_agg_stats uas ON mgs.group_id = uas.group_id AND mgs.user_id = uas.user_id
             WHERE mgs.group_id = $1
               AND ${weekExpr} = $2
               AND (mgs.message_count > 0 OR mgs.word_count > 0)
             GROUP BY mgs.group_id, mgs.user_id, ${weekExpr}
             ORDER BY message_count DESC`,
            groupId,
            weekKey
        )

        return rows.map(row => {
            return {
                ...row,
                nickname: this.sanitizeString(row.nickname) || ''
            }
        })
    }

    // ========== 月统计相关方法 ==========

    /**
     * 获取月统计
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} monthKey 月键 (YYYY-MM)
     * @returns {Promise<Object|null>} 月统计数据
     */
    async getMonthlyStats(groupId, userId, monthKey) {
        const monthExpr = this._getTimeDimensionExpr('month', 'mgs.stat_hour')
        return this.get(
            `SELECT
                mgs.group_id,
                mgs.user_id,
                ${monthExpr} as month_key,
                SUM(mgs.message_count) as message_count,
                SUM(mgs.word_count) as word_count,
                MIN(mgs.created_at) as created_at,
                MAX(mgs.updated_at) as updated_at
             FROM message_granular_stats mgs
             WHERE mgs.group_id = $1 AND mgs.user_id = $2 AND ${monthExpr} = $3
             GROUP BY mgs.group_id, mgs.user_id, ${monthExpr}`,
            groupId,
            userId,
            monthKey
        )
    }

    /**
     * 保存或更新月统计（使用 UPSERT 避免并发冲突）
     * 注意：stats 中传入的是累计值（已在内存中累加），直接使用 EXCLUDED 值进行覆盖
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} monthKey 月键
     * @param {Object} stats 统计数据（累计值）
     * @returns {Promise<boolean>} 是否成功
     */
    async saveMonthlyStats(groupId, userId, monthKey, stats) {
        // 重构阶段兼容：旧接口保留但不再直接写入旧周期表/视图
        return true
    }

    /**
     * 批量获取月统计（优化性能，避免 N+1 查询）
     * @param {string} groupId 群号
     * @param {string} monthKey 月键（格式：YYYY-MM）
     * @returns {Promise<Array>} 月统计数据列表（已排序）
     */
    async getMonthlyStatsByGroupAndMonth(groupId, monthKey) {
        const monthExpr = this._getTimeDimensionExpr('month', 'mgs.stat_hour')
        const nicknameExpr = this._getNicknameExpr('uas')
        const rows = await this.all(
            `SELECT
                mgs.group_id,
                mgs.user_id,
                ${monthExpr} as month_key,
                SUM(mgs.message_count) as message_count,
                SUM(mgs.word_count) as word_count,
                MIN(mgs.created_at) as created_at,
                MAX(mgs.updated_at) as updated_at,
                MAX(${nicknameExpr}) as nickname,
                MAX(uas.last_speaking_time) as last_speaking_time
             FROM message_granular_stats mgs
             LEFT JOIN user_agg_stats uas ON mgs.group_id = uas.group_id AND mgs.user_id = uas.user_id
             WHERE mgs.group_id = $1
               AND ${monthExpr} = $2
               AND (mgs.message_count > 0 OR mgs.word_count > 0)
             GROUP BY mgs.group_id, mgs.user_id, ${monthExpr}
             ORDER BY message_count DESC`,
            groupId,
            monthKey
        )

        return rows.map(row => {
            return {
                ...row,
                nickname: this.sanitizeString(row.nickname) || ''
            }
        })
    }

    // ========== 年统计相关方法 ==========

    /**
     * 获取年统计
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} yearKey 年键 (YYYY)
     * @returns {Promise<Object|null>} 年统计数据
     */
    async getYearlyStats(groupId, userId, yearKey) {
        const yearExpr = this._getTimeDimensionExpr('year', 'mgs.stat_hour')
        return this.get(
            `SELECT
                mgs.group_id,
                mgs.user_id,
                ${yearExpr} as year_key,
                SUM(mgs.message_count) as message_count,
                SUM(mgs.word_count) as word_count,
                MIN(mgs.created_at) as created_at,
                MAX(mgs.updated_at) as updated_at
             FROM message_granular_stats mgs
             WHERE mgs.group_id = $1 AND mgs.user_id = $2 AND ${yearExpr} = $3
             GROUP BY mgs.group_id, mgs.user_id, ${yearExpr}`,
            groupId,
            userId,
            yearKey
        )
    }

    /**
     * 保存或更新年统计（使用 UPSERT 避免并发冲突）
     * 注意：stats 中传入的是累计值（已在内存中累加），直接使用 EXCLUDED 值进行覆盖
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} yearKey 年键
     * @param {Object} stats 统计数据（累计值）
     * @returns {Promise<boolean>} 是否成功
     */
    async saveYearlyStats(groupId, userId, yearKey, stats) {
        // 重构阶段兼容：旧接口保留但不再直接写入旧周期表/视图
        return true
    }

    /**
     * 批量获取年统计（优化性能，避免 N+1 查询）
     * @param {string} groupId 群号
     * @param {string} yearKey 年键（格式：YYYY）
     * @returns {Promise<Array>} 年统计数据列表（已排序）
     */
    async getYearlyStatsByGroupAndYear(groupId, yearKey) {
        const yearExpr = this._getTimeDimensionExpr('year', 'mgs.stat_hour')
        const nicknameExpr = this._getNicknameExpr('uas')
        const rows = await this.all(
            `SELECT
                mgs.group_id,
                mgs.user_id,
                ${yearExpr} as year_key,
                SUM(mgs.message_count) as message_count,
                SUM(mgs.word_count) as word_count,
                MIN(mgs.created_at) as created_at,
                MAX(mgs.updated_at) as updated_at,
                MAX(${nicknameExpr}) as nickname,
                MAX(uas.last_speaking_time) as last_speaking_time
             FROM message_granular_stats mgs
             LEFT JOIN user_agg_stats uas ON mgs.group_id = uas.group_id AND mgs.user_id = uas.user_id
             WHERE mgs.group_id = $1
               AND ${yearExpr} = $2
               AND (mgs.message_count > 0 OR mgs.word_count > 0)
             GROUP BY mgs.group_id, mgs.user_id, ${yearExpr}
             ORDER BY message_count DESC`,
            groupId,
            yearKey
        )

        return rows.map(row => {
            return {
                ...row,
                nickname: this.sanitizeString(row.nickname) || ''
            }
        })
    }

    /**
     * 获取用户所在的所有群列表
     * @param {string} userId 用户ID
     * @returns {Promise<Array<string>>} 群ID数组
     */
    async getUserGroups(userId) {
        const rows = await this.all(
            `SELECT DISTINCT group_id
             FROM user_agg_stats
             WHERE user_id = $1
               AND group_id NOT IN (SELECT group_id FROM archived_groups)`,
            userId
        )
        return rows.map(row => row.group_id)
    }

    // ========== 群组信息相关方法 ==========

    /**
     * 获取群组信息
     * @param {string} groupId 群号
     * @returns {Promise<Object|null>} 群组信息
     */
    async getGroupInfo(groupId) {
        const normalizedGroupId = this.normalizeGroupId(groupId)
        if (!normalizedGroupId) return null
        return this.get(
            'SELECT * FROM group_info WHERE group_id = $1',
            normalizedGroupId
        )
    }

    /**
     * 获取格式化的群名称（如果不存在则返回默认格式）
     * @param {string} groupId 群号
     * @returns {Promise<string>} 群名称
     */
    async getFormattedGroupName(groupId) {
        const normalizedGroupId = this.normalizeGroupId(groupId)
        try {
            const groupInfo = await this.getGroupInfo(normalizedGroupId)
            const groupName = this.sanitizeString(groupInfo?.group_name)?.trim() || ''
            return groupName || this.getDefaultGroupDisplayName(normalizedGroupId)
        } catch {
            return this.getDefaultGroupDisplayName(normalizedGroupId)
        }
    }

    /**
     * 保存或更新群组信息
     * @param {string} groupId 群号
     * @param {string} groupName 群名称
     * @returns {Promise<boolean>} 是否成功
     */
    async saveGroupInfo(groupId, groupName) {
        const normalizedGroupId = this.normalizeGroupId(groupId)
        if (!normalizedGroupId) return false

        const now = this.getCurrentTime()
        const normalizedGroupName = this.sanitizeString(groupName)?.trim() || ''
        
        await this.run(`
            INSERT INTO group_info (
                group_id, group_name, created_at, updated_at
            ) VALUES ($1, $2, $3, $4)
            ON CONFLICT (group_id) 
            DO UPDATE SET
                group_name = COALESCE(NULLIF(EXCLUDED.group_name, ''), group_info.group_name),
                updated_at = EXCLUDED.updated_at
        `,
            normalizedGroupId,
            normalizedGroupName,
            now,
            now
        )

        return true
    }

    /**
     * 获取群组最早统计时间（从用户统计数据中）
     * @param {string} groupId 群号
     * @returns {Promise<string|null>} 最早创建时间
     */
    async getGroupEarliestTime(groupId) {
        const result = await this.get('SELECT MIN(created_at) as earliest_time FROM user_agg_stats WHERE group_id = $1', groupId)
        return result?.earliest_time || null
    }

    /**
     * 获取用户在所有群聊的统计数据总和
     * @param {string} userId 用户ID
     * @returns {Promise<Object|null>} 用户统计数据总和
     */
    async getUserStatsAllGroups(userId) {
        const dbType = this.getDatabaseType()
        const nicknameExpr = dbType === 'postgresql'
            ? `COALESCE(stats_json->>'nickname', '')`
            : `COALESCE(json_extract(stats_json, '$.nickname'), '')`
        const dateExpr = this._getTimeDimensionExpr('date', 'stat_hour')

        const baseStats = await this.get(`
            SELECT
                user_id,
                MAX(${nicknameExpr}) as nickname,
                SUM(total_msg) as total_count,
                SUM(total_word) as total_words,
                MAX(continuous_days) as continuous_days,
                MAX(last_speaking_time) as last_speaking_time
            FROM user_agg_stats
            WHERE user_id = $1
            GROUP BY user_id
        `, userId)
        
        const activeDaysResult = await this.get(`
            SELECT COUNT(DISTINCT ${dateExpr}) as active_days
            FROM message_granular_stats
            WHERE user_id = $1 AND (message_count > 0 OR word_count > 0)
        `, userId)
        
        const activeDays = activeDaysResult?.active_days || 0
        
        if (!baseStats) {
            if (activeDays > 0) {
                const dailyStatsSum = await this.get(`
                    SELECT 
                        SUM(message_count) as total_count,
                        SUM(word_count) as total_words,
                        MAX(updated_at) as last_speaking_time
                    FROM message_granular_stats
                    WHERE user_id = $1
                `, userId)
                
                if (dailyStatsSum && (dailyStatsSum.total_count > 0 || dailyStatsSum.total_words > 0)) {
                    return {
                        user_id: userId,
                        nickname: null,
                        total_count: parseInt(dailyStatsSum.total_count || 0, 10),
                        total_words: parseInt(dailyStatsSum.total_words || 0, 10),
                        active_days: activeDays,
                        continuous_days: 0,
                        last_speaking_time: dailyStatsSum.last_speaking_time || null
                    }
                }
            }
            return null
        }
        
        baseStats.active_days = activeDays
        baseStats.total_count = parseInt(baseStats.total_count || 0, 10)
        baseStats.total_words = parseInt(baseStats.total_words || 0, 10)
        baseStats.continuous_days = parseInt(baseStats.continuous_days || 0, 10)
        
        return baseStats
    }

    /**
     * 获取用户在所有群聊的日统计数据总和
     * @param {string} userId 用户ID
     * @param {string} dateKey 日期键 (YYYY-MM-DD)
     * @returns {Promise<Object|null>} 日统计数据总和
     */
    async getUserDailyStatsAllGroups(userId, dateKey) {
        const dateExpr = this._getTimeDimensionExpr('date', 'stat_hour')
        return this.get(`
            SELECT
                user_id,
                SUM(message_count) as message_count,
                SUM(word_count) as word_count
            FROM message_granular_stats
            WHERE user_id = $1 AND ${dateExpr} = $2
            GROUP BY user_id
        `, userId, dateKey)
    }

    /**
     * 获取用户在所有群聊的月统计数据总和
     * @param {string} userId 用户ID
     * @param {string} monthKey 月键 (YYYY-MM)
     * @returns {Promise<Object|null>} 月统计数据总和
     */
    async getUserMonthlyStatsAllGroups(userId, monthKey) {
        const monthExpr = this._getTimeDimensionExpr('month', 'stat_hour')
        return this.get(`
            SELECT
                user_id,
                SUM(message_count) as message_count,
                SUM(word_count) as word_count
            FROM message_granular_stats
            WHERE user_id = $1 AND ${monthExpr} = $2
            GROUP BY user_id
        `, userId, monthKey)
    }

    // ========== 事务支持 ==========

    /**
     * 执行事务
     * @param {Function} callback 事务回调函数
     * @returns {Promise<any>} 事务结果
     */
    async transaction(callback) {
        if (!this.adapter) {
            throw new Error('数据库未初始化')
        }
        return this.adapter.transaction(callback)
    }

    // ========== 备份和恢复 ==========

    /**
     * 备份数据库（使用 pg_dump）
     * @param {string} backupPath 备份路径
     * @returns {Promise<boolean>} 是否成功
     */
    async backup(backupPath) {
        globalConfig.error('[数据库服务] PostgreSQL 备份需要使用 pg_dump 命令，请在外部执行备份')
        throw new Error('PostgreSQL 备份功能需要外部工具支持')
    }

    async restore(backupPath) {
        globalConfig.error('[数据库服务] PostgreSQL 恢复需要使用 pg_restore 命令，请在外部执行恢复')
        throw new Error('PostgreSQL 恢复功能需要外部工具支持')
    }

    /**
     * 关闭数据库连接
     * @returns {Promise<void>}
     */
    async close() {
        this.stopHealthCheck()
        
        if (this.adapter) {
            await this.adapter.close()
            this.adapter = null
            this.initialized = false
        }
    }

    async vacuum() {
        await this.run('VACUUM')
    }

    async analyze() {
        await this.run('ANALYZE')
    }

    async getDatabaseSize() {
        if (!this.adapter) {
            throw new Error('数据库未初始化')
        }
        return this.adapter.getDatabaseSize()
    }
}

let databaseServiceInstance = null

export function getDatabaseService() {
    if (!databaseServiceInstance) {
        databaseServiceInstance = new DatabaseService()
    }
    return databaseServiceInstance
}

export { DatabaseService }
export default DatabaseService
