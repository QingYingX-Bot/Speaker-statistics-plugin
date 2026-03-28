/**
 * 水群分析默认配置模板（独立拆分，便于维护）
 */
export const groupAnalysisTemplate = {
  // 总开关
  enabled: true,

  // 消息保留天数（Redis）
  retentionDays: 7,

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
      enabled: true
    },
    goldenQuote: {
      enabled: true,
      max_golden_quotes: 5,
      min_quote_length: 5,
      max_quote_length: 100
    },
    userTitle: {
      enabled: true,
      max_user_titles: 9,
      min_messages_for_title: 5
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
