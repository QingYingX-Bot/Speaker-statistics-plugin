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
        useOkMarker: false
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

    // PostgreSQL 数据库配置
    database: {
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
    }
};

export { configTemplate };

