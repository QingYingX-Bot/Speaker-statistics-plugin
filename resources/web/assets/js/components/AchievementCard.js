/**
 * 成就卡片组件
 */
export class AchievementCard {
    /**
     * 渲染成就卡片
     * @param {Object} options 配置选项
     * @param {string} options.name 成就名称
     * @param {string} options.description 成就描述
     * @param {string} options.rarity 稀有度（Common, Uncommon, Rare, Epic, Legendary, Special, Festival）
     * @param {string} options.obtainedDate 获得日期（可选）
     * @param {string} options.groupName 群组名称（可选）
     * @param {string} options.className 额外CSS类名（可选）
     * @param {string} options.id ID（可选）
     * @returns {string} HTML字符串
     */
    static render({ 
        name,
        description,
        rarity = 'Common',
        obtainedDate = '',
        groupName = '',
        className = '',
        id = ''
    }) {
        const idAttr = id ? `id="${id}"` : '';
        
        // 稀有度颜色映射
        const rarityColors = {
            'Common': 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600',
            'Uncommon': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700',
            'Rare': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700',
            'Epic': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700',
            'Legendary': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700',
            'Special': 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 border-pink-300 dark:border-pink-700',
            'Festival': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
        };
        
        const escapeHtml = window.escapeHtml || ((str) => str.replace(/[&<>"']/g, (m) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[m])));
        const colorClass = rarityColors[rarity] || rarityColors['Common'];
        const safeName = escapeHtml(name || '未知成就');
        const safeDescription = escapeHtml(description || '');
        const safeRarity = escapeHtml(rarity);
        
        // 格式化日期
        let formattedDate = '';
        if (obtainedDate) {
            try {
                formattedDate = new Date(obtainedDate).toLocaleDateString('zh-CN', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                });
            } catch (e) {
                formattedDate = obtainedDate;
            }
        }
        
        return `
            <div class="bg-white dark:bg-gray-800 rounded-lg border-2 ${colorClass} p-4 hover:shadow-md transition-all ${className}" ${idAttr}>
                <div class="flex items-start justify-between mb-2">
                    <div class="flex-1 min-w-0">
                        <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
                            ${safeName}
                        </h4>
                        ${description ? `
                        <p class="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                            ${safeDescription}
                        </p>
                        ` : ''}
                    </div>
                </div>
                <div class="flex items-center justify-between text-xs">
                    <span class="px-2 py-0.5 rounded ${colorClass} font-medium">
                        ${safeRarity}
                    </span>
                    ${formattedDate ? `<span class="text-gray-500 dark:text-gray-400">${formattedDate}</span>` : ''}
                </div>
                ${groupName ? `
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-2 truncate">
                    ${escapeHtml(groupName)}
                </p>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * 渲染成就列表
     * @param {Array} achievements 成就数组
     * @param {Object} options 配置选项
     * @param {string} options.gridCols 网格列数（默认：grid-cols-1 sm:grid-cols-2 lg:grid-cols-3）
     * @param {string} options.className 额外CSS类名（可选）
     * @returns {string} HTML字符串
     */
    static renderList(achievements = [], { 
        gridCols = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        className = ''
    } = {}) {
        if (!achievements || achievements.length === 0) {
            return '';
        }
        
        const cardsHtml = achievements.map(achievement => 
            AchievementCard.render({
                name: achievement.name,
                description: achievement.description,
                rarity: achievement.rarity || 'Common',
                obtainedDate: achievement.obtained_at || achievement.obtainedDate,
                groupName: achievement.group_name || achievement.groupName,
                className: achievement.className || ''
            })
        ).join('');
        
        return `
            <div class="grid ${gridCols} gap-4 ${className}">
                ${cardsHtml}
            </div>
        `;
    }
}

export default AchievementCard;

