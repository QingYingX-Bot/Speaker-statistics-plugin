import { CommonUtils } from './CommonUtils.js';
import { globalConfig } from '../ConfigManager.js';

/**
 * 命令包装器工具类
 * 用于简化命令方法的验证和错误处理
 */
class CommandWrapper {
    /**
     * 包装命令方法，自动处理验证和错误
     * @param {Function} handler 命令处理函数
     * @param {Object} options 选项
     * @param {boolean} options.requireAdmin 是否需要管理员权限
     * @param {boolean} options.requireGroup 是否需要群聊
     * @param {string} options.errorMessage 错误消息前缀
     * @returns {Function} 包装后的函数
     */
    static wrap(handler, options = {}) {
        const {
            requireAdmin = false,
            requireGroup = true,
            errorMessage = '操作失败'
        } = options;

        return async function(e) {
            // 验证管理员权限
            if (requireAdmin) {
                const { getPermissionManager } = await import('./PermissionManager.js');
                const permissionManager = getPermissionManager();
                const adminValidation = await permissionManager.validateAdminPermission(e);
                if (!adminValidation.valid) {
                    return e.reply(adminValidation.message);
                }
            }

            // 验证群消息
            const groupValidation = CommonUtils.validateGroupMessage(e, requireGroup);
            if (!groupValidation.valid) {
                return e.reply(groupValidation.message);
            }

            // 执行命令处理函数
            try {
                return await handler.call(this, e);
            } catch (error) {
                globalConfig.error(`[命令包装器] ${errorMessage}:`, error);
                return e.reply(`${errorMessage}，请稍后重试`);
            }
        };
    }

    /**
     * 包装异步操作，统一错误处理
     * @param {Function} operation 异步操作函数
     * @param {string} errorMessage 错误消息
     * @param {Function} onError 错误处理回调
     * @returns {Promise<any>} 操作结果
     */
    static async safeExecute(operation, errorMessage = '操作失败', onError = null) {
        try {
            const result = await operation();
            return result;
        } catch (error) {
            globalConfig.error(`[命令包装器] ${errorMessage}:`, error);
            if (onError && typeof onError === 'function') {
                return await onError(error);
            }
            throw error;
        }
    }

    /**
     * 验证并回复模式（支持异步验证）
     * @param {Object} e 消息事件对象
     * @param {Object|Promise<Object>} validation 验证结果或验证结果的 Promise
     * @returns {Promise<boolean>} 是否通过验证
     */
    static async validateAndReply(e, validation) {
        // 如果 validation 是 Promise，等待它完成
        const result = validation instanceof Promise ? await validation : validation;
        
        if (!result.valid) {
            e.reply(result.message);
            return false;
        }
        return true;
    }
}

export { CommandWrapper };
export default CommandWrapper;

