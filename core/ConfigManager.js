import fs from 'fs'
import path from 'path'
import { PathResolver } from './utils/PathResolver.js'
import { configTemplate, configFileMap, configFileTemplates } from '../config/configTemplate.js'

const LOG_PREFIX = '[发言统计]'
const LOGGER_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'mark']

function withPrefix(args = []) {
  if (args.length === 0) return [LOG_PREFIX]
  if (typeof args[0] === 'string') {
    return [`${LOG_PREFIX} ${args[0]}`, ...args.slice(1)]
  }
  return [LOG_PREFIX, ...args]
}

function fallbackLog(level, args = []) {
  const payload = withPrefix(args)
  if (level === 'warn') return console.warn(...payload)
  if (level === 'error' || level === 'fatal') return console.error(...payload)
  return console.log(...payload)
}

function emitLog(level, args = []) {
  const current = global.logger
  const fn = current?.[level]
  if (typeof fn === 'function') {
    return fn(...withPrefix(args))
  }
  return fallbackLog(level, args)
}

const logger = {}
for (const level of LOGGER_LEVELS) {
  logger[level] = (...args) => emitLog(level, args)
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function deepClone(value) {
  if (value === undefined) return undefined
  return JSON.parse(JSON.stringify(value))
}

function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override === undefined ? deepClone(base) : deepClone(override)
  }

  if (!isPlainObject(base) || !isPlainObject(override)) {
    if (override === undefined) return deepClone(base)
    return deepClone(override)
  }

  const result = deepClone(base)
  for (const [key, value] of Object.entries(override)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMerge(result[key], value)
    } else {
      result[key] = deepClone(value)
    }
  }
  return result
}

/**
 * 深度比较两个对象是否相等
 * @param {any} obj1 对象1
 * @param {any} obj2 对象2
 * @returns {boolean} 是否相等
 */
function deepEqual(obj1, obj2) {
  if (obj1 === obj2) return true
  if (obj1 == null || obj2 == null) return false
  if (typeof obj1 !== typeof obj2) return false

  if (typeof obj1 !== 'object') return obj1 === obj2

  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false

  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) return false
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i])) return false
    }
    return true
  }

  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  if (keys1.length !== keys2.length) return false

  for (const key of keys1) {
    if (!keys2.includes(key)) return false
    if (!deepEqual(obj1[key], obj2[key])) return false
  }

  return true
}

function getByPath(source, keyPath) {
  if (!keyPath) return source
  const keys = String(keyPath).split('.')
  let cursor = source
  for (const key of keys) {
    if (!cursor || typeof cursor !== 'object') return undefined
    cursor = cursor[key]
  }
  return cursor
}

function setByPath(target, keyPath, value) {
  const keys = String(keyPath).split('.')
  let cursor = target

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!isPlainObject(cursor[key])) {
      cursor[key] = {}
    }
    cursor = cursor[key]
  }

  cursor[keys[keys.length - 1]] = value
}

/**
 * 全局配置管理类
 * 配置按文件拆分在 data/config 下：
 * - global.json
 * - display.json
 * - message.json
 * - database.json
 * - storage.json
 * - archived-groups.json
 * - group-analysis.json
 */
class ConfigManager {
  constructor() {
    this.dataDir = PathResolver.getDataDir()
    this.configDir = path.join(this.dataDir, 'config')

    this.configPaths = {}
    for (const [section, fileName] of Object.entries(configFileMap)) {
      this.configPaths[section] = path.join(this.configDir, fileName)
    }
    this.activeConfigFileNames = new Set(Object.values(configFileMap))

    this.config = null
    this.watcher = null
    this.reloadTimeout = null
    this.lastSnapshot = ''
    this.splitConfigInitialized = false

    this.initConfig()
    this.startWatching()
  }

  /**
   * 获取默认配置
   * @returns {Object} 默认配置对象
   */
  getDefaultConfig() {
    return deepClone(configTemplate)
  }

  /**
   * 获取某个配置分段默认值
   * @param {string} section 配置分段名
   * @returns {Object}
   */
  getDefaultSection(section) {
    return deepClone(configFileTemplates[section] || {})
  }

  /**
   * 配置快照
   * @param {Object} cfg 配置
   * @returns {string}
   */
  snapshot(cfg) {
    try {
      return JSON.stringify(cfg || {})
    } catch {
      return ''
    }
  }

  /**
   * 读取 JSON 文件
   * @param {string} filePath 文件路径
   * @param {Object} fallback 默认值
   * @returns {Object}
   */
  readJsonFile(filePath, fallback = {}) {
    try {
      if (!fs.existsSync(filePath)) return deepClone(fallback)
      const raw = fs.readFileSync(filePath, 'utf8').trim()
      if (!raw) return deepClone(fallback)
      const parsed = JSON.parse(raw)
      return isPlainObject(parsed) ? parsed : deepClone(fallback)
    } catch (err) {
      this.error(`读取配置文件失败: ${filePath}`, err)
      return deepClone(fallback)
    }
  }

  /**
   * 写入 JSON 文件
   * @param {string} filePath 文件路径
   * @param {Object} data 数据
   */
  writeJsonFile(filePath, data) {
    const dirPath = path.dirname(filePath)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  }

  /**
   * 读取现有拆分配置（仅读取已存在文件）
   * @returns {Object}
   */
  readExistingSplitConfig() {
    const merged = {}
    for (const section of Object.keys(configFileMap)) {
      const filePath = this.configPaths[section]
      if (!fs.existsSync(filePath)) continue
      merged[section] = this.readJsonFile(filePath, {})
    }
    return merged
  }

  /**
   * 初始化拆分配置文件
   */
  initSplitConfigFiles() {

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true })
    }
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true })
    }

    let seedConfig = this.getDefaultConfig()
    const existingSplit = this.readExistingSplitConfig()
    seedConfig = deepMerge(seedConfig, existingSplit)

    // 补齐缺失的分段配置文件
    for (const section of Object.keys(configFileMap)) {
      const filePath = this.configPaths[section]
      if (fs.existsSync(filePath)) continue

      const sectionValue = deepMerge(
        this.getDefaultSection(section),
        seedConfig[section] || {}
      )
      this.writeJsonFile(filePath, sectionValue)
    }

    this.splitConfigInitialized = true
  }

  /**
   * 初始化配置
   */
  initConfig() {
    try {
      this.initSplitConfigFiles()
      this.config = this.loadConfig()
      this.lastSnapshot = this.snapshot(this.config)

      if (this.config?.global?.debugLog) {
        this.debug(`配置目录: ${this.configDir}`)
      }
    } catch (err) {
      this.error('初始化配置失败:', err)
      this.config = this.getDefaultConfig()
      this.lastSnapshot = this.snapshot(this.config)
    }
  }

  /**
   * 开始监听配置文件变化
   */
  startWatching() {
    this.stopWatching()

    this.initSplitConfigFiles()

    try {
      this.watcher = fs.watch(this.configDir, (eventType, filename) => {
        const name = typeof filename === 'string' ? filename : filename?.toString?.() || ''
        if (!name.endsWith('.json')) return
        if (!this.activeConfigFileNames.has(name)) return
        if (eventType !== 'change' && eventType !== 'rename') return

        if (this.reloadTimeout) {
          clearTimeout(this.reloadTimeout)
        }

        this.reloadTimeout = setTimeout(() => {
          this.reloadConfig()
        }, 500)
      })

      if (this.config?.global?.debugLog) {
        this.debug('已启动多文件配置监听')
      }
    } catch (err) {
      this.error('启动配置文件监听失败:', err)
    }
  }

  /**
   * 停止监听
   */
  stopWatching() {
    if (this.reloadTimeout) {
      clearTimeout(this.reloadTimeout)
      this.reloadTimeout = null
    }
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }

  /**
   * 重新加载配置
   */
  reloadConfig() {
    try {
      const nextConfig = this.loadConfig()
      const nextSnapshot = this.snapshot(nextConfig)

      if (nextSnapshot === this.lastSnapshot) {
        return
      }

      const prevConfig = this.config
      this.config = nextConfig
      this.lastSnapshot = nextSnapshot

      if (this.config?.global?.debugLog && !deepEqual(prevConfig, nextConfig)) {
        this.debug('检测到配置文件变化，已完成重载')
      }
    } catch (err) {
      this.error('重新加载配置失败:', err)
    }
  }

  /**
   * 加载配置文件
   * @returns {Object} 配置对象
   */
  loadConfig() {
    if (!this.splitConfigInitialized) {
      this.initSplitConfigFiles()
    }

    const defaults = this.getDefaultConfig()
    const merged = {}

    for (const section of Object.keys(configFileMap)) {
      const filePath = this.configPaths[section]
      const fileData = this.readJsonFile(filePath, {})
      merged[section] = deepMerge(defaults[section] || {}, fileData)
    }

    return merged
  }

  /**
   * 保存全部配置到拆分文件
   * @param {Object} config 配置对象
   */
  saveConfig(config) {
    try {
      this.stopWatching()

      const normalized = deepMerge(this.getDefaultConfig(), config || {})

      for (const section of Object.keys(configFileMap)) {
        const filePath = this.configPaths[section]
        const sectionData = deepMerge(this.getDefaultSection(section), normalized[section] || {})
        this.writeJsonFile(filePath, sectionData)
      }

      this.config = normalized
      this.lastSnapshot = this.snapshot(this.config)

      this.startWatching()

      if (this.config?.global?.debugLog) {
        this.debug('配置保存成功（多文件）')
      }
    } catch (err) {
      this.error('保存配置失败:', err)
      throw err
    }
  }

  /**
   * 更新配置
   * @param {string} key 配置键
   * @param {any} value 配置值
   */
  updateConfig(key, value) {
    try {
      const config = this.loadConfig()
      setByPath(config, key, value)
      this.saveConfig(config)

      if (key === 'debugLog' || key === 'global.debugLog' || this.config?.global?.debugLog) {
        this.debug(`更新配置 ${key}: ${value}`)
      }
    } catch (err) {
      this.error('更新配置失败:', err)
      throw err
    }
  }

  /**
   * 手动刷新配置（用于需要获取最新配置时）
   */
  refreshConfig() {
    try {
      const nextConfig = this.loadConfig()
      const prevConfig = this.config

      this.config = nextConfig
      this.lastSnapshot = this.snapshot(nextConfig)

      if (this.config?.global?.debugLog && !deepEqual(prevConfig, nextConfig)) {
        this.debug('配置刷新完成，检测到配置变化')
      }
    } catch (err) {
      this.error('刷新配置失败:', err)
    }
  }

  /**
   * 获取配置值
   * @param {string} key 配置键
   * @param {boolean} forceRefresh 是否强制刷新配置
   * @returns {any} 配置值
   */
  getConfig(key, forceRefresh = false) {
    if (!this.config) {
      this.initConfig()
    }

    if (forceRefresh) {
      this.refreshConfig()
    }

    if (!key) {
      return this.config
    }

    return getByPath(this.config, key)
  }

  /**
   * 记录调试日志
   * @param {string} message 日志消息
   * @param {any[]} args 额外参数
   */
  debug(message, ...args) {
    if (this.config?.global?.debugLog) {
      emitLog('mark', [message, ...args])
    }
  }

  /**
   * 记录警告日志（总是记录，不受debugLog控制）
   * @param {string} message 日志消息
   * @param {any[]} args 额外参数
   */
  warn(message, ...args) {
    emitLog('warn', [message, ...args])
  }

  /**
   * 记录错误日志（总是记录，不受debugLog控制）
   * @param {string} message 日志消息
   * @param {any[]} args 额外参数
   */
  error(message, ...args) {
    emitLog('error', [message, ...args])
  }

  /**
   * 记录普通信息日志（总是记录）
   * @param {string} message 日志消息
   * @param {any[]} args 额外参数
   */
  info(message, ...args) {
    emitLog('info', [message, ...args])
  }

  /**
   * 记录 mark 级日志（总是记录）
   * @param {string} message 日志消息
   * @param {any[]} args 额外参数
   */
  mark(message, ...args) {
    emitLog('mark', [message, ...args])
  }

  /**
   * 记录配置访问日志（仅在需要调试时使用）
   * @param {string} key 配置键
   * @param {any} value 配置值
   */
  logConfigAccess(key, value) {
    if (this.config?.global?.debugLog) {
      this.debug(`获取配置 ${key}: ${value}`)
    }
  }

  /**
   * 手动触发配置重载（用于测试）
   */
  forceReload() {
    emitLog('info', ['开始强制重载配置...'])
    this.reloadConfig()
    emitLog('info', ['配置重载完成'])
    return this.config
  }

  /**
   * 批量设置配置数据（用于锅巴配置界面）
   * @param {Object} data 配置数据对象
   */
  setConfigData(data) {
    try {
      const config = this.loadConfig()

      for (const [keyPath, value] of Object.entries(data || {})) {
        if (keyPath.includes('.')) {
          setByPath(config, keyPath, value)
          continue
        }

        if (isPlainObject(value) && isPlainObject(config[keyPath])) {
          config[keyPath] = deepMerge(config[keyPath], value)
        } else {
          config[keyPath] = value
        }
      }

      this.saveConfig(config)

      if (this.config?.global?.debugLog) {
        this.debug('批量设置配置成功')
      }

      return true
    } catch (err) {
      this.error('批量设置配置失败:', err)
      return false
    }
  }
}

const globalConfig = new ConfigManager()
export { globalConfig, ConfigManager, logger }
export default globalConfig
