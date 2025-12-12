import { CommonUtils } from '../core/utils/CommonUtils.js';
import { CommandWrapper } from '../core/utils/CommandWrapper.js';
import { globalConfig } from '../core/ConfigManager.js';
import { ImageGenerator } from '../render/ImageGenerator.js';
import { segment } from 'oicq';

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

        return await CommandWrapper.safeExecute(async () => {
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
        const isMaster = e.isMaster || false;
        
        let helpText = `📊 发言统计插件帮助

【基础命令】
#水群总榜 - 查看总发言排行
#水群日榜 - 查看今日排行
#水群周榜 - 查看本周排行
#水群月榜 - 查看本月排行
#水群年榜 - 查看今年排行
#水群查询 - 查询个人统计数据（支持 @ 查询他人）
#水群查询群列表 - 查看用户所在的所有群聊
#水群统计 - 查看当前群聊的统计信息
#水群总统计 - 查看全局统计信息

【词云功能】
#水群词云 - 生成群聊词云图（默认当天，可选 三天/七天）
#我的水群词云 - 生成个人词云图（默认当天，可选 三天/七天）

【成就系统】
#水群成就列表 - 查看当前群聊所有可获取的成就
#水群设置显示成就 <成就名> - 手动设置个人资料页显示的成就
#水群成就统计 - 查看每个成就的获取情况

【背景设置】
#水群设置背景 - 生成背景设置页面链接
#水群背景帮助 - 查看背景设置帮助信息

【网页功能】
#水群网页 - 生成个人统计页面链接（Token访问）`;

        if (isMaster) {
            helpText += `

【管理员命令（仅主人）】
【数据管理】
#水群清除统计 - 清除当前群的统计数据
#水群归档僵尸群 - 列出所有僵尸群
#水群确认归档 - 确认归档列出的僵尸群

【系统设置】
#水群设置人数+<数字> - 设置排行榜显示人数
#水群设置开启/关闭转发 - 切换转发消息模式
#水群设置开启/关闭图片 - 切换图片显示模式
#水群设置开启/关闭记录 - 切换消息记录功能
#水群设置开启/关闭日志 - 切换调试日志输出
#水群设置开启/关闭通知 - 切换成就解锁通知
#水群更新 - 更新插件到最新版本
#水群强制更新 - 强制更新插件（覆盖本地修改）
#刷新水群成就 - 刷新当前群组的所有显示成就
#刷新全群水群成就 - 刷新所有群组的所有显示成就`;
        }

        helpText += `

【帮助】
#水群帮助 - 显示此帮助信息`;

            return e.reply(helpText);
        }, '显示帮助信息失败', async (error) => {
            return e.reply('显示帮助信息失败，请稍后重试');
        });
    }
}

export { HelpCommands };
export default HelpCommands;

