import { globalConfig } from '../ConfigManager.js'

export function getClientIp(req) {
  const forwarded = String(
    req?.headers?.['cf-connecting-ip']
    || req?.headers?.['x-real-ip']
    || req?.headers?.['x-forwarded-for']
    || ''
  ).split(',')[0].trim()

  const rawAddress = forwarded || String(
    req?.ip
    || req?.socket?.remoteAddress
    || req?.connection?.remoteAddress
    || ''
  )

  return rawAddress.replace(/^::ffff:/, '') || 'unknown'
}

export function maskSensitiveValue(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.length <= 8) return '***'
  return `${raw.slice(0, 3)}***${raw.slice(-3)}`
}

export function getSafeRequestPath(req) {
  try {
    const url = new URL(req?.originalUrl || req?.url || '/', 'http://localhost')
    for (const key of ['backgroundToken', 'token']) {
      if (url.searchParams.has(key)) {
        url.searchParams.set(key, maskSensitiveValue(url.searchParams.get(key)))
      }
    }
    return `${url.pathname}${url.search}`
  } catch {
    return String(req?.originalUrl || req?.url || '/')
  }
}

export function logWebAccess(cfg, message) {
  if (cfg?.accessLog === false) return
  globalConfig.mark(`[Web管理端] ${message}`)
}
