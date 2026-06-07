function toInt(value) {
  const number = parseInt(value || 0, 10)
  return Number.isFinite(number) ? number : 0
}

function toPercent(count, total) {
  if (!total || total <= 0) return '0.0'
  return ((count / total) * 100).toFixed(1)
}

export async function getBackgroundPreviewData(dataService, userId) {
  const normalizedUserId = String(userId || '').trim()
  if (!normalizedUserId) {
    return {
      period: 'total',
      userId: '',
      nickname: '未知用户',
      rank: null,
      count: 0,
      periodWords: 0,
      percentage: '0.0',
      lastSpeakingTime: null,
      avatarUrl: ''
    }
  }

  const [rankData, globalStats, avatarUrl] = await Promise.all([
    dataService.getUserRankData(normalizedUserId, null, 'total', {}).catch(() => null),
    dataService.getGlobalStats(1, 1, { quiet: true }).catch(() => ({})),
    dataService.getUserAvatarUrl(normalizedUserId, null).catch(() => '')
  ])

  const count = toInt(rankData?.count)
  const totalMessages = toInt(globalStats?.totalMessages)

  return {
    period: 'total',
    userId: normalizedUserId,
    nickname: rankData?.nickname || normalizedUserId,
    rank: rankData?.rank || null,
    count,
    periodWords: toInt(rankData?.period_words),
    activeDays: toInt(rankData?.active_days),
    continuousDays: toInt(rankData?.continuous_days),
    percentage: toPercent(count, totalMessages),
    lastSpeakingTime: rankData?.last_speaking_time || null,
    totalMessages,
    avatarUrl
  }
}
