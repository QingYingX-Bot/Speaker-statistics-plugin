import fs from 'fs';
import path from 'path';
import { PathResolver } from './utils/PathResolver.js';
import { configTemplate } from '../../config/configTemplate.js';

/**
 * 深度比较两个对象是否相等
 * @param {any} obj1 对象1
 * @param {any} obj2 对象2
 * @returns {boolean} 是否相等
 */
function deepEqual(obj1, obj2) {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    if (typeof obj1 !== typeof obj2) return false;

    if (typeof obj1 !== 'object') return obj1 === obj2;

    if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

    if (Array.isArray(obj1)) {
        if (obj1.length !== obj2.length) return false;
        for (let i = 0; i < obj1.length; i++) {
            if (!deepEqual(obj1[i], obj2[i])) return false;
        }
        return true;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
        if (!keys2.includes(key)) return false;
        if (!deepEqual(obj1[key], obj2[key])) return false;
    }

    return true;
}

/**
 * 全局配置管理类
 * 负责全局配置的加载、保存和监听
 */
class ConfigManager {
    constructor() {
        // 使用动态路径解析
        this.configPath = path.join(PathResolver.getDataDir(), 'global.json');
        this.config = null;
        this.watcher = null;
        this.lastFileMtime = null;
        this.reloadTimeout = null;
        this.startWatching();
        this.initConfig();
    }

    /**
     * 初始化配置
     */
    initConfig() {
        try {
            this.config = this.loadConfig();
            if (this.config?.global?.debugLog) {
                this.debug(`全局配置路径: ${this.configPath}`);
                this.debug(`当前配置: ${JSON.stringify(this.config)}`);
            }
        } catch (error) {
            global.logger.error(`[发言统计] 初始化配置失败:`, error);
            this.config = this.getDefaultConfig();
        }
    }

    /**
     * 获取默认配置
     * @returns {Object} 默认配置对象
     */
    getDefaultConfig() {
        return {
            ...configTemplate
        };
    }

    /**
     * 开始监听配置文件变化
     */
    startWatching() {
        if (this.watcher) {
            this.watcher.close();
        }

        // 确保配置目录存在
        const configDir = path.dirname(this.configPath);
        if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

        // 如果配置文件不存在，创建默认配置
        if (!fs.existsSync(this.configPath)) {
            this.saveConfig(this.getDefaultConfig());
        }

        try {
            this.watcher = fs.watch(this.configPath, (eventType) => {
                if (eventType === 'change') {
                    // 增加防抖机制，避免频繁触发
                    if (this.reloadTimeout) {
                        clearTimeout(this.reloadTimeout);
                    }
                    this.reloadTimeout = setTimeout(() => {
                        // 只在debug模式下输出重载日志
                        if (this.config?.global?.debugLog) {
                            this.debug('检测到配置文件变化，正在重新加载...');
                        }
                        this.reloadConfig();
                    }, 2000); // 2秒延迟，减少频繁重载
                }
            });

            // 只在debug模式下输出启动日志
            if (this.config?.global?.debugLog) {
                this.debug('已启动配置文件监听');
            }
        } catch (error) {
            logger.error(`[发言统计] 启动配置文件监听失败: ${error.message}`);
            this.error('启动配置文件监听失败:', error);
        }
    }

    /**
     * 重新加载配置
     */
    reloadConfig() {
        try {
            // 检查文件是否真的发生了变化
            const stats = fs.statSync(this.configPath);
            const currentMtime = stats.mtime.getTime();

            // 如果文件修改时间没有变化，跳过重载
            if (this.lastFileMtime && this.lastFileMtime === currentMtime) {
                this.debug('文件修改时间未变化，跳过重载');
                return;
            }

            this.lastFileMtime = currentMtime;

            const newConfig = this.loadConfig();
            const oldConfig = this.config ? { ...this.config } : null;
            this.config = newConfig;

            // 检查并记录变化的配置项
            if (this.config?.global?.debugLog && oldConfig) {
                if (!deepEqual(newConfig, oldConfig)) {
                    this.debug('配置重新加载完成，检测到配置变化');
                } else {
                    this.debug('配置内容未发生变化');
                }
            }
        } catch (error) {
            this.error('重新加载配置失败:', error);
        }
    }

    /**
     * 加载配置文件
     * @returns {Object} 配置对象
     */
    loadConfig() {
        try {
            if (!fs.existsSync(this.configPath)) {
                return this.getDefaultConfig();
            }

            const configContent = fs.readFileSync(this.configPath, 'utf8');
            const config = JSON.parse(configContent);

            // 与默认配置合并，确保所有必要的字段都存在
            const defaultConfig = this.getDefaultConfig();
            const mergedConfig = {
                ...defaultConfig,
                ...config
            };

            // 确保嵌套对象也被正确合并
            if (mergedConfig.global && defaultConfig.global) {
                mergedConfig.global = {
                    ...defaultConfig.global,
                    ...mergedConfig.global
                };
            }
            if (mergedConfig.display && defaultConfig.display) {
                mergedConfig.display = {
                    ...defaultConfig.display,
                    ...mergedConfig.display
                };
            }
            if (mergedConfig.message && defaultConfig.message) {
                mergedConfig.message = {
                    ...defaultConfig.message,
                    ...mergedConfig.message
                };
            }
            if (mergedConfig.backgroundServer && defaultConfig.backgroundServer) {
                mergedConfig.backgroundServer = {
                    ...defaultConfig.backgroundServer,
                    ...mergedConfig.backgroundServer
                };
            }
            if (mergedConfig.webServer && defaultConfig.webServer) {
                mergedConfig.webServer = {
                    ...defaultConfig.webServer,
                    ...mergedConfig.webServer
                };
                // 深度合并 umami 配置
                if (mergedConfig.webServer.umami && defaultConfig.webServer.umami) {
                    mergedConfig.webServer.umami = {
                        ...defaultConfig.webServer.umami,
                        ...mergedConfig.webServer.umami
                    };
                }
            }
            if (mergedConfig.dataStorage && defaultConfig.dataStorage) {
                mergedConfig.dataStorage = {
                    ...defaultConfig.dataStorage,
                    ...mergedConfig.dataStorage
                };
            }
            if (mergedConfig.achievements && defaultConfig.achievements) {
                mergedConfig.achievements = {
                    ...defaultConfig.achievements,
                    ...mergedConfig.achievements
                };
            }

            return mergedConfig;
        } catch (error) {
            this.error('读取配置文件失败:', error);
            return this.getDefaultConfig();
        }
    }

    /**
     * 保存配置文件
     * @param {Object} config 配置对象
     */
    saveConfig(config) {
        try {
            const dirPath = path.dirname(this.configPath);
            if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

            // 暂时停止监听，避免触发重载
            if (this.watcher) {
                this.watcher.close();
                this.watcher = null;
            }

            const configContent = JSON.stringify(config, null, 2);
            fs.writeFileSync(this.configPath, configContent);
            this.config = config;

            // 重新开始监听
            this.startWatching();

            if (this.config?.global?.debugLog) {
                this.debug(`配置保存成功`);
            }
        } catch (error) {
            this.error('保存全局配置失败:', error);
            throw error;
        }
    }

    /**
     * 更新配置
     * @param {string} key 配置键
     * @param {any} value 配置值
     */
    updateConfig(key, value) {
        try {
            const config = this.loadConfig();

            // 处理嵌套配置项
            if (key.includes('.')) {
                const keys = key.split('.');
                let current = config;
                for (let i = 0; i < keys.length - 1; i++) {
                    if (!current[keys[i]]) {
                        current[keys[i]] = {};
                    }
                    current = current[keys[i]];
                }
                current[keys[keys.length - 1]] = value;
            } else {
                config[key] = value;
            }

            this.saveConfig(config);
            if (key === 'debugLog' || key === 'global.debugLog' || this.config?.global?.debugLog) {
                this.debug(`更新配置 ${key}: ${value}`);
            }
        } catch (error) {
            this.error('更新配置失败:', error);
            throw error;
        }
    }

    /**
     * 手动刷新配置（用于需要获取最新配置时）
     */
    refreshConfig() {
        try {
            const newConfig = this.loadConfig();
            const oldConfig = this.config ? { ...this.config } : null;
            this.config = newConfig;

            // 只在debug模式下记录配置变化
            if (this.config?.global?.debugLog && oldConfig) {
                if (!deepEqual(newConfig, oldConfig)) {
                    this.debug('配置刷新完成，检测到配置变化');
                }
            }
        } catch (error) {
            this.error('刷新配置失败:', error);
        }
    }

    /**
     * 获取配置值
     * @param {string} key 配置键
     * @param {boolean} forceRefresh 是否强制刷新配置
     * @returns {any} 配置值
     */
    getConfig(key, forceRefresh = false) {
        // 如果配置未初始化，先初始化
        if (!this.config) {
            this.initConfig();
        }

        // 如果需要强制刷新，则重新加载配置
        if (forceRefresh) {
            this.refreshConfig();
        }

        // 如果没有提供key，返回完整配置
        if (!key) {
            return this.config;
        }

        // 处理嵌套配置项
        let value;
        if (key.includes('.')) {
            const keys = key.split('.');
            value = this.config;
            for (const k of keys) {
                if (value && typeof value === 'object') {
                    value = value[k];
                } else {
                    value = undefined;
                    break;
                }
            }
        } else {
            value = this.config?.[key];
        }

        return value;
    }

    /**
     * 记录调试日志
     * @param {string} message 日志消息
     * @param {any[]} args 额外参数
     */
    debug(message, ...args) {
        if (this.config?.global?.debugLog) {
            global.logger.mark(`[发言统计] ${message}`, ...args);
        }
    }

    /**
     * 记录警告日志（总是记录，不受debugLog控制）
     * @param {string} message 日志消息
     * @param {any[]} args 额外参数
     */
    warn(message, ...args) {
        global.logger.warn(`[发言统计] ${message}`, ...args);
    }

    /**
     * 记录错误日志（总是记录，不受debugLog控制）
     * @param {string} message 日志消息
     * @param {any[]} args 额外参数
     */
    error(message, ...args) {
        global.logger.error(`[发言统计] ${message}`, ...args);
    }

    /**
     * 记录配置访问日志（仅在需要调试时使用）
     * @param {string} key 配置键
     * @param {any} value 配置值
     */
    logConfigAccess(key, value) {
        if (this.config?.global?.debugLog) {
            this.debug(`获取配置 ${key}: ${value}`);
        }
    }

    /**
     * 手动触发配置重载（用于测试）
     */
    forceReload() {
        logger.info('[发言统计] 开始强制重载配置...');
        this.reloadConfig();
        logger.info('[发言统计] 配置重载完成');
        return this.config;
    }

    /**
     * 批量设置配置数据（用于锅巴配置界面）
     * @param {Object} data 配置数据对象
     */
    setConfigData(data) {
        try {
            const config = this.loadConfig();
            
            // 处理嵌套配置项
            for (const [keyPath, value] of Object.entries(data)) {
                if (keyPath.includes('.')) {
                    const keys = keyPath.split('.');
                    let current = config;
                    for (let i = 0; i < keys.length - 1; i++) {
                        if (!current[keys[i]]) {
                            current[keys[i]] = {};
                        }
                        current = current[keys[i]];
                    }
                    current[keys[keys.length - 1]] = value;
                } else {
                    config[keyPath] = value;
                }
            }
            
            this.saveConfig(config);
            if (this.config?.global?.debugLog) {
                this.debug('批量设置配置成功');
            }
            return true;
        } catch (error) {
            this.error('批量设置配置失败:', error);
            return false;
        }
    }

    /**
     * 获取默认成就配置数据（系统内置）
     * 从 config/achievements/ 目录加载所有成就文件，并从 achievements-config.json 加载分类和稀有度配置
     * @returns {Object} 默认成就配置对象 { achievements: {}, categories: {}, rarities: {} }
     */
    getDefaultAchievementsConfig() {
        try {
            const configDir = PathResolver.getConfigDir();
            const achievementsDir = path.join(configDir, 'achievements');
            const achievementsConfigPath = path.join(configDir, 'achievements-config.json');
            const achievements = {};
            let categories = {};
            let rarities = {};

            // 加载成就配置（分类和稀有度）
            if (fs.existsSync(achievementsConfigPath)) {
                try {
                    const configContent = fs.readFileSync(achievementsConfigPath, 'utf8');
                    const config = JSON.parse(configContent);
                    categories = config.categories || {};
                    rarities = config.rarities || {};
                } catch (error) {
                    this.error('读取成就配置文件失败:', error);
                }
            }

            // 加载所有成就文件
            if (fs.existsSync(achievementsDir)) {
                const files = fs.readdirSync(achievementsDir).filter(file => file.endsWith('.json'));
                for (const file of files) {
                    const filePath = path.join(achievementsDir, file);
                    try {
                        const fileContent = fs.readFileSync(filePath, 'utf8');
                        const fileData = JSON.parse(fileContent);
                        Object.assign(achievements, fileData);
                    } catch (fileError) {
                        this.error(`加载成就文件失败: ${file}`, fileError);
                    }
                }
            }

            return { achievements, categories, rarities };
        } catch (error) {
            this.error('读取默认成就配置失败:', error);
            return { achievements: {}, categories: {}, rarities: {} };
        }
    }

    /**
     * 获取用户自定义成就配置数据（不包括 users.json）
     * @returns {Object} 用户成就配置对象
     */
    getUserAchievementsConfig() {
        try {
            const dataDir = PathResolver.getDataDir();
            const achievementsDir = path.join(dataDir, 'achievements');
            const achievements = {};

            // 检查是否存在用户自定义目录
            if (fs.existsSync(achievementsDir)) {
                const files = fs.readdirSync(achievementsDir).filter(file => 
                    file.endsWith('.json') && file !== 'users.json'  // 排除 users.json
                );
                for (const file of files) {
                    const filePath = path.join(achievementsDir, file);
                    try {
                        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                        Object.assign(achievements, fileData);
                    } catch (fileError) {
                        this.error(`加载用户成就文件失败: ${file}`, fileError);
                    }
                }
            }

            return achievements;
        } catch (error) {
            this.error('读取用户成就配置失败:', error);
            return {};
        }
    }

    /**
     * 获取用户成就配置数据（来自 users.json）
     * @returns {Object} 用户成就配置对象
     */
    getUsersAchievementsConfig() {
        try {
            const dataDir = PathResolver.getDataDir();
            const usersJsonPath = path.join(dataDir, 'achievements', 'users.json');
            const achievements = {};

            if (fs.existsSync(usersJsonPath)) {
                try {
                    const fileData = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
                    Object.assign(achievements, fileData);
                } catch (fileError) {
                    this.error('加载用户成就文件失败: users.json', fileError);
                }
            }

            return achievements;
        } catch (error) {
            this.error('读取用户成就配置失败:', error);
            return {};
        }
    }

    /**
     * 保存用户成就配置数据（保存到 users.json）
     * @param {Object} achievements 成就对象
     * @returns {boolean} 是否成功
     */
    setUsersAchievementsConfig(achievements) {
        try {
            const dataDir = PathResolver.getDataDir();
            const achievementsDir = path.join(dataDir, 'achievements');
            
            // 确保目录存在
            PathResolver.ensureDirectory(achievementsDir);
            
            const filePath = path.join(achievementsDir, 'users.json');
            const configContent = JSON.stringify(achievements, null, 2);
            fs.writeFileSync(filePath, configContent);
            
            if (this.config?.global?.debugLog) {
                this.debug('用户成就配置保存成功 (users.json)');
            }
            return true;
        } catch (error) {
            this.error('保存用户成就配置文件失败:', error);
            return false;
        }
    }

    /**
     * 保存用户自定义成就配置数据（保存为单个文件）
     * @param {Object} achievements 成就对象
     * @param {string} fileName 文件名（默认：custom.json）
     * @returns {boolean} 是否成功
     */
    setUserAchievementsConfig(achievements, fileName = 'custom.json') {
        try {
            const dataDir = PathResolver.getDataDir();
            const achievementsDir = path.join(dataDir, 'achievements');
            
            // 确保目录存在
            PathResolver.ensureDirectory(achievementsDir);
            
            const filePath = path.join(achievementsDir, fileName);
            const configContent = JSON.stringify(achievements, null, 2);
            fs.writeFileSync(filePath, configContent);
            
            if (this.config?.global?.debugLog) {
                this.debug('用户成就配置保存成功');
            }
            return true;
        } catch (error) {
            this.error('保存用户成就配置文件失败:', error);
            return false;
        }
    }

    /**
     * 获取所有成就配置数据（默认 + 用户自定义合并）
     * @returns {Object} 合并后的成就配置对象
     */
    getAllAchievementsConfig() {
        const defaultConfig = this.getDefaultAchievementsConfig();
        const userAchievements = this.getUserAchievementsConfig();
        
        // 合并默认和用户自定义成就
        return {
            achievements: {
                ...(defaultConfig.achievements || {}),
                ...userAchievements
            },
            categories: defaultConfig.categories || {},
            rarities: defaultConfig.rarities || {}
        };
    }

    /**
     * 获取群专属成就配置数据
     * @param {string} groupId 群号
     * @returns {Object} 群专属成就配置对象
     */
    getGroupAchievementsConfig(groupId) {
        try {
            const dataDir = PathResolver.getDataDir();
            const groupAchievementsDir = path.join(dataDir, 'achievements', 'group', groupId);
            const achievements = {};

            // 检查是否存在群专属目录
            if (fs.existsSync(groupAchievementsDir)) {
                const files = fs.readdirSync(groupAchievementsDir).filter(file => file.endsWith('.json'));
                for (const file of files) {
                    const filePath = path.join(groupAchievementsDir, file);
                    try {
                        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                        Object.assign(achievements, fileData);
                    } catch (fileError) {
                        this.error(`加载群专属成就文件失败: ${file}`, fileError);
                    }
                }
            }

            return achievements;
        } catch (error) {
            this.error(`读取群专属成就配置失败 (${groupId}):`, error);
            return {};
        }
    }

    /**
     * 保存群专属成就配置数据
     * @param {string} groupId 群号
     * @param {Object} achievements 成就对象
     * @param {string} fileName 文件名（默认：group.json）
     * @returns {boolean} 是否成功
     */
    setGroupAchievementsConfig(groupId, achievements, fileName = 'group.json') {
        try {
            const dataDir = PathResolver.getDataDir();
            const groupAchievementsDir = path.join(dataDir, 'achievements', 'group', groupId);
            
            // 确保目录存在
            PathResolver.ensureDirectory(groupAchievementsDir);
            
            const filePath = path.join(groupAchievementsDir, fileName);
            const configContent = JSON.stringify(achievements, null, 2);
            fs.writeFileSync(filePath, configContent);
            
            if (this.config?.global?.debugLog) {
                this.debug(`群专属成就配置保存成功 (${groupId})`);
            }
            return true;
        } catch (error) {
            this.error(`保存群专属成就配置文件失败 (${groupId}):`, error);
            return false;
        }
    }
}

// 创建单例实例
const globalConfig = new ConfigManager();
export { globalConfig, ConfigManager };
export default globalConfig;

