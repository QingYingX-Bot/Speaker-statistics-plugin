/**
 * 文本处理器
 * 处理消息文本，提取关键词和词频统计
 */
class TextProcessor {
    constructor() {
        // 停用词列表（常见无意义词汇）
        this.stopWords = new Set([
            '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'
        ]);
    }

    /**
     * 判断消息是否为有效文本消息（过滤 JSON 格式、QQ 小程序等特殊消息）
     * @param {string|Object} textOrMessage - 消息文本或消息对象
     * @returns {boolean} 是否为有效文本消息
     */
    isValidMessage(textOrMessage) {
        // 支持传入消息对象或文本字符串
        let text = '';
        let nickname = '';
        
        if (typeof textOrMessage === 'object' && textOrMessage !== null) {
            text = textOrMessage.message || textOrMessage.text || '';
            nickname = textOrMessage.nickname || '';
        } else {
            text = textOrMessage || '';
        }

        if (!text || typeof text !== 'string') {
            return false;
        }

        // 检查昵称是否包含需要过滤的关键词
        if (nickname && typeof nickname === 'string') {
            const filteredNicknames = ['AL1S_Maid', '幽幽子', '一只魔精'];
            if (filteredNicknames.some(filteredName => nickname.includes(filteredName))) {
                return false;
            }
        }

        const trimmed = text.trim();
        if (trimmed.length === 0) {
            return false;
        }

        // 检查是否包含机器人特殊消息格式（markdown消息、button消息等）
        if (trimmed.includes('>[markdown消息]') || 
            trimmed.includes('>[button消息]') ||
            /^>\[markdown消息\]/i.test(trimmed) ||
            /^>\[button消息\]/i.test(trimmed) ||
            /\[markdown消息\]\[button消息\]/i.test(trimmed)) {
            return false;
        }

        // 检查是否包含 QQ 小程序标识（优先检查，因为可能出现在 JSON 字符串末尾）
        if (trimmed.includes('com.tencent.miniapp') || 
            trimmed.includes('QQ小程序') || 
            trimmed.includes('当前QQ版本不支持此应用') ||
            trimmed.includes('请升级')) {
            return false;
        }

        // 检查是否为完整的 JSON 格式消息（QQ 小程序、卡片消息等）
        // 特征：以 { 开头，包含常见的 JSON 字段
        if (trimmed.startsWith('{')) {
            try {
                // 尝试解析 JSON（可能包含末尾的文本，先提取 JSON 部分）
                let jsonPart = trimmed;
                // 如果末尾有非 JSON 文本，尝试找到最后一个 }
                const lastBraceIndex = trimmed.lastIndexOf('}');
                if (lastBraceIndex > 0 && lastBraceIndex < trimmed.length - 1) {
                    jsonPart = trimmed.substring(0, lastBraceIndex + 1);
                }
                
                const parsed = JSON.parse(jsonPart);
                // 检查是否包含 QQ 小程序或卡片消息的特征字段
                if (parsed.ver || parsed.prompt || parsed.config || parsed.app || parsed.view || parsed.meta) {
                    return false; // 这是 JSON 格式的特殊消息，应该过滤
                }
            } catch (e) {
                // 不是有效的 JSON，继续检查其他条件
            }
        }

        // 检查是否包含大量 JSON 特征字符（可能是未解析的 JSON 字符串）
        const jsonCharCount = (trimmed.match(/[{}":,]/g) || []).length;
        const totalLength = trimmed.length;
        // 如果 JSON 特征字符占比超过 30%，可能是 JSON 格式消息
        if (jsonCharCount > 0 && (jsonCharCount / totalLength) > 0.3) {
            // 进一步检查是否包含常见的 JSON 字段名
            const jsonFieldPatterns = [
                /"ver"\s*:/,
                /"prompt"\s*:/,
                /"config"\s*:/,
                /"app"\s*:/,
                /"view"\s*:/,
                /"meta"\s*:/,
                /"type"\s*:/,
                /"width"\s*:/,
                /"height"\s*:/,
                /"forward"\s*:/,
                /"autoSize"\s*:/,
                /"ctime"\s*:/,
                /"token"\s*:/,
                /"detail_\d+"\s*:/,
                /"shareTemplateId"\s*:/,
                /"qqdocurl"\s*:/
            ];
            
            const matchCount = jsonFieldPatterns.filter(pattern => pattern.test(trimmed)).length;
            // 如果匹配到 3 个或以上的 JSON 字段模式，很可能是 JSON 消息
            if (matchCount >= 3) {
                return false;
            }
        }

        return true;
    }

    /**
     * 处理消息列表，提取关键词
     * @param {Array} messages - 消息列表，格式为 [{message: string, time: number}, ...]
     * @param {Object} options - 选项
     * @returns {Promise<Array>} 关键词列表，格式为 [{word: string, count: number}] 或 [{word: string, weight: number}]
     */
    async processMessages(messages, options = {}) {
        const {
            minLength = 2,
            minFrequency = 2,
            maxWords = 100,
            extractMethod = 'frequency' // 'frequency' 或 'tfidf'
        } = options;

        // 提取所有消息文本，并过滤掉无效消息（包括特定昵称的消息）
        const texts = messages
            .filter(msg => this.isValidMessage(msg)) // 传入完整消息对象，以便检查 nickname
            .map(msg => msg.message || msg.text || '');

        if (texts.length === 0) {
            return [];
        }

        // 分词并统计词频
        const wordCount = new Map();
        const docWordCount = new Map(); // 用于 TF-IDF：每个词出现在多少条消息中

        for (const text of texts) {
            const words = this.tokenize(text, minLength);
            const uniqueWords = new Set(words);

            for (const word of words) {
                wordCount.set(word, (wordCount.get(word) || 0) + 1);
            }

            // 统计文档频率（用于 TF-IDF）
            for (const word of uniqueWords) {
                docWordCount.set(word, (docWordCount.get(word) || 0) + 1);
            }
        }

        // 过滤停用词和低频词
        const filteredWords = Array.from(wordCount.entries())
            .filter(([word, count]) => 
                !this.stopWords.has(word) && 
                count >= minFrequency &&
                word.length >= minLength
            );

        if (extractMethod === 'tfidf') {
            // TF-IDF 计算
            const totalDocs = texts.length;
            const wordScores = filteredWords.map(([word, count]) => {
                // TF: 词频 / 总词数
                const tf = count / wordCount.size;
                
                // IDF: log(总文档数 / 包含该词的文档数)
                const df = docWordCount.get(word) || 1;
                const idf = Math.log(totalDocs / df);
                
                // TF-IDF = TF * IDF
                const weight = tf * idf;
                
                return { word, weight };
            });

            // 按权重降序排序
            wordScores.sort((a, b) => b.weight - a.weight);
            
            // 归一化权重到 0-1 范围
            if (wordScores.length > 0) {
                const maxWeight = wordScores[0].weight;
                if (maxWeight > 0) {
                    wordScores.forEach(item => {
                        item.weight = item.weight / maxWeight;
                    });
                }
            }

            return wordScores.slice(0, maxWords);
        } else {
            // 词频模式
            const wordList = filteredWords
                .map(([word, count]) => ({ word, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, maxWords);

            return wordList;
        }
    }

    /**
     * 分词（简单的中文分词）
     * @param {string} text - 文本
     * @param {number} minLength - 最小词长
     * @returns {Array<string>} 词列表
     */
    tokenize(text, minLength = 2) {
        const words = [];
        
        // 移除标点符号和特殊字符
        const cleaned = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ');
        
        // 提取中文词汇（2-4字）
        const chineseWords = cleaned.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
        words.push(...chineseWords);

        // 提取英文单词
        const englishWords = cleaned.match(/[a-zA-Z]{2,}/g) || [];
        words.push(...englishWords);

        // 提取数字（作为词汇）
        const numbers = cleaned.match(/\d{2,}/g) || [];
        words.push(...numbers);

        // 过滤长度
        return words.filter(word => word.length >= minLength);
    }
}

export { TextProcessor };
export default TextProcessor;

