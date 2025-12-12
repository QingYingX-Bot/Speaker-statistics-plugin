/**
 * 错误处理工具类
 * 提供统一的错误处理机制，区分关键错误和非关键错误
 */
import { globalConfig } from '../ConfigManager.js';

class ErrorHandler {
    /**
     * 处理非关键错误（静默处理，但记录日志）
     * 用于不影响主流程的异步操作失败场景
     * 
     * @param {Error|string} error 错误对象或错误消息
     * @param {string} context 错误上下文（用于日志）
     * @param {boolean} logWarning 是否记录警告日志（默认：仅在debug模式下记录）
     * @returns {void}
     */
    static handleNonCriticalError(error, context = '', logWarning = false) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const fullContext = context ? `[${context}]` : '';
        
        // 在debug模式下总是记录，或者如果明确要求记录警告
        if (globalConfig.getConfig('global.debugLog') || logWarning) {
            const logLevel = logWarning ? 'warn' : 'debug';
            if (logLevel === 'warn') {
                globalConfig.warn(`${fullContext} 非关键错误: ${errorMessage}`);
            } else {
                globalConfig.debug(`${fullContext} 非关键错误: ${errorMessage}`);
            }
        }
    }

    /**
     * 创建非关键错误处理函数
     * 返回一个可用于 Promise.catch() 的错误处理函数
     * 
     * @param {string} context 错误上下文
     * @param {boolean} logWarning 是否记录警告日志
     * @returns {Function} 错误处理函数
     */
    static createNonCriticalHandler(context = '', logWarning = false) {
        return (error) => {
            this.handleNonCriticalError(error, context, logWarning);
        };
    }

    /**
     * 处理关键错误（总是记录错误日志）
     * 用于影响主流程的错误场景
     * 
     * @param {Error|string} error 错误对象或错误消息
     * @param {string} context 错误上下文
     * @returns {void}
     */
    static handleCriticalError(error, context = '') {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const fullContext = context ? `[${context}]` : '';
        globalConfig.error(`${fullContext} 关键错误: ${errorMessage}`, error instanceof Error ? error : undefined);
    }

    /**
     * 创建关键错误处理函数
     * 返回一个可用于 Promise.catch() 的错误处理函数
     * 
     * @param {string} context 错误上下文
     * @returns {Function} 错误处理函数
     */
    static createCriticalHandler(context = '') {
        return (error) => {
            this.handleCriticalError(error, context);
        };
    }
}

export { ErrorHandler };
export default ErrorHandler;

