import { globalConfig } from '../ConfigManager.js';

/**
 * Web链接生成器
 * 提供统一的链接生成功能
 */
export class WebLinkGenerator {
    /**
     * 获取Web服务器配置
     */
    static getServerConfig() {
        try {
            const config = globalConfig.getConfig('backgroundServer') || {};
            return {
                host: config.host || "127.0.0.1",
                port: config.port || 39999,
                protocol: config.protocol || "http",
                domain: config.domain || "localhost"
            };
        } catch (error) {
            globalConfig.error('读取服务器配置失败:', error);
            return {
                host: "127.0.0.1",
                port: 39999,
                protocol: "http",
                domain: "localhost"
            };
        }
    }

    /**
     * 生成链接
     * @param {string} token Token字符串
     * @param {string} hashRoute 前端hash路由（可选，如 '/background'）
     * @returns {string} 完整URL
     */
    static generateLink(token, hashRoute = '') {
        const config = this.getServerConfig();
        const baseUrl = `${config.protocol}://${config.domain || config.host}:${config.port}`;
        // 生成带token的基础URL，hash路由直接附加在URL后面
        const hash = hashRoute ? `#${hashRoute}` : '#/';
        return `${baseUrl}/${token}${hash}`;
    }

    /**
     * 生成网页链接（首页）
     * @param {string} userId 用户ID
     * @returns {Promise<{success: boolean, url?: string, message?: string}>}
     */
    static async generateWebPageLink(userId) {
        try {
            const { getWebServer } = await import('../../services/WebServer.js');
            const webServer = getWebServer();
            
            if (!webServer || !webServer.isRunning) {
                return { success: false, message: '服务器未启动，无法生成链接' };
            }
            
            const token = webServer.generateToken(userId);
            // 生成首页链接，使用 #/ 作为hash路由
            const url = this.generateLink(token, '/');
            
            return { success: true, url };
        } catch (error) {
            globalConfig.error('生成网页链接失败:', error);
            return { success: false, message: '生成链接失败，请稍后重试' };
        }
    }

    /**
     * 生成背景设置页面链接
     * @param {string} userId 用户ID
     * @returns {Promise<{success: boolean, url?: string, message?: string}>}
     */
    static async generateBackgroundPageLink(userId) {
        try {
            const { getWebServer } = await import('../../services/WebServer.js');
            const webServer = getWebServer();
            
            if (!webServer || !webServer.isRunning) {
                return { success: false, message: '服务器未启动，无法生成链接' };
            }
            
            const token = webServer.generateToken(userId);
            // 生成背景设置页面链接，使用 #/background 作为hash路由
            const url = this.generateLink(token, '/background');
            
            return { success: true, url };
        } catch (error) {
            globalConfig.error('生成背景设置链接失败:', error);
            return { success: false, message: '生成链接失败，请稍后重试' };
        }
    }
}
