/**
 * 管理页面 - 群组管理模块
 */
export class AdminGroups {
    constructor(admin) {
        this.admin = admin;
    }
    
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
                this.updateGroupsList();
            }
        } catch (error) {
            console.error('加载群列表失败:', error);
            Toast.show('加载群列表失败: ' + (error.message || '未知错误'), 'error');
        } finally {
            this.admin.loading.groups = false;
        }
    }
    
    updateGroupsList() {
        const groupsListEl = document.getElementById('groupsList');
        const groupListCountEl = document.getElementById('groupListCount');
        if (!groupsListEl) return;
        
        let filteredGroups = [...this.admin.groups];
        
        if (this.admin.groupSearchQuery) {
            filteredGroups = filteredGroups.filter(group => {
                const name = (group.group_name || `群${group.group_id}`).toLowerCase();
                const id = String(group.group_id).toLowerCase();
                return name.includes(this.admin.groupSearchQuery) || id.includes(this.admin.groupSearchQuery);
            });
        }
        
        if (this.admin.groupSortBy === 'name') {
            filteredGroups.sort((a, b) => {
                const nameA = (a.group_name || `群${a.group_id}`).toLowerCase();
                const nameB = (b.group_name || `群${b.group_id}`).toLowerCase();
                return nameA.localeCompare(nameB);
            });
        }
        
        if (groupListCountEl) {
            groupListCountEl.textContent = `${filteredGroups.length}`;
        }
        
        if (filteredGroups.length === 0) {
            groupsListEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-12">暂无匹配的群聊</p>';
            return;
        }
        
        groupsListEl.innerHTML = filteredGroups.map(group => {
            const isSelected = this.admin.selectedGroupId === group.group_id;
            return `
                <div 
                    class="group-card p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                            ? 'border-primary bg-primary/5 dark:bg-primary/10 dark:border-primary' 
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                    }"
                    data-group-id="${group.group_id}"
                >
                    <div class="flex items-center justify-between">
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">${group.group_name || `群${group.group_id}`}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">${group.group_id}</p>
                        </div>
                        ${isSelected ? `
                            <svg class="w-4 h-4 text-primary dark:text-primary flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        groupsListEl.querySelectorAll('.group-card').forEach(card => {
            card.addEventListener('click', () => {
                const groupId = card.dataset.groupId;
                this.selectGroup(groupId);
            });
        });
    }
    
    async selectGroup(groupId) {
        if (!groupId || !this.admin.secretKey) return;
        
        this.admin.selectedGroupId = groupId;
        this.updateGroupsList();
        await this.loadGroupStats(groupId);
    }
    
    async loadGroupStats(groupId) {
        if (!this.admin.secretKey) return;
        
        const detailContent = document.getElementById('groupDetailContent');
        const emptyState = document.querySelector('#groupDetailPanel > .text-center');
        
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
    
    updateGroupDetail() {
        const detailPanel = document.getElementById('groupDetailPanel');
        const detailContent = document.getElementById('groupDetailContent');
        const emptyState = detailPanel?.querySelector('.text-center');
        
        if (!this.admin.selectedGroupStats) {
            if (detailContent) detailContent.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }
        
        const stats = this.admin.selectedGroupStats;
        
        if (detailContent) detailContent.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
        
        const titleEl = document.getElementById('groupDetailTitle');
        const groupIdEl = document.getElementById('groupDetailId');
        const userCountEl = document.getElementById('groupUserCount');
        const messageCountEl = document.getElementById('groupMessageCount');
        const wordCountEl = document.getElementById('groupWordCount');
        
        if (titleEl) titleEl.textContent = stats.group_name || `群${stats.group_id}`;
        if (groupIdEl) groupIdEl.textContent = `群号: ${stats.group_id}`;
        if (userCountEl) userCountEl.textContent = formatNumber(stats.user_count || 0);
        if (messageCountEl) messageCountEl.textContent = formatNumber(stats.total_messages || 0);
        if (wordCountEl) wordCountEl.textContent = formatNumber(stats.total_words || 0);
    }
    
    async loadGroupRanking(groupId) {
        if (!groupId || !this.admin.secretKey) return;
        
        const rankingListEl = document.getElementById('groupRankingList');
        if (!rankingListEl) return;
        
        rankingListEl.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>加载中...</p></div>';
        
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
            
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            const rankBg = index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
            
            return `
                <div class="flex items-center justify-between p-3 rounded-lg border ${rankBg} hover:shadow-sm transition-shadow">
                    <div class="flex items-center space-x-3 flex-1 min-w-0">
                        <div class="flex-shrink-0 w-8 text-center">
                            <span class="text-sm font-bold ${index < 3 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'}">${medal || `#${index + 1}`}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-gray-900 dark:text-gray-100 truncate">${nickname}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400 font-mono">${userId}</p>
                        </div>
                    </div>
                    <div class="flex-shrink-0 text-right ml-4">
                        <p class="text-sm font-bold text-gray-900 dark:text-gray-100">${formatNumber(messageCount)}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">消息</p>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    async refreshGroupStats() {
        if (!this.admin.selectedGroupId) {
            Toast.show('请先选择一个群聊', 'error');
            return;
        }
        
        await this.loadGroupStats(this.admin.selectedGroupId);
        Toast.show('统计数据已刷新', 'success');
    }
    
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
                    <p class="text-gray-700 dark:text-gray-300">确定要清除群 <strong class="text-red-600 dark:text-red-400">${groupName}</strong> 的所有统计数据吗？</p>
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
            } else {
                Toast.show(response.message || '清除失败', 'error');
            }
        } catch (error) {
            console.error('清除群统计失败:', error);
            Toast.show('清除失败: ' + (error.message || '未知错误'), 'error');
        }
    }
}

