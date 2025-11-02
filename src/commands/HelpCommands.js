import { CommonUtils } from '../core/utils/CommonUtils.js';
import { globalConfig } from '../core/ConfigManager.js';
import { ImageGenerator } from '../render/ImageGenerator.js';

/**
 * 帮助命令处理类
 */
class HelpCommands {
    constructor(dataService = null) {
        this.imageGenerator = new ImageGenerator(dataService);
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
        ];
    }

    /**
     * 显示帮助信息
     */
    async showHelp(e) {
        const validation = CommonUtils.validateGroupMessage(e, false);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        // 检查是否使用图片模式
        const usePicture = globalConfig.getConfig('display.usePicture');
        if (usePicture) {
            try {
                const isMaster = e.isMaster || false;
                const imagePath = await this.imageGenerator.generateHelpPanelImage(isMaster);
                return e.reply(segment.image(`file:///${imagePath.replace(/\\/g, '/')}`));
            } catch (error) {
                globalConfig.error('生成帮助面板图片失败:', error);
                // 回退到文本模式
            }
        }

        // 文本模式
        const helpText = `📊 发言统计插件帮助

【基础命令】
#水群总榜 - 查看总发言排行
#水群日榜 - 查看今日排行
#水群周榜 - 查看本周排行
#水群月榜 - 查看本月排行
#水群年榜 - 查看今年排行
#水群查询 - 查询个人统计数据

【管理员命令】
#水群清除统计 - 清除当前群的统计数据
#水群设置人数+数字 - 设置显示人数
#水群设置开启/关闭转发 - 设置是否使用转发消息
#水群设置开启/关闭图片 - 设置是否使用图片模式
#水群设置开启/关闭记录 - 设置是否记录消息
#水群设置开启/关闭日志 - 设置是否开启调试日志
#水群设置开启/关闭通知 - 设置是否显示成就解锁通知

【帮助】
#水群帮助 - 显示此帮助信息`;

        return e.reply(helpText);
    }
}

export { HelpCommands };
export default HelpCommands;

