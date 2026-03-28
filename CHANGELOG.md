# 📝 更新日志 (Changelog) by:AI

本文档记录了插件的重要版本变更。

---

## [5.0.1] - 2026-03-28

### ♻️ 结构整理

- 正式以 `apps/`、`core/`、`guoba/`、`resources/` 作为当前主目录结构，旧 `src/*` 路径不再作为文档入口。
- `speaker` 主应用保持“单主插件”结构，排行榜、用户查询、管理命令、水群分析、词云能力统一挂载到主插件中。
- 渲染资源与模板目录完成拆分，统计页、帮助页、词云页、总结页等资源按功能重新归类。

### 🔧 功能整合

- 群分析能力并入主插件。
- 水群分析、词云、消息采集、AI 分析统一使用 `data/config/group-analysis.json` 管理。
- 报告生成功能与定时任务逻辑继续保留，并由主插件统一挂载生命周期。

### ⚙️ 配置整理

- 当前版本配置以 `data/config/*.json` 七个分组文件为准：
  - `global.json`
  - `display.json`
  - `message.json`
  - `database.json`
  - `storage.json`
  - `archived-groups.json`
  - `group-analysis.json`
- Guoba 配置项同步适配新的配置分组与字段命名。
- 文档中的数据库配置示例调整为当前真实结构，移除旧版嵌套写法。

### 🗑️ 下线与清理

- 移除旧版 Web 管理端相关页面、静态资源与文档说明。
- 移除背景相关功能与历史资源引用，README 不再继续描述已下线能力。
- 清理旧结构遗留说明，避免继续混用 `src/*`、旧模板目录和旧配置命名。

### 📝 文档更新

- `README.md` 重写为当前版本说明，补齐当前命令集、配置分组、数据库结构与目录结构。
- 版本状态、安装方式、命令说明、配置入口、兼容性说明统一按当前仓库内容更新。

### 🧹 代码精简

- 管理命令权限统一切换为 `permission: 'master'`，移除旧的 `key.json` / `PermissionManager` / `AuthService` 权限链路。
- 清理无引用的工具聚合文件、空目录和旧包装方法，减少无效代码残留。
- 删除若干未使用导入，并整理帮助命令等小范围冗余逻辑。
- 抽出模板统一生成时间方法，收敛 `TemplateManager` 内重复格式化代码。
- 收敛词云命令中的周期文案与群名解析重复逻辑，减少相同分支散落在多个入口。
- 优化趋势文本渲染时的重复最大值计算，避免在逐行输出中重复执行同一计算。
- 统一 `package.json`、`package-lock.json` 与 README 的版本口径为 `5.0.1`。

---

## [5.0.0] - 2026-03-25

### 🎨 Web 控制台视觉升级

- Web 管理端整体改为现代黑白灰风格，统一页面层级、边框与阴影体系。
- 左侧导航栏重做为深灰玻璃质感样式，优化激活态与移动端菜单观感。
- `Background` 页面交互重构：支持拖拽选择、实时构图预览、缩放/偏移控制与一键上传流程。

### ⚠️ 破坏性更新

- 统计数据模型切换为新结构：核心表统一为 `message_granular_stats` + `user_agg_stats`，旧结构 `user_stats/daily_stats/weekly_stats/monthly_stats/yearly_stats` 不再作为默认依赖。
- 数据查询字段口径切换：主统计字段统一为 `total_msg/total_word`（旧脚本若依赖 `total_count/total_words` 需要同步调整）。
- SQLite 默认路径策略变更：未配置 `database.path` 时固定使用 `speech_statistics_db.db`，不会自动沿用 `speech_statistics.db`。
- 默认数据库类型切换：默认从 `sqlite` 调整为 `postgresql`（`index.js` 与 `config/configTemplate.js` 同步）。
- 更新命令策略变更：`#水群更新` 使用 `git pull --ff-only` 且检测本地改动时拒绝执行；`#水群强制更新` 保持覆盖本地修改语义。

### ♻️ 重构更新

#### 核心与数据层

- `DataService` 大规模重构：补齐平台感知（QQ/Discord/Telegram）群名与头像解析；新增 Discord 用户/服务器/频道缓存（内存 LRU + 持久化文件 `data/cache/discord_profile_cache.json`）。
- 新增代理工具 `src/core/utils/ProxyUtils.js`，统一读取框架代理配置；`DataService` 与 `ImageGenerator` 支持代理链路。
- `DatabaseService` 及 PostgreSQL/SQLite 适配器重构：建表、索引、归档、统计查询全面对齐新结构；兼容层旧表/旧视图在初始化阶段清理。
- SQLite 适配器增强：`better-sqlite3` 异常时自动回退 `sqlite3`；支持 PostgreSQL 风格占位符在 SQLite 下按出现顺序展开。

#### 命令与交互层

- `Plugin` 重构为共享核心组件（单例化命令/服务实例），并在启动阶段预加载成就定义。
- 背景命令链路正式接入：`#水群设置背景`、`#水群删除背景`、`#水群背景帮助` 走真实实现。
- 管理命令增强：更新命令增加分支识别与分类提示；归档确认前增加二次群列表校验与“安全跳过”统计输出。
- 用户与排行榜命令升级：群名称统一走平台感知名称解析；`#水群查询群列表` 在不支持合并转发时自动降级为纯文本输出。

#### API 与管理端

- `AdminApi`、`StatsApi`、`AuthService`、`GroupManagementApi` 查询全面切换到 `user_agg_stats/message_granular_stats`。
- 成就链路重构：`AchievementService` 改为共享实例；命令端与 API 端统一 `groupId/userId` 解析、全局/群专属成就口径与稀有度排序规则。
- 管理端成就接口与页面联动更新：管理员页按当前选中群拉取成就列表，统计接口路由注册顺序调整并补齐全量统计路径。

#### 渲染与文档

- 渲染链路增强：`ImageGenerator` 使用 `domcontentloaded + timeout`，并支持 Puppeteer 代理参数，降低网络环境导致的渲染阻塞。
- 模板层重构：`TemplateManager` 增加平台感知群名/头像能力，模板渲染优先复用 `DataService` 能力。
- 文档清理：移除无用文档 `API.md`、`项目迁移计划书.md`。
- 文档重构：`DATABASE_SETUP.md` 下线，安装与数据库说明并入 `README.md`；帮助命令与帮助面板同步当前命令集与策略口径。

---

<details>
<summary><strong>历史版本（4.0.1 及之前，默认折叠）</strong></summary>

## [4.0.1] - 2026-03-01

### 🚀 代码优化

### 统计与归档更新说明

- **统计范围**：所有统计（总榜、全局统计、数据概览等）仅包含 **当前群列表（Bot.gl）** 中的群，与机器人管理插件的 `#群列表` / `#群员统计` 一致；归档群不计入且不可查询。
- **归档**：僵尸群 = 数据库中存在但不在 Bot.gl 中的群；归档后数据移到暂存表，不计入统计、不可查询。
- **恢复**：若归档的群有用户重新发言（群重加回来），数据会自动移出归档并恢复。
- **清理**：60 天后无用户发言的归档群组会被定时任务永久删除；可通过配置文件自定义清理时间、间隔和保留天数。

## [4.0.0] - 2026-01-12

### 🎉 重大版本更新

本次更新为重大版本升级，主要进行了全面的代码优化和规范化工作。

### 🚀 代码优化

#### 代码风格统一

- ✅ **统一代码风格**：
  - 移除所有分号，统一代码风格
  - 统一错误变量命名为 `err`
  - 统一日志系统为 `globalConfig`
  - 确保所有 `parseInt` 调用包含 radix 参数

#### 服务层代码优化

- ✅ **BackgroundApi.js 优化**：
  - 统一日志系统：`logger`/`console` → `globalConfig`
  - 移除所有分号
  - 统一错误变量命名为 `err`
- ✅ **AdminApi.js 优化**：
  - 修复 `logger.warn` → `globalConfig.warn`
  - 移除所有分号
  - 统一错误变量命名
- ✅ **ApiResponse.js 优化**：
  - 统一参数名为 `err`（保持方法名 `error` 和 JSON 响应字段 `error` 不变）
- ✅ **AuthMiddleware.js 优化**：
  - 统一错误变量命名为 `err`
  - 修复 JSON 响应中的字段名（保持 `error` 而不是 `err`）
- ✅ **其他 API 文件优化**：
  - 移除所有分号
  - 统一错误变量命名为 `err`
  - 统一代码风格

#### 核心层代码优化

- ✅ **Plugin.js 优化**：
  - 统一日志系统：`logger` → `globalConfig`
  - 保留 `logger.mark` 和 `logger.info` 的特殊处理（使用可选链和回退）
  - 移除所有分号
  - 统一错误变量命名
- ✅ **ConfigManager.js 优化**：
  - 统一错误变量命名：`fileError` → `err`
  - 修复日志系统引用
  - 移除所有分号
- ✅ **RankCommands.js 优化**：
  - 统一错误变量命名：`error` → `err`
  - 移除所有分号

#### 工具类代码优化

- ✅ **CommonUtils.js 优化**：
  - 移除废弃方法 `validateAdminPermission`（已迁移到 `PermissionManager`）
  - 所有使用该方法的地方已更新为使用 `getPermissionManager().validateAdminPermission()`

#### Guoba 配置层代码优化

- ✅ **getConfigData.js 优化**：
  - 移除所有分号
  - 统一错误变量命名为 `err`
  - 提取 `addConditionFields` 方法，合并重复的条件字段处理逻辑
- ✅ **setConfigData.js 优化**：
  - 移除所有分号
  - 统一错误变量命名为 `err`
  - 提取 `buildAchievementCondition` 方法，合并重复的条件构建逻辑
- ✅ **configSchemas.js 优化**：
  - 移除所有分号
  - 统一代码风格
- ✅ **pluginInfo.js 优化**：
  - 移除所有分号
  - 统一代码风格

### 🎨 UI优化

#### 成就列表模板完全重写

- ✅ **成就列表模板完全重写**：
  - 完全重写 `achievementListTemplate.html`，采用更现代化的设计风格
  - 统一设计风格：与其他模板（globalStats、groupStats、userStats）保持一致
  - 优化头部区域：标题字号 56px → 72px，解锁进度更突出，添加半透明遮罩效果
  - 优化成就卡片：已解锁使用渐变背景，未解锁降低透明度，增强阴影和边框效果
  - 优化成就徽章：保持稀有度颜色方案，优化内边距和圆角，更好的文字溢出处理
  - 优化分隔条：更大的字号和更粗的字重，更清晰的视觉分隔
- ✅ **横版布局优化**：
  - 容器最大宽度：`3200px` → `4000px`
  - 视口宽度：`1800px` → `2400px`（`generateAchievementListImage` 和 `generateAchievementStatisticsImage` 均已更新）
  - 网格列数：`3列` → `4列`
  - 间距优化：`24px` → `28px`
- ✅ **元素尺寸增大**：
  - 标题：`56px` → `72px`
  - 解锁进度：`32px/40px` → `40px/52px`
  - 群信息：`24px` → `28px`
  - 分隔条文字：`28px` → `36px`
  - 卡片内边距：`24px` → `32px`
  - 状态图标：`40px` → `52px`，字体 `22px` → `28px`
  - 成就徽章：`20px` → `24px`
  - 描述文字：`18px` → `20px`
  - 解锁时间：`16px` → `18px`
  - 页脚：`18px` → `20px`
- ✅ **间距优化**：
  - 头部内边距：`44px 36px` → `56px 48px`
  - 内容区内边距：`48px` → `56px`
  - 卡片间距：`16px` → `20px`
  - 页脚内边距：`24px 36px` → `32px 48px`
- ✅ **修复成就名称重复显示问题**：
  - 移除了信息区域的成就名称（`achievement-name`）
  - 仅保留徽章中的成就名称，避免重复显示
  - 已佩戴状态和群专属标签移至信息区域顶部

### 🐛 Bug 修复

- ✅ **修复归档群组重复显示问题**：
  - 修复 `#水群归档僵尸群` 命令中已归档的群组仍会出现在列表中的问题
  - 在查询僵尸群时，自动排除已归档的群组
  - 使用 `isGroupArchived` 方法检查群组归档状态

---

</details>
