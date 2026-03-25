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
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS message_granular_stats (
                id BIGSERIAL PRIMARY KEY,
                group_id VARCHAR(64) NOT NULL,
                user_id VARCHAR(64) NOT NULL,
                stat_hour TIMESTAMP NOT NULL,
                message_count BIGINT DEFAULT 0 CHECK (message_count >= 0),
                word_count BIGINT DEFAULT 0 CHECK (word_count >= 0),
                created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai'),
                updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai'),
                UNIQUE (group_id, user_id, stat_hour)
            )
        `)

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS user_agg_stats (
                group_id VARCHAR(64) NOT NULL,
                user_id VARCHAR(64) NOT NULL,
                day_msg BIGINT DEFAULT 0 CHECK (day_msg >= 0),
                day_word BIGINT DEFAULT 0 CHECK (day_word >= 0),
                week_msg BIGINT DEFAULT 0 CHECK (week_msg >= 0),
                week_word BIGINT DEFAULT 0 CHECK (week_word >= 0),
                month_msg BIGINT DEFAULT 0 CHECK (month_msg >= 0),
                month_word BIGINT DEFAULT 0 CHECK (month_word >= 0),
                year_msg BIGINT DEFAULT 0 CHECK (year_msg >= 0),
                year_word BIGINT DEFAULT 0 CHECK (year_word >= 0),
                total_msg BIGINT DEFAULT 0 CHECK (total_msg >= 0),
                total_word BIGINT DEFAULT 0 CHECK (total_word >= 0),
                stats_json JSONB NOT NULL DEFAULT '{}'::JSONB,
                continuous_days INTEGER DEFAULT 0 CHECK (continuous_days >= 0),
                last_speaking_time TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai'),
                updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai'),
                PRIMARY KEY (group_id, user_id)
            )
        `)

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS group_info (
                group_id VARCHAR(64) PRIMARY KEY,
                group_name VARCHAR(255) DEFAULT '',
                created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai'),
                updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai')
            )
        `)

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS archived_groups (
                group_id VARCHAR(64) PRIMARY KEY,
                group_name VARCHAR(255) DEFAULT '',
                archived_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai'),
                last_activity_at TIMESTAMP
            )
        `)

        // 重构后不再使用旧兼容结构，初始化时清理历史遗留对象（表/视图）
        const legacyRelations = ['user_stats', 'daily_stats', 'weekly_stats', 'monthly_stats', 'yearly_stats']
        for (const relationName of legacyRelations) {
            const relationResult = await this.pool.query(
                `SELECT table_type
                 FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = $1
                 LIMIT 1`,
                [relationName]
            )

            const tableType = relationResult.rows?.[0]?.table_type
            if (tableType === 'VIEW') {
                await this.pool.query(`DROP VIEW IF EXISTS ${relationName}`)
            } else if (tableType) {
                await this.pool.query(`DROP TABLE IF EXISTS ${relationName}`)
            }
        }
    }

    /**
     * 创建所有索引
     * @returns {Promise<void>}
     */
    async createIndexes() {
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_mgs_group_hour ON message_granular_stats(group_id, stat_hour)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_mgs_group_user_hour ON message_granular_stats(group_id, user_id, stat_hour)`)

        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_uas_day ON user_agg_stats(group_id, day_msg DESC)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_uas_week ON user_agg_stats(group_id, week_msg DESC)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_uas_month ON user_agg_stats(group_id, month_msg DESC)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_uas_year ON user_agg_stats(group_id, year_msg DESC)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_uas_total ON user_agg_stats(group_id, total_msg DESC)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_uas_user_total ON user_agg_stats(user_id, total_msg DESC)`)
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_uas_last_speaking ON user_agg_stats(last_speaking_time DESC)`)

        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_group_info_group_id ON group_info(group_id)`)
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
