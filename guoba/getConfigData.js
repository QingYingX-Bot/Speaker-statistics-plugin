import { globalConfig } from '../core/ConfigManager.js'

/**
 * 获取配置数据（用于前端填充显示数据）
 * @returns {Promise<Object>} 配置数据
 */
export async function getConfigData() {
  try {
    const config = globalConfig.getConfig(undefined, true)

    const {
      global,
      display,
      message,
      database,
      dataStorage,
      archivedGroups,
      groupAnalysis
    } = config

    return {
      global,
      display,
      message,
      database,
      dataStorage,
      archivedGroups,
      groupAnalysis
    }
  } catch (err) {
    globalConfig.error('[发言统计] 获取配置失败:', err)
    return {}
  }
}
