/**
 * Guoba-Plugin 配置 Schemas
 * 定义所有配置项的 schema 结构
 */
export function getConfigSchemas() {
  return [
    {
      label: '全局功能开关',
      // 第一个分组标记开始，无需标记结束
      component: 'SOFT_GROUP_BEGIN'
    },
    {
      field: 'global.enableStatistics',
      label: '启用发言统计',
      bottomHelpMessage: '是否启用发言统计主功能（全局开关）',
      component: 'Switch'
    },
    {
      field: 'global.recordMessage',
      label: '开启消息记录',
      bottomHelpMessage: '是否开启消息记录（全局开关）',
      component: 'Switch'
    },
    {
      field: 'global.enableWordCount',
      label: '开启字数统计',
      bottomHelpMessage: '是否开启消息字数统计（全局开关）',
      component: 'Switch'
    },
    {
      field: 'global.debugLog',
      label: '开启调试日志',
      bottomHelpMessage: '是否开启调试日志',
      component: 'Switch'
    },
    {
      field: 'global.enableBackup',
      label: '启用数据备份',
      bottomHelpMessage: '是否启用数据备份功能',
      component: 'Switch'
    },
    {
      field: 'global.useOkMarker',
      label: '启用完成标记',
      bottomHelpMessage: '是否启用完成标记（用于大文件）',
      component: 'Switch'
    },
    {
      label: '显示配置',
      // 第二个分组标记开始
      component: 'SOFT_GROUP_BEGIN'
    },
    {
      field: 'display.displayCount',
      label: '显示排行数量',
      bottomHelpMessage: '显示的排行数量',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 1,
        max: 100,
        placeholder: '请输入显示排行数量'
      }
    },
    {
      field: 'display.globalStatsDisplayCount',
      label: '全局统计显示群组数量',
      bottomHelpMessage: '全局统计显示的群组数量',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 1,
        max: 50,
        placeholder: '请输入全局统计显示群组数量'
      }
    },
    {
      field: 'display.useForward',
      label: '使用转发消息',
      bottomHelpMessage: '是否使用转发消息展示排行',
      component: 'Switch'
    },
    {
      field: 'display.usePicture',
      label: '使用图片模式',
      bottomHelpMessage: '是否使用图片模式展示排行',
      component: 'Switch'
    },
    {
      label: '背景编辑器',
      // 第三个分组标记开始
      component: 'SOFT_GROUP_BEGIN'
    },
    {
      field: 'backgroundServer.host',
      label: '服务器主机地址',
      bottomHelpMessage: '服务器主机地址 (127.0.0.1 本地访问, 0.0.0.0 允许外部访问)',
      component: 'Input',
      required: true,
      componentProps: {
        placeholder: '请输入服务器主机地址'
      }
    },
    {
      field: 'backgroundServer.port',
      label: '服务器端口',
      helpMessage: '修改后需要重启才能生效',
      bottomHelpMessage: '服务器端口',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 1,
        max: 65535,
        placeholder: '请输入服务器端口'
      }
    },
    {
      field: 'backgroundServer.protocol',
      label: '协议类型',
      bottomHelpMessage: '协议类型 (http/https)',
      component: 'Input',
      required: true,
      componentProps: {
        placeholder: '请输入协议类型'
      }
    },
    {
      field: 'backgroundServer.domain',
      label: '域名配置',
      bottomHelpMessage: '域名配置 (用于生成编辑器链接，可以是域名或IP地址)',
      component: 'Input',
      required: true,
      componentProps: {
        placeholder: '请输入域名配置'
      }
    },
    {
      label: '数据库配置',
      // 第四个分组标记开始
      component: 'SOFT_GROUP_BEGIN'
    },
    {
      field: 'database.host',
      label: '数据库主机地址',
      helpMessage: '修改后需要重启才能生效',
      bottomHelpMessage: '数据库主机地址',
      component: 'Input',
      required: true,
      componentProps: {
        placeholder: '请输入数据库主机地址'
      }
    },
    {
      field: 'database.port',
      label: '数据库端口',
      helpMessage: '修改后需要重启才能生效',
      bottomHelpMessage: '数据库端口',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 1,
        max: 65535,
        placeholder: '请输入数据库端口'
      }
    },
    {
      field: 'database.database',
      label: '数据库名称',
      helpMessage: '修改后需要重启才能生效',
      bottomHelpMessage: '数据库名称',
      component: 'Input',
      required: true,
      componentProps: {
        placeholder: '请输入数据库名称'
      }
    },
    {
      field: 'database.user',
      label: '数据库用户名',
      helpMessage: '修改后需要重启才能生效',
      bottomHelpMessage: '数据库用户名',
      component: 'Input',
      required: true,
      componentProps: {
        placeholder: '请输入数据库用户名'
      }
    },
    {
      field: 'database.password',
      label: '数据库密码',
      helpMessage: '修改后需要重启才能生效',
      bottomHelpMessage: '数据库密码',
      component: 'InputPassword',
      required: true,
      componentProps: {
        placeholder: '请输入数据库密码'
      }
    },
    {
      field: 'database.pool.max',
      label: '最大连接数',
      helpMessage: '修改后需要重启才能生效',
      bottomHelpMessage: '连接池最大连接数',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 1,
        max: 100,
        placeholder: '请输入最大连接数'
      }
    },
    {
      field: 'database.pool.min',
      label: '最小连接数',
      helpMessage: '修改后需要重启才能生效',
      bottomHelpMessage: '连接池最小连接数',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 1,
        max: 100,
        placeholder: '请输入最小连接数'
      }
    },
    {
      field: 'database.pool.idleTimeoutMillis',
      label: '连接空闲超时',
      helpMessage: '修改后需要重启才能生效',
      bottomHelpMessage: '连接池空闲连接超时时间（毫秒）',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 1000,
        max: 300000,
        placeholder: '请输入连接空闲超时时间'
      }
    },
    {
      field: 'database.pool.connectionTimeoutMillis',
      label: '连接获取超时',
      helpMessage: '修改后需要重启才能生效',
      bottomHelpMessage: '连接池获取连接超时时间（毫秒）',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 1000,
        max: 10000,
        placeholder: '请输入连接获取超时时间'
      }
    },
    {
      field: 'database.ssl',
      label: '启用 SSL',
      helpMessage: '修改后需要重启才能生效',
      bottomHelpMessage: '是否启用 SSL',
      component: 'Switch'
    },
    {
      label: '消息统计配置',
      // 第五个分组标记开始
      component: 'SOFT_GROUP_BEGIN'
    },
    {
      field: 'message.onlyTextMessages',
      label: '仅统计文本消息',
      bottomHelpMessage: '是否只统计文本消息',
      component: 'Switch'
    },
    {
      field: 'message.countBotMessages',
      label: '统计机器人消息',
      bottomHelpMessage: '是否统计机器人消息',
      component: 'Switch'
    },
    {
      field: 'message.updateRankingOnEveryMessage',
      label: '每条消息后更新排行榜',
      helpMessage: '不建议开启，会影响性能',
      bottomHelpMessage: '是否在每条消息后更新排行榜（不建议开启）',
      component: 'Switch'
    },
    {
      label: '数据存储配置',
      // 第六个分组标记开始
      component: 'SOFT_GROUP_BEGIN'
    },
    {
      field: 'dataStorage.backupRetentionCount',
      label: '备份保留数量',
      bottomHelpMessage: '每个文件保留的备份数量',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 1,
        max: 100,
        placeholder: '请输入备份保留数量'
      }
    },
    {
      field: 'dataStorage.lockTimeout',
      label: '文件锁超时时间',
      bottomHelpMessage: '文件锁超时时间（毫秒）',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 1000,
        max: 60000,
        placeholder: '请输入文件锁超时时间'
      }
    },
    {
      field: 'dataStorage.lockExpiration',
      label: '锁过期时间',
      bottomHelpMessage: '锁过期时间（毫秒）',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 1000,
        max: 300000,
        placeholder: '请输入锁过期时间'
      }
    },
    {
      field: 'dataStorage.maxRetries',
      label: '最大重试次数',
      bottomHelpMessage: '操作失败时的最大重试次数',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 1,
        max: 10,
        placeholder: '请输入最大重试次数'
      }
    },
    {
      field: 'dataStorage.retryDelayBase',
      label: '重试延迟基数',
      bottomHelpMessage: '重试延迟基数（毫秒）',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 100,
        max: 10000,
        placeholder: '请输入重试延迟基数'
      }
    },
    {
      field: 'dataStorage.maxRetryDelay',
      label: '最大重试延迟',
      bottomHelpMessage: '最大重试延迟（毫秒）',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 1000,
        max: 60000,
        placeholder: '请输入最大重试延迟'
      }
    },
    {
      label: '成就系统配置',
      // 第七个分组标记开始
      component: 'SOFT_GROUP_BEGIN'
    },
    {
      field: 'achievements.enabled',
      label: '启用成就系统',
      bottomHelpMessage: '是否启用成就系统',
      component: 'Switch'
    },
    {
      field: 'achievements.checkInterval',
      label: '成就检查频率',
      bottomHelpMessage: '成就检查频率（毫秒，0表示每次消息都检查）',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 0,
        max: 3600000,
        placeholder: '请输入成就检查频率（毫秒）'
      }
    },
    {
      field: 'achievements.rankingDisplayCount',
      label: '成就排行榜显示数量',
      bottomHelpMessage: '成就排行榜显示数量',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 1,
        max: 50,
        placeholder: '请输入成就排行榜显示数量'
      }
    },
    {
      component: 'Divider',
      label: '系统默认成就',
      componentProps: {
        orientation: 'left',
        plain: true
      }
    },
    {
      field: 'defaultAchievements',
      label: '系统默认成就（只读）',
      bottomHelpMessage: '系统预定义的27个成就，不可修改',
      component: 'GSubForm',
      componentProps: {
        multiple: true,
        disabled: true,
        schemas: getAchievementSchemas(true)
      }
    },
    {
      component: 'Divider',
      label: '用户自定义成就',
      componentProps: {
        orientation: 'left',
        plain: true
      }
    },
    {
      field: 'customAchievements',
      label: '用户自定义成就',
      bottomHelpMessage: '添加自定义成就，支持所有成就类型',
      component: 'GSubForm',
      componentProps: {
        multiple: true,
        schemas: getAchievementSchemas(false)
      }
    },
    {
      field: 'groupAchievements',
      label: '群专属成就',
      bottomHelpMessage: '为特定群组添加专属成就，仅在该群生效',
      component: 'GSubForm',
      componentProps: {
        multiple: true,
        schemas: getGroupAchievementSchemas()
      }
    }
  ];
}

/**
 * 获取成就 Schema 通用配置
 * @param {boolean} disabled 是否禁用（用于系统默认成就）
 * @returns {Array} Schema 数组
 */
function getAchievementSchemas(disabled = false) {
  return [
    {
      field: 'id',
      label: '成就ID',
      component: 'Input',
      required: true,
      componentProps: {
        placeholder: disabled ? '例如：message_100' : '例如：custom_message_100',
        disabled: disabled
      }
    },
    {
      field: 'name',
      label: '成就名称',
      component: 'Input',
      required: true,
      componentProps: {
        placeholder: disabled ? '例如：初来乍到' : '例如：话唠新人',
        disabled: disabled
      }
    },
    {
      field: 'description',
      label: '成就描述',
      component: 'InputTextArea',
      required: true,
      componentProps: {
        rows: 2,
        placeholder: disabled ? '成就描述' : '成就的详细描述',
        disabled: disabled,
        showCount: !disabled,
        maxLength: disabled ? undefined : 200
      }
    },
    {
      field: 'rarity',
      label: '稀有度',
      component: 'Select',
      required: true,
      componentProps: {
        placeholder: disabled ? '稀有度' : '请选择稀有度',
        disabled: disabled,
        options: [
          { label: '普通', value: 'common' },
          { label: '不普通', value: 'uncommon' },
          { label: '稀有', value: 'rare' },
          { label: '史诗', value: 'epic' },
          { label: '传说', value: 'legendary' },
          { label: '神话', value: 'mythic' },
          { label: '节日', value: 'festival' }
        ]
      }
    },
    {
      field: 'category',
      label: '分类',
      component: 'Select',
      required: true,
      componentProps: {
        placeholder: disabled ? '分类' : '请选择分类',
        disabled: disabled,
        options: [
          { label: '基础', value: 'basic' },
          { label: '发言数', value: 'count' },
          { label: '字数', value: 'words' },
          { label: '活跃', value: 'active' },
          { label: '每日', value: 'daily' },
          { label: '连续', value: 'streak' },
          { label: '时段', value: 'time' }
        ]
      }
    },
    {
      field: 'conditionType',
      label: '条件类型',
      component: 'Select',
      required: true,
      componentProps: {
        placeholder: disabled ? '条件类型' : '请选择条件类型',
        disabled: disabled,
        options: [
          { label: '首次发言', value: 'first_message' },
          { label: '累计发言数', value: 'total_count' },
          { label: '单日发言数', value: 'daily_count' },
          { label: '本周发言数', value: 'weekly_count' },
          { label: '本月发言数', value: 'monthly_count' },
          { label: '累计字数', value: 'total_words' },
          { label: '单日字数', value: 'daily_words' },
          { label: '本周字数', value: 'weekly_words' },
          { label: '本月字数', value: 'monthly_words' },
          { label: '连续天数', value: 'daily_streak' },
          { label: '最长连续天数', value: 'max_continuous_days' },
          { label: '活跃天数', value: 'active_days' },
          { label: '夜间发言', value: 'night_time' },
          { label: '早晨发言', value: 'morning_time' },
          { label: '文本包含', value: 'text_contains' },
          { label: '文本包含次数', value: 'text_contains_times' },
          { label: '时间窗口', value: 'time_window' }
        ]
      }
    },
    {
      field: 'conditionValue',
      label: '条件值',
      component: 'Input',
      componentProps: {
        placeholder: disabled ? '条件值' : '数字/文本/开始时间',
        disabled: disabled
      },
      bottomHelpMessage: disabled ? undefined : '数字类型填数字，文本包含填关键词，时间窗口填开始时间'
    },
    {
      field: 'conditionTimes',
      label: '触发次数',
      component: 'InputNumber',
      componentProps: {
        min: 1,
        placeholder: '例如：3',
        disabled: disabled
      },
      bottomHelpMessage: disabled ? undefined : '仅用于"文本包含次数"类型，表示需要触发多少次'
    },
    {
      field: 'conditionEnd',
      label: '结束时间',
      component: 'Input',
      componentProps: {
        placeholder: '例如：2024-12-31T23:59:59',
        disabled: disabled
      },
      bottomHelpMessage: disabled ? undefined : '仅用于"时间窗口"类型，ISO格式日期'
    }
  ];
}

/**
 * 获取群专属成就 Schema
 * @returns {Array} Schema 数组
 */
function getGroupAchievementSchemas() {
  return [
    {
      field: 'groupId',
      label: '群号',
      component: 'GSelectGroup',
      required: true,
      componentProps: {
        placeholder: '点击选择群聊'
      }
    },
    ...getAchievementSchemas(false)
  ];
}

