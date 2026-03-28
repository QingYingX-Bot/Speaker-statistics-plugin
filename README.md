![Speaker-statistics-plugin](https://socialify.git.ci/QingYingX-Bot/Speaker-statistics-plugin/image?description=1&font=Inter&forks=1&issues=1&language=1&name=1&owner=1&pattern=Circuit+Board&pulls=1&stargazers=1&theme=Dark)

# 📊 发言统计插件 (Speaker Statistics Plugin)

**✨ Yunzai-Bot 专业的群聊发言统计系统**

> 插件 by QingYing & AI

---

## 📦 简介

发言统计插件是 Yunzai-Bot 的群聊统计解决方案，用于统计并展示群成员的发言次数、字数、活跃情况，并提供群聊分析、词云、归档清理和锅巴配置能力。

- 文档版本：`5.0.1`
- 发布日期：`2026-03-28`

### 核心特性

- 📊 **多维度统计**：总榜、日榜、周榜、月榜、年榜、趋势全覆盖
- 👤 **个人查询**：支持个人统计、跨群列表、@ 查询他人
- 🤖 **群聊分析**：支持基础总结、活跃图表、AI 话题分析、金句和称号
- ☁️ **词云能力**：支持群词云和个人词云
- ⚙️ **可视化配置**：支持通过 Guoba-Plugin 图形化管理配置
- 🔒 **数据治理**：僵尸群归档、自动恢复、定时清理
- 🗄️ **双数据库支持**：支持 PostgreSQL 和 SQLite
- ♻️ **当前架构**：已切换到 `apps/` + `core/` + `guoba/` + `resources/` 目录结构

> 💡 **版本说明**：
> - 当前版本已移除旧版 Web 管理端与背景功能。
> - 当前版本已移除旧 `src/*` 路径，二开请基于 `apps/*` 与 `core/*`。

---

## 🚀 安装方法

### 前置要求

- Node.js 16+
- Yunzai-Bot
- 数据库二选一：
  - PostgreSQL 12+（推荐生产环境）
  - SQLite 3+（推荐轻量部署）

### 安装步骤

1. **克隆插件**

#### Gitee（国内推荐）

```bash
git clone https://gitee.com/qingyingxbot/Speaker-statistics-plugin.git ./plugins/Speaker-statistics-plugin
```

#### GitHub

```bash
git clone https://github.com/QingYingX-Bot/Speaker-statistics-plugin.git ./plugins/Speaker-statistics-plugin
```

2. **安装依赖**

```bash
pnpm install --filter=Speaker-statistics-plugin
```

> 💡 **提示**：
> - `pnpm install` 会安装插件运行所需依赖。
> - 如果只使用 PostgreSQL，可忽略 SQLite 相关依赖的安装提示。

3. **配置数据库**

编辑 `plugins/Speaker-statistics-plugin/data/config/database.json`

**方式一：使用 SQLite（推荐新手）**

```json
{
  "type": "sqlite",
  "path": "speech_statistics_db.db"
}
```

> 💡 **路径说明**：
> - 只写文件名：默认放在插件 `data` 目录下
> - 相对路径：相对于插件目录
> - 绝对路径：直接使用该路径

**方式二：使用 PostgreSQL（推荐生产环境）**

```json
{
  "type": "postgresql",
  "host": "127.0.0.1",
  "port": 5432,
  "database": "speech_statistics_db",
  "user": "speech_statistics_db",
  "password": "your_password",
  "pool": {
    "max": 20,
    "min": 5,
    "idleTimeoutMillis": 30000,
    "connectionTimeoutMillis": 2000
  },
  "ssl": false
}
```

4. **启动插件**

重启 Yunzai-Bot，插件会自动初始化数据库表结构与相关服务。

---

## 📊 功能详情

### 排行榜功能

| 功能 | 命令 | 说明 |
|------|------|------|
| 总榜 | `#水群总榜` | 查看历史累计发言排行 |
| 日榜 | `#水群日榜` | 查看今日发言排行 |
| 周榜 | `#水群周榜` | 查看本周发言排行 |
| 月榜 | `#水群月榜` / `#水群榜` | 查看本月发言排行 |
| 年榜 | `#水群年榜` | 查看今年发言排行 |
| 群统计 | `#水群统计` | 查看当前群聊统计信息 |
| 群信息 | `#水群信息` | 查看当前群聊详细信息 |
| 全局统计 | `#水群总统计 [群数\|all]` | 查看全局统计数据 |
| 总统计别名 | `#总水群统计 [群数\|all]` | 全局统计别名命令 |
| 发言趋势 | `#水群趋势` | 查看最近趋势（默认参数由命令逻辑决定） |
| 自定义趋势 | `#水群趋势 30` | 查看最近 N 天发言趋势 |

### 个人查询功能

| 功能 | 命令 | 说明 |
|------|------|------|
| 个人统计 | `#水群查询` | 查看自己的发言统计 |
| 查询他人 | `#水群查询 @用户` | 查看指定用户统计 |
| 群列表 | `#水群查询群列表` | 查看自己活跃过的群列表 |
| 查询他人群列表 | `#水群查询群列表 @用户` | 查看指定用户群列表 |

### 水群分析功能

| 功能 | 命令 | 说明 |
|------|------|------|
| 群聊分析 | `#水群分析` | 生成当前群聊分析报告 |
| 指定日期分析 | `#水群分析 今天` | 支持今天、昨天、前天、`YYYY-MM-DD` |
| 指定群分析 | `#水群分析 <群号> <日期>` | 手动分析指定群和日期 |
| 强制分析 | `#水群强制分析 <群号> <日期>` | 主人权限，忽略常规限制 |

> 💡 **说明**：
> - 未配置 AI Key 时，仍可生成基础统计报告。
> - 配置 OpenAI 兼容接口后，可启用话题分析、金句提取、用户称号等增强能力。

### 词云功能

| 功能 | 命令 | 说明 |
|------|------|------|
| 群词云 | `#水群词云` | 生成当天群词云 |
| 群词云（三天） | `#水群词云 三天` | 生成最近三天群词云 |
| 群词云（七天） | `#水群词云 七天` | 生成最近七天群词云 |
| 个人词云 | `#我的词云` | 生成自己的当天词云 |
| 个人词云（三天） | `#我的词云 三天` | 生成自己的最近三天词云 |
| 个人词云（七天） | `#我的词云 七天` | 生成自己的最近七天词云 |

> 💡 **说明**：
> - 词云功能不依赖 AI Key。
> - 词云和分析能力均受 `group-analysis.json` 总开关控制。

### 管理功能（仅主人）

> 💡 **权限说明**：
> - 当前管理命令统一使用 `permission: 'master'` 判断权限。

| 功能 | 命令 | 说明 |
|------|------|------|
| 清除统计 | `#水群清除统计` | 清除当前群统计数据 |
| 设置显示人数 | `#水群设置人数+<数字>` | 设置排行榜显示人数 |
| 切换转发 | `#水群设置开启/关闭转发` | 切换转发模式 |
| 切换图片 | `#水群设置开启/关闭图片` | 切换图片模式 |
| 切换记录 | `#水群设置开启/关闭记录` | 切换消息记录 |
| 切换日志 | `#水群设置开启/关闭日志` | 切换调试日志 |
| 更新插件 | `#水群更新` | 常规更新插件 |
| 强制更新 | `#水群强制更新` | 覆盖本地改动并更新 |
| 归档僵尸群 | `#水群归档僵尸群` | 检查可归档群 |
| 确认归档 | `#水群确认归档` | 确认执行归档 |
| 查看归档 | `#水群查看归档列表` | 查看已归档群列表 |
| 清理缓存 | `#水群清理缓存` | 清理插件缓存 |
| 帮助 | `#水群帮助` | 查看帮助面板 |

> 💡 **统计与归档说明**：
> - 统计范围只包含当前有效群，不包含已归档群。
> - 僵尸群是“数据库中存在，但机器人当前已不在群中的群”。
> - 归档群若重新有消息，会自动恢复。
> - 超过保留天数的归档群会被定时任务永久清理。

---

## ⚙️ 配置说明

### 配置文件结构

```text
config/
├── configTemplate.js         # 聚合配置模板
└── templates/                # 各分组模板

data/
├── config/
│   ├── global.json           # 全局开关
│   ├── display.json          # 显示配置
│   ├── message.json          # 消息统计策略
│   ├── database.json         # 数据库配置
│   ├── storage.json          # 数据存储策略
│   ├── archived-groups.json  # 归档群清理策略
│   └── group-analysis.json   # 水群分析 / 词云 / AI / 消息采集
```

### 配置管理

#### 方式一：通过 Guoba-Plugin 图形界面配置（推荐）

访问 Guoba-Plugin 控制台 → 插件配置 → 发言统计插件，可管理：

- ✅ 全局设置
- ✅ 显示设置
- ✅ 消息统计设置
- ✅ 数据库配置
- ✅ 归档清理配置
- ✅ 水群分析与词云配置

#### 方式二：直接编辑配置文件

- **全局配置**：`data/config/global.json`
- **显示配置**：`data/config/display.json`
- **消息统计配置**：`data/config/message.json`
- **数据库配置**：`data/config/database.json`
- **归档清理配置**：`data/config/archived-groups.json`
- **水群分析配置**：`data/config/group-analysis.json`

### 重点配置说明

#### `global.json`

- 控制统计总开关、消息记录、调试日志等

#### `display.json`

- 控制显示人数、图片模式、转发模式

#### `message.json`

- 控制是否只统计文本消息
- 控制是否统计机器人消息
- 控制是否每条消息后立即刷新排行榜缓存

#### `database.json`

- 控制数据库类型与连接参数

#### `archived-groups.json`

- 控制定时清理是否启用
- 控制清理时间、间隔和保留天数

#### `group-analysis.json`

- 控制消息采集、词云、AI、定时报告和分析开关

---

## 🗂️ 数据存储

### 数据表结构

插件当前核心表：

| 表名 | 说明 |
|------|------|
| `message_granular_stats` | 小时粒度消息统计 |
| `user_agg_stats` | 用户聚合统计 |
| `group_info` | 群信息表 |
| `archived_groups` | 已归档群表 |

> 💡 **说明**：
> - 旧版统计表结构不再作为当前主结构。
> - 插件启动时会自动初始化当前版本所需表结构。

---

## 🧱 项目结构

```text
Speaker-statistics-plugin/
├── apps/                 # 应用入口
│   └── commands/         # 命令处理
├── core/                 # 核心能力
│   ├── database/         # 数据库服务与适配器
│   ├── render/           # 渲染与模板管理
│   ├── services/         # 分析、词云、AI 等服务
│   └── utils/            # 工具模块
├── config/               # 配置模板
├── data/config/          # 运行期配置
├── guoba/                # Guoba 支持
├── resources/            # 页面模板与静态资源
├── index.js              # 插件入口
└── guoba.support.js      # Guoba 接入入口
```

---

## 🔄 兼容性说明

- 本版本已移除 Web 管理端与背景相关功能。
- 本版本已移除旧 `src/*` 路径。
- 当前版本以 `data/config/*.json` 为唯一主配置入口。

---

## 💬 问题反馈

如有问题或建议，欢迎：

- 🐛 Gitee Issues: <https://gitee.com/qingyingxbot/Speaker-statistics-plugin/issues>
- 🐛 GitHub Issues: <https://github.com/QingYingX-Bot/Speaker-statistics-plugin/issues>
- 📝 提交 Pull Request

---

## 📄 许可证

本项目采用 **MIT 许可证**

---

## 🙏 致谢

- QingYingX & AI
- [group-insight](https://github.com/KBVsent/group-insight)
- [Trss-Yunzai](https://gitee.com/TimeRainStarSky/Yunzai)
- [Guoba-Plugin](https://gitee.com/guoba-yunzai/guoba-plugin)
- 所有贡献者和测试用户
