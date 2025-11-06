import { globalConfig } from '../../../core/ConfigManager.js';

/**
 * API响应工具类
 * 提供统一的成功和错误响应格式
 */
export class ApiResponse {
    /**
     * 发送成功响应
     * @param {Object} res Express响应对象
     * @param {*} data 响应数据
     * @param {string} message 成功消息
     * @param {number} statusCode HTTP状态码
     */
    static success(res, data = null, message = null, statusCode = 200) {
        const response = { success: true };
        if (data !== null) {
            response.data = data;
        }
        if (message) {
            response.message = message;
        }
        return res.status(statusCode).json(response);
    }

    /**
     * 发送错误响应
     * @param {Object} res Express响应对象
     * @param {string} error 错误消息
     * @param {number} statusCode HTTP状态码
     * @param {Error} originalError 原始错误对象（用于日志记录）
     * @param {string} logMessage 日志消息
     */
    static error(res, error, statusCode = 500, originalError = null, logMessage = null) {
        if (originalError && logMessage) {
            globalConfig.error(logMessage, originalError);
        } else if (logMessage) {
            globalConfig.error(logMessage);
        }
        
        return res.status(statusCode).json({ 
            success: false,
            error: error || '服务器错误'
        });
    }

    /**
     * 包装异步路由处理函数，自动处理错误
     * @param {Function} handler 异步处理函数
     * @param {string} errorMessage 错误消息
     * @returns {Function} Express路由处理函数
     */
    static asyncHandler(handler, errorMessage = '请求处理失败') {
        return async (req, res, next) => {
            try {
                await handler(req, res, next);
            } catch (error) {
                ApiResponse.error(res, errorMessage, 500, error, errorMessage);
            }
        };
    }
}

