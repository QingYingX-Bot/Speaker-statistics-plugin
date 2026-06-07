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

export function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
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
    use(routePath, handler) {
      routes.push({ method: 'USE', routePath, handler })
    },
    handle(req, res) {
      const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
      req.originalUrl = req.url || '/'
      req.query = Object.fromEntries(parsedUrl.searchParams.entries())
      req.path = parsedUrl.pathname

      for (const route of routes) {
        if (route.method === 'GET' && req.method === 'GET' && parsedUrl.pathname === route.routePath) {
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
