import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readFileSync } from 'node:fs'
import { getDatabaseService } from './core/database/DatabaseService.js'
import {
  Config as analysisConfig,
  getMessageCollector,
  reinitializeServices,
  stopAllServices
} from './core/services/index.js'

// 获取插件目录和 package.json
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const packageJsonPath = path.join(__dirname, 'package.json')

let packageJson
try {
  packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
} catch (err) {
  global.logger.error('[发言统计] 读取 package.json 失败:', err)
  packageJson = { version: '5.0.0' }
}

const version = packageJson.version

// 1) 初始化数据库（主插件强依赖）
const dbService = getDatabaseService()
try {
  await dbService.initialize()
} catch (err) {
  const errorMsg = err.message || '数据库初始化失败'
  global.logger.error('[发言统计] ' + errorMsg)
  throw errorMsg
}

// 2) 启动水群分析配置与服务生命周期
try {
  await analysisConfig.load()
  analysisConfig.watch()
  analysisConfig.onChange(async (newConfig) => {
    await reinitializeServices(newConfig)
    global.logger.mark('[发言统计] 水群分析配置变更，服务已重载')
  })

  const gi = analysisConfig.get() || {}
  if (gi.enabled !== false && gi.messageCollection?.enabled !== false) {
    await getMessageCollector()
  }
} catch (err) {
  global.logger.error('[发言统计] 水群分析初始化失败:', err)
}

try {
  const { globalConfig } = await import('./core/ConfigManager.js')
  const dbConfig = globalConfig.getConfig('database') || {}
  const dbType = (dbConfig.type || 'postgresql').toLowerCase()
  const dbTypeName = dbType === 'sqlite' ? 'SQLite' : 'PostgreSQL'

  global.logger.info('[发言统计] ---------^_^---------')
  global.logger.info(`[发言统计] 发言统计插件 v${version} 初始化成功~`)
  global.logger.info(`[发言统计] 使用${dbTypeName}数据库存储`)
  global.logger.info('[发言统计] 支持功能：总榜、日榜、周榜、月榜、个人统计、僵尸群清理、水群分析、水群词云')
  global.logger.info('[发言统计] ---------^_^---------')
} catch (err) {
  global.logger.error('[发言统计] 插件初始化失败:', err)
}

// 3) apps 风格加载（参考 endfield 风格）
const appsDir = path.join(__dirname, 'apps')
const files = fs.readdirSync(appsDir).filter((file) => file.endsWith('.js'))
const modules = await Promise.allSettled(
  files.map((file) => import(pathToFileURL(path.join(appsDir, file)).href))
)

const apps = {}
for (let i = 0; i < files.length; i++) {
  const file = files[i]
  const loaded = modules[i]

  if (loaded.status !== 'fulfilled') {
    global.logger.error(`[发言统计] 载入应用失败: ${file}`)
    global.logger.error(loaded.reason)
    continue
  }

  const exportsMap = loaded.value || {}
  const classExport = Object.entries(exportsMap).find(([, value]) => typeof value === 'function' && value.prototype)
  if (!classExport) {
    global.logger.warn(`[发言统计] 应用文件未导出类，已跳过: ${file}`)
    continue
  }

  const appName = file.replace(/\.js$/, '')
  apps[appName] = classExport[1]
}

process.on('exit', () => {
  stopAllServices()
  analysisConfig.stop()
})

export { apps }
