import { DataService } from '../core/DataService.js';
import { globalConfig } from '../core/ConfigManager.js';
import { CommonUtils } from '../core/utils/CommonUtils.js';
import { TimeUtils } from '../core/utils/TimeUtils.js';
import { WordCloudServices } from '../core/services/WordCloudServices.js';
import { segment } from 'oicq';

/**
 * 词云命令处理类
 */
class WordCloudCommands {
    constructor(dataService = null) {
        this.dataService = dataService || new DataService();
    }

    /**
     * 获取命令规则
     */
    static getRules() {
        return [
            {
                reg: '^#水群词云\\s*(三天|七天)?$',
                fnc: 'generateWordCloud'
            },
            {
                reg: '^#我的水群词云\\s*(三天|七天)?$',
                fnc: 'generatePersonalWordCloud'
            }
        ];
    }

    /**
     * 生成群聊词云
     */
    async generateWordCloud(e) {
        const validation = CommonUtils.validateGroupMessage(e, true);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        try {
            // 获取服务实例
            const messageCollector = WordCloudServices.getMessageCollector();
            const wordCloudGenerator = WordCloudServices.getWordCloudGenerator();

            if (!messageCollector || !wordCloudGenerator) {
                return e.reply('词云功能未就绪', true);
            }

            // 解析天数（默认当天，可选三天或七天）
            const match = e.msg?.match(/(三天|七天)/);
            let days = 1;
            if (match) {
                if (match[1] === '三天') days = 3;
                else if (match[1] === '七天') days = 7;
            }

            await e.reply(`正在生成${days === 1 ? '当天' : days === 3 ? '近三天' : '近七天'}的词云，请稍候...`);

            // 获取消息
            const messages = await messageCollector.getMessages(e.group_id, days);

            if (messages.length === 0) {
                return e.reply(`没有找到最近${days}天的消息记录`, true);
            }

            // 获取群名
            let groupName = '未知群聊';
            try {
                const dbService = this.dataService.dbService;
                const groupInfo = await dbService.getGroupInfo(e.group_id);
                if (groupInfo && groupInfo.group_name) {
                    groupName = groupInfo.group_name;
                } else if (typeof Bot !== 'undefined' && Bot.gl) {
                    const botGroupInfo = Bot.gl.get(e.group_id);
                    if (botGroupInfo) {
                        groupName = botGroupInfo.group_name || botGroupInfo.name || groupName;
                    }
                }
            } catch (err) {
                globalConfig.debug(`获取群名失败: ${err}，使用群号作为群名`);
                groupName = `群${e.group_id}`;
            }

            // 生成词云
            const img = await wordCloudGenerator.generate(messages, {
                groupId: e.group_id,
                groupName,
                days
            });

            if (!img) {
                return e.reply('词云生成失败，请查看日志', true);
            }

            return e.reply(img);
        } catch (error) {
            globalConfig.error('生成词云失败:', error);
            return e.reply(`词云生成失败: ${error.message || '未知错误'}`, true);
        }
    }

    /**
     * 生成个人词云
     */
    async generatePersonalWordCloud(e) {
        const validation = CommonUtils.validateGroupMessage(e, true);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        try {
            // 获取服务实例
            const messageCollector = WordCloudServices.getMessageCollector();
            const wordCloudGenerator = WordCloudServices.getWordCloudGenerator();

            if (!messageCollector || !wordCloudGenerator) {
                return e.reply('词云功能未就绪', true);
            }

            // 解析天数（默认当天，可选三天或七天）
            const match = e.msg?.match(/(三天|七天)/);
            let days = 1;
            if (match) {
                if (match[1] === '三天') days = 3;
                else if (match[1] === '七天') days = 7;
            }

            // 获取用户信息
            const userId = String(e.sender?.user_id || e.user_id || '');
            const userName = e.sender?.card || e.sender?.nickname || '未知用户';

            await e.reply(`正在生成 ${userName} ${days === 1 ? '当天' : days === 3 ? '近三天' : '近七天'}的个人词云，请稍候...`);

            // 获取该用户的消息
            const messages = await messageCollector.getRecentUserMessages(
                e.group_id,
                userId,
                1,      // count 参数，设置 days 后会被忽略
                null,   // beforeTime
                days    // 指定天数
            );

            if (messages.length === 0) {
                return e.reply(`您在最近${days}天内没有消息记录`, true);
            }

            if (messages.length < 5) {
                return e.reply(`您在最近${days}天内的消息太少（仅${messages.length}条），无法生成词云`, true);
            }

            // 获取群名
            let groupName = '未知群聊';
            try {
                const dbService = this.dataService.dbService;
                const groupInfo = await dbService.getGroupInfo(e.group_id);
                if (groupInfo && groupInfo.group_name) {
                    groupName = groupInfo.group_name;
                } else if (typeof Bot !== 'undefined' && Bot.gl) {
                    const botGroupInfo = Bot.gl.get(e.group_id);
                    if (botGroupInfo) {
                        groupName = botGroupInfo.group_name || botGroupInfo.name || groupName;
                    }
                }
            } catch (err) {
                globalConfig.debug(`获取群名失败: ${err}，使用群号作为群名`);
                groupName = `群${e.group_id}`;
            }

            // 生成词云
            const img = await wordCloudGenerator.generate(messages, {
                groupId: e.group_id,
                groupName,
                days,
                userName  // 传递用户名用于显示个人词云标题
            });

            if (!img) {
                return e.reply('词云生成失败，请查看日志', true);
            }

            return e.reply(img);
        } catch (error) {
            globalConfig.error('生成个人词云失败:', error);
            return e.reply(`个人词云生成失败: ${error.message || '未知错误'}`, true);
        }
    }
}

export { WordCloudCommands };
export default WordCloudCommands;

