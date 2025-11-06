import crypto from 'crypto';
import { globalConfig } from '../../core/ConfigManager.js';

/**
 * Token管理器
 * 负责生成、验证和管理访问token
 */
class TokenManager {
    constructor() {
        // Token存储（内存存储，key: token, value: {userId, timestamp, expiresAt}）
        this.tokens = new Map();
        this._tokenCleanupInterval = null;
    }

    /**
     * 生成访问token
     * @param {string} userId 用户ID
     * @param {number} expiresIn 过期时间（毫秒），默认24小时
     * @returns {string} token
     */
    generateToken(userId, expiresIn = 24 * 60 * 60 * 1000) {
        const token = crypto.randomBytes(4).toString('hex'); // 8位十六进制字符串
        const expiresAt = Date.now() + expiresIn;
        this.tokens.set(token, {
            userId: userId,
            timestamp: Date.now(),
            expiresAt: expiresAt
        });
        
        // 清理过期token（每分钟清理一次）
        this.startCleanupInterval();
        
        return token;
    }

    /**
     * 验证token
     * @param {string} token Token字符串
     * @returns {{valid: boolean, userId?: string, message?: string}}
     */
    validateToken(token) {
        if (!token) {
            return { valid: false, message: 'Token为空' };
        }

        const tokenData = this.tokens.get(token);
        if (!tokenData) {
            return { valid: false, message: 'Token不存在或已使用' };
        }

        // 检查token是否过期
        if (Date.now() >= tokenData.expiresAt) {
            this.tokens.delete(token);
            return { valid: false, message: 'Token已过期' };
        }

        return { 
            valid: true, 
            userId: tokenData.userId 
        };
    }

    /**
     * 使用token（一次性使用）
     * @param {string} token Token字符串
     * @returns {{valid: boolean, userId?: string, message?: string}}
     */
    consumeToken(token) {
        const validation = this.validateToken(token);
        if (validation.valid) {
            // 删除已使用的token（一次性使用）
            this.tokens.delete(token);
        }
        return validation;
    }

    /**
     * 启动清理定时器
     */
    startCleanupInterval() {
        if (!this._tokenCleanupInterval) {
            this._tokenCleanupInterval = setInterval(() => {
                const now = Date.now();
                let cleanedCount = 0;
                for (const [t, data] of this.tokens.entries()) {
                    if (now >= data.expiresAt) {
                        this.tokens.delete(t);
                        cleanedCount++;
                    }
                }
                if (cleanedCount > 0) {
                    globalConfig.debug(`清理过期token: ${cleanedCount}个`);
                }
            }, 60 * 1000); // 每分钟清理一次
        }
    }

    /**
     * 停止清理定时器
     */
    stopCleanupInterval() {
        if (this._tokenCleanupInterval) {
            clearInterval(this._tokenCleanupInterval);
            this._tokenCleanupInterval = null;
        }
    }

    /**
     * 清理所有token
     */
    clear() {
        this.tokens.clear();
        this.stopCleanupInterval();
    }
}

export { TokenManager };
export default TokenManager;
