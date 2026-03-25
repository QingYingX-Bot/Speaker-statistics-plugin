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
      field: 'database.type',
      label: '数据库类型',
      helpMessage: '修改后需要重启才能生效',
      bottomHelpMessage: '选择数据库类型：PostgreSQL（生产环境推荐）或 SQLite（小型部署推荐）',
      component: 'Select',
      required: true,
      componentProps: {
        options: [
          { label: 'PostgreSQL', value: 'postgresql' },
          { label: 'SQLite', value: 'sqlite' }
        ],
        placeholder: '请选择数据库类型'
      }
    },
    {
      field: 'database.path',
      label: 'SQLite 数据库路径',
      helpMessage: '修改后需要重启才能生效（仅 SQLite 需要）',
      bottomHelpMessage: 'SQLite 数据库文件路径。可直接写文件名（如 speech_statistics_db.db），会自动放在插件 data 目录下；也可写相对路径或绝对路径。留空则使用默认：speech_statistics_db.db。不会自动沿用历史库 speech_statistics.db，如需使用请手动配置 database.path。',
      component: 'Input',
      required: false,
      componentProps: {
        placeholder: '留空使用默认：speech_statistics_db.db'
      }
    },
    {
      field: 'database.host',
      label: '数据库主机地址',
      helpMessage: '修改后需要重启才能生效（仅 PostgreSQL 需要）',
      bottomHelpMessage: 'PostgreSQL 数据库主机地址',
      component: 'Input',
      required: false,
      componentProps: {
        placeholder: '请输入数据库主机地址'
      }
    },
    {
      field: 'database.port',
      label: '数据库端口',
      helpMessage: '修改后需要重启才能生效（仅 PostgreSQL 需要）',
      bottomHelpMessage: 'PostgreSQL 数据库端口',
      component: 'InputNumber',
      required: false,
      componentProps: {
        min: 1,
        max: 65535,
        placeholder: '请输入数据库端口'
      }
    },
    {
      field: 'database.database',
      label: '数据库名称',
      helpMessage: '修改后需要重启才能生效（仅 PostgreSQL 需要）',
      bottomHelpMessage: 'PostgreSQL 数据库名称',
      component: 'Input',
      required: false,
      componentProps: {
        placeholder: '请输入数据库名称'
      }
    },
    {
      field: 'database.user',
      label: '数据库用户名',
      helpMessage: '修改后需要重启才能生效（仅 PostgreSQL 需要）',
      bottomHelpMessage: 'PostgreSQL 数据库用户名',
      component: 'Input',
      required: false,
      componentProps: {
        placeholder: '请输入数据库用户名'
      }
    },
    {
      field: 'database.password',
      label: '数据库密码',
      helpMessage: '修改后需要重启才能生效（仅 PostgreSQL 需要）',
      bottomHelpMessage: 'PostgreSQL 数据库密码',
      component: 'InputPassword',
      required: false,
      componentProps: {
        placeholder: '请输入数据库密码'
      }
    },
    {
      field: 'database.pool.max',
      label: '最大连接数',
      helpMessage: '修改后需要重启才能生效（仅 PostgreSQL 需要）',
      bottomHelpMessage: 'PostgreSQL 连接池最大连接数',
      component: 'InputNumber',
      required: false,
      componentProps: {
        min: 1,
        max: 100,
        placeholder: '请输入最大连接数'
      }
    },
    {
      field: 'database.pool.min',
      label: '最小连接数',
      helpMessage: '修改后需要重启才能生效（仅 PostgreSQL 需要）',
      bottomHelpMessage: 'PostgreSQL 连接池最小连接数',
      component: 'InputNumber',
      required: false,
      componentProps: {
        min: 1,
        max: 100,
        placeholder: '请输入最小连接数'
      }
    },
    {
      field: 'database.pool.idleTimeoutMillis',
      label: '连接空闲超时',
      helpMessage: '修改后需要重启才能生效（仅 PostgreSQL 需要）',
      bottomHelpMessage: 'PostgreSQL 连接池空闲连接超时时间（毫秒）',
      component: 'InputNumber',
      required: false,
      componentProps: {
        min: 1000,
        max: 300000,
        placeholder: '请输入连接空闲超时时间'
      }
    },
    {
      field: 'database.pool.connectionTimeoutMillis',
      label: '连接获取超时',
      helpMessage: '修改后需要重启才能生效（仅 PostgreSQL 需要）',
      bottomHelpMessage: 'PostgreSQL 连接池获取连接超时时间（毫秒）',
      component: 'InputNumber',
      required: false,
      componentProps: {
        min: 1000,
        max: 10000,
        placeholder: '请输入连接获取超时时间'
      }
    },
    {
      field: 'database.ssl',
      label: '启用 SSL',
      helpMessage: '修改后需要重启才能生效（仅 PostgreSQL 需要）',
      bottomHelpMessage: 'PostgreSQL 是否启用 SSL',
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
    }
  ]
}
