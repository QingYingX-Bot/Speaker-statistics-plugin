import { CommonUtils } from '../core/utils/CommonUtils.js'
import { CommandWrapper } from '../core/utils/CommandWrapper.js'
import { PathResolver } from '../core/utils/PathResolver.js'
import { globalConfig } from '../core/ConfigManager.js'
import { WebLinkGenerator } from '../core/utils/WebLinkGenerator.js'
import fs from 'fs'
import path from 'path'

/**
 * 背景管理器
 * 负责背景图片的文件管理、删除操作和背景设置链接生成
 */
class BackgroundManager {
    /**
     * 获取命令规则
     */
    static getRules() {
        return [
            {
                reg: '^#水群(设置背景|背景设置)$',
                fnc: 'openBackgroundPage'
            },
            {
                reg: '^#水群删除背景$',
                fnc: 'removeBackground'
            },
            {
                reg: '^#水群背景帮助$',
                fnc: 'showBackgroundHelp'
            }
        ]
    }

    /**
     * 删除单个背景文件
     * @param {string} userId 用户ID
     * @param {string} type 背景类型 ('normal' 或 'ranking')
     * @returns {boolean} 是否成功删除
     */
    deleteBackgroundFile(userId, type) {
        const bgPath = path.join(PathResolver.getBackgroundsDir(type), `${userId}.jpg`)
        if (fs.existsSync(bgPath)) {
            try {
                fs.unlinkSync(bgPath)
                return true
            } catch (err) {
                globalConfig.error(`删除${type}背景失败:`, err)
                return false
            }
        }
        return false
    }

    /**
     * 打开背景设置页面
     */
    async openBackgroundPage(e) {
        if (!CommandWrapper.validateAndReply(e, CommonUtils.validateGroupMessage(e, false))) return

        try {
            const userId = String(e.user_id)
            const result = await WebLinkGenerator.generateBackgroundPageLink(userId)
            
            if (!result.success) {
                return e.reply(`❌ ${result.message}`)
            }
            
            return e.reply(`🖼️ 背景设置页面链接：\n${result.url}\n\n⚠️ 链接24小时内有效，请勿分享给他人`)
        } catch (err) {
            globalConfig.error('生成背景设置链接失败:', err)
            return e.reply('❌ 生成链接失败，请稍后重试')
        }
    }

    /**
     * 删除背景
     */
    async removeBackground(e) {
        if (!CommandWrapper.validateAndReply(e, CommonUtils.validateGroupMessage(e))) return

        try {
            const userId = String(e.sender.user_id)
            let deletedCount = 0

            if (this.deleteBackgroundFile(userId, 'normal')) deletedCount++
            if (this.deleteBackgroundFile(userId, 'ranking')) deletedCount++

            if (deletedCount > 0) {
                return e.reply(`已删除 ${deletedCount} 个背景图片`)
            } else {
                return e.reply('你没有设置过背景图片')
            }
        } catch (err) {
            globalConfig.error('删除背景失败:', err)
            return e.reply('删除背景失败')
        }
    }

    /**
     * 显示背景帮助
     */
    async showBackgroundHelp(e) {
        if (!CommandWrapper.validateAndReply(e, CommonUtils.validateGroupMessage(e, false))) return

        const config = WebLinkGenerator.getServerConfig()
        const editorUrl = `${config.protocol}://${config.domain || config.host}:${config.port}/`

        const helpText = `🎨 背景设置帮助

【背景类型】
• 个人统计背景: 760×360像素
• 排行榜背景: 1520×200像素

【命令】
#水群设置背景 / #水群背景设置 - 打开背景编辑器
#水群删除背景 - 删除所有背景图片

【背景编辑器】
访问地址: ${editorUrl}
功能: 在线编辑、预览、上传背景图片`

        return e.reply(helpText)
    }
}

export { BackgroundManager }
export default BackgroundManager
