import fs from 'fs'
import path from 'path'
import http from 'node:http'
import { readFileSync } from 'node:fs'
import { PathResolver } from '../utils/PathResolver.js'
import { TimeUtils } from '../utils/TimeUtils.js'
import { globalConfig } from '../ConfigManager.js'
import { getDataService } from '../DataService.js'
import { getDatabaseService } from '../database/DatabaseService.js'
import {
  MIME_TYPES,
  createMiniApp,
  formatBytes,
  getPublicHost,
  isLocalRequest,
  normalizeHost,
  normalizeMountPath,
  normalizeUrl,
  parsePositiveInt,
  sendJson
} from './httpUtils.js'
import { getGlobalPeriodRanking } from './rankingHelper.js'

class SpeakerWebServer {
  constructor() {
    this.started = false
    this.basePath = ''
    this.apiBasePath = ''
    this.server = null
    this.staticDir = PathResolver.getWebServerDir()
    this.dataService = getDataService()
    this.dbService = getDatabaseService()
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
      queryLog: cfg.queryLog === true
    }
  }

  getAccessUrl(cfg = this.getConfig()) {
    if (cfg.publicUrl) return cfg.publicUrl

    const origin = `http://${getPublicHost(cfg.host)}:${cfg.port}`
    return normalizeUrl(`${origin}${cfg.basePath}`)
  }

  canAccess(req, cfg) {
    if (cfg.localOnly && !isLocalRequest(req)) {
      return { ok: false, status: 403, message: 'Web 管理端仅允许本机访问' }
    }

    return { ok: true }
  }

  requireAccess(req, res, cfg = this.getConfig()) {
    const access = this.canAccess(req, cfg)
    if (access.ok) return true
    sendJson(res, access.status, { ok: false, message: access.message })
    return false
  }

  async apiHandler(handler, req, res) {
    const cfg = this.getConfig()
    if (!this.requireAccess(req, res, cfg)) return

    try {
      const data = await handler(req, cfg)
      sendJson(res, 200, { ok: true, data })
    } catch (err) {
      globalConfig.error('[Web管理端] API 处理失败:', err)
      sendJson(res, 500, { ok: false, message: err?.message || '请求失败' })
    }
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
        queryLog: webCfg.queryLog
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
  }

  sendStaticFile(res, filePath) {
    const ext = path.extname(filePath).toLowerCase()
    res.statusCode = 200
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream')
    fs.createReadStream(filePath).pipe(res)
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

      if (cfg.localOnly && !isLocalRequest(req)) {
        res.statusCode = 403
        res.end('Forbidden')
        return
      }

      if (!fs.existsSync(this.staticDir)) {
        res.statusCode = 404
        res.end('Web assets not found')
        return
      }

      const requestPath = decodeURIComponent(String(req.path || req.url || '/').split('?')[0])
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

      this.sendStaticFile(res, filePath)
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
    this.registerStatic(app, this.basePath)

    this.server = http.createServer((req, res) => app.handle(req, res))

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
