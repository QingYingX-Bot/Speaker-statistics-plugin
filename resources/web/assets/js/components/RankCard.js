/**
 * 排名卡片组件
 */
export class RankCard {
    /**
     * 渲染排名卡片（移动端卡片样式）
     * @param {Object} options 配置选项
     * @param {number} options.rank 排名
     * @param {string} options.userId 用户ID
     * @param {string} options.userName 用户名
     * @param {string} options.avatarUrl 头像URL
     * @param {number} options.count 发言数
     * @param {number} options.words 字数（可选）
     * @param {string} options.className 额外CSS类名（可选）
     * @param {string} options.dataUserId 数据属性（可选）
     * @returns {string} HTML字符串
     */
    static render({ 
        rank,
        userId,
        userName,
        avatarUrl,
        count = 0,
        words = 0,
        className = '',
        dataUserId = ''
    }) {
        // 排名样式
        let rankBadgeClass = 'text-xs font-semibold px-2 py-0.5 rounded';
        let cardClass = 'border-gray-200 dark:border-gray-700';
        let rankClass = 'text-gray-900 dark:text-gray-100';
        let avatarBorderClass = 'border-gray-300 dark:border-gray-600';
        
        if (rank === 1) {
            rankBadgeClass += ' bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
            cardClass = 'border-yellow-300 dark:border-yellow-700';
            rankClass = 'text-yellow-600 dark:text-yellow-400';
            avatarBorderClass = 'border-yellow-300 dark:border-yellow-700';
        } else if (rank === 2) {
            rankBadgeClass += ' bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
            cardClass = 'border-gray-300 dark:border-gray-600';
            rankClass = 'text-gray-600 dark:text-gray-400';
            avatarBorderClass = 'border-gray-300 dark:border-gray-600';
        } else if (rank === 3) {
            rankBadgeClass += ' bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
            cardClass = 'border-orange-300 dark:border-orange-700';
            rankClass = 'text-orange-600 dark:text-orange-400';
            avatarBorderClass = 'border-orange-300 dark:border-orange-700';
        } else {
            rankBadgeClass += ' bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
        }
        
        const dataAttr = dataUserId ? `data-user-id="${dataUserId}"` : '';
        const displayName = (window.escapeHtml || ((str) => str.replace(/[&<>"']/g, (m) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[m]))))(userName || userId || '未知用户');
        const safeAvatarUrl = avatarUrl || `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=100`;
        const formatNumber = window.formatNumber || ((n) => n != null ? n.toLocaleString('zh-CN') : '-');
        
        return `
            <div class="bg-white dark:bg-gray-800 rounded-lg border ${cardClass} p-3 ${className}" ${dataAttr}>
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2.5 flex-1 min-w-0">
                        <span class="${rankBadgeClass} flex-shrink-0">${rank}</span>
                        <img src="${safeAvatarUrl}" alt="${displayName}" class="w-8 h-8 rounded-full border-2 ${avatarBorderClass} object-cover flex-shrink-0" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'%3E%3Ccircle cx=\\'12\\' cy=\\'12\\' r=\\'10\\' fill=\\'%23f3f4f6\\'/%3E%3C/svg%3E';">
                        <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate ${rank <= 3 ? 'font-semibold' : ''}">${displayName}</span>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="flex justify-between">
                        <span class="text-gray-500 dark:text-gray-400">发言数</span>
                        <span class="font-medium ${rankClass}">${formatNumber(count)}</span>
                    </div>
                    ${words > 0 ? `
                    <div class="flex justify-between">
                        <span class="text-gray-500 dark:text-gray-400">字数</span>
                        <span class="font-medium ${rankClass}">${formatNumber(words)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * 渲染排名表格行（桌面端表格样式）
     * @param {Object} options 配置选项
     * @param {number} options.rank 排名
     * @param {string} options.userId 用户ID
     * @param {string} options.userName 用户名
     * @param {string} options.avatarUrl 头像URL
     * @param {number} options.count 发言数
     * @param {number} options.words 字数
     * @param {number} options.activeDays 活跃天数（可选）
     * @param {number} options.continuousDays 连续天数（可选）
     * @param {string} options.className 额外CSS类名（可选）
     * @returns {string} HTML字符串
     */
    static renderTableRow({ 
        rank,
        userId,
        userName,
        avatarUrl,
        count = 0,
        words = 0,
        activeDays = 0,
        continuousDays = 0,
        className = ''
    }) {
        // 排名样式
        let rankBadgeClass = 'text-xs font-semibold px-2 py-0.5 rounded';
        let rankClass = 'text-gray-900 dark:text-gray-100';
        let avatarBorderClass = 'border-gray-300 dark:border-gray-600';
        
        if (rank === 1) {
            rankBadgeClass += ' bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
            rankClass = 'text-yellow-600 dark:text-yellow-400';
            avatarBorderClass = 'border-yellow-300 dark:border-yellow-700';
        } else if (rank === 2) {
            rankBadgeClass += ' bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
            rankClass = 'text-gray-600 dark:text-gray-400';
            avatarBorderClass = 'border-gray-300 dark:border-gray-600';
        } else if (rank === 3) {
            rankBadgeClass += ' bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
            rankClass = 'text-orange-600 dark:text-orange-400';
            avatarBorderClass = 'border-orange-300 dark:border-orange-700';
        } else {
            rankBadgeClass += ' bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
        }
        
        const escapeHtml = window.escapeHtml || ((str) => str.replace(/[&<>"']/g, (m) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[m])));
        const formatNumber = window.formatNumber || ((n) => n != null ? n.toLocaleString('zh-CN') : '-');
        const displayName = escapeHtml(userName || userId || '未知用户');
        const safeAvatarUrl = avatarUrl || `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=100`;
        
        return `
            <tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${className}">
                <td class="px-4 py-2.5">
                    <span class="${rankBadgeClass}">${rank}</span>
                </td>
                <td class="px-4 py-2.5">
                    <div class="flex items-center gap-2.5">
                        <img src="${safeAvatarUrl}" alt="${displayName}" class="w-8 h-8 rounded-full border-2 ${avatarBorderClass} object-cover flex-shrink-0" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'%3E%3Ccircle cx=\\'12\\' cy=\\'12\\' r=\\'10\\' fill=\\'%23f3f4f6\\'/%3E%3C/svg%3E';">
                        <span class="text-sm font-medium text-gray-900 dark:text-gray-100 ${rank <= 3 ? 'font-semibold' : ''}">${displayName}</span>
                    </div>
                </td>
                <td class="px-4 py-2.5 text-right text-sm ${rankClass} font-medium">${formatNumber(count)}</td>
                <td class="px-4 py-2.5 text-right text-sm ${rankClass} font-medium">${formatNumber(words)}</td>
                ${activeDays !== undefined ? `<td class="px-4 py-2.5 text-right text-sm text-gray-700 dark:text-gray-300">${formatNumber(activeDays)}</td>` : ''}
                ${continuousDays !== undefined ? `<td class="px-4 py-2.5 text-right text-sm text-gray-700 dark:text-gray-300">${formatNumber(continuousDays)}</td>` : ''}
            </tr>
        `;
    }
}

export default RankCard;

