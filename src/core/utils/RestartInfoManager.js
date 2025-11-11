/**
 * 重启信息管理器（内存存储）
 * 用于在重启后发送提示消息
 */
class RestartInfoManager {
    constructor() {
        // 使用静态变量存储重启信息（内存中）
        if (!RestartInfoManager._restartInfo) {
            RestartInfoManager._restartInfo = null;
        }
    }

    /**
     * 保存重启信息
     * @param {Object} info - 重启信息
     * @param {string} info.userId - 触发重启的用户ID
     * @param {string} info.groupId - 触发重启的群ID
     * @param {string} info.updateType - 更新类型（'normal' 或 'force'）
     * @param {string} info.updateLog - 更新日志
     */
    static saveRestartInfo(info) {
        RestartInfoManager._restartInfo = {
            userId: info.userId,
            groupId: info.groupId,
            updateType: info.updateType || 'normal',
            updateLog: info.updateLog || '',
            timestamp: Date.now()
        };
    }

    /**
     * 获取并清除重启信息
     * @returns {Object|null} 重启信息，如果没有则返回null
     */
    static getAndClearRestartInfo() {
        const info = RestartInfoManager._restartInfo;
        RestartInfoManager._restartInfo = null; // 清除信息
        return info;
    }

    /**
     * 检查是否有重启信息
     * @returns {boolean}
     */
    static hasRestartInfo() {
        return RestartInfoManager._restartInfo !== null;
    }
}

export { RestartInfoManager };
export default RestartInfoManager;

