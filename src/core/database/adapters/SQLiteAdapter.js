import { globalConfig } from '../../ConfigManager.js';
import { PathResolver } from '../../utils/PathResolver.js';
import { BaseAdapter } from './BaseAdapter.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * SQLite 数据库适配器
 * 封装 SQLite 数据库操作
 */
export class SQLiteAdapter extends BaseAdapter {
    constructor() {
        super();
        this.db = null;
    }

    /**
     * 初始化数据库连接
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized && this.db) {
            return;
        }

        try {
            // 动态导入 better-sqlite3（如果可用）或 sqlite3
            let Database;
            let importError = null;
            
            try {
                // 优先使用 better-sqlite3（性能更好）
                const betterSqlite3 = await import('better-sqlite3');
                Database = betterSqlite3.default;
                this.useBetterSqlite3 = true;
            } catch (error) {
                importError = error;
                // 检查是否是 bindings 文件缺失错误
                const isBindingsError = error.message && (
                    error.message.includes('bindings file') ||
                    error.message.includes('Cannot find module') ||
                    error.message.includes('build/Release') ||
                    error.message.includes('compiled/')
                );
                
                // 获取 Node.js 版本信息
                const nodeVersion = process.version;
                const nodeMajorVersion = parseInt(nodeVersion.split('.')[0].replace('v', ''));
                
                // 尝试回退到 sqlite3
                try {
                    const sqlite3 = await import('sqlite3');
                    Database = sqlite3.Database;
                    this.useBetterSqlite3 = false;
                } catch (sqlite3Error) {
                    // 两个库都不可用，给出清晰的错误提示
                    if (isBindingsError) {
                        let solutionMsg = 'SQLite 数据库驱动未正确安装。\n' +
                            'better-sqlite3 安装失败（bindings 文件缺失，可能是 Node.js 版本不匹配）。\n' +
                            '\n当前 Node.js 版本：' + nodeVersion + '\n' +
                            '\n请尝试以下解决方案：\n';
                        
                        // 如果使用 nvm，添加 nvm 相关提示
                        if (process.env.NVM_DIR || process.env.NVM_HOME) {
                            solutionMsg += '1. 如果使用 nvm，请先切换到正确的 Node.js 版本：\n' +
                                '   nvm use 24  # 或使用其他已安装的版本\n' +
                                '   然后重新安装 better-sqlite3：\n' +
                                '   cd plugins/Speaker-statistics-plugin\n' +
                                '   pnpm install better-sqlite3 --force\n\n';
                        } else {
                            solutionMsg += '1. 重新安装 better-sqlite3（确保 Node.js 版本匹配）：\n' +
                                '   cd plugins/Speaker-statistics-plugin\n' +
                                '   pnpm install better-sqlite3 --force\n\n';
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
                            '\n原始错误：' + error.message.substring(0, 500);
                        
                        throw new Error(solutionMsg);
                    } else {
                        throw new Error(
                            'SQLite 数据库驱动未安装。请执行以下命令安装：\n' +
                            '  pnpm install better-sqlite3\n' +
                            '或者：\n' +
                            '  pnpm install sqlite3\n' +
                            '\n如果不想使用 SQLite，请在配置中设置 "type": "postgresql"\n' +
                            '\n原始错误：' + error.message
                        );
                    }
                }
            }

            // 从配置获取数据库路径
            const dbConfig = globalConfig.getConfig('database') || {};
            let dbPath = dbConfig.path;
            
            if (!dbPath) {
                // 如果没有指定路径，默认使用插件 data 目录
                try {
                    dbPath = path.join(PathResolver.getDataDir(), 'speech_statistics.db');
                } catch (error) {
                    // 如果 PathResolver 不可用，使用插件目录下的 data 目录
                    const pluginDir = PathResolver.getPluginDir();
                    dbPath = path.join(pluginDir, 'data', 'speech_statistics.db');
                }
            } else {
                // 如果指定了路径，检查是否是相对路径（只包含文件名或相对路径）
                // 如果路径不包含路径分隔符（/ 或 \），或者不是绝对路径，则视为相对路径
                const isAbsolute = path.isAbsolute(dbPath);
                const hasPathSeparator = dbPath.includes(path.sep) || dbPath.includes('/') || dbPath.includes('\\');
                
                if (!isAbsolute && !hasPathSeparator) {
                    // 相对路径（只有文件名），自动拼接插件 data 目录
                    try {
                        dbPath = path.join(PathResolver.getDataDir(), dbPath);
                    } catch (error) {
                        // 如果 PathResolver 不可用，使用插件目录下的 data 目录
                        const pluginDir = PathResolver.getPluginDir();
                        dbPath = path.join(pluginDir, 'data', dbPath);
                    }
                } else if (!isAbsolute && hasPathSeparator) {
                    // 相对路径（包含路径分隔符），相对于插件目录
                    const pluginDir = PathResolver.getPluginDir();
                    dbPath = path.resolve(pluginDir, dbPath);
                }
                // 如果是绝对路径，直接使用
            }
            
            // 确保目录存在
            const dbDir = path.dirname(dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // 创建数据库连接
            if (this.useBetterSqlite3) {
                // better-sqlite3 是同步的
                this.db = new Database(dbPath);
                // 启用 WAL 模式（提高并发性能）
                this.db.pragma('journal_mode = WAL');
            } else {
                // sqlite3 是异步的，需要 Promise 包装
                this.db = await new Promise((resolve, reject) => {
                    const db = new Database(dbPath, (err) => {
                        if (err) reject(err);
                        else resolve(db);
                    });
                });
                // 启用 WAL 模式
                await this.run('PRAGMA journal_mode = WAL');
            }

            globalConfig.debug(`[SQLite适配器] 成功连接到 SQLite: ${dbPath}`);

            // 执行建表和建索引
            await this.createTables();
            await this.createIndexes();

            this.initialized = true;
        } catch (error) {
            // 检查是否是 better-sqlite3 的 bindings 文件缺失错误
            if (error.message && (
                error.message.includes('bindings file') ||
                error.message.includes('Could not locate the bindings')
            )) {
                const nodeVersion = process.version;
                let solutionMsg = `SQLite 数据库初始化失败：better-sqlite3 模块未正确安装。\n` +
                    `\n当前 Node.js 版本：${nodeVersion}\n` +
                    `\n请尝试以下解决方案：\n`;
                
                // 如果使用 nvm，添加 nvm 相关提示
                if (process.env.NVM_DIR || process.env.NVM_HOME) {
                    solutionMsg += `1. 如果使用 nvm，请先切换到正确的 Node.js 版本：\n` +
                        `   nvm use 24  # 或使用其他已安装的版本\n` +
                        `   然后重新安装 better-sqlite3：\n` +
                        `   cd plugins/Speaker-statistics-plugin\n` +
                        `   pnpm install better-sqlite3 --force\n\n`;
                } else {
                    solutionMsg += `1. 重新安装 better-sqlite3（确保 Node.js 版本匹配）：\n` +
                        `   cd plugins/Speaker-statistics-plugin\n` +
                        `   pnpm install better-sqlite3 --force\n\n`;
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
                    `\n原始错误：${error.message.substring(0, 500)}`;
                
                throw new Error(solutionMsg);
            }
            throw new Error(`SQLite 数据库初始化失败: ${error.message}`);
        }
    }

    /**
     * SQLite 使用 ? 作为占位符，不需要转换
     * @param {string} sql SQL 语句
     * @returns {string} SQL 语句（不变）
     */
    convertPlaceholders(sql) {
        // SQLite 使用 ? 占位符，但如果传入的是 $1, $2... 格式，需要转换
        // 为了兼容，我们支持两种格式
        if (sql.includes('$')) {
            // 将 $1, $2, $3... 转换为 ?
            return sql.replace(/\$(\d+)/g, '?');
        }
        return sql;
    }

    /**
     * 执行 SQL 语句（无返回值）
     * @param {string} sql SQL 语句
     * @param {...any} params 参数
     * @returns {Promise<Object>} 执行结果 { lastID, changes }
     */
    async run(sql, ...params) {
        if (!this.db) {
            throw new Error('数据库未初始化');
        }

        try {
            const convertedSql = this.convertPlaceholders(sql);
            
            if (this.useBetterSqlite3) {
                // better-sqlite3 同步 API
                const stmt = this.db.prepare(convertedSql);
                const result = stmt.run(...params);
                return {
                    lastID: result.lastInsertRowid || null,
                    changes: result.changes || 0
                };
            } else {
                // sqlite3 异步 API
                return new Promise((resolve, reject) => {
                    this.db.run(convertedSql, params, function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({
                                lastID: this.lastID || null,
                                changes: this.changes || 0
                            });
                        }
                    });
                });
            }
        } catch (error) {
            globalConfig.error(`[SQLite适配器] 执行 SQL 失败: ${sql}`, error);
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
        if (!this.db) {
            throw new Error('数据库未初始化');
        }

        try {
            const convertedSql = this.convertPlaceholders(sql);
            
            if (this.useBetterSqlite3) {
                // better-sqlite3 同步 API
                const stmt = this.db.prepare(convertedSql);
                return stmt.get(...params) || null;
            } else {
                // sqlite3 异步 API
                return new Promise((resolve, reject) => {
                    this.db.get(convertedSql, params, (err, row) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(row || null);
                        }
                    });
                });
            }
        } catch (error) {
            globalConfig.error(`[SQLite适配器] 查询失败: ${sql}`, error);
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
        if (!this.db) {
            throw new Error('数据库未初始化');
        }

        try {
            const convertedSql = this.convertPlaceholders(sql);
            
            if (this.useBetterSqlite3) {
                // better-sqlite3 同步 API
                const stmt = this.db.prepare(convertedSql);
                return stmt.all(...params) || [];
            } else {
                // sqlite3 异步 API
                return new Promise((resolve, reject) => {
                    this.db.all(convertedSql, params, (err, rows) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(rows || []);
                        }
                    });
                });
            }
        } catch (error) {
            globalConfig.error(`[SQLite适配器] 查询失败: ${sql}`, error);
            throw error;
        }
    }

    /**
     * 执行 SQL 语句（用于创建表等）
     * @param {string} sql SQL 语句
     * @returns {Promise<void>}
     */
    async exec(sql) {
        if (!this.db) {
            throw new Error('数据库未初始化');
        }

        try {
            const convertedSql = this.convertPlaceholders(sql);
            // SQLite 支持执行多条语句
            if (this.useBetterSqlite3) {
                this.db.exec(convertedSql);
            } else {
                await new Promise((resolve, reject) => {
                    this.db.exec(convertedSql, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
        } catch (error) {
            globalConfig.error(`[SQLite适配器] 执行 SQL 失败: ${sql}`, error);
            throw error;
        }
    }

    /**
     * 执行事务
     * @param {Function} callback 事务回调函数
     * @returns {Promise<any>} 事务执行结果
     */
    async transaction(callback) {
        if (!this.db) {
            throw new Error('数据库未初始化');
        }

        if (this.useBetterSqlite3) {
            // better-sqlite3 事务
            const transaction = this.db.transaction(callback);
            return transaction();
        } else {
            // sqlite3 事务
            return new Promise((resolve, reject) => {
                this.db.serialize(() => {
                    this.db.run('BEGIN TRANSACTION', (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        // 执行回调（需要将 db 传递给回调）
                        Promise.resolve(callback(this.db))
                            .then((result) => {
                                this.db.run('COMMIT', (commitErr) => {
                                    if (commitErr) {
                                        this.db.run('ROLLBACK', () => {
                                            reject(commitErr);
                                        });
                                    } else {
                                        resolve(result);
                                    }
                                });
                            })
                            .catch((error) => {
                                this.db.run('ROLLBACK', () => {
                                    reject(error);
                                });
                            });
                    });
                });
            });
        }
    }

    /**
     * 创建所有表
     * @returns {Promise<void>}
     */
    async createTables() {
        // SQLite 数据类型映射：VARCHAR -> TEXT, BIGINT -> INTEGER, BOOLEAN -> INTEGER
        // 用户基础统计表
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
        `);

        // 日统计表
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
        `);

        // 周统计表
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
        `);

        // 月统计表
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
        `);

        // 年统计表
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
        `);

        // 成就表
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
        `);

        // 用户显示成就表
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
        `);

        // 检查并添加新字段（数据库迁移）
        try {
            // SQLite 不支持直接检查列是否存在，需要捕获错误
            try {
                await this.run(`ALTER TABLE user_display_achievements ADD COLUMN is_manual INTEGER DEFAULT 0`);
            } catch (error) {
                // 列已存在，忽略错误
                if (!error.message.includes('duplicate column')) {
                    throw error;
                }
            }
            
            try {
                await this.run(`ALTER TABLE user_display_achievements ADD COLUMN auto_display_at TEXT`);
            } catch (error) {
                // 列已存在，忽略错误
                if (!error.message.includes('duplicate column')) {
                    throw error;
                }
            }
        } catch (error) {
            globalConfig.debug('[SQLite适配器] 数据库迁移失败（可能字段已存在）:', error.message);
        }

        // 群组信息表
        await this.exec(`
            CREATE TABLE IF NOT EXISTS group_info (
                group_id TEXT PRIMARY KEY,
                group_name TEXT DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
            )
        `);
    }

    /**
     * 创建所有索引
     * @returns {Promise<void>}
     */
    async createIndexes() {
        // 用户统计表索引
        await this.run(`CREATE INDEX IF NOT EXISTS idx_user_stats_group ON user_stats(group_id)`);
        await this.run(`CREATE INDEX IF NOT EXISTS idx_user_stats_user ON user_stats(user_id)`);
        await this.run(`CREATE INDEX IF NOT EXISTS idx_user_stats_group_user ON user_stats(group_id, user_id)`);

        // 日统计表索引
        await this.run(`CREATE INDEX IF NOT EXISTS idx_daily_stats_group_user_date ON daily_stats(group_id, user_id, date_key)`);
        await this.run(`CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date_key)`);
        await this.run(`CREATE INDEX IF NOT EXISTS idx_daily_stats_group_date ON daily_stats(group_id, date_key)`);

        // 周统计表索引
        await this.run(`CREATE INDEX IF NOT EXISTS idx_weekly_stats_group_user_week ON weekly_stats(group_id, user_id, week_key)`);
        await this.run(`CREATE INDEX IF NOT EXISTS idx_weekly_stats_week ON weekly_stats(week_key)`);
        await this.run(`CREATE INDEX IF NOT EXISTS idx_weekly_stats_group_week ON weekly_stats(group_id, week_key)`);

        // 月统计表索引
        await this.run(`CREATE INDEX IF NOT EXISTS idx_monthly_stats_group_user_month ON monthly_stats(group_id, user_id, month_key)`);
        await this.run(`CREATE INDEX IF NOT EXISTS idx_monthly_stats_month ON monthly_stats(month_key)`);
        await this.run(`CREATE INDEX IF NOT EXISTS idx_monthly_stats_group_month ON monthly_stats(group_id, month_key)`);

        // 年统计表索引
        await this.run(`CREATE INDEX IF NOT EXISTS idx_yearly_stats_group_user_year ON yearly_stats(group_id, user_id, year_key)`);
        await this.run(`CREATE INDEX IF NOT EXISTS idx_yearly_stats_year ON yearly_stats(year_key)`);
        await this.run(`CREATE INDEX IF NOT EXISTS idx_yearly_stats_group_year ON yearly_stats(group_id, year_key)`);

        // 成就表索引
        await this.run(`CREATE INDEX IF NOT EXISTS idx_achievements_group_user ON achievements(group_id, user_id)`);
        await this.run(`CREATE INDEX IF NOT EXISTS idx_achievements_unlocked ON achievements(group_id, user_id, unlocked)`);
        await this.run(`CREATE INDEX IF NOT EXISTS idx_achievements_achievement_id ON achievements(achievement_id)`);

        // 显示成就表索引
        await this.run(`CREATE INDEX IF NOT EXISTS idx_display_achievements_group_user ON user_display_achievements(group_id, user_id)`);

        // 群组信息表索引
        await this.run(`CREATE INDEX IF NOT EXISTS idx_group_info_group_id ON group_info(group_id)`);
    }

    /**
     * 获取数据库大小
     * @returns {Promise<number>} 数据库大小（字节）
     */
    async getDatabaseSize() {
        try {
            // SQLite 获取数据库大小
            const result = await this.get(`
                SELECT page_count * page_size as size
                FROM pragma_page_count(), pragma_page_size()
            `);
            return result?.size || 0;
        } catch (error) {
            globalConfig.error('[SQLite适配器] 获取数据库大小失败:', error);
            return 0;
        }
    }

    /**
     * 关闭数据库连接
     * @returns {Promise<void>}
     */
    async close() {
        if (this.db) {
            if (this.useBetterSqlite3) {
                this.db.close();
            } else {
                await new Promise((resolve, reject) => {
                    this.db.close((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
            this.db = null;
            this.initialized = false;
        }
    }
}

