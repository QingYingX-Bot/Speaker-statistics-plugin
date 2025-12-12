import { BaseApi } from '../BaseApi.js';
import { AuthService } from '../../auth/AuthService.js';
import { AuthMiddleware } from '../middleware/AuthMiddleware.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * 用户管理API路由
 */
export class UserManagementApi extends BaseApi {
    constructor(app, authService) {
        super(app);
        this.authService = authService;
        this.authMiddleware = new AuthMiddleware(authService);
    }

    /**
     * 注册所有用户管理相关API路由
     */
    registerRoutes() {
        // 获取用户列表（管理员）
        this.app.get('/api/admin/users',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            ApiResponse.asyncHandler(async (req, res) => {
                const users = await this.authService.getAllUsers();
                ApiResponse.success(res, users);
            }, '获取用户列表失败')
        );

        // 获取权限信息（管理员）
        this.app.get('/api/admin/permission',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            ApiResponse.asyncHandler(async (req, res) => {
                ApiResponse.success(res, req.auth.permission);
            }, '获取权限信息失败')
        );

        // 更新用户角色（管理员）
        // 注意：由于需要中间件链，这里使用 this.app.put
        this.app.put('/api/admin/users/:userId/role',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            this.authMiddleware.requireParams(['role']),
            ApiResponse.asyncHandler(async (req, res) => {
                const { userId } = req.params;
                const { role } = req.body;

                if (role !== 'admin' && role !== 'user') {
                    return ApiResponse.error(res, '角色必须是 admin 或 user', 400);
                }

                const result = await this.authService.updateUserRole(userId, role);

                if (!result.success) {
                    return ApiResponse.error(res, result.message || '更新角色失败', 400);
                }

                ApiResponse.success(res, null, result.message || '角色更新成功');
            }, '更新用户角色失败')
        );

        // 重置用户密码（管理员）
        this.app.put('/api/admin/users/:userId/password',
            this.authMiddleware.requireAdmin.bind(this.authMiddleware),
            ApiResponse.asyncHandler(async (req, res) => {
                const { userId } = req.params;
                const defaultPassword = '123456';

                // 使用 AuthService 的 saveSecretKey 方法重置密码
                const result = await this.authService.saveSecretKey(userId, defaultPassword);

                if (!result.success) {
                    return ApiResponse.error(res, result.message || '重置密码失败', 400);
                }

                ApiResponse.success(res, { password: defaultPassword }, result.message || '密码已重置为 123456');
            }, '重置用户密码失败')
        );
    }
}

