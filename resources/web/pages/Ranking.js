/**
 * 排行榜页面 - 现代简约风格
 */
import { RankCard, Select } from '/assets/js/components/index.js';

export default class Ranking {
    constructor(app) {
        this.app = app;
        this.groups = [];
        this.currentGroupId = 'all';
        this.currentType = 'total';
        this.currentPage = 1;
        this.rankings = [];
    }
    
    
    
    async render() {
        return `
                            <div class="bg-white dark:bg-gray-900 min-h-full">
                <div class="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
                    <!-- 页面标题和筛选器 -->
                    <div class="mb-4 sm:mb-5 flex flex-col gap-3 sm:gap-4">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                            <div>
                                <h1 class="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">排行榜</h1>
                                <p class="text-xs text-gray-500 dark:text-gray-400">查看发言排行榜数据</p>
                            </div>
                            
                            <!-- 筛选器 -->
                            <div class="flex flex-col sm:flex-row gap-3 sm:items-end">
                                <div id="typeSelectContainer" class="w-full sm:w-auto sm:min-w-[140px]">
                                    ${Select.render({
                                        id: 'typeSelect',
                                        name: 'type',
                                        label: '排行榜类型',
                                        options: [
                                            { value: 'total', label: '总榜', selected: false },
                                            { value: 'daily', label: '日榜', selected: false },
                                            { value: 'weekly', label: '周榜', selected: false },
                                            { value: 'monthly', label: '月榜', selected: false },
                                            { value: 'yearly', label: '年榜', selected: false }
                                        ],
                                        className: 'select-custom'
                                    })}
                                </div>
                                <div class="w-full sm:w-auto sm:min-w-[220px]">
                                    ${Select.render({
                                        id: 'groupSelect',
                                        name: 'group',
                                        label: '选择群聊',
                                        options: [
                                            { value: 'all', label: '全部群聊', selected: true }
                                        ],
                                        className: 'select-custom'
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 排行榜内容 -->
                    <div id="rankingContent">
                        <!-- 内容将由 loadRanking 方法加载 -->
                    </div>
                </div>
            </div>
        `;
    }
    
    async mounted() {
        // 并行执行：加载群列表和设置事件监听器
        this.setupEventListeners();
        
        // 不等待群列表加载完成，先显示页面
        this.loadGroups().catch(err => {
            console.error('加载群列表失败:', err);
        });
        
        // 加载排行榜（不阻塞页面显示）
        this.loadRanking().catch(err => {
            console.error('加载排行榜失败:', err);
        });
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
            
            // 更新自定义下拉框
            if (window.updateCustomSelect) {
                window.updateCustomSelect(select);
            }
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
        
        content.innerHTML = Loading.render({ text: '加载中...', size: 'medium', className: 'py-20' });
        
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
                <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                    <div class="text-4xl mb-4 text-gray-400 dark:text-gray-500">❌</div>
                    <div class="text-gray-600 dark:text-gray-400 text-sm">加载失败: ${error.message}</div>
                </div>
            `;
            content.style.opacity = '1';
        }
    }
    
    renderRanking() {
        const content = document.getElementById('rankingContent');
        if (!content) return;
        
        if (this.rankings.length === 0) {
            content.innerHTML = EmptyState.renderCard({ 
                message: '暂无排行榜数据',
                icon: '<div class="mb-3 text-gray-400 dark:text-gray-500"><svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg></div>'
            });
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
            const avatarUrl = getAvatarUrl(item.user_id);
            const displayName = item.nickname || `用户${item.user_id}`;
            
            // 使用 RankCard 组件渲染移动端卡片
            html += RankCard.render({
                rank: rank,
                userId: item.user_id,
                userName: displayName,
                avatarUrl: avatarUrl,
                count: item.count || 0,
                words: item.period_words || 0,
                dataUserId: item.user_id
            });
        });
        
        html += `
            </div>
            
            <!-- 桌面端表格布局 -->
            <div class="hidden sm:block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                            <tr class="border-b border-gray-200 dark:border-gray-700">
                                <th class="px-4 py-2.5 text-left text-xs font-medium text-gray-600 dark:text-gray-400">排名</th>
                                <th class="px-4 py-2.5 text-left text-xs font-medium text-gray-600 dark:text-gray-400">用户</th>
                                <th class="px-4 py-2.5 text-right text-xs font-medium text-gray-600 dark:text-gray-400">发言数</th>
                                <th class="px-4 py-2.5 text-right text-xs font-medium text-gray-600 dark:text-gray-400">字数</th>
                                <th class="px-4 py-2.5 text-right text-xs font-medium text-gray-600 dark:text-gray-400">活跃天数</th>
                                <th class="px-4 py-2.5 text-right text-xs font-medium text-gray-600 dark:text-gray-400">连续天数</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
        `;
        
        // 桌面端表格行也使用 RankCard 组件
        this.rankings.forEach((item, index) => {
            const rank = index + 1;
            const avatarUrl = getAvatarUrl(item.user_id);
            const displayName = item.nickname || `用户${item.user_id}`;
            
            html += RankCard.renderTableRow({
                rank: rank,
                userId: item.user_id,
                userName: displayName,
                avatarUrl: avatarUrl,
                count: item.count || 0,
                words: item.period_words || 0,
                activeDays: item.active_days || 0,
                continuousDays: item.continuous_days || 0
            });
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
