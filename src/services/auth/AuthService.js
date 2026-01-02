import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { PathResolver } from '../../core/utils/PathResolver.js';
import { globalConfig } from '../../core/ConfigManager.js';
import { getDataService } from '../../core/DataService.js';

/**
 * 认证服务
 * 负责秘钥验证和管理
 */
class AuthService {
    /**
     * 安全读取 JSON 文件
     * @param {string} filePath 文件路径
     * @returns {object} JSON 对象，如果文件不存在或无效则返回空对象
     */
    _safeReadJsonFile(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                return {};
            }
            
            const content = fs.readFileSync(filePath, 'utf8').trim();
            
            // 如果文件为空，返回空对象
            if (!content) {
                return {};
            }
            
            return JSON.parse(content);
        } catch (error) {
            globalConfig.error('读取JSON文件失败:', error);
            // 如果解析失败，返回空对象
            return {};
        }
    }
    /**
     * 验证秘钥
     * @param {string} userId 用户ID
     * @param {string} secretKey 秘钥
     * @returns {Promise<{valid: boolean, message?: string}>}
     */
    async validateSecretKey(userId, secretKey) {
        try {
            const keyFilePath = path.join(PathResolver.getDataDir(), 'key.json');

            const keyData = this._safeReadJsonFile(keyFilePath);
            
            if (Object.keys(keyData).length === 0) {
                return {
                    valid: false,
                    message: '秘钥文件不存在或为空'
                };
            }
            const userKeyData = keyData[userId];

            if (!userKeyData || !userKeyData.hash || !userKeyData.salt) {
                return {
                    valid: false,
                    message: '用户秘钥不存在'
                };
            }

            // 验证秘钥
            const inputHash = crypto.pbkdf2Sync(secretKey, userKeyData.salt, 1000, 64, 'sha512').toString('hex');
            const isValid = inputHash === userKeyData.hash;

            return {
                valid: isValid,
                message: isValid ? '秘钥验证成功' : '秘钥验证失败'
            };

        } catch (error) {
            globalConfig.error('验证秘钥失败:', error);
            return {
                valid: false,
                message: '验证秘钥时出错'
            };
        }
    }

    /**
     * 获取用户秘钥
     * @param {string} userId 用户ID
     * @returns {Promise<{secretKey?: string, hasExistingKey: boolean, message?: string}>}
     */
    async getSecretKey(userId) {
        try {
            const keyFilePath = path.join(PathResolver.getDataDir(), 'key.json');

            const keyData = this._safeReadJsonFile(keyFilePath);
            
            if (Object.keys(keyData).length === 0) {
                return {
                    hasExistingKey: false,
                    message: '秘钥文件不存在或为空'
                };
            }
            const userKeyData = keyData[userId];

            if (!userKeyData) {
                return {
                    hasExistingKey: false,
                    message: '用户秘钥不存在'
                };
            }

            if (userKeyData.hash && userKeyData.salt) {
                // 不再返回明文秘钥，只返回提示信息
                    return {
                    secretKey: '***已加密存储***',
                        hasExistingKey: true,
                    message: '秘钥已加密存储，无法显示原始值。如需修改，请使用"修改秘钥"功能。'
                    };
            } else {
                return {
                    hasExistingKey: false,
                    message: '秘钥格式无效，请重新设置'
                };
            }
        } catch (error) {
            globalConfig.error('读取秘钥文件失败:', error);
            return {
                hasExistingKey: false,
                message: '读取秘钥文件失败'
            };
        }
    }

    /**
     * 保存用户秘钥
     * @param {string} userId 用户ID
     * @param {string} secretKey 秘钥
     * @param {string} oldSecretKey 旧秘钥（可选，用于验证）
     * @returns {Promise<{success: boolean, message?: string}>}
     */
    async saveSecretKey(userId, secretKey, oldSecretKey = null) {
        try {
            if (!userId || !secretKey) {
                return { success: false, message: '缺少必要参数' };
            }

            if (secretKey.length < 3) {
                return { success: false, message: '秘钥长度至少3个字符' };
            }

            const keyFilePath = path.join(PathResolver.getDataDir(), 'key.json');

            // 读取现有数据
            const keyData = this._safeReadJsonFile(keyFilePath);

            // 如果提供了原秘钥，验证原秘钥
            if (oldSecretKey && keyData[userId]) {
                const userKeyData = keyData[userId];
                if (userKeyData.hash && userKeyData.salt) {
                    const inputHash = crypto.pbkdf2Sync(oldSecretKey, userKeyData.salt, 1000, 64, 'sha512').toString('hex');
                    if (inputHash !== userKeyData.hash) {
                        return { success: false, message: '原秘钥验证失败' };
                    }
                }
            }

            // 生成新秘钥的哈希
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = crypto.pbkdf2Sync(secretKey, salt, 1000, 64, 'sha512').toString('hex');

            // 保存秘钥（不保存明文，只保存 hash 和 salt）
            const { TimeUtils } = await import('../../core/utils/TimeUtils.js');
            
            // 保留原有的 role 和 createdAt（如果存在）
            const existingUser = keyData[userId];
            const newUserData = {
                hash: hash,
                salt: salt,
                role: existingUser?.role || 'user', // 保留原有角色，新用户默认为 'user'
                createdAt: existingUser?.createdAt || TimeUtils.formatDateTime(TimeUtils.getUTC8Date()),
                updatedAt: TimeUtils.formatDateTime(TimeUtils.getUTC8Date())
            };
            
            // 移除 originalKey 字段（如果存在），提高安全性
            if (existingUser?.originalKey) {
                globalConfig.debug(`[权限系统] 移除用户 ${userId} 的明文秘钥存储`);
            }
            
            keyData[userId] = newUserData;

            // 确保目录存在
            const keyFileDir = path.dirname(keyFilePath);
            if (!fs.existsSync(keyFileDir)) fs.mkdirSync(keyFileDir, { recursive: true });

            // 保存文件
            fs.writeFileSync(keyFilePath, JSON.stringify(keyData, null, 2), 'utf8');

            return { success: true, message: '秘钥保存成功' };

        } catch (error) {
            globalConfig.error('保存秘钥失败:', error);
            return { success: false, message: '保存秘钥失败' };
        }
    }

    /**
     * 获取用户权限角色
     * 仅检查 key.json 中的角色配置
     * @param {string} userId 用户ID
     * @returns {Promise<'admin'|'user'|null>} 返回 'admin'（管理员）、'user'（普通用户）或 null（无权限）
     */
    async getUserRole(userId) {
        try {
            const keyFilePath = path.join(PathResolver.getDataDir(), 'key.json');
            
            const keyData = this._safeReadJsonFile(keyFilePath);
            
            // 如果文件为空，返回 null
            if (Object.keys(keyData).length === 0) {
                return null;
            }
            
            // admin 用户始终是管理员
            if (userId === 'admin') {
                return 'admin';
            }
            
            // 检查用户是否在 key.json 中
            if (keyData[userId]) {
                const userRole = keyData[userId].role;
                // 如果配置了 role 字段，使用配置的角色
                if (userRole === 'admin') {
                    return 'admin';
                }
                // 默认在 key.json 中的用户是普通用户
                return userRole || 'user';
            }
            
            return null;
        } catch (error) {
            globalConfig.error('获取用户权限失败:', error);
            return null;
        }
    }

    /**
     * 检查用户是否为管理员
     * @param {string} userId 用户ID
     * @param {string} secretKey 秘钥（可选，用于验证）
     * @returns {Promise<{isAdmin: boolean, role?: string, message?: string}>}
     */
    async checkAdminPermission(userId, secretKey = null) {
        try {
            // 验证秘钥（如果提供）
            if (secretKey) {
                const validation = await this.validateSecretKey(userId, secretKey);
                if (!validation.valid) {
                    return {
                        isAdmin: false,
                        message: '秘钥验证失败'
                    };
                }
            }

            const role = await this.getUserRole(userId);
            const isAdmin = role === 'admin';

            return {
                isAdmin,
                role: role || 'none',
                message: isAdmin ? '管理员权限验证成功' : '权限不足'
            };
        } catch (error) {
            globalConfig.error('检查管理员权限失败:', error);
            return {
                isAdmin: false,
                message: '检查权限时出错'
            };
        }
    }

    /**
     * 更新用户角色
     * @param {string} userId 用户ID
     * @param {string} role 角色 ('admin' | 'user')
     * @returns {Promise<{success: boolean, message?: string}>}
     */
    async updateUserRole(userId, role) {
        try {
            if (!userId || !role) {
                return { success: false, message: '缺少必要参数' };
            }

            if (role !== 'admin' && role !== 'user') {
                return { success: false, message: '角色必须是 admin 或 user' };
            }

            const keyFilePath = path.join(PathResolver.getDataDir(), 'key.json');

            // 读取现有数据
            const keyData = this._safeReadJsonFile(keyFilePath);

            // 检查用户是否存在
            if (!keyData[userId]) {
                return { success: false, message: '用户不存在' };
            }

            // 更新角色（保留其他字段，移除 originalKey）
            const { TimeUtils } = await import('../../core/utils/TimeUtils.js');
            const updatedUserData = {
                ...keyData[userId],
                role: role,
                updatedAt: TimeUtils.formatDateTime(TimeUtils.getUTC8Date())
            };
            
            // 移除 originalKey 字段（如果存在），提高安全性
            if (updatedUserData.originalKey) {
                delete updatedUserData.originalKey;
                globalConfig.debug(`[权限系统] 移除用户 ${userId} 的明文秘钥存储`);
            }
            
            keyData[userId] = updatedUserData;

            // 确保目录存在
            const keyFileDir = path.dirname(keyFilePath);
            if (!fs.existsSync(keyFileDir)) fs.mkdirSync(keyFileDir, { recursive: true });

            // 保存文件
            fs.writeFileSync(keyFilePath, JSON.stringify(keyData, null, 2), 'utf8');

            return { success: true, message: '角色更新成功' };

        } catch (error) {
            globalConfig.error('更新用户角色失败:', error);
            return { success: false, message: '更新用户角色失败' };
        }
    }

    /**
     * 获取所有用户列表（仅管理员）
     * @returns {Promise<Array<{userId: string, role: string, createdAt?: string, updatedAt?: string}>>}
     */
    async getAllUsers() {
        try {
            const keyFilePath = path.join(PathResolver.getDataDir(), 'key.json');
            
            const keyData = this._safeReadJsonFile(keyFilePath);
            
            // 如果文件为空，返回空数组
            if (Object.keys(keyData).length === 0) {
                return [];
            }
            const dataService = getDataService();
            const users = [];
            const seenUserIds = new Set(); // 用于去重

            for (const [userId, userData] of Object.entries(keyData)) {
                // 跳过重复的用户ID
                if (seenUserIds.has(userId)) {
                    continue;
                }
                seenUserIds.add(userId);

                // 确定角色：优先使用配置的 role，否则默认为 'user'
                let role = userData.role || 'user';
                // 如果 userId 是 'admin'，强制设置为 'admin'
                if (userId === 'admin') {
                    role = 'admin';
                }

                // 从数据库获取用户昵称
                let username = userId; // 默认使用 userId
                try {
                    // 查询数据库获取最新的昵称
                    const userStats = await dataService.dbService.get(
                        'SELECT nickname FROM user_stats WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
                        userId
                    );
                    if (userStats && userStats.nickname) {
                        username = userStats.nickname;
                    }
                } catch (error) {
                    // 如果查询失败，使用 userId 作为默认值
                    globalConfig.debug(`无法获取用户 ${userId} 的昵称:`, error.message);
                }

                users.push({
                    userId,
                    username,
                    role,
                    createdAt: userData.createdAt,
                    updatedAt: userData.updatedAt
                });
            }

            return users;
        } catch (error) {
            globalConfig.error('获取用户列表失败:', error);
            return [];
        }
    }
}

export { AuthService };
export default AuthService;
