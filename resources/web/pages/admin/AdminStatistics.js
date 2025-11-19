/**
 * 管理页面 - 数据统计模块
 */
export class AdminStatistics {
    constructor(admin) {
        this.admin = admin;
        this.statisticsData = null;
        this.timeRange = 'week'; // day, week, month, year, custom
        this.startDate = null;
        this.endDate = null;
        this.initialized = false;
        this.trendChart = null;
        this.userActivityChart = null;
        this._eventListenersBound = false;
        this.chartResizeHandler = null;
        this.themeObserver = null;
        this.initThemeObserver();
    }
    
    /**
     * 初始化主题变化监听器
     */
    initThemeObserver() {
        // 使用公共工具类创建主题监听器
        if (window.ChartThemeUtils) {
            this.themeObserver = window.ChartThemeUtils.createThemeObserver(() => {
                // 只有在图表已初始化且数据已加载时才重新生成图表
                if (this.statisticsData && 
                    this.trendChart && 
                    this.userActivityChart) {
                    
                    // 销毁所有图表实例
                    if (this.trendChart) {
                        try {
                            this.trendChart.dispose();
                        } catch (e) {}
                        this.trendChart = null;
                    }
                    if (this.userActivityChart) {
                        try {
                            this.userActivityChart.dispose();
                        } catch (e) {}
                        this.userActivityChart = null;
                    }
                    
                    // 重新初始化并更新图表
                    this.updateCharts();
                }
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
        if (this.trendChart) {
            this.trendChart.dispose();
            this.trendChart = null;
        }
        if (this.userActivityChart) {
            this.userActivityChart.dispose();
            this.userActivityChart = null;
        }
        
        // 移除窗口大小监听
        if (this.chartResizeHandler) {
            window.removeEventListener('resize', this.chartResizeHandler);
            this.chartResizeHandler = null;
        }
    }
    
    initEventListeners() {
        // 避免重复绑定事件
        if (this._eventListenersBound) return;
        this._eventListenersBound = true;
        
        // 时间范围选择器
        const timeRangeSelect = document.getElementById('statisticsTimeRange');
        const customDateRange = document.getElementById('customDateRange');
        const startDateInput = document.getElementById('statisticsStartDate');
        const endDateInput = document.getElementById('statisticsEndDate');
        
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', (e) => {
                this.timeRange = e.target.value;
                if (this.timeRange === 'custom') {
                    if (customDateRange) customDateRange.classList.remove('hidden');
                    // 设置默认日期范围（最近7天）
                    if (startDateInput && endDateInput) {
                        const end = new Date();
                        const start = new Date();
                        start.setDate(start.getDate() - 7);
                        startDateInput.value = start.toISOString().split('T')[0];
                        endDateInput.value = end.toISOString().split('T')[0];
                    }
                } else {
                    if (customDateRange) customDateRange.classList.add('hidden');
                    this.loadStatistics();
                }
            });
        }
        
        // 自定义日期范围
        if (startDateInput && endDateInput) {
            const handleDateChange = () => {
                if (startDateInput.value && endDateInput.value) {
                    this.startDate = startDateInput.value;
                    this.endDate = endDateInput.value;
                    this.loadStatistics();
                }
            };
            
            startDateInput.addEventListener('change', handleDateChange);
            endDateInput.addEventListener('change', handleDateChange);
        }
        
        // 导出按钮
        const exportBtn = document.getElementById('exportStatisticsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
    }
    
    async loadStatistics() {
        if (!this.admin.secretKey) {
            console.warn('秘钥未设置，无法加载统计数据');
            return;
        }
        
        const loadingEl = document.getElementById('statisticsLoading');
        const contentEl = document.getElementById('statisticsContent');
        
        if (loadingEl) loadingEl.classList.remove('hidden');
        if (contentEl) contentEl.classList.add('hidden');
        
        try {
            // 计算日期范围
            const { startDate, endDate } = this.calculateDateRange();
            
            // 调用 API 获取统计数据
            const response = await api.getAdminStatistics(
                this.admin.app.userId,
                this.admin.secretKey,
                startDate,
                endDate
            );
            
            if (response.success && response.data) {
                this.statisticsData = response.data;
                this.updateStatistics();
                // 确保图表在数据更新后重新渲染
                setTimeout(() => {
                    this.updateCharts();
                }, 200);
            } else {
                if (window.Toast) {
                    window.Toast.show(response.message || '加载统计数据失败', 'error');
                }
            }
        } catch (error) {
            console.error('加载统计数据失败:', error);
            if (window.Toast) {
                window.Toast.show('加载统计数据失败: ' + (error.message || '未知错误'), 'error');
            }
        } finally {
            if (loadingEl) loadingEl.classList.add('hidden');
            if (contentEl) contentEl.classList.remove('hidden');
        }
    }
    
    calculateDateRange() {
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        
        let start = new Date();
        
        if (this.timeRange === 'custom' && this.startDate && this.endDate) {
            start = new Date(this.startDate);
            end.setTime(new Date(this.endDate).getTime());
        } else if (this.timeRange === 'day') {
            start.setHours(0, 0, 0, 0);
        } else if (this.timeRange === 'week') {
            start.setDate(start.getDate() - 7);
            start.setHours(0, 0, 0, 0);
        } else if (this.timeRange === 'month') {
            start.setDate(start.getDate() - 30);
            start.setHours(0, 0, 0, 0);
        } else if (this.timeRange === 'year') {
            start.setFullYear(start.getFullYear() - 1);
            start.setHours(0, 0, 0, 0);
        }
        
        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        };
    }
    
    updateStatistics() {
        if (!this.statisticsData) return;
        
        // 更新统计卡片
        const totalMessagesEl = document.getElementById('statTotalMessages');
        const totalWordsEl = document.getElementById('statTotalWords');
        const activeUsersEl = document.getElementById('statActiveUsers');
        const activeGroupsEl = document.getElementById('statActiveGroups');
        
        // 使用全局 formatNumber 函数（如果存在）
        const formatNum = window.formatNumber || ((num) => {
            if (num >= 10000) return (num / 10000).toFixed(1) + '万';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
            return num.toString();
        });
        
        if (totalMessagesEl) {
            totalMessagesEl.textContent = formatNum(this.statisticsData.total_messages || 0);
        }
        if (totalWordsEl) {
            totalWordsEl.textContent = formatNum(this.statisticsData.total_words || 0);
        }
        if (activeUsersEl) {
            activeUsersEl.textContent = formatNum(this.statisticsData.total_active_users || 0);
        }
        if (activeGroupsEl) {
            activeGroupsEl.textContent = formatNum(this.statisticsData.total_active_groups || 0);
        }
        
        // 更新变化百分比
        const changes = this.statisticsData.changes || {};
        const messagesChangeEl = document.getElementById('statMessagesChange');
        const wordsChangeEl = document.getElementById('statWordsChange');
        const usersChangeEl = document.getElementById('statUsersChange');
        const groupsChangeEl = document.getElementById('statGroupsChange');
        
        const formatChange = (change) => {
            if (change === undefined || change === null) return '--';
            const sign = change >= 0 ? '+' : '';
            return `${sign}${change}%`;
        };
        
        if (messagesChangeEl) {
            messagesChangeEl.textContent = formatChange(changes.messages);
            messagesChangeEl.className = 'font-medium ' + (changes.messages >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400');
        }
        if (wordsChangeEl) {
            wordsChangeEl.textContent = formatChange(changes.words);
            wordsChangeEl.className = 'font-medium ' + (changes.words >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400');
        }
        if (usersChangeEl) {
            usersChangeEl.textContent = formatChange(changes.users);
            usersChangeEl.className = 'font-medium ' + (changes.users >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400');
        }
        if (groupsChangeEl) {
            groupsChangeEl.textContent = formatChange(changes.groups);
            groupsChangeEl.className = 'font-medium ' + (changes.groups >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400');
        }
        
        // 更新图表
        this.updateCharts();
        
        // 更新表格
        this.updateTable();
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
        const trendChartEl = document.getElementById('statisticsTrendChart');
        if (trendChartEl && !this.trendChart) {
            try {
                this.trendChart = echarts.init(trendChartEl);
            } catch (error) {
                console.error('初始化消息趋势图失败:', error);
            }
        }
        
        // 初始化用户活跃度图（如果不存在或已被销毁，则重新创建）
        const userActivityChartEl = document.getElementById('statisticsUserActivityChart');
        if (userActivityChartEl && !this.userActivityChart) {
            try {
                this.userActivityChart = echarts.init(userActivityChartEl);
            } catch (error) {
                console.error('初始化用户活跃度图失败:', error);
            }
        }
        
        // 监听窗口大小变化，自动调整图表大小
        if (!this.chartResizeHandler) {
            this.chartResizeHandler = () => {
                try {
                    if (this.trendChart) this.trendChart.resize();
                    if (this.userActivityChart) this.userActivityChart.resize();
                } catch (error) {
                    console.warn('调整图表大小失败:', error);
                }
            };
            window.addEventListener('resize', this.chartResizeHandler);
        }
    }
    
    /**
     * 获取当前主题颜色配置
     * @deprecated 使用 ChartThemeUtils.getThemeColors() 替代
     */
    getThemeColors() {
        // 使用公共工具类获取主题颜色
        if (window.ChartThemeUtils) {
            return window.ChartThemeUtils.getThemeColors();
        }
        
        // 降级方案：如果工具类未加载，使用本地实现
        const htmlElement = document.documentElement;
        const isDark = htmlElement.classList.contains('dark');
        return {
            isDark,
            textColor: isDark ? '#FFFFFF' : '#000000',
            gridColor: isDark ? '#4B5563' : '#E5E7EB',
            tooltipBg: isDark ? '#1F2937' : '#FFFFFF',
            borderColor: isDark ? '#1F2937' : '#FFFFFF'
        };
    }
    
    updateCharts() {
        if (!this.statisticsData) return;
        
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
        const trendChartEl = document.getElementById('statisticsTrendChart');
        const userActivityChartEl = document.getElementById('statisticsUserActivityChart');
        
        // 如果容器元素不存在，延迟重试
        if (!trendChartEl || !userActivityChartEl) {
            setTimeout(() => {
                this.updateCharts();
            }, 200);
            return;
        }
        
        // 初始化图表（如果还未初始化）
        this.initCharts();
        
        // 确保所有图表都已初始化
        if (!this.trendChart || !this.userActivityChart) {
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
        if (this.trendChart) {
            const trendData = this.statisticsData?.trend_data || [];
            const dates = trendData.length > 0 
                ? trendData.map(item => item.date)
                : [];
            const messages = trendData.length > 0
                ? trendData.map(item => item.messages)
                : [];
            
            const trendOption = {
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
            this.trendChart.setOption(trendOption, true);
        }
        
        // 更新用户活跃度图
        if (this.userActivityChart) {
            const userActivityData = this.statisticsData?.user_activity_data || [];
            const dates = userActivityData.length > 0
                ? userActivityData.map(item => item.date)
                : [];
            const users = userActivityData.length > 0
                ? userActivityData.map(item => item.users)
                : [];
            
            const userActivityOption = {
                backgroundColor: 'transparent',
                textStyle: { color: textColor },
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: tooltipBg,
                    borderColor: gridColor,
                    textStyle: { color: textColor },
                    formatter: (params) => {
                        const param = params[0];
                        return `<div style="color: ${textColor} !important;">${param.axisValue}<br/>活跃用户: <strong style="color: ${textColor} !important;">${formatNumber(param.value)}</strong></div>`;
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
                    name: '活跃用户',
                    type: 'line',
                    smooth: true,
                    data: users,
                    itemStyle: { color: '#10B981' },
                    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(16, 185, 129, 0.3)' }, { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }] } },
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
            this.userActivityChart.setOption(userActivityOption, true);
        }
    }
    
    updateTable() {
        const tableBody = document.getElementById('statisticsTableBody');
        if (!tableBody) return;
        
        const dailyData = this.statisticsData?.daily_data || [];
        
        if (dailyData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-4 sm:px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        暂无数据
                    </td>
                </tr>
            `;
            return;
        }
        
        // 格式化数字
        const formatNum = (num) => {
            if (num >= 10000) return (num / 10000).toFixed(1) + '万';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
            return num.toString();
        };
        
        // 格式化日期
        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('zh-CN', { 
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                weekday: 'short'
            });
        };
        
        tableBody.innerHTML = dailyData.map(item => `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td class="px-4 sm:px-6 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    ${formatDate(item.date)}
                </td>
                <td class="px-4 sm:px-6 py-3 text-sm text-gray-900 dark:text-gray-100">
                    ${formatNum(item.message_count)}
                </td>
                <td class="px-4 sm:px-6 py-3 text-sm text-gray-900 dark:text-gray-100">
                    ${formatNum(item.word_count)}
                </td>
                <td class="px-4 sm:px-6 py-3 text-sm text-gray-900 dark:text-gray-100">
                    ${item.active_users}
                </td>
                <td class="px-4 sm:px-6 py-3 text-sm text-gray-900 dark:text-gray-100">
                    ${item.active_groups}
                </td>
            </tr>
        `).join('');
    }
    
    exportData() {
        if (!this.statisticsData || !this.statisticsData.daily_data || this.statisticsData.daily_data.length === 0) {
            if (window.Toast) {
                window.Toast.show('暂无数据可导出', 'warning');
            }
            return;
        }
        
        try {
            // 准备CSV数据
            const headers = ['日期', '消息数', '字数', '活跃用户', '活跃群数'];
            const rows = this.statisticsData.daily_data.map(item => [
                item.date,
                item.message_count,
                item.word_count,
                item.active_users,
                item.active_groups
            ]);
        
            // 添加汇总行
            rows.push([
                '总计',
                this.statisticsData.total_messages,
                this.statisticsData.total_words,
                this.statisticsData.total_active_users,
                this.statisticsData.total_active_groups
            ]);
        
            // 转换为CSV格式
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');
        
            // 添加BOM以支持中文
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        
            // 创建下载链接
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
        
            // 生成文件名
            const { startDate, endDate } = this.calculateDateRange();
            const fileName = `统计数据_${startDate}_${endDate}.csv`;
            link.setAttribute('download', fileName);
        
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        
            if (window.Toast) {
                window.Toast.show('数据导出成功', 'success');
            }
        } catch (error) {
            console.error('导出数据失败:', error);
            if (window.Toast) {
                window.Toast.show('导出数据失败: ' + (error.message || '未知错误'), 'error');
            }
        }
    }
}

