export function getStorageSchemas() {
  return [
    {
      label: '存储配置',
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
