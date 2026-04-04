/**
 * 水群分析默认配置模板（独立拆分，便于维护）
 */
const topicPromptTemplate = `你是一个帮我进行群聊信息总结的助手,生成总结内容时,你需要严格遵守下面的几个准则:

请分析接下来提供的群聊记录,提取出所有主要话题。不要限制话题数量，但要保持有必要才作为一个话题。根据实际聊天内容提取所有最有意义的话题。

对于每个话题,请提供:
1. 话题名称 (突出主题内容,尽量简明扼要,控制在 10 字以内,话题名称中不要出现用户ID)
2. 主要参与者的用户ID (最多 5 人,按参与度排序)
3. 话题详细描述 (包含关键信息和结论)

注意事项:
- 对于比较有价值的点,稍微用一两句话详细讲讲,让读者能了解讨论的深度
- 对于其中的部分信息,你需要特意提到主题施加的主体是谁,即明确指出"谁做了什么"
- 在描述中提及用户时,必须使用 [用户ID] 的格式,例如 [123456789],不要使用昵称
- 对于每一条总结,尽量讲清楚前因后果,不要只列出结论
- 如果某个话题有明确的结论或共识,请在描述中体现
- 忽略无意义的闲聊、灌水、单纯的表情回复等
- 优先选择讨论深度较深、参与人数较多的话题
- 如果消息太少或没有明确话题,可以返回空数组 []

群聊记录格式: [HH:MM] [用户ID]: 消息内容

群聊记录:
{{formattedMessages}}

---

**重要：你必须只返回一个 JSON 数组，不要包含任何说明文字、代码块标记或其他内容。直接输出 JSON，从 [ 开始，以 ] 结束。**
**重要：contributors 数组和 detail 中提及用户时，必须使用用户ID（纯数字），detail 中使用 [用户ID] 格式！**

返回格式（直接输出，不要用 \`\`\`json 包裹）:
[
  {
    "topic": "话题名称",
    "contributors": ["123456789", "987654321", "111222333"],
    "detail": "话题的详细描述,包含讨论内容、关键信息和结论。注意：在描述中提及用户时,使用 [用户ID] 格式,例如 [123456789]。"
  },
  {
    "topic": "另一个话题",
    "contributors": ["参与者4的ID", "参与者5的ID"],
    "detail": "另一个话题的详细描述..."
  }
]`

const goldenQuotePromptTemplate = `你是一个群聊金句识别专家,负责从群聊记录中挑选出最有价值的语句。

请从以下群聊记录中选出最多 {{maxQuotes}} 条"群圣经"(金句),这些语句应该符合以下标准:
1. **有趣幽默**: 让人会心一笑的段子、梗、神回复
2. **富有哲理**: 发人深省、有深度的思考和观点
3. **震撼力强**: 出人意料、一针见血的评论
4. **情感共鸣**: 能引起大家共鸣的感慨或吐槽
5. **高度凝练**: 用简洁的语言表达深刻的含义

请注意:
- 优先选择完整、独立、有上下文的语句
- 避免选择需要太多背景才能理解的内容
- 排除无意义的闲聊、单纯的表情、命令等
- 每条金句要说明为什么选择它 (理由简洁,20字内)
- 如果实在没有符合标准的语句,可以返回空数组 []

群聊记录格式: [用户ID]: 消息内容

群聊记录:
{{formattedMessages}}

---

**重要：你必须只返回一个 JSON 数组，不要包含任何说明文字、代码块标记或其他内容。直接输出 JSON，从 [ 开始，以 ] 结束。**
**重要：sender 字段必须填写用户ID（纯数字），不要填写昵称！**

返回格式（直接输出，不要用 \`\`\`json 包裹）:
[
  {
    "quote": "金句内容",
    "sender": "用户ID（如 123456789，必须是纯数字）",
    "reason": "选择理由 (简短说明为什么这句话有价值)"
  },
  {
    "quote": "另一条金句",
    "sender": "另一个发言人的用户ID",
    "reason": "选择理由..."
  }
]`

const userTitlePromptTemplate = `你是一个群聊行为分析专家,负责基于用户的聊天行为模式为他们分配有趣的称号和 MBTI 人格类型。

请为以下用户分配创意称号和 MBTI 类型,最多选择 {{maxTitles}} 位最有特色的用户。

称号要求:
1. **有趣且贴切**: 称号应该幽默、有创意,同时准确反映用户的行为特征
2. **简洁明了**: 控制在 2-6 个字
3. **多样化**: 避免重复的称号模式
4. **正向友好**: 避免贬义或冒犯性的称号

常见称号参考:
- 话痨王、潜水员、夜猫子、早起鸟
- 表情包大师、段子手、哲学家
- 技术大佬、吃货、游戏王
- 氛围担当、话题终结者
- 沉默寡言、一鸣惊人

MBTI 类型:
- 根据用户的行为模式推测其性格类型 (INTJ, ENFP, ISTP 等 16 种)
- 消息多、互动多 → E (外向)
- 消息少、潜水多 → I (内向)
- 长文、深度讨论 → N (直觉)
- 简短、具体信息 → S (感觉)
- 理性、逻辑性强 → T (思考)
- 感性、情绪表达多 → F (情感)
- 有规律、固定时间 → J (判断)
- 随机、时间不定 → P (知觉)

用户行为数据:
{{userText}}

---

请选择最多 {{maxTitles}} 位最有特色的用户,为他们分配称号和 MBTI,并简要说明理由。

**重要：你必须只返回一个 JSON 数组，不要包含任何说明文字、代码块标记或其他内容。直接输出 JSON，从 [ 开始，以 ] 结束。**
**重要：user_id 字段必须填写用户ID（纯数字），不要填写昵称！**

返回格式（直接输出，不要用 \`\`\`json 包裹）:
[
  {
    "user_id": "用户ID（如 123456789，必须是纯数字）",
    "title": "创意称号",
    "mbti": "MBTI类型",
    "reason": "授予理由 (30字内,说明为什么给这个称号和MBTI)"
  },
  {
    "user_id": "另一个用户的用户ID",
    "title": "另一个称号",
    "mbti": "另一个MBTI",
    "reason": "授予理由..."
  }
]`

export const groupAnalysisTemplate = {
  // 总开关
  enabled: true,

  // 消息保留天数（Redis）
  retentionDays: 31,

  // AI 配置
  ai: {
    apiKey: '',
    model: 'gpt-4.1',
    baseURL: '',
    timeout: 60000,
    maxTokens: 20000,
    maxMessages: 1000,
    llm_timeout: 100,
    llm_retries: 2,
    llm_backoff: 2
  },

  // 高级分析配置
  analysis: {
    topic: {
      enabled: true,
      promptTemplate: topicPromptTemplate
    },
    goldenQuote: {
      enabled: true,
      max_golden_quotes: 5,
      min_quote_length: 5,
      max_quote_length: 100,
      promptTemplate: goldenQuotePromptTemplate
    },
    userTitle: {
      enabled: true,
      max_user_titles: 9,
      min_messages_for_title: 5,
      promptTemplate: userTitlePromptTemplate
    },
    activity: {
      enabled: true
    },
    min_messages_threshold: 20
  },

  // 统计配置
  statistics: {
    night_start_hour: 0,
    night_end_hour: 6
  },

  // 词云配置
  wordCloud: {
    maxWords: 100,
    minLength: 2,
    minFrequency: 2,
    filterStrength: 'standard',
    extractMethod: 'frequency',
    width: 1200,
    height: 800,
    backgroundColor: '#ffffff',
    render: {
      imgType: 'png',
      quality: 100
    }
  },

  // 消息收集配置
  messageCollection: {
    enabled: true,
    collectImages: true,
    collectFaces: true,
    collectLinks: true,
    collectVideos: true,
    collectAtRecords: true,
    maxMessageLength: 500,
    nicknameMode: 'nickname'
  },

  // 定时报告配置
  schedule: {
    enabled: false,
    whitelist: [],
    minMessages: 99,
    concurrency: 3,
    cooldownMinutes: 60,
    send: {
      mode: 'disabled',
      sendHour: 8,
      sendMinute: 0
    }
  },

  // 报告渲染配置
  summary: {
    render: {
      imgType: 'png',
      quality: 100
    }
  }
}
