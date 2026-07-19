const DEFAULT_CONFIG = Object.freeze({
  enabled: true,
  windowSeconds: 60,
  maxDeniedRequests: 30,
  blockMinutes: 60,
  maxTrackedIps: 1000
})

function parsePositiveInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < min) return fallback
  return Math.min(parsed, max)
}

function isTrackableIp(ip) {
  const value = String(ip || '').trim()
  return Boolean(value && value !== 'unknown')
}

function trimMap(map, maxSize) {
  while (map.size > maxSize) {
    const oldestKey = map.keys().next().value
    if (oldestKey === undefined) return
    map.delete(oldestKey)
  }
}

export class WebIpBlocker {
  constructor() {
    this.records = new Map()
    this.blocked = new Map()
  }

  getConfig(cfg = {}) {
    const raw = cfg.ipBlock || {}
    return {
      enabled: raw.enabled !== false,
      windowSeconds: parsePositiveInt(raw.windowSeconds, DEFAULT_CONFIG.windowSeconds, 5, 3600),
      maxDeniedRequests: parsePositiveInt(raw.maxDeniedRequests, DEFAULT_CONFIG.maxDeniedRequests, 1, 10000),
      blockMinutes: parsePositiveInt(raw.blockMinutes, DEFAULT_CONFIG.blockMinutes, 1, 10080),
      maxTrackedIps: parsePositiveInt(raw.maxTrackedIps, DEFAULT_CONFIG.maxTrackedIps, 100, 100000)
    }
  }

  cleanup(now, cfg) {
    const windowMs = cfg.windowSeconds * 1000
    for (const [ip, record] of this.records.entries()) {
      if (now - record.windowStart > windowMs) {
        this.records.delete(ip)
      }
    }

    for (const [ip, item] of this.blocked.entries()) {
      if (item.blockedUntil <= now) {
        this.blocked.delete(ip)
      }
    }

    trimMap(this.records, cfg.maxTrackedIps)
    trimMap(this.blocked, cfg.maxTrackedIps)
  }

  getBlocked(ip, cfg, now = Date.now()) {
    if (!cfg.enabled || !isTrackableIp(ip)) return null

    const item = this.blocked.get(ip)
    if (!item) return null
    if (item.blockedUntil <= now) {
      this.blocked.delete(ip)
      return null
    }
    return item
  }

  isBlocked(cfg, ip) {
    const blockCfg = this.getConfig(cfg)
    const now = Date.now()
    this.cleanup(now, blockCfg)

    const item = this.getBlocked(ip, blockCfg, now)
    return {
      blocked: Boolean(item),
      blockedUntil: item?.blockedUntil || 0
    }
  }

  recordDeniedRequest(cfg, ip) {
    const blockCfg = this.getConfig(cfg)
    if (!blockCfg.enabled || !isTrackableIp(ip)) {
      return { blocked: false, justBlocked: false }
    }

    const now = Date.now()
    this.cleanup(now, blockCfg)

    const activeBlock = this.getBlocked(ip, blockCfg, now)
    if (activeBlock) {
      return {
        blocked: true,
        justBlocked: false,
        blockedUntil: activeBlock.blockedUntil
      }
    }

    const windowMs = blockCfg.windowSeconds * 1000
    let record = this.records.get(ip)
    if (!record || now - record.windowStart >= windowMs) {
      record = { count: 0, windowStart: now }
    }

    record.count += 1
    this.records.set(ip, record)
    trimMap(this.records, blockCfg.maxTrackedIps)

    if (record.count < blockCfg.maxDeniedRequests) {
      return {
        blocked: false,
        justBlocked: false,
        deniedCount: record.count
      }
    }

    const blockedUntil = now + blockCfg.blockMinutes * 60 * 1000
    this.records.delete(ip)
    this.blocked.set(ip, {
      blockedAt: now,
      blockedUntil,
      deniedCount: record.count
    })
    trimMap(this.blocked, blockCfg.maxTrackedIps)

    return {
      blocked: true,
      justBlocked: true,
      deniedCount: record.count,
      windowSeconds: blockCfg.windowSeconds,
      blockMinutes: blockCfg.blockMinutes,
      blockedUntil
    }
  }
}

export const webIpBlocker = new WebIpBlocker()
