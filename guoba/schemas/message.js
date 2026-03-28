export function getMessageSchemas() {
  return [
    {
      label: '消息配置',
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
    }
  ]
}
