/**
 * 路由系统
 */

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.currentPage = null;
    }
    
    // 注册路由
    register(path, handler) {
        this.routes[path] = handler;
    }
    
    // 获取当前路由
    getCurrentRoute() {
        const hash = window.location.hash.slice(1) || '/';
        // 移除查询参数，只返回路径
        return hash.split('?')[0];
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
        // 监听hash变化
        window.addEventListener('hashchange', () => {
            this.handleRoute();
        });
        
        // 初始路由
        this.handleRoute();
    }
    
    // 处理路由
    async handleRoute() {
        const route = this.getCurrentRoute();
        const handler = this.routes[route] || this.routes['/'];
        
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
            if (handler) {
                await handler();
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
