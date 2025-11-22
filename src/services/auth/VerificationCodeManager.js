import { globalConfig } from '../../core/ConfigManager.js';

/**
 * 验证码管理器
 * 负责生成、发送和验证验证码
 */
class VerificationCodeManager {
    constructor() {
        // 验证码存储（内存存储，key: userId, value: {code, timestamp}）
        this.codes = new Map();
    }

    /**
     * 生成验证码
     * @param {string} userId 用户ID
     * @returns {string} 6位数字验证码
     */
    generateCode(userId) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const timestamp = Date.now();
        
        // 存储验证码（1分钟有效期）
        this.codes.set(userId, {
            code: code,
            timestamp: timestamp
        });
        
        return code;
    }

    /**
     * 验证验证码
     * @param {string} userId 用户ID
     * @param {string} code 验证码
     * @param {boolean} consume 是否消费验证码（删除），默认true
     * @returns {{valid: boolean, message?: string}}
     */
    verifyCode(userId, code, consume = true) {
        const stored = this.codes.get(userId);
        
        if (!stored) {
            return { valid: false, message: '验证码不存在或已过期' };
        }
        
        // 检查验证码是否过期（1分钟 = 60000毫秒）
        const now = Date.now();
        if (now - stored.timestamp > 60000) {
            this.codes.delete(userId);
            return { valid: false, message: '验证码已过期' };
        }
        
        // 检查验证码是否正确
        if (stored.code !== code) {
            return { valid: false, message: '验证码错误' };
        }
        
        // 验证成功
        if (consume) {
            // 消费验证码（删除，一次性使用）
            this.codes.delete(userId);
        } else {
            // 标记为已验证但未使用（用于后续操作）
            stored.verified = true;
            this.codes.set(userId, stored);
        }
        return { valid: true, message: '验证码验证成功' };
    }

    /**
     * 发送验证码到用户
     * @param {string} userId 用户ID
     * @returns {Promise<{success: boolean, code?: string, message?: string}>}
     */
    async sendCode(userId) {
        try {
            // 生成验证码
            const code = this.generateCode(userId);
            
            // 通过Bot发送验证码到用户
            if (typeof Bot === 'undefined') {
                this.codes.delete(userId);
                return { success: false, message: '机器人未初始化，无法发送验证码' };
            }
            
            try {
                // 尝试发送私聊消息
                await Bot.sendFriendMsg(null, userId, `【验证码】\n您的验证码是：${code}\n有效期：1分钟\n请勿泄露给他人！`);
                globalConfig.debug(`验证码已发送给用户 ${userId}: ${code}`);
                return { success: true, code: code };
            } catch (sendError) {
                // 如果发送失败，检查是否在好友列表中
                if (Bot.fl) {
                    const friend = Bot.fl.get(userId);
                    if (!friend) {
                        globalConfig.warn(`用户 ${userId} 不在好友列表中，无法发送验证码`);
                        this.codes.delete(userId);
                        return { success: false, message: '无法发送验证码：用户不在好友列表中，请先添加机器人为好友' };
                    }
                }
                throw sendError;
            }
        } catch (error) {
            globalConfig.error('发送验证码失败:', error);
            this.codes.delete(userId);
            return { success: false, message: '发送验证码失败: ' + (error.message || '未知错误') };
        }
    }

    /**
     * 清理过期验证码
     */
    cleanup() {
        const now = Date.now();
        for (const [userId, data] of this.codes.entries()) {
            if (now - data.timestamp > 60000) {
                this.codes.delete(userId);
            }
        }
    }

    /**
     * 清理所有验证码
     */
    clear() {
        this.codes.clear();
    }
}

export { VerificationCodeManager };
export default VerificationCodeManager;
