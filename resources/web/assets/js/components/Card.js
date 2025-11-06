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
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md" ${idAttr} ${classAttr}>
                ${title ? `
                    <div class="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                        <h2 class="text-xl font-semibold text-gray-800">${title}</h2>
                    </div>
                ` : ''}
                <div class="px-6 py-5 text-gray-700">
                    ${content}
                </div>
                ${footer ? `
                    <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
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
    static renderStat({ label, value, id = '', className = '' }) {
        const idAttr = id ? `id="${id}"` : '';
        const classAttr = className ? `class="stat-card ${className}"` : 'class="stat-card"';
        
        return `
            <div class="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 text-center border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center min-h-[130px]" ${idAttr} ${classAttr}>
                <div class="text-sm font-medium text-gray-600 mb-2">${label}</div>
                <div class="text-2xl font-bold text-gray-800">${value}</div>
            </div>
        `;
    }
}

export default Card;
