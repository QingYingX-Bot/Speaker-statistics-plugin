export function getDisplaySchemas() {
  return [
    {
      label: '显示配置',
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
    }
  ]
}
