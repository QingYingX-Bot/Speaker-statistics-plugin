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
      field: 'web.queryLog',
      label: '网页查询日志',
      bottomHelpMessage: '开启后，网页访问概览和群组列表会输出全局统计计算日志',
      component: 'Switch'
    }
  ]
}
