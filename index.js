import { Plugin } from './src/core/Plugin.js';
import { PathResolver } from './src/core/utils/PathResolver.js';
import { getWebServer } from './src/services/WebServer.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'url';
import path from 'path';

// 获取插件目录和package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, 'package.json');

let packageJson;
try {
    packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
} catch (error) {
    logger.error('[发言统计] 读取package.json失败:', error);
    packageJson = { version: '3.0.0' };
}

const version = packageJson.version;

// 全局服务器实例（使用WebServer单例）
// 注意：服务器启动由 Plugin.init() 方法负责，这里只获取实例
let globalWebServer = null;

// 初始化数据库
import { getDatabaseService } from './src/core/database/DatabaseService.js';
const dbService = getDatabaseService();
try {
    await dbService.initialize();
} catch (error) {
    // 只输出错误消息，抛出简化的错误字符串以避免显示完整错误对象
    const errorMsg = error.message || '数据库初始化失败';
    logger.error('[发言统计] ' + errorMsg);
    // 抛出字符串而不是错误对象，插件加载器会将其显示为简单文本
    throw errorMsg;
}

try {
    // 获取数据库类型用于日志显示
    const { globalConfig } = await import('./src/core/ConfigManager.js');
    const dbConfig = globalConfig.getConfig('database') || {};
    const dbType = (dbConfig.type || 'sqlite').toLowerCase();
    const dbTypeName = dbType === 'sqlite' ? 'SQLite' : 'PostgreSQL';
    
    logger.info('[发言统计] ---------^_^---------');
    logger.info(`[发言统计] 发言统计插件 v${version} 初始化成功~`);
    logger.info(`[发言统计] 使用${dbTypeName}数据库存储`);
    logger.info('[发言统计] 支持功能：总榜、日榜、周榜、月榜、个人统计、背景自定义、僵尸群清理');
    logger.info('[发言统计] Web服务器将在插件初始化时自动启动');

    // 获取WebServer实例（服务器启动由 Plugin.init() 方法负责）
    globalWebServer = getWebServer();

    logger.info('[发言统计] ---------^_^---------');
} catch (error) {
    logger.error('[发言统计] 插件初始化失败:', error);
}

// 导出全局服务器实例（兼容性导出）
export {
    globalWebServer as globalBackgroundServer,
    globalWebServer
};

export default Plugin;

