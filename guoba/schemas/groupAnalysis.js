export function getGroupAnalysisSchemas() {
  return [
    {
      label: '水群分析配置',
      component: 'SOFT_GROUP_BEGIN'
    },
    {
      field: 'groupAnalysis.enabled',
      label: '启用水群分析',
      bottomHelpMessage: '水群分析总开关（词云不依赖 AI 配置）',
      component: 'Switch'
    },
    {
      field: 'groupAnalysis.retentionDays',
      label: '消息保留天数',
      bottomHelpMessage: 'Redis 中历史消息保留天数',
      component: 'InputNumber',
      componentProps: {
        min: 1,
        max: 90
      }
    },
    {
      label: '消息收集',
      component: 'Divider'
    },
    {
      field: 'groupAnalysis.messageCollection.enabled',
      label: '启用消息收集',
      component: 'Switch'
    },
    {
      field: 'groupAnalysis.messageCollection.collectImages',
      label: '收集图片',
      component: 'Switch'
    },
    {
      field: 'groupAnalysis.messageCollection.collectFaces',
      label: '收集表情',
      component: 'Switch'
    },
    {
      field: 'groupAnalysis.messageCollection.collectLinks',
      label: '收集链接分享',
      component: 'Switch'
    },
    {
      field: 'groupAnalysis.messageCollection.collectVideos',
      label: '收集视频',
      component: 'Switch'
    },
    {
      field: 'groupAnalysis.messageCollection.collectAtRecords',
      label: '收集艾特记录',
      component: 'Switch'
    },
    {
      field: 'groupAnalysis.messageCollection.maxMessageLength',
      label: '最大消息长度',
      component: 'InputNumber',
      componentProps: {
        min: 50,
        max: 5000
      }
    },
    {
      field: 'groupAnalysis.messageCollection.nicknameMode',
      label: '昵称显示模式',
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '群名片优先', value: 'card' },
          { label: 'QQ昵称', value: 'nickname' }
        ]
      }
    },
    {
      label: 'AI 接口',
      component: 'Divider'
    },
    {
      field: 'groupAnalysis.ai.apiKey',
      label: 'API Key',
      component: 'InputPassword'
    },
    {
      field: 'groupAnalysis.ai.model',
      label: '模型名称',
      component: 'Input',
      componentProps: {
        placeholder: '例如 gpt-5.2 / gpt-4.1'
      }
    },
    {
      field: 'groupAnalysis.ai.baseURL',
      label: 'API 地址',
      component: 'Input',
      componentProps: {
        placeholder: '例如 https://api.openai.com/v1'
      }
    },
    {
      field: 'groupAnalysis.ai.timeout',
      label: '请求超时（毫秒）',
      component: 'InputNumber',
      componentProps: {
        min: 10000,
        max: 300000
      }
    },
    {
      field: 'groupAnalysis.ai.maxTokens',
      label: '最大 Token 数',
      component: 'InputNumber',
      componentProps: {
        min: 1000,
        max: 100000
      }
    },
    {
      field: 'groupAnalysis.ai.maxMessages',
      label: '最大消息处理数',
      component: 'InputNumber',
      componentProps: {
        min: 100,
        max: 10000
      }
    },
    {
      field: 'groupAnalysis.ai.llm_timeout',
      label: 'LLM 超时（秒）',
      component: 'InputNumber',
      componentProps: {
        min: 10,
        max: 600
      }
    },
    {
      field: 'groupAnalysis.ai.llm_retries',
      label: 'LLM 重试次数',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        max: 10
      }
    },
    {
      field: 'groupAnalysis.ai.llm_backoff',
      label: '重试退避（秒）',
      component: 'InputNumber',
      componentProps: {
        min: 1,
        max: 60
      }
    },
    {
      label: '报告与分析',
      component: 'Divider'
    },
    {
      field: 'groupAnalysis.summary.render.imgType',
      label: '报告图片格式',
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: 'PNG（无损）', value: 'png' },
          { label: 'JPEG（压缩）', value: 'jpeg' }
        ]
      }
    },
    {
      field: 'groupAnalysis.summary.render.quality',
      label: '报告 JPEG 质量',
      component: 'InputNumber',
      componentProps: {
        min: 1,
        max: 100
      }
    },
    {
      field: 'groupAnalysis.analysis.topic.enabled',
      label: '启用话题分析',
      component: 'Switch'
    },
    {
      field: 'groupAnalysis.analysis.goldenQuote.enabled',
      label: '启用金句提取',
      component: 'Switch'
    },
    {
      field: 'groupAnalysis.analysis.goldenQuote.max_golden_quotes',
      label: '最多提取金句数',
      component: 'InputNumber',
      componentProps: {
        min: 1,
        max: 20
      }
    },
    {
      field: 'groupAnalysis.analysis.userTitle.enabled',
      label: '启用用户称号',
      component: 'Switch'
    },
    {
      field: 'groupAnalysis.analysis.userTitle.max_user_titles',
      label: '最多分配称号数',
      component: 'InputNumber',
      componentProps: {
        min: 1,
        max: 50
      }
    },
    {
      label: 'AI 提示词模板（高级）',
      component: 'Divider'
    },
    {
      field: 'groupAnalysis.analysis.topic.promptTemplate',
      label: '话题分析提示词模板',
      bottomHelpMessage: '支持变量：{{formattedMessages}}。建议在 data/config/group-analysis.json 中编辑多行内容。',
      component: 'InputTextArea',
      componentProps: {
        rows: 12,
        autoSize: {
          minRows: 8,
          maxRows: 24
        }
      }
    },
    {
      field: 'groupAnalysis.analysis.goldenQuote.promptTemplate',
      label: '金句提取提示词模板',
      bottomHelpMessage: '支持变量：{{formattedMessages}}、{{maxQuotes}}。建议在配置文件中多行编辑。',
      component: 'InputTextArea',
      componentProps: {
        rows: 12,
        autoSize: {
          minRows: 8,
          maxRows: 24
        }
      }
    },
    {
      field: 'groupAnalysis.analysis.userTitle.promptTemplate',
      label: '用户称号提示词模板',
      bottomHelpMessage: '支持变量：{{userText}}、{{maxTitles}}。建议在配置文件中多行编辑。',
      component: 'InputTextArea',
      componentProps: {
        rows: 12,
        autoSize: {
          minRows: 8,
          maxRows: 24
        }
      }
    },
    {
      field: 'groupAnalysis.analysis.activity.enabled',
      label: '启用活跃度图表',
      component: 'Switch'
    },
    {
      field: 'groupAnalysis.analysis.min_messages_threshold',
      label: '最少消息阈值',
      component: 'InputNumber',
      componentProps: {
        min: 1,
        max: 500
      }
    },
    {
      field: 'groupAnalysis.statistics.night_start_hour',
      label: '夜间开始小时',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        max: 23
      }
    },
    {
      field: 'groupAnalysis.statistics.night_end_hour',
      label: '夜间结束小时',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        max: 23
      }
    },
    {
      label: '词云渲染',
      component: 'Divider'
    },
    {
      field: 'groupAnalysis.wordCloud.maxWords',
      label: '最多显示词数',
      component: 'InputNumber',
      componentProps: {
        min: 10,
        max: 500
      }
    },
    {
      field: 'groupAnalysis.wordCloud.minLength',
      label: '最短词长度',
      component: 'InputNumber',
      componentProps: {
        min: 1,
        max: 10
      }
    },
    {
      field: 'groupAnalysis.wordCloud.minFrequency',
      label: '最小词频',
      component: 'InputNumber',
      componentProps: {
        min: 1,
        max: 100
      }
    },
    {
      field: 'groupAnalysis.wordCloud.filterStrength',
      label: '词性过滤强度',
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '宽松', value: 'loose' },
          { label: '标准', value: 'standard' },
          { label: '严格', value: 'strict' }
        ]
      }
    },
    {
      field: 'groupAnalysis.wordCloud.extractMethod',
      label: '关键词提取方式',
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '词频统计', value: 'frequency' },
          { label: 'TF-IDF', value: 'tfidf' }
        ]
      }
    },
    {
      field: 'groupAnalysis.wordCloud.width',
      label: '画布宽度',
      component: 'InputNumber',
      componentProps: {
        min: 400,
        max: 2400
      }
    },
    {
      field: 'groupAnalysis.wordCloud.height',
      label: '画布高度',
      component: 'InputNumber',
      componentProps: {
        min: 300,
        max: 1800
      }
    },
    {
      field: 'groupAnalysis.wordCloud.backgroundColor',
      label: '背景颜色',
      component: 'Input'
    },
    {
      field: 'groupAnalysis.wordCloud.render.imgType',
      label: '词云图片格式',
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: 'PNG（无损）', value: 'png' },
          { label: 'JPEG（压缩）', value: 'jpeg' }
        ]
      }
    },
    {
      field: 'groupAnalysis.wordCloud.render.quality',
      label: '词云 JPEG 质量',
      component: 'InputNumber',
      componentProps: {
        min: 1,
        max: 100
      }
    },
    {
      label: '定时任务',
      component: 'Divider'
    },
    {
      field: 'groupAnalysis.schedule.enabled',
      label: '启用定时分析',
      component: 'Switch'
    },
    {
      field: 'groupAnalysis.schedule.whitelist',
      label: '白名单群列表',
      component: 'GSelectGroup'
    },
    {
      field: 'groupAnalysis.schedule.minMessages',
      label: '最小消息阈值',
      component: 'InputNumber',
      componentProps: {
        min: 1,
        max: 1000
      }
    },
    {
      field: 'groupAnalysis.schedule.concurrency',
      label: '并发数',
      component: 'InputNumber',
      componentProps: {
        min: 1,
        max: 10
      }
    },
    {
      field: 'groupAnalysis.schedule.cooldownMinutes',
      label: '冷却时长（分钟）',
      component: 'InputNumber',
      componentProps: {
        min: 1,
        max: 120
      }
    },
    {
      field: 'groupAnalysis.schedule.send.mode',
      label: '发送模式',
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '仅生成报告', value: 'disabled' },
          { label: '立即发送', value: 'immediate' },
          { label: '定时发送', value: 'scheduled' }
        ]
      }
    },
    {
      field: 'groupAnalysis.schedule.send.sendHour',
      label: '定时发送小时',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        max: 23
      }
    },
    {
      field: 'groupAnalysis.schedule.send.sendMinute',
      label: '定时发送分钟',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        max: 59
      }
    }
  ]
}
