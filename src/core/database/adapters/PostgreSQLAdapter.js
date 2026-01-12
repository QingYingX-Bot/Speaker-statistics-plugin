import pg from 'pg'
const { Pool } = pg
import { globalConfig } from '../../ConfigManager.js'
import { BaseAdapter } from './BaseAdapter.js'

/**
 * PostgreSQL 数据库适配器
 * 封装 PostgreSQL 数据库操作
 */
export class PostgreSQLAdapter extends BaseAdapter {
    constructor() {
        super()
        this.pool = null
    }

    /**
     * 初始化数据库连接池
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized && this.pool) {
            return
        }

        try {
            const dbConfig = globalConfig.getConfig('database') || {}
            
            this.pool = new Pool({
                host: dbConfig.host || 'localhost',
                port: dbConfig.port || 5432,
                database: dbConfig.database || 'speech_statistics',
                user: dbConfig.user || 'postgres',
                password: dbConfig.password || '',
                max: dbConfig.pool?.max || 20,
                min: dbConfig.pool?.min || 5,
                idleTimeoutMillis: dbConfig.pool?.idleTimeoutMillis || 30000,
                connectionTimeoutMillis: dbConfig.pool?.connectionTimeoutMillis || 2000,
                ssl: dbConfig.ssl || false
            })

            try {
                const client = await this.pool.connect()
                client.release()
                globalConfig.debug(`[PostgreSQL适配器] 成功连接到 PostgreSQL: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`)
            } catch (err) {
                if (err.code === 'ENOTFOUND' || err.message.includes('getaddrinfo')) {
                    throw new Error(`无法解析数据库主机名 "${dbConfig.host}:${dbConfig.port}" - 请检查主机名是否正确，或使用 IP 地址（如 127.0.0.1）`)
                }
                if (err.code === '28P01' || err.message.includes('password authentication failed')) {
                    throw new Error(`数据库密码认证失败 - 用户: ${dbConfig.user} | 数据库: ${dbConfig.database} | 主机: ${dbConfig.host}:${dbConfig.port}\n请检查用户名和密码是否正确，或执行以下命令创建用户：\nCREATE USER ${dbConfig.user} WITH PASSWORD '你的密码';\nGRANT ALL PRIVILEGES ON DATABASE ${dbConfig.database} TO ${dbConfig.user};`)
                }
                throw err
            }

            await this.createTables()
            await this.createIndexes()
            this.initialized = true

            this.pool.on('error', (err) => {
                globalConfig.error('[PostgreSQL适配器] 连接池错误:', err)
            })
        } catch (err) {
            if (err.message?.includes('数据库')) {
                throw err
            }
            throw new Error(`PostgreSQL 数据库初始化失败: ${err.message}`)
        }
    }

    /**
     * 将通用占位符 ? 转换为 PostgreSQL 占位符 $1, $2, $3...
     * @param {string} sql SQL 语句
     * @returns {string} 转换后的 SQL 语句
     */
    convertPlaceholders(sql) {
        let paramIndex = 1
        return sql.replace(/\?/g, () => `$${paramIndex++}`)
    }

    /**
     * 清理字符串参数中的 null 字节（0x00），PostgreSQL 不允许 UTF-8 字符串中包含 null 字节
     * @param {any} param 要清理的参数
     * @returns {any} 清理后的参数
     */
    sanitizeParam(param) {
        if (param === null || param === undefined) {
            return param
        }
        if (typeof param === 'string') {
            let cleaned = param.replace(/\0/g, '')
            cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '')
            return cleaned
        }
        if (Array.isArray(param)) {
            return param.map(item => this.sanitizeParam(item))
        }
        if (typeof param === 'object') {
            const cleaned = {}
            for (const [key, value] of Object.entries(param)) {
                cleaned[key] = this.sanitizeParam(value)
            }
            return cleaned
        }
        return param
    }

    /**
     * 清理参数数组中的所有字符串参数
     * @param {Array} params 参数数组
     * @returns {Array} 清理后的参数数组
     */
    sanitizeParams(params) {
        if (!params || params.length === 0) {
            return params
        }
        return params.map(param => this.sanitizeParam(param))
    }

    /**
     * 执行 SQL 语句（无返回值）
     * @param {string} sql SQL 语句
     * @param {...any} params 参数
     * @returns {Promise<Object>} 执行结果 { lastID, changes }
     */
    /**
     * 执行查询（内部方法）
     * @param {string} sql SQL 语句
     * @param {Array} params 参数数组
     * @returns {Promise<Object>} 查询结果
     */
    async _executeQuery(sql, params) {
        if (!this.pool) {
            throw new Error('数据库未初始化')
        }
        const convertedSql = this.convertPlaceholders(sql)
        const sanitizedParams = this.sanitizeParams(params)
        return await this.pool.query(convertedSql, sanitizedParams)
    }

    async run(sql, ...params) {
        try {
            const result = await this._executeQuery(sql, params)
            let lastID = null
            if (result.rows?.length > 0 && result.rows[0].id) {
                lastID = result.rows[0].id
            }
            return {
                lastID: lastID,
                changes: result.rowCount || 0
            }
        } catch (err) {
            globalConfig.error(`[PostgreSQL适配器] 执行 SQL 失败: ${sql}`, err)
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
        try {
            const result = await this._executeQuery(sql, params)
            return result.rows[0] || null
        } catch (err) {
            globalConfig.error(`[PostgreSQL适配器] 查询失败: ${sql}`, err)
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
        try {
            const result = await this._executeQuery(sql, params)
            return result.rows || []
        } catch (err) {
            globalConfig.error(`[PostgreSQL适配器] 查询失败: ${sql}`, err)
            throw err
        }
    }

    /**
     * 执行 SQL 语句（用于创建表等，可以执行多条语句）
     * @param {string} sql SQL 语句
     * @returns {Promise<void>}
     */
    async exec(sql) {
        if (!this.pool) {
            throw new Error('数据库未初始化')
        }

        try {
            const statements = sql.split(';').filter(s => s.trim())
            for (const statement of statements) {
                if (statement.trim()) {
                    await this.pool.query(statement.trim())
                }
            }
        } catch (err) {
            globalConfig.error(`[PostgreSQL适配器] 执行 SQL 失败: ${sql}`, err)
            throw err
        }
    }

    /**
     * 执行事务
     * @param {Function} callback 事务回调函数，接收 client 作为参数
     * @returns {Promise<any>} 事务执行结果
     */
    async transaction(callback) {
        if (!this.pool) {
            throw new Error('数据库未初始化')
        }

        const client = await this.pool.connect()
        try {
            await client.query('BEGIN')
            const result = await callback(client)
            await client.query('COMMIT')
            return result
        } catch (err) {
            await client.query('ROLLBACK')
            throw err
        } finally {
            client.release()
        }
    }

    /**
     * 创建所有表
     * @returns {Promise<void>}
     */
    async createTables() {
        // 用户基础统计表
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS user_stats (
                group_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                nickname VARCHAR(255) DEFAULT '',
                total_count BIGINT DEFAULT 0,
                total_words BIGINT DEFAULT 0,
                active_days INTEGER DEFAULT 0,
                continuous_days INTEGER DEFAULT 0,
                last_speaking_time VARCHAR(255),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (group_id, user_id)
            )
        `)

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS daily_stats (
                group_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                date_key VARCHAR(255) NOT NULL,
                message_count BIGINT DEFAULT 0,
                word_count BIGINT DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (group_id, user_id, date_key)
            )
        `)

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS weekly_stats (
                group_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                week_key VARCHAR(255) NOT NULL,
                message_count BIGINT DEFAULT 0,
                word_count BIGINT DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (group_id, user_id, week_key)
            )
        `)

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS monthly_stats (
                group_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                month_key VARCHAR(255) NOT NULL,
                message_count BIGINT DEFAULT 0,
                word_count BIGINT DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (group_id, user_id, month_key)
            )
        `)

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS yearly_stats (
                group_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                year_key VARCHAR(255) NOT NULL,
                message_count BIGINT DEFAULT 0,
                word_count BIGINT DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (group_id, user_id, year_key)
            )
        `)

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS achievements (
                group_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                achievement_id VARCHAR(255) NOT NULL,
                unlocked BOOLEAN DEFAULT false,
                unlocked_at TIMESTAMP,
                progress INTEGER DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (group_id, user_id, achievement_id)
            )
        `)

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS user_display_achievements (
                group_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                achievement_id VARCHAR(255) NOT NULL,
                achievement_name VARCHAR(255) NOT NULL,
                rarity VARCHAR(50) DEFAULT 'common',
                is_manual BOOLEAN DEFAULT false,
                auto_display_at TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (group_id, user_id)
            )
        `)

        try {
            await this.pool.query(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'user_display_achievements' 
                        AND column_name = 'is_manual'
                    ) THEN
                        ALTER TABLE user_display_achievements ADD COLUMN is_manual BOOLEAN DEFAULT false
                    END IF
                    
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'user_display_achievements' 
                        AND column_name = 'auto_display_at'
                    ) THEN
                        ALTER TABLE user_display_achievements ADD COLUMN auto_display_at TIMESTAMP
                    END IF
                END $$
            `)
        } catch (err) {
            globalConfig.debug('[PostgreSQL适配器] 数据库迁移失败（可能字段已存在）:', err.message)
        }

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS group_info (
                group_id VARCHAR(255) PRIMARY KEY,
                group_name VARCHAR(255) DEFAULT '',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `)

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS archived_groups (
                group_id VARCHAR(255) PRIMARY KEY,
                group_name VARCHAR(255) DEFAULT '',
                archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_activity_at TIMESTAMP,
                CONSTRAINT fk_archived_group FOREIGN KEY (group_id) REFERENCES group_info(group_id) ON DELETE CASCADE
            )
        `)
    }

    /**
     * 创建所有索引
     * @returns {Promise<void>}
     */
    async createIndexes() {
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_user_stats_group ON user_stats(group_id)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_user_stats_user ON user_stats(user_id)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_user_stats_group_user ON user_stats(group_id, user_id)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_user_stats_total_count ON user_stats(total_count DESC)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_user_stats_total_words ON user_stats(total_words DESC)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_user_stats_active_days ON user_stats(active_days DESC)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_user_stats_continuous_days ON user_stats(continuous_days DESC)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_user_stats_user_total_count ON user_stats(user_id, total_count DESC)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_user_stats_group_total_count ON user_stats(group_id, total_count DESC)`)

        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_daily_stats_group_user_date ON daily_stats(group_id, user_id, date_key)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date_key)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_daily_stats_group_date ON daily_stats(group_id, date_key)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_daily_stats_user_id ON daily_stats(user_id)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON daily_stats(user_id, date_key)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date_count ON daily_stats(user_id, date_key) WHERE message_count > 0 OR word_count > 0`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_daily_stats_date_group_count ON daily_stats(date_key, group_id, message_count DESC)`)

        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_weekly_stats_group_user_week ON weekly_stats(group_id, user_id, week_key)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_weekly_stats_week ON weekly_stats(week_key)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_weekly_stats_group_week ON weekly_stats(group_id, week_key)`)

        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_monthly_stats_group_user_month ON monthly_stats(group_id, user_id, month_key)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_monthly_stats_month ON monthly_stats(month_key)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_monthly_stats_group_month ON monthly_stats(group_id, month_key)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_monthly_stats_month_group_count ON monthly_stats(month_key, group_id, message_count DESC)`)

        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_yearly_stats_group_user_year ON yearly_stats(group_id, user_id, year_key)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_yearly_stats_year ON yearly_stats(year_key)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_yearly_stats_group_year ON yearly_stats(group_id, year_key)`)

        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_achievements_group_user ON achievements(group_id, user_id)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_achievements_unlocked ON achievements(group_id, user_id, unlocked)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_achievements_achievement_id ON achievements(achievement_id)`)

        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_display_achievements_group_user ON user_display_achievements(group_id, user_id)`)

        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_group_info_group_id ON group_info(group_id)`)

        try {
            await this.pool.query(`DROP INDEX IF EXISTS idx_archived_groups_cleanup`)
        } catch (err) {
            globalConfig.debug(`[PostgreSQL适配器] 清理旧索引时出现错误（可忽略）: ${err.message}`)
        }
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_archived_groups_archived_at ON archived_groups(archived_at)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_archived_groups_last_activity ON archived_groups(last_activity_at)`)
    }

    /**
     * 获取数据库大小
     * @returns {Promise<number>} 数据库大小（字节）
     */
    async getDatabaseSize() {
        try {
            const result = await this.get(`SELECT pg_database_size(current_database()) as size`)
            return result?.size || 0
        } catch (err) {
            globalConfig.error('[PostgreSQL适配器] 获取数据库大小失败:', err)
            return 0
        }
    }

    /**
     * 关闭数据库连接
     * @returns {Promise<void>}
     */
    async close() {
        if (this.pool) {
            await this.pool.end()
            this.pool = null
            this.initialized = false
        }
    }
}

