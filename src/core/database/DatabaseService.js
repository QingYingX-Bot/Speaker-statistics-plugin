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
                const dbType = (dbConfig.type || 'sqlite').toLowerCase()
                
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

    // ========== 用户统计相关方法 ==========

    /**
     * 获取用户基础统计
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object|null>} 用户统计数据
     */
    async getUserStats(groupId, userId) {
        return this.get('SELECT * FROM user_stats WHERE group_id = $1 AND user_id = $2', groupId, userId)
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
        
        await this.run(`
            INSERT INTO user_stats (
                group_id, user_id, nickname, total_count, total_words,
                active_days, continuous_days, last_speaking_time, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (group_id, user_id) 
            DO UPDATE SET
                nickname = EXCLUDED.nickname,
                total_count = EXCLUDED.total_count,
                total_words = EXCLUDED.total_words,
                active_days = EXCLUDED.active_days,
                continuous_days = EXCLUDED.continuous_days,
                last_speaking_time = EXCLUDED.last_speaking_time,
                updated_at = EXCLUDED.updated_at
        `,
            sanitizedGroupId,
            sanitizedUserId,
            sanitizedNickname,
            stats.total_count || 0,
            stats.total_words || 0,
            stats.active_days || 0,
            stats.continuous_days || 0,
            lastSpeakingTime,
            now,
            now
        )

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
        const now = this.getCurrentTime()
        const setParts = []
        const values = []
        let paramIndex = 1

        for (const [key, value] of Object.entries(updates)) {
            setParts.push(`${key} = $${paramIndex++}`)
            let convertedValue = value
            if (value instanceof Date) {
                convertedValue = value.toISOString()
            } else if (value === null || value === undefined) {
                convertedValue = null
            }
            values.push(convertedValue)
        }

        setParts.push(`updated_at = $${paramIndex++}`)
        values.push(now)
        const whereParam1 = paramIndex++
        const whereParam2 = paramIndex
        values.push(groupId, userId)

        const sql = `UPDATE user_stats SET ${setParts.join(', ')} WHERE group_id = $${whereParam1} AND user_id = $${whereParam2}`
        await this.run(sql, ...values)
        return true
    }

    /**
     * 获取群组所有用户
     * @param {string} groupId 群号
     * @returns {Promise<Array>} 用户统计数组
     */
    async getAllGroupUsers(groupId) {
        return this.all('SELECT * FROM user_stats WHERE group_id = $1 ORDER BY total_count DESC', groupId)
    }

    async getAllGroupIds() {
        const rows = await this.all('SELECT DISTINCT group_id FROM user_stats')
        return rows.map(row => row.group_id)
    }

    /**
     * 批量获取所有群组的用户统计数据（优化总统计查询）
     * @returns {Promise<Map<string, Array>>} 群ID到用户列表的映射
     */
    async getAllGroupsUsersBatch() {
        const rows = await this.all('SELECT * FROM user_stats ORDER BY group_id, total_count DESC')
        const groupsMap = new Map()
        
        for (const row of rows) {
            const groupId = row.group_id
            if (!groupsMap.has(groupId)) {
                groupsMap.set(groupId, [])
            }
            groupsMap.get(groupId).push(row)
        }
        
        return groupsMap
    }

    /**
     * 批量获取所有群组的日统计数据（优化总统计查询）
     * @param {string} dateKey 日期键
     * @returns {Promise<Map<string, Array>>} 群ID到日统计列表的映射
     */
    async getAllGroupsDailyStatsBatch(dateKey) {
        const rows = await this.all(
            `SELECT ds.*, us.nickname, us.last_speaking_time 
             FROM daily_stats ds
             LEFT JOIN user_stats us ON ds.group_id = us.group_id AND ds.user_id = us.user_id
             WHERE ds.date_key = $1 
             AND (ds.message_count > 0 OR ds.word_count > 0)
             ORDER BY ds.group_id, ds.message_count DESC`,
            dateKey
        )
        const groupsMap = new Map()
        
        for (const row of rows) {
            const groupId = row.group_id
            if (!groupsMap.has(groupId)) {
                groupsMap.set(groupId, [])
            }
            groupsMap.get(groupId).push(row)
        }
        
        return groupsMap
    }

    /**
     * 批量获取所有群组的月统计数据（优化总统计查询）
     * @param {string} monthKey 月份键
     * @returns {Promise<Map<string, Array>>} 群ID到月统计列表的映射
     */
    async getAllGroupsMonthlyStatsBatch(monthKey) {
        const rows = await this.all(
            `SELECT ms.*, us.nickname, us.last_speaking_time 
             FROM monthly_stats ms
             LEFT JOIN user_stats us ON ms.group_id = us.group_id AND ms.user_id = us.user_id
             WHERE ms.month_key = $1 
             AND (ms.message_count > 0 OR ms.word_count > 0)
             ORDER BY ms.group_id, ms.message_count DESC`,
            monthKey
        )
        const groupsMap = new Map()
        
        for (const row of rows) {
            const groupId = row.group_id
            if (!groupsMap.has(groupId)) {
                groupsMap.set(groupId, [])
            }
            groupsMap.get(groupId).push(row)
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
            const groupName = groupInfo?.group_name || ''
                
                const lastActivity = await this.get(
                    'SELECT MAX(updated_at) as last_activity FROM user_stats WHERE group_id = $1',
                    groupId
            )
            const lastActivityAt = this._formatDateTime(lastActivity?.last_activity)
            const now = this.getCurrentTime()
            
            if (existing) {
                await this.run(`
                    UPDATE archived_groups 
                    SET archived_at = $1,
                        last_activity_at = COALESCE($2, archived_groups.last_activity_at),
                        group_name = COALESCE($3, archived_groups.group_name)
                    WHERE group_id = $4
                `, now, lastActivityAt, groupName, groupId)
                } else {
            await this.run(`
                INSERT INTO archived_groups (group_id, group_name, archived_at, last_activity_at)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (group_id) 
                DO UPDATE SET 
                    archived_at = EXCLUDED.archived_at,
                    last_activity_at = COALESCE(EXCLUDED.last_activity_at, archived_groups.last_activity_at)
                `, groupId, groupName, now, lastActivityAt)
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
            await this.run('DELETE FROM user_stats WHERE group_id = $1', groupId)
            await this.run('DELETE FROM daily_stats WHERE group_id = $1', groupId)
            await this.run('DELETE FROM weekly_stats WHERE group_id = $1', groupId)
            await this.run('DELETE FROM monthly_stats WHERE group_id = $1', groupId)
            await this.run('DELETE FROM yearly_stats WHERE group_id = $1', groupId)
            await this.run('DELETE FROM achievements WHERE group_id = $1', groupId)
            await this.run('DELETE FROM user_display_achievements WHERE group_id = $1', groupId)
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
            const dbType = this.getDatabaseType()
            const now = new Date()
            const cutoffDate = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000)
            
            const cutoffDateStr = cutoffDate.toISOString()
            
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
        return this.all(
            `SELECT * FROM user_stats WHERE group_id = $1 ORDER BY ${orderBy} DESC LIMIT $2`,
            groupId,
            limit
        )
    }

    /**
     * 获取所有群聊的排行榜（用于总榜）
     * @param {number} limit 限制数量
     * @param {string} orderBy 排序字段
     * @returns {Promise<Array>} 排行榜数据（按用户ID聚合所有群聊的数据）
     */
    async getTopUsersAllGroups(limit, orderBy = 'total_count') {
        const allowedColumns = ['total_count', 'total_words', 'active_days', 'continuous_days']
        if (!allowedColumns.includes(orderBy)) {
            orderBy = 'total_count'
        }
        return this.all(
            `WITH user_aggregated AS (
                SELECT 
                    user_id,
                    MAX(nickname) as nickname,
                    SUM(${orderBy}) as ${orderBy},
                    SUM(total_words) as total_words,
                    MAX(continuous_days) as continuous_days,
                    MAX(last_speaking_time) as last_speaking_time
                FROM user_stats
                WHERE group_id NOT IN (SELECT group_id FROM archived_groups)
                GROUP BY user_id
            ),
            active_days_stats AS (
                SELECT 
                    user_id,
                    COUNT(DISTINCT date_key) as active_days
                FROM daily_stats
                WHERE (message_count > 0 OR word_count > 0)
                AND group_id NOT IN (SELECT group_id FROM archived_groups)
                GROUP BY user_id
            )
            SELECT 
                ua.user_id,
                ua.nickname,
                ua.${orderBy},
                ua.total_words,
                COALESCE(ads.active_days, 0) as active_days,
                ua.continuous_days,
                ua.last_speaking_time
            FROM user_aggregated ua
            LEFT JOIN active_days_stats ads ON ua.user_id = ads.user_id
            ORDER BY ua.${orderBy} DESC 
            LIMIT $1`,
            limit
        )
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
        return this.get(
            'SELECT * FROM daily_stats WHERE group_id = $1 AND user_id = $2 AND date_key = $3',
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
        const now = this.getCurrentTime()
        
        const messageCount = parseInt(stats.message_count || 0, 10)
        const wordCount = parseInt(stats.word_count || 0, 10)
        
        await this.run(`
            INSERT INTO daily_stats (
                group_id, user_id, date_key, message_count, word_count, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (group_id, user_id, date_key) 
            DO UPDATE SET
                message_count = EXCLUDED.message_count,
                word_count = EXCLUDED.word_count,
                updated_at = EXCLUDED.updated_at
        `,
            groupId,
            userId,
            dateKey,
            messageCount,
            wordCount,
            now,
            now
        )

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
        return this.all(
            'SELECT * FROM daily_stats WHERE group_id = $1 AND user_id = $2 AND date_key >= $3 AND date_key <= $4 ORDER BY date_key',
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
        return this.all(
            `SELECT ds.*, us.nickname, us.last_speaking_time 
             FROM daily_stats ds
             LEFT JOIN user_stats us ON ds.group_id = us.group_id AND ds.user_id = us.user_id
             WHERE ds.group_id = $1 AND ds.date_key = $2 
             AND (ds.message_count > 0 OR ds.word_count > 0)
             ORDER BY ds.message_count DESC`,
            groupId,
            dateKey
        )
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
        return this.get(
            'SELECT * FROM weekly_stats WHERE group_id = $1 AND user_id = $2 AND week_key = $3',
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
        const now = this.getCurrentTime()
        
        const messageCount = parseInt(stats.message_count || 0, 10)
        const wordCount = parseInt(stats.word_count || 0, 10)
        
        await this.run(`
            INSERT INTO weekly_stats (
                group_id, user_id, week_key, message_count, word_count, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (group_id, user_id, week_key) 
            DO UPDATE SET
                message_count = EXCLUDED.message_count,
                word_count = EXCLUDED.word_count,
                updated_at = EXCLUDED.updated_at
        `,
            groupId,
            userId,
            weekKey,
            messageCount,
            wordCount,
            now,
            now
        )

        return true
    }

    /**
     * 批量获取周统计（优化性能，避免 N+1 查询）
     * @param {string} groupId 群号
     * @param {string} weekKey 周键（格式：YYYY-WW）
     * @returns {Promise<Array>} 周统计数据列表（已排序）
     */
    async getWeeklyStatsByGroupAndWeek(groupId, weekKey) {
        return this.all(
            `SELECT ws.*, us.nickname, us.last_speaking_time 
             FROM weekly_stats ws
             LEFT JOIN user_stats us ON ws.group_id = us.group_id AND ws.user_id = us.user_id
             WHERE ws.group_id = $1 AND ws.week_key = $2 
             AND (ws.message_count > 0 OR ws.word_count > 0)
             ORDER BY ws.message_count DESC`,
            groupId,
            weekKey
        )
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
        return this.get(
            'SELECT * FROM monthly_stats WHERE group_id = $1 AND user_id = $2 AND month_key = $3',
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
        const now = this.getCurrentTime()
        
        const messageCount = parseInt(stats.message_count || 0, 10)
        const wordCount = parseInt(stats.word_count || 0, 10)
        
        if (messageCount > 1000000) {
            globalConfig.error(`[数据库服务] 检测到异常大的消息数: ${messageCount} (group_id=${groupId}, user_id=${userId}, month_key=${monthKey})`)
        }
        
        await this.run(`
            INSERT INTO monthly_stats (
                group_id, user_id, month_key, message_count, word_count, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (group_id, user_id, month_key) 
            DO UPDATE SET
                message_count = EXCLUDED.message_count,
                word_count = EXCLUDED.word_count,
                updated_at = EXCLUDED.updated_at
        `,
            groupId,
            userId,
            monthKey,
            messageCount,
            wordCount,
            now,
            now
        )

        return true
    }

    /**
     * 批量获取月统计（优化性能，避免 N+1 查询）
     * @param {string} groupId 群号
     * @param {string} monthKey 月键（格式：YYYY-MM）
     * @returns {Promise<Array>} 月统计数据列表（已排序）
     */
    async getMonthlyStatsByGroupAndMonth(groupId, monthKey) {
        return this.all(
            `SELECT ms.*, us.nickname, us.last_speaking_time 
             FROM monthly_stats ms
             LEFT JOIN user_stats us ON ms.group_id = us.group_id AND ms.user_id = us.user_id
             WHERE ms.group_id = $1 AND ms.month_key = $2 
             AND (ms.message_count > 0 OR ms.word_count > 0)
             ORDER BY ms.message_count DESC`,
            groupId,
            monthKey
        )
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
        return this.get(
            'SELECT * FROM yearly_stats WHERE group_id = $1 AND user_id = $2 AND year_key = $3',
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
        const now = this.getCurrentTime()
        
        const messageCount = parseInt(stats.message_count || 0, 10)
        const wordCount = parseInt(stats.word_count || 0, 10)
        
        await this.run(`
            INSERT INTO yearly_stats (
                group_id, user_id, year_key, message_count, word_count, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (group_id, user_id, year_key) 
            DO UPDATE SET
                message_count = EXCLUDED.message_count,
                word_count = EXCLUDED.word_count,
                updated_at = EXCLUDED.updated_at
        `,
            groupId,
            userId,
            yearKey,
            messageCount,
            wordCount,
            now,
            now
        )

        return true
    }

    /**
     * 批量获取年统计（优化性能，避免 N+1 查询）
     * @param {string} groupId 群号
     * @param {string} yearKey 年键（格式：YYYY）
     * @returns {Promise<Array>} 年统计数据列表（已排序）
     */
    async getYearlyStatsByGroupAndYear(groupId, yearKey) {
        return this.all(
            `SELECT ys.*, us.nickname, us.last_speaking_time 
             FROM yearly_stats ys
             LEFT JOIN user_stats us ON ys.group_id = us.group_id AND ys.user_id = us.user_id
             WHERE ys.group_id = $1 AND ys.year_key = $2 
             AND (ys.message_count > 0 OR ys.word_count > 0)
             ORDER BY ys.message_count DESC`,
            groupId,
            yearKey
        )
    }

    // ========== 成就相关方法 ==========

    /**
     * 转换成就数据为数据库格式（内部方法）
     * @param {Object} achievementData 成就数据
     * @returns {Object} 转换后的数据 { unlocked, unlockedAt, progress }
     */
    _normalizeAchievementData(achievementData) {
        const unlocked = achievementData.unlocked ? 1 : 0
        let unlockedAt = achievementData.unlocked_at || null
        if (unlockedAt instanceof Date) {
            unlockedAt = unlockedAt.toISOString()
        } else if (unlockedAt && typeof unlockedAt !== 'string') {
            unlockedAt = String(unlockedAt)
        }
        
        let progress = achievementData.progress
        if (progress === null || progress === undefined) {
            progress = 0
        } else if (typeof progress === 'object') {
            globalConfig.error(`[数据库服务] progress 字段是对象/数组，已转换为 0:`, progress)
            progress = 0
        } else {
            progress = parseInt(progress, 10) || 0
        }
        
        return { unlocked, unlockedAt, progress }
    }

    /**
     * 获取用户成就
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} achievementId 成就ID
     * @returns {Promise<Object|null>} 成就数据
     */
    async getUserAchievement(groupId, userId, achievementId) {
        return this.get(
            'SELECT * FROM achievements WHERE group_id = $1 AND user_id = $2 AND achievement_id = $3',
            groupId,
            userId,
            achievementId
        )
    }

    /**
     * 保存或更新用户成就（使用 UPSERT 避免并发冲突）
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} achievementId 成就ID
     * @param {Object} achievementData 成就数据
     * @returns {Promise<boolean>} 是否成功
     */
    async saveUserAchievement(groupId, userId, achievementId, achievementData) {
        const now = this.getCurrentTime()
        const { unlocked, unlockedAt, progress } = this._normalizeAchievementData(achievementData)
        
        await this.run(`
            INSERT INTO achievements (
                group_id, user_id, achievement_id, unlocked, unlocked_at, progress, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (group_id, user_id, achievement_id) 
            DO UPDATE SET
                unlocked = EXCLUDED.unlocked,
                unlocked_at = EXCLUDED.unlocked_at,
                progress = EXCLUDED.progress,
                updated_at = EXCLUDED.updated_at
        `,
            groupId,
            userId,
            achievementId,
            unlocked,
            unlockedAt,
            progress,
            now,
            now
        )

        return true
    }

    async getAllUserAchievements(groupId, userId) {
        return this.all(
            'SELECT * FROM achievements WHERE group_id = $1 AND user_id = $2',
            groupId,
            userId
        )
    }

    /**
     * 批量获取用户成就（优化性能，避免 N+1 查询）
     * @param {string} groupId 群号
     * @param {Array<string>} userIds 用户ID数组
     * @returns {Promise<Array>} 成就数组
     */
    async getAllUserAchievementsBatch(groupId, userIds) {
        if (!userIds || userIds.length === 0) {
            return []
        }

        const placeholders = userIds.map((_, i) => `$${i + 2}`).join(',')
        const params = [groupId, ...userIds]
        
        const sql = `
            SELECT * FROM achievements 
            WHERE group_id = $1 AND user_id IN (${placeholders})
        `
        
        return this.all(sql, ...params)
    }

    /**
     * 批量保存用户成就（使用事务）
     * @param {Array<Object>} achievements 成就数组，每个对象包含 {groupId, userId, achievementId, achievementData}
     * @returns {Promise<boolean>} 是否成功
     */
    async saveUserAchievementsBatch(achievements) {
        if (!achievements || achievements.length === 0) {
            return true
        }

        return this.transaction(async () => {
            for (const achievement of achievements) {
                const { groupId, userId, achievementId, achievementData } = achievement
                await this.saveUserAchievement(groupId, userId, achievementId, achievementData)
            }
            return true
        })
    }

    /**
     * 获取已解锁的成就
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Array>} 已解锁成就数组
     */
    async getUnlockedAchievements(groupId, userId) {
        return this.all(
            'SELECT * FROM achievements WHERE group_id = $1 AND user_id = $2 AND unlocked = true',
            groupId,
            userId
        )
    }

    /**
     * 检查用户是否在任何群中已解锁某个成就（用于节日成就）
     * @param {string} userId 用户ID
     * @param {string} achievementId 成就ID
     * @returns {Promise<boolean>} 是否已解锁
     */
    async hasAchievementInAnyGroup(userId, achievementId) {
        const result = await this.get(
            'SELECT 1 FROM achievements WHERE user_id = $1 AND achievement_id = $2 AND unlocked = true LIMIT 1',
            userId,
            achievementId
        )
        return result !== null
    }

    /**
     * 获取用户在任意群中解锁某个成就的详细信息（用于节日成就）
     * @param {string} userId 用户ID
     * @param {string} achievementId 成就ID
     * @returns {Promise<Object|null>} 成就信息（包含 unlocked_at 和 progress）
     */
    async getAchievementFromAnyGroup(userId, achievementId) {
        return this.get(
            'SELECT * FROM achievements WHERE user_id = $1 AND achievement_id = $2 AND unlocked = true ORDER BY unlocked_at ASC LIMIT 1',
            userId,
            achievementId
        )
    }

    /**
     * 获取用户所在的所有群列表
     * @param {string} userId 用户ID
     * @returns {Promise<Array<string>>} 群ID数组
     */
    async getUserGroups(userId) {
        const rows = await this.all('SELECT DISTINCT group_id FROM user_stats WHERE user_id = $1', userId)
        return rows.map(row => row.group_id)
    }

    /**
     * 统计成就获取情况（全局成就统计所有群，群专属只统计当前群）
     * @param {string} achievementId 成就ID
     * @param {string} groupId 群号（用于群专属成就，全局成就传null）
     * @param {boolean} isGlobal 是否为全局成就（特殊成就或节日成就）
     * @returns {Promise<number>} 获取人数
     */
    async getAchievementUnlockCount(achievementId, groupId = null, isGlobal = false) {
        if (isGlobal) {
            const result = await this.get(
                'SELECT COUNT(DISTINCT user_id) as count FROM achievements WHERE achievement_id = $1 AND unlocked = true',
                achievementId
            )
            return result ? parseInt(result.count, 10) : 0
        } else {
            if (!groupId) return 0
            const result = await this.get(
                'SELECT COUNT(DISTINCT user_id) as count FROM achievements WHERE group_id = $1 AND achievement_id = $2 AND unlocked = true',
                groupId,
                achievementId
            )
            return result ? parseInt(result.count, 10) : 0
        }
    }

    /**
     * 批量保存节日成就到用户所在的所有群
     * @param {string} userId 用户ID
     * @param {string} achievementId 成就ID
     * @param {Object} achievementData 成就数据
     * @returns {Promise<boolean>} 是否成功
     */
    async saveFestivalAchievementToAllGroups(userId, achievementId, achievementData) {
        const now = this.getCurrentTime()
        const groups = await this.getUserGroups(userId)
        
        if (groups.length === 0) {
            return false
        }

        const { unlocked, unlockedAt, progress } = this._normalizeAchievementData(achievementData)

        for (const groupId of groups) {
            await this.run(`
                INSERT INTO achievements (
                    group_id, user_id, achievement_id, unlocked, unlocked_at, progress, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (group_id, user_id, achievement_id) 
                DO UPDATE SET
                    unlocked = EXCLUDED.unlocked,
                    unlocked_at = EXCLUDED.unlocked_at,
                    progress = EXCLUDED.progress,
                    updated_at = EXCLUDED.updated_at
            `,
                groupId,
                userId,
                achievementId,
                unlocked,
                unlockedAt,
                progress,
                now,
                now
            )
        }

        return true
    }

    /**
     * 设置用户显示成就（使用 UPSERT 避免并发冲突）
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {Object} achievementData 成就数据
     * @returns {Promise<boolean>} 是否成功
     */
    async setDisplayAchievement(groupId, userId, achievementData) {
        const now = this.getCurrentTime()
        const isManual = achievementData.isManual !== undefined ? achievementData.isManual : false
        const isManualInt = isManual ? 1 : 0
        
        let autoDisplayAt = achievementData.autoDisplayAt
        if (isManual) {
            autoDisplayAt = null
        } else if (!autoDisplayAt) {
            autoDisplayAt = now
        } else if (autoDisplayAt instanceof Date) {
            autoDisplayAt = autoDisplayAt.toISOString()
        } else if (autoDisplayAt && typeof autoDisplayAt !== 'string') {
            autoDisplayAt = String(autoDisplayAt)
        }
        
        await this.run(`
            INSERT INTO user_display_achievements (
                group_id, user_id, achievement_id, achievement_name, rarity, is_manual, auto_display_at, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (group_id, user_id) 
            DO UPDATE SET
                achievement_id = EXCLUDED.achievement_id,
                achievement_name = EXCLUDED.achievement_name,
                rarity = EXCLUDED.rarity,
                is_manual = EXCLUDED.is_manual,
                auto_display_at = EXCLUDED.auto_display_at,
                updated_at = EXCLUDED.updated_at
        `,
            groupId,
            userId,
            achievementData.id,
            achievementData.name,
            achievementData.rarity || 'common',
            isManualInt,
            autoDisplayAt,
            now,
            now
        )

        return true
    }

    /**
     * 获取用户显示成就
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object|null>} 显示成就数据
     */
    async getDisplayAchievement(groupId, userId) {
        return this.get(
            'SELECT * FROM user_display_achievements WHERE group_id = $1 AND user_id = $2',
            groupId,
            userId
        )
    }

    // ========== 群组信息相关方法 ==========

    /**
     * 获取群组信息
     * @param {string} groupId 群号
     * @returns {Promise<Object|null>} 群组信息
     */
    async getGroupInfo(groupId) {
        return this.get(
            'SELECT * FROM group_info WHERE group_id = $1',
            groupId
        )
    }

    /**
     * 获取格式化的群名称（如果不存在则返回默认格式）
     * @param {string} groupId 群号
     * @returns {Promise<string>} 群名称
     */
    async getFormattedGroupName(groupId) {
        try {
            const groupInfo = await this.getGroupInfo(groupId)
            return groupInfo?.group_name || `群${groupId}`
        } catch {
            return `群${groupId}`
        }
    }

    /**
     * 保存或更新群组信息
     * @param {string} groupId 群号
     * @param {string} groupName 群名称
     * @returns {Promise<boolean>} 是否成功
     */
    async saveGroupInfo(groupId, groupName) {
        const now = this.getCurrentTime()
        
        await this.run(`
            INSERT INTO group_info (
                group_id, group_name, created_at, updated_at
            ) VALUES ($1, $2, $3, $4)
            ON CONFLICT (group_id) 
            DO UPDATE SET
                group_name = EXCLUDED.group_name,
                updated_at = EXCLUDED.updated_at
        `,
            groupId,
            groupName || '',
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
        const result = await this.get('SELECT MIN(created_at) as earliest_time FROM user_stats WHERE group_id = $1', groupId)
        return result?.earliest_time || null
    }

    /**
     * 获取用户在所有群聊的统计数据总和
     * @param {string} userId 用户ID
     * @returns {Promise<Object|null>} 用户统计数据总和
     */
    async getUserStatsAllGroups(userId) {
        const baseStats = await this.get(`
            SELECT
                user_id,
                MAX(nickname) as nickname,
                SUM(total_count) as total_count,
                SUM(total_words) as total_words,
                MAX(continuous_days) as continuous_days,
                MAX(last_speaking_time) as last_speaking_time
            FROM user_stats
            WHERE user_id = $1
            GROUP BY user_id
        `, userId)
        
        const activeDaysResult = await this.get(`
            SELECT COUNT(DISTINCT date_key) as active_days
            FROM daily_stats
            WHERE user_id = $1
        `, userId)
        
        const activeDays = activeDaysResult?.active_days || 0
        
        if (!baseStats) {
            if (activeDays > 0) {
                const dailyStatsSum = await this.get(`
                    SELECT 
                        SUM(message_count) as total_count,
                        SUM(word_count) as total_words,
                        MAX(updated_at) as last_speaking_time
                    FROM daily_stats
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
        return this.get(`
            SELECT
                user_id,
                SUM(message_count) as message_count,
                SUM(word_count) as word_count
            FROM daily_stats
            WHERE user_id = $1 AND date_key = $2
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
        return this.get(`
            SELECT
                user_id,
                SUM(message_count) as message_count,
                SUM(word_count) as word_count
            FROM monthly_stats
            WHERE user_id = $1 AND month_key = $2
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
