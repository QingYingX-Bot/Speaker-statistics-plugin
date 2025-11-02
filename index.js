import { Plugin } from './src/core/Plugin.js';
import { PathResolver } from './src/core/utils/PathResolver.js';
import { BackgroundServer } from './src/services/BackgroundServer.js';
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

// 全局服务器实例
let globalBackgroundServer = null;

// 启动背景编辑器服务器
async function startBackgroundServer() {
    try {
        globalBackgroundServer = new BackgroundServer();
        await globalBackgroundServer.start();
        logger.info('[发言统计] 背景编辑器服务器启动成功');
    } catch (error) {
        logger.error('[发言统计] 背景编辑器服务器启动失败:', error.message);
    }
}

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
    logger.info('[发言统计] ---------^_^---------');
    logger.info(`[发言统计] 发言统计插件 v${version} 初始化成功~`);
    logger.info('[发言统计] 使用PostgreSQL数据库存储');
    logger.info('[发言统计] 支持功能：总榜、日榜、周榜、月榜、个人统计、背景自定义、僵尸群清理');

    // 启动背景编辑器服务器
    startBackgroundServer();

    logger.info('[发言统计] ---------^_^---------');
} catch (error) {
    logger.error('[发言统计] 插件初始化失败:', error);
}

// 导出全局服务器实例
export {
    globalBackgroundServer
};

// 导出
export { Plugin as SpeechStatisticsPlugin };
export { Plugin };
export default Plugin;

