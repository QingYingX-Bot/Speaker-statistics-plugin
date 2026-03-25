import { globalConfig } from '../core/ConfigManager.js'

/**
 * 获取配置数据（用于前端填充显示数据）
 * @returns {Promise<Object>} 配置数据
 */
export async function getConfigData() {
  try {
    const config = globalConfig.getConfig()

    const {
      global,
      display,
      message,
      backgroundServer,
      database,
      dataStorage,
      archivedGroups
    } = config

    return {
      global,
      display,
      message,
      backgroundServer,
      database,
      dataStorage,
      archivedGroups
    }
  } catch (err) {
    globalConfig.error('[发言统计] 获取配置失败:', err)
    return {}
  }
}
