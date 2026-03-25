# 📁 项目结构说明（5.0.0）

本文档描述当前 `Speaker-statistics-plugin` 的实际目录与职责分工。

---

## 📂 根目录

```text
Speaker-statistics-plugin/
├── index.js                     # 插件入口（初始化数据库与 Web 服务）
├── package.json                 # 依赖与版本信息
├── guoba.support.js             # Guoba-Plugin 接入入口
├── LICENSE
├── README.md
├── API.md                       # Web API 文档
├── CHANGELOG.md
├── PROJECT_STRUCTURE.md         # 本文档
│
├── config/
│   └── configTemplate.js        # 默认配置模板
│
├── data/                        # 运行期数据目录（通常不提交）
│   ├── global.json              # 全局配置
│   ├── key.json                 # 用户秘钥与角色信息
│   ├── *.db                     # SQLite 数据库文件
│   ├── backgrounds/             # 背景图片（normal/ranking/temp）
│   └── cache/                   # 运行缓存
│
├── src/                         # 后端源码
├── resources/
│   ├── templates/               # 图片渲染 HTML 模板
│   └── web/                     # Web 前端构建产物（部署目录）
│
└── web/                         # Vue3 + Vite + TS 前端源码（开发目录，默认不提交）
```

---

## 🧩 后端源码结构（`src/`）

```text
src/
├── core/
│   ├── Plugin.js                # 主插件类，命令分发与生命周期
│   ├── ConfigManager.js         # 全局配置加载/监听/保存
│   ├── DataService.js           # 统计业务数据服务
│   ├── MessageRecorder.js       # 消息记录与入库调度
│   ├── database/
│   │   ├── DatabaseService.js   # 统一数据库服务入口
│   │   └── adapters/
│   │       ├── BaseAdapter.js
│   │       ├── PostgreSQLAdapter.js
│   │       └── SQLiteAdapter.js
│   └── utils/
│       ├── CommandWrapper.js
│       ├── CommonUtils.js
│       ├── PathResolver.js
│       ├── PermissionManager.js
│       ├── ProxyUtils.js
│       ├── TimeUtils.js
│       ├── UserParser.js
│       ├── WebLinkGenerator.js
│       └── index.js
│
├── commands/
│   ├── RankCommands.js          # 排行榜/趋势/群统计
│   ├── UserCommands.js          # 个人查询与网页入口
│   ├── AdminCommands.js         # 管理员命令（更新/归档/配置等）
│   └── HelpCommands.js          # 帮助命令
│
├── managers/
│   └── BackgroundManager.js     # 背景页面入口与命令
│
├── render/
│   ├── ImageGenerator.js        # 图片渲染入口
│   ├── TemplateManager.js       # 模板数据拼装
│   └── TextFormatter.js         # 文本模式格式化
│
├── services/
│   ├── WebServer.js             # Express 服务入口
│   ├── routes/
│   │   └── PageRoutes.js        # 页面路由与 token 访问
│   ├── auth/
│   │   ├── AuthService.js
│   │   ├── TokenManager.js
│   │   └── VerificationCodeManager.js
│   └── api/
│       ├── BaseApi.js
│       ├── AuthApi.js
│       ├── StatsApi.js
│       ├── BackgroundApi.js
│       ├── AdminApi.js
│       ├── middleware/
│       │   └── AuthMiddleware.js
│       ├── utils/
│       │   └── ApiResponse.js
│       └── admin/
│           ├── GroupManagementApi.js
│           └── UserManagementApi.js
│
└── guoba/
    ├── pluginInfo.js
    ├── configSchemas.js
    ├── getConfigData.js
    └── setConfigData.js
```

---

## 🌐 Web 前端结构

### 运行时目录（部署使用）

- `resources/web/index.html`
- `resources/web/assets/*`（Vite 构建后的 JS/CSS 资源）

### 开发目录（源码）

```text
web/
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router.ts
│   ├── api/
│   ├── stores/
│   ├── pages/
│   ├── components/
│   ├── layouts/
│   ├── styles/
│   └── types/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

说明：当前仓库策略为“运行端只依赖 `resources/web` 构建产物”；`web/` 主要用于本地开发与重新构建。

---

## 🗄️ 数据与配置说明

- 默认 SQLite 文件名：`speech_statistics_db.db`
- 不会自动沿用历史文件 `speech_statistics.db`，如需使用需手动配置 `database.path`
- `data/global.json` 已收敛为 5.0.0 口径（无成就模块旧配置项）

---

## 📌 备注

- 5.0.0 为破坏性版本：不包含成就系统相关代码、接口与数据结构。
- API 详情请查看 `API.md`，命令说明以 `README.md` 为准。
