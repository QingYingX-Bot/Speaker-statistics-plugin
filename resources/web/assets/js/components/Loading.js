/**
 * 加载动画组件
 */
export class Loading {
    /**
     * 渲染加载动画
     * @param {Object} options 配置选项
     * @param {string} options.text 加载文本（默认：加载中...）
     * @param {string} options.size 尺寸（small, medium, large，默认：medium）
     * @param {string} options.className 额外CSS类名（可选）
     * @param {string} options.id ID（可选）
     * @returns {string} HTML字符串
     */
    static render({ 
        text = '加载中...', 
        size = 'medium',
        className = '',
        id = ''
    }) {
        const idAttr = id ? `id="${id}"` : '';
        const classAttr = className ? `class="${className}"` : '';
        
        const sizeClasses = {
            small: 'h-5 w-5',
            medium: 'h-8 w-8',
            large: 'h-12 w-12'
        };
        
        const spinnerSize = sizeClasses[size] || sizeClasses.medium;
        const textSize = size === 'small' ? 'text-xs' : size === 'large' ? 'text-base' : 'text-sm';
        
        return `
            <div class="flex flex-col items-center justify-center w-full py-4 ${classAttr}" ${idAttr}>
                <div class="inline-block animate-spin rounded-full ${spinnerSize} border-2 border-transparent border-t-primary dark:border-t-[#5BA3F5] mb-2"></div>
                ${text ? `<p class="${textSize} text-gray-500 dark:text-gray-400">${text}</p>` : ''}
            </div>
        `;
    }
    
    /**
     * 渲染内联加载动画（用于按钮等）
     * @param {Object} options 配置选项
     * @param {string} options.text 加载文本（可选）
     * @param {string} options.className 额外CSS类名（可选）
     * @returns {string} HTML字符串
     */
    static renderInline({ text = '', className = '' }) {
        const classAttr = className ? `class="${className}"` : '';
        return `
            <div class="inline-flex items-center ${classAttr}">
                <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ${text ? `<span>${text}</span>` : ''}
            </div>
        `;
    }
    
    /**
     * 渲染迷你加载动画
     * @param {Object} options 配置选项
     * @param {string} options.className 额外CSS类名（可选）
     * @returns {string} HTML字符串
     */
    static renderMini({ className = '' }) {
        const classAttr = className ? `class="${className}"` : '';
        return `
            <div class="inline-block animate-spin rounded-full h-5 w-5 border-2 border-transparent border-t-primary dark:border-t-[#5BA3F5] ${classAttr}"></div>
        `;
    }
}

export default Loading;

