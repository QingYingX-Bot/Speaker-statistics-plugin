import { globalConfig } from '../ConfigManager.js';
import { TimeUtils } from '../utils/TimeUtils.js';
import { PostgreSQLAdapter } from './adapters/PostgreSQLAdapter.js';
import { SQLiteAdapter } from './adapters/SQLiteAdapter.js';

/**
 * 数据库服务类
 * 根据配置选择数据库适配器（PostgreSQL 或 SQLite），提供统一的数据访问接口
 */
class DatabaseService {
    constructor() {
        this.adapter = null;
        this.initialized = false;
        this.healthCheckInterval = null;
        this.healthCheckIntervalMs = 60000; // 60秒健康检查间隔
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // 初始重连延迟1秒
    }

    /**
     * 初始化数据库连接（带重试机制）
     * @param {number} maxRetries 最大重试次数，默认5次
     * @param {number} initialDelay 初始延迟（毫秒），默认1000ms
     * @returns {Promise<void>}
     */
    async initialize(maxRetries = 5, initialDelay = 1000) {
        if (this.initialized && this.adapter) {
            // 如果已初始化，执行健康检查
            try {
                await this.healthCheck();
                return;
            } catch (error) {
                // 健康检查失败，重置状态并重试
                globalConfig.warn('[数据库服务] 健康检查失败，尝试重新初始化:', error.message);
                this.initialized = false;
                this.adapter = null;
            }
        }

        // 指数退避重试策略
        for (let i = 0; i < maxRetries; i++) {
            try {
                // 从配置获取数据库连接信息
                const dbConfig = globalConfig.getConfig('database') || {};
                const dbType = (dbConfig.type || 'sqlite').toLowerCase();
                
                // 根据配置选择适配器
                if (dbType === 'sqlite') {
                    this.adapter = new SQLiteAdapter();
                    globalConfig.debug('[数据库服务] 使用 SQLite 适配器');
                } else {
                    this.adapter = new PostgreSQLAdapter();
                    globalConfig.debug('[数据库服务] 使用 PostgreSQL 适配器');
                }

                // 初始化适配器
                await this.adapter.initialize();
                
                // 执行健康检查
                await this.healthCheck();
                
                this.initialized = true;
                this.reconnectAttempts = 0;
                
                // 启动定期健康检查
                this.startHealthCheck();
                
                return;
            } catch (error) {
                const isLastAttempt = i === maxRetries - 1;
                
                if (isLastAttempt) {
                    // 最后一次尝试失败，抛出错误
                    if (error.message && error.message.includes('数据库')) {
                        throw error;
                    }
                    throw new Error(`数据库初始化失败（已重试${maxRetries}次）: ${error.message}`);
                }
                
                // 计算延迟时间（指数退避）
                const delay = initialDelay * Math.pow(2, i);
                globalConfig.warn(`[数据库服务] 初始化失败，${delay}ms 后重试 (${i + 1}/${maxRetries}):`, error.message);
                
                // 等待后重试
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * 健康检查
     * @returns {Promise<boolean>}
     */
    async healthCheck() {
        if (!this.adapter) {
            this.initialized = false;
            throw new Error('数据库适配器未初始化');
        }

        try {
            // 执行简单的查询测试连接
            await this.adapter.get('SELECT 1');
            return true;
        } catch (error) {
            this.initialized = false;
            throw new Error(`数据库健康检查失败: ${error.message}`);
        }
    }

    /**
     * 启动定期健康检查
     */
    startHealthCheck() {
        // 清除之前的健康检查定时器
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        // 设置定期健康检查
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.healthCheck();
            } catch (error) {
                globalConfig.warn('[数据库服务] 定期健康检查失败:', error.message);
                // 健康检查失败，尝试重新连接
                this.handleReconnect();
            }
        }, this.healthCheckIntervalMs);
    }

    /**
     * 停止健康检查
     */
    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    /**
     * 处理重连逻辑
     */
    async handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            globalConfig.error(`[数据库服务] 重连失败，已达到最大重试次数 (${this.maxReconnectAttempts})`);
            this.reconnectAttempts = 0;
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        globalConfig.warn(`[数据库服务] 尝试重连数据库 (${this.reconnectAttempts}/${this.maxReconnectAttempts})，${delay}ms 后重试...`);
        
        setTimeout(async () => {
            try {
                await this.initialize(1, 0); // 只重试1次，延迟为0（已经在setTimeout中延迟了）
                globalConfig.mark('[数据库服务] 数据库重连成功');
            } catch (error) {
                globalConfig.error('[数据库服务] 重连失败:', error.message);
                // 继续尝试重连
                this.handleReconnect();
            }
        }, delay);
    }

    /**
     * 执行 SQL 语句（无返回值）
     * @param {string} sql SQL 语句
     * @param {...any} params 参数
     * @returns {Promise<Object>} 执行结果 { lastID, changes }
     */
    async run(sql, ...params) {
        if (!this.adapter) {
            throw new Error('数据库未初始化');
        }
        
        // 如果数据库连接失效，尝试重连
        try {
            return await this.adapter.run(sql, ...params);
        } catch (error) {
            // 检查是否是连接错误
            if (this.isConnectionError(error)) {
                await this.handleReconnect();
                // 重连后重试一次
                return await this.adapter.run(sql, ...params);
            }
            throw error;
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
            throw new Error('数据库未初始化');
        }
        
        // 如果数据库连接失效，尝试重连
        try {
            return await this.adapter.get(sql, ...params);
        } catch (error) {
            // 检查是否是连接错误
            if (this.isConnectionError(error)) {
                await this.handleReconnect();
                // 重连后重试一次
                return await this.adapter.get(sql, ...params);
            }
            throw error;
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
            throw new Error('数据库未初始化');
        }
        
        // 如果数据库连接失效，尝试重连
        try {
            return await this.adapter.all(sql, ...params);
        } catch (error) {
            // 检查是否是连接错误
            if (this.isConnectionError(error)) {
                await this.handleReconnect();
                // 重连后重试一次
                return await this.adapter.all(sql, ...params);
            }
            throw error;
        }
    }

    /**
     * 判断是否是连接错误
     * @param {Error} error 错误对象
     * @returns {boolean}
     */
    isConnectionError(error) {
        if (!error) return false;
        
        const errorMessage = error.message || '';
        const errorCode = error.code || '';
        
        // PostgreSQL 连接错误代码
        const postgresConnectionErrors = [
            'ECONNREFUSED',
            'ETIMEDOUT',
            'ENOTFOUND',
            '57P01', // 管理员关闭
            '57P02', // 崩溃
            '57P03', // 无法连接
            '08003', // 连接不存在
            '08006', // 连接失败
            '08001', // SQL客户端无法建立连接
            '08004'  // SQL服务器拒绝连接
        ];
        
        // SQLite 连接错误
        const sqliteConnectionErrors = [
            'SQLITE_BUSY',
            'SQLITE_LOCKED',
            'SQLITE_IOERR',
            'SQLITE_CORRUPT',
            'SQLITE_CANTOPEN'
        ];
        
        // 检查错误代码
        if (postgresConnectionErrors.includes(errorCode) || 
            sqliteConnectionErrors.includes(errorCode)) {
            return true;
        }
        
        // 检查错误消息
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
        ];
        
        return connectionErrorMessages.some(msg => 
            errorMessage.toLowerCase().includes(msg.toLowerCase())
        );
    }

    /**
     * 执行 SQL 语句（用于创建表等）
     * @param {string} sql SQL 语句
     * @returns {Promise<void>}
     */
    async exec(sql) {
        if (!this.adapter) {
            throw new Error('数据库未初始化');
        }
        return await this.adapter.exec(sql);
    }

    /**
     * 创建所有表
     */
    async createTables() {
        return await this.adapter.createTables();
    }

    /**
     * 创建所有索引
     */
    async createIndexes() {
        return await this.adapter.createIndexes();
    }

    /**
     * 获取数据库类型
     * @returns {string} 'postgresql' 或 'sqlite'
     */
    getDatabaseType() {
        if (!this.adapter) {
            return 'sqlite'; // 默认返回 sqlite
        }
        // 检查适配器类型
        const adapterName = this.adapter.constructor.name;
        if (adapterName === 'PostgreSQLAdapter') {
            return 'postgresql';
        } else if (adapterName === 'SQLiteAdapter') {
            return 'sqlite';
        }
        return 'sqlite'; // 默认返回 sqlite
    }

    /**
     * 获取当前时间字符串
     * @returns {string} 时间字符串 (YYYY-MM-DD HH:MM:SS)
     */
    getCurrentTime() {
        // 使用 UTC+8 时区
        return TimeUtils.formatDateTimeForDB();
    }

    /**
     * 清理字符串中的 null 字节（0x00），PostgreSQL 不允许 UTF-8 字符串中包含 null 字节
     * @param {string|null|undefined} str 要清理的字符串
     * @returns {string|null} 清理后的字符串，如果输入为 null 或 undefined 则返回 null
     */
    sanitizeString(str) {
        if (str === null || str === undefined) {
            return null;
        }
        // 转换为字符串
        let cleaned = String(str);
        // 移除所有 null 字节（0x00）
        cleaned = cleaned.replace(/\0/g, '');
        // 移除其他可能导致问题的控制字符（保留换行符、制表符等常用字符）
        // 只移除可能导致编码问题的字符
        cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');
        return cleaned;
    }

    // ========== 用户统计相关方法 ==========

    /**
     * 获取用户基础统计
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object|null>} 用户统计数据
     */
    async getUserStats(groupId, userId) {
        return await this.get('SELECT * FROM user_stats WHERE group_id = $1 AND user_id = $2', groupId, userId);
    }

    /**
     * 保存或更新用户基础统计（使用 UPSERT 避免并发冲突）
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {Object} stats 统计数据
     * @returns {Promise<boolean>} 是否成功
     */
    async saveUserStats(groupId, userId, stats) {
        const now = this.getCurrentTime();
        
        // 清理所有字符串字段中的 null 字节（PostgreSQL 不允许 UTF-8 字符串中包含 null 字节）
        const sanitizedGroupId = this.sanitizeString(groupId) || '';
        const sanitizedUserId = this.sanitizeString(userId) || '';
        const sanitizedNickname = this.sanitizeString(stats.nickname) || '';
        
        // 确保 last_speaking_time 是字符串或 null
        let lastSpeakingTime = stats.last_speaking_time || null;
        if (lastSpeakingTime instanceof Date) {
            lastSpeakingTime = lastSpeakingTime.toISOString();
        } else if (lastSpeakingTime && typeof lastSpeakingTime !== 'string') {
            lastSpeakingTime = String(lastSpeakingTime);
        }
        // 清理 last_speaking_time 中的 null 字节
        lastSpeakingTime = this.sanitizeString(lastSpeakingTime);
        
        // 使用 PostgreSQL 的 INSERT ... ON CONFLICT ... DO UPDATE 语法（UPSERT）
        // 这样可以避免并发时的主键冲突问题
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
        );

        return true;
    }

    /**
     * 更新用户统计（部分字段）
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {Object} updates 要更新的字段
     * @returns {Promise<boolean>} 是否成功
     */
    async updateUserStats(groupId, userId, updates) {
        const now = this.getCurrentTime();
        const setParts = [];
        const values = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updates)) {
            setParts.push(`${key} = $${paramIndex++}`);
            // 转换 Date 对象为字符串
            let convertedValue = value;
            if (value instanceof Date) {
                convertedValue = value.toISOString();
            } else if (value === null || value === undefined) {
                convertedValue = null;
            }
            values.push(convertedValue);
        }

        setParts.push(`updated_at = $${paramIndex++}`);
        values.push(now);
        const whereParam1 = paramIndex++;
        const whereParam2 = paramIndex;
        values.push(groupId, userId);

        const sql = `UPDATE user_stats SET ${setParts.join(', ')} WHERE group_id = $${whereParam1} AND user_id = $${whereParam2}`;
        await this.run(sql, ...values);
        return true;
    }

    /**
     * 获取群组所有用户
     * @param {string} groupId 群号
     * @returns {Promise<Array>} 用户统计数组
     */
    async getAllGroupUsers(groupId) {
        return await this.all('SELECT * FROM user_stats WHERE group_id = $1 ORDER BY total_count DESC', groupId);
    }

    /**
     * 获取所有群组ID列表
     * @returns {Promise<Array<string>>} 群ID数组
     */
    async getAllGroupIds() {
        const rows = await this.all('SELECT DISTINCT group_id FROM user_stats');
        return rows.map(row => row.group_id);
    }

    /**
     * 批量获取所有群组的用户统计数据（优化总统计查询）
     * @returns {Promise<Map<string, Array>>} 群ID到用户列表的映射
     */
    async getAllGroupsUsersBatch() {
        const rows = await this.all('SELECT * FROM user_stats ORDER BY group_id, total_count DESC');
        const groupsMap = new Map();
        
        for (const row of rows) {
            const groupId = row.group_id;
            if (!groupsMap.has(groupId)) {
                groupsMap.set(groupId, []);
            }
            groupsMap.get(groupId).push(row);
        }
        
        return groupsMap;
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
        );
        const groupsMap = new Map();
        
        for (const row of rows) {
            const groupId = row.group_id;
            if (!groupsMap.has(groupId)) {
                groupsMap.set(groupId, []);
            }
            groupsMap.get(groupId).push(row);
        }
        
        return groupsMap;
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
        );
        const groupsMap = new Map();
        
        for (const row of rows) {
            const groupId = row.group_id;
            if (!groupsMap.has(groupId)) {
                groupsMap.set(groupId, []);
            }
            groupsMap.get(groupId).push(row);
        }
        
        return groupsMap;
    }

    /**
     * 批量获取所有群组信息（优化总统计查询）
     * @returns {Promise<Map<string, string>>} 群ID到群名称的映射
     */
    async getAllGroupsInfoBatch() {
        const rows = await this.all('SELECT group_id, group_name FROM group_info');
        const groupsMap = new Map();
        
        for (const row of rows) {
            if (row.group_name) {
                groupsMap.set(row.group_id, row.group_name);
            }
        }
        
        return groupsMap;
    }

    /**
     * 删除群组所有数据
     * @param {string} groupId 群号
     * @returns {Promise<boolean>} 是否成功
     */
    async deleteGroupData(groupId) {
        try {
            await this.run('DELETE FROM user_stats WHERE group_id = $1', groupId);
            await this.run('DELETE FROM daily_stats WHERE group_id = $1', groupId);
            await this.run('DELETE FROM weekly_stats WHERE group_id = $1', groupId);
            await this.run('DELETE FROM monthly_stats WHERE group_id = $1', groupId);
            await this.run('DELETE FROM yearly_stats WHERE group_id = $1', groupId);
            await this.run('DELETE FROM achievements WHERE group_id = $1', groupId);
            await this.run('DELETE FROM user_display_achievements WHERE group_id = $1', groupId);
            await this.run('DELETE FROM group_info WHERE group_id = $1', groupId);
            return true;
        } catch (error) {
            throw new Error(`删除群组数据失败: ${error.message}`);
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
        // 防止 SQL 注入，只允许特定字段
        const allowedColumns = ['total_count', 'total_words', 'active_days', 'continuous_days'];
        if (!allowedColumns.includes(orderBy)) {
            orderBy = 'total_count';
        }
        return await this.all(
            `SELECT * FROM user_stats WHERE group_id = $1 ORDER BY ${orderBy} DESC LIMIT $2`,
            groupId,
            limit
        );
    }

    /**
     * 获取所有群聊的排行榜（用于总榜）
     * @param {number} limit 限制数量
     * @param {string} orderBy 排序字段
     * @returns {Promise<Array>} 排行榜数据（按用户ID聚合所有群聊的数据）
     */
    async getTopUsersAllGroups(limit, orderBy = 'total_count') {
        // 防止 SQL 注入，只允许特定字段
        const allowedColumns = ['total_count', 'total_words', 'active_days', 'continuous_days'];
        if (!allowedColumns.includes(orderBy)) {
            orderBy = 'total_count';
        }
        // 按用户ID聚合所有群聊的数据，取总和
        // 优化：使用子查询预计算 active_days，减少 JOIN 开销
        // 注意：active_days 需要从 daily_stats 统计不重复日期，不能简单求和
        return await this.all(
            `WITH user_aggregated AS (
                SELECT 
                    user_id,
                    MAX(nickname) as nickname,
                    SUM(${orderBy}) as ${orderBy},
                    SUM(total_words) as total_words,
                    MAX(continuous_days) as continuous_days,
                    MAX(last_speaking_time) as last_speaking_time
                FROM user_stats
                GROUP BY user_id
            ),
            active_days_stats AS (
                SELECT 
                    user_id,
                    COUNT(DISTINCT date_key) as active_days
                FROM daily_stats
                WHERE message_count > 0 OR word_count > 0
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
        );
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
        return await this.get(
            'SELECT * FROM daily_stats WHERE group_id = $1 AND user_id = $2 AND date_key = $3',
            groupId,
            userId,
            dateKey
        );
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
        const now = this.getCurrentTime();
        
        // 确保 stats 中的值是数字类型
        const messageCount = parseInt(stats.message_count || 0, 10);
        const wordCount = parseInt(stats.word_count || 0, 10);
        
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
        );

        return true;
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
        return await this.all(
            'SELECT * FROM daily_stats WHERE group_id = $1 AND user_id = $2 AND date_key >= $3 AND date_key <= $4 ORDER BY date_key',
            groupId,
            userId,
            startDate,
            endDate
        );
    }

    /**
     * 批量获取日统计（优化性能，避免 N+1 查询）
     * @param {string} groupId 群号
     * @param {string} dateKey 日期键（格式：YYYY-MM-DD）
     * @returns {Promise<Array>} 日统计数据列表（已排序）
     */
    async getDailyStatsByGroupAndDate(groupId, dateKey) {
        return await this.all(
            `SELECT ds.*, us.nickname, us.last_speaking_time 
             FROM daily_stats ds
             LEFT JOIN user_stats us ON ds.group_id = us.group_id AND ds.user_id = us.user_id
             WHERE ds.group_id = $1 AND ds.date_key = $2 
             AND (ds.message_count > 0 OR ds.word_count > 0)
             ORDER BY ds.message_count DESC`,
            groupId,
            dateKey
        );
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
        return await this.get(
            'SELECT * FROM weekly_stats WHERE group_id = $1 AND user_id = $2 AND week_key = $3',
            groupId,
            userId,
            weekKey
        );
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
        const now = this.getCurrentTime();
        
        // 确保 stats 中的值是数字类型
        const messageCount = parseInt(stats.message_count || 0, 10);
        const wordCount = parseInt(stats.word_count || 0, 10);
        
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
        );

        return true;
    }

    /**
     * 批量获取周统计（优化性能，避免 N+1 查询）
     * @param {string} groupId 群号
     * @param {string} weekKey 周键（格式：YYYY-WW）
     * @returns {Promise<Array>} 周统计数据列表（已排序）
     */
    async getWeeklyStatsByGroupAndWeek(groupId, weekKey) {
        return await this.all(
            `SELECT ws.*, us.nickname, us.last_speaking_time 
             FROM weekly_stats ws
             LEFT JOIN user_stats us ON ws.group_id = us.group_id AND ws.user_id = us.user_id
             WHERE ws.group_id = $1 AND ws.week_key = $2 
             AND (ws.message_count > 0 OR ws.word_count > 0)
             ORDER BY ws.message_count DESC`,
            groupId,
            weekKey
        );
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
        return await this.get(
            'SELECT * FROM monthly_stats WHERE group_id = $1 AND user_id = $2 AND month_key = $3',
            groupId,
            userId,
            monthKey
        );
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
        const now = this.getCurrentTime();
        
        // 确保 stats 中的值是数字类型
        const messageCount = parseInt(stats.message_count || 0, 10);
        const wordCount = parseInt(stats.word_count || 0, 10);
        
        // 添加验证：确保值合理（如果出现异常大值，记录警告）
        if (messageCount > 1000000) {
            globalConfig.error(`[数据库服务] 检测到异常大的消息数: ${messageCount} (group_id=${groupId}, user_id=${userId}, month_key=${monthKey})`);
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
        );

        return true;
    }

    /**
     * 批量获取月统计（优化性能，避免 N+1 查询）
     * @param {string} groupId 群号
     * @param {string} monthKey 月键（格式：YYYY-MM）
     * @returns {Promise<Array>} 月统计数据列表（已排序）
     */
    async getMonthlyStatsByGroupAndMonth(groupId, monthKey) {
        return await this.all(
            `SELECT ms.*, us.nickname, us.last_speaking_time 
             FROM monthly_stats ms
             LEFT JOIN user_stats us ON ms.group_id = us.group_id AND ms.user_id = us.user_id
             WHERE ms.group_id = $1 AND ms.month_key = $2 
             AND (ms.message_count > 0 OR ms.word_count > 0)
             ORDER BY ms.message_count DESC`,
            groupId,
            monthKey
        );
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
        return await this.get(
            'SELECT * FROM yearly_stats WHERE group_id = $1 AND user_id = $2 AND year_key = $3',
            groupId,
            userId,
            yearKey
        );
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
        const now = this.getCurrentTime();
        
        // 确保 stats 中的值是数字类型
        const messageCount = parseInt(stats.message_count || 0, 10);
        const wordCount = parseInt(stats.word_count || 0, 10);
        
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
        );

        return true;
    }

    /**
     * 批量获取年统计（优化性能，避免 N+1 查询）
     * @param {string} groupId 群号
     * @param {string} yearKey 年键（格式：YYYY）
     * @returns {Promise<Array>} 年统计数据列表（已排序）
     */
    async getYearlyStatsByGroupAndYear(groupId, yearKey) {
        return await this.all(
            `SELECT ys.*, us.nickname, us.last_speaking_time 
             FROM yearly_stats ys
             LEFT JOIN user_stats us ON ys.group_id = us.group_id AND ys.user_id = us.user_id
             WHERE ys.group_id = $1 AND ys.year_key = $2 
             AND (ys.message_count > 0 OR ys.word_count > 0)
             ORDER BY ys.message_count DESC`,
            groupId,
            yearKey
        );
    }

    // ========== 成就相关方法 ==========

    /**
     * 获取用户成就
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} achievementId 成就ID
     * @returns {Promise<Object|null>} 成就数据
     */
    async getUserAchievement(groupId, userId, achievementId) {
        return await this.get(
            'SELECT * FROM achievements WHERE group_id = $1 AND user_id = $2 AND achievement_id = $3',
            groupId,
            userId,
            achievementId
        );
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
        const now = this.getCurrentTime();
        
        // 确保所有参数都是正确的类型
        const unlocked = achievementData.unlocked ? 1 : 0; // SQLite 使用 INTEGER 存储布尔值
        let unlockedAt = achievementData.unlocked_at || null;
        // 如果是 Date 对象，转换为字符串
        if (unlockedAt instanceof Date) {
            unlockedAt = unlockedAt.toISOString();
        } else if (unlockedAt && typeof unlockedAt !== 'string') {
            unlockedAt = String(unlockedAt);
        }
        
        // 确保 progress 是数字
        let progress = achievementData.progress;
        if (progress === null || progress === undefined) {
            progress = 0;
        } else if (typeof progress === 'object') {
            // 如果是对象或数组，记录警告并使用 0
            globalConfig.error(`[数据库服务] progress 字段是对象/数组，已转换为 0:`, progress);
            progress = 0;
        } else {
            progress = parseInt(progress, 10) || 0;
        }
        
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
        );

        return true;
    }

    /**
     * 获取用户所有成就
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Array>} 成就数组
     */
    async getAllUserAchievements(groupId, userId) {
        return await this.all(
            'SELECT * FROM achievements WHERE group_id = $1 AND user_id = $2',
            groupId,
            userId
        );
    }

    /**
     * 批量获取用户成就（优化性能，避免 N+1 查询）
     * @param {string} groupId 群号
     * @param {Array<string>} userIds 用户ID数组
     * @returns {Promise<Array>} 成就数组
     */
    async getAllUserAchievementsBatch(groupId, userIds) {
        if (!userIds || userIds.length === 0) {
            return [];
        }

        // 构建 IN 子句的占位符
        const placeholders = userIds.map((_, i) => `$${i + 2}`).join(',');
        const params = [groupId, ...userIds];
        
        const sql = `
            SELECT * FROM achievements 
            WHERE group_id = $1 AND user_id IN (${placeholders})
        `;
        
        return await this.all(sql, ...params);
    }

    /**
     * 批量保存用户成就（使用事务）
     * @param {Array<Object>} achievements 成就数组，每个对象包含 {groupId, userId, achievementId, achievementData}
     * @returns {Promise<boolean>} 是否成功
     */
    async saveUserAchievementsBatch(achievements) {
        if (!achievements || achievements.length === 0) {
            return true;
        }

        return await this.transaction(async () => {
            for (const achievement of achievements) {
                const { groupId, userId, achievementId, achievementData } = achievement;
                await this.saveUserAchievement(groupId, userId, achievementId, achievementData);
            }
            return true;
        });
    }

    /**
     * 获取已解锁的成就
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Array>} 已解锁成就数组
     */
    async getUnlockedAchievements(groupId, userId) {
        return await this.all(
            'SELECT * FROM achievements WHERE group_id = $1 AND user_id = $2 AND unlocked = true',
            groupId,
            userId
        );
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
        );
        return result !== null;
    }

    /**
     * 获取用户在任意群中解锁某个成就的详细信息（用于节日成就）
     * @param {string} userId 用户ID
     * @param {string} achievementId 成就ID
     * @returns {Promise<Object|null>} 成就信息（包含 unlocked_at 和 progress）
     */
    async getAchievementFromAnyGroup(userId, achievementId) {
        return await this.get(
            'SELECT * FROM achievements WHERE user_id = $1 AND achievement_id = $2 AND unlocked = true ORDER BY unlocked_at ASC LIMIT 1',
            userId,
            achievementId
        );
    }

    /**
     * 获取用户所在的所有群列表
     * @param {string} userId 用户ID
     * @returns {Promise<Array<string>>} 群ID数组
     */
    async getUserGroups(userId) {
        const rows = await this.all(
            'SELECT DISTINCT group_id FROM user_stats WHERE user_id = $1',
            userId
        );
        return rows.map(row => row.group_id);
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
            // 全局成就：统计所有群中不同的用户数量
            const result = await this.get(
                'SELECT COUNT(DISTINCT user_id) as count FROM achievements WHERE achievement_id = $1 AND unlocked = true',
                achievementId
            );
            return result ? parseInt(result.count) : 0;
        } else {
            // 群专属成就：只统计当前群
            if (!groupId) return 0;
            const result = await this.get(
                'SELECT COUNT(DISTINCT user_id) as count FROM achievements WHERE group_id = $1 AND achievement_id = $2 AND unlocked = true',
                groupId,
                achievementId
            );
            return result ? parseInt(result.count) : 0;
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
        const now = this.getCurrentTime();
        
        // 获取用户所在的所有群
        const groups = await this.getUserGroups(userId);
        
        if (groups.length === 0) {
            return false;
        }

        // 确保所有参数都是正确的类型
        const unlocked = achievementData.unlocked ? 1 : 0; // SQLite 使用 INTEGER 存储布尔值
        let unlockedAt = achievementData.unlocked_at || null;
        // 如果是 Date 对象，转换为字符串
        if (unlockedAt instanceof Date) {
            unlockedAt = unlockedAt.toISOString();
        } else if (unlockedAt && typeof unlockedAt !== 'string') {
            unlockedAt = String(unlockedAt);
        }
        
        // 确保 progress 是数字
        let progress = achievementData.progress;
        if (progress === null || progress === undefined) {
            progress = 0;
        } else if (typeof progress === 'object') {
            // 如果是对象或数组，记录警告并使用 0
            globalConfig.error(`[数据库服务] progress 字段是对象/数组，已转换为 0:`, progress);
            progress = 0;
        } else {
            progress = parseInt(progress, 10) || 0;
        }

        // 使用事务或批量插入
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
            );
        }

        return true;
    }

    /**
     * 设置用户显示成就（使用 UPSERT 避免并发冲突）
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {Object} achievementData 成就数据
     * @returns {Promise<boolean>} 是否成功
     */
    async setDisplayAchievement(groupId, userId, achievementData) {
        const now = this.getCurrentTime();
        const isManual = achievementData.isManual !== undefined ? achievementData.isManual : false;
        // SQLite 使用 INTEGER 存储布尔值
        const isManualInt = isManual ? 1 : 0;
        
        // 获取自动佩戴时间
        // 如果提供了 autoDisplayAt，使用提供的值（通常是解锁时间）
        // 如果未提供且是自动设置，使用当前时间
        let autoDisplayAt = achievementData.autoDisplayAt;
        if (isManual) {
            // 手动设置，清除自动显示时间
            autoDisplayAt = null;
        } else if (!autoDisplayAt) {
            // 自动设置但未提供时间，使用当前时间
                autoDisplayAt = now;
            }
        
        // 确保 autoDisplayAt 是字符串或 null
        if (autoDisplayAt instanceof Date) {
            autoDisplayAt = autoDisplayAt.toISOString();
        } else if (autoDisplayAt && typeof autoDisplayAt !== 'string') {
            autoDisplayAt = String(autoDisplayAt);
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
        );

        return true;
    }

    /**
     * 获取用户显示成就
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object|null>} 显示成就数据
     */
    async getDisplayAchievement(groupId, userId) {
        return await this.get(
            'SELECT * FROM user_display_achievements WHERE group_id = $1 AND user_id = $2',
            groupId,
            userId
        );
    }

    // ========== 群组信息相关方法 ==========

    /**
     * 获取群组信息
     * @param {string} groupId 群号
     * @returns {Promise<Object|null>} 群组信息
     */
    async getGroupInfo(groupId) {
        return await this.get(
            'SELECT * FROM group_info WHERE group_id = $1',
            groupId
        );
    }

    /**
     * 获取格式化的群名称（如果不存在则返回默认格式）
     * @param {string} groupId 群号
     * @returns {Promise<string>} 群名称
     */
    async getFormattedGroupName(groupId) {
        try {
            const groupInfo = await this.getGroupInfo(groupId);
            return groupInfo?.group_name || `群${groupId}`;
        } catch (error) {
            return `群${groupId}`;
        }
    }

    /**
     * 保存或更新群组信息
     * @param {string} groupId 群号
     * @param {string} groupName 群名称
     * @returns {Promise<boolean>} 是否成功
     */
    async saveGroupInfo(groupId, groupName) {
        const now = this.getCurrentTime();
        
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
        );

        return true;
    }

    /**
     * 获取群组最早统计时间（从用户统计数据中）
     * @param {string} groupId 群号
     * @returns {Promise<string|null>} 最早创建时间
     */
    async getGroupEarliestTime(groupId) {
        const result = await this.get(
            'SELECT MIN(created_at) as earliest_time FROM user_stats WHERE group_id = $1',
            groupId
        );
        return result?.earliest_time || null;
    }

    /**
     * 获取用户在所有群聊的统计数据总和
     * @param {string} userId 用户ID
     * @returns {Promise<Object|null>} 用户统计数据总和
     */
    async getUserStatsAllGroups(userId) {
        // 获取基础统计数据（总和）
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
        `, userId);
        
        // 计算真实的活跃天数：统计所有群聊中不重复的日期数量
        const activeDaysResult = await this.get(`
            SELECT COUNT(DISTINCT date_key) as active_days
            FROM daily_stats
            WHERE user_id = $1
        `, userId);
        
        const activeDays = activeDaysResult?.active_days || 0;
        
        // 如果 baseStats 为空，但从 daily_stats 中有数据，说明用户确实有统计记录
        // 需要从 daily_stats 表计算总数据
        if (!baseStats) {
            // 检查是否有 daily_stats 数据
            if (activeDays > 0) {
                // 从 daily_stats 表计算总消息数和总字数
                const dailyStatsSum = await this.get(`
                    SELECT 
                        SUM(message_count) as total_count,
                        SUM(word_count) as total_words,
                        MAX(updated_at) as last_speaking_time
                    FROM daily_stats
                    WHERE user_id = $1
                `, userId);
                
                if (dailyStatsSum && (dailyStatsSum.total_count > 0 || dailyStatsSum.total_words > 0)) {
                    // 返回从 daily_stats 计算的统计数据
                    return {
                        user_id: userId,
                        nickname: null,
                        total_count: parseInt(dailyStatsSum.total_count || 0, 10),
                        total_words: parseInt(dailyStatsSum.total_words || 0, 10),
                        active_days: activeDays,
                        continuous_days: 0, // 无法从 daily_stats 计算连续天数
                        last_speaking_time: dailyStatsSum.last_speaking_time || null
                    };
                }
            }
            // 如果没有数据，返回 null
            return null;
        }
        
        // 如果有 baseStats，使用它并设置活跃天数
        baseStats.active_days = activeDays;
        
        // 确保数值字段不为 null（处理 SUM 可能返回 null 的情况）
        baseStats.total_count = parseInt(baseStats.total_count || 0, 10);
        baseStats.total_words = parseInt(baseStats.total_words || 0, 10);
        baseStats.continuous_days = parseInt(baseStats.continuous_days || 0, 10);
        
        return baseStats;
    }

    /**
     * 获取用户在所有群聊的日统计数据总和
     * @param {string} userId 用户ID
     * @param {string} dateKey 日期键 (YYYY-MM-DD)
     * @returns {Promise<Object|null>} 日统计数据总和
     */
    async getUserDailyStatsAllGroups(userId, dateKey) {
        const result = await this.get(`
            SELECT
                user_id,
                SUM(message_count) as message_count,
                SUM(word_count) as word_count
            FROM daily_stats
            WHERE user_id = $1 AND date_key = $2
            GROUP BY user_id
        `, userId, dateKey);
        return result;
    }

    /**
     * 获取用户在所有群聊的月统计数据总和
     * @param {string} userId 用户ID
     * @param {string} monthKey 月键 (YYYY-MM)
     * @returns {Promise<Object|null>} 月统计数据总和
     */
    async getUserMonthlyStatsAllGroups(userId, monthKey) {
        const result = await this.get(`
            SELECT
                user_id,
                SUM(message_count) as message_count,
                SUM(word_count) as word_count
            FROM monthly_stats
            WHERE user_id = $1 AND month_key = $2
            GROUP BY user_id
        `, userId, monthKey);
        return result;
    }

    // ========== 事务支持 ==========

    /**
     * 执行事务
     * @param {Function} callback 事务回调函数
     * @returns {Promise<any>} 事务结果
     */
    async transaction(callback) {
        if (!this.adapter) {
            throw new Error('数据库未初始化');
        }
        return await this.adapter.transaction(callback);
    }

    // ========== 备份和恢复 ==========

    /**
     * 备份数据库（使用 pg_dump）
     * @param {string} backupPath 备份路径
     * @returns {Promise<boolean>} 是否成功
     */
    async backup(backupPath) {
        // PostgreSQL 备份需要使用 pg_dump 命令
        // 这里提供一个简单的实现，实际使用时可能需要调整
        globalConfig.error('[数据库服务] PostgreSQL 备份需要使用 pg_dump 命令，请在外部执行备份');
        throw new Error('PostgreSQL 备份功能需要外部工具支持');
    }

    /**
     * 恢复数据库（使用 pg_restore）
     * @param {string} backupPath 备份路径
     * @returns {Promise<boolean>} 是否成功
     */
    async restore(backupPath) {
        // PostgreSQL 恢复需要使用 pg_restore 命令
        globalConfig.error('[数据库服务] PostgreSQL 恢复需要使用 pg_restore 命令，请在外部执行恢复');
        throw new Error('PostgreSQL 恢复功能需要外部工具支持');
    }

    /**
     * 关闭数据库连接
     * @returns {Promise<void>}
     */
    async close() {
        // 停止健康检查
        this.stopHealthCheck();
        
        if (this.adapter) {
            await this.adapter.close();
            this.adapter = null;
            this.initialized = false;
        }
    }

    // ========== 维护操作 ==========

    /**
     * 执行 VACUUM（压缩数据库）
     * @returns {Promise<void>}
     */
    async vacuum() {
        await this.run('VACUUM');
    }

    /**
     * 执行 ANALYZE（更新统计信息）
     * @returns {Promise<void>}
     */
    async analyze() {
        await this.run('ANALYZE');
    }

    /**
     * 获取数据库大小
     * @returns {Promise<number>} 数据库大小（字节）
     */
    async getDatabaseSize() {
        if (!this.adapter) {
            throw new Error('数据库未初始化');
        }
        return await this.adapter.getDatabaseSize();
    }
}

// 单例模式
let databaseServiceInstance = null;

/**
 * 获取数据库服务实例（单例）
 * @returns {DatabaseService} 数据库服务实例
 */
export function getDatabaseService() {
    if (!databaseServiceInstance) {
        databaseServiceInstance = new DatabaseService();
    }
    return databaseServiceInstance;
}

export { DatabaseService };
export default DatabaseService;
