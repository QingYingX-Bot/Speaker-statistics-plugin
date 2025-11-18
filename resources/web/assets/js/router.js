/**
 * 路由系统
 */

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.currentPage = null;
        this.initialized = false;
        this.initialHash = null; // 延迟到 init() 时设置
    }
    
    // 注册路由
    register(path, handler) {
        this.routes[path] = handler;
    }
    
    // 获取当前路由
    getCurrentRoute() {
        // 总是从当前 URL 读取 hash（确保路由切换时能获取最新值）
        let hash = window.location.hash;
        
        // 处理 hash 路由
        // 如果 hash 是 '#/' 或空，返回根路由 '/'
        // 如果 hash 是 '#/background'，返回 '/background'
        let route = '/';
        if (hash) {
            // 移除 # 号，获取路由路径
            route = hash.slice(1);
            // 如果路由为空或只有 /，返回根路由
            if (!route || route === '/') {
                route = '/';
            }
        }
        
        // 移除查询参数，只返回路径
        return route.split('?')[0] || '/';
    }
    
    // 获取URL参数
    getQueryParams() {
        const hash = window.location.hash.slice(1) || '/';
        const queryString = hash.split('?')[1] || '';
        const params = {};
        if (queryString) {
            queryString.split('&').forEach(param => {
                const [key, value] = param.split('=');
                if (key) {
                    params[decodeURIComponent(key)] = decodeURIComponent(value || '');
                }
            });
        }
        return params;
    }
    
    // 导航到指定路由
    navigate(path, params = {}) {
        let url = path;
        if (Object.keys(params).length > 0) {
            const queryString = Object.entries(params)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('&');
            url = `${path}?${queryString}`;
        }
        window.location.hash = url;
    }
    
    // 初始化路由
    init() {
        // 如果当前 hash 为空，等待一下再读取（给后端重定向时间）
        if (this.initialHash === null) {
            this.initialHash = window.location.hash;
            
            // 如果 hash 为空，延迟一下再读取（可能后端重定向还在处理）
            if (!this.initialHash || this.initialHash === '') {
                // 等待下一个事件循环，给重定向时间完成
                setTimeout(() => {
                    this.initialHash = window.location.hash;
                    // 继续初始化流程
                    this._continueInit();
                }, 10);
                return;
            }
        }
        
        this._continueInit();
    }
    
    // 继续初始化流程
    _continueInit() {
        // 监听hash变化
        window.addEventListener('hashchange', () => {
            this.handleRoute();
        });
        
        // 标记为已初始化
        this.initialized = true;
        
        // 处理初始路由
        this.handleInitialRoute();
    }
    
    // 处理初始路由（带重试机制）
    handleInitialRoute() {
        const route = this.getCurrentRoute();
        
        // 检查路由是否已注册
        if (Object.keys(this.routes).length === 0) {
            // 路由还未注册，延迟重试
            setTimeout(() => this.handleInitialRoute(), 50);
            return;
        }
        
        // 检查目标路由是否存在
        if (!this.routes[route] && route !== '/') {
            // 目标路由还未注册，延迟重试（最多等待1秒）
            if (!this._initialRetryCount) {
                this._initialRetryCount = 0;
            }
            if (this._initialRetryCount < 20) {
                this._initialRetryCount++;
                setTimeout(() => this.handleInitialRoute(), 50);
                return;
            }
            // 超时后重置，使用默认路由
            this._initialRetryCount = 0;
        } else {
            this._initialRetryCount = 0;
        }
        
        // 检查 DOM 是否准备好
        const content = document.getElementById('pageContent');
        if (!content) {
            setTimeout(() => this.handleInitialRoute(), 50);
            return;
        }
        
        // DOM 和路由都准备好了，处理路由
        this.handleRoute();
    }
    
    // 处理路由
    async handleRoute() {
        const route = this.getCurrentRoute();
        
        // 获取路由处理器
        const handler = this.routes[route];
        
        // 如果找不到目标路由的处理器，且不是根路由，使用默认路由
        
        // 使用目标路由的处理器，如果不存在则使用根路由
        const finalHandler = handler || this.routes['/'];
        
        // 更新导航栏激活状态（通过 app.navigation）
        if (window.app && window.app.navigation) {
            window.app.navigation.updateActive(route);
            // 路由切换时，在小屏幕下自动关闭左侧导航栏
            if (window.innerWidth < 1024 && window.app.navigation.getPosition() === 'left') {
                window.app.navigation.closeLeftSidebar();
            }
        }
        
        // 显示加载状态
        const content = document.getElementById('pageContent');
        if (!content) {
            // 如果页面内容容器还不存在，延迟处理
            setTimeout(() => this.handleRoute(), 50);
            return;
        }
        
        // 临时移除 padding 以确保完全居中
        const originalPadding = content.style.padding;
        content.style.padding = '0';
        
        if (window.Loading) {
            content.innerHTML = `<div class="flex items-center justify-center w-full h-full min-h-[calc(100vh-64px)]">${Loading.render({ text: '加载中...', size: 'medium' })}</div>`;
        } else {
            // 降级方案：如果 Loading 组件未加载，使用简单文本
            content.innerHTML = '<div class="flex items-center justify-center w-full h-full min-h-[calc(100vh-64px)]"><p class="text-gray-500 dark:text-gray-400">加载中...</p></div>';
        }
        
        try {
            // 执行路由处理器
            if (finalHandler) {
                await finalHandler();
                // 恢复 padding（页面内容会自己处理 padding）
                if (content.style.padding === '0') {
                    content.style.padding = originalPadding || '';
                }
                // 更新页面标题栏
                this.updatePageHeader();
            } else {
                // 404
                content.style.padding = originalPadding || '';
                content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">404</div><div class="empty-state-text">页面未找到</div></div>';
                this.updatePageHeader();
            }
        } catch (error) {
            console.error('路由处理失败:', error);
            content.style.padding = originalPadding || '';
            content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-text">加载失败: ${error.message}</div></div>`;
            this.updatePageHeader();
        }
    }
    
    // 更新页面标题栏
    updatePageHeader() {
        const pageHeaderBar = document.getElementById('pageHeaderBar');
        const pageTitle = document.getElementById('pageTitle');
        if (!pageHeaderBar || !pageTitle) return;
        
        // 检查是否在左侧导航栏模式且小屏幕
        const isLeftNav = document.body.classList.contains('nav-left');
        const isSmallScreen = window.innerWidth < 1024;
        
        if (isLeftNav && isSmallScreen) {
            // 从页面内容中提取标题
            const content = document.getElementById('pageContent');
            if (content) {
                const h1 = content.querySelector('h1');
                if (h1) {
                    pageTitle.textContent = h1.textContent.trim();
                } else {
                    // 根据路由设置默认标题
                    const route = this.getCurrentRoute();
                    const routeTitles = {
                        '/': '数据统计',
                        '/ranking': '排行榜',
                        '/achievements': '成就',
                        '/background': '背景设置',
                        '/profile': '个人中心',
                        '/settings': '设置',
                        '/admin': '管理'
                    };
                    pageTitle.textContent = routeTitles[route] || '页面';
                }
            }
            pageHeaderBar.style.display = 'block';
        } else {
            pageHeaderBar.style.display = 'none';
        }
    }
}

// 创建全局路由实例
window.router = new Router();
