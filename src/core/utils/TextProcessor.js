/**
 * 文本处理器（优化版）
 * 处理消息文本，提取关键词和词频统计
 * 
 * 优化点：
 * 1. 改进分词算法：支持更灵活的中文分词（1-6字滑动窗口）
 * 2. 扩展停用词列表：包含更多无意义词汇
 * 3. 优化权重计算：考虑词长度、多样性、重要性
 * 4. 修复 TF-IDF 计算：正确计算 TF（词频/总词数）
 * 5. 添加词的重要性评分：综合多个因素
 */
class TextProcessor {
    constructor() {
        // 扩展的停用词列表（常见无意义词汇、语气词、助词等）
        this.stopWords = new Set([
            // 常见助词、语气词
            '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这',
            '那', '他', '她', '它', '们', '这', '那', '哪', '怎', '么', '什', '么', '为', '什', '么', '怎', '样', '如', '何',
            '可', '以', '能', '够', '应', '该', '会', '不', '会', '没', '有', '没', '没', '不', '是', '不', '要', '不', '用',
            '还', '还', '是', '还', '有', '还', '没', '还', '在', '还', '能', '还', '会', '还', '要',
            // 常见语气词
            '啊', '呀', '呢', '吧', '吗', '哦', '嗯', '额', '呃', '诶', '唉', '哎', '哈', '呵', '嘻', '嘿',
            // 常见数字和符号
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
            // 常见无意义词
            '这个', '那个', '什么', '怎么', '为什么', '怎么样', '如何', '可以', '能够', '应该', '会不会', '有没有', '是不是', '要不要', '用不用',
            '还是', '还有', '还没', '还在', '还能', '还会', '还要',
            // 常见回复词
            '好的', '好的', '好的', '好的', '好的', '好的', '好的', '好的', '好的', '好的',
            '收到', '收到', '收到', '收到', '收到', '收到', '收到', '收到', '收到', '收到',
            '谢谢', '谢谢', '谢谢', '谢谢', '谢谢', '谢谢', '谢谢', '谢谢', '谢谢', '谢谢',
            '不用', '不用', '不用', '不用', '不用', '不用', '不用', '不用', '不用', '不用',
            // 常见表情和符号词（如果被分词）
            '哈哈', '嘿嘿', '呵呵', '嘻嘻', '嘿嘿', '哈哈', '呵呵', '嘻嘻',
            // 常见命令词（如果被分词）
            '水群', '总词', '水群总词' // 如果这个词本身没有意义，可以过滤
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
     * 处理消息列表，提取关键词（优化版）
     * @param {Array} messages - 消息列表，格式为 [{message: string, time: number}, ...]
     * @param {Object} options - 选项
     * @returns {Promise<Array>} 关键词列表，格式为 [{word: string, count: number}] 或 [{word: string, weight: number}]
     */
    async processMessages(messages, options = {}) {
        const {
            minLength = 2,
            minFrequency = 2,
            maxWords = 100,
            extractMethod = 'frequency' // 'frequency' 或 'tfidf' 或 'enhanced'
        } = options;

        // 提取所有消息文本，并过滤掉无效消息（包括特定昵称的消息）
        const texts = messages
            .filter(msg => this.isValidMessage(msg))
            .map(msg => msg.message || msg.text || '');

        if (texts.length === 0) {
            return [];
        }

        // 分词并统计词频
        const wordCount = new Map(); // 词频统计
        const docWordCount = new Map(); // 文档频率（用于 TF-IDF）：每个词出现在多少条消息中
        const wordLengths = new Map(); // 词长度统计（用于权重计算）
        let totalWords = 0; // 总词数（用于 TF 计算）

        for (const text of texts) {
            const words = this.tokenize(text, minLength);
            const uniqueWords = new Set(words);

            for (const word of words) {
                wordCount.set(word, (wordCount.get(word) || 0) + 1);
                totalWords++;
                // 记录词长度
                if (!wordLengths.has(word)) {
                    wordLengths.set(word, word.length);
                }
            }

            // 统计文档频率（用于 TF-IDF）
            for (const word of uniqueWords) {
                docWordCount.set(word, (docWordCount.get(word) || 0) + 1);
            }
        }

        // 过滤停用词和低频词
        const totalDocs = texts.length;
        const filteredWords = Array.from(wordCount.entries())
            .filter(([word, count]) => {
                // 基础过滤
                if (this.stopWords.has(word)) return false;
                if (count < minFrequency) return false;
                if (word.length < minLength) return false;
                
                // 获取文档频率
                const df = docWordCount.get(word) || 1;
                
                // 低价值词过滤
                if (this.isLowValueWord(word, count, totalDocs, df)) return false;
                
                // 过滤过于常见的词（出现在超过80%的消息中，且占比超过10%，可能是无意义的常用词）
                if (df / totalDocs > 0.8 && count / totalWords > 0.1) {
                    return false; // 出现在太多消息中，且占比太高，可能是无意义常用词
                }
                
                return true;
            });

        if (extractMethod === 'tfidf') {
            // TF-IDF 计算（修复版）
            const totalDocs = texts.length;
            const wordScores = filteredWords.map(([word, count]) => {
                // TF: 词频 / 总词数（修复：使用总词数而不是词种数）
                const tf = count / totalWords;
                
                // IDF: log(总文档数 / 包含该词的文档数 + 1)（加1避免除零）
                const df = docWordCount.get(word) || 1;
                const idf = Math.log((totalDocs + 1) / (df + 1));
                
                // TF-IDF = TF * IDF
                const weight = tf * idf;
                
                return { word, weight, count, df };
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
        } else if (extractMethod === 'enhanced') {
            // 增强模式：综合考虑词频、长度、多样性、重要性
            const totalDocs = texts.length;
            const wordScores = filteredWords.map(([word, count]) => {
                // 1. 词频权重（归一化）
                const freqWeight = count / Math.max(...Array.from(wordCount.values()));
                
                // 2. 长度权重（长词更有意义，但不要过长）
                const length = word.length;
                const lengthWeight = Math.min(length / 4, 1.2); // 4字词权重最高，超过4字也有限制
                
                // 3. 多样性权重（出现在更多不同消息中的词更有价值）
                const df = docWordCount.get(word) || 1;
                const diversityWeight = Math.log((df + 1) / 2) / Math.log(totalDocs / 2 + 1);
                
                // 4. TF-IDF 权重
                const tf = count / totalWords;
                const idf = Math.log((totalDocs + 1) / (df + 1));
                const tfidfWeight = tf * idf;
                
                // 5. 综合权重（可调整权重比例）
                const weight = (
                    freqWeight * 0.3 +      // 词频 30%
                    lengthWeight * 0.2 +    // 长度 20%
                    diversityWeight * 0.2 + // 多样性 20%
                    tfidfWeight * 10 * 0.3  // TF-IDF 30%（放大10倍以匹配其他权重范围）
                );
                
                return { word, weight, count, df, length };
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
            // 词频模式（优化版：考虑词长度和多样性）
            const totalDocs = texts.length;
            const wordList = filteredWords
                .map(([word, count]) => {
                    const df = docWordCount.get(word) || 1;
                    const length = word.length;
                    
                    // 计算增强分数（词频 + 长度奖励 + 多样性奖励）
                    const baseScore = count;
                    const lengthBonus = Math.min(length - 2, 2) * 0.1; // 长度奖励（最多+0.2）
                    const diversityBonus = (df / totalDocs) * 0.5; // 多样性奖励
                    const enhancedCount = baseScore * (1 + lengthBonus + diversityBonus);
                    
                    return { word, count: enhancedCount, originalCount: count, df, length };
                })
                .sort((a, b) => b.count - a.count)
                .slice(0, maxWords)
                .map(item => ({ word: item.word, count: Math.round(item.originalCount) })); // 返回原始词频用于显示

            return wordList;
        }
    }

    /**
     * 判断是否为低价值词（新增：过滤无意义的词）
     * @param {string} word - 词
     * @param {number} count - 词频
     * @param {number} totalDocs - 总文档数
     * @param {number} df - 文档频率（出现在多少条消息中）
     * @returns {boolean} 是否为低价值词
     */
    isLowValueWord(word, count, totalDocs, df) {
        // 过滤纯数字（除非是特殊数字或较长数字）
        if (/^\d+$/.test(word) && word.length <= 3) {
            return true;
        }
        
        // 过滤重复字符（如：哈哈哈、啊啊啊、hhhh）
        if (/^([\u4e00-\u9fa5a-zA-Z])\1{2,}$/.test(word)) {
            return true;
        }
        
        // 过滤单个字符重复（如：aa、11、哈哈）
        if (word.length === 2 && word[0] === word[1]) {
            return true;
        }
        
        return false;
    }

    /**
     * 分词（优化版：支持更灵活的中文分词）
     * @param {string} text - 文本
     * @param {number} minLength - 最小词长
     * @returns {Array<string>} 词列表
     */
    tokenize(text, minLength = 2) {
        const words = new Set(); // 使用 Set 避免重复
        
        // 移除标点符号和特殊字符，但保留空格用于分隔
        const cleaned = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ');
        
        // 优化：使用滑动窗口提取中文词汇（1-6字，更灵活）
        // 这样可以提取更多有意义的词组
        const chineseText = cleaned.replace(/[^\u4e00-\u9fa5]/g, '');
        for (let len = minLength; len <= Math.min(6, chineseText.length); len++) {
            for (let i = 0; i <= chineseText.length - len; i++) {
                const word = chineseText.substring(i, i + len);
                if (word.length >= minLength) {
                    words.add(word);
                }
            }
        }

        // 提取英文单词（2个字符以上）
        const englishWords = cleaned.match(/[a-zA-Z]{2,}/g) || [];
        englishWords.forEach(word => {
            if (word.length >= minLength) {
                words.add(word.toLowerCase()); // 统一转小写
            }
        });

        // 提取数字（3位以上，避免提取太多无意义的数字）
        const numbers = cleaned.match(/\d{3,}/g) || [];
        numbers.forEach(word => {
            if (word.length >= minLength) {
                words.add(word);
            }
        });

        return Array.from(words);
    }
}

export { TextProcessor };
export default TextProcessor;
