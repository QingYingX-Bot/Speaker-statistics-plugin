import path from 'path';
import fs from 'fs';
import { globalConfig } from '../core/ConfigManager.js';
import { PathResolver } from '../core/utils/PathResolver.js';

/**
 * 设置配置数据（前端点确定后调用的方法）
 * @param {Object} data 配置数据
 * @param {Object} helpers 辅助对象，包含 Result 类
 * @returns {Promise<Object>} 设置结果
 */
export async function setConfigData(data, { Result }) {
  try {
    // 分离普通配置和成就配置
    const otherData = {};
    const achievementsData = {};
    
    for (const [keyPath, value] of Object.entries(data)) {
      // 忽略系统默认成就，因为它只读
      if (keyPath === 'defaultAchievements') {
        // 默认成就不处理，跳过
      } else if (keyPath === 'customAchievements') {
        // 处理自定义成就
        if (Array.isArray(value) && value.length > 0) {
          value.forEach(achievement => {
            const id = achievement.id;
            if (id) {
              const conditionType = achievement.conditionType || '';
              
              // 构建条件对象，根据不同类型处理
              const condition = { type: conditionType };
              
              // 需要 start 和 end 的时间窗口类型
              if (conditionType === 'time_window') {
                condition.start = achievement.conditionValue || '';
                condition.end = achievement.conditionEnd || '';
              }
              // 需要 value 和 times 的文本包含次数类型
              else if (conditionType === 'text_contains_times') {
                condition.value = achievement.conditionValue || '';
                condition.times = achievement.conditionTimes || 1;
              }
              // 文本包含类型，只需要 value（字符串）
              else if (conditionType === 'text_contains') {
                condition.value = achievement.conditionValue || '';
              }
              // 不需要参数的时段类型
              else if (conditionType === 'night_time' || conditionType === 'morning_time' || conditionType === 'first_message') {
                // 这些类型不需要额外参数
              }
              // 其他类型都需要 value（数字）
              else {
                const numericValue = achievement.conditionValue;
                // 尝试转换为数字，如果是数字则转换，否则保持原值
                condition.value = (numericValue != null && numericValue !== '') 
                  ? (isNaN(numericValue) ? numericValue : Number(numericValue))
                  : 0;
              }
              
              achievementsData[id] = {
                id: id,
                name: achievement.name || '',
                description: achievement.description || '',
                rarity: achievement.rarity || 'common',
                category: achievement.category || 'basic',
                condition: condition
              };
            }
          });
        }
      } else if (keyPath === 'groupAchievements') {
        // 处理群专属成就
        const groupAchievementsByGroup = {};
        
        if (Array.isArray(value) && value.length > 0) {
          value.forEach(achievement => {
            const groupId = achievement.groupId;
            const id = achievement.id;
            
            if (groupId && id) {
              if (!groupAchievementsByGroup[groupId]) {
                groupAchievementsByGroup[groupId] = {};
              }
              
              const conditionType = achievement.conditionType || '';
              const condition = { type: conditionType };
              
              // 根据条件类型处理
              if (conditionType === 'time_window') {
                condition.start = achievement.conditionValue || '';
                condition.end = achievement.conditionEnd || '';
              } else if (conditionType === 'text_contains_times') {
                condition.value = achievement.conditionValue || '';
                condition.times = achievement.conditionTimes || 1;
              } else if (conditionType === 'text_contains') {
                condition.value = achievement.conditionValue || '';
              } else if (conditionType === 'night_time' || conditionType === 'morning_time' || conditionType === 'first_message') {
                // 无参数
              } else {
                const numericValue = achievement.conditionValue;
                condition.value = (numericValue != null && numericValue !== '') 
                  ? (isNaN(numericValue) ? numericValue : Number(numericValue))
                  : 0;
              }
              
              groupAchievementsByGroup[groupId][id] = {
                id: id,
                name: achievement.name || '',
                description: achievement.description || '',
                rarity: achievement.rarity || 'common',
                category: achievement.category || 'basic',
                condition: condition
              };
            }
          });
          
          // 保存每个群组的专属成就
          for (const [groupId, achievements] of Object.entries(groupAchievementsByGroup)) {
            const success = globalConfig.setGroupAchievementsConfig(groupId, achievements);
            if (!success) {
              return Result.fail(`保存群组 ${groupId} 专属成就失败，请查看日志`);
            }
          }
        } else {
          // 如果群专属成就列表为空，需要清空所有群组配置
          const configDir = PathResolver.getConfigDir();
          const groupDir = path.join(configDir, 'achievements', 'group');
          
          if (fs.existsSync(groupDir)) {
            const groups = fs.readdirSync(groupDir, { withFileTypes: true })
              .filter(dirent => dirent.isDirectory())
              .map(dirent => dirent.name);
            
            for (const groupId of groups) {
              globalConfig.setGroupAchievementsConfig(groupId, {});
            }
          }
        }
      } else {
        otherData[keyPath] = value;
      }
    }
    
    // 保存普通配置
    if (Object.keys(otherData).length > 0) {
      const success = globalConfig.setConfigData(otherData);
      if (!success) {
        return Result.fail('保存配置失败，请查看日志');
      }
    }
    
    // 保存成就配置
    if (Object.keys(achievementsData).length > 0) {
      const success = globalConfig.setUserAchievementsConfig(achievementsData);
      if (!success) {
        return Result.fail('保存成就配置失败，请查看日志');
      }
    } else {
      // 如果成就列表为空，清空自定义成就文件
      globalConfig.setUserAchievementsConfig({});
    }
    
    return Result.ok({}, '保存成功~');
  } catch (error) {
    globalConfig.error('[发言统计] 保存配置失败:', error);
    return Result.fail('保存失败: ' + (error.message || '未知错误'));
  }
}

