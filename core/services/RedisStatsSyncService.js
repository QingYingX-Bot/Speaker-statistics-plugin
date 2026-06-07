import RedisHelper from '../utils/redisHelper.js'
import { TimeUtils } from '../utils/TimeUtils.js'
import Config from './Config.js'

const SYNC_SOURCE = 'database_sync'

export default class RedisStatsSyncService {
  constructor(dataService) {
    this.dataService = dataService
    const config = Config.get() || {}
    this.redisHelper = new RedisHelper(
      config.retentionDays || 7,
      config.atRetentionHours || 24
    )
  }

  async sync(options = {}) {
    const rows = await this.getDatabaseRows(options.groupId)
    const messagesByKey = new Map()
    const result = {
      rows: rows.length,
      groups: new Set(),
      messages: 0,
      keys: 0,
      replaced: 0,
      kept: 0,
      skippedKeys: 0
    }

    for (const row of rows) {
      const message = this.buildRedisMessage(row)
      if (!message) continue

      const key = this.redisHelper.getMessageKey(message.group_id, message.date)
      if (!messagesByKey.has(key)) {
        messagesByKey.set(key, [])
      }
      messagesByKey.get(key).push(message.data)
      result.groups.add(message.group_id)
    }

    for (const [key, messages] of messagesByKey.entries()) {
      const rewriteResult = await this.rewriteRedisKey(key, messages)
      result.keys += 1
      result.replaced += rewriteResult.replaced
      result.kept += rewriteResult.kept
      result.messages += rewriteResult.written
      if (rewriteResult.skipped) result.skippedKeys += 1
    }

    result.groups = result.groups.size
    return result
  }

  async getDatabaseRows(groupId = '') {
    const params = []
    let sql = `
      SELECT
        mgs.group_id,
        mgs.user_id,
        mgs.stat_hour,
        mgs.message_count,
        mgs.word_count,
        uas.stats_json
      FROM message_granular_stats mgs
      LEFT JOIN user_agg_stats uas
        ON mgs.group_id = uas.group_id AND mgs.user_id = uas.user_id
    `

    if (groupId) {
      params.push(String(groupId))
      sql += ` WHERE mgs.group_id = $${params.length}`
    }

    const startTime = this.getRetentionStartTime()
    params.push(startTime)
    sql += groupId ? ` AND mgs.stat_hour >= $${params.length}` : ` WHERE mgs.stat_hour >= $${params.length}`

    sql += ' ORDER BY mgs.stat_hour ASC'
    return await this.dataService.dbService.all(sql, ...params)
  }

  buildRedisMessage(row) {
    const groupId = String(row?.group_id || '').trim()
    const userId = String(row?.user_id || '').trim()
    const messageCount = Math.max(0, parseInt(row?.message_count || 0, 10) || 0)
    const wordCount = Math.max(0, parseInt(row?.word_count || 0, 10) || 0)
    const statDate = this.parseStatHour(row?.stat_hour)

    if (!groupId || !userId || messageCount <= 0 || !statDate) {
      return null
    }

    const statsJson = this.parseStatsJson(row?.stats_json)
    const nickname = String(statsJson.nickname || userId)
    const date = TimeUtils.formatDate(statDate)
    const time = Math.floor(statDate.getTime() / 1000)

    return {
      group_id: groupId,
      date,
      data: {
        user_id: userId,
        nickname,
        message: '',
        time,
        timestamp: Date.now(),
        hour: statDate.getHours(),
        length: wordCount,
        hasReply: false,
        atCount: 0,
        messageCount,
        wordCount,
        source: SYNC_SOURCE
      }
    }
  }

  async rewriteRedisKey(key, syncMessages) {
    const rawMessages = await redis.lRange(key, 0, -1)
    const keptMessages = []
    let replaced = 0

    for (const raw of rawMessages) {
      const message = this.parseRedisMessage(raw)
      if (message?.source === SYNC_SOURCE) {
        replaced += Math.max(1, parseInt(message.messageCount || 1, 10) || 1)
        continue
      }
      keptMessages.push(raw)
    }

    const ttl = await redis.ttl(key)
    await redis.del(key)

    if (keptMessages.length > 0) {
      await redis.rPush(key, keptMessages)
      const expireSeconds = ttl > 0 ? ttl : this.redisHelper.retentionDays * 24 * 60 * 60
      await redis.expire(key, expireSeconds)
      return {
        kept: keptMessages.length,
        replaced,
        written: 0,
        skipped: true
      }
    }

    const nextMessages = [
      ...syncMessages.map(message => JSON.stringify(message))
    ]
    if (nextMessages.length > 0) {
      await redis.rPush(key, nextMessages)
      const expireSeconds = ttl > 0 ? ttl : this.redisHelper.retentionDays * 24 * 60 * 60
      await redis.expire(key, expireSeconds)
    }

    return {
      kept: keptMessages.length,
      replaced,
      written: syncMessages.reduce((sum, message) => sum + (parseInt(message.messageCount || 0, 10) || 0), 0),
      skipped: false
    }
  }

  parseRedisMessage(raw) {
    try {
      const message = typeof raw === 'string' ? JSON.parse(raw) : raw
      return message && typeof message === 'object' ? message : null
    } catch {
      return null
    }
  }

  parseStatsJson(raw) {
    if (!raw) return {}
    if (typeof raw === 'object') return raw
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }

  parseStatHour(raw) {
    if (!raw) return null

    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
      return new Date(raw.getTime())
    }

    const text = String(raw).trim().replace('T', ' ').slice(0, 19)
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2})/)
    if (!match) return null

    const [, year, month, day, hour] = match
    const date = new Date(`${year}-${month}-${day}T${hour}:00:00+08:00`)
    return Number.isNaN(date.getTime()) ? null : date
  }

  getRetentionStartTime() {
    const date = TimeUtils.getUTC8Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - Math.max(0, this.redisHelper.retentionDays - 1))
    return TimeUtils.formatDateTime(date)
  }
}
