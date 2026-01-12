import { TimeUtils } from '../../utils/TimeUtils.js'

/**
 * 数据库适配器基类
 * 定义所有数据库适配器必须实现的接口
 */
export class BaseAdapter {
    constructor() {
        this.initialized = false
    }

    async initialize() {
        throw new Error('initialize() 方法必须在子类中实现')
    }

    async run(sql, ...params) {
        throw new Error('run() 方法必须在子类中实现')
    }

    async get(sql, ...params) {
        throw new Error('get() 方法必须在子类中实现')
    }

    async all(sql, ...params) {
        throw new Error('all() 方法必须在子类中实现')
    }

    async exec(sql) {
        throw new Error('exec() 方法必须在子类中实现')
    }

    async transaction(callback) {
        throw new Error('transaction() 方法必须在子类中实现')
    }

    /**
     * 获取当前时间字符串（UTC+8）
     * @returns {string} 时间字符串 (YYYY-MM-DD HH:MM:SS)
     */
    getCurrentTime() {
        return TimeUtils.formatDateTime(TimeUtils.getUTC8Date())
    }

    async createTables() {
        throw new Error('createTables() 方法必须在子类中实现')
    }

    async createIndexes() {
        throw new Error('createIndexes() 方法必须在子类中实现')
    }

    async close() {
        throw new Error('close() 方法必须在子类中实现')
    }

    async getDatabaseSize() {
        throw new Error('getDatabaseSize() 方法必须在子类中实现')
    }
}

