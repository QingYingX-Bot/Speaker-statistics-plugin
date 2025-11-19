/**
 * 标签页组件
 */
export class Tabs {
    /**
     * 渲染标签页
     * @param {Object} options 配置选项
     * @param {Array} options.tabs 标签数组 [{id: 'tab1', label: '标签1', icon: '<svg>...</svg>', active: false}]
     * @param {string} options.activeId 当前激活的标签ID（可选）
     * @param {string} options.className 额外CSS类名（可选）
     * @param {string} options.id 容器ID（可选）
     * @param {string} options.variant 样式变体：'default', 'pills', 'underline'（默认'underline'）
     * @returns {string} HTML字符串
     */
    static render({
        tabs = [],
        activeId = '',
        className = '',
        id = '',
        variant = 'underline'
    }) {
        const idAttr = id ? `id="${id}"` : '';
        
        // 如果没有指定 activeId，使用第一个 active: true 的标签，或第一个标签
        if (!activeId && tabs.length > 0) {
            const activeTab = tabs.find(tab => tab.active) || tabs[0];
            activeId = activeTab.id;
        }
        
        // 样式变体配置
        const variantConfig = {
            underline: {
                container: 'flex items-end -mb-px space-x-0.5 sm:space-x-1 overflow-x-auto scrollbar-hide',
                button: {
                    base: 'relative px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 border-b-2',
                    active: 'bg-white dark:bg-gray-800 text-primary border-primary',
                    inactive: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 border-transparent'
                }
            },
            pills: {
                container: 'flex items-center space-x-2 overflow-x-auto scrollbar-hide',
                button: {
                    base: 'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0',
                    active: 'bg-primary text-white shadow-md',
                    inactive: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
            },
            default: {
                container: 'flex items-center space-x-1 overflow-x-auto scrollbar-hide',
                button: {
                    base: 'px-3 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 rounded-t-lg',
                    active: 'bg-white dark:bg-gray-800 text-primary border-t border-l border-r border-gray-200 dark:border-gray-700',
                    inactive: 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-t border-l border-r border-transparent'
                }
            }
        };
        
        const config = variantConfig[variant] || variantConfig.underline;
        
        const tabsHtml = tabs.map(tab => {
            const isActive = tab.id === activeId || tab.active;
            const buttonClass = isActive ? config.button.active : config.button.inactive;
            const iconHtml = tab.icon ? `<span class="mr-1 sm:mr-2">${tab.icon}</span>` : '';
            
            return `
                <button 
                    id="${tab.id}"
                    class="${config.button.base} ${buttonClass}"
                    role="tab"
                    aria-selected="${isActive}"
                    data-tab-id="${tab.id}"
                >
                    <span class="flex items-center space-x-1 sm:space-x-2">
                        ${iconHtml}
                        <span>${tab.label}</span>
                    </span>
                </button>
            `;
        }).join('');
        
        return `
            <nav class="${config.container}" role="tablist" ${idAttr} style="scrollbar-width: none; -ms-overflow-style: none;" ${className ? `class="${className}"` : ''}>
                ${tabsHtml}
            </nav>
        `;
    }
    
    /**
     * 创建标签页元素
     * @param {Object} options 配置选项
     * @returns {HTMLElement} 标签页元素
     */
    static create({
        tabs = [],
        activeId = '',
        className = '',
        id = '',
        variant = 'underline'
    }) {
        const nav = document.createElement('nav');
        
        if (!activeId && tabs.length > 0) {
            const activeTab = tabs.find(tab => tab.active) || tabs[0];
            activeId = activeTab.id;
        }
        
        const variantConfig = {
            underline: {
                container: 'flex items-end -mb-px space-x-0.5 sm:space-x-1 overflow-x-auto scrollbar-hide',
                button: {
                    base: 'relative px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 border-b-2',
                    active: 'bg-white dark:bg-gray-800 text-primary border-primary',
                    inactive: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 border-transparent'
                }
            },
            pills: {
                container: 'flex items-center space-x-2 overflow-x-auto scrollbar-hide',
                button: {
                    base: 'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0',
                    active: 'bg-primary text-white shadow-md',
                    inactive: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
            },
            default: {
                container: 'flex items-center space-x-1 overflow-x-auto scrollbar-hide',
                button: {
                    base: 'px-3 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 rounded-t-lg',
                    active: 'bg-white dark:bg-gray-800 text-primary border-t border-l border-r border-gray-200 dark:border-gray-700',
                    inactive: 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-t border-l border-r border-transparent'
                }
            }
        };
        
        const config = variantConfig[variant] || variantConfig.underline;
        
        nav.className = `${config.container} ${className}`.trim();
        nav.setAttribute('role', 'tablist');
        nav.style.scrollbarWidth = 'none';
        nav.style.msOverflowStyle = 'none';
        if (id) nav.id = id;
        
        tabs.forEach(tab => {
            const isActive = tab.id === activeId || tab.active;
            const button = document.createElement('button');
            button.id = tab.id;
            button.setAttribute('role', 'tab');
            button.setAttribute('aria-selected', isActive);
            button.setAttribute('data-tab-id', tab.id);
            
            const buttonClass = isActive ? config.button.active : config.button.inactive;
            button.className = `${config.button.base} ${buttonClass}`;
            
            const span = document.createElement('span');
            span.className = 'flex items-center space-x-1 sm:space-x-2';
            
            if (tab.icon) {
                const iconSpan = document.createElement('span');
                iconSpan.className = 'mr-1 sm:mr-2';
                iconSpan.innerHTML = tab.icon;
                span.appendChild(iconSpan);
            }
            
            const textSpan = document.createElement('span');
            textSpan.textContent = tab.label;
            span.appendChild(textSpan);
            
            button.appendChild(span);
            nav.appendChild(button);
        });
        
        return nav;
    }
}

export default Tabs;

