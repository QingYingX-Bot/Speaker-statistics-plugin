# 📊 发言统计插件 (Speaker Statistics Plugin)

[![version](https://img.shields.io/badge/version-3.0.0-blue)]() ![license](https://img.shields.io/badge/license-MIT-green) [![Gitee](https://img.shields.io/badge/Gitee-仓库-blue)](https://gitee.com/qingyingxbot/Speaker-statistics-plugin)

---

**✨ Yunzai-Bot 专业的群聊发言统计与成就系统**

> 插件 by QingYing & AI  
> 🏠 **仓库地址**: [Gitee](https://gitee.com/qingyingxbot/Speaker-statistics-plugin)

---

## 📦 简介

发言统计插件是 Yunzai-Bot 的群聊统计解决方案，用于统计并展示群成员的发言次数、字数、活跃情况，并提供完整的成就系统。采用 PostgreSQL 数据库存储，支持完整的查询、统计、排名功能。

### 核心特性

- 📊 **多维度统计**：总榜、日榜、周榜、月榜、年榜全方位统计
- 🎨 **灵活展示**：文字、转发、图片三种模式，自定义背景
- 🏆 **成就系统**：27个系统默认成就，支持用户自定义和群专属成就
- ⚙️ **可视化配置**：支持通过 Guoba-Plugin 进行图形化配置
- 🔒 **数据管理**：僵尸群清理、数据备份、权限控制
- ⚡ **高性能**：PostgreSQL 连接池，优化查询性能

---

## 🆕 v3.0.0 更新内容

### ✨ 新增功能

- 🎯 **Guoba-Plugin 集成**：支持通过网页界面配置插件
- 🏆 **成就系统重构**：17种成就类型，支持周/月统计、文本匹配、时间窗口
- 🌈 **成就稀有度**：7种稀有度（普通、不普通、稀有、史诗、传说、神话、节日）
- 👥 **群专属成就**：为特定群组创建专属成就
- 🎨 **彩色日志**：发言统计和成就解锁日志支持彩色输出
- ⭐ **智能显示**：自动优先显示史诗及以上稀有度成就
- 📊 **成就列表优化**：图片化显示所有成就，支持已解锁/未解锁状态，按稀有度排序
- 🔍 **查询他人功能**：支持通过 @ 查询其他用户的统计信息
- 📈 **个人统计优化**：显示群个数、消息占比等详细数据，优化卡片布局

### 🔧 技术优化

- ✅ **PostgreSQL 存储**：使用 `pg` 数据库驱动，提升查询性能
- ✅ **连接池管理**：优化数据库连接，提高并发能力
- ✅ **动态路径解析**：完全消除硬编码路径，提高可移植性
- ✅ **配置热重载**：支持配置修改后自动重载
- ✅ **单例模式统一**：统一核心服务的单例实现，避免状态重复
- ✅ **UTC+8 时区**：所有时间操作统一使用 UTC+8 时区
- ✅ **模板优化**：所有 HTML 模板内容生成集中在 JS 中，提高可维护性
- ✅ **数据去重**：移除重复显示的统计数据，优化用户体验

---

## 📊 功能详情

### 排行榜功能

| 功能 | 命令 | 说明 |
|------|------|------|
| 总榜 | `#水群总榜` | 查看历史累计发言排行 |
| 日榜 | `#水群日榜` | 查看今日发言排行 |
| 周榜 | `#水群周榜` | 查看本周发言排行 |
| 月榜 | `#水群月榜` | 查看本月发言排行 |
| 年榜 | `#水群年榜` | 查看今年发言排行 |

### 个人查询功能

| 功能 | 命令 | 说明 |
|------|------|------|
| 个人统计 | `#水群查询` | 查看个人发言统计和排名（支持 @ 查询他人） |
| 查询他人 | `#水群查询 @用户` | 查看指定用户的发言统计和排名 |
| 群列表 | `#水群查询群列表` | 查看用户所在的所有群聊 |
| 群统计 | `#水群统计` | 查看当前群聊的统计信息 |
| 群信息 | `#水群信息` | 查看当前群聊的详细信息 |

### 成就功能

| 功能 | 命令 | 说明 |
|------|------|------|
| 成就列表 | `#水群成就列表` | 查看当前群聊所有可获取的成就（默认+自定义+群专属），显示已解锁和未解锁状态 |
| 设置显示成就 | `#水群设置显示成就 <成就名>` | 设置个人资料页显示的成就 |

### 管理功能（仅主人）

| 功能 | 命令 | 说明 |
|------|------|------|
| 清除统计 | `#水群清除统计` | 清除当前群的统计数据 |
| 设置显示人数 | `#水群设置人数+<数字>` | 设置排行榜显示人数 |
| 切换转发 | `#水群设置开启/关闭转发` | 切换转发消息模式 |
| 切换图片 | `#水群设置开启/关闭图片` | 切换图片显示模式 |
| 切换记录 | `#水群设置开启/关闭记录` | 切换消息记录功能 |
| 切换日志 | `#水群设置开启/关闭日志` | 切换调试日志输出 |
| 切换通知 | `#水群设置开启/关闭通知` | 切换成就解锁通知 |

---

## 🎯 成就系统

### 系统默认成就

插件内置 **27个系统默认成就**，涵盖以下分类：

- **基础类**：首次发言
- **计数类**：累计发言、单日发言、本周发言、本月发言
- **字数类**：累计字数、单日字数、本周字数、本月字数
- **天数类**：活跃天数、连续天数、最长连续天数
- **时段类**：夜间发言、早晨发言、时间窗口
- **文本类**：文本包含、文本包含次数

### 成就稀有度

| 稀有度 | 说明 | Emoji | 徽章 |
|--------|------|-------|------|
| Common | 普通 | 🥉 | 🥉 |
| Uncommon | 不普通 | 🥈 | 🥈 |
| Rare | 稀有 | 🥇 | 🥇 |
| Epic | 史诗 | 💎 | 💎 |
| Legendary | 传说 | 👑 | 👑 |
| Mythic | 神话 | 🔥 | 🔥 |
| Festival | 节日/节气 | 🎊 | 🎊 |

> 💡 **智能显示**：未手动设置显示成就时，系统会自动选择史诗及以上稀有度成就进行展示

### 成就配置

插件支持三层成就配置结构：

1. **系统默认成就**：`config/achievements.json`（只读，27个）
2. **用户自定义成就**：`config/achievements/*.json`（可编辑）
3. **群专属成就**：`config/achievements/group/{群ID}/*.json`（群组专用）

详细的成就配置说明请参考 [config/achievements/README.md](config/achievements/README.md)

---

## 🚀 安装方法

### 前置要求

- Node.js 16+ 
- PostgreSQL 12+（需要单独安装 PostgreSQL 服务器）
- Yunzai-Bot

### 安装步骤

1. **克隆插件**

```bash
cd /qy/Yunzai/plugins
git clone https://gitee.com/qingyingxbot/Speaker-statistics-plugin.git Speaker-statistics-plugin
```

2. **安装依赖**

```bash
cd Speaker-statistics-plugin
pnpm install
```

3. **配置数据库**

创建 PostgreSQL 数据库：

```sql
CREATE DATABASE speech_statistics;
```

编辑 `data/global.json` 配置数据库连接：

```json
{
  "database": {
    "host": "localhost",
    "port": 5432,
    "database": "speech_statistics",
    "user": "your_username",
    "password": "your_password",
    "max": 20,
    "idleTimeoutMillis": 30000
  }
}
```

4. **启动插件**

重启 Yunzai-Bot，插件会自动初始化数据库表结构。

---

## ⚙️ 配置说明

### 配置文件结构

```
config/
├── configTemplate.js         # 配置模板（包含所有可配置项）
├── achievements.json          # 系统默认成就（27个）
└── achievements/              # 用户自定义成就目录
    ├── *.json                # 用户自定义成就文件
    └── group/                # 群专属成就目录
        └── {群ID}/           # 特定群组目录
            └── *.json        # 群专属成就文件

data/
└── global.json               # 全局配置（数据库、显示、通知等）
```

### 配置管理

#### 方式一：通过 Guoba-Plugin 网页界面配置

访问 Guoba-Plugin 控制台 → 插件配置 → 发言统计插件，可进行以下配置：

- ✅ 全局设置（调试日志、通知开关等）
- ✅ 显示设置（转发、图片、显示人数等）
- ✅ 数据库配置
- ✅ 用户自定义成就管理（增删改查）
- ✅ 群专属成就管理

#### 方式二：直接编辑配置文件

- **全局配置**：编辑 `data/global.json`
- **用户成就**：在 `config/achievements/` 目录创建 JSON 文件
- **群专属成就**：在 `config/achievements/group/{群ID}/` 目录创建 JSON 文件

详细配置说明请参考 `config/configTemplate.js` 文件中的注释。

---

## 🗂️ 数据存储

### 数据库表结构

插件自动创建以下表：

| 表名 | 说明 |
|------|------|
| `user_stats` | 用户基础统计表 |
| `daily_stats` | 日统计表 |
| `weekly_stats` | 周统计表 |
| `monthly_stats` | 月统计表 |
| `yearly_stats` | 年统计表 |
| `achievements` | 成就表 |
| `user_display_achievements` | 用户显示成就表 |
| `group_info` | 群组信息表 |

### 备份与恢复

备份目录：`data/backups/`

使用 PostgreSQL 原生工具进行备份：

```bash
# 备份
pg_dump -U your_username -d speech_statistics > data/backups/backup_$(date +%Y%m%d).sql

# 恢复
psql -U your_username -d speech_statistics < data/backups/backup_20241219.sql
```

---

## 📋 技术栈

### 核心依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| pg | ^8.11.3 | PostgreSQL 数据库驱动 |
| express | ^5.1.0 | 背景服务器 |
| handlebars | ^4.7.8 | 模板引擎 |
| sharp | ^0.32.6 | 图片处理 |
| multer | ^2.0.2 | 文件上传 |

### 项目架构

```
Speaker-statistics-plugin/
├── src/
│   ├── core/                          # 核心模块
│   │   ├── database/
│   │   │   └── DatabaseService.js     # 数据库服务（PostgreSQL）
│   │   ├── utils/                     # 工具类
│   │   │   ├── PathResolver.js        # 路径解析器
│   │   │   ├── TimeUtils.js           # 时间工具（UTC+8）
│   │   │   └── CommonUtils.js         # 通用工具
│   │   ├── ConfigManager.js           # 配置管理
│   │   ├── DataService.js             # 数据服务（单例）
│   │   ├── AchievementService.js      # 成就服务
│   │   ├── MessageRecorder.js         # 消息记录器（单例）
│   │   └── Plugin.js                  # 插件主入口
│   ├── commands/                      # 命令处理
│   │   ├── RankCommands.js            # 排行榜命令
│   │   ├── UserCommands.js            # 用户查询命令
│   │   ├── AchievementCommands.js     # 成就命令
│   │   ├── AdminCommands.js           # 管理员命令
│   │   └── HelpCommands.js            # 帮助命令
│   ├── managers/
│   │   └── BackgroundManager.js       # 背景管理器
│   ├── render/                        # 渲染模块
│   │   ├── ImageGenerator.js          # 图片生成
│   │   └── TemplateManager.js         # 模板管理
│   └── services/
│       └── BackgroundServer.js        # 背景编辑器服务器
├── config/
│   ├── configTemplate.js              # 配置模板
│   ├── achievements.json              # 系统默认成就
│   └── achievements/                  # 用户自定义成就
├── data/
│   ├── global.json                    # 全局配置
│   └── backups/                       # 备份目录
├── guoba.support.js                   # Guoba-Plugin 集成
├── index.js                           # 插件入口
├── package.json                       # 项目配置
└── README.md                          # 说明文档
```

---

## 💬 问题反馈

如有任何问题或建议，欢迎：

- 🐛 [提交 Issue](https://gitee.com/qingyingxbot/Speaker-statistics-plugin/issues)
- 💬 在 Gitee 讨论区反馈
- 📝 提交 Pull Request
- 📧 联系开发者

---

## 📄 许可证

本项目采用 **MIT 许可证**

---

## 🙏 致谢

- QingYingX & AI
- Yunzai-Bot 项目组
- Guoba-Plugin 作者
- 所有贡献者和测试用户

