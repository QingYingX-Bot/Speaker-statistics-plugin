import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

/**
 * 路径解析器
 * 动态解析插件目录路径，消除硬编码
 */
class PathResolver {
    // 缓存插件根目录路径
    static _pluginRoot = null;

    /**
     * 获取插件根目录路径（动态解析）
     * @returns {string} 插件根目录路径
     */
    static getPluginDir() {
        if (this._pluginRoot) {
            return this._pluginRoot;
        }

        try {
            // 使用 import.meta.url 获取当前文件路径
            const currentFile = fileURLToPath(import.meta.url);
            const currentDir = path.dirname(currentFile);
            
            // 从当前文件向上查找，直到找到 package.json 或 plugins 目录
            let searchDir = currentDir;
            let maxDepth = 10; // 最多向上查找10层
            
            while (maxDepth-- > 0) {
                const packageJsonPath = path.join(searchDir, 'package.json');
                
                // 检查是否找到 package.json（插件根目录）
                if (fs.existsSync(packageJsonPath)) {
                    try {
                        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                        
                        // 验证是否是本插件（通过 name 字段）
                        if (packageJson.name === 'speaker-statistics-plugin') {
                            this._pluginRoot = searchDir;
                            return this._pluginRoot;
                        }
                    } catch (e) {
                        // 忽略解析错误，继续查找
                    }
                }
                
                // 向上查找
                const parentDir = path.dirname(searchDir);
                if (parentDir === searchDir) {
                    // 已到达根目录
                    break;
                }
                searchDir = parentDir;
            }
            
            // 如果找不到，回退到默认路径（plugins/Speaker-statistics-plugin）
            const fallbackPath = path.join(process.cwd(), 'plugins', 'Speaker-statistics-plugin');
            this._pluginRoot = fallbackPath;
            return this._pluginRoot;
        } catch (error) {
            // 如果出错，使用回退路径
            const fallbackPath = path.join(process.cwd(), 'plugins', 'Speaker-statistics-plugin');
            this._pluginRoot = fallbackPath;
            return this._pluginRoot;
        }
    }

    /**
     * 获取数据目录路径
     * @returns {string} 数据目录路径
     */
    static getDataDir() {
        return path.join(this.getPluginDir(), 'data');
    }

    /**
     * 获取配置目录路径
     * @returns {string} 配置目录路径
     */
    static getConfigDir() {
        return path.join(this.getPluginDir(), 'config');
    }

    /**
     * 获取资源目录路径
     * @returns {string} 资源目录路径
     */
    static getResourcesDir() {
        return path.join(this.getPluginDir(), 'resources');
    }

    /**
     * 获取模板目录路径
     * @returns {string} 模板目录路径
     */
    static getTemplatesDir() {
        return path.join(this.getResourcesDir(), 'templates');
    }

    /**
     * 获取 Web 资源目录路径
     * @returns {string} Web资源目录路径
     */
    static getWebDir() {
        return path.join(this.getResourcesDir(), 'web');
    }

    /**
     * 获取背景图片目录路径
     * @param {string} subDir 子目录名称 ('normal' 或 'ranking')
     * @returns {string} 背景图片目录路径
     */
    static getBackgroundsDir(subDir = '') {
        const baseDir = path.join(this.getDataDir(), 'backgrounds');
        return subDir ? path.join(baseDir, subDir) : baseDir;
    }

    /**
     * 获取临时文件目录路径
     * @returns {string} 临时文件目录路径
     */
    static getTempDir() {
        return path.join(this.getDataDir(), 'temp');
    }

    /**
     * 获取备份目录路径
     * @returns {string} 备份目录路径
     */
    static getBackupsDir() {
        return path.join(this.getDataDir(), 'backups');
    }

    /**
     * 获取数据库文件路径
     * @returns {string} 数据库文件路径
     */
    static getDatabasePath() {
        return path.join(this.getDataDir(), 'speech_statistics.db');
    }

    /**
     * 确保目录存在
     * @param {string} dirPath 目录路径
     */
    static ensureDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
}

export { PathResolver };

