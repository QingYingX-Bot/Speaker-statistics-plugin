import { ApiResponse } from './utils/ApiResponse.js';
import { getDataService } from '../../core/DataService.js';

/**
 * API 基类
 * 提供统一的路由注册和错误处理
 * 所有 API 类应该继承此类
 */
export class BaseApi {
    constructor(app) {
        this.app = app;
        this.dataService = getDataService();
    }

    /**
     * 注册 GET 路由
     * @param {string} path 路由路径
     * @param {Function} handler 处理函数
     * @param {string} errorMessage 错误消息
     */
    get(path, handler, errorMessage = '操作失败') {
        this.app.get(path, ApiResponse.asyncHandler(handler, errorMessage));
    }

    /**
     * 注册 POST 路由
     * @param {string} path 路由路径
     * @param {Function} handler 处理函数
     * @param {string} errorMessage 错误消息
     */
    post(path, handler, errorMessage = '操作失败') {
        this.app.post(path, ApiResponse.asyncHandler(handler, errorMessage));
    }

    /**
     * 注册 PUT 路由
     * @param {string} path 路由路径
     * @param {Function} handler 处理函数
     * @param {string} errorMessage 错误消息
     */
    put(path, handler, errorMessage = '操作失败') {
        this.app.put(path, ApiResponse.asyncHandler(handler, errorMessage));
    }

    /**
     * 注册 DELETE 路由
     * @param {string} path 路由路径
     * @param {Function} handler 处理函数
     * @param {string} errorMessage 错误消息
     */
    delete(path, handler, errorMessage = '操作失败') {
        this.app.delete(path, ApiResponse.asyncHandler(handler, errorMessage));
    }

    /**
     * 注册路由（子类需要实现）
     * 所有继承 BaseApi 的类都应该实现此方法
     */
    registerRoutes() {
        throw new Error('registerRoutes() 方法必须在子类中实现');
    }
}

