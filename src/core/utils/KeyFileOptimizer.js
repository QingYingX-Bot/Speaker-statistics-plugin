import fs from 'fs';
import path from 'path';
import { PathResolver } from './PathResolver.js';
import { globalConfig } from '../ConfigManager.js';

/**
 * key.json 文件优化工具
 * 用于清理和优化 key.json 文件结构
 */
class KeyFileOptimizer {
    /**
     * 优化 key.json 文件
     * - 移除 originalKey 字段（明文秘钥，安全风险）
     * - 确保所有必需字段存在
     * - 验证数据格式
     * @returns {Promise<{success: boolean, cleaned: number, message?: string}>}
     */
    static async optimizeKeyFile() {
        try {
            const keyFilePath = path.join(PathResolver.getDataDir(), 'key.json');
            
            if (!fs.existsSync(keyFilePath)) {
                return {
                    success: true,
                    cleaned: 0,
                    message: 'key.json 文件不存在，无需优化'
                };
            }

            // 读取文件
            let keyData = {};
            try {
                const content = fs.readFileSync(keyFilePath, 'utf8').trim();
                if (!content) {
                    return {
                        success: true,
                        cleaned: 0,
                        message: 'key.json 文件为空，无需优化'
                    };
                }
                keyData = JSON.parse(content);
            } catch (error) {
                return {
                    success: false,
                    cleaned: 0,
                    message: `读取 key.json 失败: ${error.message}`
                };
            }

            let cleanedCount = 0;
            let optimized = false;

            // 遍历所有用户，清理数据
            for (const [userId, userData] of Object.entries(keyData)) {
                if (!userData || typeof userData !== 'object') {
                    continue;
                }

                const originalKeys = Object.keys(userData);
                
                // 移除 originalKey 字段
                if (userData.originalKey) {
                    delete userData.originalKey;
                    cleanedCount++;
                    optimized = true;
                }

                // 确保必需字段存在
                if (!userData.hash || !userData.salt) {
                    globalConfig.warn(`[key.json优化] 用户 ${userId} 缺少必需字段 (hash/salt)，跳过`);
                    continue;
                }

                // 确保 role 字段存在
                if (!userData.role) {
                    userData.role = 'user';
                    optimized = true;
                }

                // 验证 role 值
                if (userData.role !== 'admin' && userData.role !== 'user') {
                    globalConfig.warn(`[key.json优化] 用户 ${userId} 的 role 值无效 (${userData.role})，重置为 'user'`);
                    userData.role = 'user';
                    optimized = true;
                }
            }

            // 如果有优化，保存文件
            if (optimized) {
                // 确保目录存在
                PathResolver.ensureDirectory(path.dirname(keyFilePath));
                
                // 保存优化后的数据
                fs.writeFileSync(keyFilePath, JSON.stringify(keyData, null, 2), 'utf8');
                
                globalConfig.debug(`[key.json优化] 优化完成，清理了 ${cleanedCount} 个用户的明文秘钥`);
                
                return {
                    success: true,
                    cleaned: cleanedCount,
                    message: `优化完成，清理了 ${cleanedCount} 个用户的明文秘钥`
                };
            }

            return {
                success: true,
                cleaned: 0,
                message: 'key.json 文件已是最优状态，无需优化'
            };

        } catch (error) {
            globalConfig.error('[key.json优化] 优化失败:', error);
            return {
                success: false,
                cleaned: 0,
                message: `优化失败: ${error.message}`
            };
        }
    }

    /**
     * 验证 key.json 文件格式
     * @returns {Promise<{valid: boolean, errors: string[]}>}
     */
    static async validateKeyFile() {
        const errors = [];
        
        try {
            const keyFilePath = path.join(PathResolver.getDataDir(), 'key.json');
            
            if (!fs.existsSync(keyFilePath)) {
                return {
                    valid: true,
                    errors: []
                };
            }

            const content = fs.readFileSync(keyFilePath, 'utf8').trim();
            if (!content) {
                return {
                    valid: true,
                    errors: []
                };
            }

            const keyData = JSON.parse(content);

            // 验证每个用户的数据
            for (const [userId, userData] of Object.entries(keyData)) {
                if (!userData || typeof userData !== 'object') {
                    errors.push(`用户 ${userId}: 数据格式无效`);
                    continue;
                }

                // 检查必需字段
                if (!userData.hash) {
                    errors.push(`用户 ${userId}: 缺少 hash 字段`);
                }
                if (!userData.salt) {
                    errors.push(`用户 ${userId}: 缺少 salt 字段`);
                }

                // 检查 originalKey 字段（安全警告）
                if (userData.originalKey) {
                    errors.push(`用户 ${userId}: 存在明文秘钥 (originalKey)，建议移除`);
                }

                // 检查 role 字段
                if (userData.role && userData.role !== 'admin' && userData.role !== 'user') {
                    errors.push(`用户 ${userId}: role 值无效 (${userData.role})，应为 'admin' 或 'user'`);
                }
            }

            return {
                valid: errors.length === 0,
                errors
            };

        } catch (error) {
            errors.push(`文件解析失败: ${error.message}`);
            return {
                valid: false,
                errors
            };
        }
    }
}

export { KeyFileOptimizer };
export default KeyFileOptimizer;

