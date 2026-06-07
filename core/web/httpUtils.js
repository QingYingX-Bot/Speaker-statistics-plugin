import { isIP } from 'node:net'

export const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
}

export function normalizeMountPath(value, fallback) {
  const raw = String(value || fallback || '').trim()
  if (!raw) return fallback
  const normalized = raw.startsWith('/') ? raw : `/${raw}`
  const withoutTrailing = normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized
  return withoutTrailing || '/'
}

export function normalizeUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return raw.endsWith('/') ? raw : `${raw}/`
}

export function isLocalRequest(req) {
  const rawAddress = String(
    req?.ip
    || req?.socket?.remoteAddress
    || req?.connection?.remoteAddress
    || ''
  )

  const address = rawAddress.replace(/^::ffff:/, '')
  return address === '127.0.0.1'
    || address === '::1'
    || address === 'localhost'
    || address === ''
}

export function getRequestHost(req) {
  const raw = String(req?.headers?.host || '').trim().toLowerCase()
  if (!raw) return ''

  if (raw.startsWith('[')) {
    const endIndex = raw.indexOf(']')
    return endIndex > 0 ? raw.slice(1, endIndex) : raw
  }

  return raw.split(':')[0]
}

export function isPrivateAddress(value) {
  const host = String(value || '').trim().toLowerCase().replace(/^::ffff:/, '')
  if (!host || host === 'localhost' || host === '::1') return true

  if (isIP(host) === 4) {
    const parts = host.split('.').map(part => Number(part))
    if (parts.length !== 4 || parts.some(part => !Number.isInteger(part))) return false
    const [a, b] = parts
    return a === 10
      || a === 127
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 169 && b === 254)
  }

  if (isIP(host) === 6) {
    return host.startsWith('fc')
      || host.startsWith('fd')
      || host.startsWith('fe80:')
  }

  return false
}

export function isPrivateHostRequest(req) {
  return isPrivateAddress(getRequestHost(req))
}

export function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

export function createHttpError(status, message) {
  const err = new Error(message)
  err.statusCode = status
  return err
}

export function readJsonBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let total = 0

    req.on('data', chunk => {
      total += chunk.length
      if (total > maxBytes) {
        reject(createHttpError(413, '请求内容过大'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })

    req.on('error', err => reject(err))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim()
      if (!raw) return resolve({})

      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(createHttpError(400, '请求 JSON 格式无效'))
      }
    })
  })
}

export function parsePositiveInt(value, fallback, min = 1, max = 100) {
  const parsed = parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < min) return fallback
  return Math.min(parsed, max)
}

export function normalizeHost(value) {
  const raw = String(value || '').trim()
  return raw || '127.0.0.1'
}

export function getPublicHost(host) {
  if (host === '0.0.0.0' || host === '::') return 'localhost'
  return host
}

export function createMiniApp() {
  const routes = []

  const addRoute = (method, routePath, handler) => {
    routes.push({ method, routePath, handler })
  }

  return {
    get(routePath, handler) {
      addRoute('GET', routePath, handler)
    },
    post(routePath, handler) {
      addRoute('POST', routePath, handler)
    },
    delete(routePath, handler) {
      addRoute('DELETE', routePath, handler)
    },
    use(routePath, handler) {
      routes.push({ method: 'USE', routePath, handler })
    },
    handle(req, res) {
      const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
      req.originalUrl = req.url || '/'
      req.query = Object.fromEntries(parsedUrl.searchParams.entries())
      req.path = parsedUrl.pathname

      for (const route of routes) {
        if (route.method === req.method && parsedUrl.pathname === route.routePath) {
          return route.handler(req, res)
        }

        const useBase = route.routePath === '/' ? '/' : route.routePath.replace(/\/+$/, '')
        const isUseMatch = useBase === '/'
          || parsedUrl.pathname === useBase
          || parsedUrl.pathname.startsWith(`${useBase}/`)
        if (route.method === 'USE' && isUseMatch) {
          const prefix = useBase
          const nextPath = useBase === '/' ? parsedUrl.pathname : (parsedUrl.pathname.slice(prefix.length) || '/')
          req.path = nextPath.startsWith('/') ? nextPath : `/${nextPath}`
          return route.handler(req, res)
        }
      }

      res.statusCode = 404
      res.end('Not found')
    }
  }
}

export function formatBytes(bytes) {
  const value = Number(bytes || 0)
  if (!Number.isFinite(value) || value <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = value
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}
