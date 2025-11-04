# 📝 更新日志 (Changelog) by:AI

本文档记录了插件的所有重要变更。

---

## [3.0.0] - 2024-12-19

### ✨ 新增功能

#### 成就系统增强
- 🎯 **Guoba-Plugin 集成**：支持通过网页界面配置插件，可视化管理成就和配置
- 🏆 **成就系统重构**：17种成就类型，支持周/月统计、文本匹配、时间窗口条件
- 🌈 **成就稀有度系统**：7种稀有度（普通、不普通、稀有、史诗、传说、神话、节日）
- 👥 **群专属成就支持**：为特定群组创建专属成就，实现个性化成就系统
- 🎊 **节日成就不重复获取**：节日成就在一个群内达成后，自动同步到所有群，避免重复记录
- 📊 **成就列表优化**：图片化显示所有成就，支持已解锁/未解锁状态，按稀有度和解锁时间排序
- ⭐ **智能显示优化**：自动优先显示史诗及以上稀有度成就（包含史诗、传说、节日）

#### 查询功能增强
- 🔍 **查询他人功能**：支持通过 `@` 查询其他用户的统计信息（`#水群查询 @用户`）
- 📈 **个人统计优化**：
  - 显示群个数、消息占比等详细数据
  - 优化卡片布局：今日发言占两列，平均每日发言放在消息占比边上
  - 移除重复显示的统计数据，提升用户体验

#### UI/UX 优化
- 🎨 **成就显示优化**：成就徽章从名字前缀改为末尾卡片式显示
- 📋 **成就列表分隔条**：已解锁和未解锁成就之间添加视觉分隔条
- 🎨 **模板优化**：所有 HTML 模板内容生成集中在 JS 中，提高可维护性
- 🎨 **配色方案优化**：全局统计页面采用黑白灰配色，移除渐变效果

### 🔧 技术优化

#### 代码重构
- ✅ **统一工具类**：创建 `AchievementUtils.js` 工具类，统一稀有度配置和判断逻辑
  - 统一稀有度配置：`RARITY_ORDER`
  - 统一节日成就判断：`isFestivalAchievement()`
  - 统一成就排序：`sortUnlockedAchievements()`, `sortLockedAchievements()`
  - 统一稀有度比较：`isRarityOrHigher()`, `compareRarity()`
- ✅ **消除重复逻辑**：
  - 移除 `AchievementService.js`、`TemplateManager.js`、`AchievementCommands.js` 中重复的稀有度排序逻辑
  - 统一使用 `AchievementUtils` 工具类
- ✅ **模板优化**：所有动态 HTML 内容生成集中在 JS 中（`TemplateManager.js`）
  - `userStatsTemplate.html` - 用户统计模板
  - `achievementListTemplate.html` - 成就列表模板
  - `globalStatsTemplate.html` - 全局统计模板
  - `groupStatsTemplate.html` - 群组统计模板
  - `imageRankingTemplate.html` - 排行榜模板

#### 数据库优化
- ✅ **PostgreSQL 存储**：使用 `pg` 数据库驱动，提升查询性能
- ✅ **连接池管理**：优化数据库连接，提高并发能力
- ✅ **节日成就同步**：新增 `saveFestivalAchievementToAllGroups()` 方法，批量同步节日成就到所有群

#### 其他优化
- ✅ **动态路径解析**：完全消除硬编码路径，提高可移植性
- ✅ **配置热重载**：支持配置修改后自动重载
- ✅ **单例模式统一**：统一核心服务的单例实现，避免状态重复
- ✅ **UTC+8 时区**：所有时间操作统一使用 UTC+8 时区
- ✅ **数据去重**：移除重复显示的统计数据，优化用户体验

### 🐛 问题修复

- ✅ 修复日志重复输出问题
- ✅ 修复时区不一致问题
- ✅ 修复成就解锁重复提醒
- ✅ 修复成就查询数据错误（PostgreSQL 布尔类型判断）
- ✅ 修复成就显示数据错误（`unlocked === 1` 改为 `unlocked === true`）
- ✅ 修复群组名称显示问题（优先从数据库获取，支持从 Bot 内存获取）
- ✅ 修复排行榜分页问题（支持后续页面查询）
- ✅ 修复成就设置显示时的参数错误（`achievement_id`/`achievement_name` 改为 `id`/`name`）
- ✅ 修复全局统计用户数重复计算问题（`#水群总统计` 中用户数现在使用 Set 去重，确保跨群用户不重复计算）
- ✅ 修复 Guoba-Plugin 集成中群专属成就路径错误（`getConfigData.js` 和 `setConfigData.js` 中路径从 `config/achievements/group` 更新为 `data/achievements/group`）

### 🔧 配置优化

#### 目录结构优化
- ✅ **成就配置目录迁移**：将用户自定义成就配置目录从 `config/achievements` 迁移到 `data/achievements`
  - 系统默认成就仍保留在 `config/achievements.json`（只读）
  - 用户自定义成就现在存放在 `data/achievements/` 目录下
  - 群专属成就现在存放在 `data/achievements/group/{群ID}/` 目录下
  - 更符合数据与配置的分离原则，便于版本控制和数据管理
  - 更新相关代码路径：`AchievementService.js`、`getConfigData.js`、`setConfigData.js`
- ✅ **Git 忽略规则优化**：精确控制 `.gitignore`，确保用户配置不被提交，但保留 README.md 文档

### 📝 文档更新

- ✅ 更新 README.md，添加新功能说明
- ✅ 创建 CHANGELOG.md，详细记录所有更新内容
- ✅ 添加 Gitee 仓库链接
- ✅ 更新成就配置说明文档路径（`data/achievements/README.md`）

---

## [2.x.x] - 历史版本

> 注：v2.x 版本及之前的历史变更记录未详细记录。

---

## 版本说明

- **主版本号（Major）**：不兼容的 API 变更
- **次版本号（Minor）**：向后兼容的功能新增
- **修订版本号（Patch）**：向后兼容的问题修复

---

## 贡献指南

如果你发现文档中缺少某项更新，欢迎提交 Issue 或 Pull Request 来完善本文档。

