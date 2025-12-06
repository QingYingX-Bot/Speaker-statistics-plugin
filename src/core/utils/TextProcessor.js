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

        // 提取所有消息文本
        const texts = messages
            .map(msg => msg.message || msg.text || '')
            .filter(text => text && text.trim().length > 0);

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

