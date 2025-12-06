import { MessageCollector } from './MessageCollector.js';
import { WordCloudGenerator } from './WordCloudGenerator.js';
import { globalConfig } from '../ConfigManager.js';

/**
 * 词云服务管理器（单例）
 * 管理 MessageCollector 和 WordCloudGenerator 实例
 */
class WordCloudServices {
    static _messageCollector = null;
    static _wordCloudGenerator = null;

    /**
     * 获取消息收集器实例
     * @param {Object} config - 配置
     * @returns {MessageCollector} 消息收集器实例
     */
    static getMessageCollector(config = {}) {
        if (!this._messageCollector) {
            this._messageCollector = new MessageCollector(config);
        }
        return this._messageCollector;
    }

    /**
     * 获取词云生成器实例
     * @param {Object} config - 配置
     * @returns {WordCloudGenerator} 词云生成器实例
     */
    static getWordCloudGenerator(config = {}) {
        if (!this._wordCloudGenerator) {
            this._wordCloudGenerator = new WordCloudGenerator(config);
        }
        return this._wordCloudGenerator;
    }

    /**
     * 初始化服务
     * @param {Object} config - 配置
     */
    static async init(config = {}) {
        try {
            await Promise.all([
                this.getMessageCollector(config),
                this.getWordCloudGenerator(config)
            ]);
            globalConfig.debug('[词云服务] 服务初始化完成');
        } catch (error) {
            globalConfig.error('[词云服务] 服务初始化失败:', error);
        }
    }
}

export { WordCloudServices };
export default WordCloudServices;

