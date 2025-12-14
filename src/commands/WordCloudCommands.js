import { DataService } from '../core/DataService.js';
import { globalConfig } from '../core/ConfigManager.js';
import { CommonUtils } from '../core/utils/CommonUtils.js';
import { CommandWrapper } from '../core/utils/CommandWrapper.js';
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
            },
            {
                reg: '^#水群总词云\\s*(三天|七天)?$',
                fnc: 'generateTotalWordCloud'
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

        return await CommandWrapper.safeExecute(async () => {
            // 提前检查 Redis 和消息收集功能
            if (typeof redis === 'undefined' || !redis) {
                return e.reply('词云功能需要配置 Redis。请检查 Redis 配置是否正确', true);
            }

            const enableCollection = globalConfig.getConfig('wordcloud.enableMessageCollection');
            if (!enableCollection) {
                return e.reply('词云功能需要启用消息收集功能。请在配置中设置 wordcloud.enableMessageCollection 为 true', true);
            }

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

            // 获取群消息（使用优化的批量查询方法）
            const messages = await messageCollector.getGroupMessages(e.group_id, days);

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
                // 检查是否因为消息太少导致失败
                if (messages.length < 5) {
                    return e.reply(`最近${days}天的消息太少（仅${messages.length}条），无法生成词云`, true);
                }
                return e.reply('词云生成失败，请查看日志', true);
            }

            return e.reply(img);
        }, '生成词云失败', async (error) => {
            return e.reply(`词云生成失败: ${error.message || '未知错误'}`, true);
        });
    }

    /**
     * 生成个人词云
     */
    async generatePersonalWordCloud(e) {
        const validation = CommonUtils.validateGroupMessage(e, true);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        return await CommandWrapper.safeExecute(async () => {
            // 提前检查 Redis 和消息收集功能
            if (typeof redis === 'undefined' || !redis) {
                return e.reply('词云功能需要配置 Redis。请检查 Redis 配置是否正确', true);
            }

            const enableCollection = globalConfig.getConfig('wordcloud.enableMessageCollection');
            if (!enableCollection) {
                return e.reply('词云功能需要启用消息收集功能。请在配置中设置 wordcloud.enableMessageCollection 为 true', true);
            }

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

            // 获取该用户的消息（使用优化的批量查询方法）
            if (globalConfig.getConfig('global.debugLog')) {
                globalConfig.debug(`[词云] 开始获取用户 ${userId} (${userName}) 在群 ${e.group_id} 的消息，天数: ${days}`);
            }
            
            const messages = await messageCollector.getUserMessages(
                e.group_id,
                userId,
                days
            );

            if (globalConfig.getConfig('global.debugLog')) {
                globalConfig.debug(`[词云] 获取到 ${messages.length} 条消息`);
            }

            if (messages.length === 0) {
                return e.reply(`您在最近${days}天内没有消息记录。\n提示：请确保消息收集功能已启用，并且您在该时间段内确实发送过消息`, true);
            }

            if (messages.length < 5) {
                return e.reply(`您在最近${days}天内的消息太少（仅${messages.length}条），无法生成词云。\n提示：至少需要5条有效消息才能生成词云`, true);
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
                // 检查是否因为消息太少导致失败
                if (messages.length < 5) {
                    return e.reply(`您在最近${days}天内的消息太少（仅${messages.length}条），无法生成词云`, true);
                }
                return e.reply('词云生成失败，请查看日志', true);
            }

            return e.reply(img);
        }, '生成个人词云失败', async (error) => {
            return e.reply(`个人词云生成失败: ${error.message || '未知错误'}`, true);
        });
    }

    /**
     * 生成总词云（所有群）
     */
    async generateTotalWordCloud(e) {
        const validation = CommonUtils.validateGroupMessage(e, true);
        if (!validation.valid) {
            return e.reply(validation.message);
        }

        return await CommandWrapper.safeExecute(async () => {
            // 提前检查 Redis 和消息收集功能
            if (typeof redis === 'undefined' || !redis) {
                return e.reply('词云功能需要配置 Redis。请检查 Redis 配置是否正确', true);
            }

            const enableCollection = globalConfig.getConfig('wordcloud.enableMessageCollection');
            if (!enableCollection) {
                return e.reply('词云功能需要启用消息收集功能。请在配置中设置 wordcloud.enableMessageCollection 为 true', true);
            }

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

            await e.reply(`正在生成所有群${days === 1 ? '当天' : days === 3 ? '近三天' : '近七天'}的总词云，请稍候...`);

            // 使用优化的批量查询方法，直接从全局键获取（无需遍历所有群组）
            const allMessages = await messageCollector.getGlobalMessages(days);

            if (allMessages.length === 0) {
                return e.reply(`没有找到最近${days}天的消息记录`, true);
            }

            if (allMessages.length < 5) {
                return e.reply(`最近${days}天的消息太少（仅${allMessages.length}条），无法生成词云`, true);
            }

            // 统计涉及的群组数量（用于显示）
            const groupSet = new Set();
            allMessages.forEach(msg => {
                if (msg.group_id) {
                    groupSet.add(String(msg.group_id));
                }
            });
            const successGroups = groupSet.size;

            await e.reply(`已收集 ${allMessages.length} 条消息（来自 ${successGroups} 个群组），正在生成词云...`);

            // 生成词云
            const img = await wordCloudGenerator.generate(allMessages, {
                groupId: 'all',  // 使用 'all' 表示所有群组
                groupName: `总词云（${successGroups}个群组）`,
                days
            });

            if (!img) {
                // 检查是否因为消息太少导致失败
                if (allMessages.length < 5) {
                    return e.reply(`最近${days}天的消息太少（仅${allMessages.length}条），无法生成词云`, true);
                }
                return e.reply('词云生成失败，请查看日志', true);
            }

            return e.reply(img);
        }, '生成总词云失败', async (error) => {
            return e.reply(`总词云生成失败: ${error.message || '未知错误'}`, true);
        });
    }
}

export { WordCloudCommands };
export default WordCloudCommands;

