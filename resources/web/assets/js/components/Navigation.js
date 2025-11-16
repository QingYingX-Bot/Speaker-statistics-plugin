/**
 * 导航栏组件 - 支持左侧和顶部两种布局
 * 
 * @class Navigation
 * @description 提供顶部导航栏和左侧导航栏两种布局模式，支持移动端响应式设计
 */
export class Navigation {
    /**
     * 构造函数
     */
    constructor() {
        this.position = localStorage.getItem('navPosition') || 'top'; // 'top' 或 'left'
        this.isMobileMenuOpen = false;
        
        // 导航项定义（统一管理，避免重复）
        this.baseNavItems = [
            { route: '/', label: '首页', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { route: '/ranking', label: '排行榜', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            { route: '/achievements', label: '成就', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
            { route: '/background', label: '背景设置', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' }
        ];
        
        this.adminNavItem = { 
            route: '/admin', 
            label: '管理', 
            icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' 
        };

        // SVG 图标路径常量
        this.icons = {
            menu: 'M4 6h16M4 12h16M4 18h16',
            user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
            layout: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z',
            sun: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
            moon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
            settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
        };
    }

    // ==================== 工具方法 ====================

    /**
     * 获取导航项列表
     * @param {boolean} isAdmin 是否为管理员
     * @returns {Array} 导航项数组
     */
    getNavItems(isAdmin) {
        return isAdmin ? [...this.baseNavItems, this.adminNavItem] : this.baseNavItems;
    }

    /**
     * 检查路由是否激活
     * @param {string} route 路由路径
     * @param {string} currentRoute 当前路由
     * @returns {boolean} 是否激活
     */
    isRouteActive(route, currentRoute) {
        return route === currentRoute || (currentRoute.startsWith(route) && route !== '/');
    }

    /**
     * 获取导航链接的基础 CSS 类名
     * @param {string} type 导航类型 'top' | 'left' | 'mobile'
     * @returns {string} CSS类名
     */
    getNavLinkBaseClass(type) {
        const baseClasses = 'flex items-center transition-all duration-200';
        
        if (type === 'top') {
            return `${baseClasses} gap-2 px-4 py-2.5 rounded-lg text-sm font-medium nav-link-top`;
        } else if (type === 'left') {
            return `${baseClasses} gap-3 px-4 py-3 rounded-lg nav-link-left`;
        } else {
            return `${baseClasses} gap-3 px-4 py-3 rounded-lg nav-link-mobile`;
        }
    }

    /**
     * 渲染 SVG 图标
     * @param {string} iconPath SVG 路径
     * @param {string} size 图标大小类名
     * @param {string} additionalClasses 额外的 CSS 类名
     * @returns {string} SVG HTML 字符串
     */
    renderIcon(iconPath, size = 'w-5 h-5', additionalClasses = '') {
        return `
            <svg class="${size} ${additionalClasses}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}"></path>
            </svg>
        `;
    }

    // ==================== 渲染方法 ====================

    /**
     * 渲染导航栏
     * @param {string} userId 用户ID
     * @param {boolean} isAdmin 是否为管理员
     * @param {string} currentRoute 当前路由
     * @returns {string} HTML字符串
     */
    render(userId, isAdmin, currentRoute = '/') {
        // 获取用户名（优先从 localStorage 获取）
        const userName = userId ? (localStorage.getItem(`userName_${userId}`) || null) : null;
        const displayName = userName || userId || '未登录';
        
        return this.position === 'left' 
            ? this.renderLeftNav(displayName, userId, isAdmin, currentRoute)
            : this.renderTopNav(userId, isAdmin, currentRoute);
    }

    /**
     * 渲染导航链接（统一方法，减少重复代码）
     * @param {Array} navItems 导航项数组
     * @param {string} currentRoute 当前路由
     * @param {string} type 导航类型 'top' | 'left' | 'mobile'
     * @returns {string} HTML字符串
     */
    renderNavLinks(navItems, currentRoute, type = 'top') {
        return navItems.map(item => {
            const isActive = this.isRouteActive(item.route, currentRoute);
            const baseClass = this.getNavLinkBaseClass(type);
            const activeClass = isActive ? 'active' : '';
            const iconSize = type === 'top' ? 'w-4 h-4' : 'w-5 h-5';
            const flexShrink = type === 'left' ? 'flex-shrink-0' : '';
            const spanClass = (type === 'left' || type === 'mobile') ? 'class="font-medium"' : '';
            
            return `
                <a href="#${item.route}" 
                   class="nav-link ${baseClass} ${activeClass}" 
                   data-route="${item.route}">
                    <svg class="${iconSize} ${flexShrink}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${item.icon}"></path>
                    </svg>
                    <span ${spanClass}>${item.label}</span>
                </a>
            `;
        }).join('');
    }

    /**
     * 渲染顶部导航栏
     * @param {string} userId 用户ID
     * @param {boolean} isAdmin 是否为管理员
     * @param {string} currentRoute 当前路由
     * @returns {string} HTML字符串
     */
    renderTopNav(userId, isAdmin, currentRoute) {
        const navItems = this.getNavItems(isAdmin);
        const navLinks = this.renderNavLinks(navItems, currentRoute, 'top');

        return `
            <nav class="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm z-50" id="navbar">
                <div class="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
                    <div class="flex items-center justify-between h-14 sm:h-16">
                        <div class="flex items-center gap-2 sm:gap-3">
                            <button class="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300" id="mobileMenuBtn" aria-label="菜单">
                                ${this.renderIcon(this.icons.menu, 'w-5 h-5 sm:w-6 sm:h-6')}
                            </button>
                            <span class="text-xl sm:text-2xl">📊</span>
                            <span class="text-base sm:text-xl font-semibold text-gray-900 dark:text-gray-100">发言统计</span>
                        </div>
                        <div class="hidden md:flex items-center gap-1 lg:gap-2" id="navbarMenu">
                            ${navLinks}
                        </div>
                        <div class="flex items-center gap-1 sm:gap-2">
                            <button class="hidden sm:flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary w-[120px] sm:w-[160px]" id="userInfoBtn" title="用户信息">
                                ${this.renderIcon(this.icons.user, 'w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0')}
                                <span id="userId" class="flex-1 min-w-0 text-left overflow-hidden text-ellipsis whitespace-nowrap">${userId || '未登录'}</span>
                            </button>
                            <button class="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 hover:text-primary" id="navPositionToggleBtn" title="切换到左侧导航栏">
                                ${this.renderIcon(this.icons.layout, 'w-4 h-4 sm:w-5 sm:h-5')}
                            </button>
                            <button class="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 hover:text-primary" id="themeToggleBtn" title="切换主题">
                                <svg class="w-4 h-4 sm:w-5 sm:h-5 hidden dark:block" id="themeIconSun" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${this.icons.sun}"></path>
                                </svg>
                                <svg class="w-4 h-4 sm:w-5 sm:h-5 dark:hidden" id="themeIconMoon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${this.icons.moon}"></path>
                                </svg>
                            </button>
                            <button class="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 hover:text-primary" id="settingsBtn" title="设置">
                                ${this.renderIcon(this.icons.settings, 'w-4 h-4 sm:w-5 sm:h-5')}
                            </button>
                        </div>
                    </div>
                </div>
                ${this.renderMobileMenu(navItems, currentRoute, userId)}
            </nav>
        `;
    }

    /**
     * 渲染左侧导航栏
     * @param {string} displayName 显示名称（用户名或用户ID）
     * @param {string} userId 用户ID（用于移动端菜单等）
     * @param {boolean} isAdmin 是否为管理员
     * @param {string} currentRoute 当前路由
     * @returns {string} HTML字符串
     */
    renderLeftNav(displayName, userId, isAdmin, currentRoute) {
        const navItems = this.getNavItems(isAdmin);
        const navLinks = this.renderNavLinks(navItems, currentRoute, 'left');

        return `
            <!-- 移动端遮罩层 -->
            <div id="leftSidebarOverlay" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-40 hidden lg:hidden transition-opacity duration-300" style="display: none;"></div>
            
            <aside class="fixed top-0 left-0 bottom-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-sm z-50 flex flex-col transform -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out" id="leftSidebar">
                <div class="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">📊</span>
                        <span class="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">发言统计</span>
                    </div>
                    <!-- 移动端关闭按钮 -->
                    <button class="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300" id="leftSidebarCloseBtn" aria-label="关闭菜单">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    ${navLinks}
                </nav>
                <div class="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    <div class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        ${this.renderIcon(this.icons.user, 'w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0')}
                        <span class="text-xs text-gray-600 dark:text-gray-400 truncate flex-1" id="leftNavUserId">${displayName}</span>
                    </div>
                    <div class="grid grid-cols-4 gap-2">
                        <button class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 hover:text-primary flex items-center justify-center" id="userInfoBtn" title="用户信息">
                            ${this.renderIcon(this.icons.user, 'w-5 h-5')}
                        </button>
                        <button class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 hover:text-primary flex items-center justify-center" id="navPositionToggleBtn" title="切换到顶部导航栏">
                            ${this.renderIcon(this.icons.layout, 'w-5 h-5')}
                        </button>
                        <button class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 hover:text-primary flex items-center justify-center" id="themeToggleBtn" title="切换主题">
                            <svg class="w-5 h-5 hidden dark:block" id="themeIconSun" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${this.icons.sun}"></path>
                            </svg>
                            <svg class="w-5 h-5 dark:hidden" id="themeIconMoon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${this.icons.moon}"></path>
                            </svg>
                        </button>
                        <button class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 hover:text-primary flex items-center justify-center" id="settingsBtn" title="设置">
                            ${this.renderIcon(this.icons.settings, 'w-5 h-5')}
                        </button>
                    </div>
                </div>
            </aside>
            
            ${this.renderMobileMenu(navItems, currentRoute, userId)}
        `;
    }

    /**
     * 渲染移动端菜单
     * @param {Array} navItems 导航项数组
     * @param {string} currentRoute 当前路由
     * @param {string} userId 用户ID
     * @returns {string} HTML字符串
     */
    renderMobileMenu(navItems, currentRoute, userId) {
        const mobileNavLinks = this.renderNavLinks(navItems, currentRoute, 'mobile');

        return `
            <div id="mobileMenu" class="hidden md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-lg">
                <div class="px-4 py-3 space-y-1">
                    ${mobileNavLinks}
                </div>
                <!-- 移动端用户信息（仅在顶部导航栏模式下显示） -->
                ${this.position === 'top' ? `
                <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                    <div class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        ${this.renderIcon(this.icons.user, 'w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0')}
                        <span class="text-sm text-gray-600 dark:text-gray-400 truncate flex-1">${userId || '未登录'}</span>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    // ==================== 状态管理方法 ====================

    /**
     * 设置导航栏位置
     * @param {string} position 位置 'top' | 'left'
     */
    setPosition(position) {
        this.position = position;
        localStorage.setItem('navPosition', position);
        
        const pageHeaderBar = document.getElementById('pageHeaderBar');
        
        // 更新 body 类名
        if (position === 'left') {
            document.body.classList.add('nav-left');
            const sidebar = document.getElementById('leftSidebar');
            
            // 根据屏幕大小决定是否显示侧边栏
            if (window.innerWidth >= 1024) {
                // 大屏幕：显示侧边栏
                if (sidebar) sidebar.classList.remove('-translate-x-full');
                if (pageHeaderBar) pageHeaderBar.style.display = 'none';
            } else {
                // 小屏幕：隐藏侧边栏，显示标题栏
                if (sidebar) sidebar.classList.add('-translate-x-full');
                if (pageHeaderBar) {
                    pageHeaderBar.style.display = 'block';
                    // 更新页面标题
                    if (window.router && typeof window.router.updatePageHeader === 'function') {
                        window.router.updatePageHeader();
                    }
                }
            }
        } else {
            document.body.classList.remove('nav-left');
            // 隐藏页面标题栏
            if (pageHeaderBar) pageHeaderBar.style.display = 'none';
            // 关闭左侧导航栏（如果打开）
            this.closeLeftSidebar();
        }
    }

    /**
     * 获取导航栏位置
     * @returns {string} 当前位置
     */
    getPosition() {
        return this.position;
    }

    /**
     * 切换导航栏位置
     */
    togglePosition() {
        const newPosition = this.position === 'top' ? 'left' : 'top';
        this.setPosition(newPosition);
        
        // 通知 app 更新导航栏
        if (window.app && window.app.updateNavigationPosition) {
            window.app.updateNavigationPosition(newPosition);
        } else {
            // 如果没有 app 实例，直接刷新页面
            window.location.reload();
        }
    }

    /**
     * 更新激活状态（确保只有一个链接处于激活状态）
     * @param {string} route 当前路由
     */
    updateActive(route) {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            const linkRoute = link.getAttribute('data-route');
            if (!linkRoute) return;
            
            const isActive = this.isRouteActive(linkRoute, route);
            
            // 更新激活状态
            if (isActive) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // ==================== 事件处理方法 ====================

    /**
     * 初始化导航栏事件
     */
    init() {
        this.initMobileMenu();
        this.initNavPositionToggle();
        this.initThemeToggle();
        this.initSettingsButton();
        this.initUserInfoButton();
        this.initLeftSidebarToggle();
    }
    
    /**
     * 初始化左侧导航栏的移动端切换
     */
    initLeftSidebarToggle() {
        // 左侧导航栏打开/关闭按钮
        const toggleBtn = document.getElementById('leftSidebarToggleBtn');
        const closeBtn = document.getElementById('leftSidebarCloseBtn');
        const sidebar = document.getElementById('leftSidebar');
        const overlay = document.getElementById('leftSidebarOverlay');
        
        // 打开侧边栏
        if (toggleBtn && sidebar && overlay) {
            toggleBtn.addEventListener('click', () => {
                this.openLeftSidebar();
            });
        }
        
        // 关闭侧边栏
        if (closeBtn && sidebar && overlay) {
            closeBtn.addEventListener('click', () => {
                this.closeLeftSidebar();
            });
        }
        
        // 点击遮罩层关闭
        if (overlay && sidebar) {
            overlay.addEventListener('click', () => {
                this.closeLeftSidebar();
            });
        }
        
        // 监听窗口大小变化，在大屏幕上自动显示侧边栏，小屏幕自动隐藏
        const handleResize = () => {
            if (window.innerWidth >= 1024 && sidebar) {
                // 大屏幕：显示侧边栏
                sidebar.classList.remove('-translate-x-full');
                if (overlay) overlay.style.display = 'none';
                if (toggleBtn) toggleBtn.style.display = 'none';
            } else if (window.innerWidth < 1024 && sidebar) {
                // 小屏幕：隐藏侧边栏
                sidebar.classList.add('-translate-x-full');
                if (overlay) {
                    overlay.style.display = 'none';
                    overlay.classList.add('opacity-0');
                }
                if (toggleBtn) toggleBtn.style.display = 'block';
            }
        };
        
        window.addEventListener('resize', handleResize);
        handleResize(); // 初始检查
    }
    
    /**
     * 打开左侧导航栏（移动端）
     */
    openLeftSidebar() {
        const sidebar = document.getElementById('leftSidebar');
        const overlay = document.getElementById('leftSidebarOverlay');
        const toggleBtn = document.getElementById('leftSidebarToggleBtn');
        
        if (sidebar) {
            sidebar.classList.remove('-translate-x-full');
        }
        if (overlay) {
            overlay.style.display = 'block';
            setTimeout(() => overlay.classList.remove('opacity-0'), 10);
        }
        if (toggleBtn) {
            toggleBtn.style.display = 'none';
        }
    }
    
    /**
     * 关闭左侧导航栏（移动端）
     */
    closeLeftSidebar() {
        const sidebar = document.getElementById('leftSidebar');
        const overlay = document.getElementById('leftSidebarOverlay');
        const toggleBtn = document.getElementById('leftSidebarToggleBtn');
        
        if (sidebar) {
            sidebar.classList.add('-translate-x-full');
        }
        if (overlay) {
            overlay.classList.add('opacity-0');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
        }
        if (toggleBtn) {
            toggleBtn.style.display = 'block';
        }
    }

    /**
     * 初始化移动端菜单
     */
    initMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                this.isMobileMenuOpen = !this.isMobileMenuOpen;
                mobileMenu.classList.toggle('hidden', !this.isMobileMenuOpen);
            });
        }
    }

    /**
     * 初始化导航栏位置切换按钮
     */
    initNavPositionToggle() {
        const navPositionToggleBtn = document.getElementById('navPositionToggleBtn');
        if (navPositionToggleBtn && !navPositionToggleBtn.dataset.listenerBound) {
            navPositionToggleBtn.dataset.listenerBound = 'true';
            navPositionToggleBtn.addEventListener('click', () => {
                this.togglePosition();
            });
        }
    }

    /**
     * 初始化主题切换按钮
     */
    initThemeToggle() {
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        if (themeToggleBtn && !themeToggleBtn.dataset.listenerBound) {
            themeToggleBtn.dataset.listenerBound = 'true';
            themeToggleBtn.addEventListener('click', () => {
                if (window.app && typeof window.app.toggleTheme === 'function') {
                    window.app.toggleTheme();
                } else {
                    this.toggleThemeFallback();
                }
            });
        }
    }

    /**
     * 主题切换备用方法（当 app.toggleTheme 不可用时）
     */
    toggleThemeFallback() {
        const isDark = document.documentElement.classList.contains('dark');
        const favicon = document.querySelector('link[rel="icon"]');
        
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            if (favicon) {
                favicon.href = '/assets/favicon-light.ico';
            }
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            if (favicon) {
                favicon.href = '/assets/favicon-dark.ico';
            }
        }
    }

    /**
     * 初始化设置按钮
     */
    initSettingsButton() {
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn && !settingsBtn.dataset.listenerBound) {
            settingsBtn.dataset.listenerBound = 'true';
            settingsBtn.addEventListener('click', () => {
                if (window.router) {
                    window.router.navigate('/settings');
                }
            });
        }
    }

    /**
     * 初始化用户信息按钮（跳转到个人中心）
     */
    initUserInfoButton() {
        const userInfoBtns = document.querySelectorAll('#userInfoBtn');
        userInfoBtns.forEach(btn => {
            if (!btn.dataset.listenerBound) {
                btn.dataset.listenerBound = 'true';
                btn.addEventListener('click', () => {
                    // 跳转到个人中心页面
                    if (window.router) {
                        window.router.navigate('/profile');
                    }
                });
            }
        });
    }
}

export default Navigation;
