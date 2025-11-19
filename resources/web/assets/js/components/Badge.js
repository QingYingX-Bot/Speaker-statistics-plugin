/**
 * 徽章组件
 */
export class Badge {
    /**
     * 渲染徽章
     * @param {Object} options 配置选项
     * @param {string} options.text 徽章文本
     * @param {string} options.variant 样式变体：'primary', 'secondary', 'success', 'warning', 'danger', 'info', 'gray'（默认'primary'）
     * @param {string} options.size 尺寸：'sm', 'md', 'lg'（默认'md'）
     * @param {string} options.className 额外CSS类名（可选）
     * @param {string} options.id ID（可选）
     * @param {string} options.icon 图标HTML（可选）
     * @returns {string} HTML字符串
     */
    static render({
        text,
        variant = 'primary',
        size = 'md',
        className = '',
        id = '',
        icon = ''
    }) {
        const idAttr = id ? `id="${id}"` : '';
        
        // 尺寸配置
        const sizeConfig = {
            sm: 'px-2 py-0.5 text-xs',
            md: 'px-2.5 py-1 text-xs',
            lg: 'px-3 py-1.5 text-sm'
        };
        
        // 样式变体配置
        const variantConfig = {
            primary: 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary border-primary/20 dark:border-primary/30',
            secondary: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
            success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
            warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
            danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
            info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
            gray: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'
        };
        
        const sizeClass = sizeConfig[size] || sizeConfig.md;
        const variantClass = variantConfig[variant] || variantConfig.primary;
        const iconHtml = icon ? `<span class="mr-1">${icon}</span>` : '';
        
        return `
            <span class="inline-flex items-center ${sizeClass} font-medium rounded-full border ${variantClass} ${className}" ${idAttr}>
                ${iconHtml}
                ${text}
            </span>
        `;
    }
    
    /**
     * 创建徽章元素
     * @param {Object} options 配置选项
     * @returns {HTMLElement} 徽章元素
     */
    static create({
        text,
        variant = 'primary',
        size = 'md',
        className = '',
        id = '',
        icon = ''
    }) {
        const badge = document.createElement('span');
        
        const sizeConfig = {
            sm: 'px-2 py-0.5 text-xs',
            md: 'px-2.5 py-1 text-xs',
            lg: 'px-3 py-1.5 text-sm'
        };
        
        const variantConfig = {
            primary: 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary border-primary/20 dark:border-primary/30',
            secondary: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
            success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
            warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
            danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
            info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
            gray: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'
        };
        
        const sizeClass = sizeConfig[size] || sizeConfig.md;
        const variantClass = variantConfig[variant] || variantConfig.primary;
        
        badge.className = `inline-flex items-center ${sizeClass} font-medium rounded-full border ${variantClass} ${className}`.trim();
        if (id) badge.id = id;
        
        if (icon) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'mr-1';
            iconSpan.innerHTML = icon;
            badge.appendChild(iconSpan);
        }
        
        badge.appendChild(document.createTextNode(text));
        
        return badge;
    }
}

export default Badge;

