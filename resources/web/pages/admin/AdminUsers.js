/**
 * 管理页面 - 用户管理模块（重写版）
 * 支持PC端和移动端响应式设计
 */
export class AdminUsers {
    constructor(admin) {
        this.admin = admin;
        this.filteredUsers = [];
        this.isMobileDetailOpen = false;
    }
    
    /**
     * 加载用户列表
     */
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
                this.applyFilters();
            } else {
                Toast.show('加载用户列表失败', 'error');
            }
        } catch (error) {
            console.error('加载用户列表失败:', error);
            Toast.show('加载用户列表失败: ' + (error.message || '未知错误'), 'error');
        } finally {
            this.admin.loading.users = false;
        }
    }
    
    /**
     * 应用搜索筛选
     */
    applyFilters() {
        let filtered = [...this.admin.users];
        
        // 搜索筛选
        if (this.admin.userSearchQuery) {
            const query = this.admin.userSearchQuery.toLowerCase();
            filtered = filtered.filter(user => {
                const name = (user.username || user.userId || '').toLowerCase();
                const id = String(user.userId || '').toLowerCase();
                const role = (user.role || '').toLowerCase();
                return name.includes(query) || id.includes(query) || role.includes(query);
            });
        }
        
        // 默认按名称排序
        filtered.sort((a, b) => {
                const nameA = (a.username || a.userId || '').toLowerCase();
                const nameB = (b.username || b.userId || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
        
        this.filteredUsers = filtered;
        this.updateUsersList();
    }
    
    /**
     * 更新用户列表显示
     */
    updateUsersList() {
        const usersListEl = document.getElementById('usersList');
        const userListCountEl = document.getElementById('userListCount');
        if (!usersListEl) return;
        
        // 更新计数
        if (userListCountEl) {
            const countSpan = userListCountEl.querySelector('span');
            if (countSpan) {
                countSpan.textContent = `${this.filteredUsers.length}`;
            }
        }
        
        // 空状态
        if (this.filteredUsers.length === 0) {
            usersListEl.innerHTML = `
                <div class="text-center py-12 px-4">
                    <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <svg class="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                        </svg>
                    </div>
                    <p class="text-gray-500 dark:text-gray-400 text-sm">暂无匹配的用户</p>
                </div>
            `;
            return;
        }
        
        // 渲染用户列表
        const isMobile = window.innerWidth < 1024;
        usersListEl.innerHTML = this.filteredUsers.map(user => {
            // 移动端不显示选中状态
            const isSelected = !isMobile && this.admin.selectedUserId === user.userId;
            const userName = user.username || user.userId || '未知用户';
            const roleText = user.role === 'admin' ? '管理员' : '普通用户';
            const roleClass = user.role === 'admin' ? 'user-role-admin' : 'user-role-user';
            
                    return `
                        <div 
                    class="user-list-item ${isSelected ? 'user-list-item-selected' : ''}"
                            data-user-id="${user.userId}"
                        >
                    <div class="user-list-item-content">
                        <div class="user-list-item-icon ${roleClass}">
                            <span class="user-list-item-icon-text">${user.role === 'admin' ? 'A' : 'U'}</span>
                                </div>
                        <div class="user-list-item-info">
                            <div class="user-list-item-name">${this.escapeHtml(userName)}</div>
                            <div class="user-list-item-meta">
                                <span class="user-list-item-role ${roleClass}">${roleText}</span>
                                ${user.createdAt ? `<span class="user-list-item-date">${user.createdAt.split(' ')[0]}</span>` : ''}
                                </div>
                            </div>
                            ${isSelected ? `
                            <div class="user-list-item-check">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                            </div>
                            ` : `
                            <div class="user-list-item-arrow">
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
        usersListEl.querySelectorAll('.user-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const userId = item.dataset.userId;
                        this.selectUser(userId);
                    });
                });
    }
    
    /**
     * 选择用户
     */
    async selectUser(userId) {
        if (!userId || !this.admin.secretKey) return;
        
        const isMobile = window.innerWidth < 1024;
        
        // 保存选中状态（移动端和PC端都需要，用于刷新功能）
        this.admin.selectedUserId = userId;
        
        if (isMobile) {
            // 移动端打开详情面板
            this.openMobileDetail();
            await this.loadUserDetail(userId);
        } else {
            // PC端更新列表显示选中状态
        this.updateUsersList();
        await this.loadUserDetail(userId);
    }
    }
    
    /**
     * 打开移动端详情
     */
    openMobileDetail() {
        const detailPanel = document.getElementById('userDetailPanel');
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
        const detailPanel = document.getElementById('userDetailPanel');
        if (detailPanel && window.innerWidth < 1024) {
            detailPanel.classList.add('hidden');
            this.isMobileDetailOpen = false;
            // 恢复背景滚动
            document.body.style.overflow = '';
            // 清除选中状态
            this.admin.selectedUserId = null;
            this.admin.selectedUserData = null;
            this.updateUsersList();
            this.updateUserDetail();
        }
    }
    
    /**
     * 初始化移动端布局
     */
    initMobileLayout() {
        if (window.innerWidth < 1024) {
            const detailPanel = document.getElementById('userDetailPanel');
            if (detailPanel && !this.admin.selectedUserId) {
                detailPanel.classList.add('hidden');
            }
        }
    }
    
    /**
     * 加载用户详情
     */
    async loadUserDetail(userId) {
        if (!this.admin.secretKey) return;
        
        const detailContent = document.getElementById('userDetailContent');
        const emptyState = document.querySelector('#userDetailPanel > .empty-state');
        
        if (detailContent) detailContent.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
        
        const groupsListEl = document.getElementById('userGroupsList');
        if (groupsListEl) {
            groupsListEl.innerHTML = Loading.render({ text: '加载中...', size: 'small', className: 'py-8' });
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
                
                // 确保权限选择器正确初始化
                requestAnimationFrame(() => {
                    this.ensureRoleSelectInitialized();
                });
            }
        } catch (error) {
            console.error('加载用户详情失败:', error);
            Toast.show('加载用户详情失败: ' + (error.message || '未知错误'), 'error');
        }
    }
    
    /**
     * 更新用户详情显示
     */
    updateUserDetail() {
        const detailPanel = document.getElementById('userDetailPanel');
        const detailContent = document.getElementById('userDetailContent');
        const emptyState = detailPanel?.querySelector('.empty-state');
        
        if (!this.admin.selectedUserData) {
            if (detailContent) detailContent.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }
        
        const user = this.admin.selectedUserData.user;
        
        if (detailContent) detailContent.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
        
        // 更新标题和用户ID
        const titleEl = document.getElementById('userDetailTitle');
        const userIdEl = document.getElementById('userDetailId');
        const userIdCardEl = document.getElementById('userDetailIdCard');
        
        if (titleEl) titleEl.textContent = user?.username || user?.userId || '未知用户';
        if (userIdEl) {
            const userIdText = this.admin.selectedUserData.userId || '-';
            userIdEl.textContent = `用户ID: ${userIdText}`;
        }
        if (userIdCardEl) userIdCardEl.textContent = this.admin.selectedUserData.userId;
        
        // 更新统计概览
        this.updateStatsOverview();
        
        // 更新角色徽章
        this.updateRoleBadge();
        
        // 更新时间信息
        this.updateTimeInfo();
        
        // 更新角色选择器
        this.updateRoleSelect();
        
        // 更新群列表
        this.updateGroupsList();
    }
    
    /**
     * 更新统计概览卡片
     */
    updateStatsOverview() {
        // 更新统计数据到现有的HTML元素
        const groupCountEl = document.getElementById('userGroupCount');
        const totalMessagesEl = document.getElementById('userTotalMessages');
        const totalWordsEl = document.getElementById('userTotalWords');
        
        if (groupCountEl) {
            groupCountEl.textContent = formatNumber(this.admin.selectedUserData.groups?.length || 0);
        }
        if (totalMessagesEl) {
            totalMessagesEl.textContent = formatNumber(this.admin.selectedUserData.totalMessages || 0);
        }
        if (totalWordsEl) {
            totalWordsEl.textContent = formatNumber(this.admin.selectedUserData.totalWords || 0);
        }
    }
    
    /**
     * 更新角色徽章
     */
    updateRoleBadge() {
        const roleBadgeEl = document.getElementById('userDetailRoleBadge');
        if (!roleBadgeEl) return;
        
        const user = this.admin.selectedUserData.user;
            const isAdmin = user?.role === 'admin';
            roleBadgeEl.textContent = isAdmin ? '管理员' : '普通用户';
        roleBadgeEl.className = `user-role-badge ${isAdmin ? 'user-role-badge-admin' : 'user-role-badge-user'}`;
        }
        
    /**
     * 更新时间信息
     */
    updateTimeInfo() {
        const createdAtEl = document.getElementById('userCreatedAt');
        const updatedAtEl = document.getElementById('userUpdatedAt');
        const user = this.admin.selectedUserData.user;
        
        if (createdAtEl) {
            const createdAt = user?.createdAt || '-';
            createdAtEl.textContent = createdAt !== '-' ? createdAt.split(' ')[0] : '-';
        }
        if (updatedAtEl) {
            const updatedAt = user?.updatedAt || '-';
            updatedAtEl.textContent = updatedAt !== '-' ? updatedAt.split(' ')[0] : '-';
        }
    }
    
    /**
     * 确保权限选择器已初始化
     */
    ensureRoleSelectInitialized() {
        const roleSelectEl = document.getElementById('userRoleSelect');
        if (!roleSelectEl) return;
        
        // 如果CustomSelect未初始化，尝试初始化
        if (!roleSelectEl._customSelectInstance && window.CustomSelect && roleSelectEl.classList.contains('select-custom')) {
            try {
                roleSelectEl._customSelectInstance = new window.CustomSelect(roleSelectEl);
            } catch (error) {
                console.warn('初始化权限选择器失败:', error);
            }
        }
        
        // 更新值
        this.updateRoleSelect();
    }
    
    /**
     * 更新角色选择器
     */
    updateRoleSelect() {
        const roleSelectEl = document.getElementById('userRoleSelect');
        if (!roleSelectEl) return;
        
        const user = this.admin.selectedUserData?.user;
        if (!user) return;
        
        const newValue = user.role || 'user';
        
        // 更新原生select的值
        if (roleSelectEl.value !== newValue) {
            roleSelectEl.value = newValue;
            // 触发change事件，让CustomSelect自动更新
            roleSelectEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // 如果CustomSelect已初始化，手动更新显示
        if (roleSelectEl._customSelectInstance) {
            roleSelectEl._customSelectInstance.updateButtonText();
            roleSelectEl._customSelectInstance.highlightSelected();
            }
        }
        
    /**
     * 更新群列表
     */
    updateGroupsList() {
        const groupsListEl = document.getElementById('userGroupsList');
        const groupsCountEl = document.getElementById('userGroupsCount');
        
        if (!groupsListEl) return;
        
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
                const groupName = group.group_name || `群${group.group_id}`;
                
                // 排名样式
                let rankBadgeClass = '';
                let rankBadgeContent = '';
                
                if (rank === 1) {
                    rankBadgeClass = 'user-group-rank-badge user-group-rank-badge-gold';
                    rankBadgeContent = rank.toString();
                } else if (rank === 2) {
                    rankBadgeClass = 'user-group-rank-badge user-group-rank-badge-silver';
                    rankBadgeContent = rank.toString();
                } else if (rank === 3) {
                    rankBadgeClass = 'user-group-rank-badge user-group-rank-badge-bronze';
                    rankBadgeContent = rank.toString();
                } else if (rank !== null && rank !== undefined) {
                    rankBadgeClass = 'user-group-rank-badge user-group-rank-badge-default';
                    rankBadgeContent = rank.toString();
                }
                    
                    return `
                    <div class="user-group-item">
                        <div class="user-group-item-header">
                            <div class="user-group-item-info">
                                <span class="user-group-item-index">${index + 1}.</span>
                                <div class="user-group-item-details">
                                    <div class="user-group-item-name">${this.escapeHtml(groupName)}</div>
                                    <div class="user-group-item-id">${group.group_id}</div>
                                </div>
                            </div>
                            ${rankBadgeContent ? `
                                <div class="${rankBadgeClass}">
                                    ${rankBadgeContent}
                                </div>
                            ` : ''}
                        </div>
                        <div class="user-group-item-stats">
                            <div class="user-group-item-stat">
                                <span class="user-group-item-stat-label">消息:</span>
                                <span class="user-group-item-stat-value ${hasData ? '' : 'user-group-item-stat-value-empty'}">${formatNumber(messageCount)}</span>
                            </div>
                            <div class="user-group-item-stat">
                                <span class="user-group-item-stat-label">字数:</span>
                                <span class="user-group-item-stat-value ${hasData ? '' : 'user-group-item-stat-value-empty'}">${formatNumber(wordCount)}</span>
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
    
    /**
     * 更新用户权限
     */
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
                    <p class="text-gray-700 dark:text-gray-300">确定要将用户 <strong class="text-primary">${this.escapeHtml(userName)}</strong> 的权限修改为 <strong class="text-primary">${roleText}</strong> 吗？</p>
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
    
    /**
     * 清除用户数据
     */
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
                    <p class="text-gray-700 dark:text-gray-300">确定要清除用户 <strong class="text-red-600 dark:text-red-400">${this.escapeHtml(userName)}</strong> 的所有统计数据吗？</p>
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
        const searchInput = document.getElementById('userSearchInput');
        const clearBtn = document.getElementById('userSearchClearBtn');
        
        if (searchInput) {
            // 输入事件
            searchInput.addEventListener('input', (e) => {
                const value = e.target.value;
                this.admin.userSearchQuery = value.toLowerCase();
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
                    this.admin.userSearchQuery = '';
                    this.applyFilters();
                    clearBtn.classList.add('hidden');
                    clearBtn.style.display = 'none';
                    searchInput.focus();
                });
            }
        }
        
        // 更新权限按钮
        const updateRoleBtn = document.getElementById('updateUserRoleBtn');
        if (updateRoleBtn) {
            updateRoleBtn.addEventListener('click', () => {
                this.updateUserRole();
            });
        }
        
        // 清除用户数据按钮
        const clearUserBtn = document.getElementById('clearUserDataBtn');
        if (clearUserBtn) {
            clearUserBtn.addEventListener('click', () => {
                this.clearUserData();
            });
        }
        
        // 移动端返回按钮
        const backBtn = document.getElementById('userDetailBackBtn');
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
                    const detailPanel = document.getElementById('userDetailPanel');
                    if (detailPanel) {
                        detailPanel.classList.remove('hidden');
                    }
                    this.isMobileDetailOpen = false;
                } else {
                    // 移动端：清除选中状态，初始化布局
                    this.admin.selectedUserId = null;
                    this.updateUsersList();
                    this.initMobileLayout();
                }
            }, 100);
        });
        
        // 初始化移动端布局
        this.initMobileLayout();
    }
}
