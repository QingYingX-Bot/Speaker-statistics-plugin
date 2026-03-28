export function getGlobalSchemas() {
  return [
    {
      label: '全局配置',
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
    }
  ]
}
