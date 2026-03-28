export function getDatabaseSchemas() {
  return [
    {
      label: '数据库配置',
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
      bottomHelpMessage: 'SQLite 数据库文件路径。可直接写文件名（如 speech_statistics_db.db），会自动放在插件 data 目录下；也可写相对路径或绝对路径。留空则使用默认：speech_statistics_db.db。（对应 data/config/database.json）',
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
    }
  ]
}
