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
            <div class="bg-white dark:bg-gray-900 min-h-full">
                <div class="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8">
                    <!-- 页面标题和筛选器 -->
                    <div class="mb-4 sm:mb-5 flex-shrink-0 flex flex-col gap-3 sm:gap-4">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                            <div>
                                <h1 class="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">数据统计</h1>
                                <p class="text-xs text-gray-500 dark:text-gray-400">查看您的发言数据分析</p>
                            </div>
                            
                            <!-- 群选择 -->
                            <div class="w-full sm:w-auto sm:min-w-[220px]">
                                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">选择群聊</label>
                                <div class="relative">
                                    <select id="groupSelect" class="select-custom w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-gray-800 dark:text-gray-200 text-sm appearance-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600">
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
                        <div id="statsGrid" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
                            ${this.renderStatCards()}
                        </div>
                    </div>
                    
                    <!-- 详细数据 -->
                    <div id="detailContent" class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 xl:gap-8 mt-4 sm:mt-5 lg:mt-6">
                        ${this.renderDetailCards()}
                    </div>
                </div>
            </div>
        `;
    }
    
    renderStatCards() {
        return `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between">
                <div class="text-xs sm:text-sm lg:text-base text-gray-500 dark:text-gray-400 mb-2">今日发言</div>
                <div class="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary leading-tight" id="todayCount">-</div>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between">
                <div class="text-xs sm:text-sm lg:text-base text-gray-500 dark:text-gray-400 mb-2">总发言</div>
                <div class="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 leading-tight" id="totalCount">-</div>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between">
                <div class="text-xs sm:text-sm lg:text-base text-gray-500 dark:text-gray-400 mb-2">总字数</div>
                <div class="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 leading-tight" id="totalWords">-</div>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between">
                <div class="text-xs sm:text-sm lg:text-base text-gray-500 dark:text-gray-400 mb-2">活跃天数</div>
                <div class="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 leading-tight" id="activeDays">-</div>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between">
                <div class="text-xs sm:text-sm lg:text-base text-gray-500 dark:text-gray-400 mb-2">连续天数</div>
                <div class="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 leading-tight" id="continuousDays">-</div>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between">
                <div class="text-xs sm:text-sm lg:text-base text-gray-500 dark:text-gray-400 mb-2">排名</div>
                <div class="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 leading-tight" id="rank">-</div>
            </div>
        `;
    }
    
    renderDetailCards() {
        return `
            <div class="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div class="px-5 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 border-b border-gray-200 dark:border-gray-700">
                    <h3 class="text-sm sm:text-base lg:text-lg font-semibold text-gray-800 dark:text-gray-200">详细信息</h3>
                </div>
                <div class="p-5 sm:p-6 lg:p-8">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 lg:gap-x-8 gap-y-3 sm:gap-y-4 lg:gap-y-5" id="detailInfo">
                        <div class="flex justify-between items-center py-2.5 lg:py-3 border-b border-gray-100 dark:border-gray-800 sm:border-b-0 sm:border-r dark:sm:border-gray-700 sm:pr-4 lg:pr-6 min-h-[44px]">
                            <span class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">用户昵称</span>
                            <span class="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate ml-2 text-right" id="nickname">-</span>
                        </div>
                        <div class="flex justify-between items-center py-2.5 lg:py-3 border-b border-gray-100 dark:border-gray-800 sm:border-b-0 sm:pl-4 lg:pl-6 min-h-[44px]">
                            <span class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">最后发言</span>
                            <span class="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100" id="lastSpeaking">-</span>
                        </div>
                        <div class="flex justify-between items-center py-2.5 lg:py-3 border-b border-gray-100 dark:border-gray-800 sm:border-b-0 sm:border-r dark:sm:border-gray-700 sm:pr-4 lg:pr-6 min-h-[44px]">
                            <span class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">平均每日</span>
                            <span class="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100" id="averageDaily">-</span>
                        </div>
                        <div class="flex justify-between items-center py-2.5 lg:py-3 border-b border-gray-100 dark:border-gray-800 sm:border-b-0 sm:pl-4 lg:pl-6 min-h-[44px]">
                            <span class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">平均字数</span>
                            <span class="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100" id="averageWords">-</span>
                        </div>
                        <div class="flex justify-between items-center py-2.5 lg:py-3 border-b border-gray-100 dark:border-gray-800 sm:border-b-0 sm:border-r dark:sm:border-gray-700 sm:pr-4 lg:pr-6 min-h-[44px]">
                            <span class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">本周发言</span>
                            <span class="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100" id="weeklyCount">-</span>
                        </div>
                        <div class="flex justify-between items-center py-2.5 lg:py-3 border-b border-gray-100 dark:border-gray-800 sm:border-b-0 sm:pl-4 lg:pl-6 min-h-[44px]">
                            <span class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">本月发言</span>
                            <span class="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100" id="monthlyCount">-</span>
                        </div>
                        <div class="flex justify-between items-center py-2.5 lg:py-3 sm:col-span-2 min-h-[44px]">
                            <span class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">消息占比</span>
                            <span class="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100" id="messagePercentage">-</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div class="px-5 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 border-b border-gray-200 dark:border-gray-700">
                    <h3 class="text-sm sm:text-base lg:text-lg font-semibold text-gray-800 dark:text-gray-200">今日数据</h3>
                </div>
                <div class="p-5 sm:p-6 lg:p-8">
                    <div class="space-y-4 sm:space-y-5 lg:space-y-6">
                        <div class="text-center py-4 sm:py-5 lg:py-6">
                            <div class="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-primary mb-2 sm:mb-3 lg:mb-4 leading-tight" id="todayCountDetail">-</div>
                            <div class="text-sm sm:text-base text-gray-500 dark:text-gray-400">今日发言数</div>
                        </div>
                        <div class="text-center py-4 sm:py-5 lg:py-6 border-t border-gray-200 dark:border-gray-700">
                            <div class="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-2 sm:mb-3 lg:mb-4 leading-tight" id="todayWordsDetail">-</div>
                            <div class="text-sm sm:text-base text-gray-500 dark:text-gray-400">今日字数</div>
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
            // 并行执行：加载群列表和初始化统计数据
            const [groupsResponse] = await Promise.all([
                api.getUserGroups(this.app.userId).catch(err => {
                    console.error('加载群列表失败:', err);
                    return { success: false, data: [] };
                })
            ]);
            
            this.groups = groupsResponse.data || [];
            
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
            
            // 更新自定义下拉框
            if (window.updateCustomSelect) {
                window.updateCustomSelect(select);
            }
            
            // 加载全部群聊的统计数据（不阻塞群列表显示）
            if (this.currentGroupId === 'all') {
                // 不等待，让页面先显示
                this.loadAllGroupsStats().catch(err => {
                    console.error('加载统计数据失败:', err);
                });
            } else if (this.groups.length > 0) {
                this.loadStats(this.currentGroupId).catch(err => {
                    console.error('加载统计数据失败:', err);
                });
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
                    // 如果选择全部群聊，聚合所有群聊的数据
                    await this.loadAllGroupsStats();
                } else if (this.currentGroupId) {
                    await this.loadStats(this.currentGroupId);
                }
            });
        }
    }
    
    async loadStats(groupId) {
        try {
            // 先显示加载状态
            this.renderStats({ loading: true });
            
            const response = await api.getUserStats(this.app.userId, groupId);
            this.userData = response.data;
            this.renderStats();
        } catch (error) {
            console.error('加载统计数据失败:', error);
            Toast.show('加载统计数据失败', 'error');
        }
    }
    
    async loadAllGroupsStats() {
        if (!this.groups || this.groups.length === 0) {
            Toast.show('暂无群聊数据', 'info');
            return;
        }
        
        try {
            // 先显示加载状态
            this.renderStats({ loading: true });
            
            // 获取所有群聊的统计数据（并行执行，提升速度）
            const allStats = await Promise.all(
                this.groups.map(async (group) => {
                    try {
                        const response = await api.getUserStats(this.app.userId, group.group_id);
                        if (response.success && response.data) {
                            return response.data;
                        }
                    } catch (error) {
                    }
                    return null;
                })
            );
            
            // 过滤掉失败的数据
            const validStats = allStats.filter(stat => stat !== null);
            
            if (validStats.length === 0) {
                Toast.show('无法获取统计数据', 'error');
                return;
            }
            
            // 聚合所有群聊的数据
            const aggregatedData = this.aggregateStats(validStats);
            
            // 先显示基础数据（不等待排名）
            this.userData = aggregatedData;
            this.renderStats();
            
            // 延迟加载排名（不阻塞页面显示）
            this.loadUserRankAsync(aggregatedData);
        } catch (error) {
            console.error('加载全部群聊统计数据失败:', error);
            Toast.show('加载统计数据失败', 'error');
        }
    }
    
    /**
     * 异步加载用户排名（不阻塞页面显示）
     */
    async loadUserRankAsync(aggregatedData) {
        try {
            // 使用较小的 limit，分批查找用户排名
            // 策略：先获取前1000名，如果用户不在其中，再获取更多
            let found = false;
            let limit = 1000;
            let page = 1;
            let userIndex = -1;
            
            while (!found && limit <= 10000) {
                const rankingResponse = await api.getRanking('total', 'all', { limit, page });
                if (rankingResponse.success && rankingResponse.data) {
                    // 找到当前用户在排行榜中的位置
                    userIndex = rankingResponse.data.findIndex(
                        user => String(user.user_id || user.userId) === String(this.app.userId)
                    );
                    
                    if (userIndex !== -1) {
                        // 找到了，计算实际排名
                        aggregatedData.rank = (page - 1) * limit + userIndex + 1;
                        found = true;
                        
                        // 更新排名显示
                        const rankEl = document.getElementById('rank');
                        if (rankEl) {
                            rankEl.textContent = `#${aggregatedData.rank}`;
                        }
                        break;
                    }
                    
                    // 如果当前页数据少于 limit，说明已经到末尾了
                    if (rankingResponse.data.length < limit) {
                        break;
                    }
                } else {
                    break;
                }
                
                // 如果没找到，增加 limit 继续查找（但限制最大为 10000）
                limit = Math.min(limit * 2, 10000);
            }
            
            // 如果还是没找到，尝试使用 getUserRankData（但这个方法也可能很慢）
            if (!found) {
                // 不继续查找，避免性能问题
                // 排名显示为 "-"
            }
        } catch (error) {
            // 不影响页面显示
        }
    }
    
    aggregateStats(statsArray) {
        const today = new Date().toISOString().split('T')[0];
        const currentWeek = window.TimeUtils ? window.TimeUtils.getCurrentWeekKey() : this.getCurrentWeekKey();
        const currentMonth = window.TimeUtils ? window.TimeUtils.getCurrentMonthKey() : this.getCurrentMonthKey();
        
        // 初始化聚合数据
        let totalCount = 0;
        let totalWords = 0;
        let todayCount = 0;
        let todayWords = 0;
        let weeklyCount = 0;
        let monthlyCount = 0;
        let maxContinuousDays = 0;
        const allActiveDays = new Set(); // 用于去重活跃天数
        let latestNickname = '';
        let latestSpeakingTime = null;
        
        // 遍历所有群聊的统计数据
        statsArray.forEach(stat => {
            // 累计总发言和总字数
            totalCount += parseInt(stat.total || stat.total_count || 0, 10);
            totalWords += parseInt(stat.total_number_of_words || stat.total_words || 0, 10);
            
            // 累计今日数据
            const todayStat = stat.daily_stats?.[today] || {};
            todayCount += parseInt(todayStat.count || 0, 10);
            todayWords += parseInt(todayStat.words || 0, 10);
            
            // 累计本周数据
            const weeklyStat = stat.weekly_stats?.[currentWeek] || {};
            weeklyCount += parseInt(weeklyStat.count || 0, 10);
            
            // 累计本月数据
            const monthlyStat = stat.monthly_stats?.[currentMonth] || {};
            monthlyCount += parseInt(monthlyStat.count || 0, 10);
            
            // 收集活跃天数（需要去重）
            if (stat.daily_stats) {
                Object.keys(stat.daily_stats).forEach(date => {
                    allActiveDays.add(date);
                });
            }
            
            // 取最大连续天数
            const continuousDays = parseInt(stat.continuous_days || 0, 10);
            if (continuousDays > maxContinuousDays) {
                maxContinuousDays = continuousDays;
            }
            
            // 获取最新的昵称和最后发言时间
            if (stat.last_speaking_time) {
                if (!latestSpeakingTime || stat.last_speaking_time > latestSpeakingTime) {
                    latestSpeakingTime = stat.last_speaking_time;
                    latestNickname = stat.nickname || '';
                }
            }
            if (!latestNickname && stat.nickname) {
                latestNickname = stat.nickname;
            }
        });
        
        // 构建聚合后的数据结构
        return {
            total: totalCount,
            total_count: totalCount,
            total_number_of_words: totalWords,
            total_words: totalWords,
            active_days: allActiveDays.size,
            continuous_days: maxContinuousDays,
            nickname: latestNickname || statsArray[0]?.nickname || '',
            last_speaking_time: latestSpeakingTime || statsArray[0]?.last_speaking_time || null,
            rank: null, // 全局排名将在 loadAllGroupsStats 中设置
            daily_stats: {
                [today]: {
                    count: todayCount,
                    words: todayWords
                }
            },
            weekly_stats: {
                [currentWeek]: {
                    count: weeklyCount
                }
            },
            monthly_stats: {
                [currentMonth]: {
                    count: monthlyCount
                }
            }
        };
    }
    
    renderStats(options = {}) {
        const data = this.userData;
        if (!data && !options.loading) return;
        
        // 更新统计卡片的辅助函数
        const updateElement = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        
        if (options.loading) {
            // 显示加载状态
            updateElement('totalCount', '...');
            updateElement('totalWords', '...');
            updateElement('todayCount', '...');
            updateElement('activeDays', '...');
            updateElement('continuousDays', '...');
            updateElement('rank', '...');
            return;
        }
        
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
        
        // 延迟加载消息占比（不阻塞页面显示）
        setTimeout(() => {
        this.updateMessagePercentage(totalCount);
        }, 100);
        
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
                    return;
                }
                
                if (response && response.success && response.data) {
                    const totalMessages = parseInt(response.data.total_messages || 0, 10);
                    
                    if (totalMessages > 0 && totalCount > 0) {
                        const percentage = ((totalCount / totalMessages) * 100).toFixed(2);
                        el.textContent = percentage + '%';
                    } else {
                        el.textContent = '0.00%';
                    }
                } else {
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
            // 如果选择全部群聊，计算所有群聊的总消息数
            this.calculateAllGroupsMessagePercentage(totalCount);
        }
    }
    
    async calculateAllGroupsMessagePercentage(userTotalCount) {
        const percentageEl = document.getElementById('messagePercentage');
        if (!percentageEl) return;
        
        percentageEl.textContent = '计算中...';
        
        try {
            // 获取所有群聊的总消息数
            const groupStatsPromises = this.groups.map(group => 
                api.getGroupStats(group.group_id).catch(() => null)
            );
            
            const groupStatsResults = await Promise.all(groupStatsPromises);
            
            // 汇总所有群聊的总消息数
            let totalMessages = 0;
            groupStatsResults.forEach(response => {
                if (response && response.success && response.data) {
                    totalMessages += parseInt(response.data.total_messages || 0, 10);
                }
            });
            
            if (totalMessages > 0 && userTotalCount > 0) {
                const percentage = ((userTotalCount / totalMessages) * 100).toFixed(2);
                percentageEl.textContent = percentage + '%';
            } else {
                percentageEl.textContent = '0.00%';
            }
        } catch (error) {
            console.error('计算全部群聊消息占比失败:', error);
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
