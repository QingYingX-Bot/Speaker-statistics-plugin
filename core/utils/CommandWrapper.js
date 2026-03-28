import { globalConfig } from '../ConfigManager.js'

/**
 * 命令包装器工具类
 * 用于简化命令方法的验证和错误处理
 */
class CommandWrapper {
    /**
     * 包装异步操作，统一错误处理
     * @param {Function} operation 异步操作函数
     * @param {string} errorMessage 错误消息
     * @param {Function} onError 错误处理回调
     * @returns {Promise<any>} 操作结果
     */
    static async safeExecute(operation, errorMessage = '操作失败', onError = null) {
        try {
            return await operation()
        } catch (err) {
            globalConfig.error(`[命令包装器] ${errorMessage}:`, err)
            if (onError && typeof onError === 'function') {
                return onError(err)
            }
            throw err
        }
    }

}

export { CommandWrapper }
export default CommandWrapper
