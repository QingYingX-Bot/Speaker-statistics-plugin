import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import crypto from 'crypto';
import { PathResolver } from '../core/utils/PathResolver.js';
import { globalConfig } from '../core/ConfigManager.js';
import { TimeUtils } from '../core/utils/TimeUtils.js';

/**
 * 背景服务器
 * 提供背景图片上传、管理和编辑功能
 */
class BackgroundServer {
    constructor() {
        this.app = express();
        this.backgroundsDir = PathResolver.getBackgroundsDir();
        this.server = null;
        this.isRunning = false;

        // 确保背景目录存在
        PathResolver.ensureDirectory(this.backgroundsDir);
        PathResolver.ensureDirectory(PathResolver.getBackgroundsDir('normal'));
        PathResolver.ensureDirectory(PathResolver.getBackgroundsDir('ranking'));

        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * 加载配置
     */
    loadConfig() {
        try {
            const config = globalConfig.getConfig('backgroundServer') || {};
            return {
                host: config.host || "127.0.0.1",
                port: config.port || 39999,
                protocol: config.protocol || "http",
                domain: config.domain || "localhost"
            };
        } catch (error) {
            globalConfig.error('读取背景服务器配置失败:', error);
            return {
                host: "127.0.0.1",
                port: 39999,
                protocol: "http",
                domain: "localhost"
            };
        }
    }

    /**
     * 设置中间件
     */
    setupMiddleware() {
        // 解析JSON
        this.app.use(express.json());

        // 解析URL编码
        this.app.use(express.urlencoded({ extended: true }));

        // 静态文件服务
        const webDir = PathResolver.getWebDir();
        if (fs.existsSync(webDir)) {
            this.app.use(express.static(webDir));
        }

        // CORS设置
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });
    }

    /**
     * 设置上传中间件
     */
    uploadMiddleware() {
        const storage = multer.memoryStorage();
        return multer({
            storage: storage,
            limits: {
                fileSize: 5 * 1024 * 1024 // 5MB
            },
            fileFilter: (req, file, cb) => {
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                if (allowedTypes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error('不支持的文件类型，请使用JPG、PNG或WebP格式'), false);
                }
            }
        }).single('background');
    }

    /**
     * 设置路由
     */
    setupRoutes() {
        // 根路径 - 提供背景编辑器页面
        this.app.get('/', (req, res) => {
            const editorPath = path.join(PathResolver.getWebDir(), 'editor.html');
            if (fs.existsSync(editorPath)) {
                res.sendFile(editorPath);
            } else {
                res.status(404).send('背景编辑器页面未找到');
            }
        });

        // 获取背景图片API
        this.app.get('/api/background/:userId', (req, res) => {
            try {
                const userId = req.params.userId;
                const backgroundType = req.query.type || 'ranking';

                let backgroundPath = null;

                if (backgroundType === 'ranking') {
                    const rankingPath = path.join(this.backgroundsDir, 'ranking', `${userId}.jpg`);
                    if (fs.existsSync(rankingPath)) {
                        backgroundPath = rankingPath;
                    } else {
                        const normalPath = path.join(this.backgroundsDir, 'normal', `${userId}.jpg`);
                        if (fs.existsSync(normalPath)) {
                            backgroundPath = normalPath;
                        }
                    }
                } else {
                    const normalPath = path.join(this.backgroundsDir, 'normal', `${userId}.jpg`);
                    if (fs.existsSync(normalPath)) {
                        backgroundPath = normalPath;
                    }
                }

                if (!backgroundPath) {
                    return res.status(404).json({
                        error: '背景图片不存在'
                    });
                }

                res.setHeader('Content-Type', 'image/jpeg');
                res.setHeader('Cache-Control', 'public, max-age=3600');
                res.sendFile(backgroundPath);

            } catch (error) {
                globalConfig.error('获取背景图片失败:', error);
                res.status(500).json({
                    error: '获取背景图片失败'
                });
            }
        });

        // 上传背景图片API
        this.app.post('/api/apply-background', this.uploadMiddleware(), async (req, res) => {
            try {
                const backgroundType = req.body.backgroundType || 'normal';
                const backgroundTypeText = backgroundType === 'ranking' ? '排行榜背景' : '普通背景';

                if (!req.file) {
                    return res.status(400).json({
                        error: '没有上传文件'
                    });
                }

                const userId = req.body.userId;
                const secretKey = req.body.secretKey;

                if (!userId) {
                    return res.status(400).json({
                        error: '缺少userId参数'
                    });
                }

                if (!secretKey) {
                    return res.status(400).json({
                        error: '缺少秘钥参数'
                    });
                }

                // 验证秘钥
                const keyValidation = await this.validateSecretKey(userId, secretKey);
                if (!keyValidation.valid) {
                    return res.status(401).json({
                        error: keyValidation.message || '秘钥验证失败'
                    });
                }

                // 确定输出目录和文件名
                const subDir = backgroundType === 'ranking' ? 'ranking' : 'normal';
                const fileName = `${userId}.jpg`;
                const outputDir = path.join(this.backgroundsDir, subDir);
                const outputPath = path.join(outputDir, fileName);

                // 确保子目录存在
                PathResolver.ensureDirectory(outputDir);

                // 处理并保存图片
                await sharp(req.file.buffer)
                    .jpeg({
                        quality: 95,
                        progressive: true
                    })
                    .toFile(outputPath);

                globalConfig.debug(`[发言统计] ${backgroundTypeText}图片处理完成，保存到: ${outputPath}`);

                const responseData = {
                    success: true,
                    message: `${backgroundTypeText}设置成功`,
                    path: outputPath
                };

                if (backgroundType === 'ranking') {
                    responseData.dimensions = '1520x200';
                }

                res.json(responseData);

            } catch (error) {
                globalConfig.error('处理背景图片失败:', error);
                let errorMessage = '处理图片失败';
                if (error.message.includes('超时')) {
                    errorMessage = '图片处理超时，请尝试使用较小的图片';
                } else if (error.message.includes('Invalid input')) {
                    errorMessage = '图片格式不支持，请使用JPG、PNG等常见格式';
                }
                res.status(500).json({
                    error: errorMessage
                });
            }
        });

        // 删除背景API
        this.app.delete('/api/background/:userId', async (req, res) => {
            try {
                const userId = req.params.userId;
                const backgroundType = req.query.type || 'normal';

                const subDir = backgroundType === 'ranking' ? 'ranking' : 'normal';
                const backgroundPath = path.join(this.backgroundsDir, subDir, `${userId}.jpg`);

                if (fs.existsSync(backgroundPath)) {
                    fs.unlinkSync(backgroundPath);
                    res.json({
                        success: true,
                        message: '背景已删除'
                    });
                } else {
                    res.status(404).json({
                        error: '背景文件不存在'
                    });
                }
            } catch (error) {
                globalConfig.error('删除背景失败:', error);
                res.status(500).json({
                    error: '删除背景失败'
                });
            }
        });

        // 获取秘钥API
        this.app.get('/api/secret-key/:userId', (req, res) => {
            try {
                const userId = req.params.userId;
                const keyFilePath = path.join(PathResolver.getDataDir(), 'key.json');

                if (!fs.existsSync(keyFilePath)) {
                    return res.status(404).json({
                        error: '秘钥文件不存在'
                    });
                }

                const keyData = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
                const userKeyData = keyData[userId];

                if (!userKeyData) {
                    return res.status(404).json({
                        error: '用户秘钥不存在'
                    });
                }

                if (userKeyData.hash && userKeyData.salt) {
                    if (userKeyData.originalKey) {
                        res.json({
                            secretKey: userKeyData.originalKey,
                            message: '秘钥获取成功',
                            hasExistingKey: true
                        });
                    } else {
                        res.json({
                            secretKey: '***已加密***',
                            message: '秘钥已加密存储，无法显示原始值',
                            hasExistingKey: true
                        });
                    }
                } else {
                    res.status(404).json({
                        error: '秘钥格式无效，请重新设置'
                    });
                }
            } catch (error) {
                globalConfig.error('读取秘钥文件失败:', error);
                res.status(500).json({
                    error: '读取秘钥文件失败'
                });
            }
        });

        // 保存秘钥API
        this.app.post('/api/save-secret-key', async (req, res) => {
            try {
                const { userId, oldSecretKey, secretKey } = req.body;

                if (!userId || !secretKey) {
                    return res.status(400).json({
                        error: '缺少必要参数'
                    });
                }

                if (secretKey.length < 3) {
                    return res.status(400).json({
                        error: '秘钥长度至少3个字符'
                    });
                }

                const keyFilePath = path.join(PathResolver.getDataDir(), 'key.json');

                // 读取现有数据
                let keyData = {};
                if (fs.existsSync(keyFilePath)) {
                    keyData = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
                }

                // 如果提供了原秘钥，验证原秘钥
                if (oldSecretKey && keyData[userId]) {
                    const userKeyData = keyData[userId];
                    if (userKeyData.hash && userKeyData.salt) {
                        const inputHash = crypto.pbkdf2Sync(oldSecretKey, userKeyData.salt, 1000, 64, 'sha512').toString('hex');
                        if (inputHash !== userKeyData.hash) {
                            return res.status(401).json({
                                error: '原秘钥验证失败'
                            });
                        }
                    }
                }

                // 生成新秘钥的哈希
                const salt = crypto.randomBytes(16).toString('hex');
                const hash = crypto.pbkdf2Sync(secretKey, salt, 1000, 64, 'sha512').toString('hex');

                // 保存秘钥（同时保存原始值用于编辑器）
                keyData[userId] = {
                    hash: hash,
                    salt: salt,
                    originalKey: secretKey,
                    createdAt: TimeUtils.formatDateTimeForDB(),
                    updatedAt: TimeUtils.formatDateTimeForDB()
                };

                // 确保目录存在
                PathResolver.ensureDirectory(path.dirname(keyFilePath));

                // 保存文件
                fs.writeFileSync(keyFilePath, JSON.stringify(keyData, null, 2), 'utf8');

                res.json({
                    success: true,
                    message: '秘钥保存成功'
                });

            } catch (error) {
                globalConfig.error('保存秘钥失败:', error);
                res.status(500).json({
                    error: '保存秘钥失败'
                });
            }
        });

        // 验证秘钥API
        this.app.post('/api/validate-secret-key', async (req, res) => {
            try {
                const { userId, secretKey } = req.body;

                if (!userId || !secretKey) {
                    return res.status(400).json({
                        error: '缺少必要参数',
                        valid: false
                    });
                }

                const validation = await this.validateSecretKey(userId, secretKey);
                res.json({
                    valid: validation.valid,
                    message: validation.message
                });

            } catch (error) {
                globalConfig.error('验证秘钥失败:', error);
                res.status(500).json({
                    error: '验证秘钥失败',
                    valid: false
                });
            }
        });
    }

    /**
     * 验证秘钥
     * @param {string} userId 用户ID
     * @param {string} secretKey 秘钥
     * @returns {Promise<Object>} { valid: boolean, message?: string }
     */
    async validateSecretKey(userId, secretKey) {
        try {
            const keyFilePath = path.join(PathResolver.getDataDir(), 'key.json');

            if (!fs.existsSync(keyFilePath)) {
                return {
                    valid: false,
                    message: '秘钥文件不存在'
                };
            }

            const keyData = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
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
     * 启动服务器
     */
    async start() {
        if (this.isRunning) {
            globalConfig.debug('背景服务器已在运行');
            return;
        }

        try {
            const config = this.loadConfig();
            const port = config.port || 39999;
            const host = config.host || "127.0.0.1";

            this.server = this.app.listen(port, host, () => {
                this.isRunning = true;
                const url = `${config.protocol}://${config.domain || host}:${port}`;
                globalConfig.debug(`[发言统计] 背景编辑器服务器启动成功: ${url}`);
            });

            this.server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    globalConfig.error(`[发言统计] 端口 ${port} 已被占用，背景服务器启动失败`);
                } else {
                    globalConfig.error('[发言统计] 背景服务器错误:', error);
                }
                this.isRunning = false;
            });

        } catch (error) {
            globalConfig.error('[发言统计] 背景服务器启动失败:', error);
            this.isRunning = false;
            throw error;
        }
    }

    /**
     * 停止服务器
     */
    async stop() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    this.isRunning = false;
                    this.server = null;
                    globalConfig.debug('[发言统计] 背景服务器已关闭');
                    resolve();
                });
            });
        }
    }
}

export { BackgroundServer };
export default BackgroundServer;

