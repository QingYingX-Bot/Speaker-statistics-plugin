/**
 * 侧边栏组件
 */
export class Sidebar {
    constructor() {
        this.isOpen = false;
    }
    
    /**
     * 渲染侧边栏
     * @param {Array} items 菜单项数组
     * @param {string} currentRoute 当前路由
     * @returns {string} HTML字符串
     */
    render(items = [], currentRoute = '/') {
        const menuItems = items.map(item => {
            const isActive = item.route === currentRoute || 
                           (currentRoute.startsWith(item.route) && item.route !== '/');
            const activeClasses = isActive 
                ? 'bg-primary text-white shadow-md' 
                : 'text-gray-700 hover:bg-gray-50 hover:text-primary';
            return `
                <a href="#${item.route}" class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeClasses}" data-route="${item.route}">
                    <span class="text-xl">${item.icon || '📋'}</span>
                    <span class="font-medium">${item.label}</span>
                </a>
            `;
        }).join('');
        
        return `
            <aside class="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 transform -translate-x-full transition-transform duration-300 z-40 md:translate-x-0" id="sidebar">
                <div class="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-800">导航菜单</h3>
                    <button class="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600" id="sidebarToggle" aria-label="切换菜单">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <nav class="p-2">
                    ${menuItems}
                </nav>
            </aside>
        `;
    }
    
    /**
     * 初始化侧边栏事件
     */
    init() {
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggle();
            });
        }
        
        // 移动端点击背景关闭
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            let overlay = document.querySelector('.sidebar-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'sidebar-overlay fixed inset-0 bg-black bg-opacity-50 z-30 hidden md:hidden';
                document.body.appendChild(overlay);
                
                overlay.addEventListener('click', () => {
                    this.close();
                });
            }
        }
    }
    
    /**
     * 切换侧边栏
     */
    toggle() {
        this.isOpen = !this.isOpen;
        const sidebar = document.getElementById('sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        
        if (sidebar) {
            if (this.isOpen) {
                sidebar.classList.remove('-translate-x-full');
                if (overlay) overlay.classList.remove('hidden');
            } else {
                sidebar.classList.add('-translate-x-full');
                if (overlay) overlay.classList.add('hidden');
            }
        }
    }
    
    /**
     * 打开侧边栏
     */
    open() {
        this.isOpen = true;
        const sidebar = document.getElementById('sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (sidebar) {
            sidebar.classList.remove('-translate-x-full');
            if (overlay) overlay.classList.remove('hidden');
        }
    }
    
    /**
     * 关闭侧边栏
     */
    close() {
        this.isOpen = false;
        const sidebar = document.getElementById('sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (sidebar) {
            sidebar.classList.add('-translate-x-full');
            if (overlay) overlay.classList.add('hidden');
        }
    }
}

export default Sidebar;
