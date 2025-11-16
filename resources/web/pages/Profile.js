/**
 * 个人中心页面
 * 显示用户详细信息、统计数据、成就等
 */
export default class Profile {
    constructor(app) {
        this.app = app;
        this.userData = null;
        this.userStats = null;
        this.userGroups = [];
        this.userAchievements = [];
    }
    
    async render() {
        return `
            <div class="bg-white dark:bg-gray-900 min-h-full">
                <div class="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8">
                    <!-- 页面标题 -->
                    <div class="mb-6">
                        <h1 class="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">个人中心</h1>
                        <p class="text-sm text-gray-500 dark:text-gray-400">查看您的个人信息和统计数据</p>
                    </div>
                    
                    <!-- 加载中状态 -->
                    <div id="profileLoading" class="flex items-center justify-center w-full min-h-[400px]">
                        ${Loading.render({ text: '加载中...', size: 'medium', className: 'py-12' })}
                    </div>
                    
                    <!-- 主要内容 -->
                    <div id="profileContent" class="hidden">
                        <!-- 用户信息卡片 -->
                        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <div class="flex-shrink-0">
                                    <img id="userAvatar" src="" alt="头像" class="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-primary/20 object-cover" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'%3E%3Ccircle cx=\\'12\\' cy=\\'12\\' r=\\'10\\' fill=\\'%23f3f4f6\\'/%3E%3C/svg%3E';">
                                </div>
                                <div class="flex-1 min-w-0">
                                    <h2 id="userName" class="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1 truncate">加载中...</h2>
                                    <p id="userId" class="text-sm text-gray-500 dark:text-gray-400 mb-3">用户ID: <span class="font-mono">-</span></p>
                                    <div class="flex flex-wrap gap-2">
                                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-300">
                                            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path>
                                            </svg>
                                            活跃用户
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 统计概览 -->
                        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                            ${Card.renderStat({ 
                                label: '总发言数', 
                                value: '<span id="totalMessages">-</span>', 
                                id: 'totalMessagesCard',
                                icon: '<svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>'
                            })}
                            ${Card.renderStat({ 
                                label: '总字数', 
                                value: '<span id="totalWords">-</span>', 
                                id: 'totalWordsCard',
                                icon: '<svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>'
                            })}
                            ${Card.renderStat({ 
                                label: '活跃天数', 
                                value: '<span id="activeDays">-</span>', 
                                id: 'activeDaysCard',
                                icon: '<svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>'
                            })}
                            ${Card.renderStat({ 
                                label: '加入群数', 
                                value: '<span id="groupCount">-</span>', 
                                id: 'groupCountCard',
                                icon: '<svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>'
                            })}
                        </div>
                        
                        <!-- 群组列表 -->
                        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">我的群组</h3>
                            <div id="groupsList" class="space-y-3">
                                ${Loading.render({ text: '加载中...', size: 'small', className: 'py-8' })}
                            </div>
                        </div>
                        
                        <!-- 最近成就 -->
                        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">最近成就</h3>
                                ${this.userAchievements && this.userAchievements.length > 0 ? `<span class="text-xs text-gray-500 dark:text-gray-400">共 ${this.userAchievements.length} 项</span>` : ''}
                            </div>
                            <div id="achievementsList" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                <div class="col-span-full flex items-center justify-center min-h-[200px]">
                                    ${Loading.render({ text: '加载中...', size: 'small', className: 'py-8' })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async mounted() {
        await this.loadUserData();
    }
    
    async loadUserData() {
        try {
            const loadingEl = document.getElementById('profileLoading');
            const contentEl = document.getElementById('profileContent');
            
            // 直接使用 app.userId 和 localStorage 获取用户信息（与设置页面保持一致）
            // 立即更新用户信息显示
            this.updateUserInfo();
            
            // 先加载用户群组
            const groupsResponse = await api.getUserGroups(this.app.userId);
            if (groupsResponse.success && groupsResponse.data) {
                this.userGroups = groupsResponse.data;
                this.updateGroups();
                
                // 如果有群组，聚合所有群组的统计数据
                if (this.userGroups.length > 0) {
                    await this.loadAggregatedStats();
                }
                
                // 加载用户成就（遍历所有群组）
                await this.loadUserAchievements();
            } else {
                // 即使没有群组，也显示内容
                this.userStats = {
                    total_count: 0,
                    total_words: 0,
                    active_days: 0
                };
                this.updateStats();
            }
            
            // 显示内容，隐藏加载中
            if (loadingEl) loadingEl.classList.add('hidden');
            if (contentEl) contentEl.classList.remove('hidden');
            
        } catch (error) {
            console.error('加载用户数据失败:', error);
            const loadingEl = document.getElementById('profileLoading');
            if (loadingEl) {
                loadingEl.innerHTML = `
                    <div class="text-center py-12">
                        <p class="text-red-500 dark:text-red-400 mb-4">加载失败，请刷新重试</p>
                        <button onclick="location.reload()" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                            刷新页面
                        </button>
                    </div>
                `;
            }
        }
    }
    
    /**
     * 聚合所有群组的统计数据
     */
    async loadAggregatedStats() {
        if (!this.userGroups || this.userGroups.length === 0) {
            this.userStats = {
                total_count: 0,
                total_words: 0,
                active_days: 0
            };
            this.updateStats();
            return;
        }
        
        try {
            // 并行获取所有群组的统计数据
            const allStats = await Promise.all(
                this.userGroups.map(async (group) => {
                    try {
                        const response = await api.getUserStats(this.app.userId, group.group_id);
                        if (response.success && response.data) {
                            const stat = response.data;
                            // 为群组添加统计数据，用于在群组列表中显示
                            group.count = stat.total_count || stat.total || 0;
                            group.words = stat.total_words || stat.total_words || 0;
                            return stat;
                        }
                    } catch (error) {
                        // 忽略单个群组的错误
                    }
                    return null;
                })
            );
            
            // 过滤掉失败的数据
            const validStats = allStats.filter(stat => stat !== null);
            
            if (validStats.length === 0) {
                this.userStats = {
                    total_count: 0,
                    total_words: 0,
                    active_days: 0
                };
            } else {
                // 聚合统计数据 - 使用与Home.js相同的逻辑
                const allActiveDays = new Set();
                let totalCount = 0;
                let totalWords = 0;
                let maxActiveDays = 0;
                
                validStats.forEach(stat => {
                    // 累计总发言和总字数
                    totalCount += parseInt(stat.total_count || stat.total || 0, 10);
                    totalWords += parseInt(stat.total_words || stat.total_number_of_words || 0, 10);
                    
                    // 收集活跃天数（需要去重）
                    if (stat.daily_stats) {
                        Object.keys(stat.daily_stats).forEach(date => {
                            allActiveDays.add(date);
                        });
                    }
                    
                    // 取最大活跃天数
                    const activeDays = parseInt(stat.active_days || 0, 10);
                    if (activeDays > maxActiveDays) {
                        maxActiveDays = activeDays;
                    }
                });
                
                // 使用去重后的活跃天数集合大小，如果为0则使用最大值
                const finalActiveDays = allActiveDays.size > 0 ? allActiveDays.size : maxActiveDays;
                
                this.userStats = {
                    total_count: totalCount,
                    total_words: totalWords,
                    active_days: finalActiveDays
                };
            }
            
            // 更新群组列表（显示每个群组的发言数）
            this.updateGroups();
            this.updateStats();
        } catch (error) {
            console.error('加载统计数据失败:', error);
            this.userStats = {
                total_count: 0,
                total_words: 0,
                active_days: 0
            };
            this.updateStats();
        }
    }
    
    /**
     * 加载用户成就（遍历所有群组）
     */
    async loadUserAchievements() {
        if (!this.userGroups || this.userGroups.length === 0) {
            this.userAchievements = [];
            this.updateAchievements();
            return;
        }
        
        try {
            // 并行获取所有群组的成就
            const allAchievements = await Promise.all(
                this.userGroups.map(async (group) => {
                    try {
                        const response = await api.getUserAchievements(this.app.userId, group.group_id);
                        
                        if (response.success && response.data) {
                            const data = response.data;
                            const achievements = data.achievements || {};
                            const achievementsList = [];
                            
                            // 获取成就列表（包含定义信息）
                            let achievementDefinitions = {};
                            try {
                                const listResponse = await api.getAchievementList(group.group_id, this.app.userId);
                                if (listResponse.success && listResponse.data && listResponse.data.achievements) {
                                    listResponse.data.achievements.forEach(achievement => {
                                        achievementDefinitions[achievement.id] = achievement;
                                    });
                                }
                            } catch (error) {
                                console.warn(`[Profile] 获取群组 ${group.group_id} 成就定义失败:`, error);
                            }
                            
                            // 将成就对象转换为数组，只包含已解锁的成就
                            for (const [achievementId, achievementData] of Object.entries(achievements)) {
                                if (achievementData.unlocked) {
                                    const definition = achievementDefinitions[achievementId] || {};
                                    achievementsList.push({
                                        id: achievementId,
                                        name: definition.name || achievementId,
                                        description: definition.description || '',
                                        rarity: definition.rarity || 'Common',
                                        obtained_at: achievementData.unlocked_at,
                                        group_id: group.group_id,
                                        group_name: group.group_name
                                    });
                                }
                            }
                            
                            return achievementsList;
                        }
                    } catch (error) {
                        console.error(`[Profile] 获取群组 ${group.group_id} 成就失败:`, error);
                    }
                    return [];
                })
            );
            
            // 合并所有成就，并按获得时间排序（最新的在前）
            this.userAchievements = allAchievements
                .flat()
                .sort((a, b) => {
                    const timeA = a.obtained_at ? new Date(a.obtained_at).getTime() : 0;
                    const timeB = b.obtained_at ? new Date(b.obtained_at).getTime() : 0;
                    return timeB - timeA;
                })
                .slice(0, 9); // 只显示最近9个成就
            
            this.updateAchievements();
        } catch (error) {
            console.error('加载用户成就失败:', error);
            this.userAchievements = [];
            this.updateAchievements();
        }
    }
    
    updateUserInfo() {
        const avatarEl = document.getElementById('userAvatar');
        const nameEl = document.getElementById('userName');
        const idEl = document.getElementById('userId');
        
        // 直接使用 app.userId 和 localStorage 获取用户信息（与设置页面保持一致）
        const userId = this.app.userId || null;
        const userName = userId ? localStorage.getItem(`userName_${userId}`) : null;
        
        // 设置头像（使用QQ头像API）
        if (avatarEl && userId) {
            // QQ头像API: https://q.qlogo.cn/g?b=qq&s=0&nk={userId}
            avatarEl.src = `https://q.qlogo.cn/g?b=qq&s=0&nk=${userId}`;
            avatarEl.onerror = function() {
                // 如果QQ头像加载失败，使用默认头像
                this.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Ccircle cx=\'12\' cy=\'12\' r=\'10\' fill=\'%23f3f4f6\'/%3E%3C/svg%3E';
            };
        }
        
        // 设置用户名（显示在标题位置）
        if (nameEl) {
            if (userName) {
                nameEl.textContent = userName;
            } else if (userId) {
                // 如果没有用户名但有用户ID，显示"未设置"（与设置页面保持一致）
                nameEl.textContent = '未设置';
            } else {
                nameEl.textContent = '未登录';
            }
        }
        
        // 设置用户ID（显示在下方）
        if (idEl) {
            const idSpan = idEl.querySelector('span');
            if (idSpan) {
                if (userId) {
                    idSpan.textContent = userId;
                    idEl.style.display = ''; // 确保显示
                } else {
                    idSpan.textContent = '未登录';
                    idEl.style.display = ''; // 确保显示
                }
            } else if (userId) {
                // 如果 span 不存在，创建它
                idEl.innerHTML = `用户ID: <span class="font-mono">${userId}</span>`;
                idEl.style.display = '';
            }
        }
    }
    
    updateStats() {
        if (!this.userStats) return;
        
        const totalMessagesEl = document.getElementById('totalMessages');
        const totalWordsEl = document.getElementById('totalWords');
        const activeDaysEl = document.getElementById('activeDays');
        const groupCountEl = document.getElementById('groupCount');
        
        if (totalMessagesEl) {
            totalMessagesEl.textContent = formatNumber(this.userStats.total_count || 0);
        }
        
        if (totalWordsEl) {
            totalWordsEl.textContent = formatNumber(this.userStats.total_words || 0);
        }
        
        if (activeDaysEl) {
            activeDaysEl.textContent = formatNumber(this.userStats.active_days || 0);
        }
        
        if (groupCountEl) {
            groupCountEl.textContent = formatNumber(this.userGroups.length || 0);
        }
    }
    
    updateGroups() {
        const groupsListEl = document.getElementById('groupsList');
        if (!groupsListEl) return;
        
        if (!this.userGroups || this.userGroups.length === 0) {
            groupsListEl.innerHTML = EmptyState.render({ 
                message: '暂无群组数据',
                icon: `<svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>`,
                className: 'py-8'
            });
            return;
        }
        
        // 初始化展开状态
        if (!this.expandedGroups) {
            this.expandedGroups = new Set();
        }
        
        let html = '';
        this.userGroups.forEach((group, index) => {
            const groupName = group.group_name || group.group_id || '未知群组';
            const groupId = group.group_id;
            const isExpanded = this.expandedGroups.has(groupId);
            const groupKey = `group-${index}`;
            
            html += `
                <div class="group-item border border-gray-200 dark:border-gray-700 rounded-lg mb-3 overflow-hidden transition-all" data-group-id="${groupId}" data-group-key="${groupKey}">
                    <div class="group-header flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" data-group-id="${groupId}">
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                                <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                </svg>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">${escapeHtml(groupName)}</p>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">群ID: ${maskGroupId(groupId)}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                            <div class="flex-shrink-0 text-right">
                                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">${formatNumber(group.count || 0)}</p>
                                <p class="text-xs text-gray-500 dark:text-gray-400">发言数</p>
                            </div>
                            <svg class="group-arrow-icon w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-0' : 'rotate-180'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-group-id="${groupId}">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="group-details ${isExpanded ? '' : 'hidden'}" data-group-details="${groupId}">
                        <div class="px-4 pb-4 pt-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/20">
                            <div class="group-details-content" data-group-content="${groupId}">
                                <div class="flex items-center justify-center py-6">
                                    ${Loading.renderMini({ className: 'inline-block' })}
                                    <span class="ml-2 text-sm text-gray-500 dark:text-gray-400">加载中...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        groupsListEl.innerHTML = html;
        
        // 绑定点击事件
        this.bindGroupClickEvents();
        
        // 如果已有展开的群组，重新加载其详细数据
        this.expandedGroups.forEach(groupId => {
            this.loadGroupDetails(groupId);
        });
    }
    
    bindGroupClickEvents() {
        const groupHeaders = document.querySelectorAll('.group-header');
        groupHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                const groupId = header.dataset.groupId;
                this.toggleGroup(groupId);
            });
        });
    }
    
    toggleGroup(groupId) {
        const groupItem = document.querySelector(`.group-item[data-group-id="${groupId}"]`);
        if (!groupItem) return;
        
        const detailsEl = groupItem.querySelector(`[data-group-details="${groupId}"]`);
        // 精确选择箭头图标，使用类名和data属性
        const arrowIcon = groupItem.querySelector(`.group-arrow-icon[data-group-id="${groupId}"]`);
        
        if (!detailsEl) return;
        
        const isExpanded = this.expandedGroups.has(groupId);
        
        if (isExpanded) {
            // 折叠：箭头应该向下（旋转180度）
            this.expandedGroups.delete(groupId);
            detailsEl.classList.add('hidden');
            if (arrowIcon) {
                arrowIcon.classList.remove('rotate-0');
                arrowIcon.classList.add('rotate-180');
            }
        } else {
            // 展开：箭头应该向上（不旋转）
            this.expandedGroups.add(groupId);
            detailsEl.classList.remove('hidden');
            if (arrowIcon) {
                arrowIcon.classList.remove('rotate-180');
                arrowIcon.classList.add('rotate-0');
            }
            // 加载详细数据
            this.loadGroupDetails(groupId);
        }
    }
    
    async loadGroupDetails(groupId) {
        const contentEl = document.querySelector(`[data-group-content="${groupId}"]`);
        if (!contentEl) return;
        
        // 检查是否已加载过
        if (contentEl.dataset.loaded === 'true') {
            return;
        }
        
        try {
            // 并行获取用户统计和排名数据
            const [statsResponse, rankingResponse] = await Promise.all([
                api.getUserStats(this.app.userId, groupId).catch(() => null),
                api.getRanking('total', groupId, { limit: 100 }).catch(() => null)
            ]);
            
            let html = '';
            
            // 用户统计数据
            if (statsResponse && statsResponse.success && statsResponse.data) {
                const stats = statsResponse.data;
                html += `
                    <div class="mb-3">
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div class="bg-white dark:bg-gray-800/60 rounded-lg p-3.5 border border-gray-200 dark:border-gray-700/50 shadow-sm">
                                <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">总发言数</p>
                                <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">${formatNumber(stats.total_count || stats.total || 0)}</p>
                            </div>
                            <div class="bg-white dark:bg-gray-800/60 rounded-lg p-3.5 border border-gray-200 dark:border-gray-700/50 shadow-sm">
                                <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">总字数</p>
                                <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">${formatNumber(stats.total_words || stats.total_number_of_words || 0)}</p>
                            </div>
                            <div class="bg-white dark:bg-gray-800/60 rounded-lg p-3.5 border border-gray-200 dark:border-gray-700/50 shadow-sm">
                                <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">活跃天数</p>
                                <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">${formatNumber(stats.active_days || 0)}</p>
                            </div>
                            <div class="bg-white dark:bg-gray-800/60 rounded-lg p-3.5 border border-gray-200 dark:border-gray-700/50 shadow-sm">
                                <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">连续天数</p>
                                <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">${formatNumber(stats.continuous_days || 0)}</p>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // 排名信息
            if (rankingResponse && rankingResponse.success && rankingResponse.data) {
                const rankings = rankingResponse.data.rankings || rankingResponse.data || [];
                const userRank = rankings.findIndex(item => item.user_id === this.app.userId) + 1;
                
                if (userRank > 0) {
                    const userRankData = rankings[userRank - 1];
                    const isTopThree = userRank <= 3;
                    const rankBadgeClass = isTopThree 
                        ? userRank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 dark:from-yellow-500 dark:to-yellow-600' 
                          : userRank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-500 dark:to-gray-600'
                          : 'bg-gradient-to-br from-orange-400 to-orange-500 dark:from-orange-500 dark:to-orange-600'
                        : 'bg-gradient-to-br from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700';
                    
                    html += `
                        <div class="bg-white dark:bg-gray-800/60 rounded-lg p-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
                            <div class="flex items-center justify-between mb-3">
                                <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">我的排名</span>
                                <span class="inline-flex items-center justify-center min-w-[2.5rem] h-9 px-3 rounded-full ${rankBadgeClass} text-white text-sm font-bold shadow-sm">
                                    第${userRank}名
                                </span>
                            </div>
                            <div class="flex items-center gap-6 pt-3 border-t border-gray-200 dark:border-gray-700/50">
                                <div>
                                    <span class="text-xs text-gray-500 dark:text-gray-400">发言数 </span>
                                    <span class="text-base font-bold text-gray-900 dark:text-gray-100">${formatNumber(userRankData.count || 0)}</span>
                                </div>
                                <div>
                                    <span class="text-xs text-gray-500 dark:text-gray-400">字数 </span>
                                    <span class="text-base font-bold text-gray-900 dark:text-gray-100">${formatNumber(userRankData.period_words || 0)}</span>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    html += `
                        ${EmptyState.renderCard({ 
                            message: '暂无排名数据',
                            className: 'p-4 bg-white dark:bg-gray-800/60'
                        })}
                    `;
                }
            } else {
                html += `
                    <div class="bg-white dark:bg-gray-800/60 rounded-lg p-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
                        <p class="text-sm text-gray-500 dark:text-gray-400 text-center">加载排名数据失败</p>
                    </div>
                `;
            }
            
            contentEl.innerHTML = html;
            contentEl.dataset.loaded = 'true';
        } catch (error) {
            console.error(`加载群组 ${groupId} 详细数据失败:`, error);
            contentEl.innerHTML = `
                <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <p class="text-sm text-red-600 dark:text-red-400 text-center">加载失败，请稍后重试</p>
                </div>
            `;
        }
    }
    
    updateAchievements() {
        const achievementsListEl = document.getElementById('achievementsList');
        if (!achievementsListEl) return;
        
        if (!this.userAchievements || this.userAchievements.length === 0) {
            achievementsListEl.innerHTML = `
                <div class="col-span-full">
                    ${EmptyState.render({ 
                        message: '暂无成就数据',
                        icon: `<svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>`,
                        className: 'py-8'
                    })}
                </div>
            `;
            return;
        }
        
        // 更新成就数量显示
        const headerEl = achievementsListEl.closest('.bg-white, .dark\\:bg-gray-800')?.querySelector('h3')?.nextElementSibling;
        if (headerEl && headerEl.classList.contains('text-xs')) {
            headerEl.textContent = `共 ${this.userAchievements.length} 项`;
        }
        
        // 使用 AchievementCard 组件渲染成就列表
        achievementsListEl.innerHTML = AchievementCard.renderList(
            this.userAchievements.map(achievement => ({
                name: achievement.name,
                description: achievement.description,
                rarity: achievement.rarity || 'Common',
                obtainedDate: achievement.obtained_at,
                groupName: achievement.group_name || (achievement.group_id ? maskGroupId(achievement.group_id) : '')
            })),
            {
                gridCols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }
        );
    }
    
}

