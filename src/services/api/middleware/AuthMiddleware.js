/**
 * 认证中间件
 * 提供统一的权限验证和参数检查
 */
export class AuthMiddleware {
    constructor(authService) {
        this.authService = authService;
    }

    /**
     * 验证管理员权限的中间件
     * @param {Object} req Express请求对象
     * @param {Object} res Express响应对象
     * @param {Function} next 下一个中间件
     * @returns {Promise<void>}
     */
    async requireAdmin(req, res, next) {
        try {
            const { secretKey, userId } = req.query;
            
            // 参数验证
            if (!userId || !secretKey) {
                return res.status(400).json({ error: '缺少必要参数' });
            }
            
            // 权限验证
            const permission = await this.authService.checkAdminPermission(userId, secretKey);
            if (!permission.isAdmin) {
                return res.status(403).json({ error: '权限不足' });
            }
            
            // 将验证信息附加到请求对象
            req.auth = {
                userId,
                secretKey,
                permission
            };
            
            next();
        } catch (error) {
            res.status(500).json({ error: '权限验证失败' });
        }
    }

    /**
     * 验证用户秘钥的中间件
     * @param {Object} req Express请求对象
     * @param {Object} res Express响应对象
     * @param {Function} next 下一个中间件
     * @returns {Promise<void>}
     */
    async requireSecretKey(req, res, next) {
        try {
            // 从query或body中获取参数
            const userId = req.query.userId || req.body.userId;
            const secretKey = req.query.secretKey || req.body.secretKey;
            
            if (!userId || !secretKey) {
                return res.status(400).json({ error: '缺少必要参数' });
            }
            
            // 验证秘钥
            const keyValidation = await this.authService.validateSecretKey(userId, secretKey);
            if (!keyValidation.valid) {
                return res.status(401).json({ 
                    error: keyValidation.message || '秘钥验证失败' 
                });
            }
            
            // 将验证信息附加到请求对象
            req.auth = {
                userId,
                secretKey,
                keyValidation
            };
            
            next();
        } catch (error) {
            res.status(500).json({ error: '秘钥验证失败' });
        }
    }

    /**
     * 验证必需参数的中间件
     * @param {string[]} requiredParams 必需参数列表
     * @returns {Function} Express中间件函数
     */
    requireParams(requiredParams) {
        return (req, res, next) => {
            const missingParams = [];
            
            // 检查query和body中的参数
            for (const param of requiredParams) {
                if (!req.query[param] && !req.body[param] && !req.params[param]) {
                    missingParams.push(param);
                }
            }
            
            if (missingParams.length > 0) {
                return res.status(400).json({ 
                    error: '缺少必要参数',
                    missing: missingParams
                });
            }
            
            next();
        };
    }
}

