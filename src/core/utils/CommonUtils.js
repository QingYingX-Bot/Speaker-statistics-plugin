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

    /**
     * 安全地执行异步操作
     * @param {Function} operation 要执行的操作
     * @param {string} operationName 操作名称
     * @param {Object} context 上下文信息
     * @returns {Promise<Object>} 执行结果 {success: boolean, data?: any, error?: Error}
     */
    static async safeExecute(operation, operationName, context = {}) {
        try {
            const data = await operation();
            return {
                success: true,
                data
            };
        } catch (error) {
            globalConfig.error(`[公共工具] ${operationName} 执行失败:`, error);
            return {
                success: false,
                error
            };
        }
    }

    /**
     * 批量处理数组
     * @param {Array} items 要处理的数组
     * @param {Function} processor 处理函数
     * @param {number} batchSize 批次大小
     * @returns {Promise<Array>} 处理结果数组
     */
    static async batchProcess(items, processor, batchSize = 10) {
        const results = [];

        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchPromises = batch.map(item => processor(item));
            const batchResults = await Promise.allSettled(batchPromises);

            results.push(...batchResults.map(result =>
                result.status === 'fulfilled' ? result.value : null
            ));
        }

        return results;
    }

    /**
     * 生成进度条
     * @param {number} current 当前值
     * @param {number} total 总值
     * @param {number} width 进度条宽度
     * @returns {string} 进度条字符串
     */
    static generateProgressBar(current, total, width = 20) {
        const percentage = Math.min(100, Math.max(0, (current / total) * 100));
        const filled = Math.floor((percentage / 100) * width);
        const empty = width - filled;

        const bar = '█'.repeat(filled) + '░'.repeat(empty);
        return `[${bar}] ${percentage.toFixed(1)}%`;
    }

    /**
     * 验证文件路径
     * @param {string} filePath 文件路径
     * @returns {Object} 验证结果 {valid: boolean, message?: string}
     */
    static validateFilePath(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            return {
                valid: false,
                message: '无效的文件路径'
            };
        }

        // 检查路径是否包含危险字符
        const dangerousChars = /[<>:"|?*\x00-\x1f]/;
        if (dangerousChars.test(filePath)) {
            return {
                valid: false,
                message: '文件路径包含非法字符'
            };
        }

        // 检查路径长度
        if (filePath.length > 260) {
            return {
                valid: false,
                message: '文件路径过长'
            };
        }

        return {
            valid: true
        };
    }

    /**
     * 清理临时文件
     * @param {string} dirPath 目录路径
     * @param {string} pattern 文件模式
     * @param {number} maxAge 最大年龄（毫秒）
     * @returns {Promise<number>} 清理的文件数量
     */
    static async cleanupTempFiles(dirPath, pattern = /\.tmp$/, maxAge = 24 * 60 * 60 * 1000) {
        try {
            const fs = await import('fs');
            const path = await import('path');

            if (!fs.existsSync(dirPath)) {
                return 0;
            }

            const files = fs.readdirSync(dirPath);
            const now = Date.now();
            let cleanedCount = 0;

            for (const file of files) {
                if (pattern.test(file)) {
                    const filePath = path.join(dirPath, file);
                    const stats = fs.statSync(filePath);

                    if (now - stats.mtime.getTime() > maxAge) {
                        fs.unlinkSync(filePath);
                        cleanedCount++;
                    }
                }
            }

            return cleanedCount;
        } catch (error) {
            globalConfig.error('[公共工具] 清理临时文件失败:', error);
            return 0;
        }
    }

    /**
     * 获取系统信息
     * @returns {Object} 系统信息
     */
    static getSystemInfo() {
        return {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage()
        };
    }
}

export { CommonUtils };

