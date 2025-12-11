import express from 'express';
import { PathResolver } from '../core/utils/PathResolver.js';
import { globalConfig } from '../core/ConfigManager.js';
import { getDataService } from '../core/DataService.js';
import { AchievementService } from '../core/AchievementService.js';
import { WebLinkGenerator } from '../core/utils/WebLinkGenerator.js';
import { TokenManager } from './auth/TokenManager.js';
import { VerificationCodeManager } from './auth/VerificationCodeManager.js';
import { AuthService } from './auth/AuthService.js';
import { PageRoutes } from './routes/PageRoutes.js';
import { AuthApi } from './api/AuthApi.js';
import { StatsApi } from './api/StatsApi.js';
import { AchievementApi } from './api/AchievementApi.js';
import { BackgroundApi } from './api/BackgroundApi.js';
import { AdminApi } from './api/AdminApi.js';

/**
 * Web服务器
 * 提供统计数据的Web界面和API服务
 */
class WebServer {
    constructor() {
        this.app = express();
        this.server = null;
        this.isRunning = false;
        this._starting = false; // 防止并发启动的标志
        this.dataService = getDataService();
        this.achievementService = new AchievementService(this.dataService);
        
        // 服务实例
        this.tokenManager = new TokenManager();
        this.verificationCodeManager = new VerificationCodeManager();
        this.authService = new AuthService();
        
        // 确保背景目录存在
        PathResolver.ensureDirectory(PathResolver.getBackgroundsDir());
        PathResolver.ensureDirectory(PathResolver.getBackgroundsDir('normal'));
        PathResolver.ensureDirectory(PathResolver.getBackgroundsDir('ranking'));

        this.setupMiddleware();
        this.setupRoutes();
        this.setupApiRoutes();
    }

    /**
     * 加载配置（使用统一的配置获取方法）
     */
    loadConfig() {
        return WebLinkGenerator.getServerConfig();
    }

    /**
     * 设置中间件
     */
    setupMiddleware() {
        // 解析JSON
        this.app.use(express.json());

        // 解析URL编码
        this.app.use(express.urlencoded({ extended: true }));
        
        // 解析Cookie
        this.app.use((req, res, next) => {
            if (req.headers.cookie) {
                const cookies = {};
                req.headers.cookie.split(';').forEach(cookie => {
                    const parts = cookie.split('=');
                    if (parts.length === 2) {
                        cookies[parts[0].trim()] = decodeURIComponent(parts[1].trim());
                    }
                });
                req.cookies = cookies;
            } else {
                req.cookies = {};
            }
            next();
        });

        // CORS设置
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });
    }

    /**
     * 设置页面路由
     */
    setupRoutes() {
        const pageRoutes = new PageRoutes(this.app, this.tokenManager);
        pageRoutes.registerRoutes();
    }

    /**
     * 设置API路由
     */
    setupApiRoutes() {
        // 注册所有API路由
        const authApi = new AuthApi(this.app, this.authService, this.tokenManager, this.verificationCodeManager);
        authApi.registerRoutes();

        const statsApi = new StatsApi(this.app);
        statsApi.registerRoutes();

        const achievementApi = new AchievementApi(this.app, this.achievementService, this.authService);
        achievementApi.registerRoutes();

        const backgroundApi = new BackgroundApi(this.app, this.authService);
        backgroundApi.registerRoutes();

        const adminApi = new AdminApi(this.app, this.authService);
        adminApi.registerRoutes();
    }

    /**
     * 启动服务器
     */
    async start() {
        // 如果已在运行或正在启动，直接返回
        if (this.isRunning) {
            globalConfig.debug('Web服务器已在运行');
            return;
        }
        
        // 如果正在启动中，等待完成
        if (this._starting) {
            globalConfig.debug('Web服务器正在启动中，请稍候...');
            // 等待启动完成（最多等待5秒）
            let waitCount = 0;
            while (this._starting && waitCount < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waitCount++;
            }
            // 等待完成后，如果已运行则返回
            if (this.isRunning) {
                return;
            }
        }

        // 设置启动标志，防止并发启动
        this._starting = true;

        try {
            // 如果存在旧的服务器实例，先关闭它
            if (this.server) {
                globalConfig.debug('[发言统计] 检测到旧的服务器实例，正在关闭...');
                try {
                    await this.stop();
                } catch (error) {
                    globalConfig.debug('[发言统计] 关闭旧服务器实例时出错:', error.message);
                }
            }

            const config = this.loadConfig();
            let port = config.port || 39999;
            const host = config.host || "127.0.0.1";
            const maxRetries = 10; // 最多尝试10个备用端口
            let currentRetry = 0;

            // 尝试启动服务器的函数
            const tryStartServer = () => {
                return new Promise((resolve, reject) => {
                    this.server = this.app.listen(port, host, () => {
                        // 双重检查，防止重复设置
                        if (this.isRunning) {
                            globalConfig.debug('[发言统计] Web服务器已在运行，跳过重复初始化');
                            resolve();
                            return;
                        }
                        
                        this.isRunning = true;
                        this._starting = false; // 启动成功，清除启动标志
                        const url = `${config.protocol}://${config.domain || host}:${port}`;
                        globalConfig.debug(`[发言统计] Web服务器启动成功: ${url}`);
                        resolve();
                    });

                    this.server.on('error', (error) => {
                        this.server = null; // 清除服务器实例引用
                        
                        if (error.code === 'EADDRINUSE') {
                            // 端口被占用，尝试下一个端口
                            currentRetry++;
                            if (currentRetry < maxRetries) {
                                port = port + 1;
                                globalConfig.warn(`[发言统计] 端口 ${port - 1} 已被占用，尝试使用端口 ${port}...`);
                                setTimeout(() => {
                                    tryStartServer().then(resolve).catch(reject);
                                }, 500);
                            } else {
                                this._starting = false;
                                this.isRunning = false;
                                reject(new Error(`端口 ${port} 及后续 ${maxRetries} 个端口均被占用，Web服务器启动失败`));
                            }
                        } else {
                            this._starting = false;
                            this.isRunning = false;
                            reject(error);
                        }
                    });
                });
            };

            // 尝试启动服务器
            await tryStartServer();

        } catch (error) {
            this._starting = false; // 启动失败，清除启动标志
            this.isRunning = false;
            this.server = null; // 清除服务器实例引用
            globalConfig.error('[发言统计] Web服务器启动失败:', error);
            throw error;
        }
    }

    /**
     * 停止服务器
     */
    async stop() {
        this._starting = false; // 清除启动标志
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    this.isRunning = false;
                    this.server = null;
                    this.tokenManager.stopCleanupInterval();
                    globalConfig.debug('[发言统计] Web服务器已关闭');
                    resolve();
                });
            });
        }
    }

    /**
     * 生成访问token（对外接口）
     */
    generateToken(userId) {
        return this.tokenManager.generateToken(userId);
    }
}

// 单例实例
let webServerInstance = null;

/**
 * 获取WebServer单例实例
 * @returns {WebServer}
 */
export function getWebServer() {
    if (!webServerInstance) {
        webServerInstance = new WebServer();
    }
    return webServerInstance;
}

// 兼容性导出（保持向后兼容）
export function getBackgroundServer() {
    return getWebServer();
}

export { WebServer };
export default WebServer;
