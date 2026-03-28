export function getArchivedGroupsSchemas() {
  return [
    {
      label: '归档群配置',
      component: 'SOFT_GROUP_BEGIN'
    },
    {
      field: 'archivedGroups.cleanup.enabled',
      label: '启用自动清理',
      bottomHelpMessage: '是否启用归档群自动清理任务',
      component: 'Switch'
    },
    {
      field: 'archivedGroups.cleanup.scheduleHour',
      label: '清理小时',
      bottomHelpMessage: '每天清理任务执行小时（0-23）',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 0,
        max: 23
      }
    },
    {
      field: 'archivedGroups.cleanup.scheduleMinute',
      label: '清理分钟',
      bottomHelpMessage: '每天清理任务执行分钟（0-59）',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 0,
        max: 59
      }
    },
    {
      field: 'archivedGroups.cleanup.intervalHours',
      label: '执行间隔（小时）',
      bottomHelpMessage: '清理任务执行间隔，单位小时',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 1,
        max: 168
      }
    },
    {
      field: 'archivedGroups.cleanup.retentionDays',
      label: '保留天数',
      bottomHelpMessage: '归档群超过该天数且无恢复发言将被永久清理',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 1,
        max: 3650
      }
    }
  ]
}
