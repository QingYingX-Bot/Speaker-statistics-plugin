/**
 * 水群分析配置适配器
 * 统一读取主插件 data/config/group-analysis.json（经 ConfigManager 聚合后的 groupAnalysis 节点）
 */
import { globalConfig } from '../ConfigManager.js'
import { logger } from '#lib'

class Config {
  constructor() {
    this.config = null
    this.callbacks = []
    this.watcher = null
    this.lastSnapshot = ''
  }

  async load() {
    this.config = this._read()
    this.lastSnapshot = this._snapshot(this.config)
    return this.config
  }

  _read() {
    return globalConfig.getConfig('groupAnalysis') || {}
  }

  _snapshot(cfg) {
    try {
      return JSON.stringify(cfg || {})
    } catch {
      return ''
    }
  }

  watch(intervalMs = 3000) {
    if (this.watcher) return

    this.watcher = setInterval(async () => {
      const next = this._read()
      const nextSnapshot = this._snapshot(next)
      if (nextSnapshot === this.lastSnapshot) return

      const oldConfig = this.config
      this.config = next
      this.lastSnapshot = nextSnapshot

      for (const callback of this.callbacks) {
        try {
          await callback(this.config, oldConfig)
        } catch (err) {
          logger.error(`配置变更回调执行失败: ${err?.message || err}`)
        }
      }
    }, intervalMs)
  }

  onChange(callback) {
    this.callbacks.push(callback)
  }

  stop() {
    if (this.watcher) {
      clearInterval(this.watcher)
      this.watcher = null
    }
  }

  get() {
    // 每次读取最新配置，保证与 data/config 配置同步
    this.config = this._read()
    return this.config
  }
}

const configInstance = new Config()
export default configInstance
