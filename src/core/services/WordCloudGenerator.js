import moment from 'moment';
import puppeteer from '../../../../../lib/puppeteer/puppeteer.js';
import { PathResolver } from '../utils/PathResolver.js';
import { globalConfig } from '../ConfigManager.js';
import { TextProcessor } from '../utils/TextProcessor.js';
import fs from 'fs';
import path from 'path';

/**
 * 词云生成器
 * 使用 Puppeteer 渲染 HTML 模板生成词云图片
 */
class WordCloudGenerator {
    constructor(config = {}) {
        this.config = config;
        this.textProcessor = new TextProcessor();
        this.templatePath = PathResolver.getTemplatesDir();
        this.version = this.getVersion();
    }

    /**
     * 获取插件版本号
     */
    getVersion() {
        try {
            const packagePath = path.join(PathResolver.getPluginDir(), 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            return packageJson.version || '3.0.0';
        } catch (error) {
            globalConfig.error('读取版本号失败:', error);
            return '3.0.0';
        }
    }

    /**
     * 生成词云图片
     * @param {array} messages - 消息列表
     * @param {object} options - 选项
     */
    async generate(messages, options = {}) {
        const {
            groupId = 'Unknown',
            groupName = '未知群聊',
            days = 1,
            userName = null,
            maxWords = this.config.maxWords || 100,
            minLength = this.config.minLength || 2,
            minFrequency = this.config.minFrequency || 2,
            extractMethod = this.config.extractMethod || 'frequency',
            width = this.config.width || 1200,
            height = this.config.height || 800,
            backgroundColor = this.config.backgroundColor || '#ffffff'
        } = options;

        // 获取渲染质量配置
        const renderConfig = this.config.render || {};
        const imgType = renderConfig.imgType || 'png';
        const quality = renderConfig.quality || 100;

        try {
            // 处理消息并生成词频统计或 TF-IDF 关键词
            globalConfig.debug(`开始生成词云，消息数: ${messages.length}，提取方式: ${extractMethod}`);

            const wordData = await this.textProcessor.processMessages(messages, {
                minLength,
                minFrequency,
                maxWords,
                extractMethod
            });

            if (wordData.length === 0) {
                globalConfig.warn('没有足够的词汇生成词云');
                return null;
            }

            globalConfig.debug(`统计到 ${wordData.length} 个词汇`);

            // 根据提取方式准备词云数据
            let wordList;

            if (extractMethod === 'tfidf' || extractMethod === 'enhanced') {
                // TF-IDF 或增强模式：wordData 格式为 [{word, weight}, ...]，weight 范围 0-1
                // 缩放到 1-10 范围供 wordcloud2.js 使用
                wordList = wordData.map(item => {
                    const scaledWeight = 1 + item.weight * 9; // 映射 0-1 到 1-10
                    return [item.word, scaledWeight];
                });
                const minWeight = wordData.length > 0 ? wordData[wordData.length - 1]?.weight?.toFixed(4) || 0 : 0;
                const maxWeight = wordData.length > 0 ? wordData[0]?.weight?.toFixed(4) || 1 : 1;
                globalConfig.debug(`${extractMethod === 'enhanced' ? '增强' : 'TF-IDF'} 权重范围: ${minWeight} - ${maxWeight}`);
            } else {
                // 词频模式：wordData 格式为 [{word, count}, ...]
                // 使用对数缩放归一化（优化：更好的权重分布）
                const frequencies = wordData.map(item => item.count);
                const maxFreq = Math.max(...frequencies);
                const minFreq = Math.min(...frequencies);
                const freqRange = maxFreq - minFreq;

                globalConfig.debug(`频率范围: ${minFreq} - ${maxFreq}`);

                wordList = wordData.map(item => {
                    let normalizedWeight;
                    if (freqRange === 0) {
                        normalizedWeight = 5;
                    } else {
                        // 使用平方根缩放，让权重分布更平滑（比对数缩放更温和）
                        const sqrtFreq = Math.sqrt(item.count);
                        const sqrtMin = Math.sqrt(minFreq);
                        const sqrtMax = Math.sqrt(maxFreq);
                        const sqrtRange = sqrtMax - sqrtMin;
                        normalizedWeight = 1 + ((sqrtFreq - sqrtMin) / sqrtRange) * 9;
                    }
                    return [item.word, normalizedWeight];
                });
            }

            // 准备模板数据
            const createTime = moment().format('YYYY-MM-DD HH:mm:ss');
            const templateData = {
                groupName,
                timeRange: this.getTimeRangeText(days),
                messageCount: messages.length,
                createTime: createTime,
                wordListJson: JSON.stringify(wordList),
                width,
                height,
                backgroundColor,
                pluResPath: PathResolver.getResourcesDir() + '/',
                userName: userName || '',
                isPersonal: !!userName,
                VERSION: this.version
            };

            // 渲染模板（使用高质量参数）
            const wordcloudTemplatePath = PathResolver.getTemplatesDir() + '/wordcloud.html';
            const img = await puppeteer.screenshot('group-insight-wordcloud', {
                tplFile: wordcloudTemplatePath,
                imgType,
                quality,
                ...templateData
            });

            globalConfig.debug('词云生成成功');
            return img;
        } catch (err) {
            globalConfig.error(`词云生成失败: ${err}`);
            globalConfig.error(err.stack);
            return null;
        }
    }

    /**
     * 获取时间范围文本
     * @param {number} days - 天数
     */
    getTimeRangeText(days) {
        switch (days) {
            case 1:
                return '当天';
            case 3:
                return '近三天';
            case 7:
                return '近七天';
            default:
                return `近${days}天`;
        }
    }

    /**
     * 获取热词榜（纯文本）
     * @param {array} messages - 消息列表
     * @param {number} topN - 前 N 个词
     */
    async getTopWords(messages, topN = 10) {
        const wordCount = await this.textProcessor.processMessages(messages, {
            minLength: 2,
            minFrequency: 2,
            maxWords: topN
        });

        return wordCount.slice(0, topN);
    }
}

export { WordCloudGenerator };
export default WordCloudGenerator;

