/**
 * 数据库适配器基类
 * 定义所有数据库适配器必须实现的接口
 */
export class BaseAdapter {
    constructor() {
        this.initialized = false;
    }

    /**
     * 初始化数据库连接
     * @returns {Promise<void>}
     */
    async initialize() {
        throw new Error('initialize() 方法必须在子类中实现');
    }

    /**
     * 执行 SQL 语句（无返回值）
     * @param {string} sql SQL 语句
     * @param {...any} params 参数
     * @returns {Promise<Object>} 执行结果 { lastID, changes }
     */
    async run(sql, ...params) {
        throw new Error('run() 方法必须在子类中实现');
    }

    /**
     * 执行 SQL 查询（返回单行）
     * @param {string} sql SQL 语句
     * @param {...any} params 参数
     * @returns {Promise<Object|null>} 查询结果
     */
    async get(sql, ...params) {
        throw new Error('get() 方法必须在子类中实现');
    }

    /**
     * 执行 SQL 查询（返回多行）
     * @param {string} sql SQL 语句
     * @param {...any} params 参数
     * @returns {Promise<Array>} 查询结果数组
     */
    async all(sql, ...params) {
        throw new Error('all() 方法必须在子类中实现');
    }

    /**
     * 执行 SQL 语句（用于创建表等）
     * @param {string} sql SQL 语句
     * @returns {Promise<void>}
     */
    async exec(sql) {
        throw new Error('exec() 方法必须在子类中实现');
    }

    /**
     * 执行事务
     * @param {Function} callback 事务回调函数
     * @returns {Promise<any>} 事务执行结果
     */
    async transaction(callback) {
        throw new Error('transaction() 方法必须在子类中实现');
    }

    /**
     * 获取当前时间（UTC+8）
     * @returns {string} 格式化的时间字符串
     */
    getCurrentTime() {
        const now = new Date();
        const utc8Time = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        return utc8Time.toISOString().replace('T', ' ').substring(0, 19);
    }

    /**
     * 创建所有表
     * @returns {Promise<void>}
     */
    async createTables() {
        throw new Error('createTables() 方法必须在子类中实现');
    }

    /**
     * 创建索引
     * @returns {Promise<void>}
     */
    async createIndexes() {
        throw new Error('createIndexes() 方法必须在子类中实现');
    }

    /**
     * 关闭数据库连接
     * @returns {Promise<void>}
     */
    async close() {
        throw new Error('close() 方法必须在子类中实现');
    }

    /**
     * 获取数据库大小
     * @returns {Promise<number>} 数据库大小（字节）
     */
    async getDatabaseSize() {
        throw new Error('getDatabaseSize() 方法必须在子类中实现');
    }
}

