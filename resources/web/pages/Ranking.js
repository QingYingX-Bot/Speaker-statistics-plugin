/**
 * 排行榜页面 - 现代简约风格
 */
export default class Ranking {
    constructor(app) {
        this.app = app;
        this.groups = [];
        this.currentGroupId = 'all';
        this.currentType = 'total';
        this.currentPage = 1;
        this.rankings = [];
    }
    
    /**
     * 获取用户头像URL
     * @param {string|number} userId 用户ID（QQ号）
     * @returns {string} 头像URL
     */
    getAvatarUrl(userId) {
        if (!userId) return '';
        return `http://q.qlogo.cn/headimg_dl?dst_uin=${userId}&spec=640&img_type=jpg`;
    }
    
    async render() {
        return `
            <div class="bg-white min-h-full">
                <div class="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
                    <!-- 页面标题和筛选器 -->
                    <div class="mb-4 sm:mb-5 flex flex-col gap-3 sm:gap-4">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                            <div>
                                <h1 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">排行榜</h1>
                                <p class="text-xs text-gray-500">查看发言排行榜数据</p>
                            </div>
                            
                            <!-- 筛选器 -->
                            <div class="flex flex-col sm:flex-row gap-3 sm:items-end">
                                <div id="typeSelectContainer" class="w-full sm:w-auto sm:min-w-[140px]">
                                    <label class="block text-xs font-medium text-gray-600 mb-1.5">排行榜类型</label>
                                    <div class="relative">
                                        <select id="typeSelect" class="select-custom w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-gray-800 text-sm appearance-none cursor-pointer hover:border-gray-300">
                                            <option value="total">总榜</option>
                                            <option value="daily">日榜</option>
                                            <option value="weekly">周榜</option>
                                            <option value="monthly">月榜</option>
                                            <option value="yearly">年榜</option>
                                        </select>
                                        <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                <div class="w-full sm:w-auto sm:min-w-[160px]">
                                    <label class="block text-xs font-medium text-gray-600 mb-1.5">选择群聊</label>
                                    <div class="relative">
                                        <select id="groupSelect" class="select-custom w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-gray-800 text-sm appearance-none cursor-pointer hover:border-gray-300">
                                            <option value="all">全部群聊</option>
                                        </select>
                                        <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 排行榜内容 -->
                    <div id="rankingContent">
                        <div class="flex items-center justify-center py-20">
                            <div class="text-center">
                                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                                <p class="text-gray-500 text-sm">加载中...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async mounted() {
        await this.loadGroups();
        this.setupEventListeners();
        await this.loadRanking();
    }
    
    async loadGroups() {
        try {
            const response = await api.getUserGroups(this.app.userId);
            this.groups = response.data || [];
            
            const select = document.getElementById('groupSelect');
            if (!select) return;
            
            select.innerHTML = '<option value="all">全部群聊</option>';
            
            this.groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.group_id;
                option.textContent = group.group_name || group.group_id;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('加载群列表失败:', error);
        }
    }
    
    setupEventListeners() {
        const groupSelect = document.getElementById('groupSelect');
        const typeSelect = document.getElementById('typeSelect');
        const typeSelectContainer = document.getElementById('typeSelectContainer');
        
        // 初始化时根据当前选择显示/隐藏排行榜类型
        this.toggleTypeSelect(this.currentGroupId === 'all');
        
        if (groupSelect) {
            groupSelect.addEventListener('change', (e) => {
                const newGroupId = e.target.value;
                const isAllGroups = newGroupId === 'all';
                
                // 平滑切换排行榜类型选择器
                this.toggleTypeSelect(isAllGroups);
                
                // 如果切换到全部群聊，重置排行榜类型为总榜
                if (isAllGroups) {
                    this.currentType = 'total';
                    if (typeSelect) {
                        typeSelect.value = 'total';
                    }
                }
                
                this.currentGroupId = newGroupId;
                this.currentPage = 1;
                
                // 延迟加载，等待动画完成
                setTimeout(() => {
                    this.loadRanking();
                }, 150);
            });
        }
        
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                this.currentType = e.target.value;
                this.currentPage = 1;
                this.loadRanking();
            });
        }
    }
    
    toggleTypeSelect(hide) {
        const typeSelectContainer = document.getElementById('typeSelectContainer');
        if (!typeSelectContainer) return;
        
        if (hide) {
            // 使用平滑过渡隐藏 - 淡出 + 向上收缩
            typeSelectContainer.style.opacity = '0';
            typeSelectContainer.style.transform = 'translateY(-5px) scale(0.98)';
            typeSelectContainer.style.maxHeight = '0';
            typeSelectContainer.style.overflow = 'hidden';
            typeSelectContainer.style.marginTop = '0';
            typeSelectContainer.style.marginBottom = '0';
            typeSelectContainer.style.pointerEvents = 'none';
            typeSelectContainer.style.filter = 'blur(2px)';
            
            // 等待动画完成后完全隐藏
            setTimeout(() => {
                typeSelectContainer.style.display = 'none';
                typeSelectContainer.style.filter = 'none';
            }, 300);
        } else {
            // 先显示元素，但设置初始状态
            typeSelectContainer.style.display = 'block';
            typeSelectContainer.style.opacity = '0';
            typeSelectContainer.style.transform = 'translateY(-5px) scale(0.98)';
            typeSelectContainer.style.maxHeight = '0';
            typeSelectContainer.style.overflow = 'hidden';
            typeSelectContainer.style.filter = 'blur(2px)';
            
            // 使用 requestAnimationFrame 确保显示后再应用动画
            requestAnimationFrame(() => {
                // 触发重排，确保动画生效
                typeSelectContainer.offsetHeight;
                
                // 应用最终状态
                typeSelectContainer.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                typeSelectContainer.style.opacity = '1';
                typeSelectContainer.style.transform = 'translateY(0) scale(1)';
                typeSelectContainer.style.maxHeight = '100px';
                typeSelectContainer.style.overflow = 'visible';
                typeSelectContainer.style.marginTop = '';
                typeSelectContainer.style.marginBottom = '';
                typeSelectContainer.style.pointerEvents = 'auto';
                typeSelectContainer.style.filter = 'blur(0)';
            });
        }
    }
    
    async loadRanking() {
        const content = document.getElementById('rankingContent');
        if (!content) return;
        
        // 使用淡出效果
        content.style.opacity = '0.6';
        content.style.transition = 'opacity 0.2s ease';
        
        content.innerHTML = `
            <div class="flex items-center justify-center py-20">
                <div class="text-center">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                    <p class="text-gray-500 text-sm">加载中...</p>
                </div>
            </div>
        `;
        
        // 恢复不透明度
        requestAnimationFrame(() => {
            content.style.opacity = '1';
        });
        
        try {
            const response = await api.getRanking(this.currentType, this.currentGroupId, {
                limit: 50,
                page: this.currentPage
            });
            
            this.rankings = response.data || [];
            
            // 淡入渲染
            this.renderRanking();
            content.style.opacity = '0';
            requestAnimationFrame(() => {
                content.style.opacity = '1';
            });
        } catch (error) {
            console.error('加载排行榜失败:', error);
            content.innerHTML = `
                <div class="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <div class="text-4xl mb-4">❌</div>
                    <div class="text-gray-600 text-sm">加载失败: ${error.message}</div>
                </div>
            `;
            content.style.opacity = '1';
        }
    }
    
    renderRanking() {
        const content = document.getElementById('rankingContent');
        if (!content) return;
        
        if (this.rankings.length === 0) {
            content.innerHTML = `
                <div class="bg-white rounded-lg border border-gray-200 p-16 text-center">
                    <div class="text-4xl mb-3 text-gray-400">📊</div>
                    <div class="text-gray-500 text-sm">暂无排行榜数据</div>
                </div>
            `;
            return;
        }
        
        const typeNames = {
            'total': '总榜',
            'daily': '日榜',
            'weekly': '周榜',
            'monthly': '月榜',
            'yearly': '年榜'
        };
        
        // 移动端使用卡片布局，桌面端使用表格
        let html = `
            <!-- 移动端卡片布局 -->
            <div class="sm:hidden space-y-2">
        `;
        
        this.rankings.forEach((item, index) => {
            const rank = index + 1;
            const avatarUrl = this.getAvatarUrl(item.user_id);
            const displayName = item.nickname || `用户${item.user_id}`;
            
            // 前三名特殊样式
            let rankClass = 'text-gray-700';
            let rankBadgeClass = 'inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-600 text-xs font-semibold';
            let cardClass = 'bg-white border-gray-200';
            let avatarBorderClass = 'border-gray-200';
            
            if (rank === 1) {
                rankClass = 'text-yellow-600';
                rankBadgeClass = 'inline-flex items-center justify-center w-6 h-6 rounded-md bg-yellow-100 text-yellow-700 text-xs font-semibold';
                cardClass = 'bg-yellow-50/30 border-yellow-300';
                avatarBorderClass = 'border-yellow-300';
            } else if (rank === 2) {
                rankClass = 'text-gray-600';
                rankBadgeClass = 'inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-700 text-xs font-semibold';
                cardClass = 'bg-gray-50/30 border-gray-300';
                avatarBorderClass = 'border-gray-300';
            } else if (rank === 3) {
                rankClass = 'text-orange-600';
                rankBadgeClass = 'inline-flex items-center justify-center w-6 h-6 rounded-md bg-orange-100 text-orange-700 text-xs font-semibold';
                cardClass = 'bg-orange-50/30 border-orange-300';
                avatarBorderClass = 'border-orange-300';
            }
            
            html += `
                <div class="bg-white rounded-lg border ${cardClass} p-3">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2.5 flex-1 min-w-0">
                            <span class="${rankBadgeClass} flex-shrink-0">${rank}</span>
                            <img src="${avatarUrl}" alt="${displayName}" class="w-8 h-8 rounded-full border-2 ${avatarBorderClass} object-cover flex-shrink-0" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'%3E%3Ccircle cx=\\'12\\' cy=\\'12\\' r=\\'10\\' fill=\\'%23f3f4f6\\'/%3E%3C/svg%3E';">
                            <span class="text-sm font-medium text-gray-900 truncate ${rank <= 3 ? 'font-semibold' : ''}">${displayName}</span>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div class="flex justify-between">
                            <span class="text-gray-500">发言数</span>
                            <span class="font-medium ${rankClass}">${formatNumber(item.count || 0)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-500">字数</span>
                            <span class="font-medium ${rankClass}">${formatNumber(item.period_words || 0)}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
            </div>
            
            <!-- 桌面端表格布局 -->
            <div class="hidden sm:block bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full" style="table-layout: fixed;">
                        <colgroup>
                            <col style="width: 60px;">
                            <col style="width: auto;">
                            <col style="width: 100px;">
                            <col style="width: 100px;">
                            <col style="width: 100px;">
                            <col style="width: 100px;">
                        </colgroup>
                        <thead>
                            <tr class="border-b border-gray-200">
                                <th class="px-4 py-2.5 text-left text-xs font-medium text-gray-600">排名</th>
                                <th class="px-4 py-2.5 text-left text-xs font-medium text-gray-600">用户</th>
                                <th class="px-4 py-2.5 text-right text-xs font-medium text-gray-600">发言数</th>
                                <th class="px-4 py-2.5 text-right text-xs font-medium text-gray-600">字数</th>
                                <th class="px-4 py-2.5 text-right text-xs font-medium text-gray-600">活跃天数</th>
                                <th class="px-4 py-2.5 text-right text-xs font-medium text-gray-600">连续天数</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
        `;
        
        this.rankings.forEach((item, index) => {
            const rank = index + 1;
            const avatarUrl = this.getAvatarUrl(item.user_id);
            const displayName = item.nickname || `用户${item.user_id}`;
            
            // 前三名特殊样式（简约版）
            let rankClass = 'text-gray-700';
            let rankBadgeClass = 'inline-flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 text-gray-600 text-xs font-semibold';
            let rowClass = 'hover:bg-gray-50';
            let avatarBorderClass = 'border-gray-200';
            
            if (rank === 1) {
                rankClass = 'text-yellow-600';
                rankBadgeClass = 'inline-flex items-center justify-center w-8 h-8 rounded-md bg-yellow-100 text-yellow-700 text-xs font-semibold';
                rowClass = 'hover:bg-yellow-50/30';
                avatarBorderClass = 'border-yellow-300';
            } else if (rank === 2) {
                rankClass = 'text-gray-600';
                rankBadgeClass = 'inline-flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 text-gray-700 text-xs font-semibold';
                rowClass = 'hover:bg-gray-50/50';
                avatarBorderClass = 'border-gray-300';
            } else if (rank === 3) {
                rankClass = 'text-orange-600';
                rankBadgeClass = 'inline-flex items-center justify-center w-8 h-8 rounded-md bg-orange-100 text-orange-700 text-xs font-semibold';
                rowClass = 'hover:bg-orange-50/30';
                avatarBorderClass = 'border-orange-300';
            }
            
            html += `
                <tr class="${rowClass} transition-colors">
                    <td class="px-4 py-2.5">
                        <span class="${rankBadgeClass}">${rank}</span>
                    </td>
                    <td class="px-4 py-2.5">
                        <div class="flex items-center gap-2.5">
                            <img 
                                src="${avatarUrl}" 
                                alt="${displayName}"
                                class="w-8 h-8 rounded-full border-2 ${avatarBorderClass} object-cover flex-shrink-0"
                                onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22%3E%3Ccircle cx=%2216%22 cy=%2216%22 r=%2214%22 fill=%22%23f3f4f6%22/%3E%3C/svg%3E'"
                            >
                            <span class="text-sm text-gray-900 font-medium truncate ${rank <= 3 ? 'font-semibold' : ''}">${displayName}</span>
                        </div>
                    </td>
                    <td class="px-4 py-2.5 text-sm text-gray-900 text-right font-medium">${formatNumber(item.count || 0)}</td>
                    <td class="px-4 py-2.5 text-sm text-gray-900 text-right font-medium">${formatNumber(item.period_words || 0)}</td>
                    <td class="px-4 py-2.5 text-sm text-gray-600 text-right">${formatNumber(item.active_days || 0)}</td>
                    <td class="px-4 py-2.5 text-sm text-gray-600 text-right">${formatNumber(item.continuous_days || 0)}</td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        content.innerHTML = html;
    }
}
