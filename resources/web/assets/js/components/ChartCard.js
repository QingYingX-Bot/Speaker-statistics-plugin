/**
 * 图表容器卡片组件
 */
export class ChartCard {
    /**
     * 渲染图表容器卡片
     * @param {Object} options 配置选项
     * @param {string} options.title 标题（可选）
     * @param {string} options.content 图表容器HTML（通常是 <div id="chartId"></div>）
     * @param {string} options.footer 底部HTML（可选）
     * @param {string} options.className 额外CSS类名（可选）
     * @param {string} options.id ID（可选）
     * @param {number} options.height 图表高度（可选，默认：400px）
     * @returns {string} HTML字符串
     */
    static render({ 
        title = '',
        content = '<div id="chart"></div>',
        footer = '',
        className = '',
        id = '',
        height = 400
    }) {
        const idAttr = id ? `id="${id}"` : '';
        const classAttr = className ? `class="${className}"` : '';
        
        return `
            <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${classAttr}" ${idAttr}>
                ${title ? `
                    <div class="px-5 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 border-b border-gray-200 dark:border-gray-700">
                        <h3 class="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">${title}</h3>
                    </div>
                ` : ''}
                <div class="px-4 sm:px-6 py-4 sm:py-6" style="min-height: ${height}px;">
                    ${content}
                </div>
                ${footer ? `
                    <div class="px-5 sm:px-6 lg:px-8 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        ${footer}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * 渲染全宽的图表容器（用于占满整行的图表）
     * @param {Object} options 配置选项
     * @param {string} options.title 标题（可选）
     * @param {string} options.content 图表容器HTML
     * @param {string} options.className 额外CSS类名（可选）
     * @param {number} options.height 图表高度（可选）
     * @returns {string} HTML字符串
     */
    static renderFullWidth({ 
        title = '',
        content = '<div id="chart"></div>',
        className = '',
        height = 400
    }) {
        return ChartCard.render({ 
            title, 
            content, 
            className: `lg:col-span-2 ${className}`,
            height
        });
    }
}

export default ChartCard;

