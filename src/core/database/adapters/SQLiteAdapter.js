import { globalConfig } from '../../ConfigManager.js'
import { PathResolver } from '../../utils/PathResolver.js'
import { BaseAdapter } from './BaseAdapter.js'
import fs from 'fs'
import path from 'path'

/**
 * SQLite 数据库适配器
 * 封装 SQLite 数据库操作
 */
export class SQLiteAdapter extends BaseAdapter {
    constructor() {
        super()
        this.db = null
    }

    /**
     * 初始化数据库连接
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized && this.db) {
            return
        }

        try {
            // 动态导入 better-sqlite3（如果可用）或 sqlite3
            let Database
            let importError = null
            
            try {
                const betterSqlite3 = await import('better-sqlite3')
                Database = betterSqlite3.default
                this.useBetterSqlite3 = true
            } catch (err) {
                importError = err
                const isBindingsError = err.message && (
                    err.message.includes('bindings file') ||
                    err.message.includes('Cannot find module') ||
                    err.message.includes('build/Release') ||
                    err.message.includes('compiled/')
                )
                
                const nodeVersion = process.version
                const nodeMajorVersion = parseInt(nodeVersion.split('.')[0].replace('v', ''))
                
                try {
                    const sqlite3 = await import('sqlite3')
                    Database = sqlite3.Database
                    this.useBetterSqlite3 = false
                } catch {
                    if (isBindingsError) {
                        let solutionMsg = 'SQLite 数据库驱动未正确安装。\n' +
                            'better-sqlite3 安装失败（bindings 文件缺失，可能是 Node.js 版本不匹配）。\n' +
                            '\n当前 Node.js 版本：' + nodeVersion + '\n' +
                            '\n请尝试以下解决方案：\n'
                        
                        if (process.env.NVM_DIR || process.env.NVM_HOME) {
                            solutionMsg += '1. 如果使用 nvm，请先切换到正确的 Node.js 版本：\n' +
                                '   nvm use 24  # 或使用其他已安装的版本\n' +
                                '   然后重新安装 better-sqlite3：\n' +
                                '   cd plugins/Speaker-statistics-plugin\n' +
                                '   pnpm install better-sqlite3 --force\n\n'
                        } else {
                            solutionMsg += '1. 重新安装 better-sqlite3（确保 Node.js 版本匹配）：\n' +
                                '   cd plugins/Speaker-statistics-plugin\n' +
                                '   pnpm install better-sqlite3 --force\n\n'
                        }
                        
                        solutionMsg += '2. 如果使用 Linux，确保已安装构建工具：\n' +
                            '   sudo apt-get install build-essential python3  # Debian/Ubuntu\n' +
                            '   或\n' +
                            '   sudo yum install gcc gcc-c++ make python3  # CentOS/RHEL\n\n' +
                            '3. 如果使用 Windows，可能需要安装构建工具：\n' +
                            '   npm install --global windows-build-tools\n' +
                            '   或者安装 Visual Studio Build Tools\n\n' +
                            '4. 或者安装 sqlite3（性能较差但更稳定）：\n' +
                            '   pnpm install sqlite3\n\n' +
                            '5. 如果不想使用 SQLite，请在配置中设置 "type": "postgresql"\n' +
                            '\n原始错误：' + err.message.substring(0, 500)
                        
                        throw new Error(solutionMsg)
                    } else {
                        throw new Error(
                            'SQLite 数据库驱动未安装。请执行以下命令安装：\n' +
                            '  pnpm install better-sqlite3\n' +
                            '或者：\n' +
                            '  pnpm install sqlite3\n' +
                            '\n如果不想使用 SQLite，请在配置中设置 "type": "postgresql"\n' +
                            '\n原始错误：' + err.message
                        )
                    }
                }
            }

            const dbConfig = globalConfig.getConfig('database') || {}
            let dbPath = dbConfig.path
            
            if (!dbPath) {
                try {
                    dbPath = path.join(PathResolver.getDataDir(), 'speech_statistics.db')
                } catch {
                    const pluginDir = PathResolver.getPluginDir()
                    dbPath = path.join(pluginDir, 'data', 'speech_statistics.db')
                }
            } else {
                const isAbsolute = path.isAbsolute(dbPath)
                const hasPathSeparator = dbPath.includes(path.sep) || dbPath.includes('/') || dbPath.includes('\\')
                
                if (!isAbsolute && !hasPathSeparator) {
                    try {
                        dbPath = path.join(PathResolver.getDataDir(), dbPath)
                    } catch {
                        const pluginDir = PathResolver.getPluginDir()
                        dbPath = path.join(pluginDir, 'data', dbPath)
                    }
                } else if (!isAbsolute && hasPathSeparator) {
                    const pluginDir = PathResolver.getPluginDir()
                    dbPath = path.resolve(pluginDir, dbPath)
                }
            }
            
            const dbDir = path.dirname(dbPath)
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true })
            }

            if (this.useBetterSqlite3) {
                this.db = new Database(dbPath)
                this.db.pragma('journal_mode = WAL')
                this.db.pragma('synchronous = NORMAL')
                this.db.pragma('cache_size = -64000')
                this.db.pragma('temp_store = MEMORY')
                this.db.pragma('mmap_size = 268435456')
                this.db.pragma('busy_timeout = 5000')
                this.db.pragma('foreign_keys = ON')
            } else {
                this.db = await new Promise((resolve, reject) => {
                    const db = new Database(dbPath, (err) => {
                        if (err) reject(err)
                        else resolve(db)
                    })
                })
                await this.run('PRAGMA journal_mode = WAL')
                await this.run('PRAGMA synchronous = NORMAL')
                await this.run('PRAGMA cache_size = -64000')
                await this.run('PRAGMA temp_store = MEMORY')
                await this.run('PRAGMA mmap_size = 268435456')
                await this.run('PRAGMA busy_timeout = 5000')
                await this.run('PRAGMA foreign_keys = ON')
            }

            await this.createTables()
            await this.createIndexes()
            this.initialized = true
        } catch (err) {
            if (err.message && (
                err.message.includes('bindings file') ||
                err.message.includes('Could not locate the bindings')
            )) {
                const nodeVersion = process.version
                let solutionMsg = `SQLite 数据库初始化失败：better-sqlite3 模块未正确安装。\n` +
                    `\n当前 Node.js 版本：${nodeVersion}\n` +
                    `\n请尝试以下解决方案：\n`
                
                if (process.env.NVM_DIR || process.env.NVM_HOME) {
                    solutionMsg += `1. 如果使用 nvm，请先切换到正确的 Node.js 版本：\n` +
                        `   nvm use 24  # 或使用其他已安装的版本\n` +
                        `   然后重新安装 better-sqlite3：\n` +
                        `   cd plugins/Speaker-statistics-plugin\n` +
                        `   pnpm install better-sqlite3 --force\n\n`
                } else {
                    solutionMsg += `1. 重新安装 better-sqlite3（确保 Node.js 版本匹配）：\n` +
                        `   cd plugins/Speaker-statistics-plugin\n` +
                        `   pnpm install better-sqlite3 --force\n\n`
                }
                
                solutionMsg += `2. 如果使用 Linux，确保已安装构建工具：\n` +
                    `   sudo apt-get install build-essential python3  # Debian/Ubuntu\n` +
                    `   或\n` +
                    `   sudo yum install gcc gcc-c++ make python3  # CentOS/RHEL\n\n` +
                    `3. 如果问题仍然存在，尝试使用 sqlite3：\n` +
                    `   pnpm install sqlite3\n` +
                    `   然后修改配置使用 PostgreSQL 或重新安装 better-sqlite3\n\n` +
                    `4. 如果使用 Windows，可能需要安装构建工具：\n` +
                    `   npm install --global windows-build-tools\n\n` +
                    `5. 如果不想使用 SQLite，请在配置中设置 "type": "postgresql"\n` +
                    `\n原始错误：${err.message.substring(0, 500)}`
                
                throw new Error(solutionMsg)
            }
            throw new Error(`SQLite 数据库初始化失败: ${err.message}`)
        }
    }

    /**
     * SQLite 使用 ? 作为占位符，不需要转换
     * @param {string} sql SQL 语句
     * @returns {string} SQL 语句（不变）
     */
    convertPlaceholders(sql) {
        if (sql.includes('$')) {
            return sql.replace(/\$(\d+)/g, '?')
        }
        return sql
    }

    /**
     * 转换参数为 SQLite 支持的类型
     * @param {any} value 参数值
     * @returns {number|string|bigint|Buffer|null} 转换后的值
     */
    convertParam(value) {
        if (value === null || value === undefined) {
            return null
        }
        
        if (typeof value === 'boolean') {
            return value ? 1 : 0
        }
        
        if (value instanceof Date) {
            return value.toISOString()
        }
        
        if (typeof value === 'number' || typeof value === 'string' || typeof value === 'bigint' || Buffer.isBuffer(value)) {
            return value
        }
        
        if (typeof value === 'object') {
            if (Array.isArray(value) && value.length === 0) {
                return null
            }
            if (!Array.isArray(value) && Object.keys(value).length === 0) {
                return null
            }
            try {
                return JSON.stringify(value)
            } catch {
                return null
            }
        }
        
        return null
    }

    /**
     * 准备参数（内部方法）
     * @param {string} sql SQL 语句
     * @param {Array} params 参数数组
     * @returns {Object} { convertedSql, convertedParams }
     */
    _prepareParams(sql, params) {
        if (!this.db) {
            throw new Error('数据库未初始化')
        }
        const convertedSql = this.convertPlaceholders(sql)
        const convertedParams = params.map(param => this.convertParam(param))
        return { convertedSql, convertedParams }
    }

    /**
     * 执行 SQL 语句（无返回值）
     * @param {string} sql SQL 语句
     * @param {...any} params 参数
     * @returns {Promise<Object>} 执行结果 { lastID, changes }
     */
    async run(sql, ...params) {
        const { convertedSql, convertedParams } = this._prepareParams(sql, params)
            
            if (this.useBetterSqlite3) {
            const stmt = this.db.prepare(convertedSql)
            const result = stmt.run(...convertedParams)
                return {
                    lastID: result.lastInsertRowid || null,
                    changes: result.changes || 0
            }
            } else {
                return new Promise((resolve, reject) => {
                    this.db.run(convertedSql, convertedParams, function(err) {
                        if (err) {
                        reject(err)
                        } else {
                            resolve({
                                lastID: this.lastID || null,
                                changes: this.changes || 0
                        })
                        }
                })
            })
        }
    }

    /**
     * 执行 SQL 查询（返回单行）
     * @param {string} sql SQL 语句
     * @param {...any} params 参数
     * @returns {Promise<Object|null>} 查询结果
     */
    async get(sql, ...params) {
        const { convertedSql, convertedParams } = this._prepareParams(sql, params)
            
            if (this.useBetterSqlite3) {
            const stmt = this.db.prepare(convertedSql)
            return stmt.get(...convertedParams) || null
            } else {
                return new Promise((resolve, reject) => {
                    this.db.get(convertedSql, convertedParams, (err, row) => {
                        if (err) {
                        reject(err)
                        } else {
                        resolve(row || null)
                        }
                })
            })
        }
    }

    /**
     * 执行 SQL 查询（返回多行）
     * @param {string} sql SQL 语句
     * @param {...any} params 参数
     * @returns {Promise<Array>} 查询结果数组
     */
    async all(sql, ...params) {
        const { convertedSql, convertedParams } = this._prepareParams(sql, params)
            
            if (this.useBetterSqlite3) {
            const stmt = this.db.prepare(convertedSql)
            return stmt.all(...convertedParams) || []
            } else {
                return new Promise((resolve, reject) => {
                    this.db.all(convertedSql, convertedParams, (err, rows) => {
                        if (err) {
                        reject(err)
                        } else {
                        resolve(rows || [])
                        }
                })
            })
        }
    }

    /**
     * 执行 SQL 语句（用于创建表等）
     * @param {string} sql SQL 语句
     * @returns {Promise<void>}
     */
    async exec(sql) {
        if (!this.db) {
            throw new Error('数据库未初始化')
        }
        const convertedSql = this.convertPlaceholders(sql)
            if (this.useBetterSqlite3) {
            this.db.exec(convertedSql)
            } else {
                await new Promise((resolve, reject) => {
                    this.db.exec(convertedSql, (err) => {
                    if (err) reject(err)
                    else resolve()
                })
            })
        }
    }

    /**
     * 执行事务
     * @param {Function} callback 事务回调函数
     * @returns {Promise<any>} 事务执行结果
     */
    async transaction(callback) {
        if (!this.db) {
            throw new Error('数据库未初始化')
        }

        if (this.useBetterSqlite3) {
            const transaction = this.db.transaction(callback)
            return transaction()
        } else {
            return new Promise((resolve, reject) => {
                this.db.serialize(() => {
                    this.db.run('BEGIN TRANSACTION', (err) => {
                        if (err) {
                            reject(err)
                            return
                        }
                        
                        Promise.resolve(callback(this.db))
                            .then((result) => {
                                this.db.run('COMMIT', (commitErr) => {
                                    if (commitErr) {
                                        this.db.run('ROLLBACK', () => {
                                            reject(commitErr)
                                        })
                                    } else {
                                        resolve(result)
                                    }
                                })
                            })
                            .catch((err) => {
                                this.db.run('ROLLBACK', () => {
                                    reject(err)
                                })
                            })
                    })
                })
            })
        }
    }

    /**
     * 创建所有表
     * @returns {Promise<void>}
     */
    async createTables() {
        await this.exec(`
            CREATE TABLE IF NOT EXISTS user_stats (
                group_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                nickname TEXT DEFAULT '',
                total_count INTEGER DEFAULT 0,
                total_words INTEGER DEFAULT 0,
                active_days INTEGER DEFAULT 0,
                continuous_days INTEGER DEFAULT 0,
                last_speaking_time TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
                PRIMARY KEY (group_id, user_id)
            )
        `)

        await this.exec(`
            CREATE TABLE IF NOT EXISTS daily_stats (
                group_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                date_key TEXT NOT NULL,
                message_count INTEGER DEFAULT 0,
                word_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
                PRIMARY KEY (group_id, user_id, date_key)
            )
        `)

        await this.exec(`
            CREATE TABLE IF NOT EXISTS weekly_stats (
                group_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                week_key TEXT NOT NULL,
                message_count INTEGER DEFAULT 0,
                word_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
                PRIMARY KEY (group_id, user_id, week_key)
            )
        `)

        await this.exec(`
            CREATE TABLE IF NOT EXISTS monthly_stats (
                group_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                month_key TEXT NOT NULL,
                message_count INTEGER DEFAULT 0,
                word_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
                PRIMARY KEY (group_id, user_id, month_key)
            )
        `)

        await this.exec(`
            CREATE TABLE IF NOT EXISTS yearly_stats (
                group_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                year_key TEXT NOT NULL,
                message_count INTEGER DEFAULT 0,
                word_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
                PRIMARY KEY (group_id, user_id, year_key)
            )
        `)

        await this.exec(`
            CREATE TABLE IF NOT EXISTS achievements (
                group_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                achievement_id TEXT NOT NULL,
                unlocked INTEGER DEFAULT 0,
                unlocked_at TEXT,
                progress INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
                PRIMARY KEY (group_id, user_id, achievement_id)
            )
        `)

        await this.exec(`
            CREATE TABLE IF NOT EXISTS user_display_achievements (
                group_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                achievement_id TEXT NOT NULL,
                achievement_name TEXT NOT NULL,
                rarity TEXT DEFAULT 'common',
                is_manual INTEGER DEFAULT 0,
                auto_display_at TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
                PRIMARY KEY (group_id, user_id)
            )
        `)

        try {
            const tableInfo = await this.all(`PRAGMA table_info(user_display_achievements)`)
            const columnNames = tableInfo.map(col => col.name.toLowerCase())
            
            if (!columnNames.includes('is_manual')) {
                try {
                    await this.run(`ALTER TABLE user_display_achievements ADD COLUMN is_manual INTEGER DEFAULT 0`)
                } catch {}
            }
            
            if (!columnNames.includes('auto_display_at')) {
                try {
                    await this.run(`ALTER TABLE user_display_achievements ADD COLUMN auto_display_at TEXT`)
                } catch {}
            }
        } catch {}

        await this.exec(`
            CREATE TABLE IF NOT EXISTS group_info (
                group_id TEXT PRIMARY KEY,
                group_name TEXT DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
            )
        `)

        await this.exec(`
            CREATE TABLE IF NOT EXISTS archived_groups (
                group_id TEXT PRIMARY KEY,
                group_name TEXT DEFAULT '',
                archived_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
                last_activity_at TEXT,
                FOREIGN KEY (group_id) REFERENCES group_info(group_id) ON DELETE CASCADE
            )
        `)
    }

    /**
     * 创建所有索引
     * @returns {Promise<void>}
     */
    async createIndexes() {
        await this.run(`CREATE INDEX IF NOT EXISTS idx_user_stats_group ON user_stats(group_id)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_user_stats_user ON user_stats(user_id)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_user_stats_group_user ON user_stats(group_id, user_id)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_user_stats_total_count ON user_stats(total_count DESC)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_user_stats_total_words ON user_stats(total_words DESC)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_user_stats_active_days ON user_stats(active_days DESC)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_user_stats_continuous_days ON user_stats(continuous_days DESC)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_user_stats_user_total_count ON user_stats(user_id, total_count DESC)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_user_stats_group_total_count ON user_stats(group_id, total_count DESC)`)

        await this.run(`CREATE INDEX IF NOT EXISTS idx_daily_stats_group_user_date ON daily_stats(group_id, user_id, date_key)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date_key)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_daily_stats_group_date ON daily_stats(group_id, date_key)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_daily_stats_user_id ON daily_stats(user_id)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON daily_stats(user_id, date_key)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_daily_stats_date_group_count ON daily_stats(date_key, group_id, message_count DESC)`)

        await this.run(`CREATE INDEX IF NOT EXISTS idx_weekly_stats_group_user_week ON weekly_stats(group_id, user_id, week_key)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_weekly_stats_week ON weekly_stats(week_key)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_weekly_stats_group_week ON weekly_stats(group_id, week_key)`)

        await this.run(`CREATE INDEX IF NOT EXISTS idx_monthly_stats_group_user_month ON monthly_stats(group_id, user_id, month_key)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_monthly_stats_month ON monthly_stats(month_key)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_monthly_stats_group_month ON monthly_stats(group_id, month_key)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_monthly_stats_month_group_count ON monthly_stats(month_key, group_id, message_count DESC)`)

        await this.run(`CREATE INDEX IF NOT EXISTS idx_yearly_stats_group_user_year ON yearly_stats(group_id, user_id, year_key)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_yearly_stats_year ON yearly_stats(year_key)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_yearly_stats_group_year ON yearly_stats(group_id, year_key)`)

        await this.run(`CREATE INDEX IF NOT EXISTS idx_achievements_group_user ON achievements(group_id, user_id)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_achievements_unlocked ON achievements(group_id, user_id, unlocked)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_achievements_achievement_id ON achievements(achievement_id)`)

        await this.run(`CREATE INDEX IF NOT EXISTS idx_display_achievements_group_user ON user_display_achievements(group_id, user_id)`)

        await this.run(`CREATE INDEX IF NOT EXISTS idx_group_info_group_id ON group_info(group_id)`)

        await this.run(`CREATE INDEX IF NOT EXISTS idx_archived_groups_archived_at ON archived_groups(archived_at)`)
        await this.run(`CREATE INDEX IF NOT EXISTS idx_archived_groups_last_activity ON archived_groups(last_activity_at)`)
    }

    /**
     * 获取数据库大小
     * @returns {Promise<number>} 数据库大小（字节）
     */
    async getDatabaseSize() {
        try {
            const result = await this.get(`
                SELECT page_count * page_size as size
                FROM pragma_page_count(), pragma_page_size()
            `)
            return result?.size || 0
        } catch {
            return 0
        }
    }

    /**
     * 关闭数据库连接
     * @returns {Promise<void>}
     */
    async close() {
        if (this.db) {
            if (this.useBetterSqlite3) {
                this.db.close()
            } else {
                await new Promise((resolve, reject) => {
                    this.db.close((err) => {
                        if (err) reject(err)
                        else resolve()
                    })
                })
            }
            this.db = null
            this.initialized = false
        }
    }
}

