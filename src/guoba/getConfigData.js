import path from 'path';
import fs from 'fs';
import { globalConfig } from '../core/ConfigManager.js';
import { PathResolver } from '../core/utils/PathResolver.js';

/**
 * 获取配置数据（用于前端填充显示数据）
 * @returns {Promise<Object>} 配置数据
 */
export async function getConfigData() {
  try {
    const config = globalConfig.getConfig();
    
    // 获取系统默认成就并转换为表单格式
    const defaultAchievements = globalConfig.getDefaultAchievementsConfig();
    const defaultAchievementsList = Object.entries(defaultAchievements.achievements || {}).map(([id, achievement]) => {
      const condition = achievement.condition || {};
      
      return {
        id: achievement.id || id,
        name: achievement.name || '',
        description: achievement.description || '',
        rarity: achievement.rarity || 'common',
        category: achievement.category || 'basic',
        conditionType: condition.type || '',
        conditionValue: condition.value || 0
      };
    });
    
    // 获取用户成就（来自 users.json）并转换为表单格式
    const usersAchievements = globalConfig.getUsersAchievementsConfig();
    const userAchievementsList = Object.entries(usersAchievements).map(([id, achievement]) => {
      const condition = achievement.condition || {};
      const conditionType = condition.type || '';
      
      const achievementData = {
        id: achievement.id || id,
        name: achievement.name || '',
        description: achievement.description || '',
        rarity: achievement.rarity || 'mythic',
        category: achievement.category || 'basic',
        conditionType: conditionType || 'manual_grant',
        conditionValue: condition.value || ''
      };
      
      return achievementData;
    });
    
    // 获取用户自定义成就并转换为表单格式
    const userAchievements = globalConfig.getUserAchievementsConfig();
    const customAchievements = Object.entries(userAchievements).map(([id, achievement]) => {
      const condition = achievement.condition || {};
      const conditionType = condition.type || '';
      
      const achievementData = {
        id: achievement.id || id,
        name: achievement.name || '',
        description: achievement.description || '',
        rarity: achievement.rarity || 'common',
        category: achievement.category || 'basic',
        conditionType: conditionType,
        conditionValue: condition.value || 0
      };
      
      // 根据条件类型添加额外字段
      if (conditionType === 'time_window') {
        achievementData.conditionValue = condition.start || '';
        achievementData.conditionEnd = condition.end || '';
      } else if (conditionType === 'text_contains_times') {
        achievementData.conditionValue = condition.value || '';
        achievementData.conditionTimes = condition.times || 1;
      } else if (conditionType === 'text_contains') {
        achievementData.conditionValue = condition.value || '';
      }
      
      return achievementData;
    });
    
    // 获取群专属成就并转换为表单格式
    const groupAchievementsList = [];
    try {
      const dataDir = PathResolver.getDataDir();
      const groupDir = path.join(dataDir, 'achievements', 'group');
      
      // 遍历所有群组目录
      if (fs.existsSync(groupDir)) {
        const groups = fs.readdirSync(groupDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
        
        for (const groupId of groups) {
          const groupAchievements = globalConfig.getGroupAchievementsConfig(groupId);
          
          for (const [id, achievement] of Object.entries(groupAchievements)) {
            const condition = achievement.condition || {};
            const conditionType = condition.type || '';
            
            const achievementData = {
              groupId: groupId,
              id: achievement.id || id,
              name: achievement.name || '',
              description: achievement.description || '',
              rarity: achievement.rarity || 'common',
              category: achievement.category || 'basic',
              conditionType: conditionType,
              conditionValue: condition.value || 0
            };
            
            // 根据条件类型添加额外字段
            if (conditionType === 'time_window') {
              achievementData.conditionValue = condition.start || '';
              achievementData.conditionEnd = condition.end || '';
            } else if (conditionType === 'text_contains_times') {
              achievementData.conditionValue = condition.value || '';
              achievementData.conditionTimes = condition.times || 1;
            } else if (conditionType === 'text_contains') {
              achievementData.conditionValue = condition.value || '';
            }
            
            groupAchievementsList.push(achievementData);
          }
        }
      }
    } catch (error) {
      globalConfig.error('[发言统计] 获取群专属成就失败:', error);
    }
    
    // 只返回 Guoba 需要的字段，避免将 defaultAchievements 写入 global.json
    const {
      global,
      display,
      message,
      backgroundServer,
      database,
      dataStorage,
      achievements
    } = config;
    
    return {
      global,
      display,
      message,
      backgroundServer,
      database,
      dataStorage,
      achievements,
      defaultAchievements: defaultAchievementsList,
      customAchievements,
      userAchievements: userAchievementsList,
      groupAchievements: groupAchievementsList
    };
  } catch (error) {
    globalConfig.error('[发言统计] 获取配置失败:', error);
    return {};
  }
}

