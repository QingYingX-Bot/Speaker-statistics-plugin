/**
 * 统一配置模板文件
 * 此文件定义了发言统计插件的所有配置模板
 * 用于说明配置的数据结构和默认值
 */
const configTemplate = {
    // 全局功能开关
    global: {
        // 是否启用发言统计主功能（全局开关）
        enableStatistics: true,
        // 是否开启消息记录（全局开关）
        recordMessage: true,
        // 是否开启消息字数统计（全局开关）
        enableWordCount: true,
        // 是否开启调试日志
        debugLog: false,
        // 是否启用数据备份功能
        enableBackup: true,
        // 是否启用完成标记（用于大文件）
        useOkMarker: false,
        // 是否启用成就解锁日志
        enableAchievementLog: true
    },

    // 显示配置
    display: {
        // 显示的排行数量
        displayCount: 20,
        // 全局统计显示的群组数量
        globalStatsDisplayCount: 6,
        // 是否使用转发消息展示排行
        useForward: false,
        // 是否使用图片模式展示排行
        usePicture: true
    },

    // 消息统计配置
    message: {
        // 是否只统计文本消息
        onlyTextMessages: false,
        // 是否统计机器人消息
        countBotMessages: false,
        // 是否在每条消息后更新排行榜（不建议开启）
        updateRankingOnEveryMessage: false
    },

    // 背景编辑器服务器配置
    backgroundServer: {
        // 服务器主机地址 (127.0.0.1 本地访问, 0.0.0.0 允许外部访问)
        host: "127.0.0.1",
        // 服务器端口
        port: 39999,
        // 协议类型 (http/https)
        protocol: "http",
        // 域名配置 (用于生成编辑器链接，可以是域名或IP地址)
        domain: "localhost"
    },

    // Web服务器配置
    webServer: {
        // Umami 追踪脚本配置
        umami: {
            // 是否启用 Umami 追踪
            enabled: false,
            // Umami 脚本 URL（例如：https://your-umami-instance.com/script.js）
            scriptUrl: "",
            // Umami 网站 ID
            websiteId: ""
        }
    },

    // 数据库配置
    database: {
        // 数据库类型：'postgresql' 或 'sqlite'
        // 如果不指定，默认使用 'sqlite'
        type: "sqlite",
        
        // SQLite 配置（仅当 type === 'sqlite' 时需要）
        // 数据库文件路径（可选）
        // - 如果只写文件名（如 "speech_statistics.db"），会自动放在插件 data 目录下
        // - 如果写相对路径（如 "data/my.db"），会相对于插件目录
        // - 如果写绝对路径，则使用该路径
        // - 如果不指定，默认使用 "speech_statistics.db"（在插件 data 目录下）
        path: "speech_statistics.db",
        
        // PostgreSQL 配置（仅当 type === 'postgresql' 时需要）
        // 数据库主机地址
        host: "localhost",
        // 数据库端口
        port: 5432,
        // 数据库名称
        database: "speech_statistics",
        // 数据库用户名
        user: "postgres",
        // 数据库密码
        password: "",
        // 连接池配置
        pool: {
            // 最大连接数
            max: 20,
            // 最小连接数
            min: 5,
            // 连接超时时间（毫秒）
            idleTimeoutMillis: 30000,
            // 连接获取超时时间（毫秒）
            connectionTimeoutMillis: 2000
        },
        // SSL 配置（如果需要）
        ssl: false
    },

    // 数据存储配置
    dataStorage: {
        // 备份保留数量（每个文件保留的备份数量）
        backupRetentionCount: 10,
        // 文件锁超时时间（毫秒）
        lockTimeout: 5000,
        // 锁过期时间（毫秒）
        lockExpiration: 30000,
        // 重试次数
        maxRetries: 3,
        // 重试延迟基数（毫秒）
        retryDelayBase: 100,
        // 最大重试延迟（毫秒）
        maxRetryDelay: 1000
    },

    // 成就系统配置
    achievements: {
        // 是否启用成就系统
        enabled: true,
        // 成就检查频率（毫秒，0表示每次消息都检查）
        checkInterval: 0,
        // 成就排行榜显示数量
        rankingDisplayCount: 10
    },

    // 归档群组配置
    archivedGroups: {
        // 清理任务配置
        cleanup: {
            // 是否启用清理任务
            enabled: true,
            // 执行时间：小时（0-23，默认 2 表示凌晨2点）
            scheduleHour: 2,
            // 执行时间：分钟（0-59，默认 0）
            scheduleMinute: 0,
            // 执行间隔（小时，默认 24 表示每24小时执行一次）
            intervalHours: 24,
            // 保留天数（默认 60 天，超过此天数的归档群组将被永久删除）
            retentionDays: 60
        }
    }
};

export { configTemplate };

