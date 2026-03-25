import { globalConfig } from '../core/ConfigManager.js'

/**
 * 设置配置数据（前端点确定后调用的方法）
 * @param {Object} data 配置数据
 * @param {Object} helpers 辅助对象，包含 Result 类
 * @returns {Promise<Object>} 设置结果
 */
export async function setConfigData(data, { Result }) {
  try {
    const success = globalConfig.setConfigData(data)
    if (!success) {
      return Result.error('保存配置失败，请查看日志')
    }

    return Result.ok({}, '保存成功~')
  } catch (err) {
    globalConfig.error('[发言统计] 保存配置失败:', err)
    return Result.error('保存失败: ' + (err.message || '未知错误'))
  }
}
