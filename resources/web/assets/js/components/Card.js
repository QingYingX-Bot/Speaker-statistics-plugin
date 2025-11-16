/**
 * 卡片组件
 */
export class Card {
    /**
     * 渲染卡片
     * @param {Object} options 配置选项
     * @param {string} options.title 标题
     * @param {string} options.content 内容HTML
     * @param {string} options.footer 底部HTML（可选）
     * @param {string} options.className 额外CSS类名（可选）
     * @param {string} options.id ID（可选）
     * @returns {string} HTML字符串
     */
    static render({ title, content, footer = '', className = '', id = '' }) {
        const idAttr = id ? `id="${id}"` : '';
        const classAttr = className ? `class="${className}"` : '';
        
        return `
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:shadow-md" ${idAttr} ${classAttr}>
                ${title ? `
                    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                        <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">${title}</h2>
                    </div>
                ` : ''}
                <div class="px-6 py-5 text-gray-700 dark:text-gray-300">
                    ${content}
                </div>
                ${footer ? `
                    <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-end gap-3">
                        ${footer}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * 渲染统计卡片
     * @param {Object} options 配置选项
     * @param {string} options.label 标签
     * @param {string} options.value 数值
     * @param {string} options.id ID（可选）
     * @param {string} options.className 额外CSS类名（可选）
     * @returns {string} HTML字符串
     */
    static renderStat({ label, value, id = '', className = '', icon = '' }) {
        const idAttr = id ? `id="${id}"` : '';
        const classAttr = className ? `class="stat-card ${className}"` : 'class="stat-card"';
        const iconHtml = icon ? `<div class="mb-2">${icon}</div>` : '';
        
        return `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center" ${idAttr} ${classAttr}>
                ${iconHtml}
                <div class="text-xs sm:text-sm lg:text-base text-gray-500 dark:text-gray-400 mb-2">${label}</div>
                <div class="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 leading-tight">${value}</div>
            </div>
        `;
    }
}

export default Card;
