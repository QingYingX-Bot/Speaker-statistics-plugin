import { globalTemplate } from './templates/globalTemplate.js'
import { displayTemplate } from './templates/displayTemplate.js'
import { messageTemplate } from './templates/messageTemplate.js'
import { databaseTemplate } from './templates/databaseTemplate.js'
import { dataStorageTemplate } from './templates/dataStorageTemplate.js'
import { archivedGroupsTemplate } from './templates/archivedGroupsTemplate.js'
import { groupAnalysisTemplate } from './templates/groupAnalysisTemplate.js'

/**
 * 配置文件拆分映射
 * key 为配置根节点，value 为 data/config 下对应文件名
 */
const configFileMap = Object.freeze({
  global: 'global.json',
  display: 'display.json',
  message: 'message.json',
  database: 'database.json',
  dataStorage: 'storage.json',
  archivedGroups: 'archived-groups.json',
  groupAnalysis: 'group-analysis.json'
})

/**
 * 分段模板（按文件）
 */
const configFileTemplates = {
  global: globalTemplate,
  display: displayTemplate,
  message: messageTemplate,
  database: databaseTemplate,
  dataStorage: dataStorageTemplate,
  archivedGroups: archivedGroupsTemplate,
  groupAnalysis: groupAnalysisTemplate
}

/**
 * 聚合模板（对外兼容）
 */
const configTemplate = {
  ...configFileTemplates
}

export { configTemplate, configFileMap, configFileTemplates }
