/**
 * 空状态组件
 */
export class EmptyState {
    /**
     * 渲染空状态
     * @param {Object} options 配置选项
     * @param {string} options.message 提示消息（默认：暂无数据）
     * @param {string} options.icon 图标HTML（可选，可以是SVG或emoji）
     * @param {string} options.action 操作按钮HTML（可选）
     * @param {string} options.className 额外CSS类名（可选）
     * @param {string} options.id ID（可选）
     * @returns {string} HTML字符串
     */
    static render({ 
        message = '暂无数据',
        icon = '',
        action = '',
        className = '',
        id = ''
    }) {
        const idAttr = id ? `id="${id}"` : '';
        const classAttr = className ? `class="${className}"` : '';
        
        // 默认图标（如果没有提供）
        const defaultIcon = !icon ? `
            <svg class="w-12 h-12 mx-auto mb-2 opacity-50 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
            </svg>
        ` : icon;
        
        return `
            <div class="text-center py-8 text-gray-500 dark:text-gray-400 ${classAttr}" ${idAttr}>
                ${defaultIcon}
                <p class="text-sm mt-2">${message}</p>
                ${action ? `<div class="mt-4">${action}</div>` : ''}
            </div>
        `;
    }
    
    /**
     * 渲染简洁的空状态（用于小区域）
     * @param {Object} options 配置选项
     * @param {string} options.message 提示消息（默认：暂无数据）
     * @param {string} options.className 额外CSS类名（可选）
     * @returns {string} HTML字符串
     */
    static renderCompact({ 
        message = '暂无数据',
        className = ''
    }) {
        return `
            <div class="text-center py-4 text-sm text-gray-500 dark:text-gray-400 ${className}">
                ${message}
            </div>
        `;
    }
    
    /**
     * 渲染带卡片的空状态
     * @param {Object} options 配置选项
     * @param {string} options.message 提示消息（默认：暂无数据）
     * @param {string} options.icon 图标HTML（可选）
     * @param {string} options.action 操作按钮HTML（可选）
     * @param {string} options.className 额外CSS类名（可选）
     * @returns {string} HTML字符串
     */
    static renderCard({ 
        message = '暂无数据',
        icon = '',
        action = '',
        className = ''
    }) {
        return `
            <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center ${className}">
                ${EmptyState.render({ message, icon, action })}
            </div>
        `;
    }
}

export default EmptyState;

