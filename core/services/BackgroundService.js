import fs from 'fs'
import path from 'path'
import { PathResolver } from '../utils/PathResolver.js'
import { globalConfig } from '../ConfigManager.js'

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
}

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
}

class BackgroundService {
  constructor() {
    this.backgroundsDir = PathResolver.getBackgroundsDir()
    this.rankingDir = PathResolver.getBackgroundsDir('ranking')
  }

  normalizeUserId(userId) {
    return String(userId || '').trim()
  }

  getUserFileBase(userId) {
    const normalized = this.normalizeUserId(userId)
    if (!normalized) return ''
    if (/^[A-Za-z0-9_-]+$/.test(normalized)) return normalized
    return Buffer.from(normalized).toString('base64url')
  }

  getRankingPath(userId, ext = '.jpg') {
    const fileBase = this.getUserFileBase(userId)
    if (!fileBase) return ''
    return path.join(this.rankingDir, `${fileBase}${ext}`)
  }

  findRankingBackground(userId) {
    const fileBase = this.getUserFileBase(userId)
    if (!fileBase) return null

    for (const ext of Object.keys(MIME_BY_EXT)) {
      const filePath = path.join(this.rankingDir, `${fileBase}${ext}`)
      if (fs.existsSync(filePath)) {
        return { path: filePath, ext, mimeType: MIME_BY_EXT[ext] }
      }
    }

    return null
  }

  getRankingBackgroundInfo(userId) {
    const background = this.findRankingBackground(userId)
    if (!background) return { exists: false }

    const stats = fs.statSync(background.path)
    return {
      exists: true,
      size: stats.size,
      mimeType: background.mimeType,
      modifiedAt: stats.mtime.toISOString()
    }
  }

  listRankingBackgrounds(search = '') {
    const keyword = String(search || '').trim().toLowerCase()
    if (!fs.existsSync(this.rankingDir)) return []

    const records = new Map()
    for (const fileName of fs.readdirSync(this.rankingDir)) {
      const ext = path.extname(fileName).toLowerCase()
      if (!MIME_BY_EXT[ext]) continue

      const fileBase = path.basename(fileName, ext)
      if (keyword && !fileBase.toLowerCase().includes(keyword)) continue

      const filePath = path.join(this.rankingDir, fileName)
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) continue

      const stats = fs.statSync(filePath)
      const current = records.get(fileBase)
      if (current && current.modifiedMs >= stats.mtimeMs) continue

      records.set(fileBase, {
        userId: fileBase,
        fileBase,
        size: stats.size,
        mimeType: MIME_BY_EXT[ext],
        modifiedAt: stats.mtime.toISOString(),
        modifiedMs: stats.mtimeMs
      })
    }

    return [...records.values()].sort((left, right) => right.modifiedMs - left.modifiedMs)
  }

  getRankingBackgroundBuffer(userId) {
    const background = this.findRankingBackground(userId)
    if (!background) return null
    return {
      ...background,
      buffer: fs.readFileSync(background.path)
    }
  }

  getRankingBackgroundStyle(userId) {
    const background = this.getRankingBackgroundBuffer(userId)
    if (!background) return { style: '', hasBackground: false }

    try {
      const base64Image = background.buffer.toString('base64')
      return {
        style: `background-image: url(data:${background.mimeType};base64,${base64Image}) !important;`,
        hasBackground: true
      }
    } catch (err) {
      globalConfig.error(`读取排行榜背景失败: ${userId}`, err)
      return { style: '', hasBackground: false }
    }
  }

  parseImageInput(imageBase64, mimeType) {
    const raw = String(imageBase64 || '').trim()
    const matched = raw.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i)
    if (matched) {
      return {
        mimeType: matched[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : matched[1].toLowerCase(),
        base64: matched[2]
      }
    }

    return {
      mimeType: String(mimeType || '').toLowerCase(),
      base64: raw
    }
  }

  detectMimeType(buffer) {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg'
    }
    if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return 'image/png'
    }
    if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
      return 'image/webp'
    }
    return ''
  }

  deleteRankingBackground(userId) {
    let deleted = false
    const fileBase = this.getUserFileBase(userId)
    if (!fileBase) return false

    for (const ext of Object.keys(MIME_BY_EXT)) {
      const filePath = path.join(this.rankingDir, `${fileBase}${ext}`)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        deleted = true
      }
    }

    return deleted
  }

  saveRankingBackground(userId, imageBase64, mimeType, maxBytes) {
    const normalizedUserId = this.normalizeUserId(userId)
    if (!normalizedUserId) throw new Error('用户信息无效')

    const parsed = this.parseImageInput(imageBase64, mimeType)
    if (!parsed.base64) throw new Error('缺少背景图片')

    const buffer = Buffer.from(parsed.base64, 'base64')
    if (buffer.length <= 0) throw new Error('背景图片为空')
    if (maxBytes && buffer.length > maxBytes) throw new Error(`背景图片超过 ${Math.round(maxBytes / 1024 / 1024)}MB`)

    const detectedMime = this.detectMimeType(buffer)
    if (!detectedMime) throw new Error('图片文件格式无效')

    const finalMime = detectedMime || parsed.mimeType
    const ext = EXT_BY_MIME[finalMime]
    if (!ext) throw new Error('仅支持 JPG、PNG、WebP 图片')

    PathResolver.ensureDirectory(this.rankingDir)
    this.deleteRankingBackground(normalizedUserId)

    const outputPath = this.getRankingPath(normalizedUserId, ext)
    fs.writeFileSync(outputPath, buffer)

    return {
      exists: true,
      size: buffer.length,
      mimeType: finalMime,
      path: outputPath
    }
  }
}

const backgroundService = new BackgroundService()

export { BackgroundService, backgroundService }
export default backgroundService
