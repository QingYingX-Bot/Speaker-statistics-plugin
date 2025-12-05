# 📊 发言统计插件 (Speaker Statistics Plugin)

[![version](https://img.shields.io/badge/version-3.1.47-blue)]() ![license](https://img.shields.io/badge/license-MIT-green) [![Gitee](https://img.shields.io/badge/Gitee-仓库-blue)](https://gitee.com/qingyingxbot/Speaker-statistics-plugin) [![GitHub](https://img.shields.io/badge/GitHub-仓库-black)](https://github.com/QingYingX-Bot/Speaker-statistics-plugin)

---

**✨ Yunzai-Bot 专业的群聊发言统计与成就系统**

> 插件 by QingYing & AI  

---

## 📦 简介

发言统计插件是 Yunzai-Bot 的群聊统计解决方案，用于统计并展示群成员的发言次数、字数、活跃情况，并提供完整的成就系统。支持 PostgreSQL 和 SQLite 双数据库，可根据部署需求灵活选择。插件还提供完整的Web管理界面，支持通过浏览器查看统计、管理成就、设置背景等功能。

### 核心特性

- 📊 **多维度统计**：总榜、日榜、周榜、月榜、年榜全方位统计
- 🎨 **灵活展示**：文字、转发、图片三种模式，自定义背景
- 🏆 **成就系统**：60个系统默认成就，支持用户自定义和群专属成就
- 🌐 **Web管理界面**：完整的Web界面，支持查看统计、管理成就、设置背景等
- ⚙️ **可视化配置**：支持通过 Guoba-Plugin 进行图形化配置
- 🔒 **数据管理**：僵尸群清理、数据备份、权限控制
- 🗄️ **双数据库支持**：支持 PostgreSQL（生产环境）和 SQLite（小型部署）
- ⚡ **高性能**：PostgreSQL 连接池优化查询，SQLite WAL 模式提高并发
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
| 背景设置 | `#水群设置背景` | 生成背景设置页面链接（Token访问） |
| 背景帮助 | `#水群背景帮助` | 查看背景设置帮助信息 |

### 网页功能

| 功能 | 命令 | 说明 |
|------|------|------|
| 打开网页 | `#水群网页` | 生成个人统计页面链接（Token访问） |

> 💡 **Token访问**：通过QQ命令生成的链接包含Token，自动验证身份，安全便捷

> 💡 **全部群聊统计**：首页选择"全部群聊"时，自动聚合所有群聊的统计数据，显示总和

### Web界面功能

插件提供完整的Web管理界面，包括：

- 📊 **个人统计页面**：查看个人发言统计、排名、详细信息
  - 支持选择单个群聊或"全部群聊"（自动聚合所有群聊数据）
  - 显示今日发言、总发言、总字数、活跃天数、连续天数、排名等
- 🏆 **排行榜页面**：查看群聊排名，支持总榜/日榜/周榜/月榜/年榜
- 🎖️ **成就页面**：查看和管理成就，设置显示成就
- 🎨 **背景设置页面**：上传和设置个人背景图片（支持图片编辑）
- ⚙️ **设置页面**：用户设置、秘钥管理、数据管理
- 🔧 **管理页面**（管理员）：
  - **系统概览**：总群数、总用户数、总消息数、今日消息数、活跃群数、今日新增用户、平均消息/群、平均消息/用户
  - **数据图表**：
    - 消息趋势图（近7天）
    - 群组活跃度分布（Top 10）
    - 消息密度散点图（所有群组，X轴=用户数，Y轴=消息数）
    - 群组增长趋势图（近7天新增群组数）
  - **数据统计**：日期范围筛选、消息趋势图、用户活跃度图、详细数据表格、数据导出
  - **群管理**：群详情、群内用户排名、刷新/清除统计数据
  - **用户管理**：用户详情、所在群聊列表、修改用户权限、清除用户数据
  - **成就管理**：成就列表展示、群组筛选、搜索功能、默认按人数排序、稀有度显示、数据导出

> 💡 **访问方式**：通过 `#水群网页` 命令获取个人链接，或直接访问管理页面（需管理员权限）

> 💡 **权限管理**：管理员可在网页界面修改用户权限（普通用户 ↔ 管理员），权限变化实时生效

### 管理功能（仅管理员）

> 💡 **权限说明**：
> - **key.json 中的 admin 角色**：可在 Web 界面设置为管理员，拥有所有管理权限

| 功能 | 命令 | 说明 |
|------|------|------|
| 清除统计 | `#水群清除统计` | 清除当前群的统计数据 |
| 设置显示人数 | `#水群设置人数+<数字>` | 设置排行榜显示人数 |
| 切换转发 | `#水群设置开启/关闭转发` | 切换转发消息模式 |
| 切换图片 | `#水群设置开启/关闭图片` | 切换图片显示模式 |
| 切换记录 | `#水群设置开启/关闭记录` | 切换消息记录功能 |
| 切换日志 | `#水群设置开启/关闭日志` | 切换调试日志输出 |
| 更新插件 | `#水群更新` | 更新插件到最新版本 |
| 强制更新 | `#水群强制更新` | 强制更新插件（覆盖本地修改） |
| 切换通知 | `#水群设置开启/关闭通知` | 切换成就解锁通知 |
| 刷新成就 | `#刷新水群成就` | 刷新当前群组的所有显示成就，先卸下所有自动佩戴的成就，然后重新检查并自动佩戴符合条件的成就（史诗及以上，使用解锁时间+24小时） |
| 刷新全群成就 | `#刷新全群水群成就` | 刷新所有群组的所有显示成就，先卸下所有自动佩戴的成就，然后重新检查并自动佩戴符合条件的成就（史诗及以上，使用解锁时间+24小时） |
| 成就给予 | `#水群成就给予 <用户ID> <成就ID>` | 授予用户成就（用户成就需要手动授予，授予后自动同步到用户所在的所有群聊） |
| 配置成就 | `#水群配置成就 <成就ID> <成就名称> <成就描述>` | 快速添加用户成就（自动使用默认参数：mythic稀有度，basic分类） |
| 清理僵尸群 | `#水群清理僵尸群` | 列出所有僵尸群（数据库中存在但机器人已不在群中），等待确认清理 |
| 确认清理 | `#水群确认清理` | 确认清理列出的僵尸群，删除所有统计数据（需先使用 `#水群清理僵尸群` 查看列表，5分钟内有效） |

---

## 🎯 成就系统

### 系统默认成就

插件内置 **60个系统默认成就**（包含3个节日成就），涵盖以下分类：

- **基础类**：首次发言（1个成就）
- **计数类**：累计发言（7个等级）、单日发言（4个等级）
- **字数类**：累计字数（4个等级）、单日字数（4个等级）
- **活跃类**：活跃天数（4个等级）
- **连续类**：连续天数（6个等级）
- **时段类**：夜间发言、早晨发言、午间发言、下午发言、傍晚发言（5个时段）
- **社交类**：周/月活跃、周/月字数、最长连续天数（11个成就）
- **竞赛类**：日/周/月发言王、日/周/月字数王（11个成就）
- **节日类**：元旦、国际儿童节、国庆节（3个节日成就）

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
> - **自动佩戴的成就**：仅显示24小时，从解锁时间开始计算（解锁时间 + 24小时 = 卸下时间），使用 UTC+8 时区
> - **手动设置的成就**：无时限，永久显示（使用 `#水群设置显示成就` 命令）
> - **全局成就**：特殊成就和节日成就在一个群获取后，自动同步到所有群并自动佩戴

> 💡 **节日成就**：支持年度重复触发，配置使用 `MM-DDTHH:mm:ss` 格式，自动使用当前年份，无需每年更新日期

### 成就配置

插件支持四层成就配置结构：

1. **系统默认成就**：`config/achievements/` 目录（只读，60个，按分类分文件存储）
2. **用户成就**：`data/achievements/users.json`（手动授予的成就，稀有度固定为 mythic）
3. **用户自定义成就**：`data/achievements/*.json`（可编辑，自动获取）
4. **群专属成就**：`data/achievements/group/{群ID}/*.json`（群组专用）

> 💡 **用户成就说明**：
> - 用户成就存放在 `users.json` 文件中，需要管理员手动授予
> - 用户成就稀有度固定为 `mythic`（神话等级），无法自动获取
> - 使用 `#水群配置成就` 命令可快速添加用户成就
> - 使用 `#水群成就给予 <用户ID> <成就ID>` 命令授予用户成就
> - 授予后自动同步到用户所在的所有群聊，并设置为显示成就（永久显示）

详细的成就配置说明请参考 [data/achievements/README.md](data/achievements/README.md)

---

## 🚀 安装方法

### 前置要求

- Node.js 16+ 
- 数据库（二选一）：
  - PostgreSQL 12+（需要单独安装 PostgreSQL 服务器）
  - SQLite 3+（无需安装，插件自带支持）
- Yunzai-Bot

### 安装步骤

1. **克隆插件**

```bash
cd plugins
# 使用 Gitee（国内推荐）
git clone https://gitee.com/qingyingxbot/Speaker-statistics-plugin.git Speaker-statistics-plugin
# 或使用 GitHub
git clone https://github.com/QingYingX-Bot/Speaker-statistics-plugin.git Speaker-statistics-plugin
```

2. **安装依赖**

```bash
cd Speaker-statistics-plugin
pnpm install
```

> 💡 **提示**：
> - `better-sqlite3` 已包含在依赖中，`pnpm install` 会自动安装
> - 如果 `better-sqlite3` 安装失败（如 bindings 文件缺失），插件会自动回退到 `sqlite3`
> - 如果只使用 PostgreSQL，可以忽略 SQLite 相关的安装错误
> - 如果遇到安装问题，请参考 [数据库安装教程](DATABASE_SETUP.md) 中的常见问题部分

3. **配置数据库**

> 📖 **详细安装教程**：请参考 [数据库安装教程](DATABASE_SETUP.md)

快速配置步骤：

**方式一：使用 SQLite（推荐新手，无需安装数据库）**

编辑 `data/global.json` 配置 SQLite：

```json
{
  "database": {
    "type": "sqlite",
    "path": "speech_statistics.db"
  }
}
```

> 💡 **提示**：
> - 如果只写文件名（如 `"speech_statistics.db"`），会自动放在插件 `data` 目录下
> - 如果写相对路径（如 `"data/my.db"`），会相对于插件目录
> - 如果写绝对路径，则使用该路径
> - 如果不指定 `path`，默认使用 `speech_statistics.db`（在插件 `data` 目录下）

**方式二：使用 PostgreSQL（适合生产环境）**

创建 PostgreSQL 数据库：

```sql
CREATE DATABASE speech_statistics;
CREATE USER speech_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE speech_statistics TO speech_user;
```

编辑 `data/global.json` 配置 PostgreSQL：

```json
{
  "database": {
    "type": "postgresql",
    "host": "localhost",
    "port": 5432,
    "database": "speech_statistics",
    "user": "speech_user",
    "password": "your_secure_password",
    "pool": {
      "max": 20,
      "min": 5,
      "idleTimeoutMillis": 30000
    }
  }
}
```

> 💡 **提示**：如果不指定 `type`，默认使用 PostgreSQL（向后兼容）。

4. **启动插件**

重启 Yunzai-Bot，插件会自动初始化数据库表结构并启动Web服务器。

> 💡 **Web服务器**：插件会自动启动Web服务器（默认端口39999），提供Web管理界面。可通过 `data/global.json` 中的 `webServer` 配置项修改端口等设置。

---

## ⚙️ 配置说明

### 数据库配置

插件支持两种数据库，可在 `data/global.json` 中配置：

**SQLite 配置（推荐新手）：**
```json
{
  "database": {
    "type": "sqlite",
    "path": "speech_statistics.db"  // 可选，可直接写文件名，会自动放在插件 data 目录下
  }
}
```

> 💡 **路径说明**：
> - 只写文件名（如 `"speech_statistics.db"`）：自动放在插件 `data` 目录下
> - 相对路径（如 `"data/my.db"`）：相对于插件目录
> - 绝对路径（如 `"/var/db/speech.db"`）：直接使用该路径
> - 不指定 `path`：默认使用 `speech_statistics.db`（在插件 `data` 目录下）

**PostgreSQL 配置（推荐生产环境）：**
```json
{
  "database": {
    "type": "postgresql",  // 可选，默认就是 postgresql
    "host": "localhost",
    "port": 5432,
    "database": "speech_statistics",
    "user": "speech_user",
    "password": "your_secure_password",
    "pool": {
      "max": 20,
      "min": 5,
      "idleTimeoutMillis": 30000
    }
  }
}
```

> 💡 **提示**：
> - 如果不指定 `type`，默认使用 PostgreSQL（向后兼容）
> - SQLite 适合小型部署，无需安装数据库服务器
> - PostgreSQL 适合生产环境，性能更好，支持高并发

### Web服务器配置

**Umami 追踪脚本配置（可选）：**
```json
{
  "webServer": {
    "umami": {
      "enabled": true,
      "scriptUrl": "https://your-umami-instance.com/script.js",
      "websiteId": "your-website-id"
    }
  }
}
```

> 💡 **说明**：
> - `enabled`: 是否启用 Umami 追踪（默认：`false`）
> - `scriptUrl`: Umami 脚本 URL，例如：`https://cloud.umami.is/script.js`
> - `websiteId`: Umami 网站 ID，在 Umami 后台创建网站后获取
> - 启用后，脚本会自动注入到所有 Web 页面的 `<head>` 标签中
> - 未启用或配置不完整时，不会注入任何脚本

### 配置文件结构

```
config/
├── configTemplate.js         # 配置模板（包含所有可配置项）
├── achievements-config.json  # 成就分类和稀有度配置
└── achievements/             # 系统默认成就目录（60个，按分类分文件，只读）
    ├── basic.json            # 基础类成就
    ├── count.json            # 计数类成就
    ├── words.json            # 字数类成就
    ├── active.json           # 活跃类成就
    ├── daily.json            # 每日类成就
    ├── streak.json           # 连续类成就
    ├── time.json             # 时段类成就
    ├── social.json           # 社交类成就
    ├── competition.json      # 竞赛类成就
    └── festival.json         # 节日类成就

data/
├── global.json               # 全局配置（数据库、显示、通知、Web服务器等）
├── key.json                  # 用户秘钥和权限配置（管理员角色，秘钥以 hash+salt 形式存储，不存储明文）
└── achievements/              # 用户自定义成就目录
    ├── README.md             # 成就配置说明文档
    ├── users.json            # 用户成就文件（手动授予的成就）
    ├── *.json                # 用户自定义成就文件
    └── group/                # 群专属成就目录
        └── {群ID}/           # 特定群组目录
            └── *.json        # 群专属成就文件
```

### 配置管理

#### 方式一：通过 Guoba-Plugin 网页界面配置（推荐）

访问 Guoba-Plugin 控制台 → 插件配置 → 发言统计插件，可进行以下配置：

- ✅ 全局设置（调试日志、通知开关等）
- ✅ 显示设置（转发、图片、显示人数等）
- ✅ 数据库配置（PostgreSQL/SQLite）
- ✅ Web服务器配置（Umami 追踪脚本）
- ✅ 用户成就管理（增删改查，手动授予的成就）
- ✅ 用户自定义成就管理（增删改查）
- ✅ 群专属成就管理

#### 方式二：直接编辑配置文件

- **全局配置**：编辑 `data/global.json`
- **用户成就**：在 `data/achievements/` 目录创建 JSON 文件
- **群专属成就**：在 `data/achievements/group/{群ID}/` 目录创建 JSON 文件

> 📖 **详细配置说明**：请参考 `config/configTemplate.js` 文件中的注释，或查看 [成就配置说明文档](data/achievements/README.md)

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
| better-sqlite3 | ^12.4.1 | SQLite 数据库驱动（可选） |
| express | ^5.1.0 | Web服务器 |
| handlebars | ^4.7.8 | 模板引擎 |
| multer | ^2.0.2 | 文件上传 |

> 💡 **可选依赖**：`better-sqlite3` 为可选依赖，仅在使用 SQLite 时需要安装。如果只使用 PostgreSQL，则无需安装。

### 项目架构

```
Speaker-statistics-plugin/
├── src/
│   ├── core/                          # 核心模块
│   │   ├── database/
│   │   │   ├── DatabaseService.js     # 数据库服务（适配器选择器）
│   │   │   └── adapters/              # 数据库适配器
│   │   │       ├── BaseAdapter.js     # 适配器基类
│   │   │       ├── PostgreSQLAdapter.js # PostgreSQL 适配器
│   │   │       └── SQLiteAdapter.js   # SQLite 适配器
│   │   ├── utils/                     # 工具类
│   │   │   ├── PathResolver.js        # 路径解析器
│   │   │   ├── TimeUtils.js           # 时间工具（UTC+8）
│   │   │   ├── CommonUtils.js         # 通用工具
│   │   │   ├── AchievementUtils.js   # 成就工具（稀有度配置和排序）
│   │   │   ├── CommandWrapper.js     # 命令包装器（统一验证和错误处理）
│   │   │   ├── PermissionManager.js  # 权限管理器（统一权限检查）
│   │   │   └── KeyFileOptimizer.js   # key.json 优化工具（清理明文秘钥）
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
│   ├── achievements-config.json       # 成就分类和稀有度配置
│   └── achievements/                  # 系统默认成就目录（按分类分文件）
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

- 🐛 [提交 Issue](https://gitee.com/qingyingxbot/Speaker-statistics-plugin/issues) | [GitHub Issues](https://github.com/QingYingX-Bot/Speaker-statistics-plugin/issues)
- 💬 在 Gitee 讨论区反馈
- 📝 [提交 Pull Request](https://gitee.com/qingyingxbot/Speaker-statistics-plugin/pulls) | [GitHub Pull Requests](https://github.com/QingYingX-Bot/Speaker-statistics-plugin/pulls)
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

