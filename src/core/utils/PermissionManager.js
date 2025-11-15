import { AuthService } from '../../services/auth/AuthService.js';
import { globalConfig } from '../ConfigManager.js';

/**
 * 权限管理器
 * 统一管理所有权限检查逻辑
 */
class PermissionManager {
    constructor() {
        this.authService = new AuthService();
        this._lastLogTime = new Map(); // 记录每个用户上次日志时间
    }

    /**
     * 检查用户是否为管理员（统一入口）
     * 仅检查 key.json 中的 admin 角色
     * @param {Object} e 消息事件对象（命令系统）
     * @param {string} userId 用户ID（Web API）
     * @returns {Promise<{isAdmin: boolean, reason: string}>}
     */
    async checkAdmin(e = null, userId = null) {
        try {
            // 获取用户ID
            const targetUserId = e?.sender?.user_id || userId;
            if (!targetUserId) {
                return {
                    isAdmin: false,
                    reason: 'no_user_id',
                    userId: 'unknown'
                };
            }

            // 检查 key.json 中的角色
            const role = await this.authService.getUserRole(targetUserId);
            const now = Date.now();
            const lastLogTime = this._lastLogTime.get(targetUserId) || 0;
            const timeSinceLastLog = now - lastLogTime;
            
            // 同一用户相同权限结果，5秒内只记录一次日志
            if (role === 'admin') {
                if (timeSinceLastLog > 5000) {
                    globalConfig.debug(`[权限检查] 用户 ${targetUserId}: key.json 管理员权限`);
                    this._lastLogTime.set(targetUserId, now);
                }
                return {
                    isAdmin: true,
                    reason: 'key_admin',
                    userId: targetUserId
                };
            }

            // 权限不足时，5秒内只记录一次日志
            if (timeSinceLastLog > 5000) {
                globalConfig.debug(`[权限检查] 用户 ${targetUserId}: 权限不足`);
                this._lastLogTime.set(targetUserId, now);
            }
            return {
                isAdmin: false,
                reason: 'insufficient_permission',
                userId: targetUserId
            };

        } catch (error) {
            globalConfig.error('[权限检查] 检查权限失败:', error);
            return {
                isAdmin: false,
                reason: 'error',
                userId: e?.sender?.user_id || userId || 'unknown'
            };
        }
    }

    /**
     * 验证管理员权限（命令系统使用）
     * @param {Object} e 消息事件对象
     * @returns {Promise<{valid: boolean, message?: string}>}
     */
    async validateAdminPermission(e) {
        const result = await this.checkAdmin(e);
        
        if (!result.isAdmin) {
            return {
                valid: false,
                message: '只有管理员才能执行此操作！'
            };
        }

        return {
            valid: true
        };
    }

    /**
     * 检查用户是否有权限（Web API 使用）
     * @param {string} userId 用户ID
     * @param {string} secretKey 秘钥（可选）
     * @returns {Promise<{isAdmin: boolean, role?: string, message?: string}>}
     */
    async checkWebAdminPermission(userId, secretKey = null) {
        // 如果提供了秘钥，先验证秘钥
        if (secretKey) {
            const keyValidation = await this.authService.validateSecretKey(userId, secretKey);
            if (!keyValidation.valid) {
                return {
                    isAdmin: false,
                    message: '秘钥验证失败'
                };
            }
        }

        const result = await this.checkAdmin(null, userId);
        const role = await this.authService.getUserRole(userId);

        return {
            isAdmin: result.isAdmin,
            role: role || 'none',
            message: result.isAdmin ? '管理员权限验证成功' : '权限不足'
        };
    }

    /**
     * 获取用户角色
     * @param {string} userId 用户ID
     * @returns {Promise<'admin'|'user'|null>}
     */
    async getUserRole(userId) {
        return await this.authService.getUserRole(userId);
    }
}

// 单例模式
let permissionManagerInstance = null;

/**
 * 获取权限管理器实例
 * @returns {PermissionManager}
 */
export function getPermissionManager() {
    if (!permissionManagerInstance) {
        permissionManagerInstance = new PermissionManager();
    }
    return permissionManagerInstance;
}

export { PermissionManager };
export default PermissionManager;

