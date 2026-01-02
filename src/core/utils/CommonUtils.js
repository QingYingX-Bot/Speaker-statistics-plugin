import { globalConfig } from '../ConfigManager.js';

/**
 * 公共验证和处理工具类
 * 提供标准化的验证、处理和格式化功能
 */
class CommonUtils {
    /**
     * 验证群聊消息事件
     * @param {Object} e 消息事件对象
     * @param {boolean} requireGroup 是否要求群聊
     * @returns {Object} 验证结果 {valid: boolean, message?: string}
     */
    static validateGroupMessage(e, requireGroup = true) {
        if (!e) {
            return {
                valid: false,
                message: '无效的消息事件'
            };
        }

        if (requireGroup && !e.group_id) {
            return {
                valid: false,
                message: '此命令仅支持在群聊中使用'
            };
        }

        if (!e.sender || !e.sender.user_id) {
            return {
                valid: false,
                message: '无效的发送者信息'
            };
        }

        return {
            valid: true
        };
    }

    /**
     * 验证管理员权限（已废弃，请使用 PermissionManager）
     * @deprecated 使用 PermissionManager.validateAdminPermission() 替代
     * @param {Object} e 消息事件对象
     * @returns {Promise<Object>} 验证结果 {valid: boolean, message?: string}
     */
    static async validateAdminPermission(e) {
        const { getPermissionManager } = await import('./PermissionManager.js');
        const permissionManager = getPermissionManager();
        return await permissionManager.validateAdminPermission(e);
    }

    /**
     * 验证数字参数
     * @param {string} input 输入字符串
     * @param {number} min 最小值
     * @param {number} max 最大值
     * @param {string} paramName 参数名称
     * @returns {Object} 验证结果 {valid: boolean, value?: number, message?: string}
     */
    static validateNumber(input, min = 1, max = 100, paramName = '参数') {
        if (!input || input.trim() === '') {
            return {
                valid: false,
                message: `请提供${paramName}`
            };
        }

        const num = parseInt(input.trim());

        if (isNaN(num)) {
            return {
                valid: false,
                message: `${paramName}必须是数字`
            };
        }

        if (num < min || num > max) {
            return {
                valid: false,
                message: `${paramName}必须在${min}-${max}之间`
            };
        }

        return {
            valid: true,
            value: num
        };
    }

    /**
     * 验证开关参数
     * @param {string} input 输入字符串
     * @returns {Object} 验证结果 {valid: boolean, value?: boolean, message?: string}
     */
    static validateToggle(input) {
        if (!input || input.trim() === '') {
            return {
                valid: false,
                message: '请指定开启或关闭'
            };
        }

        const trimmed = input.trim().toLowerCase();

        if (trimmed.includes('开启') || trimmed.includes('on') || trimmed.includes('true')) {
            return {
                valid: true,
                value: true
            };
        } else if (trimmed.includes('关闭') || trimmed.includes('off') || trimmed.includes('false')) {
            return {
                valid: true,
                value: false
            };
        }

        return {
            valid: false,
            message: '请指定"开启"或"关闭"'
        };
    }

    /**
     * 格式化文件大小
     * @param {number} bytes 字节数
     * @returns {string} 格式化后的大小
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 格式化时间间隔
     * @param {number} milliseconds 毫秒数
     * @returns {string} 格式化后的时间间隔
     */
    static formatDuration(milliseconds) {
        if (milliseconds < 1000) {
            return `${milliseconds}ms`;
        }

        const seconds = Math.floor(milliseconds / 1000);
        if (seconds < 60) {
            return `${seconds}秒`;
        }

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            return `${minutes}分钟${seconds % 60}秒`;
        }

        const hours = Math.floor(minutes / 60);
        return `${hours}小时${minutes % 60}分钟`;
    }

    /**
     * 格式化数字（添加千分位分隔符）
     * @param {number} num 数字
     * @returns {string} 格式化后的数字
     */
    static formatNumber(num) {
        if (typeof num !== 'number') return '0';
        return num.toLocaleString('zh-CN');
    }

    /**
     * 隐藏群号部分位数
     * @param {string} groupId 群号
     * @param {number} visibleStart 开头保留位数
     * @param {number} visibleEnd 结尾保留位数
     * @returns {string} 隐藏后的群号
     */
    static maskGroupId(groupId, visibleStart = 3, visibleEnd = 3) {
        if (!groupId) return groupId;
        const str = String(groupId);
        if (str.length <= visibleStart + visibleEnd) return str;
        
        const start = str.substring(0, visibleStart);
        const end = str.substring(str.length - visibleEnd);
        const middle = '*'.repeat(Math.min(4, str.length - visibleStart - visibleEnd));
        
        return start + middle + end;
    }

    /**
     * 截断字符串
     * @param {string} str 字符串
     * @param {number} maxLength 最大长度
     * @param {string} suffix 后缀
     * @returns {string} 截断后的字符串
     */
    static truncateString(str, maxLength = 50, suffix = '...') {
        if (!str || str.length <= maxLength) return str;
        return str.substring(0, maxLength - suffix.length) + suffix;
    }


}

export { CommonUtils };

