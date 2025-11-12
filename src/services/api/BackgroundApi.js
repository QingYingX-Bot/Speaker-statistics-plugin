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
            this.authMiddleware.requireParams(['userId', 'secretKey']),
            this.authMiddleware.requireSecretKey.bind(this.authMiddleware),
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
                await this.sharp(req.file.buffer)
                    .jpeg({
                        quality: 95,
                        progressive: true
                    })
                    .toFile(outputPath);

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
