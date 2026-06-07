import {
  createHttpError,
  formatBytes,
  parsePositiveInt,
  readJsonBody,
  sendJson
} from './httpUtils.js'
import { backgroundService } from '../services/BackgroundService.js'
import { getClientIp, logWebAccess } from './WebAccessLogger.js'

class BackgroundAdminController {
  constructor() {
    this.backgroundService = backgroundService
  }

  register(app, apiBasePath, webServer) {
    app.get(`${apiBasePath}/backgrounds`, (req, res) => {
      webServer.apiHandler((request) => this.listBackgrounds(request), req, res)
    })

    app.get(`${apiBasePath}/backgrounds/image`, (req, res) => {
      this.sendBackgroundImage(req, res, webServer)
    })

    app.post(`${apiBasePath}/backgrounds/apply`, (req, res) => {
      webServer.apiHandler((request, cfg) => this.applyBackground(request, cfg), req, res)
    })

    app.delete(`${apiBasePath}/backgrounds`, (req, res) => {
      webServer.apiHandler((request, cfg) => this.deleteBackground(request, cfg), req, res)
    })
  }

  toItem(record) {
    const userId = String(record.userId || '')
    const query = new URLSearchParams({ userId })
    if (record.modifiedMs) query.set('t', String(Math.round(record.modifiedMs)))
    return {
      userId,
      fileBase: record.fileBase || userId,
      size: record.size || 0,
      sizeText: formatBytes(record.size),
      mimeType: record.mimeType || '',
      modifiedAt: record.modifiedAt || '',
      imageUrl: `./api/backgrounds/image?${query.toString()}`
    }
  }

  listBackgrounds(req) {
    const page = parsePositiveInt(req.query?.page, 1, 1, 9999)
    const pageSize = parsePositiveInt(req.query?.pageSize, 20, 1, 100)
    const search = String(req.query?.search || '').trim()
    const allItems = this.backgroundService.listRankingBackgrounds(search)
    const start = (page - 1) * pageSize
    const items = allItems.slice(start, start + pageSize).map(record => this.toItem(record))

    return {
      items,
      currentPage: page,
      pageSize,
      total: allItems.length,
      totalPages: Math.ceil(allItems.length / pageSize)
    }
  }

  async applyBackground(req, cfg) {
    const maxImageBytes = cfg.backgroundEditor.maxImageMB * 1024 * 1024
    const bodyLimit = Math.ceil(maxImageBytes * 1.5) + 64 * 1024
    const body = await readJsonBody(req, bodyLimit)
    const userId = String(body.userId || '').trim()
    if (!userId) throw createHttpError(400, '缺少用户 ID')

    let saved
    try {
      saved = this.backgroundService.saveRankingBackground(
        userId,
        body.imageBase64,
        body.mimeType,
        maxImageBytes
      )
    } catch (err) {
      throw createHttpError(400, err?.message || '背景图片保存失败')
    }

    logWebAccess(cfg, `管理端背景保存: user=${userId}, size=${formatBytes(saved.size)}, mimeType=${saved.mimeType}, ip=${getClientIp(req)}`)
    return this.toItem({
      userId,
      fileBase: this.backgroundService.getUserFileBase(userId),
      size: saved.size,
      mimeType: saved.mimeType,
      modifiedAt: new Date().toISOString(),
      modifiedMs: Date.now()
    })
  }

  async deleteBackground(req, cfg) {
    const body = await readJsonBody(req, 64 * 1024)
    const userId = String(body.userId || req.query?.userId || '').trim()
    if (!userId) throw createHttpError(400, '缺少用户 ID')

    const deleted = this.backgroundService.deleteRankingBackground(userId)
    logWebAccess(cfg, `管理端背景删除: user=${userId}, deleted=${deleted}, ip=${getClientIp(req)}`)
    return { userId, deleted }
  }

  sendBackgroundImage(req, res, webServer) {
    const cfg = webServer.getConfig()
    if (!webServer.requireAccess(req, res, cfg)) return

    try {
      const userId = String(req.query?.userId || '').trim()
      if (!userId) throw createHttpError(400, '缺少用户 ID')

      const image = this.backgroundService.getRankingBackgroundBuffer(userId)
      if (!image) {
        sendJson(res, 404, { ok: false, message: '背景图片不存在' })
        return
      }

      res.statusCode = 200
      res.setHeader('Content-Type', image.mimeType)
      res.setHeader('Cache-Control', 'no-store')
      res.end(image.buffer)
    } catch (err) {
      sendJson(res, Number(err?.statusCode || 500), { ok: false, message: err?.message || '请求失败' })
    }
  }
}

const backgroundAdminController = new BackgroundAdminController()

export { BackgroundAdminController, backgroundAdminController }
export default backgroundAdminController
