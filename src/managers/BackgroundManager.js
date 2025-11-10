import { CommonUtils } from '../core/utils/CommonUtils.js';
import { PathResolver } from '../core/utils/PathResolver.js';
import { globalConfig } from '../core/ConfigManager.js';
import { WebLinkGenerator } from '../core/utils/WebLinkGenerator.js';
import { segment } from 'oicq';
import fs from 'fs';
import path from 'path';

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
                reg: '^#水群设置背景$',
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
        ];
    }

    /**
     * 打开背景设置页面
     */
    async openBackgroundPage(e) {
        const validation = CommonUtils.validateGroupMessage(e, false);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        try {
            const userId = String(e.user_id);
            const result = await WebLinkGenerator.generateBackgroundPageLink(userId);
            
            if (!result.success) {
                return e.reply(`❌ ${result.message}`);
            }
            
            return e.reply([
                segment.text('🖼️ 背景设置页面链接：\n'),
                segment.text(result.url),
                segment.text('\n\n⚠️ 链接24小时内有效，请勿分享给他人')
            ]);
        } catch (error) {
            globalConfig.error('生成背景设置链接失败:', error);
            return e.reply('❌ 生成链接失败，请稍后重试');
        }
    }

    /**
     * 删除背景
     */
    async removeBackground(e) {
        const validation = CommonUtils.validateGroupMessage(e);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        try {
            const userId = String(e.sender.user_id);
            let deletedCount = 0;

            // 删除个人背景
            const normalPath = path.join(PathResolver.getBackgroundsDir('normal'), `${userId}.jpg`);
            if (fs.existsSync(normalPath)) {
                fs.unlinkSync(normalPath);
                deletedCount++;
            }

            // 删除排行榜背景
            const rankingPath = path.join(PathResolver.getBackgroundsDir('ranking'), `${userId}.jpg`);
            if (fs.existsSync(rankingPath)) {
                fs.unlinkSync(rankingPath);
                deletedCount++;
            }

            if (deletedCount > 0) {
                return e.reply(`已删除 ${deletedCount} 个背景图片`);
            } else {
                return e.reply('你没有设置过背景图片');
            }
        } catch (error) {
            globalConfig.error('删除背景失败:', error);
            return e.reply('删除背景失败');
        }
    }

    /**
     * 显示背景帮助
     */
    async showBackgroundHelp(e) {
        const validation = CommonUtils.validateGroupMessage(e, false);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        const config = WebLinkGenerator.getServerConfig();
        const editorUrl = `${config.protocol}://${config.domain || config.host}:${config.port}/`;

        const helpText = `🎨 背景设置帮助

【背景类型】
• 个人统计背景: 760×360像素
• 排行榜背景: 1520×200像素

【命令】
#水群设置背景 - 打开背景编辑器
#水群删除背景 - 删除所有背景图片

【背景编辑器】
访问地址: ${editorUrl}
功能: 在线编辑、预览、上传背景图片`;

        return e.reply(helpText);
    }
}

export { BackgroundManager };
export default BackgroundManager;

