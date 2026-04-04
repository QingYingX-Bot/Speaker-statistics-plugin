import { DataService } from '../../core/DataService.js'
import { globalConfig } from '../../core/ConfigManager.js'
import { CommonUtils } from '../../core/utils/CommonUtils.js'
import { CommandWrapper } from '../../core/utils/CommandWrapper.js'
import { UserParser } from '../../core/utils/UserParser.js'
import { TimeUtils } from '../../core/utils/TimeUtils.js'
import { ImageGenerator } from '../../core/render/ImageGenerator.js'
import { getMessageCollector } from '../../core/services/index.js'
import { segment } from 'oicq'
import common from '../../../../lib/common/common.js'

/**
 * 用户查询命令处理类
 */
class UserCommands {
  constructor(dataService = null, imageGenerator = null) {
    this.dataService = dataService || new DataService()
    this.imageGenerator = imageGenerator || new ImageGenerator(this.dataService)
  }

  /**
   * 格式化图片路径为 segment 格式
   * @param {string} imagePath 图片路径
   * @returns {Object} segment 图片对象
   */
  formatImageSegment(base64) {
    return segment.image(`base64://${base64}`)
  }

  /**
   * 获取命令规则
   */
  static getRules() {
    return [
      {
        reg: '^#水群查询(\\s+@.*)?$',
        fnc: 'queryUserStats'
      },
      {
        reg: '^#水群查询群列表(\\s+@.*)?$',
        fnc: 'listUserGroups'
      }
    ]
  }

  createEmptyTypeBucket() {
    return {
      textMessages: 0,
      replyMessages: 0,
      atMentions: 0,
      emojis: 0,
      images: 0,
      links: 0,
      videos: 0,
      mediaMessages: 0
    }
  }

  getPeriodOrder() {
    return [
      { key: 'hour', label: '时' },
      { key: 'day', label: '日' },
      { key: 'week', label: '周' },
      { key: 'month', label: '月' },
      { key: 'year', label: '年' },
      { key: 'total', label: '总' }
    ]
  }

  createEmptyPeriodStats() {
    const result = {}
    for (const period of this.getPeriodOrder()) {
      result[period.key] = { count: 0, words: 0 }
    }
    return result
  }

  createTypePeriods() {
    const periods = {}
    for (const period of this.getPeriodOrder()) {
      periods[period.key] = this.createEmptyTypeBucket()
    }
    return periods
  }

  createEmptyTypeStats(note = '') {
    const periods = this.createTypePeriods()
    return {
      available: false,
      note,
      periods,
      hour: periods.hour,
      day: periods.day,
      week: periods.week,
      month: periods.month,
      year: periods.year,
      total: periods.total,
      today: periods.day
    }
  }

  toUTC8DateFromUnix(timeSeconds) {
    const raw = Number(timeSeconds)
    if (!Number.isFinite(raw) || raw <= 0) return null
    const localDate = new Date(raw * 1000)
    if (Number.isNaN(localDate.getTime())) return null

    const utc8Offset = 8 * 60 * 60 * 1000
    return new Date(localDate.getTime() + (localDate.getTimezoneOffset() * 60 * 1000) + utc8Offset)
  }

  getDateTimeKey(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
    return TimeUtils.formatDateTime(date)
  }

  getPeriodKeysByDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
    const dayKey = TimeUtils.formatDate(date)
    return {
      hourKey: `${dayKey} ${TimeUtils.padZero(date.getHours())}`,
      dayKey,
      weekKey: TimeUtils.getWeekNumber(date),
      monthKey: TimeUtils.getMonthString(date),
      yearKey: String(date.getFullYear())
    }
  }

  getCurrentPeriodKeys() {
    return this.getPeriodKeysByDate(TimeUtils.getUTC8Date())
  }

  getCurrentPeriodRanges() {
    const now = TimeUtils.getUTC8Date()

    const hourStart = new Date(now)
    hourStart.setMinutes(0, 0, 0)
    const hourEnd = new Date(hourStart)
    hourEnd.setHours(hourEnd.getHours() + 1)

    const dayStart = new Date(now)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const weekStart = new Date(dayStart)
    const dayOfWeek = weekStart.getDay()
    const offset = dayOfWeek === 0 ? 6 : (dayOfWeek - 1)
    weekStart.setDate(weekStart.getDate() - offset)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const monthStart = new Date(dayStart)
    monthStart.setDate(1)
    const monthEnd = new Date(monthStart)
    monthEnd.setMonth(monthEnd.getMonth() + 1)

    const yearStart = new Date(dayStart)
    yearStart.setMonth(0, 1)
    const yearEnd = new Date(yearStart)
    yearEnd.setFullYear(yearEnd.getFullYear() + 1)

    return {
      hour: { start: hourStart, end: hourEnd },
      day: { start: dayStart, end: dayEnd },
      week: { start: weekStart, end: weekEnd },
      month: { start: monthStart, end: monthEnd },
      year: { start: yearStart, end: yearEnd }
    }
  }

  buildScopedGroupCondition(startIndex = 2, tableAlias = '') {
    const field = tableAlias ? `${tableAlias}.group_id` : 'group_id'
    const currentGroupIds = this.dataService.getCurrentGroupIdsForFilter()
    const params = []
    let sql = `${field} NOT IN (SELECT group_id FROM archived_groups)`

    if (currentGroupIds && currentGroupIds.length > 0) {
      const placeholders = currentGroupIds.map((_, index) => `$${startIndex + index}`).join(',')
      sql += ` AND ${field} IN (${placeholders})`
      params.push(...currentGroupIds)
    }

    return { sql, params }
  }

  parsePeriodStatRow(row) {
    return {
      count: Math.max(0, parseInt(row?.message_count || 0, 10) || 0),
      words: Math.max(0, parseInt(row?.word_count || 0, 10) || 0)
    }
  }

  async queryUserRangeStats(userId, startDate = null, endDate = null) {
    const dbService = this.dataService.dbService
    const { sql: groupSql, params: groupParams } = this.buildScopedGroupCondition(2)

    const params = [userId, ...groupParams]
    let query = `
      SELECT
        COALESCE(SUM(message_count), 0) as message_count,
        COALESCE(SUM(word_count), 0) as word_count
      FROM message_granular_stats
      WHERE user_id = $1 AND ${groupSql}
    `

    if (startDate) {
      params.push(this.getDateTimeKey(startDate))
      query += ` AND stat_hour >= $${params.length}`
    }
    if (endDate) {
      params.push(this.getDateTimeKey(endDate))
      query += ` AND stat_hour < $${params.length}`
    }

    const row = await dbService.get(query, ...params)
    return this.parsePeriodStatRow(row)
  }

  async getUserPeriodStats(userId, fallbackTotal = { count: 0, words: 0 }) {
    const ranges = this.getCurrentPeriodRanges()
    const empty = this.createEmptyPeriodStats()

    try {
      const [hour, day, week, month, year, total] = await Promise.all([
        this.queryUserRangeStats(userId, ranges.hour.start, ranges.hour.end),
        this.queryUserRangeStats(userId, ranges.day.start, ranges.day.end),
        this.queryUserRangeStats(userId, ranges.week.start, ranges.week.end),
        this.queryUserRangeStats(userId, ranges.month.start, ranges.month.end),
        this.queryUserRangeStats(userId, ranges.year.start, ranges.year.end),
        this.queryUserRangeStats(userId, null, null)
      ])

      const hasTotal = total.count > 0 || total.words > 0
      const fallback = {
        count: Math.max(0, parseInt(fallbackTotal?.count || 0, 10) || 0),
        words: Math.max(0, parseInt(fallbackTotal?.words || 0, 10) || 0)
      }

      return {
        hour,
        day,
        week,
        month,
        year,
        total: hasTotal ? total : fallback
      }
    } catch (err) {
      globalConfig.debug('查询用户周期统计失败，使用兜底数据:', err)
      return {
        ...empty,
        total: {
          count: Math.max(0, parseInt(fallbackTotal?.count || 0, 10) || 0),
          words: Math.max(0, parseInt(fallbackTotal?.words || 0, 10) || 0)
        }
      }
    }
  }

  applyMessageTypeBucket(bucket, msg) {
    if (!bucket || !msg || typeof msg !== 'object') return

    const text = String(msg.message || '').trim()
    const hasText = text !== '' && text !== '[表情]'
    const hasReply = msg.hasReply === true
    const emojiCount = Math.max(0, parseInt(msg?.faces?.total || 0, 10) || 0)
    const imageCount = Array.isArray(msg.images) ? msg.images.length : 0
    const linkCount = Array.isArray(msg.links) ? msg.links.length : 0
    const videoCount = Array.isArray(msg.videos) ? msg.videos.length : 0

    let atCount = parseInt(msg.atCount, 10)
    if (!Number.isFinite(atCount)) {
      atCount = Array.isArray(msg.atUsers) ? msg.atUsers.length : 0
    }
    atCount = Math.max(0, atCount || 0)

    if (hasText) bucket.textMessages += 1
    if (hasReply) bucket.replyMessages += 1
    if (atCount > 0) bucket.atMentions += atCount
    if (emojiCount > 0) bucket.emojis += emojiCount
    if (imageCount > 0) bucket.images += imageCount
    if (linkCount > 0) bucket.links += linkCount
    if (videoCount > 0) bucket.videos += videoCount

    if (emojiCount > 0 || imageCount > 0 || linkCount > 0 || videoCount > 0) {
      bucket.mediaMessages += 1
    }
  }

  async getQueryableUserGroupIds(userId) {
    const dbService = this.dataService.dbService
    const rows = await dbService.all(
      `SELECT DISTINCT group_id
       FROM user_agg_stats
       WHERE user_id = $1 AND group_id NOT IN (SELECT group_id FROM archived_groups)`,
      userId
    )

    let groupIds = (rows || []).map(item => String(item.group_id)).filter(Boolean)

    const currentGroupIds = this.dataService.getCurrentGroupIdsForFilter()
    if (currentGroupIds && currentGroupIds.length > 0) {
      const currentSet = new Set(currentGroupIds.map(String))
      groupIds = groupIds.filter(groupId => currentSet.has(String(groupId)))
    }

    return groupIds
  }

  async getUserMessageTypeStats(userId) {
    const fallback = this.createEmptyTypeStats('消息收集未启用，暂无消息类型统计')

    let messageCollector = null
    try {
      messageCollector = await getMessageCollector()
    } catch {
      return fallback
    }

    if (!messageCollector) {
      return fallback
    }

    const groupIds = await this.getQueryableUserGroupIds(userId)
    if (!groupIds.length) {
      return this.createEmptyTypeStats('未找到可统计的群聊消息数据')
    }

    const currentKeys = this.getCurrentPeriodKeys()
    const retentionDaysRaw = parseInt(
      messageCollector?.redisHelper?.retentionDays || messageCollector?.config?.retentionDays || 7,
      10
    )
    const retentionDays = Number.isFinite(retentionDaysRaw) && retentionDaysRaw > 0 ? retentionDaysRaw : 7
    const typeStats = this.createEmptyTypeStats('')

    let scannedGroups = 0
    for (const groupId of groupIds) {
      let messages = []
      try {
        messages = await messageCollector.getMessages(groupId, retentionDays, currentKeys?.dayKey || null)
      } catch {
        continue
      }

      if (!Array.isArray(messages) || messages.length === 0) {
        continue
      }

      scannedGroups += 1

      for (const msg of messages) {
        if (String(msg?.user_id) !== String(userId)) {
          continue
        }

        const msgDate = this.toUTC8DateFromUnix(msg?.time)
        const msgKeys = this.getPeriodKeysByDate(msgDate)
        if (!msgKeys) {
          continue
        }

        this.applyMessageTypeBucket(typeStats.periods.total, msg)
        if (msgKeys.hourKey === currentKeys.hourKey) {
          this.applyMessageTypeBucket(typeStats.periods.hour, msg)
        }
        if (msgKeys.dayKey === currentKeys.dayKey) {
          this.applyMessageTypeBucket(typeStats.periods.day, msg)
        }
        if (msgKeys.weekKey === currentKeys.weekKey) {
          this.applyMessageTypeBucket(typeStats.periods.week, msg)
        }
        if (msgKeys.monthKey === currentKeys.monthKey) {
          this.applyMessageTypeBucket(typeStats.periods.month, msg)
        }
        if (msgKeys.yearKey === currentKeys.yearKey) {
          this.applyMessageTypeBucket(typeStats.periods.year, msg)
        }
      }
    }

    if (scannedGroups <= 0) {
      return this.createEmptyTypeStats(`消息采集中暂无可用数据（近 ${retentionDays} 天）`)
    }

    typeStats.available = true
    typeStats.note = `消息类型统计基于近 ${retentionDays} 天采集数据（覆盖 ${scannedGroups} 个群）`
    return typeStats
  }

  async resolveUserStatsMeta(userId, totalCount) {
    const dbService = this.dataService.dbService
    let globalRank = null
    let totalUsers = 0
    let totalMessages = 0
    let groupCount = 0

    try {
      const userRankData = await this.dataService.getUserRankData(userId, null, 'total', {})
      if (userRankData) {
        globalRank = userRankData.rank
      }

      const globalStats = await this.dataService.getGlobalStats(1, 1)
      totalUsers = globalStats.totalUsers || 0
      totalMessages = globalStats.totalMessages || 0

      const currentGroupIds = this.dataService.getCurrentGroupIdsForFilter()
      if (currentGroupIds && currentGroupIds.length > 0) {
        const placeholders = currentGroupIds.map((_, i) => `$${i + 2}`).join(',')
        const groupCountResult = await dbService.get(
          `SELECT COUNT(DISTINCT group_id) as group_count
           FROM user_agg_stats
           WHERE user_id = $1 AND group_id IN (${placeholders}) AND group_id NOT IN (SELECT group_id FROM archived_groups)`,
          userId,
          ...currentGroupIds
        )
        groupCount = parseInt(groupCountResult?.group_count || 0, 10)
      } else {
        const userStatsList = await dbService.all(
          'SELECT COUNT(DISTINCT group_id) as group_count FROM user_agg_stats WHERE user_id = $1 AND group_id NOT IN (SELECT group_id FROM archived_groups)',
          userId
        )
        if (userStatsList?.length > 0) {
          groupCount = parseInt(userStatsList[0].group_count || 0, 10)
        }
      }
    } catch {
      globalConfig.debug('获取排名信息失败')
    }

    const messagePercentage = totalMessages > 0
      ? ((totalCount / totalMessages) * 100).toFixed(2)
      : '0.00'

    const userPercentage = totalUsers > 0
      ? ((1 / totalUsers) * 100).toFixed(4)
      : '0.0000'

    return {
      globalRank,
      totalUsers,
      totalMessages,
      groupCount,
      messagePercentage,
      userPercentage
    }
  }

  buildTypeStatsText(typeStats) {
    const periods = typeStats?.periods || {}
    const periodOrder = this.getPeriodOrder()
    const typeItems = [
      { key: 'textMessages', label: '文本消息' },
      { key: 'replyMessages', label: '回复消息' },
      { key: 'atMentions', label: '艾特次数' },
      { key: 'emojis', label: '表情总数' },
      { key: 'images', label: '图片总数' },
      { key: 'links', label: '链接总数' },
      { key: 'videos', label: '视频总数' }
    ]

    const lines = ['消息类型统计（时/日/周/月/年/总）']
    for (const item of typeItems) {
      const values = periodOrder
        .map(period => {
          const bucket = periods[period.key] || this.createEmptyTypeBucket()
          return CommonUtils.formatNumber(bucket[item.key] || 0)
        })
        .join(' / ')
      lines.push(`${item.label}: ${values}`)
    }

    if (typeStats?.note) {
      lines.push(`说明: ${typeStats.note}`)
    }

    return lines.join('\n')
  }

  buildPeriodStatsText(periodStats = {}) {
    const lines = ['周期统计（时/日/周/月/年/总）']
    for (const period of this.getPeriodOrder()) {
      const stats = periodStats?.[period.key] || { count: 0, words: 0 }
      lines.push(
        `${period.label}: ${CommonUtils.formatNumber(stats.count || 0)} 条 / ${CommonUtils.formatNumber(stats.words || 0)} 字`
      )
    }
    return lines.join('\n')
  }

  /**
   * 查询个人统计数据（所有群聊数据总和）
   */
  async queryUserStats(e) {
    const validation = CommonUtils.validateGroupMessage(e, false)
    if (!validation.valid) {
      return e.reply(validation.message)
    }

    return await CommandWrapper.safeExecute(async () => {
      const userInfo = UserParser.parseUser(e, { allowMention: true, defaultToSelf: true })
      if (!userInfo?.userId) {
        return e.reply('无法获取用户信息')
      }

      const userId = userInfo.userId
      const dbService = this.dataService.dbService
      const userStats = await dbService.getUserStatsAllGroups(userId)

      if (!userStats || (
        (!userStats.total_count || userStats.total_count === 0) &&
        (!userStats.total_words || userStats.total_words === 0) &&
        (!userStats.active_days || userStats.active_days === 0)
      )) {
        return e.reply(`${userInfo.nickname} 暂无统计数据`)
      }

      let nickname = userStats.nickname || userInfo.nickname
      const totalCount = parseInt(userStats.total_count || 0, 10)
      const totalWords = parseInt(userStats.total_words || 0, 10)
      const totalActiveDays = parseInt(userStats.active_days || 0, 10)
      const maxContinuousDays = parseInt(userStats.continuous_days || 0, 10)
      const lastSpeakingTime = userStats.last_speaking_time || null

      const timeInfo = TimeUtils.getCurrentDateTime()
      const [periodStats, typeStats] = await Promise.all([
        this.getUserPeriodStats(userId, { count: totalCount, words: totalWords }),
        this.getUserMessageTypeStats(userId)
      ])

      const todayDate = timeInfo.formattedDate
      const monthKey = timeInfo.monthKey
      const todayStats = periodStats.day || { count: 0, words: 0 }
      const monthStats = periodStats.month || { count: 0, words: 0 }
      const totalPeriodStats = periodStats.total || { count: totalCount, words: totalWords }
      const safeTotalCount = parseInt(totalPeriodStats.count || totalCount, 10)
      const safeTotalWords = parseInt(totalPeriodStats.words || totalWords, 10)

      const rankMeta = await this.resolveUserStatsMeta(userId, safeTotalCount)

      const userData = {
        user_id: userId,
        nickname,
        total: safeTotalCount,
        total_count: safeTotalCount,
        total_number_of_words: safeTotalWords,
        active_days: totalActiveDays,
        continuous_days: maxContinuousDays,
        last_speaking_time: lastSpeakingTime,
        daily_stats: { [todayDate]: todayStats },
        monthly_stats: { [monthKey]: monthStats },
        period_stats: periodStats,
        global_rank: rankMeta.globalRank,
        message_percentage: rankMeta.messagePercentage,
        user_percentage: rankMeta.userPercentage,
        today_count: todayStats.count,
        today_words: todayStats.words,
        month_count: monthStats.count,
        month_words: monthStats.words,
        group_count: rankMeta.groupCount,
        message_type_stats: typeStats
      }

      try {
        const imagePath = await this.imageGenerator.generateUserStatsImage(
          userData,
          null,
          '全局统计',
          userId,
          nickname
        )
        return e.reply(this.formatImageSegment(imagePath))
      } catch (err) {
        globalConfig.error('生成用户统计图片失败，回退到文本模式:', err)
      }

      let text = `📊 ${nickname} 的统计数据（所有群聊总和）\n\n`
      text += `总发言: ${CommonUtils.formatNumber(safeTotalCount)} 条\n`
      text += `总字数: ${CommonUtils.formatNumber(safeTotalWords)} 字\n`
      text += `活跃天数: ${totalActiveDays} 天\n`
      text += `连续天数: ${maxContinuousDays} 天\n`
      text += `最后发言: ${lastSpeakingTime || '未知'}\n\n`
      text += `${this.buildPeriodStatsText(periodStats)}\n\n`
      text += this.buildTypeStatsText(typeStats)

      return e.reply(text)
    }, '查询用户统计失败', async () => {
      return e.reply('查询失败，请稍后重试')
    })
  }

  /**
   * 查询用户群列表
   */
  async listUserGroups(e) {
    const validation = CommonUtils.validateGroupMessage(e, false)
    if (!validation.valid) {
      return e.reply(validation.message)
    }

    return await CommandWrapper.safeExecute(async () => {
      const userInfo = UserParser.parseUser(e, { allowMention: true, defaultToSelf: true })
      if (!userInfo?.userId) {
        return e.reply('无法获取用户信息')
      }

      const userId = userInfo.userId
      let nickname = userInfo.nickname
      const mentionedUser = userInfo.isMentioned ? userInfo : null
      const dbService = this.dataService.dbService

      let userStatsList = await dbService.all(
        `SELECT *
         FROM user_agg_stats
         WHERE user_id = $1 AND group_id NOT IN (SELECT group_id FROM archived_groups)
         ORDER BY total_msg DESC`,
        userId
      )

      userStatsList = (userStatsList || []).map(row => {
        let statsJson = {}
        try {
          if (typeof row.stats_json === 'string') {
            statsJson = JSON.parse(row.stats_json)
          } else if (row.stats_json && typeof row.stats_json === 'object') {
            statsJson = row.stats_json
          }
        } catch {}

        return {
          ...row,
          nickname: statsJson.nickname || '',
          total_count: parseInt(row.total_msg || 0, 10),
          total_words: parseInt(row.total_word || 0, 10),
          active_days: parseInt(statsJson.active_days || 0, 10)
        }
      })

      const currentGroupIds = this.dataService.getCurrentGroupIdsForFilter()
      if (currentGroupIds && currentGroupIds.length > 0) {
        const currentSet = new Set(currentGroupIds.map(String))
        userStatsList = (userStatsList || []).filter(row => currentSet.has(String(row.group_id)))
      }

      if (!userStatsList?.length) {
        const message = mentionedUser
          ? `${nickname} 在任何群中都没有统计数据`
          : '你在任何群中都没有统计数据'
        return e.reply(message)
      }

      const userGroups = []
      for (const userStats of userStatsList) {
        const totalCount = parseInt(userStats.total_count || 0, 10)
        const totalWords = parseInt(userStats.total_words || 0, 10)
        const activeDays = parseInt(userStats.active_days || 0, 10)

        if (totalCount > 0 || totalWords > 0 || activeDays > 0) {
          let groupName = this.dataService.getDefaultGroupDisplayName(userStats.group_id)
          try {
            groupName = await this.dataService.getPreferredGroupName(userStats.group_id, e)
          } catch {
            globalConfig.debug('获取群名称失败')
          }

          userGroups.push({
            groupId: userStats.group_id,
            groupName,
            totalCount,
            totalWords,
            activeDays,
            lastSpeakingTime: userStats.last_speaking_time || '未知'
          })
        }
      }

      if (userGroups.length === 0) {
        const message = mentionedUser
          ? `${nickname} 在任何群中都没有统计数据`
          : '你在任何群中都没有统计数据'
        return e.reply(message)
      }

      try {
        const firstStat = userStatsList[0]
        if (firstStat?.nickname) {
          nickname = firstStat.nickname
        }
      } catch {}

      const msg = []
      const titleText = mentionedUser
        ? `📊 ${nickname} 在以下群聊的统计数据：\n`
        : '📊 你在以下群聊的统计数据：\n'
      msg.push([titleText, `共 ${userGroups.length} 个群聊\n`])

      userGroups.forEach((group, index) => {
        const maskedGroupId = CommonUtils.maskGroupId(group.groupId)
        msg.push([
          `${index + 1}. ${group.groupName}\n`,
          `群号: ${maskedGroupId}\n`,
          `总发言: ${CommonUtils.formatNumber(group.totalCount)} 条\n`,
          `总字数: ${CommonUtils.formatNumber(group.totalWords)} 字\n`,
          `活跃天数: ${group.activeDays} 天\n`,
          `最后发言: ${group.lastSpeakingTime}`
        ])
      })

      const totalCount = userGroups.reduce((sum, group) => sum + group.totalCount, 0)
      const totalWords = userGroups.reduce((sum, group) => sum + group.totalWords, 0)
      msg.push([
        '📊 总计统计\n',
        `总发言: ${CommonUtils.formatNumber(totalCount)} 条\n`,
        `总字数: ${CommonUtils.formatNumber(totalWords)} 字`
      ])

      try {
        return e.reply(common.makeForwardMsg(e, msg, '水群查询群列表'))
      } catch (err) {
        globalConfig.warn('合并转发不可用，回落到文本发送:', err?.message || err)

        const plainText = []
        plainText.push(titleText.trim())

        for (const group of userGroups) {
          const maskedGroupId = CommonUtils.maskGroupId(group.groupId)
          plainText.push(
            `${group.groupName}\n` +
            `群号: ${maskedGroupId}\n` +
            `总发言: ${CommonUtils.formatNumber(group.totalCount)} 条\n` +
            `总字数: ${CommonUtils.formatNumber(group.totalWords)} 字\n` +
            `活跃天数: ${group.activeDays} 天\n` +
            `最后发言: ${group.lastSpeakingTime}`
          )
        }

        plainText.push(
          '📊 总计统计\n' +
          `总发言: ${CommonUtils.formatNumber(totalCount)} 条\n` +
          `总字数: ${CommonUtils.formatNumber(totalWords)} 字`
        )

        return e.reply(plainText.join('\n\n'))
      }
    }, '查询用户群列表失败', async () => {
      return e.reply('查询失败，请稍后重试')
    })
  }
}

export { UserCommands }
export default UserCommands
