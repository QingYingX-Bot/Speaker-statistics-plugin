/**
 * 用户解析工具类
 * 提供统一的用户ID和昵称解析功能
 * 支持 @ 用户和文本中的 @QQ号 解析
 */
export class UserParser {
    /**
     * 从消息事件中解析用户ID和昵称
     * @param {Object} e 消息事件
     * @param {Object} options 选项
     * @param {boolean} options.allowMention 是否允许 @ 用户（默认：true）
     * @param {boolean} options.defaultToSelf 是否默认返回发送者信息（默认：true）
     * @returns {Object|null} { userId: string, nickname: string, isMentioned: boolean } 或 null
     */
    static parseUser(e, options = {}) {
        const { allowMention = true, defaultToSelf = true } = options;
        
        // 检查 @ 用户
        if (allowMention && e.message) {
            for (const item of e.message) {
                if (item.type === 'at' && item.qq) {
                    return {
                        userId: String(item.qq),
                        nickname: item.text || `用户${item.qq}`,
                        isMentioned: true
                    };
                }
            }
        }
        
        // 检查文本中的 @QQ号
        if (allowMention) {
            const match = e.msg?.match(/@(\d+)/);
            if (match) {
                return {
                    userId: match[1],
                    nickname: `用户${match[1]}`,
                    isMentioned: true
                };
            }
        }
        
        // 默认返回发送者信息
        if (defaultToSelf) {
            return {
                userId: String(e.sender?.user_id || e.user_id || ''),
                nickname: e.sender?.card || e.sender?.nickname || '未知用户',
                isMentioned: false
            };
        }
        
        return null;
    }

    /**
     * 解析 @ 用户或QQ号（兼容旧方法）
     * @param {Object} e 消息事件
     * @returns {Object|null} { userId: string, nickname: string } 或 null
     * @deprecated 使用 parseUser 方法替代
     */
    static parseMentionedUser(e) {
        const result = this.parseUser(e, { allowMention: true, defaultToSelf: false });
        if (result && result.isMentioned) {
            return {
                userId: result.userId,
                nickname: result.nickname
            };
        }
        return null;
    }
}

