const PERIOD_DIMENSIONS = {
  daily: 'date',
  weekly: 'week',
  monthly: 'month',
  yearly: 'year'
}

export async function getGlobalPeriodRanking(dataService, period, periodKey, limit) {
  const dimension = PERIOD_DIMENSIONS[period]
  if (!dimension || !periodKey) return []

  const currentGroupIds = dataService.getCurrentGroupIdsForFilter()
  if (Array.isArray(currentGroupIds) && currentGroupIds.length === 0) return []

  const dbService = dataService.dbService
  const periodExpr = dbService._getTimeDimensionExpr(dimension, 'mgs.stat_hour')
  const nicknameExpr = dbService._getNicknameExpr('uas')
  const params = [periodKey]
  let groupFilter = ''

  if (Array.isArray(currentGroupIds) && currentGroupIds.length > 0) {
    const placeholders = currentGroupIds.map((_, index) => `$${index + 2}`).join(',')
    groupFilter = ` AND mgs.group_id IN (${placeholders})`
    params.push(...currentGroupIds)
  }

  const limitParam = params.length + 1
  const rows = await dbService.all(
    `SELECT
        mgs.user_id,
        MAX(${nicknameExpr}) as nickname,
        SUM(mgs.message_count) as message_count,
        SUM(mgs.word_count) as period_words,
        MAX(uas.continuous_days) as continuous_days,
        MAX(uas.last_speaking_time) as last_speaking_time
     FROM message_granular_stats mgs
     LEFT JOIN user_agg_stats uas
       ON mgs.group_id = uas.group_id AND mgs.user_id = uas.user_id
     WHERE ${periodExpr} = $1
       AND mgs.group_id NOT IN (SELECT group_id FROM archived_groups)
       ${groupFilter}
       AND (mgs.message_count > 0 OR mgs.word_count > 0)
     GROUP BY mgs.user_id
     ORDER BY SUM(mgs.message_count) DESC
     LIMIT $${limitParam}`,
    ...params,
    limit
  )

  return rows.map(row => ({
    user_id: row.user_id,
    nickname: row.nickname || row.user_id,
    count: parseInt(row.message_count || 0, 10),
    period_words: parseInt(row.period_words || 0, 10),
    continuous_days: parseInt(row.continuous_days || 0, 10),
    last_speaking_time: row.last_speaking_time || null
  }))
}
