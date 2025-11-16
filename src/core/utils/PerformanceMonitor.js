import { globalConfig } from '../ConfigManager.js';
import os from 'os';

/**
 * 性能监控工具类
 * 提供 API 响应时间、数据库查询性能、内存使用监控
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            apiResponseTimes: [], // API 响应时间数组
            dbQueryTimes: [],     // 数据库查询时间数组
            memoryUsage: [],      // 内存使用记录数组
            errorCount: 0,        // 错误计数
            requestCount: 0       // 请求计数
        };
        
        this.maxRecords = 1000; // 最多保存的记录数
        this.monitoringEnabled = globalConfig.getConfig('global.enablePerformanceMonitoring') !== false;
        
        // 启动内存监控
        this.startMemoryMonitoring();
    }

    /**
     * 启动内存监控（定期记录内存使用）
     */
    startMemoryMonitoring() {
        if (!this.monitoringEnabled) return;

        // 每5分钟记录一次内存使用
        setInterval(() => {
            this.recordMemoryUsage();
        }, 5 * 60 * 1000);
    }

    /**
     * 记录 API 响应时间
     * @param {string} endpoint API 端点
     * @param {number} duration 响应时间（毫秒）
     */
    recordApiResponseTime(endpoint, duration) {
        if (!this.monitoringEnabled) return;

        this.metrics.apiResponseTimes.push({
            endpoint,
            duration,
            timestamp: Date.now()
        });

        this.requestCount++;

        // 保持记录数不超过最大值
        if (this.metrics.apiResponseTimes.length > this.maxRecords) {
            this.metrics.apiResponseTimes.shift();
        }

        // 如果响应时间过长，记录警告
        if (duration > 5000) {
            globalConfig.warn(`[性能监控] API 响应时间过长: ${endpoint} 耗时 ${duration}ms`);
        }
    }

    /**
     * 记录数据库查询时间
     * @param {string} query SQL 查询语句（简化版）
     * @param {number} duration 查询时间（毫秒）
     */
    recordDbQueryTime(query, duration) {
        if (!this.monitoringEnabled) return;

        // 简化查询语句（只取前50个字符）
        const simplifiedQuery = query.substring(0, 50).replace(/\s+/g, ' ');

        this.metrics.dbQueryTimes.push({
            query: simplifiedQuery,
            duration,
            timestamp: Date.now()
        });

        // 保持记录数不超过最大值
        if (this.metrics.dbQueryTimes.length > this.maxRecords) {
            this.metrics.dbQueryTimes.shift();
        }

        // 如果查询时间过长，记录警告
        if (duration > 1000) {
            globalConfig.warn(`[性能监控] 数据库查询时间过长: ${simplifiedQuery}... 耗时 ${duration}ms`);
        }
    }

    /**
     * 记录内存使用
     */
    recordMemoryUsage() {
        if (!this.monitoringEnabled) return;

        const memUsage = process.memoryUsage();
        const systemMem = {
            total: os.totalmem(),
            free: os.freemem(),
            used: os.totalmem() - os.freemem()
        };

        this.metrics.memoryUsage.push({
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            rss: memUsage.rss,
            systemTotal: systemMem.total,
            systemFree: systemMem.free,
            systemUsed: systemMem.used,
            timestamp: Date.now()
        });

        // 保持记录数不超过最大值
        if (this.metrics.memoryUsage.length > this.maxRecords) {
            this.metrics.memoryUsage.shift();
        }

        // 如果内存使用过高，记录警告
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        const systemUsedPercent = (systemMem.used / systemMem.total) * 100;

        if (heapUsedMB > 500) {
            globalConfig.warn(`[性能监控] 堆内存使用过高: ${heapUsedMB.toFixed(2)}MB`);
        }

        if (systemUsedPercent > 90) {
            globalConfig.warn(`[性能监控] 系统内存使用过高: ${systemUsedPercent.toFixed(2)}%`);
        }
    }

    /**
     * 记录错误
     */
    recordError() {
        if (!this.monitoringEnabled) return;
        this.metrics.errorCount++;
    }

    /**
     * 获取 API 响应时间统计
     * @param {number} timeRange 时间范围（毫秒），默认1小时
     * @returns {Object} 统计信息
     */
    getApiResponseTimeStats(timeRange = 60 * 60 * 1000) {
        const now = Date.now();
        const recentTimes = this.metrics.apiResponseTimes.filter(
            record => now - record.timestamp < timeRange
        );

        if (recentTimes.length === 0) {
            return {
                count: 0,
                avg: 0,
                min: 0,
                max: 0,
                p95: 0,
                p99: 0
            };
        }

        const durations = recentTimes.map(r => r.duration).sort((a, b) => a - b);
        const sum = durations.reduce((a, b) => a + b, 0);
        const avg = sum / durations.length;
        const min = durations[0];
        const max = durations[durations.length - 1];
        const p95Index = Math.floor(durations.length * 0.95);
        const p99Index = Math.floor(durations.length * 0.99);

        return {
            count: recentTimes.length,
            avg: Math.round(avg * 100) / 100,
            min,
            max,
            p95: durations[p95Index] || 0,
            p99: durations[p99Index] || 0
        };
    }

    /**
     * 获取数据库查询时间统计
     * @param {number} timeRange 时间范围（毫秒），默认1小时
     * @returns {Object} 统计信息
     */
    getDbQueryTimeStats(timeRange = 60 * 60 * 1000) {
        const now = Date.now();
        const recentQueries = this.metrics.dbQueryTimes.filter(
            record => now - record.timestamp < timeRange
        );

        if (recentQueries.length === 0) {
            return {
                count: 0,
                avg: 0,
                min: 0,
                max: 0,
                p95: 0,
                p99: 0
            };
        }

        const durations = recentQueries.map(r => r.duration).sort((a, b) => a - b);
        const sum = durations.reduce((a, b) => a + b, 0);
        const avg = sum / durations.length;
        const min = durations[0];
        const max = durations[durations.length - 1];
        const p95Index = Math.floor(durations.length * 0.95);
        const p99Index = Math.floor(durations.length * 0.99);

        return {
            count: recentQueries.length,
            avg: Math.round(avg * 100) / 100,
            min,
            max,
            p95: durations[p95Index] || 0,
            p99: durations[p99Index] || 0
        };
    }

    /**
     * 获取内存使用统计
     * @returns {Object} 当前内存使用信息
     */
    getMemoryStats() {
        const memUsage = process.memoryUsage();
        const systemMem = {
            total: os.totalmem(),
            free: os.freemem(),
            used: os.totalmem() - os.freemem()
        };

        return {
            process: {
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
                external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100, // MB
                rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100 // MB
            },
            system: {
                total: Math.round(systemMem.total / 1024 / 1024 / 1024 * 100) / 100, // GB
                free: Math.round(systemMem.free / 1024 / 1024 / 1024 * 100) / 100, // GB
                used: Math.round(systemMem.used / 1024 / 1024 / 1024 * 100) / 100, // GB
                usedPercent: Math.round((systemMem.used / systemMem.total) * 100 * 100) / 100 // %
            }
        };
    }

    /**
     * 获取所有性能统计信息
     * @returns {Object} 所有统计信息
     */
    getAllStats() {
        return {
            api: this.getApiResponseTimeStats(),
            database: this.getDbQueryTimeStats(),
            memory: this.getMemoryStats(),
            errors: {
                count: this.metrics.errorCount,
                rate: this.requestCount > 0 
                    ? Math.round((this.metrics.errorCount / this.requestCount) * 10000) / 100 
                    : 0 // 错误率（百分比）
            },
            requests: {
                count: this.requestCount
            }
        };
    }

    /**
     * 重置统计信息
     */
    reset() {
        this.metrics = {
            apiResponseTimes: [],
            dbQueryTimes: [],
            memoryUsage: [],
            errorCount: 0,
            requestCount: 0
        };
    }

    /**
     * 创建性能监控包装器（用于 API 路由）
     * @param {Function} handler API 处理函数
     * @returns {Function} 包装后的处理函数
     */
    wrapApiHandler(handler) {
        return async (req, res, next) => {
            const startTime = Date.now();
            const endpoint = req.path || req.url || 'unknown';

            try {
                const result = await handler(req, res, next);
                const duration = Date.now() - startTime;
                this.recordApiResponseTime(endpoint, duration);
                return result;
            } catch (error) {
                this.recordError();
                const duration = Date.now() - startTime;
                this.recordApiResponseTime(endpoint, duration);
                throw error;
            }
        };
    }

    /**
     * 创建数据库查询包装器
     * @param {Function} queryFn 查询函数
     * @param {string} query SQL 查询语句
     * @returns {Promise} 查询结果
     */
    async wrapDbQuery(queryFn, query) {
        const startTime = Date.now();
        try {
            const result = await queryFn();
            const duration = Date.now() - startTime;
            this.recordDbQueryTime(query, duration);
            return result;
        } catch (error) {
            this.recordError();
            const duration = Date.now() - startTime;
            this.recordDbQueryTime(query, duration);
            throw error;
        }
    }
}

// 单例模式
let performanceMonitorInstance = null;

/**
 * 获取性能监控实例（单例）
 * @returns {PerformanceMonitor} 性能监控实例
 */
export function getPerformanceMonitor() {
    if (!performanceMonitorInstance) {
        performanceMonitorInstance = new PerformanceMonitor();
    }
    return performanceMonitorInstance;
}

export { PerformanceMonitor };
export default PerformanceMonitor;

