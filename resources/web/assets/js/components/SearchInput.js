/**
 * 搜索输入框组件
 */
export class SearchInput {
    /**
     * 渲染搜索输入框
     * @param {Object} options 配置选项
     * @param {string} options.id ID
     * @param {string} options.name name属性
     * @param {string} options.placeholder 占位符
     * @param {string} options.value 默认值
     * @param {string} options.className 额外CSS类名
     * @param {boolean} options.showClearButton 是否显示清除按钮（默认true）
     * @param {string} options.clearButtonId 清除按钮ID（可选）
     * @returns {string} HTML字符串
     */
    static render({
        id = '',
        name = '',
        placeholder = '搜索...',
        value = '',
        className = '',
        showClearButton = true,
        clearButtonId = ''
    }) {
        const idAttr = id ? `id="${id}"` : '';
        const nameAttr = name ? `name="${name}"` : '';
        const clearBtnIdAttr = clearButtonId ? `id="${clearButtonId}"` : '';
        const clearBtnDisplay = showClearButton ? '' : 'hidden';
        
        const inputClasses = `w-full px-4 py-2.5 pl-10 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${className}`.trim();
        
        const clearButtonHtml = showClearButton ? `
            <button 
                type="button"
                ${clearBtnIdAttr}
                class="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ${clearBtnDisplay}"
                style="display: none;"
                title="清除"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        ` : '';
        
        return `
            <div class="relative">
                <input 
                    type="text"
                    class="${inputClasses}"
                    ${idAttr}
                    ${nameAttr}
                    placeholder="${placeholder}"
                    value="${value}"
                >
                <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                ${clearButtonHtml}
            </div>
        `;
    }
    
    /**
     * 创建搜索输入框元素
     * @param {Object} options 配置选项
     * @returns {HTMLElement} 搜索输入框元素
     */
    static create({
        id = '',
        name = '',
        placeholder = '搜索...',
        value = '',
        className = '',
        showClearButton = true,
        clearButtonId = ''
    }) {
        const container = document.createElement('div');
        container.className = 'relative';
        
        const input = document.createElement('input');
        input.type = 'text';
        const inputClasses = `w-full px-4 py-2.5 pl-10 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${className}`.trim();
        input.className = inputClasses;
        if (id) input.id = id;
        if (name) input.name = name;
        if (placeholder) input.placeholder = placeholder;
        if (value) input.value = value;
        
        container.appendChild(input);
        
        // 搜索图标
        const searchIcon = document.createElement('svg');
        searchIcon.className = 'absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none';
        searchIcon.setAttribute('fill', 'none');
        searchIcon.setAttribute('stroke', 'currentColor');
        searchIcon.setAttribute('viewBox', '0 0 24 24');
        searchIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>';
        container.appendChild(searchIcon);
        
        // 清除按钮
        if (showClearButton) {
            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300';
            clearBtn.style.display = 'none';
            clearBtn.title = '清除';
            if (clearButtonId) clearBtn.id = clearButtonId;
            
            const clearIcon = document.createElement('svg');
            clearIcon.className = 'w-4 h-4';
            clearIcon.setAttribute('fill', 'none');
            clearIcon.setAttribute('stroke', 'currentColor');
            clearIcon.setAttribute('viewBox', '0 0 24 24');
            clearIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>';
            clearBtn.appendChild(clearIcon);
            
            container.appendChild(clearBtn);
        }
        
        return container;
    }
}

export default SearchInput;

