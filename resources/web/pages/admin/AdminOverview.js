/**
 * 管理页面 - 概览模块
 */
export class AdminOverview {
    constructor(admin) {
        this.admin = admin;
        this.messageTrendChart = null;
        this.groupActivityChart = null;
        this.userMessageChart = null;
        this.newUserTrendChart = null;
        this.chartResizeHandler = null;
    }
    
    async loadOverview() {
        if (!this.admin.secretKey) {
            console.warn('秘钥未设置，无法加载概览');
            return;
        }
        try {
            this.admin.loading.overview = true;
            const response = await api.getAdminOverview(this.admin.app.userId, this.admin.secretKey);
            if (response.success && response.data) {
                this.admin.overview = response.data;
                this.updateOverview();
                // 确保图表在数据更新后重新渲染
                setTimeout(() => {
                    this.updateCharts();
                }, 200);
            }
        } catch (error) {
            console.error('加载概览失败:', error);
            Toast.show('加载概览失败: ' + (error.message || '未知错误'), 'error');
        } finally {
            this.admin.loading.overview = false;
        }
    }
    
    updateOverview() {
        if (!this.admin.overview) return;
        
        const totalGroupsEl = document.getElementById('totalGroups');
        const totalUsersEl = document.getElementById('totalUsers');
        const totalMessagesEl = document.getElementById('totalMessages');
        const todayMessagesEl = document.getElementById('todayMessages');
        const activeGroupsEl = document.getElementById('activeGroups');
        const todayNewUsersEl = document.getElementById('todayNewUsers');
        const avgMessagesPerGroupEl = document.getElementById('avgMessagesPerGroup');
        const avgMessagesPerUserEl = document.getElementById('avgMessagesPerUser');
        
        if (totalGroupsEl) totalGroupsEl.textContent = formatNumber(this.admin.overview.totalGroups || 0);
        if (totalUsersEl) totalUsersEl.textContent = formatNumber(this.admin.overview.totalUsers || 0);
        if (totalMessagesEl) totalMessagesEl.textContent = formatNumber(this.admin.overview.totalMessages || 0);
        if (todayMessagesEl) todayMessagesEl.textContent = formatNumber(this.admin.overview.todayMessages || 0);
        if (activeGroupsEl) activeGroupsEl.textContent = formatNumber(this.admin.overview.activeGroups || 0);
        if (todayNewUsersEl) todayNewUsersEl.textContent = formatNumber(this.admin.overview.todayNewUsers || 0);
        
        // 计算平均消息/群
        const avgPerGroup = (this.admin.overview.totalGroups > 0 && this.admin.overview.totalMessages > 0) 
            ? Math.round(this.admin.overview.totalMessages / this.admin.overview.totalGroups) 
            : 0;
        if (avgMessagesPerGroupEl) avgMessagesPerGroupEl.textContent = formatNumber(avgPerGroup);
        
        // 计算平均消息/用户
        const avgPerUser = (this.admin.overview.totalUsers > 0 && this.admin.overview.totalMessages > 0) 
            ? Math.round(this.admin.overview.totalMessages / this.admin.overview.totalUsers) 
            : 0;
        if (avgMessagesPerUserEl) avgMessagesPerUserEl.textContent = formatNumber(avgPerUser);
        
        // 更新图表
        this.updateCharts();
        
        // 更新系统设置页面的统计
        this.updateSettingsStats();
    }
    
    initCharts() {
        // 检查 echarts 是否已加载
        if (typeof echarts === 'undefined') {
            console.warn('ECharts 未加载，图表功能不可用，500ms后重试');
            // 延迟重试
            setTimeout(() => {
                if (typeof echarts !== 'undefined') {
                    this.initCharts();
                }
            }, 500);
            return;
        }
        
        // 初始化消息趋势图
        const messageTrendEl = document.getElementById('messageTrendChart');
        if (messageTrendEl && !this.messageTrendChart) {
            try {
                this.messageTrendChart = echarts.init(messageTrendEl);
            } catch (error) {
                console.error('初始化消息趋势图失败:', error);
            }
        }
        
        // 初始化群组活跃度分布图
        const groupActivityEl = document.getElementById('groupActivityChart');
        if (groupActivityEl && !this.groupActivityChart) {
            try {
                this.groupActivityChart = echarts.init(groupActivityEl);
            } catch (error) {
                console.error('初始化群组活跃度分布图失败:', error);
            }
        }
        
        // 初始化用户消息分布图
        const userMessageEl = document.getElementById('userMessageChart');
        if (userMessageEl && !this.userMessageChart) {
            try {
                this.userMessageChart = echarts.init(userMessageEl);
            } catch (error) {
                console.error('初始化用户消息分布图失败:', error);
            }
        }
        
        // 初始化新增用户趋势图
        const newUserTrendEl = document.getElementById('newUserTrendChart');
        if (newUserTrendEl && !this.newUserTrendChart) {
            try {
                this.newUserTrendChart = echarts.init(newUserTrendEl);
            } catch (error) {
                console.error('初始化新增用户趋势图失败:', error);
            }
        }
        
        // 监听窗口大小变化，自动调整图表大小
        if (!this.chartResizeHandler) {
            this.chartResizeHandler = () => {
                try {
                    if (this.messageTrendChart) this.messageTrendChart.resize();
                    if (this.groupActivityChart) this.groupActivityChart.resize();
                    if (this.userMessageChart) this.userMessageChart.resize();
                    if (this.newUserTrendChart) this.newUserTrendChart.resize();
                } catch (error) {
                    console.warn('调整图表大小失败:', error);
                }
            };
            window.addEventListener('resize', this.chartResizeHandler);
        }
    }
    
    updateCharts() {
        if (!this.admin.overview) return;
        
        // 检查 echarts 是否已加载
        if (typeof echarts === 'undefined') {
            return;
        }
        
        // 初始化图表（如果还未初始化）
        this.initCharts();
        
        // 获取当前主题
        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#E5E7EB' : '#374151';
        const gridColor = isDark ? '#374151' : '#E5E7EB';
        
        // 更新消息趋势图
        if (this.messageTrendChart) {
            const dailyStats = this.admin.overview.dailyStats || [];
            const dates = dailyStats.length > 0 
                ? dailyStats.map(item => item.date)
                : Array.from({ length: 7 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - i));
                    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
                });
            const messages = dailyStats.length > 0
                ? dailyStats.map(item => item.count)
                : Array(7).fill(0);
            
            this.messageTrendChart.setOption({
                backgroundColor: 'transparent',
                textStyle: { color: textColor },
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    borderColor: gridColor,
                    textStyle: { color: textColor }
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    data: dates,
                    axisLine: { lineStyle: { color: gridColor } },
                    axisLabel: { color: textColor }
                },
                yAxis: {
                    type: 'value',
                    axisLine: { lineStyle: { color: gridColor } },
                    axisLabel: { color: textColor },
                    splitLine: { lineStyle: { color: gridColor, opacity: 0.1 } }
                },
                series: [{
                    name: '消息数',
                    type: 'line',
                    smooth: true,
                    data: messages,
                    itemStyle: { color: '#4A90E2' },
                    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(74, 144, 226, 0.3)' }, { offset: 1, color: 'rgba(74, 144, 226, 0.05)' }] } }
                }]
            });
        }
        
        // 更新群组活跃度分布图（饼图）
        if (this.groupActivityChart) {
            const groupStats = this.admin.overview.groupStats || [];
            const data = groupStats.length > 0
                ? groupStats.slice(0, 10).map(item => ({
                    value: item.message_count || 0,
                    name: item.group_name || `群组 ${item.group_id}`
                }))
                : [{ value: 0, name: '暂无数据' }];
            
            this.groupActivityChart.setOption({
                backgroundColor: 'transparent',
                textStyle: { color: textColor },
                tooltip: {
                    trigger: 'item',
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    borderColor: gridColor,
                    textStyle: { color: textColor },
                    formatter: '{b}: {c} ({d}%)'
                },
                legend: {
                    orient: 'vertical',
                    left: 'left',
                    textStyle: { color: textColor }
                },
                series: [{
                    name: '消息数',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: isDark ? '#1F2937' : '#FFFFFF',
                        borderWidth: 2
                    },
                    label: {
                        show: false,
                        position: 'center'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: '16',
                            fontWeight: 'bold'
                        }
                    },
                    labelLine: {
                        show: false
                    },
                    data: data
                }]
            });
        }
        
        // 更新用户消息分布图（柱状图）
        if (this.userMessageChart) {
            // 使用真实数据
            const ranges = ['0-100', '101-500', '501-1000', '1001-5000', '5000+'];
            const counts = this.admin.overview.userMessageDistribution || [0, 0, 0, 0, 0];
            
            this.userMessageChart.setOption({
                backgroundColor: 'transparent',
                textStyle: { color: textColor },
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    borderColor: gridColor,
                    textStyle: { color: textColor }
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: ranges,
                    axisLine: { lineStyle: { color: gridColor } },
                    axisLabel: { color: textColor }
                },
                yAxis: {
                    type: 'value',
                    axisLine: { lineStyle: { color: gridColor } },
                    axisLabel: { color: textColor },
                    splitLine: { lineStyle: { color: gridColor, opacity: 0.1 } }
                },
                series: [{
                    name: '用户数',
                    type: 'bar',
                    data: counts,
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: '#4A90E2' },
                            { offset: 1, color: '#357ABD' }
                        ])
                    }
                }]
            });
        }
        
        // 更新新增用户趋势图
        if (this.newUserTrendChart) {
            // 使用 dailyStats 的日期
            const dailyStats = this.admin.overview.dailyStats || [];
            const dates = dailyStats.length > 0
                ? dailyStats.map(item => item.date)
                : Array.from({ length: 7 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - i));
                    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
                });
            
            // 使用真实数据
            const newUsers = this.admin.overview.dailyNewUsers || Array(7).fill(0);
            
            this.newUserTrendChart.setOption({
                backgroundColor: 'transparent',
                textStyle: { color: textColor },
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    borderColor: gridColor,
                    textStyle: { color: textColor }
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: dates,
                    axisLine: { lineStyle: { color: gridColor } },
                    axisLabel: { color: textColor }
                },
                yAxis: {
                    type: 'value',
                    axisLine: { lineStyle: { color: gridColor } },
                    axisLabel: { color: textColor },
                    splitLine: { lineStyle: { color: gridColor, opacity: 0.1 } }
                },
                series: [{
                    name: '新增用户',
                    type: 'bar',
                    data: newUsers,
                    itemStyle: { color: '#10B981' }
                }]
            });
        }
    }
    
    updateSettingsStats() {
        // 更新管理员和用户数量
        const adminCountEl = document.getElementById('adminCount');
        const settingsUserCountEl = document.getElementById('settingsUserCount');
        
        if (this.admin.users && this.admin.users.length > 0) {
            const adminCount = this.admin.users.filter(u => u.role === 'admin').length;
            const normalUserCount = this.admin.users.filter(u => u.role !== 'admin').length;
            
            if (adminCountEl) adminCountEl.textContent = adminCount;
            if (settingsUserCountEl) settingsUserCountEl.textContent = normalUserCount;
        }
        
        // 更新系统信息
        if (typeof process !== 'undefined' && process.versions) {
            const nodeVersionEl = document.getElementById('nodeVersion');
            if (nodeVersionEl) {
                nodeVersionEl.textContent = process.versions.node || '-';
            }
        }
    }
}

