/**
 * 公共验证和处理工具类
 * 提供标准化的验证、处理和格式化功能
 */
class CommonUtils {
    static getBotAppId(selfId) {
        const bot = globalThis.Bot?.[String(selfId || '').trim()]
        return String(bot?.info?.appid || bot?.info?.appId || '').trim()
    }

    static parseQQBotUserId(userId, groupId = '') {
        const rawUserId = String(userId || '').trim()
        const rawGroupId = String(groupId || '').trim()
        if (!rawUserId) return null

        const splitPrefixedId = (id) => {
            const idx = id.indexOf(':')
            if (idx <= 0) return null
            return { selfId: id.slice(0, idx), openid: id.slice(idx + 1) }
        }

        const userParts = splitPrefixedId(rawUserId)
        const groupParts = splitPrefixedId(rawGroupId)
        const openid = userParts?.openid || rawUserId
        const appid = this.getBotAppId(userParts?.selfId || groupParts?.selfId)

        if (!appid || !/^[A-Za-z0-9_-]{16,}$/.test(openid) || /^\d+$/.test(openid)) return null
        return { appid, openid }
    }

    static getQQUserAvatarUrl(userId, groupId = '') {
        const qqBotUser = this.parseQQBotUserId(userId, groupId)
        if (qqBotUser) {
            return `https://thirdqq.qlogo.cn/qqapp/${encodeURIComponent(qqBotUser.appid)}/${encodeURIComponent(qqBotUser.openid)}/640`
        }
        return `https://q1.qlogo.cn/g?b=qq&nk=${encodeURIComponent(String(userId || '').trim())}&s=100`
    }

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
            }
        }

        if (requireGroup && !e.group_id) {
            return {
                valid: false,
                message: '此命令仅支持在群聊中使用'
            }
        }

        if (!e.sender || !e.sender.user_id) {
            return {
                valid: false,
                message: '无效的发送者信息'
            }
        }

        return {
            valid: true
        }
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
            }
        }

        const num = parseInt(input.trim(), 10)

        if (isNaN(num)) {
            return {
                valid: false,
                message: `${paramName}必须是数字`
            }
        }

        if (num < min || num > max) {
            return {
                valid: false,
                message: `${paramName}必须在${min}-${max}之间`
            }
        }

        return {
            valid: true,
            value: num
        }
    }

    /**
     * 格式化数字（添加千分位分隔符）
     * @param {number} num 数字
     * @returns {string} 格式化后的数字
     */
    static formatNumber(num) {
        if (typeof num !== 'number') return '0'
        return num.toLocaleString('zh-CN')
    }

    /**
     * 隐藏群号部分位数
     * @param {string} groupId 群号
     * @param {number} visibleStart 开头保留位数
     * @param {number} visibleEnd 结尾保留位数
     * @returns {string} 隐藏后的群号
     */
    static maskGroupId(groupId, visibleStart = 3, visibleEnd = 3) {
        if (!groupId) return groupId
        const str = String(groupId)
        if (str.length <= visibleStart + visibleEnd) return str
        
        const start = str.substring(0, visibleStart)
        const end = str.substring(str.length - visibleEnd)
        const middle = '*'.repeat(Math.min(4, str.length - visibleStart - visibleEnd))
        
        return start + middle + end
    }


}

export { CommonUtils }
