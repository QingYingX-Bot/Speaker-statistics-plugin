/**
 * 管理页面 - 用户管理模块
 */
export class AdminUsers {
    constructor(admin) {
        this.admin = admin;
    }
    
    async loadUsers() {
        if (!this.admin.secretKey) {
            console.warn('秘钥未设置，无法加载用户列表');
            return;
        }
        try {
            this.admin.loading.users = true;
            const response = await api.getAdminUsers(this.admin.app.userId, this.admin.secretKey);
            if (response.success && response.data) {
                this.admin.users = response.data;
                this.updateUsersList();
            }
        } catch (error) {
            console.error('加载用户列表失败:', error);
            Toast.show('加载用户列表失败: ' + (error.message || '未知错误'), 'error');
        } finally {
            this.admin.loading.users = false;
        }
    }
    
    updateUsersList() {
        const usersListEl = document.getElementById('usersList');
        const userCountEl = document.getElementById('userCount');
        
        let filteredUsers = [...this.admin.users];
        
        if (this.admin.userSearchQuery) {
            filteredUsers = filteredUsers.filter(user => {
                const name = (user.username || user.userId || '').toLowerCase();
                const id = String(user.userId || '').toLowerCase();
                const role = (user.role || '').toLowerCase();
                return name.includes(this.admin.userSearchQuery) || id.includes(this.admin.userSearchQuery) || role.includes(this.admin.userSearchQuery);
            });
        }
        
        if (this.admin.userSortBy === 'name') {
            filteredUsers.sort((a, b) => {
                const nameA = (a.username || a.userId || '').toLowerCase();
                const nameB = (b.username || b.userId || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
        } else if (this.admin.userSortBy === 'role') {
            filteredUsers.sort((a, b) => {
                const roleA = a.role === 'admin' ? 0 : 1;
                const roleB = b.role === 'admin' ? 0 : 1;
                return roleA - roleB;
            });
        }
        
        if (userCountEl) {
            userCountEl.textContent = `${filteredUsers.length}`;
        }
        
        if (usersListEl) {
            if (filteredUsers.length === 0) {
                usersListEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-12">暂无匹配的用户</p>';
            } else {
                usersListEl.innerHTML = filteredUsers.map(user => {
                    const isSelected = this.admin.selectedUserId === user.userId;
                    return `
                        <div 
                            class="user-card flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                                isSelected 
                                    ? 'border-primary bg-primary/5 dark:bg-primary/10 dark:border-primary' 
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                            }"
                            data-user-id="${user.userId}"
                        >
                            <div class="flex items-center space-x-3 flex-1 min-w-0">
                                <div class="w-9 h-9 ${user.role === 'admin' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'} rounded-full flex items-center justify-center flex-shrink-0">
                                    <span class="text-xs font-bold ${user.role === 'admin' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}">${user.role === 'admin' ? 'A' : 'U'}</span>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">${user.username || user.userId}</p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                        ${user.role === 'admin' ? '管理员' : '普通用户'}
                                        ${user.createdAt ? ` · ${user.createdAt.split(' ')[0]}` : ''}
                                    </p>
                                </div>
                            </div>
                            ${isSelected ? `
                                <svg class="w-4 h-4 text-primary dark:text-primary flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                            ` : `
                                <span class="px-2 py-0.5 text-xs font-medium rounded flex-shrink-0 ${
                                    user.role === 'admin' 
                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                }">
                                    ${user.role === 'admin' ? '管理员' : '用户'}
                                </span>
                            `}
                        </div>
                    `;
                }).join('');
                
                usersListEl.querySelectorAll('.user-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const userId = card.dataset.userId;
                        this.selectUser(userId);
                    });
                });
            }
        }
    }
    
    async selectUser(userId) {
        if (!userId || !this.admin.secretKey) return;
        
        this.admin.selectedUserId = userId;
        this.updateUsersList();
        await this.loadUserDetail(userId);
    }
    
    async loadUserDetail(userId) {
        if (!this.admin.secretKey) return;
        
        const detailContent = document.getElementById('userDetailContent');
        const emptyState = document.querySelector('#userDetailPanel > .text-center');
        
        if (detailContent) detailContent.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
        
        const groupsListEl = document.getElementById('userGroupsList');
        if (groupsListEl) {
            groupsListEl.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>加载中...</p></div>';
        }
        
        try {
            const groupsResponse = await api.getUserGroups(userId);
            if (groupsResponse.success && groupsResponse.data) {
                const groups = groupsResponse.data;
                
                const groupsWithStats = await Promise.all(groups.map(async (group) => {
                    try {
                        const statsResponse = await api.getUserStats(userId, group.group_id);
                        
                        if (statsResponse.success && statsResponse.data) {
                            const stats = statsResponse.data;
                            const totalCount = stats.total_count || stats.count || stats.message_count || stats.total || 0;
                            const totalWords = stats.total_words || stats.period_words || stats.word_count || stats.total_number_of_words || 0;
                            
                            return {
                                ...group,
                                stats: {
                                    total_count: parseInt(totalCount, 10) || 0,
                                    total_words: parseInt(totalWords, 10) || 0,
                                    rank: stats.rank || null,
                                    nickname: stats.nickname || stats.user_name || null
                                }
                            };
                        }
                    } catch (error) {
                        console.error(`获取群 ${group.group_id} 的统计数据失败:`, error);
                    }
                    return {
                        ...group,
                        stats: {
                            total_count: 0,
                            total_words: 0,
                            rank: null,
                            nickname: null
                        }
                    };
                }));
                
                let totalMessages = 0;
                let totalWords = 0;
                groupsWithStats.forEach(group => {
                    if (group.stats) {
                        totalMessages += group.stats.total_count || 0;
                        totalWords += group.stats.total_words || 0;
                    }
                });
                
                this.admin.selectedUserData = {
                    userId,
                    groups: groupsWithStats,
                    user: this.admin.users.find(u => u.userId === userId),
                    totalMessages,
                    totalWords
                };
                this.updateUserDetail();
            }
        } catch (error) {
            console.error('加载用户详情失败:', error);
            Toast.show('加载用户详情失败: ' + (error.message || '未知错误'), 'error');
        }
    }
    
    updateUserDetail() {
        const detailPanel = document.getElementById('userDetailPanel');
        const detailContent = document.getElementById('userDetailContent');
        const emptyState = detailPanel?.querySelector('.text-center');
        
        if (!this.admin.selectedUserData) {
            if (detailContent) detailContent.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }
        
        const user = this.admin.selectedUserData.user;
        
        if (detailContent) detailContent.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
        
        const titleEl = document.getElementById('userDetailTitle');
        const userIdEl = document.getElementById('userDetailId');
        const userIdCardEl = document.getElementById('userDetailIdCard');
        const roleBadgeEl = document.getElementById('userDetailRoleBadge');
        const groupCountEl = document.getElementById('userGroupCount');
        const totalMessagesEl = document.getElementById('userTotalMessages');
        const totalWordsEl = document.getElementById('userTotalWords');
        const createdAtEl = document.getElementById('userCreatedAt');
        const updatedAtEl = document.getElementById('userUpdatedAt');
        const roleSelectEl = document.getElementById('userRoleSelect');
        const groupsCountEl = document.getElementById('userGroupsCount');
        
        if (titleEl) titleEl.textContent = user?.username || user?.userId || '未知用户';
        if (userIdEl) userIdEl.textContent = `用户ID: ${this.admin.selectedUserData.userId}`;
        if (userIdCardEl) userIdCardEl.textContent = this.admin.selectedUserData.userId;
        
        if (roleBadgeEl) {
            const isAdmin = user?.role === 'admin';
            roleBadgeEl.textContent = isAdmin ? '管理员' : '普通用户';
            roleBadgeEl.className = `px-4 py-2 text-sm font-semibold rounded-full ${
                isAdmin 
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' 
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            }`;
        }
        
        if (groupCountEl) groupCountEl.textContent = formatNumber(this.admin.selectedUserData.groups?.length || 0);
        if (totalMessagesEl) totalMessagesEl.textContent = formatNumber(this.admin.selectedUserData.totalMessages || 0);
        if (totalWordsEl) totalWordsEl.textContent = formatNumber(this.admin.selectedUserData.totalWords || 0);
        
        if (createdAtEl) {
            const createdAt = user?.createdAt || '-';
            createdAtEl.textContent = createdAt !== '-' ? createdAt.split(' ')[0] : '-';
        }
        if (updatedAtEl) {
            const updatedAt = user?.updatedAt || '-';
            updatedAtEl.textContent = updatedAt !== '-' ? updatedAt.split(' ')[0] : '-';
        }
        
        if (roleSelectEl) {
            roleSelectEl.value = user?.role || 'user';
            // 更新自定义下拉框显示
            if (window.updateCustomSelect && roleSelectEl.classList.contains('select-custom')) {
                window.updateCustomSelect(roleSelectEl);
            }
        }
        
        const groupsListEl = document.getElementById('userGroupsList');
        if (groupsListEl) {
            if (this.admin.selectedUserData.groups && this.admin.selectedUserData.groups.length > 0) {
                if (groupsCountEl) {
                    groupsCountEl.textContent = `共 ${this.admin.selectedUserData.groups.length} 个群`;
                }
                
                groupsListEl.innerHTML = this.admin.selectedUserData.groups.map((group, index) => {
                    const stats = group.stats || {};
                    const messageCount = parseInt(stats.total_count || 0, 10);
                    const wordCount = parseInt(stats.total_words || 0, 10);
                    const rank = stats.rank || null;
                    const hasData = messageCount > 0 || wordCount > 0;
                    
                    return `
                        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center space-x-2 flex-1 min-w-0">
                                    <span class="text-xs font-medium text-gray-500 dark:text-gray-400 w-6">${index + 1}.</span>
                                    <div class="flex-1 min-w-0">
                                        <p class="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">${group.group_name || `群${group.group_id}`}</p>
                                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">${group.group_id}</p>
                                    </div>
                                </div>
                                ${rank !== null && rank !== undefined ? `
                                    <span class="px-2 py-0.5 text-xs font-medium rounded flex-shrink-0 ${
                                        rank === 1 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' 
                                        : rank === 2 ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        : rank === 3 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    }">
                                        #${rank}
                                    </span>
                                ` : ''}
                            </div>
                            
                            <div class="flex items-center space-x-4 text-xs">
                                <div class="flex items-center space-x-1">
                                    <span class="text-gray-500 dark:text-gray-400">消息:</span>
                                    <span class="font-semibold ${hasData ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}">${formatNumber(messageCount)}</span>
                                </div>
                                <div class="flex items-center space-x-1">
                                    <span class="text-gray-500 dark:text-gray-400">字数:</span>
                                    <span class="font-semibold ${hasData ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}">${formatNumber(wordCount)}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                if (groupsCountEl) {
                    groupsCountEl.textContent = '';
                }
                groupsListEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-12">该用户不在任何群中</p>';
            }
        }
    }
    
    async updateUserRole() {
        if (!this.admin.selectedUserId) {
            Toast.show('请先选择一个用户', 'error');
            return;
        }
        
        if (!this.admin.secretKey) {
            Toast.show('请先验证权限', 'error');
            return;
        }
        
        const roleSelectEl = document.getElementById('userRoleSelect');
        if (!roleSelectEl) {
            Toast.show('找不到权限选择框', 'error');
            return;
        }
        
        const newRole = roleSelectEl.value;
        const currentRole = this.admin.selectedUserData?.user?.role || 'user';
        
        if (newRole === currentRole) {
            Toast.show('权限未发生变化', 'info');
            return;
        }
        
        const userName = this.admin.selectedUserData?.user?.username || this.admin.selectedUserId;
        const roleText = newRole === 'admin' ? '管理员' : '普通用户';
        
        const confirmed = await new Promise((resolve) => {
            window.Modal.show('确认修改权限', `
                <div class="space-y-3">
                    <p class="text-gray-700 dark:text-gray-300">确定要将用户 <strong class="text-primary">${userName}</strong> 的权限修改为 <strong class="text-primary">${roleText}</strong> 吗？</p>
                </div>
            `, `
                <button class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium" id="confirmUpdateRoleBtn">确认修改</button>
                <button class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium" onclick="Modal.hide()">取消</button>
            `);
            
            setTimeout(() => {
                const confirmBtn = document.getElementById('confirmUpdateRoleBtn');
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
            const response = await api.updateUserRole(
                this.admin.selectedUserId,
                newRole,
                this.admin.app.userId,
                this.admin.secretKey
            );
            
            if (response.success) {
                Toast.show(`权限已更新为${roleText}`, 'success');
                await this.loadUsers();
                await this.loadUserDetail(this.admin.selectedUserId);
            } else {
                Toast.show(response.message || '更新权限失败', 'error');
            }
        } catch (error) {
            console.error('更新权限失败:', error);
            Toast.show('更新失败: ' + (error.message || '未知错误'), 'error');
        }
    }
    
    async clearUserData() {
        if (!this.admin.selectedUserId) {
            Toast.show('请先选择一个用户', 'error');
            return;
        }
        
        if (!this.admin.secretKey) {
            Toast.show('请先验证权限', 'error');
            return;
        }
        
        const userName = this.admin.selectedUserData?.user?.username || this.admin.selectedUserId;
        
        const confirmed = await new Promise((resolve) => {
            window.Modal.show('确认清除', `
                <div class="space-y-3">
                    <p class="text-gray-700 dark:text-gray-300">确定要清除用户 <strong class="text-red-600 dark:text-red-400">${userName}</strong> 的所有统计数据吗？</p>
                    <p class="text-sm text-red-600 dark:text-red-400 font-medium">⚠️ 此操作不可恢复！</p>
                </div>
            `, `
                <button class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium" id="confirmClearUserBtn">确认清除</button>
                <button class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium" onclick="Modal.hide()">取消</button>
            `);
            
            setTimeout(() => {
                const confirmBtn = document.getElementById('confirmClearUserBtn');
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
            Toast.show('清除用户数据功能待实现', 'info');
        } catch (error) {
            console.error('清除用户数据失败:', error);
            Toast.show('清除失败: ' + (error.message || '未知错误'), 'error');
        }
    }
}

