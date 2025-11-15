import { AuthService } from '../auth/AuthService.js';
import { TokenManager } from '../auth/TokenManager.js';
import { VerificationCodeManager } from '../auth/VerificationCodeManager.js';
import { getDataService } from '../../core/DataService.js';
import { ApiResponse } from './utils/ApiResponse.js';
import { AuthMiddleware } from './middleware/AuthMiddleware.js';
import { WebLinkGenerator } from '../../core/utils/WebLinkGenerator.js';

/**
 * 认证相关API路由
 */
export class AuthApi {
    constructor(app, authService, tokenManager, verificationCodeManager) {
        this.app = app;
        this.authService = authService;
        this.tokenManager = tokenManager;
        this.verificationCodeManager = verificationCodeManager;
        this.dataService = getDataService();
        this.authMiddleware = new AuthMiddleware(authService);
    }

    /**
     * 注册所有认证相关API路由
     */
    registerRoutes() {
        // 获取当前用户信息（从cookie或token）
        this.app.get('/api/current-user',
            ApiResponse.asyncHandler(async (req, res) => {
                // 优先从 cookie 获取，其次从 query 参数，最后尝试从 token 解析
                let userId = req.cookies?.userId || req.query.userId;
                
                // 如果没有 userId，尝试从 token 中解析（如果 URL 路径是 token）
                if (!userId) {
                    const pathParts = req.path.split('/').filter(p => p);
                    if (pathParts.length > 0 && pathParts[0] !== 'api') {
                        // 可能是 token 路径，尝试解析
                        try {
                            const tokenData = this.tokenManager.validateToken(pathParts[0]);
                            if (tokenData && tokenData.valid && tokenData.userId) {
                                userId = tokenData.userId;
                            }
                        } catch (error) {
                            // token 无效，忽略
                        }
                    }
                }
                
                if (!userId) {
                    return ApiResponse.success(res, {
                        userId: null,
                        userName: null,
                        role: null,
                        isAdmin: false
                    });
                }
                
                // 尝试获取用户名
                let userName = null;
                try {
                    const groups = await this.dataService.dbService.getUserGroups(userId);
                    if (groups && groups.length > 0) {
                        const firstGroup = groups[0];
                        const stats = await this.dataService.dbService.getUserStats(firstGroup.group_id, userId);
                        if (stats && stats.user_name) {
                            userName = stats.user_name;
                        }
                    }
                } catch (error) {
                    // 静默失败，继续处理
                }
                
                // 检查用户权限（仅检查 key.json 中的角色）
                let role = null;
                let isAdmin = false;
                try {
                    role = await this.authService.getUserRole(userId);
                    isAdmin = role === 'admin';
                } catch (error) {
                    globalConfig.error('[API] 检查用户权限失败:', error);
                }
                
                ApiResponse.success(res, {
                    userId: userId,
                    userName: userName,
                    role: role,
                    isAdmin: isAdmin
                });
            }, '获取当前用户信息失败')
        );
        
        // 生成访问token（用于QQ命令生成链接）
        this.app.post('/api/generate-token',
            this.authMiddleware.requireParams(['userId']),
            ApiResponse.asyncHandler(async (req, res) => {
                const { userId } = req.body;
                const token = this.tokenManager.generateToken(userId);
                const config = WebLinkGenerator.getServerConfig();
                const baseUrl = `${config.protocol}://${config.domain || config.host}:${config.port}`;
                
                ApiResponse.success(res, {
                    token: token,
                    url: `${baseUrl}/${token}`,
                    expiresIn: 24 * 60 * 60 * 1000 // 24小时
                });
            }, '生成token失败')
        );

        // 获取秘钥API
        this.app.get('/api/secret-key/:userId',
            ApiResponse.asyncHandler(async (req, res) => {
                const { userId } = req.params;
                const result = await this.authService.getSecretKey(userId);
                
                if (!result.hasExistingKey) {
                    return ApiResponse.error(res, result.message || '用户秘钥不存在', 404);
                }
                
                ApiResponse.success(res, {
                    secretKey: result.secretKey,
                    hasExistingKey: true
                }, result.message || '秘钥获取成功');
            }, '读取秘钥文件失败')
        );

        // 保存秘钥API
        this.app.post('/api/save-secret-key',
            this.authMiddleware.requireParams(['userId', 'secretKey']),
            ApiResponse.asyncHandler(async (req, res) => {
                const { userId, oldSecretKey, secretKey } = req.body;
                const result = await this.authService.saveSecretKey(userId, secretKey, oldSecretKey);
                
                if (!result.success) {
                    return ApiResponse.error(res, result.message || '保存秘钥失败', 400);
                }
                
                ApiResponse.success(res, null, result.message || '秘钥保存成功');
            }, '保存秘钥失败')
        );

        // 验证秘钥API
        this.app.post('/api/validate-secret-key',
            this.authMiddleware.requireParams(['userId', 'secretKey']),
            ApiResponse.asyncHandler(async (req, res) => {
                const { userId, secretKey } = req.body;
                const validation = await this.authService.validateSecretKey(userId, secretKey);
                ApiResponse.success(res, {
                    valid: validation.valid
                }, validation.message);
            }, '验证秘钥失败')
        );

        // 发送验证码
        this.app.post('/api/send-verification-code',
            this.authMiddleware.requireParams(['userId']),
            ApiResponse.asyncHandler(async (req, res) => {
                const { userId } = req.body;
                const result = await this.verificationCodeManager.sendCode(userId);
                
                if (!result.success) {
                    return ApiResponse.error(res, result.message || '发送验证码失败', 400);
                }
                
                ApiResponse.success(res, null, '验证码已发送');
            }, '发送验证码失败')
        );

        // 验证验证码
        this.app.post('/api/verify-code',
            this.authMiddleware.requireParams(['userId', 'code']),
            ApiResponse.asyncHandler(async (req, res) => {
                const { userId, code } = req.body;
                const result = this.verificationCodeManager.verifyCode(userId, code);
                
                ApiResponse.success(res, {
                    valid: result.valid
                }, result.message);
            }, '验证码校验失败')
        );
    }
}
