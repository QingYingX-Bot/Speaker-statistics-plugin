export function getWebSchemas() {
  return [
    {
      label: 'Web 管理端',
      component: 'SOFT_GROUP_BEGIN'
    },
    {
      field: 'web.enabled',
      label: '启用 Web 管理端',
      bottomHelpMessage: '启用后会启动独立 HTTP 服务，提供静态管理页面与只读 API',
      component: 'Switch'
    },
    {
      field: 'web.host',
      label: '监听地址',
      bottomHelpMessage: '默认仅监听本机。需要局域网访问可改为 0.0.0.0，并建议使用反代鉴权',
      component: 'Input',
      componentProps: {
        placeholder: '127.0.0.1'
      }
    },
    {
      field: 'web.port',
      label: '监听端口',
      bottomHelpMessage: 'Web 管理端独立端口，修改后需重启 Yunzai 生效',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 1,
        max: 65535,
        placeholder: '2655'
      }
    },
    {
      field: 'web.basePath',
      label: '页面访问路径',
      bottomHelpMessage: '管理端页面路径，修改后需重启 Yunzai 生效',
      component: 'Input',
      componentProps: {
        placeholder: '/'
      }
    },
    {
      field: 'web.publicUrl',
      label: '完整访问地址',
      bottomHelpMessage: '可选。留空时自动使用监听地址和端口拼接页面路径，例如 http://localhost:2655/',
      component: 'Input',
      componentProps: {
        placeholder: 'http://localhost:2655/'
      }
    },
    {
      field: 'web.apiBasePath',
      label: 'API 访问路径',
      bottomHelpMessage: '管理端 API 路径，修改后需重启 Yunzai 生效',
      component: 'Input',
      componentProps: {
        placeholder: '/api'
      }
    },
    {
      field: 'web.localOnly',
      label: '仅允许本机访问',
      bottomHelpMessage: '建议保持开启；公网访问请使用反代、HTTPS 和访问控制',
      component: 'Switch'
    },
    {
      field: 'web.allowExternalManageAccess',
      label: '允许公网访问管理端',
      bottomHelpMessage: '开启后，公网可访问普通管理端页面与统计 API；关闭时公网仅开放背景 token 设置页面，局域网 IP 仍可访问管理端',
      component: 'Switch'
    },
    {
      field: 'web.queryLog',
      label: '网页查询日志',
      bottomHelpMessage: '开启后，网页访问概览和群组列表会输出全局统计计算日志',
      component: 'Switch'
    },
    {
      field: 'web.accessLog',
      label: '网页访问日志',
      bottomHelpMessage: '开启后，记录管理端页面访问、背景设置入口、上传、删除和访问拒绝日志',
      component: 'Switch'
    },
    {
      label: '背景编辑器',
      component: 'SOFT_GROUP_BEGIN'
    },
    {
      field: 'web.backgroundEditor.enabled',
      label: '启用背景编辑器',
      bottomHelpMessage: '启用后，用户可通过私聊生成的短期链接设置排行榜个人背景',
      component: 'Switch'
    },
    {
      field: 'web.backgroundEditor.tokenTtlMinutes',
      label: '背景链接有效期',
      bottomHelpMessage: '单位：分钟。用户重新生成链接时，旧链接会失效',
      component: 'InputNumber',
      componentProps: {
        min: 1,
        max: 1440,
        placeholder: '30'
      }
    },
    {
      field: 'web.backgroundEditor.maxImageMB',
      label: '背景图片大小限制',
      bottomHelpMessage: '单位：MB。图片会在网页端裁剪为排行榜背景比例后保存',
      component: 'InputNumber',
      componentProps: {
        min: 1,
        max: 20,
        placeholder: '2'
      }
    }
  ]
}
