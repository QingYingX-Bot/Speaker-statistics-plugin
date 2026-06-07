import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { PathResolver } from '../utils/PathResolver.js'
import { globalConfig } from '../ConfigManager.js'

const PURPOSE = 'ranking-background'
const TOKEN_BYTES = 9

class BackgroundTokenService {
  constructor() {
    this.tokenPath = path.join(PathResolver.getTempDir(), 'background-tokens.json')
    this.cache = null
  }

  hashToken(token) {
    return crypto.createHash('sha256').update(String(token || '')).digest('hex')
  }

  loadTokens() {
    if (this.cache) return this.cache

    try {
      if (!fs.existsSync(this.tokenPath)) {
        this.cache = {}
        return this.cache
      }

      const raw = fs.readFileSync(this.tokenPath, 'utf8').trim()
      this.cache = raw ? JSON.parse(raw) : {}
      return this.cache
    } catch (err) {
      globalConfig.warn('[背景Token] 读取 token 文件失败:', err?.message || err)
      this.cache = {}
      return this.cache
    }
  }

  saveTokens(tokens) {
    PathResolver.ensureDirectory(path.dirname(this.tokenPath))
    fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2))
    this.cache = tokens
  }

  cleanup(now = Date.now()) {
    const tokens = this.loadTokens()
    let changed = false

    for (const [hash, record] of Object.entries(tokens)) {
      if (!record?.expiresAt || new Date(record.expiresAt).getTime() <= now) {
        delete tokens[hash]
        changed = true
      }
    }

    if (changed) this.saveTokens(tokens)
    return tokens
  }

  createToken(userId, ttlMinutes = 30) {
    const normalizedUserId = String(userId || '').trim()
    if (!normalizedUserId) throw new Error('用户信息无效')

    const now = Date.now()
    const expiresAt = new Date(now + Math.max(1, Number(ttlMinutes) || 30) * 60 * 1000).toISOString()
    const tokens = this.cleanup(now)

    for (const [hash, record] of Object.entries(tokens)) {
      if (record?.purpose === PURPOSE && String(record.userId) === normalizedUserId) {
        delete tokens[hash]
      }
    }

    const token = crypto.randomBytes(TOKEN_BYTES).toString('base64url')
    tokens[this.hashToken(token)] = {
      userId: normalizedUserId,
      purpose: PURPOSE,
      createdAt: new Date(now).toISOString(),
      expiresAt
    }

    this.saveTokens(tokens)
    return { token, expiresAt }
  }

  validateToken(token) {
    const rawToken = String(token || '').trim()
    if (!rawToken) {
      return { ok: false, status: 400, message: '缺少背景设置 token' }
    }

    const tokens = this.cleanup()
    const record = tokens[this.hashToken(rawToken)]
    if (!record || record.purpose !== PURPOSE) {
      return { ok: false, status: 401, message: '背景设置链接无效' }
    }

    const expiresAt = new Date(record.expiresAt).getTime()
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      delete tokens[this.hashToken(rawToken)]
      this.saveTokens(tokens)
      return { ok: false, status: 401, message: '背景设置链接已过期' }
    }

    return {
      ok: true,
      userId: String(record.userId),
      expiresAt: record.expiresAt
    }
  }
}

const backgroundTokenService = new BackgroundTokenService()

export { BackgroundTokenService, backgroundTokenService }
export default backgroundTokenService
