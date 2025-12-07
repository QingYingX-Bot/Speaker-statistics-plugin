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
                // 检查是否因为消息太少导致失败
                if (messages.length < 5) {
                    return e.reply(`最近${days}天的消息太少（仅${messages.length}条），无法生成词云`, true);
                }
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
                // 检查是否因为消息太少导致失败
                if (messages.length < 5) {
                    return e.reply(`您在最近${days}天内的消息太少（仅${messages.length}条），无法生成词云`, true);
                }
                return e.reply('词云生成失败，请查看日志', true);
            }

            return e.reply(img);
        } catch (error) {
            globalConfig.error('生成个人词云失败:', error);
            return e.reply(`个人词云生成失败: ${error.message || '未知错误'}`, true);
        }
    }

    /**
     * 生成总词云（所有群）
     */
    async generateTotalWordCloud(e) {
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

            await e.reply(`正在生成所有群${days === 1 ? '当天' : days === 3 ? '近三天' : '近七天'}的总词云，请稍候...`);

            // 获取所有群组列表
            let groupList = [];
            try {
                // 优先使用 Bot.getGroupList()
                if (typeof Bot !== 'undefined' && Bot.getGroupList) {
                    groupList = Bot.getGroupList();
                } else if (typeof Bot !== 'undefined' && Bot.gl) {
                    // 如果 getGroupList 不存在，使用 Bot.gl
                    groupList = Array.from(Bot.gl.keys()).map(groupId => ({ group_id: groupId }));
                } else {
                    // 最后尝试使用数据库
                    const dbService = this.dataService.dbService;
                    const groupsMap = await dbService.getAllGroupsInfoBatch();
                    groupList = Array.from(groupsMap.keys()).map(groupId => ({ group_id: groupId }));
                }
            } catch (err) {
                globalConfig.error(`获取群组列表失败: ${err}`);
                return e.reply('获取群组列表失败，请查看日志', true);
            }

            if (groupList.length === 0) {
                return e.reply('未找到任何群组', true);
            }

            // 收集所有群组的消息
            const allMessages = [];
            let successGroups = 0;
            let failedGroups = 0;

            await e.reply(`正在从 ${groupList.length} 个群组收集消息...`);

            for (const group of groupList) {
                const groupId = String(group.group_id || group);
                try {
                    const messages = await messageCollector.getMessages(groupId, days);
                    if (messages && messages.length > 0) {
                        allMessages.push(...messages);
                        successGroups++;
                    }
                } catch (err) {
                    globalConfig.debug(`获取群组 ${groupId} 消息失败: ${err}`);
                    failedGroups++;
                }
            }

            if (allMessages.length === 0) {
                return e.reply(`没有找到最近${days}天的消息记录`, true);
            }

            if (allMessages.length < 5) {
                return e.reply(`最近${days}天的消息太少（仅${allMessages.length}条），无法生成词云`, true);
            }

            await e.reply(`已收集 ${allMessages.length} 条消息（来自 ${successGroups} 个群组${failedGroups > 0 ? `，${failedGroups} 个群组获取失败` : ''}），正在生成词云...`);

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
        } catch (error) {
            globalConfig.error('生成总词云失败:', error);
            return e.reply(`总词云生成失败: ${error.message || '未知错误'}`, true);
        }
    }
}

export { WordCloudCommands };
export default WordCloudCommands;

