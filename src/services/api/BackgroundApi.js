import { BaseApi } from './BaseApi.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PathResolver } from '../../core/utils/PathResolver.js';
import { AuthMiddleware } from './middleware/AuthMiddleware.js';
import { ApiResponse } from './utils/ApiResponse.js';

/**
 * 背景图片相关API路由 - 无Sharp版本
 */
export class BackgroundApi extends BaseApi {
    constructor(app, authService) {
        super(app);
        this.authService = authService;
        this.backgroundsDir = PathResolver.getBackgroundsDir();
        this.authMiddleware = new AuthMiddleware(authService);
    }

    /**
     * 设置上传中间件 - 使用磁盘存储
     */
    uploadMiddleware() {
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                const tempDir = path.join(this.backgroundsDir, 'temp');
                PathResolver.ensureDirectory(tempDir);
                cb(null, tempDir);
            },
            filename: (req, file, cb) => {
                const uniqueName = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                // 保持原始扩展名
                const ext = path.extname(file.originalname) || '.jpg';
                cb(null, uniqueName + ext);
            }
        });

        return multer({
            storage: storage,
            limits: {
                fileSize: 2 * 1024 * 1024, // 2MB
                files: 1
            },
            fileFilter: (req, file, cb) => {
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
                if (allowedTypes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error('只支持 JPG 和 PNG 格式'), false);
                }
            }
        }).single('background');
    }

    /**
     * Multer 错误处理中间件
     */
    multerErrorHandler() {
        return (err, req, res, next) => {
            if (!err) return next();
            if (res.headersSent) return next(err);
            
            // 清理临时文件
            if (req.file && req.file.path) {
                this.cleanupTempFile(req.file.path).catch(() => {});
            }
            
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return ApiResponse.error(res, '文件大小超过限制（最大2MB）', 400);
                }
                return ApiResponse.error(res, `文件上传错误: ${err.message}`, 400);
            }
            
            return ApiResponse.error(res, err.message || '文件上传失败', 400);
        };
    }

    /**
     * 清理临时文件
     */
    async cleanupTempFile(filePath) {
        try {
            if (filePath && fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
            }
        } catch (error) {
            // 忽略清理错误
        }
    }

    /**
     * 验证图片文件
     */
    async validateImageFile(filePath) {
        try {
            const stats = await fs.promises.stat(filePath);
            if (stats.size === 0) {
                throw new Error('文件为空');
            }
            if (stats.size > 2 * 1024 * 1024) {
                throw new Error('文件大小超过2MB');
            }
            
            // 读取文件头验证格式
            const buffer = Buffer.alloc(8);
            const fd = await fs.promises.open(filePath, 'r');
            try {
                await fd.read(buffer, 0, 8, 0);
            } finally {
                await fd.close();
            }
            
            // 检查文件头
            if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
                return 'jpeg';
            } else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
                return 'png';
            } else {
                throw new Error('不支持的文件格式，只支持 JPG 和 PNG');
            }
            
        } catch (error) {
            throw new Error(`文件验证失败: ${error.message}`);
        }
    }

    /**
     * 简单的图片复制处理（不进行尺寸调整）
     */
    async copyImageFile(inputPath, outputPath) {
        try {
            // 直接复制文件，不进行处理
            await fs.promises.copyFile(inputPath, outputPath);
            console.log('图片文件复制完成:', outputPath);
        } catch (error) {
            throw new Error(`文件保存失败: ${error.message}`);
        }
    }

    /**
     * 参数验证中间件
     */
    createUploadValidationMiddleware() {
        return ApiResponse.asyncHandler(async (req, res, next) => {
            const userId = req.query.userId || req.body.userId;
            const secretKey = req.query.secretKey || req.body.secretKey;
            
            if (!userId || !secretKey) {
                if (req.file && req.file.path) {
                    await this.cleanupTempFile(req.file.path);
                }
                return ApiResponse.error(res, '缺少必要参数: userId 和 secretKey', 400);
            }
            
            try {
                const keyValidation = await this.authService.validateSecretKey(userId, secretKey);
                if (!keyValidation.valid) {
                    if (req.file && req.file.path) {
                        await this.cleanupTempFile(req.file.path);
                    }
                    return ApiResponse.error(res, '秘钥验证失败', 401);
                }
                
                req.auth = { userId, secretKey, keyValidation };
                next();
            } catch (error) {
                if (req.file && req.file.path) {
                    await this.cleanupTempFile(req.file.path);
                }
                return ApiResponse.error(res, '秘钥验证失败', 500);
            }
        }, '参数验证失败');
    }

    /**
     * 图片处理中间件 - 简化版本
     */
    createImageProcessingMiddleware() {
        return ApiResponse.asyncHandler(async (req, res) => {
            let tempFilePath = null;
            
            try {
                if (!req.file) {
                    return ApiResponse.error(res, '没有上传文件', 400);
                }

                tempFilePath = req.file.path;
                const backgroundType = req.body.backgroundType || 'normal';
                const backgroundTypeText = backgroundType === 'ranking' ? '排行榜背景' : '普通背景';
                const { userId } = req.auth;

                // 验证文件
                const fileType = await this.validateImageFile(tempFilePath);

                // 输出路径 - 统一保存为 JPG
                const subDir = backgroundType === 'ranking' ? 'ranking' : 'normal';
                const fileName = `${userId}.jpg`;
                const outputDir = path.join(this.backgroundsDir, subDir);
                const outputPath = path.join(outputDir, fileName);

                // 确保目录存在
                PathResolver.ensureDirectory(outputDir);

                // 如果是PNG格式，需要转换（这里简单处理，直接复制）
                // 在实际应用中，你可能需要添加PNG到JPG的转换逻辑
                if (fileType === 'png') {
                    console.log('PNG格式图片，建议转换为JPG以获得更好性能');
                }

                // 复制/保存文件
                await this.copyImageFile(tempFilePath, outputPath);

                const responseData = {
                    path: outputPath,
                    message: `${backgroundTypeText}设置成功`,
                    note: '图片已保存，建议使用JPG格式以获得最佳性能'
                };

                if (backgroundType === 'ranking') {
                    responseData.recommendedDimensions = '1520x200像素';
                } else {
                    responseData.recommendedDimensions = '建议不超过1500x1500像素';
                }

                ApiResponse.success(res, responseData);

            } catch (error) {
                console.error('图片处理失败:', error.message);
                
                let userMessage = error.message;
                if (error.message.includes('文件验证失败')) {
                    userMessage = '图片文件损坏或格式不支持，请使用JPG或PNG格式';
                } else if (error.message.includes('文件大小')) {
                    userMessage = '图片文件过大，请使用小于2MB的图片';
                }

                return ApiResponse.error(res, userMessage, 400);
            } finally {
                // 清理临时文件
                if (tempFilePath) {
                    await this.cleanupTempFile(tempFilePath);
                }
            }
        }, '处理背景图片失败');
    }

    /**
     * 获取背景图片API
     */
    registerGetBackgroundRoute() {
        this.get('/api/background/:userId', (req, res) => {
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
                    return ApiResponse.error(res, '背景图片不存在', 404);
                }

                // 根据实际文件类型设置Content-Type
                const ext = path.extname(backgroundPath).toLowerCase();
                const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
                
                res.setHeader('Content-Type', contentType);
                res.setHeader('Cache-Control', 'public, max-age=3600');
                res.sendFile(backgroundPath);
        }, '获取背景图片失败');
    }

    /**
     * 删除背景API
     */
    registerDeleteBackgroundRoute() {
        this.delete('/api/background/:userId', async (req, res) => {
                const userId = req.params.userId;
                const backgroundType = req.query.type || 'normal';

                const subDir = backgroundType === 'ranking' ? 'ranking' : 'normal';
                const backgroundPath = path.join(this.backgroundsDir, subDir, `${userId}.jpg`);

                if (fs.existsSync(backgroundPath)) {
                    try {
                        await fs.promises.unlink(backgroundPath);
                        ApiResponse.success(res, null, '背景图片已删除');
                    } catch (error) {
                        return ApiResponse.error(res, `删除失败: ${error.message}`, 500);
                    }
                } else {
                    ApiResponse.error(res, '背景图片不存在', 404);
                }
        }, '删除背景失败');
    }

    /**
     * 获取背景图片信息API
     */
    registerBackgroundInfoRoute() {
        this.get('/api/background/:userId/info', async (req, res) => {
                const userId = req.params.userId;
                const backgroundType = req.query.type || 'ranking';

                let backgroundPath = null;
                let fileInfo = null;

                if (backgroundType === 'ranking') {
                    const rankingPath = path.join(this.backgroundsDir, 'ranking', `${userId}.jpg`);
                    if (fs.existsSync(rankingPath)) {
                        backgroundPath = rankingPath;
                    }
                } else {
                    const normalPath = path.join(this.backgroundsDir, 'normal', `${userId}.jpg`);
                    if (fs.existsSync(normalPath)) {
                        backgroundPath = normalPath;
                    }
                }

                if (backgroundPath) {
                    try {
                        const stats = await fs.promises.stat(backgroundPath);
                        fileInfo = {
                            exists: true,
                            size: stats.size,
                            modified: stats.mtime,
                            type: path.extname(backgroundPath)
                        };
                    } catch (error) {
                        fileInfo = { exists: false };
                    }
                } else {
                    fileInfo = { exists: false };
                }

                ApiResponse.success(res, {
                    userId,
                    type: backgroundType,
                    file: fileInfo
                });
        }, '获取背景信息失败');
    }

    /**
     * 系统状态API
     */
    registerStatusRoute() {
        this.app.get('/api/background-status', (req, res) => {
            const status = {
                timestamp: new Date().toISOString(),
                memoryUsage: process.memoryUsage(),
                uploadsDir: this.backgroundsDir,
                tempDir: path.join(this.backgroundsDir, 'temp'),
                platform: process.platform,
                nodeVersion: process.version
            };

            // 检查目录是否存在
            try {
                status.directories = {
                    backgrounds: fs.existsSync(this.backgroundsDir),
                    ranking: fs.existsSync(path.join(this.backgroundsDir, 'ranking')),
                    normal: fs.existsSync(path.join(this.backgroundsDir, 'normal')),
                    temp: fs.existsSync(path.join(this.backgroundsDir, 'temp'))
                };
            } catch (error) {
                status.directories = { error: error.message };
            }

            res.json({
                success: true,
                data: status
            });
        });
    }

    /**
     * 注册所有路由
     */
    registerRoutes() {
        // 状态检查
        this.registerStatusRoute();
        
        // 获取背景图片
        this.registerGetBackgroundRoute();
        
        // 获取背景信息
        this.registerBackgroundInfoRoute();

        // 上传背景图片
        this.app.post('/api/apply-background', 
            this.uploadMiddleware(),
            this.multerErrorHandler(),
            this.createUploadValidationMiddleware(),
            this.createImageProcessingMiddleware()
        );

        // 删除背景图片
        this.registerDeleteBackgroundRoute();
        
        // 启动时清理临时目录
        this.cleanupTempDirectory().catch(console.error);
    }

    /**
     * 清理临时目录
     */
    async cleanupTempDirectory() {
        const tempDir = path.join(this.backgroundsDir, 'temp');
        try {
            if (fs.existsSync(tempDir)) {
                const files = await fs.promises.readdir(tempDir);
                const now = Date.now();
                const maxAge = 24 * 60 * 60 * 1000; // 24小时
                
                for (const file of files) {
                    if (file.startsWith('upload_')) {
                        const filePath = path.join(tempDir, file);
                        try {
                            const stats = await fs.promises.stat(filePath);
                            if (now - stats.mtime.getTime() > maxAge) {
                                await fs.promises.unlink(filePath);
                                console.log('清理过期临时文件:', file);
                            }
                        } catch (error) {
                            // 忽略单个文件错误
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('清理临时目录失败:', error.message);
        }
    }
}