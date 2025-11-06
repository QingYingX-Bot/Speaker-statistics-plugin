/**
 * 首页 - 合并了统计功能
 * 现代简约风格
 */
export default class Home {
    constructor(app) {
        this.app = app;
        this.groups = [];
        this.currentGroupId = 'all';
        this.userData = null;
    }
    
    async render() {
        return `
            <div class="bg-white min-h-full" style="min-height: calc(100vh - 56px);">
                <div class="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
                    <!-- 页面标题和筛选器 -->
                    <div class="mb-4 sm:mb-5 flex-shrink-0 flex flex-col gap-3 sm:gap-4">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                            <div>
                                <h1 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">数据统计</h1>
                                <p class="text-xs text-gray-500">查看您的发言数据分析</p>
                            </div>
                            
                            <!-- 群选择 -->
                            <div class="w-full sm:w-auto sm:min-w-[160px]">
                                <label class="block text-xs font-medium text-gray-600 mb-1.5">选择群聊</label>
                                <div class="relative">
                                    <select id="groupSelect" class="select-custom w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-gray-800 text-sm appearance-none cursor-pointer hover:border-gray-300">
                                        <option value="all">全部群聊</option>
                                        <option value="">加载中...</option>
                                    </select>
                                    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 统计卡片网格 -->
                        <div id="statsGrid" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 lg:gap-3">
                            ${this.renderStatCards()}
                        </div>
                    </div>
                    
                    <!-- 详细数据 -->
                    <div id="detailContent" class="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-3 lg:gap-4">
                        ${this.renderDetailCards()}
                    </div>
                </div>
            </div>
        `;
    }
    
    renderStatCards() {
        return `
            <div class="bg-white rounded-lg p-2.5 sm:p-3 lg:p-4 border border-gray-200 hover:border-gray-300 transition-colors flex flex-col justify-between">
                <div class="text-xs text-gray-500 mb-1">今日发言</div>
                <div class="text-lg sm:text-xl lg:text-2xl font-semibold text-primary leading-tight" id="todayCount">-</div>
            </div>
            <div class="bg-white rounded-lg p-2.5 sm:p-3 lg:p-4 border border-gray-200 hover:border-gray-300 transition-colors flex flex-col justify-between">
                <div class="text-xs text-gray-500 mb-1">总发言</div>
                <div class="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 leading-tight" id="totalCount">-</div>
            </div>
            <div class="bg-white rounded-lg p-2.5 sm:p-3 lg:p-4 border border-gray-200 hover:border-gray-300 transition-colors flex flex-col justify-between">
                <div class="text-xs text-gray-500 mb-1">总字数</div>
                <div class="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 leading-tight" id="totalWords">-</div>
            </div>
            <div class="bg-white rounded-lg p-2.5 sm:p-3 lg:p-4 border border-gray-200 hover:border-gray-300 transition-colors flex flex-col justify-between">
                <div class="text-xs text-gray-500 mb-1">活跃天数</div>
                <div class="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 leading-tight" id="activeDays">-</div>
            </div>
            <div class="bg-white rounded-lg p-2.5 sm:p-3 lg:p-4 border border-gray-200 hover:border-gray-300 transition-colors flex flex-col justify-between">
                <div class="text-xs text-gray-500 mb-1">连续天数</div>
                <div class="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 leading-tight" id="continuousDays">-</div>
            </div>
            <div class="bg-white rounded-lg p-2.5 sm:p-3 lg:p-4 border border-gray-200 hover:border-gray-300 transition-colors flex flex-col justify-between">
                <div class="text-xs text-gray-500 mb-1">排名</div>
                <div class="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 leading-tight" id="rank">-</div>
            </div>
        `;
    }
    
    renderDetailCards() {
        return `
            <div class="lg:col-span-2 bg-white rounded-lg border border-gray-200">
                <div class="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-gray-200">
                    <h3 class="text-xs sm:text-sm font-medium text-gray-800">详细信息</h3>
                </div>
                <div class="p-4 sm:p-5">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 sm:gap-y-2.5" id="detailInfo">
                        <div class="flex justify-between items-center py-2 border-b border-gray-100 sm:border-b-0 sm:border-r sm:pr-4">
                            <span class="text-xs text-gray-600">用户昵称</span>
                            <span class="text-xs font-medium text-gray-900 truncate ml-2 text-right" id="nickname">-</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-100 sm:border-b-0 sm:pl-4">
                            <span class="text-xs text-gray-600">最后发言</span>
                            <span class="text-xs font-medium text-gray-900" id="lastSpeaking">-</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-100 sm:border-b-0 sm:border-r sm:pr-4">
                            <span class="text-xs text-gray-600">平均每日</span>
                            <span class="text-xs font-medium text-gray-900" id="averageDaily">-</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-100 sm:border-b-0 sm:pl-4">
                            <span class="text-xs text-gray-600">平均字数</span>
                            <span class="text-xs font-medium text-gray-900" id="averageWords">-</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-100 sm:border-b-0 sm:border-r sm:pr-4">
                            <span class="text-xs text-gray-600">本周发言</span>
                            <span class="text-xs font-medium text-gray-900" id="weeklyCount">-</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-100 sm:border-b-0 sm:pl-4">
                            <span class="text-xs text-gray-600">本月发言</span>
                            <span class="text-xs font-medium text-gray-900" id="monthlyCount">-</span>
                        </div>
                        <div class="flex justify-between items-center py-2 sm:col-span-2">
                            <span class="text-xs text-gray-600">消息占比</span>
                            <span class="text-xs font-medium text-gray-900" id="messagePercentage">-</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg border border-gray-200">
                <div class="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-gray-200">
                    <h3 class="text-xs sm:text-sm font-medium text-gray-800">今日数据</h3>
                </div>
                <div class="p-4 sm:p-5">
                    <div class="space-y-2.5 sm:space-y-3">
                        <div class="text-center py-2.5 sm:py-3">
                            <div class="text-xl sm:text-2xl lg:text-3xl font-semibold text-primary mb-1.5 sm:mb-2 leading-tight" id="todayCountDetail">-</div>
                            <div class="text-xs text-gray-500">今日发言数</div>
                        </div>
                        <div class="text-center py-2.5 sm:py-3 border-t border-gray-200">
                            <div class="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 mb-1.5 sm:mb-2 leading-tight" id="todayWordsDetail">-</div>
                            <div class="text-xs text-gray-500">今日字数</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async mounted() {
        await this.loadGroups();
        this.setupEventListeners();
    }
    
    async loadGroups() {
        try {
            const response = await api.getUserGroups(this.app.userId);
            this.groups = response.data || [];
            
            const select = document.getElementById('groupSelect');
            if (!select) return;
            
            // 清空并添加"全部群聊"选项
            select.innerHTML = '<option value="all">全部群聊</option>';
            
            this.groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.group_id;
                option.textContent = group.group_name || group.group_id;
                select.appendChild(option);
            });
            
            // 默认选择"全部群聊"
            this.currentGroupId = 'all';
            select.value = 'all';
            
            // 加载全部群聊的统计数据（如果支持）或第一个群聊的数据
            if (this.currentGroupId === 'all' && this.groups.length > 0) {
                // 如果选择全部群聊，可以加载第一个群聊的数据作为示例
                // 或者实现聚合所有群聊数据的逻辑
                await this.loadStats(this.groups[0].group_id);
            } else if (this.groups.length > 0) {
                await this.loadStats(this.currentGroupId);
            }
        } catch (error) {
            console.error('加载群列表失败:', error);
            Toast.show('加载群列表失败', 'error');
        }
    }
    
    setupEventListeners() {
        const select = document.getElementById('groupSelect');
        if (select) {
            select.addEventListener('change', async (e) => {
                this.currentGroupId = e.target.value;
                if (this.currentGroupId === 'all') {
                    // 如果选择全部群聊，加载第一个群聊的数据作为示例
                    // 或者实现聚合所有群聊数据的逻辑
                    if (this.groups.length > 0) {
                        await this.loadStats(this.groups[0].group_id);
                    }
                } else if (this.currentGroupId) {
                    await this.loadStats(this.currentGroupId);
                }
            });
        }
    }
    
    async loadStats(groupId) {
        try {
            const response = await api.getUserStats(this.app.userId, groupId);
            this.userData = response.data;
            this.renderStats();
        } catch (error) {
            console.error('加载统计数据失败:', error);
            Toast.show('加载统计数据失败', 'error');
        }
    }
    
    renderStats() {
        const data = this.userData;
        if (!data) return;
        
        // 更新统计卡片的辅助函数
        const updateElement = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        
        // 计算今日数据
        const today = new Date().toISOString().split('T')[0];
        const todayStats = data.daily_stats?.[today] || { count: 0, words: 0 };
        const todayCount = todayStats.count || 0;
        const todayWords = todayStats.words || 0;
        
        // 计算平均每日发言
        const activeDays = data.active_days || 0;
        const totalCount = data.total || 0;
        const totalWords = data.total_number_of_words || 0;
        const averageDaily = activeDays > 0 ? Math.round(totalCount / activeDays) : 0;
        
        // 计算平均字数
        const averageWords = totalCount > 0 ? Math.round(totalWords / totalCount) : 0;
        
        // 计算本周发言
        const currentWeek = window.TimeUtils ? window.TimeUtils.getCurrentWeekKey() : this.getCurrentWeekKey();
        const weeklyCount = data.weekly_stats?.[currentWeek]?.count || 0;
        
        // 计算本月发言
        const currentMonth = window.TimeUtils ? window.TimeUtils.getCurrentMonthKey() : this.getCurrentMonthKey();
        const monthlyCount = data.monthly_stats?.[currentMonth]?.count || 0;
        
        // 更新统计卡片
        updateElement('totalCount', formatNumber(totalCount));
        updateElement('totalWords', formatNumber(totalWords));
        updateElement('todayCount', formatNumber(todayCount));
        updateElement('activeDays', formatNumber(activeDays));
        updateElement('continuousDays', formatNumber(data.continuous_days || 0));
        updateElement('rank', data.rank ? `#${data.rank}` : '-');
        
        // 更新详细信息
        updateElement('nickname', data.nickname || '-');
        updateElement('lastSpeaking', formatDate(data.last_speaking_time));
        updateElement('averageDaily', formatNumber(averageDaily) + ' 条');
        updateElement('averageWords', formatNumber(averageWords) + ' 字');
        updateElement('weeklyCount', formatNumber(weeklyCount) + ' 条');
        updateElement('monthlyCount', formatNumber(monthlyCount) + ' 条');
        
        // 计算消息占比
        this.updateMessagePercentage(totalCount);
        
        // 更新今日数据
        updateElement('todayCountDetail', formatNumber(todayCount));
        updateElement('todayWordsDetail', formatNumber(todayWords));
    }
    
    updateMessagePercentage(totalCount) {
        const percentageEl = document.getElementById('messagePercentage');
        if (!percentageEl) {
            console.warn('消息占比元素不存在');
            return;
        }
        
        // 先显示加载状态
        percentageEl.textContent = '计算中...';
        
        if (this.currentGroupId && this.currentGroupId !== 'all') {
            // 异步获取群组统计数据
            api.getGroupStats(this.currentGroupId).then(response => {
                // 每次更新前重新获取元素，确保元素存在
                const el = document.getElementById('messagePercentage');
                if (!el) {
                    console.warn('消息占比元素在更新时不存在');
                    return;
                }
                
                console.log('群组统计数据响应:', response);
                
                if (response && response.success && response.data) {
                    const totalMessages = parseInt(response.data.total_messages || 0, 10);
                    console.log('总消息数:', totalMessages, '用户发言数:', totalCount);
                    
                    if (totalMessages > 0 && totalCount > 0) {
                        const percentage = ((totalCount / totalMessages) * 100).toFixed(2);
                        el.textContent = percentage + '%';
                        console.log('消息占比计算完成:', percentage + '%');
                    } else {
                        el.textContent = '0.00%';
                        console.log('消息占比为0');
                    }
                } else {
                    console.warn('群组统计数据格式不正确:', response);
                    el.textContent = '-';
                }
            }).catch((error) => {
                console.error('获取群组统计数据失败:', error);
                const el = document.getElementById('messagePercentage');
                if (el) {
                    el.textContent = '-';
                }
            });
        } else {
            // 如果选择全部群聊，显示"-"
            percentageEl.textContent = '-';
        }
    }
    
    // 获取当前周键（格式：YYYY-WW，使用ISO周数）
    getCurrentWeekKey() {
        const now = new Date();
        const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        const year = d.getUTCFullYear();
        return `${year}-W${weekNo.toString().padStart(2, '0')}`;
    }
    
    // 获取当前月键（格式：YYYY-MM）
    getCurrentMonthKey() {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        return `${year}-${month}`;
    }
}
