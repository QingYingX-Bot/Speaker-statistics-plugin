/**
 * 用户统计页面
 */
export default class UserStats {
    constructor(app) {
        this.app = app;
        this.groups = [];
        this.currentGroupId = null;
        this.userData = null;
    }
    
    async render() {
        return `
            <div class="user-stats-page">
                <div class="page-header">
                    <h1 class="flex items-center gap-2">
                        <svg class="w-6 h-6 text-primary dark:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                        </svg>
                        我的统计
                    </h1>
                </div>
                
                <div class="card" style="margin-bottom: 20px;">
                    <div class="input-group">
                        <label class="input-label">选择群聊</label>
                        <select class="select" id="groupSelect">
                            <option value="">加载中...</option>
                        </select>
                    </div>
                </div>
                
                <div id="statsContent">
                    ${Loading.render({ text: '加载中...', size: 'medium', className: 'py-20' })}
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
            select.innerHTML = '<option value="">请选择群聊</option>';
            
            this.groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.group_id;
                option.textContent = group.group_name || group.group_id;
                select.appendChild(option);
            });
            
            if (this.groups.length > 0) {
                this.currentGroupId = this.groups[0].group_id;
                select.value = this.currentGroupId;
                await this.loadStats(this.currentGroupId);
            }
        } catch (error) {
            console.error('加载群列表失败:', error);
            Toast.show('加载群列表失败', 'error');
        }
    }
    
    setupEventListeners() {
        const select = document.getElementById('groupSelect');
        select.addEventListener('change', async (e) => {
            this.currentGroupId = e.target.value;
            if (this.currentGroupId) {
                await this.loadStats(this.currentGroupId);
            }
        });
    }
    
    async loadStats(groupId) {
        const content = document.getElementById('statsContent');
        content.innerHTML = Loading.render({ text: '加载中...', size: 'medium', className: 'py-20' });
        
        try {
            const response = await api.getUserStats(this.app.userId, groupId);
            this.userData = response.data;
            this.renderStats();
        } catch (error) {
            console.error('加载统计数据失败:', error);
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <div class="empty-state-text">加载失败: ${error.message}</div>
                </div>
            `;
        }
    }
    
    renderStats() {
        const data = this.userData;
        if (!data) return;
        
        const content = document.getElementById('statsContent');
        
        // 计算今日数据
        const today = new Date().toISOString().split('T')[0];
        const todayStats = data.daily_stats?.[today] || { count: 0, words: 0 };
        
        content.innerHTML = `
            <div class="grid-layout grid-auto" style="margin-bottom: 30px;">
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(data.total || 0)}</div>
                    <div class="stat-label">总发言数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(data.total_number_of_words || 0)}</div>
                    <div class="stat-label">总字数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(data.active_days || 0)}</div>
                    <div class="stat-label">活跃天数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(data.continuous_days || 0)}</div>
                    <div class="stat-label">连续天数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(todayStats.count || 0)}</div>
                    <div class="stat-label">今日发言</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(todayStats.words || 0)}</div>
                    <div class="stat-label">今日字数</div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">详细信息</h2>
                </div>
                <div class="card-body">
                    <table class="table">
                        <tr>
                            <th>用户昵称</th>
                            <td>${data.nickname || '-'}</td>
                        </tr>
                        <tr>
                            <th>排名</th>
                            <td>${data.rank ? `第 ${data.rank} 名` : '-'}</td>
                        </tr>
                        <tr>
                            <th>最后发言时间</th>
                            <td>${formatDate(data.last_speaking_time)}</td>
                        </tr>
                        <tr>
                            <th>平均每日发言</th>
                            <td>${data.active_days > 0 ? formatNumber(Math.round((data.total || 0) / data.active_days)) : 0} 条</td>
                        </tr>
                    </table>
                </div>
            </div>
        `;
    }
}
