import { CommonUtils } from '../../core/utils/CommonUtils.js'
import { CommandWrapper } from '../../core/utils/CommandWrapper.js'
import { globalConfig } from '../../core/ConfigManager.js'
import { ImageGenerator } from '../../core/render/ImageGenerator.js'
import { segment } from 'oicq'

/**
 * 帮助命令处理类
 */
class HelpCommands {
    constructor(dataService = null, imageGenerator = null) {
        this.imageGenerator = imageGenerator || new ImageGenerator(dataService)
    }

    /**
     * 格式化图片路径为 segment 格式
     * @param {string} imagePath 图片路径
     * @returns {Object} segment 图片对象
     */
    formatImageSegment(base64) {
        return segment.image(`base64://${base64}`)
    }

    /**
     * 获取命令规则
     */
    static getRules() {
        return [
            {
                reg: '^#水群帮助$',
                fnc: 'showHelp'
            }
        ]
    }

    /**
     * 显示帮助信息
     */
    async showHelp(e) {
        const validation = CommonUtils.validateGroupMessage(e, false)
        if (!validation.valid) {
            return e.reply(validation.message)
        }

        return await CommandWrapper.safeExecute(async () => {
            const isMaster = e.isMaster || false
            const usePicture = globalConfig.getConfig('display.usePicture')
            if (usePicture) {
                try {
                    const imagePath = await this.imageGenerator.generateHelpPanelImage(isMaster)
                    return e.reply(this.formatImageSegment(imagePath))
                } catch (err) {
                    globalConfig.error('生成帮助面板图片失败:', err)
                }
            }
        
            let helpText = `📊 发言统计插件帮助

【基础命令】
#水群总榜 - 查看总发言排行
#水群日榜 - 查看今日排行
#水群周榜 - 查看本周排行
#水群月榜 - 查看本月排行
#水群榜 - 查看本月排行（别名）
#水群年榜 - 查看今年排行
#水群趋势 [天数] - 查看最近发言趋势（默认7天）
#水群查询 - 查询个人统计数据（支持 @ 查询他人）
#水群查询群列表 - 查看用户所在的所有群聊
#水群统计 - 查看当前群聊的统计信息
#水群信息 - 查看当前群聊详细信息
#水群总统计 [群数|all] - 查看全局统计信息
#总水群统计 [群数|all] - 查看全局统计信息（别名）`

            if (isMaster) {
                helpText += `

【管理员命令（仅主人）】
【数据管理】
#水群清除统计 - 清除当前群的统计数据
#水群归档僵尸群 - 列出所有僵尸群
#水群确认归档 - 确认归档列出的僵尸群
#水群查看归档列表 - 查看当前归档群组列表
#水群清理缓存 - 清理运行缓存

【系统设置】
#水群设置人数+<数字> - 设置排行榜显示人数
#水群设置开启/关闭转发 - 切换转发消息模式
#水群设置开启/关闭图片 - 切换图片显示模式
#水群设置开启/关闭记录 - 切换消息记录功能
#水群设置开启/关闭日志 - 切换调试日志输出
#水群更新 - 安全更新插件（仅 fast-forward，要求无本地改动）
#水群强制更新 - 强制更新插件（覆盖本地修改）
`
            }

            helpText += `

【帮助】
#水群帮助 - 显示此帮助信息`

            return e.reply(helpText)
        }, '显示帮助信息失败', async () => {
            return e.reply('显示帮助信息失败，请稍后重试')
        })
    }
}

export { HelpCommands }
export default HelpCommands
