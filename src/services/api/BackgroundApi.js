import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PathResolver } from '../../core/utils/PathResolver.js';
import { AuthService } from '../auth/AuthService.js';
import { AuthMiddleware } from './middleware/AuthMiddleware.js';
import { ApiResponse } from './utils/ApiResponse.js';

/**
 * 背景图片相关API路由
 */
export class BackgroundApi {
    constructor(app, authService) {
        this.app = app;
        this.authService = authService;
        this.backgroundsDir = PathResolver.getBackgroundsDir();
        this.authMiddleware = new AuthMiddleware(authService);
        // sharp 模块状态
        this.sharp = null;
        this.sharpError = null;
        this.sharpInitialized = false;
    }

    /**
     * 初始化 sharp 模块
     */
    async initSharp() {
        if (this.sharpInitialized) return; // 已经尝试过加载
        this.sharpInitialized = true;
        
        try {
            const sharpModule = await import('sharp');
            this.sharp = sharpModule.default;
        } catch (error) {
            this.sharpError = error;
        }
    }

    /**
     * 设置上传中间件
     */
    uploadMiddleware() {
        const storage = multer.memoryStorage();
        return multer({
            storage: storage,
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB
                files: 1, // 只允许一个文件
                fields: 10, // 允许的字段数量
                fieldNameSize: 100, // 字段名最大长度
                fieldSize: 1024 * 1024 // 字段值最大大小
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
     * Multer 错误处理中间件
     * 捕获 multer 中间件产生的错误
     */
    multerErrorHandler() {
        return (err, req, res, next) => {
            // 如果没有错误，继续下一个中间件
            if (!err) {
                return next();
            }
            
            // 如果响应已经发送，直接传递错误
            if (res.headersSent) {
                return next(err);
            }
            
            // 处理 multer 错误
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return ApiResponse.error(res, '文件大小超过限制（最大5MB）', 400, err, 'Multer文件大小限制错误');
                }
                return ApiResponse.error(res, `文件上传错误: ${err.message}`, 400, err, 'Multer错误');
            }
            
            // 处理其他错误（如 fileFilter 中的错误）
            if (err.message) {
                return ApiResponse.error(res, err.message, 400, err, '文件上传验证错误');
            }
            
            // 未知错误
            return ApiResponse.error(res, '文件上传失败', 500, err, 'Multer未知错误');
        };
    }

    /**
     * 注册所有背景图片相关API路由
     */
    registerRoutes() {
        // 获取背景图片API
        this.app.get('/api/background/:userId', 
            ApiResponse.asyncHandler((req, res) => {
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

                res.setHeader('Content-Type', 'image/jpeg');
                res.setHeader('Cache-Control', 'public, max-age=3600');
                res.sendFile(backgroundPath);
            }, '获取背景图片失败')
        );

        // 上传背景图片API
        this.app.post('/api/apply-background', 
            this.uploadMiddleware(),
            this.multerErrorHandler(),
            ApiResponse.asyncHandler(async (req, res, next) => {
                // 参数验证
                const userId = req.query.userId || req.body.userId;
                const secretKey = req.query.secretKey || req.body.secretKey;
                
                if (!userId || !secretKey) {
                    return ApiResponse.error(res, '缺少必要参数: userId 和 secretKey', 400);
                }
                
                // 验证秘钥
                try {
                    const keyValidation = await this.authService.validateSecretKey(userId, secretKey);
                    if (!keyValidation.valid) {
                        return ApiResponse.error(res, keyValidation.message || '秘钥验证失败', 401);
                    }
                    
                    // 将验证信息附加到请求对象
                    req.auth = {
                        userId,
                        secretKey,
                        keyValidation
                    };
                    
                    next();
                } catch (error) {
                    return ApiResponse.error(res, '秘钥验证失败', 500, error, '秘钥验证异常');
                }
            }, '参数验证失败'),
            ApiResponse.asyncHandler(async (req, res) => {
                const backgroundType = req.body.backgroundType || 'normal';
                const backgroundTypeText = backgroundType === 'ranking' ? '排行榜背景' : '普通背景';

                if (!req.file) {
                    return ApiResponse.error(res, '没有上传文件', 400);
                }

                const { userId } = req.auth;

                // 确定输出目录和文件名
                const subDir = backgroundType === 'ranking' ? 'ranking' : 'normal';
                const fileName = `${userId}.jpg`;
                const outputDir = path.join(this.backgroundsDir, subDir);
                const outputPath = path.join(outputDir, fileName);

                // 确保子目录存在
                PathResolver.ensureDirectory(outputDir);

                // 确保 sharp 已加载
                await this.initSharp();

                // 检查 sharp 是否可用
                if (!this.sharp) {
                    const errorMsg = this.sharpError?.message || '未知错误';
                    return ApiResponse.error(
                        res,
                        `图片处理模块未正确安装。请执行以下命令重新安装：\n` +
                        `  pnpm install sharp --force\n` +
                        `如果使用 Windows，可能需要安装构建工具：\n` +
                        `  npm install --global windows-build-tools\n` +
                        `   或者安装 Visual Studio Build Tools\n` +
                        `\n原始错误：${errorMsg}`,
                        500
                    );
                }

                // 处理并保存图片
                let imageProcessor = null;
                let imageBuffer = null;
                
                try {
                    // 验证 buffer 是否存在
                    if (!req.file.buffer || req.file.buffer.length === 0) {
                        return ApiResponse.error(res, '图片数据为空', 400);
                    }
                    
                    // 限制最大尺寸，与 multer 限制保持一致（5MB）
                    const MAX_BUFFER_SIZE = 5 * 1024 * 1024;
                    if (req.file.buffer.length > MAX_BUFFER_SIZE) {
                        return ApiResponse.error(res, '图片文件过大，请使用小于5MB的图片', 400);
                    }
                    
                    // 创建 buffer 的深拷贝，避免内存损坏
                    // 使用 Buffer.from() 创建新的独立 buffer，避免共享内存
                    imageBuffer = Buffer.from(req.file.buffer);
                    
                    // 创建 sharp 实例（只创建一次）
                    imageProcessor = this.sharp(imageBuffer, {
                        failOn: 'none', // 不因小错误而失败
                        limitInputPixels: 268402689 // 限制输入像素数，防止内存溢出（约 16384x16384）
                    });
                    
                    // 获取元数据（使用 clone 避免消耗原始 buffer）
                    let metadata;
                    try {
                        metadata = await imageProcessor.clone().metadata();
                    } catch (metadataError) {
                        return ApiResponse.error(
                            res,
                            `图片文件损坏或格式不正确: ${metadataError.message || '无法读取图片信息'}`,
                            400,
                            metadataError,
                            '图片元数据验证失败'
                        );
                    }
                    
                    // 验证图片尺寸，避免处理过大的图片
                    const MAX_DIMENSION = 8000; // 最大宽度或高度
                    if (!metadata.width || !metadata.height) {
                        return ApiResponse.error(res, '无法读取图片尺寸信息', 400);
                    }
                    
                    if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
                        return ApiResponse.error(
                            res,
                            `图片尺寸过大（${metadata.width}x${metadata.height}），最大支持 ${MAX_DIMENSION}x${MAX_DIMENSION}`,
                            400
                        );
                    }
                    
                    // 根据背景类型处理图片
                    if (backgroundType === 'ranking') {
                        // 排行榜背景需要调整尺寸
                        imageProcessor = imageProcessor.resize(1520, 200, {
                            fit: 'cover',
                            position: 'center',
                            withoutEnlargement: false,
                            kernel: 'lanczos3' // 使用高质量重采样
                        });
                    } else {
                        // 普通背景限制最大尺寸，避免内存问题
                        const MAX_NORMAL_WIDTH = 3000;
                        const MAX_NORMAL_HEIGHT = 3000;
                        if (metadata.width > MAX_NORMAL_WIDTH || metadata.height > MAX_NORMAL_HEIGHT) {
                            imageProcessor = imageProcessor.resize(MAX_NORMAL_WIDTH, MAX_NORMAL_HEIGHT, {
                                fit: 'inside',
                                withoutEnlargement: true,
                                kernel: 'lanczos3'
                            });
                        }
                    }
                    
                    // 转换为 JPEG 格式并保存
                    await imageProcessor
                        .jpeg({
                            quality: 90, // 降低质量以减少内存使用
                            progressive: true,
                            mozjpeg: false, // 禁用 mozjpeg 以减少内存使用
                            optimizeCoding: true
                        })
                        .toFile(outputPath);
                    
                } catch (sharpError) {
                    // 提供更详细的错误信息
                    let errorMessage = '图片处理失败';
                    if (sharpError.message) {
                        if (sharpError.message.includes('corrupted') || 
                            sharpError.message.includes('size') ||
                            sharpError.message.includes('prev_size')) {
                            errorMessage = '图片文件可能已损坏或内存不足，请尝试：\n1. 使用更小的图片（建议小于2MB）\n2. 重新上传图片\n3. 检查服务器内存使用情况';
                        } else if (sharpError.message.includes('Input buffer') || 
                                   sharpError.message.includes('buffer') ||
                                   sharpError.message.includes('Vips')) {
                            errorMessage = '图片数据不完整或内存错误，请检查文件是否完整上传，或尝试使用更小的图片';
                        } else if (sharpError.message.includes('memory') || 
                                   sharpError.message.includes('Memory') ||
                                   sharpError.message.includes('allocation')) {
                            errorMessage = '处理图片时内存不足，请使用更小的图片或增加服务器内存';
                        } else {
                            errorMessage = `图片处理失败: ${sharpError.message}`;
                        }
                    }
                    
                    return ApiResponse.error(
                        res,
                        errorMessage,
                        500,
                        sharpError,
                        'Sharp图片处理失败'
                    );
                } finally {
                    // 清理引用，帮助垃圾回收
                    if (imageProcessor) {
                        try {
                            // 尝试清理 sharp 实例
                            if (typeof imageProcessor.destroy === 'function') {
                                imageProcessor.destroy();
                            }
                        } catch (e) {
                            // 忽略清理错误
                        }
                        imageProcessor = null;
                    }
                    
                    // 清理 buffer 引用
                    if (imageBuffer) {
                        imageBuffer = null;
                    }
                    
                    // 清理原始 buffer 引用
                    if (req.file && req.file.buffer) {
                        req.file.buffer = null;
                    }
                }

                const responseData = {
                    path: outputPath
                };

                if (backgroundType === 'ranking') {
                    responseData.dimensions = '1520x200';
                }

                ApiResponse.success(res, responseData, `${backgroundTypeText}设置成功`);
            }, '处理背景图片失败')
        );

        // 删除背景API
        this.app.delete('/api/background/:userId',
            ApiResponse.asyncHandler(async (req, res) => {
                const userId = req.params.userId;
                const backgroundType = req.query.type || 'normal';

                const subDir = backgroundType === 'ranking' ? 'ranking' : 'normal';
                const backgroundPath = path.join(this.backgroundsDir, subDir, `${userId}.jpg`);

                if (fs.existsSync(backgroundPath)) {
                    fs.unlinkSync(backgroundPath);
                    ApiResponse.success(res, null, '背景已删除');
                } else {
                    ApiResponse.error(res, '背景文件不存在', 404);
                }
            }, '删除背景失败')
        );
    }
}
