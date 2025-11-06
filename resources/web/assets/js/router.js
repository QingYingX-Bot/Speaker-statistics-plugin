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
        return hash;
    }
    
    // 导航到指定路由
    navigate(path) {
        window.location.hash = path;
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
        
        // 更新导航栏激活状态
        this.updateNavActive(route);
        
        // 显示加载状态
        const content = document.getElementById('pageContent');
        content.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>加载中...</p></div>';
        
        try {
            // 执行路由处理器
            if (handler) {
                await handler();
            } else {
                // 404
                content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">404</div><div class="empty-state-text">页面未找到</div></div>';
            }
        } catch (error) {
            console.error('路由处理失败:', error);
            content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-text">加载失败: ${error.message}</div></div>`;
        }
    }
    
    // 更新导航栏激活状态
    updateNavActive(route) {
        // 更新桌面端导航
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const linkRoute = link.getAttribute('data-route');
            if (linkRoute === route || (route.startsWith(linkRoute) && linkRoute !== '/')) {
                link.classList.add('bg-primary', 'text-white');
                link.classList.remove('text-gray-700', 'hover:text-primary', 'hover:bg-gray-50');
            } else {
                link.classList.remove('bg-primary', 'text-white');
                link.classList.add('text-gray-700', 'hover:text-primary', 'hover:bg-gray-50');
            }
        });
        
        // 更新移动端导航
        const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
        mobileNavLinks.forEach(link => {
            const linkRoute = link.getAttribute('data-route');
            if (linkRoute === route || (route.startsWith(linkRoute) && linkRoute !== '/')) {
                link.classList.add('bg-primary', 'text-white');
                link.classList.remove('text-gray-700', 'hover:text-primary', 'hover:bg-gray-50');
            } else {
                link.classList.remove('bg-primary', 'text-white');
                link.classList.add('text-gray-700', 'hover:text-primary', 'hover:bg-gray-50');
            }
        });
    }
}

// 创建全局路由实例
window.router = new Router();
