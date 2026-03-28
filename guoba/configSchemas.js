import { getGlobalSchemas } from './schemas/global.js'
import { getDisplaySchemas } from './schemas/display.js'
import { getMessageSchemas } from './schemas/message.js'
import { getDatabaseSchemas } from './schemas/database.js'
import { getStorageSchemas } from './schemas/storage.js'
import { getArchivedGroupsSchemas } from './schemas/archivedGroups.js'
import { getGroupAnalysisSchemas } from './schemas/groupAnalysis.js'

/**
 * Guoba-Plugin 配置 Schemas
 * 按 data/config 下 7 个配置文件分组维护
 */
export function getConfigSchemas() {
  return [
    ...getGlobalSchemas(),
    ...getDisplaySchemas(),
    ...getMessageSchemas(),
    ...getDatabaseSchemas(),
    ...getStorageSchemas(),
    ...getArchivedGroupsSchemas(),
    ...getGroupAnalysisSchemas()
  ]
}
