import { CommonUtils } from '../core/utils/CommonUtils.js';
import { PathResolver } from '../core/utils/PathResolver.js';
import { globalConfig } from '../core/ConfigManager.js';
import fs from 'fs';
import path from 'path';

/**
 * 背景管理器
 * 负责背景图片的管理
 */
class BackgroundManager {
    /**
     * 获取命令规则
     */
    static getRules() {
        return [
            {
                reg: '^#水群设置背景$',
                fnc: 'setBackground'
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
     * 设置背景
     */
    async setBackground(e) {
        const validation = CommonUtils.validateGroupMessage(e);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        try {
            const userId = String(e.sender.user_id);
            const config = globalConfig.getConfig('backgroundServer') || {};
            const port = config.port || 39999;
            const host = config.domain || config.host || 'localhost';
            const protocol = config.protocol || 'http';

            const editorUrl = `${protocol}://${host}:${port}/?userId=${userId}`;

            const text = `🎨 背景设置\n\n` +
                `个人统计背景尺寸: 760×360像素\n` +
                `排行榜背景尺寸: 1520×200像素\n\n` +
                `点击下方链接进入背景编辑器：\n` +
                `${editorUrl}\n\n` +
                `提示：首次使用需要设置访问秘钥`;

            return e.reply(text);
        } catch (error) {
            globalConfig.error('设置背景失败:', error);
            return e.reply('背景设置功能暂时不可用');
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

        const config = globalConfig.getConfig('backgroundServer') || {};
        const port = config.port || 39999;
        const host = config.domain || config.host || 'localhost';
        const protocol = config.protocol || 'http';
        const editorUrl = `${protocol}://${host}:${port}/`;

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

