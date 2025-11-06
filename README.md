# 📊 发言统计插件 (Speaker Statistics Plugin)

[![version](https://img.shields.io/badge/version-3.0.5-blue)]() ![license](https://img.shields.io/badge/license-MIT-green) [![Gitee](https://img.shields.io/badge/Gitee-仓库-blue)](https://gitee.com/qingyingxbot/Speaker-statistics-plugin)

---

**✨ Yunzai-Bot 专业的群聊发言统计与成就系统**

> 插件 by QingYing & AI  

---

## 📦 简介

发言统计插件是 Yunzai-Bot 的群聊统计解决方案，用于统计并展示群成员的发言次数、字数、活跃情况，并提供完整的成就系统。采用 PostgreSQL 数据库存储，支持完整的查询、统计、排名功能。插件还提供完整的Web管理界面，支持通过浏览器查看统计、管理成就、设置背景等功能。

### 核心特性

- 📊 **多维度统计**：总榜、日榜、周榜、月榜、年榜全方位统计
- 🎨 **灵活展示**：文字、转发、图片三种模式，自定义背景
- 🏆 **成就系统**：27个系统默认成就，支持用户自定义和群专属成就
- 🌐 **Web管理界面**：完整的Web界面，支持查看统计、管理成就、设置背景等
- ⚙️ **可视化配置**：支持通过 Guoba-Plugin 进行图形化配置
- 🔒 **数据管理**：僵尸群清理、数据备份、权限控制
- ⚡ **高性能**：PostgreSQL 连接池，优化查询性能
- 📱 **移动端适配**：所有Web页面完全适配移动端设备

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
| 成就列表 | `#水群成就列表` | 查看当前群聊所有可获取的成就（默认+自定义+群专属），显示已解锁和未解锁状态，显示已佩戴状态和剩余时间 |
| 设置显示成就 | `#水群设置显示成就 <成就名>` | 手动设置个人资料页显示的成就（无时限，永久显示） |
| 成就统计 | `#水群成就统计` | 查看每个成就的获取情况（全局成就统计所有群，群专属成就仅统计当前群） |

### 网页功能

| 功能 | 命令 | 说明 |
|------|------|------|
| 打开网页 | `#水群网页` | 生成个人统计页面链接（Token访问） |
| 背景设置 | `#水群设置背景` | 生成背景设置页面链接（Token访问） |

> 💡 **Token访问**：通过QQ命令生成的链接包含Token，自动验证身份，安全便捷

### Web界面功能

插件提供完整的Web管理界面，包括：

- 📊 **个人统计页面**：查看个人发言统计、排名、详细信息
- 🏆 **排行榜页面**：查看群聊排名，支持总榜/日榜/周榜/月榜/年榜
- 🎖️ **成就页面**：查看和管理成就，设置显示成就
- 🎨 **背景设置页面**：上传和设置个人背景图片（支持图片编辑）
- ⚙️ **设置页面**：用户设置、秘钥管理、数据管理
- 🔧 **管理页面**（管理员）：系统概览、群管理、用户管理

> 💡 **访问方式**：通过 `#水群网页` 命令获取个人链接，或直接访问管理页面（需管理员权限）

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
| Special | 特殊 | ✨ | ✨ |

> 💡 **全局成就**：特殊成就和节日成就获取后，在任意群都显示为已获取，不会重复获取

> 💡 **智能显示**：未手动设置显示成就时，系统会自动选择史诗及以上稀有度成就进行展示（24小时时限，到期后自动卸下）

> 💡 **成就时限**：
> - 自动佩戴的成就：仅显示24小时，到期后自动卸下
> - 手动设置的成就：无时限，永久显示（使用 `#水群设置显示成就` 命令）

### 成就配置

插件支持三层成就配置结构：

1. **系统默认成就**：`config/achievements.json`（只读，27个）
2. **用户自定义成就**：`data/achievements/*.json`（可编辑）
3. **群专属成就**：`data/achievements/group/{群ID}/*.json`（群组专用）

详细的成就配置说明请参考 [data/achievements/README.md](data/achievements/README.md)

---

## 🚀 安装方法

### 前置要求

- Node.js 16+ 
- PostgreSQL 12+（需要单独安装 PostgreSQL 服务器）
- Yunzai-Bot

### 安装步骤

1. **克隆插件**

```bash
cd plugins
git clone https://gitee.com/qingyingxbot/Speaker-statistics-plugin.git Speaker-statistics-plugin
```

2. **安装依赖**

```bash
cd Speaker-statistics-plugin
pnpm install
```

3. **配置数据库**

> 📖 **详细安装教程**：请参考 [数据库安装教程](DATABASE_SETUP.md)

快速配置步骤：

创建 PostgreSQL 数据库：

```sql
CREATE DATABASE speech_statistics;
CREATE USER speech_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE speech_statistics TO speech_user;
```

编辑 `data/global.json` 配置数据库连接：

```json
{
  "database": {
    "host": "localhost",
    "port": 5432,
    "database": "speech_statistics",
    "user": "speech_user",
    "password": "your_secure_password",
    "max": 20,
    "idleTimeoutMillis": 30000
  }
}
```

4. **启动插件**

重启 Yunzai-Bot，插件会自动初始化数据库表结构并启动Web服务器。

> 💡 **Web服务器**：插件会自动启动Web服务器（默认端口39999），提供Web管理界面。可通过 `data/global.json` 中的 `webServer` 配置项修改端口等设置。

---

## ⚙️ 配置说明

### 配置文件结构

```
config/
├── configTemplate.js         # 配置模板（包含所有可配置项）
└── achievements.json          # 系统默认成就（27个，只读）

data/
├── global.json               # 全局配置（数据库、显示、通知、Web服务器等）
├── key.json                  # 用户秘钥和权限配置（管理员角色）
└── achievements/              # 用户自定义成就目录
    ├── README.md             # 成就配置说明文档
    ├── *.json                # 用户自定义成就文件
    └── group/                # 群专属成就目录
        └── {群ID}/           # 特定群组目录
            └── *.json        # 群专属成就文件
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
- **用户成就**：在 `data/achievements/` 目录创建 JSON 文件
- **群专属成就**：在 `data/achievements/group/{群ID}/` 目录创建 JSON 文件

详细配置说明请参考 `config/configTemplate.js` 文件中的注释。

---

## 🗂️ 数据存储

> 📖 **数据库安装指南**：详细安装教程请参考 [DATABASE_SETUP.md](DATABASE_SETUP.md)

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
| express | ^5.1.0 | Web服务器 |
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
│   │   │   ├── CommonUtils.js         # 通用工具
│   │   │   └── AchievementUtils.js   # 成就工具（稀有度配置和排序）
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
│       ├── WebServer.js                # Web服务器（主服务器）
│       ├── auth/                       # 认证相关服务
│       │   ├── TokenManager.js         # Token管理
│       │   ├── VerificationCodeManager.js # 验证码管理
│       │   └── AuthService.js          # 认证服务
│       ├── api/                        # API路由
│       │   ├── AuthApi.js              # 认证API
│       │   ├── StatsApi.js              # 统计API
│       │   ├── RankingApi.js           # 排行榜API
│       │   ├── AchievementApi.js      # 成就API
│       │   ├── BackgroundApi.js        # 背景API
│       │   └── AdminApi.js             # 管理API
│       └── routes/                     # 页面路由
│           └── PageRoutes.js          # 页面路由处理
├── config/
│   ├── configTemplate.js              # 配置模板
│   └── achievements.json              # 系统默认成就（只读）
├── data/
│   ├── global.json                    # 全局配置
│   ├── achievements/                  # 用户自定义成就目录
│   │   ├── README.md                  # 成就配置说明文档
│   │   └── group/                     # 群专属成就目录
│   └── backups/                       # 备份目录
├── guoba.support.js                   # Guoba-Plugin 集成
├── index.js                           # 插件入口
├── package.json                       # 项目配置
├── README.md                          # 说明文档
└── CHANGELOG.md                       # 更新日志
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

