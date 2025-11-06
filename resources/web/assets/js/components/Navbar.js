/**
 * 导航栏组件
 */
export class Navbar {
    constructor() {
        this.userId = null;
        this.isAdmin = false;
    }
    
    /**
     * 渲染导航栏
     * @param {string} userId 用户ID
     * @param {boolean} isAdmin 是否为管理员
     * @returns {string} HTML字符串
     */
    render(userId = null, isAdmin = false) {
        this.userId = userId;
        this.isAdmin = isAdmin;
        
        return `
            <nav class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex items-center justify-between h-16">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">📊</span>
                            <span class="text-xl font-bold text-primary">发言统计</span>
                        </div>
                        <div class="hidden md:flex items-center gap-2" id="navbarMenu">
                            <a href="#/" class="nav-link px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary hover:bg-gray-50 transition-colors" data-route="/">首页</a>
                            <a href="#/ranking" class="nav-link px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary hover:bg-gray-50 transition-colors" data-route="/ranking">排行榜</a>
                            <a href="#/achievements" class="nav-link px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary hover:bg-gray-50 transition-colors" data-route="/achievements">成就</a>
                            <a href="#/background" class="nav-link px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary hover:bg-gray-50 transition-colors" data-route="/background">背景设置</a>
                            ${isAdmin ? '<a href="#/admin" class="nav-link px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary hover:bg-gray-50 transition-colors" data-route="/admin">管理</a>' : ''}
                        </div>
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-3" id="userInfo">
                                <span class="text-sm font-semibold text-gray-700" id="userId">${userId ? `用户: ${userId}` : '未登录'}</span>
                                <button class="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-primary" id="settingsBtn" title="设置">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        `;
    }
    
    /**
     * 初始化导航栏事件
     */
    init() {
        // 设置按钮事件
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettings();
            });
        }
    }
    
    /**
     * 显示设置菜单
     */
    showSettings() {
        // TODO: 实现设置菜单
        Toast.show('设置功能开发中', 'info');
    }
    
    /**
     * 更新导航栏激活状态
     * @param {string} route 当前路由
     */
    updateActive(route) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active', 'bg-primary', 'text-white');
            link.classList.add('text-gray-700', 'hover:text-primary', 'hover:bg-gray-50');
            const linkRoute = link.getAttribute('data-route');
            if (linkRoute === route || (route.startsWith(linkRoute) && linkRoute !== '/')) {
                link.classList.add('active', 'bg-primary', 'text-white');
                link.classList.remove('text-gray-700', 'hover:text-primary', 'hover:bg-gray-50');
            }
        });
    }
}

export default Navbar;
