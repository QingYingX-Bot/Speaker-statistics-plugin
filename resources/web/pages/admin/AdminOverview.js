/**
 * 管理页面 - 概览模块
 */
export class AdminOverview {
    constructor(admin) {
        this.admin = admin;
        this.messageTrendChart = null;
        this.groupActivityChart = null;
        this.messageDensityChart = null;
        this.groupGrowthChart = null;
        this.chartResizeHandler = null;
        this.themeObserver = null;
        this.initThemeObserver();
    }
    
    /**
     * 初始化主题变化监听器
     */
    initThemeObserver() {
        // 使用 MutationObserver 监听 document.documentElement 的 classList 变化
        if (typeof MutationObserver !== 'undefined') {
            let themeChangeTimer = null;
            this.themeObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        // 防抖处理，避免频繁触发
                        if (themeChangeTimer) {
                            clearTimeout(themeChangeTimer);
                        }
                        
                        themeChangeTimer = setTimeout(() => {
                            // 只有在图表已初始化且数据已加载时才重新生成图表
                            if (this.admin.overview && 
                                this.messageTrendChart && 
                                this.groupActivityChart && 
                                this.messageDensityChart && 
                                this.groupGrowthChart) {
                                
                                // 销毁所有图表实例
                                if (this.groupActivityChart) {
                                    try {
                                        this.groupActivityChart.dispose();
                                    } catch (e) {}
                                    this.groupActivityChart = null;
                                }
                                if (this.messageTrendChart) {
                                    try {
                                        this.messageTrendChart.dispose();
                                    } catch (e) {}
                                    this.messageTrendChart = null;
                                }
                                if (this.messageDensityChart) {
                                    try {
                                        this.messageDensityChart.dispose();
                                    } catch (e) {}
                                    this.messageDensityChart = null;
                                }
                                if (this.groupGrowthChart) {
                                    try {
                                        this.groupGrowthChart.dispose();
                                    } catch (e) {}
                                    this.groupGrowthChart = null;
                                }
                                
                                // 重新初始化并更新图表
                                this.updateCharts();
                            }
                        }, 150);
                    }
                });
            });
            
            // 开始观察
            this.themeObserver.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['class']
            });
        }
    }
    
    /**
     * 清理资源
     */
    destroy() {
        // 停止主题监听
        if (this.themeObserver) {
            this.themeObserver.disconnect();
            this.themeObserver = null;
        }
        
        // 销毁所有图表
        if (this.messageTrendChart) {
            this.messageTrendChart.dispose();
            this.messageTrendChart = null;
        }
        if (this.groupActivityChart) {
            this.groupActivityChart.dispose();
            this.groupActivityChart = null;
        }
        if (this.messageDensityChart) {
            this.messageDensityChart.dispose();
            this.messageDensityChart = null;
        }
        if (this.groupGrowthChart) {
            this.groupGrowthChart.dispose();
            this.groupGrowthChart = null;
        }
        
        // 移除窗口大小监听
        if (this.chartResizeHandler) {
            window.removeEventListener('resize', this.chartResizeHandler);
            this.chartResizeHandler = null;
        }
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
        
        // 初始化消息趋势图（如果不存在或已被销毁，则重新创建）
        const messageTrendEl = document.getElementById('messageTrendChart');
        if (messageTrendEl && !this.messageTrendChart) {
            try {
                this.messageTrendChart = echarts.init(messageTrendEl);
            } catch (error) {
                console.error('初始化消息趋势图失败:', error);
            }
        }
        
        // 初始化群组活跃度分布图（如果不存在或已被销毁，则重新创建）
        const groupActivityEl = document.getElementById('groupActivityChart');
        if (groupActivityEl && !this.groupActivityChart) {
            try {
                this.groupActivityChart = echarts.init(groupActivityEl);
            } catch (error) {
                console.error('初始化群组活跃度分布图失败:', error);
            }
        }
        
        // 初始化消息密度散点图（如果不存在或已被销毁，则重新创建）
        const messageDensityEl = document.getElementById('messageDensityChart');
        if (messageDensityEl && !this.messageDensityChart) {
            try {
                this.messageDensityChart = echarts.init(messageDensityEl);
            } catch (error) {
                console.error('初始化消息密度散点图失败:', error);
            }
        }
        
        // 初始化新增用户趋势图（如果不存在或已被销毁，则重新创建）
        const groupGrowthEl = document.getElementById('groupGrowthChart');
        if (groupGrowthEl && !this.groupGrowthChart) {
            try {
                this.groupGrowthChart = echarts.init(groupGrowthEl);
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
                    if (this.messageDensityChart) this.messageDensityChart.resize();
                    if (this.groupGrowthChart) this.groupGrowthChart.resize();
                } catch (error) {
                    console.warn('调整图表大小失败:', error);
                }
            };
            window.addEventListener('resize', this.chartResizeHandler);
        }
    }
    
    /**
     * 获取当前主题颜色配置
     */
    getThemeColors() {
        // 强制重新读取主题状态
        const htmlElement = document.documentElement;
        const isDark = htmlElement.classList.contains('dark');
        
        // 深色模式使用纯白色，浅色模式使用纯黑色
        return {
            isDark,
            textColor: isDark ? '#FFFFFF' : '#000000',
            gridColor: isDark ? '#4B5563' : '#E5E7EB',
            tooltipBg: isDark ? '#1F2937' : '#FFFFFF',
            borderColor: isDark ? '#1F2937' : '#FFFFFF'
        };
    }
    
    updateCharts() {
        if (!this.admin.overview) return;
        
        // 检查 echarts 是否已加载
        if (typeof echarts === 'undefined') {
            // 如果 ECharts 未加载，延迟重试
            setTimeout(() => {
                if (typeof echarts !== 'undefined') {
                    this.updateCharts();
                }
            }, 500);
            return;
        }
        
        // 检查图表容器元素是否存在
        const messageTrendEl = document.getElementById('messageTrendChart');
        const groupActivityEl = document.getElementById('groupActivityChart');
        const messageDensityEl = document.getElementById('messageDensityChart');
        const groupGrowthEl = document.getElementById('groupGrowthChart');
        
        // 如果容器元素不存在，延迟重试
        if (!messageTrendEl || !groupActivityEl || !messageDensityEl || !groupGrowthEl) {
            setTimeout(() => {
                this.updateCharts();
            }, 200);
            return;
        }
        
        // 初始化图表（如果还未初始化）
        this.initCharts();
        
        // 确保所有图表都已初始化
        if (!this.messageTrendChart || !this.groupActivityChart || 
            !this.messageDensityChart || !this.groupGrowthChart) {
            // 如果图表未初始化，延迟重试
            setTimeout(() => {
                this.updateCharts();
            }, 200);
            return;
        }
        
        // 获取当前主题颜色配置
        const theme = this.getThemeColors();
        const { textColor, gridColor, tooltipBg, borderColor, isDark } = theme;
        
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
            
            const messageTrendOption = {
                backgroundColor: 'transparent',
                textStyle: { color: textColor },
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: tooltipBg,
                    borderColor: gridColor,
                    textStyle: { color: textColor },
                    formatter: (params) => {
                        const param = params[0];
                        return `<div style="color: ${textColor} !important;">${param.axisValue}<br/>消息数: <strong style="color: ${textColor} !important;">${formatNumber(param.value)}</strong></div>`;
                    }
                },
                grid: {
                    left: '8%',
                    right: '4%',
                    bottom: '10%',
                    top: '10%',
                    containLabel: false
                },
                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    data: dates,
                    axisLine: { lineStyle: { color: gridColor } },
                    axisLabel: { 
                        color: textColor,
                        fontSize: 11
                    }
                },
                yAxis: {
                    type: 'value',
                    axisLine: { lineStyle: { color: gridColor } },
                    axisLabel: { 
                        color: textColor,
                        fontSize: 11
                    },
                    splitLine: { lineStyle: { color: gridColor, opacity: 0.1 } }
                },
                series: [{
                    name: '消息数',
                    type: 'line',
                    smooth: true,
                    data: messages,
                    itemStyle: { color: '#4A90E2' },
                    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(74, 144, 226, 0.3)' }, { offset: 1, color: 'rgba(74, 144, 226, 0.05)' }] } },
                    label: {
                        show: true,
                        position: 'top',
                        formatter: (params) => {
                            return formatNumber(params.value);
                        },
                        fontSize: 11,
                        color: textColor,
                        fontWeight: 500
                    }
                }]
            };
            
            // 使用 notMerge: true 强制完全替换配置
            this.messageTrendChart.setOption(messageTrendOption, true);
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
            
            // 计算总数和百分比
            const total = data.reduce((sum, item) => sum + item.value, 0);
            const dataWithPercent = data.map(item => ({
                ...item,
                percent: total > 0 ? ((item.value / total) * 100).toFixed(1) : 0
            }));
            
            // 定义更丰富的颜色方案
            const colors = [
                '#4A90E2', '#10B981', '#F59E0B', '#EF4444', '#06B6D4',
                '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1'
            ];
            
            const groupActivityOption = {
                backgroundColor: 'transparent',
                textStyle: { color: textColor },
                color: colors,
                tooltip: {
                    trigger: 'item',
                    backgroundColor: tooltipBg,
                    borderColor: gridColor,
                    borderWidth: 1,
                    padding: [12, 16],
                    textStyle: { 
                        color: textColor,
                        fontSize: 13
                    },
                    formatter: (params) => {
                        const value = params.value;
                        const percent = params.percent;
                        return `
                            <div style="font-weight: 600; margin-bottom: 4px; color: ${textColor} !important;">${params.name}</div>
                            <div style="color: ${params.color}; margin: 4px 0;">
                                消息数: <strong style="color: ${textColor} !important;">${formatNumber(value)}</strong>
                            </div>
                            <div style="color: ${textColor} !important;">
                                占比: <strong>${percent}%</strong>
                            </div>
                        `;
                    }
                },
                legend: {
                    show: false
                },
                series: [{
                    name: '消息数',
                    type: 'pie',
                    radius: window.innerWidth < 1024 ? ['35%', '65%'] : ['45%', '75%'],
                    center: ['50%', '50%'],
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderRadius: 8,
                        borderWidth: 0,
                        shadowBlur: 10,
                        shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)'
                    },
                    label: {
                        show: true, // 始终显示外部标签
                        position: 'outside',
                        formatter: (params) => {
                            if (params.percent < 3) return ''; // 小于3%的不显示标签
                            const name = params.name.length > 8 ? params.name.substring(0, 8) + '...' : params.name;
                            // 使用内联样式设置颜色
                            return `{name|${name}}\n{value|${formatNumber(params.value)}}\n{percent|${params.percent}%}`;
                        },
                        rich: {
                            name: {
                                fontSize: 11,
                                color: textColor,
                                fontWeight: 500,
                                lineHeight: 16
                            },
                            value: {
                                fontSize: 12,
                                color: textColor,
                                fontWeight: 600,
                                lineHeight: 16
                            },
                            percent: {
                                fontSize: 10,
                                color: textColor,
                                lineHeight: 16
                            }
                        }
                    },
                    labelLine: {
                        show: true, // 始终显示标签线
                        length: 15,
                        length2: 10,
                        lineStyle: {
                            color: isDark ? '#4B5563' : '#D1D5DB',
                            width: 1
                        }
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 20,
                            shadowOffsetX: 0,
                            shadowOffsetY: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.3)'
                        },
                        label: {
                            fontSize: 13,
                            fontWeight: 600,
                            color: textColor
                        }
                    },
                    data: dataWithPercent
                }, {
                    // 中心总计显示
                    name: '总计',
                    type: 'pie',
                    radius: ['0%', window.innerWidth < 1024 ? '25%' : '35%'],
                    center: ['50%', '50%'],
                    itemStyle: {
                        color: 'transparent'
                    },
                    label: {
                        show: true,
                        position: 'center',
                        formatter: () => {
                            return `{total|总计}\n{value|${formatNumber(total)}}\n{count|${data.length}个群组}`;
                        },
                        rich: {
                            total: {
                                fontSize: 14,
                                color: textColor,
                                fontWeight: 500,
                                lineHeight: 20
                            },
                            value: {
                                fontSize: 20,
                                color: textColor,
                                fontWeight: 700,
                                lineHeight: 28
                            },
                            count: {
                                fontSize: 12,
                                color: textColor,
                                lineHeight: 18
                            }
                        }
                    },
                    data: [{ value: total, name: '' }]
                }]
            };
            
            // 使用 notMerge: true 强制完全替换配置
            this.groupActivityChart.setOption(groupActivityOption, true);
        }
        
        // 更新消息密度散点图
        if (this.messageDensityChart) {
            const allGroupStats = this.admin.overview.allGroupStats || [];
            
            // 准备散点图数据：X轴=用户数，Y轴=消息数，气泡大小=平均消息/用户
            const scatterData = allGroupStats.map(group => {
                const avgMessagesPerUser = group.user_count > 0 
                    ? Math.round(group.message_count / group.user_count) 
                    : 0;
                return {
                    value: [group.user_count, group.message_count, avgMessagesPerUser],
                    name: group.group_name || `群组 ${group.group_id}`,
                    groupId: group.group_id,
                    userCount: group.user_count,
                    messageCount: group.message_count,
                    avgMessagesPerUser: avgMessagesPerUser
                };
            });
            
            // 计算气泡大小范围
            const maxAvg = Math.max(...scatterData.map(item => item.avgMessagesPerUser), 1);
            
            const messageDensityOption = {
                backgroundColor: 'transparent',
                textStyle: { color: textColor },
                tooltip: {
                    trigger: 'item',
                    formatter: (params) => {
                        const data = params.data;
                        return `
                            <div style="font-weight: 600; margin-bottom: 4px; color: ${textColor} !important;">${data.name}</div>
                            <div style="margin: 2px 0; color: ${textColor} !important;">用户数: <strong>${formatNumber(data.userCount)}</strong></div>
                            <div style="margin: 2px 0; color: ${textColor} !important;">消息数: <strong>${formatNumber(data.messageCount)}</strong></div>
                            <div style="margin: 2px 0; color: ${textColor} !important;">平均消息/用户: <strong>${formatNumber(data.avgMessagesPerUser)}</strong></div>
                        `;
                    },
                    backgroundColor: tooltipBg,
                    borderColor: gridColor,
                    textStyle: { color: textColor }
                },
                grid: {
                    left: window.innerWidth < 768 ? '12%' : '10%',
                    right: window.innerWidth < 768 ? '8%' : '8%',
                    bottom: window.innerWidth < 768 ? '15%' : '10%',
                    top: window.innerWidth < 768 ? '15%' : '10%',
                    containLabel: false
                },
                xAxis: {
                    type: 'value',
                    name: '用户数',
                    nameLocation: 'middle',
                    nameGap: window.innerWidth < 768 ? 25 : 30,
                    nameTextStyle: {
                        color: textColor,
                        fontSize: window.innerWidth < 768 ? 11 : 12
                    },
                    axisLine: { lineStyle: { color: gridColor } },
                    axisLabel: { 
                        color: textColor,
                        fontSize: window.innerWidth < 768 ? 10 : 11,
                        formatter: (value) => {
                            if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
                            return value;
                        }
                    },
                    splitLine: { 
                        lineStyle: { color: gridColor, opacity: 0.1 },
                        show: true
                    }
                },
                yAxis: {
                    type: 'value',
                    name: '消息数',
                    nameLocation: 'middle',
                    nameGap: window.innerWidth < 768 ? 40 : 50,
                    nameTextStyle: {
                        color: textColor,
                        fontSize: window.innerWidth < 768 ? 11 : 12
                    },
                    axisLine: { lineStyle: { color: gridColor } },
                    axisLabel: { 
                        color: textColor,
                        fontSize: window.innerWidth < 768 ? 10 : 11,
                        formatter: (value) => {
                            if (value >= 10000) return (value / 10000).toFixed(1) + '万';
                            if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
                            return value;
                        }
                    },
                    splitLine: { 
                        lineStyle: { color: gridColor, opacity: 0.1 },
                        show: true
                    }
                },
                series: [{
                    name: '群组',
                    type: 'scatter',
                    data: scatterData,
                    symbolSize: (data) => {
                        // 气泡大小根据平均消息/用户计算（20-60px）
                        const size = 20 + (data[2] / maxAvg) * 40;
                        return Math.max(20, Math.min(60, size));
                    },
                    itemStyle: {
                        color: (params) => {
                            // 根据平均消息/用户设置颜色
                            const avg = params.data.avgMessagesPerUser;
                            const ratio = avg / maxAvg;
                            if (ratio >= 0.7) return '#EF4444'; // 红色：高活跃度
                            if (ratio >= 0.4) return '#F59E0B'; // 橙色：中等活跃度
                            if (ratio >= 0.2) return '#10B981'; // 绿色：正常活跃度
                            return '#4A90E2'; // 蓝色：低活跃度
                        },
                        opacity: 0.7,
                        borderColor: isDark ? '#1F2937' : '#FFFFFF',
                        borderWidth: 1
                    },
                    emphasis: {
                        itemStyle: {
                            opacity: 1,
                            borderWidth: 2,
                            shadowBlur: 10,
                            shadowColor: 'rgba(0, 0, 0, 0.3)'
                        },
                        scale: true
                    },
                    label: {
                        show: false
                    }
                }]
            };
            
            // 使用 notMerge: true 强制完全替换配置
            this.messageDensityChart.setOption(messageDensityOption, true);
        }
        
        // 更新新增用户趋势图
        if (this.groupGrowthChart) {
            const newUserStats = this.admin.overview.newUserStats || [];
            const dates = newUserStats.map(item => item.date);
            const counts = newUserStats.map(item => item.count);
            
            // 计算最大值，用于Y轴范围（至少为1，如果有数据则使用实际最大值）
            const maxCount = counts.length > 0 && Math.max(...counts) > 0 
                ? Math.max(...counts) 
                : 1;
            
            const groupGrowthOption = {
                backgroundColor: 'transparent',
                textStyle: { color: textColor },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'line' },
                    backgroundColor: tooltipBg,
                    borderColor: gridColor,
                    textStyle: { color: textColor },
                    formatter: (params) => {
                        const param = params[0];
                        return `<div style="color: ${textColor} !important;">${param.axisValue}<br/>新增用户: <strong style="color: ${textColor} !important;">${formatNumber(param.value)}</strong></div>`;
                    }
                },
                grid: {
                    left: '8%',
                    right: '4%',
                    bottom: '10%',
                    top: '10%',
                    containLabel: false
                },
                xAxis: {
                    type: 'category',
                    data: dates,
                    axisLine: { lineStyle: { color: gridColor } },
                    axisLabel: { 
                        color: textColor,
                        fontSize: 11,
                        rotate: 0
                    },
                    boundaryGap: false
                },
                yAxis: {
                    type: 'value',
                    axisLine: { lineStyle: { color: gridColor } },
                    axisLabel: { 
                        color: textColor,
                        fontSize: 11,
                        formatter: (value) => {
                            return value;
                        }
                    },
                    splitLine: { 
                        lineStyle: { color: gridColor, opacity: 0.1 },
                        show: true
                    },
                    min: 0,
                    minInterval: 1,
                    // 如果最大值很小，设置合适的最大值
                    max: maxCount > 10 ? null : Math.max(maxCount + 2, 5)
                },
                series: [{
                    name: '新增用户',
                    type: 'line',
                    data: counts,
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: {
                        color: '#9333EA',
                        width: 2
                    },
                    itemStyle: {
                        color: '#9333EA',
                        borderColor: isDark ? '#1F2937' : '#FFFFFF',
                        borderWidth: 2
                    },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(147, 51, 234, 0.3)' },
                            { offset: 1, color: 'rgba(147, 51, 234, 0.05)' }
                        ])
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowColor: 'rgba(147, 51, 234, 0.5)',
                            scale: true
                        }
                    },
                    label: {
                        show: true,
                        position: 'top',
                        formatter: (params) => {
                            return formatNumber(params.value);
                        },
                        fontSize: 11,
                        color: textColor,
                        fontWeight: 500
                    }
                }]
            };
            
            // 使用 notMerge: true 强制完全替换配置
            this.groupGrowthChart.setOption(groupGrowthOption, true);
        }
    }
}

