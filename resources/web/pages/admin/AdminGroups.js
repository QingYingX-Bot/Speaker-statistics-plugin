/**
 * 管理页面 - 群组管理模块（重写版）
 * 支持PC端和移动端响应式设计
 */
export class AdminGroups {
    constructor(admin) {
        this.admin = admin;
        this.filteredGroups = [];
        this.currentPage = 1;
        this.pageSize = 50;
        this.isMobileDetailOpen = false;
    }
    
    /**
     * 加载群列表
     */
    async loadGroups() {
        if (!this.admin.secretKey) {
            console.warn('秘钥未设置，无法加载群列表');
            return;
        }
        try {
            this.admin.loading.groups = true;
            const response = await api.getAdminGroups(this.admin.app.userId, this.admin.secretKey);
            if (response.success && response.data) {
                this.admin.groups = response.data;
                this.applyFilters();
            } else {
                Toast.show('加载群列表失败', 'error');
            }
        } catch (error) {
            console.error('加载群列表失败:', error);
            Toast.show('加载群列表失败: ' + (error.message || '未知错误'), 'error');
        } finally {
            this.admin.loading.groups = false;
        }
    }
    
    /**
     * 应用搜索筛选
     */
    applyFilters() {
        let filtered = [...this.admin.groups];
        
        // 搜索筛选
        if (this.admin.groupSearchQuery) {
            const query = this.admin.groupSearchQuery.toLowerCase();
            filtered = filtered.filter(group => {
                const name = (group.group_name || `群${group.group_id}`).toLowerCase();
                const id = String(group.group_id).toLowerCase();
                return name.includes(query) || id.includes(query);
            });
        }
        
        // 默认按名称排序
        filtered.sort((a, b) => {
                const nameA = (a.group_name || `群${a.group_id}`).toLowerCase();
                const nameB = (b.group_name || `群${b.group_id}`).toLowerCase();
                return nameA.localeCompare(nameB);
            });
        
        this.filteredGroups = filtered;
        this.updateGroupsList();
    }
    
    /**
     * 更新群列表显示
     */
    updateGroupsList() {
        const groupsListEl = document.getElementById('groupsList');
        const groupListCountEl = document.getElementById('groupListCount');
        if (!groupsListEl) return;
        
        // 更新计数
        if (groupListCountEl) {
            const countSpan = groupListCountEl.querySelector('span');
            if (countSpan) {
                countSpan.textContent = `${this.filteredGroups.length}`;
        }
        }
        
        // 空状态
        if (this.filteredGroups.length === 0) {
            groupsListEl.innerHTML = `
                <div class="text-center py-12 px-4">
                    <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <svg class="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                        </svg>
                    </div>
                    <p class="text-gray-500 dark:text-gray-400 text-sm">暂无匹配的群聊</p>
                </div>
            `;
            return;
        }
        
        // 渲染群列表
        const isMobile = window.innerWidth < 1024;
        groupsListEl.innerHTML = this.filteredGroups.map(group => {
            // 移动端不显示选中状态
            const isSelected = !isMobile && this.admin.selectedGroupId === group.group_id;
            const groupName = group.group_name || `群${group.group_id}`;
            
            return `
                <div 
                    class="group-list-item ${isSelected ? 'group-list-item-selected' : ''}"
                    data-group-id="${group.group_id}"
                >
                    <div class="group-list-item-content">
                        <div class="group-list-item-icon">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                            </svg>
                        </div>
                        <div class="group-list-item-info">
                            <div class="group-list-item-name">${this.escapeHtml(groupName)}</div>
                            <div class="group-list-item-id">${group.group_id}</div>
                        </div>
                        ${isSelected ? `
                            <div class="group-list-item-check">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                            </div>
                        ` : `
                            <div class="group-list-item-arrow">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </div>
                        `}
                    </div>
                </div>
            `;
        }).join('');
        
        // 绑定点击事件
        groupsListEl.querySelectorAll('.group-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const groupId = item.dataset.groupId;
                this.selectGroup(groupId);
            });
        });
    }
    
    /**
     * 选择群组
     */
    async selectGroup(groupId) {
        if (!groupId || !this.admin.secretKey) return;
        
        const isMobile = window.innerWidth < 1024;
        
        // 保存选中状态（移动端和PC端都需要，用于刷新功能）
        this.admin.selectedGroupId = groupId;
        
        if (isMobile) {
            // 移动端打开详情面板
            this.openMobileDetail();
            await this.loadGroupStats(groupId);
        } else {
            // PC端更新列表显示选中状态
        this.updateGroupsList();
        await this.loadGroupStats(groupId);
    }
    }
    
    /**
     * 打开移动端详情
     */
    openMobileDetail() {
        const detailPanel = document.getElementById('groupDetailPanel');
        if (detailPanel && window.innerWidth < 1024) {
            detailPanel.classList.remove('hidden');
            this.isMobileDetailOpen = true;
            // 防止背景滚动
            document.body.style.overflow = 'hidden';
        }
    }
    
    /**
     * 关闭移动端详情
     */
    closeMobileDetail() {
        const detailPanel = document.getElementById('groupDetailPanel');
        if (detailPanel && window.innerWidth < 1024) {
            detailPanel.classList.add('hidden');
            this.isMobileDetailOpen = false;
            // 恢复背景滚动
            document.body.style.overflow = '';
            // 清除选中状态
            this.admin.selectedGroupId = null;
            this.admin.selectedGroupStats = null;
            this.updateGroupsList();
            this.updateGroupDetail();
        }
    }
    
    /**
     * 初始化移动端布局
     */
    initMobileLayout() {
        if (window.innerWidth < 1024) {
            const detailPanel = document.getElementById('groupDetailPanel');
            if (detailPanel && !this.admin.selectedGroupId) {
                detailPanel.classList.add('hidden');
            }
        }
    }
    
    /**
     * 加载群统计信息
     */
    async loadGroupStats(groupId) {
        if (!this.admin.secretKey) return;
        
        const detailContent = document.getElementById('groupDetailContent');
        const emptyState = document.querySelector('#groupDetailPanel .empty-state');
        
        if (detailContent) detailContent.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
        
        try {
            const response = await api.getGroupStats(groupId);
            if (response.success && response.data) {
                this.admin.selectedGroupStats = response.data;
                this.updateGroupDetail();
                await this.loadGroupRanking(groupId);
            } else {
                Toast.show('加载群统计失败', 'error');
            }
        } catch (error) {
            console.error('加载群统计失败:', error);
            Toast.show('加载群统计失败: ' + (error.message || '未知错误'), 'error');
        }
    }
    
    /**
     * 更新群详情显示
     */
    updateGroupDetail() {
        const detailPanel = document.getElementById('groupDetailPanel');
        const detailContent = document.getElementById('groupDetailContent');
        const emptyState = detailPanel?.querySelector('.empty-state');
        
        if (!this.admin.selectedGroupStats) {
            if (detailContent) detailContent.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }
        
        const stats = this.admin.selectedGroupStats;
        
        if (detailContent) detailContent.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
        
        // 更新标题和群ID
        const titleEl = document.getElementById('groupDetailTitle');
        const groupIdEl = document.getElementById('groupDetailId');
        
        if (titleEl) titleEl.textContent = stats.group_name || `群${stats.group_id}`;
        if (groupIdEl) {
            const groupIdText = stats.group_id || this.admin.selectedGroupId || '-';
            groupIdEl.textContent = groupIdText;
        }
        
        // 更新统计概览
        this.updateStatsOverview(stats);
    }
    
    /**
     * 更新统计概览卡片
     */
    updateStatsOverview(stats) {
        const statsGrid = document.getElementById('groupStatsGrid');
        if (!statsGrid) return;
        
        const statsData = [
            {
                id: 'userCount',
                label: '群成员',
                value: formatNumber(stats.user_count || 0),
                type: 'blue',
                icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>`
            },
            {
                id: 'messageCount',
                label: '总消息数',
                value: formatNumber(stats.total_messages || 0),
                type: 'purple',
                icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>`
            },
            {
                id: 'wordCount',
                label: '总字数',
                value: formatNumber(stats.total_words || 0),
                type: 'green',
                icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>`
            }
        ];
        
        statsGrid.innerHTML = statsData.map(stat => `
            <div class="stat-card stat-card-${stat.type}" data-stat-id="${stat.id}">
                <div class="stat-card-header">
                    <div class="stat-card-icon stat-card-icon-${stat.type}">
                        ${stat.icon}
                    </div>
                    <span class="stat-card-label">${this.escapeHtml(stat.label)}</span>
                </div>
                <div class="stat-card-value">${this.escapeHtml(stat.value)}</div>
            </div>
        `).join('');
    }
    
    /**
     * 加载群内排名
     */
    async loadGroupRanking(groupId) {
        if (!groupId || !this.admin.secretKey) return;
        
        const rankingListEl = document.getElementById('groupRankingList');
        if (!rankingListEl) return;
        
        rankingListEl.innerHTML = Loading.render({ text: '加载中...', size: 'small', className: 'py-8' });
        
        try {
            const response = await api.getRanking('total', groupId, { limit: 10, page: 1 });
            
            if (response.success && response.data) {
                this.admin.groupRanking = response.data;
                this.updateGroupRanking();
            } else {
                rankingListEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">暂无排名数据</p>';
            }
        } catch (error) {
            console.error('加载群排名失败:', error);
            rankingListEl.innerHTML = '<p class="text-red-500 dark:text-red-400 text-center py-8">加载失败</p>';
        }
    }
    
    /**
     * 更新排名显示
     */
    updateGroupRanking() {
        const rankingListEl = document.getElementById('groupRankingList');
        if (!rankingListEl || !this.admin.groupRanking) return;
        
        if (this.admin.groupRanking.length === 0) {
            rankingListEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">暂无排名数据</p>';
            return;
        }
        
        rankingListEl.innerHTML = this.admin.groupRanking.map((user, index) => {
            const messageCount = parseInt(user.count || user.total_count || 0, 10);
            const userId = user.user_id || user.userId;
            const nickname = user.nickname || userId;
            
            // 排名样式
            let rankBadgeClass = '';
            let rankBadgeContent = '';
            let cardClass = '';
            
            if (index === 0) {
                rankBadgeClass = 'ranking-badge ranking-badge-gold';
                rankBadgeContent = '🥇';
                cardClass = 'ranking-card ranking-card-gold';
            } else if (index === 1) {
                rankBadgeClass = 'ranking-badge ranking-badge-silver';
                rankBadgeContent = '🥈';
                cardClass = 'ranking-card ranking-card-silver';
            } else if (index === 2) {
                rankBadgeClass = 'ranking-badge ranking-badge-bronze';
                rankBadgeContent = '🥉';
                cardClass = 'ranking-card ranking-card-bronze';
            } else {
                rankBadgeClass = 'ranking-badge ranking-badge-default';
                rankBadgeContent = `#${index + 1}`;
                cardClass = 'ranking-card ranking-card-default';
            }
            
            return `
                <div class="${cardClass}">
                    <div class="ranking-badge-container">
                        <div class="${rankBadgeClass}">
                            ${rankBadgeContent}
                        </div>
                    </div>
                    <div class="ranking-content">
                        <div class="ranking-user-info">
                            <div class="ranking-user-name">${this.escapeHtml(nickname)}</div>
                            <div class="ranking-user-id">${userId}</div>
                        </div>
                        <div class="ranking-stats">
                            <div class="ranking-message-count">${formatNumber(messageCount)}</div>
                            <div class="ranking-message-label">条消息</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * 刷新群统计
     */
    async refreshGroupStats() {
        // 获取当前群ID（优先从selectedGroupId，如果没有则从selectedGroupStats中获取）
        let groupId = this.admin.selectedGroupId;
        if (!groupId && this.admin.selectedGroupStats) {
            groupId = this.admin.selectedGroupStats.group_id;
        }
        
        if (!groupId) {
            Toast.show('请先选择一个群聊', 'error');
            return;
        }
        
        if (!this.admin.secretKey) {
            Toast.show('请先验证权限', 'error');
            return;
        }
        
        try {
            // 显示加载状态
            const statsGrid = document.getElementById('groupStatsGrid');
            if (statsGrid) {
                statsGrid.innerHTML = `
                    <div class="col-span-3 flex items-center justify-center py-8">
                        <div class="text-sm text-gray-500 dark:text-gray-400">刷新中...</div>
                    </div>
                `;
            }
            
            // 重新加载统计数据
            const response = await api.getGroupStats(groupId);
            if (response.success && response.data) {
                // 确保selectedGroupId被设置
                this.admin.selectedGroupId = groupId;
                this.admin.selectedGroupStats = response.data;
                this.updateGroupDetail();
                
                // 同时刷新排名数据
                await this.loadGroupRanking(groupId);
                
        Toast.show('统计数据已刷新', 'success');
            } else {
                Toast.show('刷新失败: ' + (response.message || '未知错误'), 'error');
                // 恢复之前的显示
                if (this.admin.selectedGroupStats) {
                    this.updateGroupDetail();
                }
            }
        } catch (error) {
            console.error('刷新群统计失败:', error);
            Toast.show('刷新失败: ' + (error.message || '未知错误'), 'error');
            // 恢复之前的显示
            if (this.admin.selectedGroupStats) {
                this.updateGroupDetail();
            }
        }
    }
    
    /**
     * 清除群统计
     */
    async clearGroupStats() {
        if (!this.admin.selectedGroupId) {
            Toast.show('请先选择一个群聊', 'error');
            return;
        }
        
        if (!this.admin.secretKey) {
            Toast.show('请先验证权限', 'error');
            return;
        }
        
        const groupName = this.admin.selectedGroupStats?.group_name || this.admin.selectedGroupId;
        
        const confirmed = await new Promise((resolve) => {
            window.Modal.show('确认清除', `
                <div class="space-y-3">
                    <p class="text-gray-700 dark:text-gray-300">确定要清除群 <strong class="text-red-600 dark:text-red-400">${this.escapeHtml(groupName)}</strong> 的所有统计数据吗？</p>
                    <p class="text-sm text-red-600 dark:text-red-400 font-medium">⚠️ 此操作不可恢复！</p>
                </div>
            `, `
                <button class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium" id="confirmClearBtn">确认清除</button>
                <button class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium" onclick="window.Modal.hide()">取消</button>
            `);
            
            setTimeout(() => {
                const confirmBtn = document.getElementById('confirmClearBtn');
                if (confirmBtn) {
                    confirmBtn.addEventListener('click', () => {
                        window.Modal.hide();
                        resolve(true);
                    });
                }
            }, 100);
        });
        
        if (!confirmed) return;
        
        try {
            const response = await api.clearGroupStats(this.admin.selectedGroupId, this.admin.app.userId, this.admin.secretKey);
            if (response.success) {
                Toast.show('清除成功', 'success');
                this.admin.selectedGroupId = null;
                this.admin.selectedGroupStats = null;
                await this.admin.loadData();
                this.updateGroupsList();
                this.updateGroupDetail();
                // 移动端关闭详情
                if (this.isMobileDetailOpen) {
                    this.closeMobileDetail();
                }
            } else {
                Toast.show(response.message || '清除失败', 'error');
            }
        } catch (error) {
            console.error('清除群统计失败:', error);
            Toast.show('清除失败: ' + (error.message || '未知错误'), 'error');
        }
    }
    
    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 初始化事件监听
     */
    initEventListeners() {
        // 搜索输入
        const searchInput = document.getElementById('groupSearchInput');
        const clearBtn = document.getElementById('groupSearchClearBtn');
        
        if (searchInput) {
            // 输入事件
            searchInput.addEventListener('input', (e) => {
                const value = e.target.value;
                this.admin.groupSearchQuery = value.toLowerCase();
                this.applyFilters();
                
                // 显示/隐藏清除按钮
                if (clearBtn) {
                    if (value) {
                        clearBtn.classList.remove('hidden');
                        clearBtn.style.display = 'block';
                    } else {
                        clearBtn.classList.add('hidden');
                        clearBtn.style.display = 'none';
                    }
                }
            });
            
            // 清除按钮
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    searchInput.value = '';
                    this.admin.groupSearchQuery = '';
                    this.applyFilters();
                    clearBtn.classList.add('hidden');
                    clearBtn.style.display = 'none';
                    searchInput.focus();
                });
            }
        }
        
        // 刷新按钮
        const refreshBtn = document.getElementById('refreshGroupStatsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshGroupStats();
            });
        }
        
        // 清除统计按钮
        const clearStatsBtn = document.getElementById('clearGroupStatsBtn');
        if (clearStatsBtn) {
            clearStatsBtn.addEventListener('click', () => {
                this.clearGroupStats();
            });
        }
        
        // 移动端返回按钮
        const backBtn = document.getElementById('groupDetailBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.closeMobileDetail();
            });
        }
        
        // 窗口大小变化时调整布局
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (window.innerWidth >= 1024) {
                    // 桌面端：恢复背景滚动，移除隐藏类
                    document.body.style.overflow = '';
                    const detailPanel = document.getElementById('groupDetailPanel');
                    if (detailPanel) {
                        detailPanel.classList.remove('hidden');
                    }
                    this.isMobileDetailOpen = false;
                } else {
                    // 移动端：清除选中状态，初始化布局
                    this.admin.selectedGroupId = null;
                    this.updateGroupsList();
                    this.initMobileLayout();
                }
            }, 100);
        });
        
        // 初始化移动端布局
        this.initMobileLayout();
    }
}
