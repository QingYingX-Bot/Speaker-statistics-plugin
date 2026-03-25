import fs from 'fs'
import path from 'path'
import YAML from 'yaml'

const proxyCache = {
    value: '',
    loadedAt: 0
}

const CACHE_TTL = 60 * 1000

function normalizeProxyUrl(proxyUrlRaw) {
    const raw = String(proxyUrlRaw || '').trim()
    if (!raw) return ''
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`
}

function readProxyFromFrameworkConfig(fileName) {
    try {
        const filePath = path.join(process.cwd(), 'config', fileName)
        if (!fs.existsSync(filePath)) return ''

        const rawYaml = fs.readFileSync(filePath, 'utf8')
        const parsed = YAML.parse(rawYaml) || {}

        const directProxy = normalizeProxyUrl(parsed.proxy)
        if (directProxy) return directProxy

        const nestedProxy = normalizeProxyUrl(parsed?.proxy?.proxyAddress || parsed?.proxyAddress)
        if (nestedProxy) return nestedProxy
    } catch {}

    return ''
}

/**
 * 读取框架代理配置（优先环境变量，其次 Discord.yaml，再次 Telegram.yaml）
 * @param {boolean} forceRefresh 是否强制刷新缓存
 * @returns {string}
 */
function getFrameworkProxyUrl(forceRefresh = false) {
    if (!forceRefresh && (Date.now() - proxyCache.loadedAt) < CACHE_TTL) {
        return proxyCache.value
    }

    let proxyUrl = normalizeProxyUrl(
        process.env.SPEAKER_STATISTICS_PROXY
        || process.env.DISCORD_PROXY
        || process.env.HTTPS_PROXY
        || process.env.HTTP_PROXY
        || ''
    )

    if (!proxyUrl) {
        proxyUrl = readProxyFromFrameworkConfig('Discord.yaml')
    }
    if (!proxyUrl) {
        proxyUrl = readProxyFromFrameworkConfig('Telegram.yaml')
    }

    proxyCache.value = proxyUrl
    proxyCache.loadedAt = Date.now()
    return proxyUrl
}

export {
    getFrameworkProxyUrl
}
