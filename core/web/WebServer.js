import fs from 'fs'
import path from 'path'
import http from 'node:http'
import zlib from 'node:zlib'
import { readFileSync } from 'node:fs'
import { PathResolver } from '../utils/PathResolver.js'
import { TimeUtils } from '../utils/TimeUtils.js'
import { globalConfig } from '../ConfigManager.js'
import { getDataService } from '../DataService.js'
import { getDatabaseService } from '../database/DatabaseService.js'
import {
  MIME_TYPES,
  createMiniApp,
  createHttpError,
  formatBytes,
  getPublicHost,
  isLocalRequest,
  isPrivateHostRequest,
  normalizeHost,
  normalizeMountPath,
  normalizeUrl,
  parsePositiveInt,
  readJsonBody,
  sendJson
} from './httpUtils.js'
import { getGlobalPeriodRanking } from './rankingHelper.js'
import { backgroundService } from '../services/BackgroundService.js'
import { backgroundTokenService } from '../services/BackgroundTokenService.js'
import { getClientIp, getSafeRequestPath, logWebAccess } from './WebAccessLogger.js'
import { sendAccessDeniedPage } from './WebErrorPages.js'
import { backgroundAdminController } from './BackgroundAdminController.js'
import { getBackgroundPreviewData } from './BackgroundPreviewData.js'
import { webIpBlocker } from './WebIpBlocker.js'

class SpeakerWebServer {
  constructor() {
    this.started = false
    this.basePath = ''
    this.apiBasePath = ''
    this.server = null
    this.staticDir = PathResolver.getWebServerDir()
    this.dataService = getDataService()
    this.dbService = getDatabaseService()
    this.backgroundService = backgroundService
    this.backgroundTokenService = backgroundTokenService
    this.ipBlocker = webIpBlocker
  }

  getVersion() {
    try {
      const packagePath = path.join(PathResolver.getPluginDir(), 'package.json')
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
      return packageJson.version || 'unknown'
    } catch {
      return 'unknown'
    }
  }

  getConfig() {
    const cfg = globalConfig.getConfig('web', true) || {}
    return {
      enabled: cfg.enabled !== false,
      publicUrl: normalizeUrl(cfg.publicUrl),
      host: normalizeHost(cfg.host),
      port: parsePositiveInt(cfg.port, 2655, 1, 65535),
      basePath: normalizeMountPath(cfg.basePath, '/'),
      apiBasePath: normalizeMountPath(cfg.apiBasePath, '/api'),
      localOnly: cfg.localOnly !== false,
      allowExternalManageAccess: cfg.allowExternalManageAccess === true,
      accessLog: cfg.accessLog !== false,
      queryLog: cfg.queryLog === true,
      ipBlock: {
        enabled: cfg.ipBlock?.enabled !== false,
        windowSeconds: parsePositiveInt(cfg.ipBlock?.windowSeconds, 60, 5, 3600),
        maxDeniedRequests: parsePositiveInt(cfg.ipBlock?.maxDeniedRequests, 30, 1, 10000),
        blockMinutes: parsePositiveInt(cfg.ipBlock?.blockMinutes, 60, 1, 10080),
        maxTrackedIps: parsePositiveInt(cfg.ipBlock?.maxTrackedIps, 1000, 100, 100000)
      },
      backgroundEditor: {
        enabled: cfg.backgroundEditor?.enabled !== false,
        tokenTtlMinutes: parsePositiveInt(cfg.backgroundEditor?.tokenTtlMinutes, 30, 1, 1440),
        maxImageMB: parsePositiveInt(cfg.backgroundEditor?.maxImageMB, 2, 1, 20)
      }
    }
  }

  getAccessUrl(cfg = this.getConfig()) {
    if (cfg.publicUrl) return cfg.publicUrl

    const origin = `http://${getPublicHost(cfg.host)}:${cfg.port}`
    return normalizeUrl(`${origin}${cfg.basePath}`)
  }

  canAccess(req, cfg) {
    return this.canAccessManagement(req, cfg)
  }

  canAccessManagement(req, cfg) {
    if (isLocalRequest(req)) return { ok: true }

    if (cfg.localOnly) {
      return { ok: false, status: 403, message: 'Web 管理端仅允许本机访问' }
    }

    if (isPrivateHostRequest(req)) return { ok: true }

    if (!cfg.allowExternalManageAccess) {
      return { ok: false, status: 403, message: 'Web 管理端已禁止公网访问' }
    }

    return { ok: true }
  }

  canAccessBackgroundEditor(req, cfg) {
    if (isLocalRequest(req)) return { ok: true }

    if (cfg.localOnly) {
      return { ok: false, status: 403, message: '背景设置页面仅允许本机访问' }
    }

    return { ok: true }
  }

  rejectBlockedIp(req, res, cfg = this.getConfig()) {
    const ip = getClientIp(req)
    const block = this.ipBlocker.isBlocked(cfg, ip)
    if (!block.blocked) return false

    res.statusCode = 403
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end('Forbidden')
    return true
  }

  requireAccess(req, res, cfg = this.getConfig(), scope = 'management', responseType = 'json') {
    const access = scope === 'background'
      ? this.canAccessBackgroundEditor(req, cfg)
      : this.canAccessManagement(req, cfg)
    if (access.ok) return true
    const ip = getClientIp(req)
    logWebAccess(cfg, `访问被拒: scope=${scope}, ip=${ip}, path=${getSafeRequestPath(req)}, reason=${access.message}`)
    const block = this.ipBlocker.recordDeniedRequest(cfg, ip)
    if (block.justBlocked) {
      const until = new Date(block.blockedUntil).toISOString()
      logWebAccess(cfg, `IP 已封禁: ip=${ip}, denied=${block.deniedCount}/${block.windowSeconds}s, block=${block.blockMinutes}min, until=${until}`)
    }
    if (responseType === 'html') {
      sendAccessDeniedPage(res, access.message)
      return false
    }
    sendJson(res, access.status, { ok: false, message: access.message })
    return false
  }

  async apiHandler(handler, req, res, options = {}) {
    const cfg = this.getConfig()
    if (!this.requireAccess(req, res, cfg, options.access)) return

    try {
      const data = await handler(req, cfg)
      sendJson(res, 200, { ok: true, data })
    } catch (err) {
      const status = Number(err?.statusCode || 500)
      if (status >= 500) {
        globalConfig.error('[Web管理端] API 处理失败:', err)
      }
      sendJson(res, status, { ok: false, message: err?.message || '请求失败' })
    }
  }

  validateBackgroundEditor(cfg) {
    if (cfg.backgroundEditor.enabled === false) {
      throw createHttpError(403, '背景设置页面已关闭')
    }
  }

  validateBackgroundToken(token, cfg) {
    this.validateBackgroundEditor(cfg)
    const result = this.backgroundTokenService.validateToken(token)
    if (!result.ok) {
      throw createHttpError(result.status || 401, result.message || '背景设置链接无效')
    }
    return result
  }

  maskUserId(userId) {
    const raw = String(userId || '')
    if (raw.length <= 6) return raw
    return `${raw.slice(0, 3)}****${raw.slice(-3)}`
  }

  async getStatus() {
    const dbType = this.dbService.getDatabaseType()
    const dbSize = await this.dbService.getDatabaseSize().catch(() => 0)
    const cfg = globalConfig.getConfig(undefined, true) || {}
    const webCfg = this.getConfig()

    return {
      version: this.getVersion(),
      database: {
        type: dbType,
        size: dbSize,
        sizeText: formatBytes(dbSize)
      },
      web: {
        enabled: webCfg.enabled,
        publicUrl: this.getAccessUrl(webCfg),
        host: webCfg.host,
        port: webCfg.port,
        basePath: webCfg.basePath,
        apiBasePath: webCfg.apiBasePath,
        localOnly: webCfg.localOnly,
        allowExternalManageAccess: webCfg.allowExternalManageAccess,
        accessLog: webCfg.accessLog,
        queryLog: webCfg.queryLog,
        ipBlock: webCfg.ipBlock,
        backgroundEditor: webCfg.backgroundEditor
      },
      switches: {
        enableStatistics: cfg?.global?.enableStatistics !== false,
        recordMessage: cfg?.global?.recordMessage !== false,
        enableWordCount: cfg?.global?.enableWordCount !== false,
        groupAnalysis: cfg?.groupAnalysis?.enabled !== false
      }
    }
  }

  async getOverview(req) {
    const pageSize = parsePositiveInt(req.query?.pageSize, 50, 1, 100)
    const stats = await this.dataService.getGlobalStats(1, pageSize, { quiet: !this.getConfig().queryLog, forceRefresh: true })
    return {
      totalGroups: stats.totalGroups || 0,
      totalUsers: stats.totalUsers || 0,
      totalMessages: stats.totalMessages || 0,
      totalWords: stats.totalWords || 0,
      todayActive: stats.todayActive || 0,
      monthActive: stats.monthActive || 0,
      archivedGroups: stats.archivedGroups || 0,
      earliestTime: stats.earliestTime || null,
      statsDurationHours: stats.statsDurationHours || 0,
      groups: stats.groups || []
    }
  }

  async getGroups(req) {
    const page = parsePositiveInt(req.query?.page, 1, 1, 9999)
    const pageSize = parsePositiveInt(req.query?.pageSize, 20, 1, 100)
    const stats = await this.dataService.getGlobalStats(page, pageSize, { quiet: !this.getConfig().queryLog })
    return {
      groups: stats.groups || [],
      currentPage: stats.currentPage || page,
      totalPages: stats.totalPages || 0,
      pageSize: stats.pageSize || pageSize,
      totalGroups: stats.totalGroups || 0
    }
  }

  async getRanking(req) {
    const allowedPeriods = new Set(['total', 'daily', 'weekly', 'monthly', 'yearly'])
    const period = allowedPeriods.has(String(req.query?.period || 'total'))
      ? String(req.query?.period || 'total')
      : 'total'
    const groupId = String(req.query?.groupId || '').trim() || null
    const limit = parsePositiveInt(req.query?.limit, 20, 1, 100)
    if (!groupId && period !== 'total') {
      const currentTimeInfo = TimeUtils.getCurrentDateTime()
      const periodKeyMap = {
        daily: currentTimeInfo.formattedDate,
        weekly: currentTimeInfo.weekKey,
        monthly: currentTimeInfo.monthKey,
        yearly: currentTimeInfo.yearKey
      }
      const rankings = await getGlobalPeriodRanking(this.dataService, period, periodKeyMap[period], limit)
      return { groupId, period, rankings }
    }
    const rankings = await this.dataService.getRankingData(groupId, period, { limit })
    return { groupId, period, rankings }
  }

  async getBackgroundSession(req, cfg) {
    const tokenInfo = this.validateBackgroundToken(req.query?.token, cfg)
    const info = this.backgroundService.getRankingBackgroundInfo(tokenInfo.userId)
    const preview = await getBackgroundPreviewData(this.dataService, tokenInfo.userId)
    logWebAccess(cfg, `背景设置会话: user=${this.maskUserId(tokenInfo.userId)}, ip=${getClientIp(req)}`)
    return {
      userIdMasked: this.maskUserId(tokenInfo.userId),
      expiresAt: tokenInfo.expiresAt,
      hasBackground: info.exists === true,
      background: info,
      preview,
      limits: {
        maxImageMB: cfg.backgroundEditor.maxImageMB,
        recommendedWidth: 1392,
        recommendedHeight: 210
      }
    }
  }

  async applyBackground(req, cfg) {
    this.validateBackgroundEditor(cfg)
    const maxImageBytes = cfg.backgroundEditor.maxImageMB * 1024 * 1024
    const bodyLimit = Math.ceil(maxImageBytes * 1.5) + 64 * 1024
    const body = await readJsonBody(req, bodyLimit)
    const tokenInfo = this.validateBackgroundToken(body.token, cfg)
    let saved
    try {
      saved = this.backgroundService.saveRankingBackground(
        tokenInfo.userId,
        body.imageBase64,
        body.mimeType,
        maxImageBytes
      )
    } catch (err) {
      throw createHttpError(400, err?.message || '背景图片保存失败')
    }

    logWebAccess(cfg, `背景上传保存: user=${this.maskUserId(tokenInfo.userId)}, size=${formatBytes(saved.size)}, mimeType=${saved.mimeType}, ip=${getClientIp(req)}`)
    return {
      size: saved.size,
      mimeType: saved.mimeType,
      hasBackground: true
    }
  }

  async deleteBackground(req, cfg) {
    const body = await readJsonBody(req, 64 * 1024)
    const tokenInfo = this.validateBackgroundToken(body.token, cfg)
    const deleted = this.backgroundService.deleteRankingBackground(tokenInfo.userId)
    logWebAccess(cfg, `背景删除: user=${this.maskUserId(tokenInfo.userId)}, deleted=${deleted}, ip=${getClientIp(req)}`)
    return { deleted, hasBackground: false }
  }

  sendBackgroundImage(req, res) {
    const cfg = this.getConfig()
    if (!this.requireAccess(req, res, cfg, 'background')) return

    try {
      const tokenInfo = this.validateBackgroundToken(req.query?.token, cfg)
      const image = this.backgroundService.getRankingBackgroundBuffer(tokenInfo.userId)
      if (!image) {
        sendJson(res, 404, { ok: false, message: '背景图片不存在' })
        return
      }
      logWebAccess(cfg, `背景图片读取: user=${this.maskUserId(tokenInfo.userId)}, size=${formatBytes(image.buffer.length)}, ip=${getClientIp(req)}`)

      res.statusCode = 200
      res.setHeader('Content-Type', image.mimeType)
      res.setHeader('Cache-Control', 'no-store')
      res.end(image.buffer)
    } catch (err) {
      const status = Number(err?.statusCode || 500)
      if (status >= 500) {
        globalConfig.error('[Web管理端] 背景图片读取失败:', err)
      }
      sendJson(res, status, { ok: false, message: err?.message || '请求失败' })
    }
  }

  registerApi(app, apiBasePath) {
    app.get(`${apiBasePath}/status`, (req, res) => {
      this.apiHandler(() => this.getStatus(), req, res)
    })

    app.get(`${apiBasePath}/overview`, (req, res) => {
      this.apiHandler((request) => this.getOverview(request), req, res)
    })

    app.get(`${apiBasePath}/groups`, (req, res) => {
      this.apiHandler((request) => this.getGroups(request), req, res)
    })

    app.get(`${apiBasePath}/ranking`, (req, res) => {
      this.apiHandler((request) => this.getRanking(request), req, res)
    })

    app.get(`${apiBasePath}/background/session`, (req, res) => {
      this.apiHandler((request, cfg) => this.getBackgroundSession(request, cfg), req, res, { access: 'background' })
    })

    app.get(`${apiBasePath}/background/image`, (req, res) => {
      this.sendBackgroundImage(req, res)
    })

    app.post(`${apiBasePath}/background/apply`, (req, res) => {
      this.apiHandler((request, cfg) => this.applyBackground(request, cfg), req, res, { access: 'background' })
    })

    app.delete(`${apiBasePath}/background`, (req, res) => {
      this.apiHandler((request, cfg) => this.deleteBackground(request, cfg), req, res, { access: 'background' })
    })

    backgroundAdminController.register(app, apiBasePath, this)
  }

  isBackgroundEditorPageRequest(req) {
    return Boolean(String(req.query?.backgroundToken || '').trim())
  }

  isPublicWebAssetRequest(requestPath) {
    const normalized = String(requestPath || '/')
    return normalized === '/favicon.ico' || normalized.startsWith('/assets/')
  }

  requireStaticAccess(req, res, cfg, requestPath) {
    const scope = this.isBackgroundEditorPageRequest(req) || this.isPublicWebAssetRequest(requestPath)
      ? 'background'
      : 'management'
    return this.requireAccess(req, res, cfg, scope, 'html')
  }

  getStaticCacheHeader(filePath) {
    const normalized = path.normalize(filePath)
    const ext = path.extname(filePath).toLowerCase()
    if (ext === '.html') return 'no-store'
    if (normalized.includes(`${path.sep}assets${path.sep}`) || normalized.includes(`${path.sep}font${path.sep}`)) {
      return 'public, max-age=31536000, immutable'
    }
    return 'public, max-age=3600'
  }

  getStaticEncoding(req, ext, size) {
    if (size < 1024) return ''
    const compressible = new Set(['.html', '.js', '.css', '.json', '.svg', '.ttf'])
    if (!compressible.has(ext)) return ''

    const acceptEncoding = String(req.headers?.['accept-encoding'] || '').toLowerCase()
    if (acceptEncoding.includes('br')) return 'br'
    if (acceptEncoding.includes('gzip')) return 'gzip'
    return ''
  }

  sendStaticFile(req, res, filePath) {
    const ext = path.extname(filePath).toLowerCase()
    const stat = fs.statSync(filePath)
    const encoding = this.getStaticEncoding(req, ext, stat.size)

    res.statusCode = 200
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream')
    res.setHeader('Cache-Control', this.getStaticCacheHeader(filePath))
    res.setHeader('Last-Modified', stat.mtime.toUTCString())

    if (encoding) {
      res.setHeader('Content-Encoding', encoding)
      const stream = encoding === 'br'
        ? zlib.createBrotliCompress()
        : zlib.createGzip({ level: 6 })
      fs.createReadStream(filePath).pipe(stream).pipe(res)
      return
    }

    res.setHeader('Content-Length', stat.size)
    fs.createReadStream(filePath).pipe(res)
  }

  sendResourceFontFile(req, res, requestPath) {
    const relativePath = path.normalize(String(requestPath || '').replace(/^\/font\//, '')).replace(/^(\.\.[/\\])+/, '')
    const fontDir = path.resolve(PathResolver.getResourcesDir(), 'font')
    const filePath = path.resolve(fontDir, relativePath)
    const fontPrefix = fontDir.endsWith(path.sep) ? fontDir : `${fontDir}${path.sep}`

    if (filePath !== fontDir && filePath.startsWith(fontPrefix) && fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
      this.sendStaticFile(req, res, filePath)
      return
    }

    res.statusCode = 404
    res.end('Font not found')
  }

  registerFontStatic(app) {
    app.use('/font', (req, res) => {
      const cfg = this.getConfig()
      if (cfg.localOnly && !isLocalRequest(req)) {
        res.statusCode = 403
        res.end('Forbidden')
        return
      }

      const fontPath = `/font${String(req.path || '').startsWith('/') ? req.path : `/${req.path || ''}`}`
      this.sendResourceFontFile(req, res, fontPath)
    })
  }

  registerStatic(app, basePath) {
    app.use(basePath, (req, res) => {
      const cfg = this.getConfig()
      const originalPath = String(req.originalUrl || '').split('?')[0] || '/'
      if (cfg.basePath !== '/' && originalPath === cfg.basePath) {
        res.statusCode = 302
        res.setHeader('Location', `${cfg.basePath}/`)
        res.end()
        return
      }

      const requestPath = decodeURIComponent(String(req.path || req.url || '/').split('?')[0])
      if (!this.requireStaticAccess(req, res, cfg, requestPath)) return

      if (requestPath.startsWith('/font/')) {
        this.sendResourceFontFile(req, res, requestPath)
        return
      }

      if (!fs.existsSync(this.staticDir)) {
        res.statusCode = 404
        res.end('Web assets not found')
        return
      }

      const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '')
      const relativePath = safePath === '/' || safePath === '.' ? 'index.html' : safePath.replace(/^[/\\]/, '')
      let filePath = path.resolve(this.staticDir, relativePath)
      const rootPath = path.resolve(this.staticDir)
      const rootPrefix = rootPath.endsWith(path.sep) ? rootPath : `${rootPath}${path.sep}`

      if (filePath !== rootPath && !filePath.startsWith(rootPrefix)) {
        res.statusCode = 403
        res.end('Forbidden')
        return
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(rootPath, 'index.html')
      }

      if (!fs.existsSync(filePath)) {
        res.statusCode = 404
        res.end('Not found')
        return
      }

      if (path.basename(filePath) === 'index.html') {
        const type = this.isBackgroundEditorPageRequest(req) ? '背景设置页面访问' : '管理端页面访问'
        logWebAccess(cfg, `${type}: ip=${getClientIp(req)}, path=${getSafeRequestPath(req)}`)
      }

      this.sendStaticFile(req, res, filePath)
    })
  }

  async start() {
    if (this.started) return true

    const cfg = this.getConfig()
    if (!cfg.enabled) {
      globalConfig.debug('[Web管理端] 已禁用，跳过启动')
      return false
    }

    const app = createMiniApp()

    this.basePath = cfg.basePath
    this.apiBasePath = cfg.apiBasePath
    this.registerApi(app, this.apiBasePath)
    this.registerFontStatic(app)
    this.registerStatic(app, this.basePath)

    this.server = http.createServer((req, res) => {
      const currentCfg = this.getConfig()
      if (this.rejectBlockedIp(req, res, currentCfg)) return
      app.handle(req, res)
    })

    await new Promise((resolve, reject) => {
      const onError = (err) => {
        this.server?.off?.('listening', onListening)
        reject(err)
      }
      const onListening = () => {
        this.server?.off?.('error', onError)
        resolve()
      }

      this.server.once('error', onError)
      this.server.once('listening', onListening)
      this.server.listen(cfg.port, cfg.host)
    })

    this.started = true

    globalConfig.mark(`[Web管理端] 已启动: ${this.getAccessUrl(cfg)} (监听 ${cfg.host}:${cfg.port})`)
    return true
  }
}

const webServer = new SpeakerWebServer()

export async function startWebServer() { return webServer.start() }

export { SpeakerWebServer, webServer }
export default webServer
