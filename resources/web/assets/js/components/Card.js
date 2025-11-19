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
     * @param {string} options.icon 图标HTML（可选）
     * @param {string} options.trend 趋势：'up', 'down', 'neutral'（可选）
     * @param {string} options.change 变化百分比或文字（可选，如 '+5.2%', '-3.1%', '较上期 +10%'）
     * @param {string} options.color 颜色主题：'blue', 'green', 'purple', 'orange', 'red', 'gray'（可选，默认'blue'）
     * @param {boolean} options.showIcon 是否显示图标区域（默认true）
     * @returns {string} HTML字符串
     */
    static renderStat({ 
        label, 
        value, 
        id = '', 
        className = '', 
        icon = '',
        trend = null,
        change = '',
        color = 'blue',
        showIcon = true
    }) {
        const idAttr = id ? `id="${id}"` : '';
        const classAttr = className ? `class="stat-card ${className}"` : 'class="stat-card"';
        
        // 颜色主题配置
        const colorConfig = {
            blue: {
                bg: 'from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30',
                border: 'border-blue-200 dark:border-blue-800',
                text: 'text-blue-600 dark:text-blue-400',
                textBold: 'text-blue-900 dark:text-blue-100',
                iconBg: 'bg-blue-500/20 dark:bg-blue-500/30',
                iconText: 'text-blue-600 dark:text-blue-400'
            },
            green: {
                bg: 'from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30',
                border: 'border-green-200 dark:border-green-800',
                text: 'text-green-600 dark:text-green-400',
                textBold: 'text-green-900 dark:text-green-100',
                iconBg: 'bg-green-500/20 dark:bg-green-500/30',
                iconText: 'text-green-600 dark:text-green-400'
            },
            purple: {
                bg: 'from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30',
                border: 'border-purple-200 dark:border-purple-800',
                text: 'text-purple-600 dark:text-purple-400',
                textBold: 'text-purple-900 dark:text-purple-100',
                iconBg: 'bg-purple-500/20 dark:bg-purple-500/30',
                iconText: 'text-purple-600 dark:text-purple-400'
            },
            orange: {
                bg: 'from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30',
                border: 'border-orange-200 dark:border-orange-800',
                text: 'text-orange-600 dark:text-orange-400',
                textBold: 'text-orange-900 dark:text-orange-100',
                iconBg: 'bg-orange-500/20 dark:bg-orange-500/30',
                iconText: 'text-orange-600 dark:text-orange-400'
            },
            red: {
                bg: 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30',
                border: 'border-red-200 dark:border-red-800',
                text: 'text-red-600 dark:text-red-400',
                textBold: 'text-red-900 dark:text-red-100',
                iconBg: 'bg-red-500/20 dark:bg-red-500/30',
                iconText: 'text-red-600 dark:text-red-400'
            },
            gray: {
                bg: 'from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-800/30',
                border: 'border-gray-200 dark:border-gray-800',
                text: 'text-gray-600 dark:text-gray-400',
                textBold: 'text-gray-900 dark:text-gray-100',
                iconBg: 'bg-gray-500/20 dark:bg-gray-500/30',
                iconText: 'text-gray-600 dark:text-gray-400'
            }
        };
        
        const theme = colorConfig[color] || colorConfig.blue;
        
        // 趋势箭头
        let trendIcon = '';
        if (trend === 'up') {
            trendIcon = `
                <svg class="w-3 h-3 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                </svg>
            `;
        } else if (trend === 'down') {
            trendIcon = `
                <svg class="w-3 h-3 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17l5-5m0 0l-5-5m5 5H6"></path>
                </svg>
            `;
        }
        
        // 变化文字
        const changeHtml = change ? `
            <p class="text-xs ${theme.text}">
                ${change.includes('较上期') ? change : `较上期 ${change}`}
                ${trendIcon}
            </p>
        ` : '';
        
        // 图标区域
        const iconHtml = showIcon ? `
            <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-medium ${theme.text}">${label}</p>
                ${icon ? `
                    <div class="w-8 h-8 ${theme.iconBg} rounded-lg flex items-center justify-center">
                        ${icon}
                    </div>
                ` : ''}
            </div>
        ` : `
            <p class="text-xs font-medium ${theme.text} mb-2">${label}</p>
        `;
        
        return `
            <div class="bg-gradient-to-br ${theme.bg} rounded-lg sm:rounded-xl p-4 border ${theme.border} shadow-sm hover:shadow-md transition-shadow" ${idAttr} ${classAttr}>
                ${iconHtml}
                <p class="text-xl sm:text-2xl font-bold ${theme.textBold} mb-1">${value}</p>
                ${changeHtml}
            </div>
        `;
    }
}

export default Card;
