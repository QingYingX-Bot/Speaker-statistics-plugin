import { DataService } from '../core/DataService.js';
import { globalConfig } from '../core/ConfigManager.js';
import { CommonUtils } from '../core/utils/CommonUtils.js';

/**
 * 管理员命令处理类
 */
class AdminCommands {
    constructor(dataService = null) {
        this.dataService = dataService || new DataService();
    }

    /**
     * 获取命令规则
     */
    static getRules() {
        return [
            {
                reg: '^#水群清除统计$',
                fnc: 'clearRanking'
            },
            {
                reg: '^#水群设置人数\\+(\\d+)$',
                fnc: 'setDisplayCount'
            },
            {
                reg: '^#水群设置(开启|关闭)(转发|图片|记录|日志)$',
                fnc: 'toggleSetting'
            }
        ];
    }

    /**
     * 清除统计
     */
    async clearRanking(e) {
        const validation = CommonUtils.validateAdminPermission(e);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        const validationGroup = CommonUtils.validateGroupMessage(e);
        if (!validationGroup.valid) {
            return e.reply(validationGroup.message);
        }

        try {
            const groupId = String(e.group_id);
            const success = await this.dataService.clearGroupStats(groupId);

            if (success) {
                return e.reply('统计数据已清除');
            } else {
                return e.reply('清除统计数据失败');
            }
        } catch (error) {
            globalConfig.error('清除统计失败:', error);
            return e.reply('清除失败，请稍后重试');
        }
    }

    /**
     * 设置显示人数
     */
    async setDisplayCount(e) {
        const validation = CommonUtils.validateAdminPermission(e);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        try {
            const match = e.msg.match(/^#水群设置人数\+(\d+)$/);
            if (!match) {
                return e.reply('格式错误，正确格式：#水群设置人数+数字');
            }

            const count = parseInt(match[1]);
            if (count < 1 || count > 100) {
                return e.reply('显示人数必须在1-100之间');
            }

            globalConfig.updateConfig('display.displayCount', count);
            return e.reply(`显示人数已设置为 ${count}`);
        } catch (error) {
            globalConfig.error('设置显示人数失败:', error);
            return e.reply('设置失败，请稍后重试');
        }
    }

    /**
     * 切换设置
     */
    async toggleSetting(e) {
        const validation = CommonUtils.validateAdminPermission(e);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        try {
            const match = e.msg.match(/^#水群设置(开启|关闭)(转发|图片|记录|日志)$/);
            if (!match) {
                return e.reply('格式错误');
            }

            const toggle = match[1] === '开启';
            const setting = match[2];

            let configKey = '';
            let settingName = '';

            switch (setting) {
                case '转发':
                    configKey = 'display.useForward';
                    settingName = '转发消息';
                    break;
                case '图片':
                    configKey = 'display.usePicture';
                    settingName = '图片模式';
                    break;
                case '记录':
                    configKey = 'global.recordMessage';
                    settingName = '消息记录';
                    break;
                case '日志':
                    configKey = 'global.debugLog';
                    settingName = '调试日志';
                    break;
                default:
                    return e.reply('未知设置项');
            }

            globalConfig.updateConfig(configKey, toggle);
            return e.reply(`${settingName}已${toggle ? '开启' : '关闭'}`);
        } catch (error) {
            globalConfig.error('切换设置失败:', error);
            return e.reply('设置失败，请稍后重试');
        }
    }

}

export { AdminCommands };
export default AdminCommands;

