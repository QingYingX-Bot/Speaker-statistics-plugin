import path from 'path';
import fs from 'fs';
import express from 'express';
import { PathResolver } from '../../core/utils/PathResolver.js';
import { TokenManager } from '../auth/TokenManager.js';

/**
 * 页面路由
 * 处理前端页面请求和token验证
 */
export class PageRoutes {
    constructor(app, tokenManager) {
        this.app = app;
        this.tokenManager = tokenManager;
    }

    /**
     * 处理token验证并设置cookie
     * @param {string} token Token字符串
     * @param {Object} res Express响应对象
     * @returns {Object|null} 验证结果，包含valid和userId
     */
    handleTokenValidation(token, res) {
        const validation = this.tokenManager.consumeToken(token);
        
        if (validation.valid) {
            res.cookie('userId', validation.userId, {
                maxAge: 24 * 60 * 60 * 1000,
                httpOnly: false,
                sameSite: 'lax'
            });
        }
        
        return validation;
    }

    /**
     * 注册所有页面路由
     */
    registerRoutes() {
        // 带路由的token路径（必须在静态文件之前定义）
        // 精确匹配：/background/:token, /ranking/:token等
        this.app.get('/background/:token', (req, res) => {
            const validation = this.handleTokenValidation(req.params.token, res);
            if (validation.valid) {
                return res.redirect('/#/background');
            }
            this.sendIndexPage(res);
        });
        
        // 其他带token的路径
        this.app.get('/ranking/:token', (req, res) => {
            const validation = this.handleTokenValidation(req.params.token, res);
            if (validation.valid) {
                return res.redirect('/#/ranking');
            }
            this.sendIndexPage(res);
        });
        
        this.app.get('/achievements/:token', (req, res) => {
            const validation = this.handleTokenValidation(req.params.token, res);
            if (validation.valid) {
                return res.redirect('/#/achievements');
            }
            this.sendIndexPage(res);
        });
        
        // 静态文件服务（必须在token路由之后）
        const webDir = PathResolver.getWebDir();
        if (webDir && typeof webDir === 'string') {
            // 排除API路径和token路径
            this.app.use((req, res, next) => {
                // 如果是API路径，跳过静态文件处理
                if (req.path.startsWith('/api/')) {
                    return next();
                }
                // 如果是已知的token路径格式（8位十六进制字符串），跳过静态文件处理
                if (/^\/[a-f0-9]{8}$/.test(req.path)) {
                    return next();
                }
                // 其他情况使用静态文件中间件
                express.static(webDir)(req, res, next);
            });
        }
        
        // 模板文件服务
        const templatesDir = path.join(webDir, 'pages', 'templates');
        if (templatesDir && typeof templatesDir === 'string') {
            this.app.use('/pages/templates', express.static(templatesDir));
        }
        
        // 根路径 - 提供主应用页面
        this.app.get('/', (req, res) => {
            this.sendIndexPage(res);
        });
        
        // 带token的根路径（8位十六进制字符串，匹配token格式）
        this.app.get('/:token', (req, res) => {
            const token = req.params.token;
            
            // 检查是否是token格式（8位十六进制字符串）
            if (!/^[a-f0-9]{8}$/.test(token)) {
                // 不是token格式，返回404
                return res.status(404).send('页面未找到');
            }
            
            // 验证并消耗token
            this.handleTokenValidation(token, res);
            this.sendIndexPage(res);
        });
    }

    /**
     * 发送index.html页面
     */
    sendIndexPage(res) {
        const indexPath = path.join(PathResolver.getWebDir(), 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).send('页面未找到');
        }
    }
}
