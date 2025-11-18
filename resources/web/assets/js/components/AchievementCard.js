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
        
        // 稀有度颜色映射（文字颜色）
        const rarityTextColors = {
            'Common': 'text-gray-400 dark:text-gray-400',
            'Uncommon': 'text-blue-400 dark:text-blue-400',
            'Rare': 'text-blue-500 dark:text-blue-500',
            'Epic': 'text-purple-400 dark:text-purple-400',
            'Legendary': 'text-yellow-400 dark:text-yellow-400',
            'Mythic': 'text-orange-400 dark:text-orange-400',
            'Special': 'text-pink-400 dark:text-pink-400',
            'Festival': 'text-red-400 dark:text-red-400'
        };
        
        // 稀有度中文映射
        const rarityNames = {
            'Common': '普通',
            'Uncommon': '不普通',
            'Rare': '稀有',
            'Epic': '史诗',
            'Legendary': '传说',
            'Mythic': '神话',
            'Special': '特殊',
            'Festival': '节日'
        };
        
        const escapeHtml = window.escapeHtml || ((str) => str.replace(/[&<>"']/g, (m) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[m])));
        
        // 规范化稀有度值（首字母大写，其余小写）
        const normalizedRarity = rarity ? (rarity.charAt(0).toUpperCase() + rarity.slice(1).toLowerCase()) : 'Common';
        
        const rarityColor = rarityTextColors[normalizedRarity] || rarityTextColors['Common'];
        const safeName = escapeHtml(name || '未知成就');
        const safeDescription = escapeHtml(description || '');
        const safeRarity = escapeHtml(rarityNames[normalizedRarity] || rarityNames['Common']);
        
        // 格式化日期为中文格式：2025年11月17日
        let formattedDate = '';
        if (obtainedDate) {
            try {
                const date = new Date(obtainedDate);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                formattedDate = `${year}年${month}月${day}日`;
            } catch (e) {
                formattedDate = obtainedDate;
            }
        }
        
        return `
            <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all ${className}" ${idAttr}>
                <h4 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
                    ${safeName}
                </h4>
                ${description ? `
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    ${safeDescription}
                </p>
                ` : ''}
                <div class="flex items-center justify-between mb-2 w-full">
                    <span class="text-xs font-medium ${rarityColor} flex-shrink-0">
                        ${safeRarity}
                    </span>
                    ${formattedDate ? `
                    <span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                        ${formattedDate}
                    </span>
                    ` : ''}
                </div>
                ${groupName ? `
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
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
            <div class="grid ${gridCols} gap-3 sm:gap-4 ${className}">
                ${cardsHtml}
            </div>
        `;
    }
}

export default AchievementCard;

