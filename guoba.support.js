import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { globalConfig } from './src/core/ConfigManager.js';

// 获取插件根目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 支持锅巴
export function supportGuoba() {
  return {
    // 插件信息，将会显示在前端页面
    pluginInfo: {
      // name 为插件唯一标识，尽量不要与其他插件重复
      name: 'speaker-statistics-plugin',
      // title 为显示名称
      title: 'Speaker Statistics Plugin',
      // 插件描述
      description: '群聊水群统计插件 for Yunzai-Bot',
      // 作者可以为字符串也可以为数组，当有多个作者时建议使用数组
      author: 'QingYing & AI',
      // 作者主页地址
      authorLink: 'https://gitee.com/QingYingX',
      // 仓库地址
      link: '',
      isV3: true,
      isV2: false,
      // 是否显示在左侧菜单，可选值：auto、true、false
      // 当为 auto 时，如果配置项大于等于 3 个，则显示在左侧菜单
      showInMenu: true,
      // 显示图标，此为个性化配置
      // 图标可在 https://icon-sets.iconify.design 这里进行搜索
      icon: 'iconoir:bubble-search-solid',
      // 图标颜色
      iconColor: '#42a5f5',
      // 如果想要显示成图片，也可以填写图标路径（绝对路径）
      // iconPath: path.join(__dirname, 'resources/images/icon.png')
    },
    // 配置项信息
    configInfo: {
      // 配置项 schemas
      schemas: [
        {
          label: '全局功能开关',
          // 第一个分组标记开始，无需标记结束
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'global.enableStatistics',
          label: '启用发言统计',
          bottomHelpMessage: '是否启用发言统计主功能（全局开关）',
          component: 'Switch'
        },
        {
          field: 'global.recordMessage',
          label: '开启消息记录',
          bottomHelpMessage: '是否开启消息记录（全局开关）',
          component: 'Switch'
        },
        {
          field: 'global.enableWordCount',
          label: '开启字数统计',
          bottomHelpMessage: '是否开启消息字数统计（全局开关）',
          component: 'Switch'
        },
        {
          field: 'global.debugLog',
          label: '开启调试日志',
          bottomHelpMessage: '是否开启调试日志',
          component: 'Switch'
        },
        {
          field: 'global.enableBackup',
          label: '启用数据备份',
          bottomHelpMessage: '是否启用数据备份功能',
          component: 'Switch'
        },
        {
          field: 'global.useOkMarker',
          label: '启用完成标记',
          bottomHelpMessage: '是否启用完成标记（用于大文件）',
          component: 'Switch'
        },
        {
          label: '显示配置',
          // 第二个分组标记开始
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'display.displayCount',
          label: '显示排行数量',
          bottomHelpMessage: '显示的排行数量',
          component: 'InputNumber',
          required: true,
          componentProps: {
            min: 1,
            max: 100,
            placeholder: '请输入显示排行数量'
          }
        },
        {
          field: 'display.globalStatsDisplayCount',
          label: '全局统计显示群组数量',
          bottomHelpMessage: '全局统计显示的群组数量',
          component: 'InputNumber',
          required: true,
          componentProps: {
            min: 1,
            max: 50,
            placeholder: '请输入全局统计显示群组数量'
          }
        },
        {
          field: 'display.useForward',
          label: '使用转发消息',
          bottomHelpMessage: '是否使用转发消息展示排行',
          component: 'Switch'
        },
        {
          field: 'display.usePicture',
          label: '使用图片模式',
          bottomHelpMessage: '是否使用图片模式展示排行',
          component: 'Switch'
        },
        {
          label: '背景编辑器',
          // 第三个分组标记开始
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'backgroundServer.host',
          label: '服务器主机地址',
          bottomHelpMessage: '服务器主机地址 (127.0.0.1 本地访问, 0.0.0.0 允许外部访问)',
          component: 'Input',
          required: true,
          componentProps: {
            placeholder: '请输入服务器主机地址'
          }
        },
        {
          field: 'backgroundServer.port',
          label: '服务器端口',
          helpMessage: '修改后需要重启才能生效',
          bottomHelpMessage: '服务器端口',
          component: 'InputNumber',
          required: true,
          componentProps: {
            min: 1,
            max: 65535,
            placeholder: '请输入服务器端口'
          }
        },
        {
          field: 'backgroundServer.protocol',
          label: '协议类型',
          bottomHelpMessage: '协议类型 (http/https)',
          component: 'Input',
          required: true,
          componentProps: {
            placeholder: '请输入协议类型'
          }
        },
        {
          field: 'backgroundServer.domain',
          label: '域名配置',
          bottomHelpMessage: '域名配置 (用于生成编辑器链接，可以是域名或IP地址)',
          component: 'Input',
          required: true,
          componentProps: {
            placeholder: '请输入域名配置'
          }
        },
        {
          label: '数据库配置',
          // 第四个分组标记开始
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'database.host',
          label: '数据库主机地址',
          helpMessage: '修改后需要重启才能生效',
          bottomHelpMessage: '数据库主机地址',
          component: 'Input',
          required: true,
          componentProps: {
            placeholder: '请输入数据库主机地址'
          }
        },
        {
          field: 'database.port',
          label: '数据库端口',
          helpMessage: '修改后需要重启才能生效',
          bottomHelpMessage: '数据库端口',
          component: 'InputNumber',
          required: true,
          componentProps: {
            min: 1,
            max: 65535,
            placeholder: '请输入数据库端口'
          }
        },
        {
          field: 'database.database',
          label: '数据库名称',
          helpMessage: '修改后需要重启才能生效',
          bottomHelpMessage: '数据库名称',
          component: 'Input',
          required: true,
          componentProps: {
            placeholder: '请输入数据库名称'
          }
        },
        {
          field: 'database.user',
          label: '数据库用户名',
          helpMessage: '修改后需要重启才能生效',
          bottomHelpMessage: '数据库用户名',
          component: 'Input',
          required: true,
          componentProps: {
            placeholder: '请输入数据库用户名'
          }
        },
        {
          field: 'database.password',
          label: '数据库密码',
          helpMessage: '修改后需要重启才能生效',
          bottomHelpMessage: '数据库密码',
          component: 'InputPassword',
          required: true,
          componentProps: {
            placeholder: '请输入数据库密码'
          }
        },
        {
          field: 'database.pool.max',
          label: '最大连接数',
          helpMessage: '修改后需要重启才能生效',
          bottomHelpMessage: '连接池最大连接数',
          component: 'InputNumber',
          required: true,
          componentProps: {
            min: 1,
            max: 100,
            placeholder: '请输入最大连接数'
          }
        },
        {
          field: 'database.pool.min',
          label: '最小连接数',
          helpMessage: '修改后需要重启才能生效',
          bottomHelpMessage: '连接池最小连接数',
          component: 'InputNumber',
          required: true,
          componentProps: {
            min: 1,
            max: 100,
            placeholder: '请输入最小连接数'
          }
        },
        {
          field: 'database.ssl',
          label: '启用 SSL',
          helpMessage: '修改后需要重启才能生效',
          bottomHelpMessage: '是否启用 SSL',
          component: 'Switch'
        },
        {
          label: '成就系统配置',
          // 第五个分组标记开始
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'achievements.enabled',
          label: '启用成就系统',
          bottomHelpMessage: '是否启用成就系统',
          component: 'Switch'
        },
        {
          field: 'achievements.rankingDisplayCount',
          label: '成就排行榜显示数量',
          bottomHelpMessage: '成就排行榜显示数量',
          component: 'InputNumber',
          required: true,
          componentProps: {
            min: 1,
            max: 50,
            placeholder: '请输入成就排行榜显示数量'
          }
        },
        {
          component: 'Divider',
          label: '系统默认成就',
          componentProps: {
            orientation: 'left',
            plain: true
          }
        },
        {
          field: 'defaultAchievements',
          label: '系统默认成就（只读）',
          bottomHelpMessage: '系统预定义的27个成就，不可修改',
          component: 'GSubForm',
          componentProps: {
            multiple: true,
            disabled: true,
            schemas: [
              {
                field: 'id',
                label: '成就ID',
                component: 'Input',
                required: true,
                componentProps: {
                  placeholder: '例如：message_100',
                  disabled: true
                }
              },
              {
                field: 'name',
                label: '成就名称',
                component: 'Input',
                required: true,
                componentProps: {
                  placeholder: '例如：初来乍到',
                  disabled: true
                }
              },
              {
                field: 'description',
                label: '成就描述',
                component: 'InputTextArea',
                required: true,
                componentProps: {
                  rows: 2,
                  placeholder: '成就描述',
                  disabled: true
                }
              },
              {
                field: 'rarity',
                label: '稀有度',
                component: 'Select',
                required: true,
                componentProps: {
                  placeholder: '稀有度',
                  disabled: true,
                  options: [
                    { label: '普通', value: 'common' },
                    { label: '不普通', value: 'uncommon' },
                    { label: '稀有', value: 'rare' },
                    { label: '史诗', value: 'epic' },
                    { label: '传说', value: 'legendary' },
                    { label: '节日', value: 'festival' }
                  ]
                }
              },
              {
                field: 'category',
                label: '分类',
                component: 'Select',
                required: true,
                componentProps: {
                  placeholder: '分类',
                  disabled: true,
                  options: [
                    { label: '基础', value: 'basic' },
                    { label: '发言数', value: 'count' },
                    { label: '字数', value: 'words' },
                    { label: '活跃', value: 'active' },
                    { label: '每日', value: 'daily' },
                    { label: '连续', value: 'streak' },
                    { label: '时段', value: 'time' }
                  ]
                }
              },
              {
                field: 'conditionType',
                label: '条件类型',
                component: 'Select',
                required: true,
                componentProps: {
                  placeholder: '条件类型',
                  disabled: true,
                  options: [
                    { label: '首次发言', value: 'first_message' },
                    { label: '累计发言数', value: 'total_count' },
                    { label: '单日发言数', value: 'daily_count' },
                    { label: '本周发言数', value: 'weekly_count' },
                    { label: '本月发言数', value: 'monthly_count' },
                    { label: '累计字数', value: 'total_words' },
                    { label: '单日字数', value: 'daily_words' },
                    { label: '本周字数', value: 'weekly_words' },
                    { label: '本月字数', value: 'monthly_words' },
                    { label: '连续天数', value: 'daily_streak' },
                    { label: '最长连续天数', value: 'max_continuous_days' },
                    { label: '活跃天数', value: 'active_days' },
                    { label: '夜间发言', value: 'night_time' },
                    { label: '早晨发言', value: 'morning_time' },
                    { label: '文本包含', value: 'text_contains' },
                    { label: '文本包含次数', value: 'text_contains_times' },
                    { label: '时间窗口', value: 'time_window' }
                  ]
                }
              },
              {
                field: 'conditionValue',
                label: '条件值',
                component: 'Input',
                componentProps: {
                  placeholder: '条件值',
                  disabled: true
                }
              }
            ]
          }
        },
        {
          component: 'Divider',
          label: '用户自定义成就',
          componentProps: {
            orientation: 'left',
            plain: true
          }
        },
        {
          field: 'customAchievements',
          label: '用户自定义成就',
          bottomHelpMessage: '添加自定义成就，支持所有成就类型',
          component: 'GSubForm',
          componentProps: {
            multiple: true,
            schemas: [
              {
                field: 'id',
                label: '成就ID',
                component: 'Input',
                required: true,
                componentProps: {
                  placeholder: '例如：custom_message_100'
                }
              },
              {
                field: 'name',
                label: '成就名称',
                component: 'Input',
                required: true,
                componentProps: {
                  placeholder: '例如：话唠新人'
                }
              },
              {
                field: 'description',
                label: '成就描述',
                component: 'InputTextArea',
                required: true,
                componentProps: {
                  rows: 2,
                  placeholder: '成就的详细描述',
                  showCount: true,
                  maxLength: 200
                }
              },
              {
                field: 'rarity',
                label: '稀有度',
                component: 'Select',
                required: true,
                componentProps: {
                  placeholder: '请选择稀有度',
                  options: [
                    { label: '普通', value: 'common' },
                    { label: '不普通', value: 'uncommon' },
                    { label: '稀有', value: 'rare' },
                    { label: '史诗', value: 'epic' },
                    { label: '传说', value: 'legendary' },
                    { label: '节日', value: 'festival' }
                  ]
                }
              },
              {
                field: 'category',
                label: '分类',
                component: 'Select',
                required: true,
                componentProps: {
                  placeholder: '请选择分类',
                  options: [
                    { label: '基础', value: 'basic' },
                    { label: '发言数', value: 'count' },
                    { label: '字数', value: 'words' },
                    { label: '活跃', value: 'active' },
                    { label: '每日', value: 'daily' },
                    { label: '连续', value: 'streak' },
                    { label: '时段', value: 'time' }
                  ]
                }
              },
              {
                field: 'conditionType',
                label: '条件类型',
                component: 'Select',
                required: true,
                componentProps: {
                  placeholder: '请选择条件类型',
                  options: [
                    { label: '首次发言', value: 'first_message' },
                    { label: '累计发言数', value: 'total_count' },
                    { label: '单日发言数', value: 'daily_count' },
                    { label: '本周发言数', value: 'weekly_count' },
                    { label: '本月发言数', value: 'monthly_count' },
                    { label: '累计字数', value: 'total_words' },
                    { label: '单日字数', value: 'daily_words' },
                    { label: '本周字数', value: 'weekly_words' },
                    { label: '本月字数', value: 'monthly_words' },
                    { label: '连续天数', value: 'daily_streak' },
                    { label: '最长连续天数', value: 'max_continuous_days' },
                    { label: '活跃天数', value: 'active_days' },
                    { label: '夜间发言', value: 'night_time' },
                    { label: '早晨发言', value: 'morning_time' },
                    { label: '文本包含', value: 'text_contains' },
                    { label: '文本包含次数', value: 'text_contains_times' },
                    { label: '时间窗口', value: 'time_window' }
                  ]
                }
              },
              {
                field: 'conditionValue',
                label: '条件值',
                component: 'Input',
                componentProps: {
                  placeholder: '数字/文本/开始时间'
                },
                bottomHelpMessage: '数字类型填数字，文本包含填关键词，时间窗口填开始时间'
              },
              {
                field: 'conditionTimes',
                label: '触发次数',
                component: 'InputNumber',
                componentProps: {
                  min: 1,
                  placeholder: '例如：3'
                },
                bottomHelpMessage: '仅用于"文本包含次数"类型，表示需要触发多少次'
              },
              {
                field: 'conditionEnd',
                label: '结束时间',
                component: 'Input',
                componentProps: {
                  placeholder: '例如：2024-12-31T23:59:59'
                },
                bottomHelpMessage: '仅用于"时间窗口"类型，ISO格式日期'
              }
            ]
          }
        },
        {
          field: 'groupAchievements',
          label: '群专属成就',
          bottomHelpMessage: '为特定群组添加专属成就，仅在该群生效',
          component: 'GSubForm',
          componentProps: {
            multiple: true,
            schemas: [
              {
                field: 'groupId',
                label: '群号',
                component: 'GSelectGroup',
                required: true,
                componentProps: {
                  placeholder: '点击选择群聊'
                }
              },
              {
                field: 'id',
                label: '成就ID',
                component: 'Input',
                required: true,
                componentProps: {
                  placeholder: '例如：group_first_message'
                }
              },
              {
                field: 'name',
                label: '成就名称',
                component: 'Input',
                required: true,
                componentProps: {
                  placeholder: '例如：本群水王'
                }
              },
              {
                field: 'description',
                label: '成就描述',
                component: 'InputTextArea',
                required: true,
                componentProps: {
                  rows: 2,
                  placeholder: '成就的详细描述',
                  showCount: true,
                  maxLength: 200
                }
              },
              {
                field: 'rarity',
                label: '稀有度',
                component: 'Select',
                required: true,
                componentProps: {
                  placeholder: '请选择稀有度',
                  options: [
                    { label: '普通', value: 'common' },
                    { label: '不普通', value: 'uncommon' },
                    { label: '稀有', value: 'rare' },
                    { label: '史诗', value: 'epic' },
                    { label: '传说', value: 'legendary' },
                    { label: '节日', value: 'festival' }
                  ]
                }
              },
              {
                field: 'category',
                label: '分类',
                component: 'Select',
                required: true,
                componentProps: {
                  placeholder: '请选择分类',
                  options: [
                    { label: '基础', value: 'basic' },
                    { label: '发言数', value: 'count' },
                    { label: '字数', value: 'words' },
                    { label: '活跃', value: 'active' },
                    { label: '每日', value: 'daily' },
                    { label: '连续', value: 'streak' },
                    { label: '时段', value: 'time' }
                  ]
                }
              },
              {
                field: 'conditionType',
                label: '条件类型',
                component: 'Select',
                required: true,
                componentProps: {
                  placeholder: '请选择条件类型',
                  options: [
                    { label: '首次发言', value: 'first_message' },
                    { label: '累计发言数', value: 'total_count' },
                    { label: '单日发言数', value: 'daily_count' },
                    { label: '本周发言数', value: 'weekly_count' },
                    { label: '本月发言数', value: 'monthly_count' },
                    { label: '累计字数', value: 'total_words' },
                    { label: '单日字数', value: 'daily_words' },
                    { label: '本周字数', value: 'weekly_words' },
                    { label: '本月字数', value: 'monthly_words' },
                    { label: '连续天数', value: 'daily_streak' },
                    { label: '最长连续天数', value: 'max_continuous_days' },
                    { label: '活跃天数', value: 'active_days' },
                    { label: '夜间发言', value: 'night_time' },
                    { label: '早晨发言', value: 'morning_time' },
                    { label: '文本包含', value: 'text_contains' },
                    { label: '文本包含次数', value: 'text_contains_times' },
                    { label: '时间窗口', value: 'time_window' }
                  ]
                }
              },
              {
                field: 'conditionValue',
                label: '条件值',
                component: 'Input',
                componentProps: {
                  placeholder: '数字/文本/开始时间'
                },
                bottomHelpMessage: '数字类型填数字，文本包含填关键词，时间窗口填开始时间'
              },
              {
                field: 'conditionTimes',
                label: '触发次数',
                component: 'InputNumber',
                componentProps: {
                  min: 1,
                  placeholder: '例如：3'
                },
                bottomHelpMessage: '仅用于"文本包含次数"类型，表示需要触发多少次'
              },
              {
                field: 'conditionEnd',
                label: '结束时间',
                component: 'Input',
                componentProps: {
                  placeholder: '例如：2024-12-31T23:59:59'
                },
                bottomHelpMessage: '仅用于"时间窗口"类型，ISO格式日期'
              }
            ]
          }
        }
      ],
      // 获取配置数据方法（用于前端填充显示数据）
      async getConfigData() {
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
            const { PathResolver } = await import('./src/core/utils/PathResolver.js');
            const configDir = PathResolver.getConfigDir();
            const groupDir = path.join(configDir, 'achievements', 'group');
            
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
            logger.error('[发言统计] 获取群专属成就失败:', error);
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
            groupAchievements: groupAchievementsList
          };
        } catch (error) {
          logger.error('[发言统计] 获取配置失败:', error);
          return {};
        }
      },
      // 设置配置的方法（前端点确定后调用的方法）
      async setConfigData(data, { Result }) {
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
                const { PathResolver } = await import('./src/core/utils/PathResolver.js');
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
          logger.error('[发言统计] 保存配置失败:', error);
          return Result.fail('保存失败: ' + (error.message || '未知错误'));
        }
      }
    }
  }
}

