/**
 * 管理页面 - 成就管理模块
 */
export class AdminAchievements {
    constructor(admin) {
        this.admin = admin;
        this.achievements = [];
        this.achievementStats = [];
        this.filteredAchievements = [];
        this.selectedGroupId = null; // 默认选择第一个群组
        this.searchQuery = '';
        this.initialized = false;
        this._eventListenersBound = false;
    }
    
    initEventListeners() {
        // 避免重复绑定事件
        if (this._eventListenersBound) return;
        this._eventListenersBound = true;
        
        // 搜索框
        const searchInput = document.getElementById('achievementSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.trim();
                this.applyFilters();
            });
        }
        
        // 群组选择
        const groupSelect = document.getElementById('achievementGroupSelect');
        if (groupSelect) {
            // 设置默认值为第一个群组
            if (groupSelect.options.length > 0) {
                this.selectedGroupId = groupSelect.value;
            }
            
            groupSelect.addEventListener('change', (e) => {
                this.selectedGroupId = e.target.value;
                if (this.selectedGroupId) {
                    this.loadAchievements();
                }
            });
        }
        
        // 刷新按钮
        const refreshBtn = document.getElementById('refreshAchievementsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                    this.loadAchievements();
            });
        }
        
        // 导出按钮
        const exportBtn = document.getElementById('exportAchievementsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportAchievements();
            });
        }
    }
    
    /**
     * 加载成就列表
     */
    async loadAchievements() {
        if (!this.admin.secretKey) {
            console.warn('秘钥未设置，无法加载成就列表');
            return;
        }
        
        // 如果没有选择群组，使用第一个群组
        if (!this.selectedGroupId) {
            if (this.admin.groups && this.admin.groups.length > 0) {
                this.selectedGroupId = this.admin.groups[0].group_id;
                // 更新下拉框选择
                const groupSelect = document.getElementById('achievementGroupSelect');
                if (groupSelect) {
                    groupSelect.value = this.selectedGroupId;
                }
            } else {
                Toast.show('请先选择群组', 'warning');
                return;
            }
        }
        
        const loadingEl = document.getElementById('achievementsLoading');
        const listEl = document.getElementById('achievementsList');
        
        if (loadingEl) loadingEl.classList.remove('hidden');
        if (listEl) listEl.classList.add('hidden');
        
        try {
            this.admin.loading.achievements = true;
            
            // 加载成就列表（使用管理员API，使用第一个群组ID，因为列表不依赖群组）
            const firstGroupId = this.admin.groups && this.admin.groups.length > 0 
                ? this.admin.groups[0].group_id 
                : this.selectedGroupId;
            const listResponse = await api.getAdminAchievementList(
                this.admin.app.userId,
                this.admin.secretKey,
                firstGroupId
            );
            if (listResponse.success && listResponse.data) {
                // 处理返回的数据格式
                const data = listResponse.data;
                this.achievements = data.achievements || data || [];
            }
            
            // 加载指定群组的成就统计
            const statsResponse = await api.getAdminAchievementStats(
                this.admin.app.userId,
                this.admin.secretKey,
                this.selectedGroupId
            );
            
            if (statsResponse.success && statsResponse.data) {
                this.achievementStats = Array.isArray(statsResponse.data) 
                    ? statsResponse.data 
                    : [];
            } else {
                this.achievementStats = [];
            }
            
            // 合并统计数据到成就列表
            this.mergeStats();
            
            // 应用筛选和排序（默认按人数排序）
            this.applyFilters();
            
        } catch (error) {
            console.error('加载成就列表失败:', error);
            Toast.show('加载成就列表失败: ' + (error.message || '未知错误'), 'error');
        } finally {
            this.admin.loading.achievements = false;
            if (loadingEl) loadingEl.classList.add('hidden');
            if (listEl) listEl.classList.remove('hidden');
        }
    }
    
    /**
     * 合并统计数据到成就列表
     */
    mergeStats() {
        const statsMap = new Map();
        this.achievementStats.forEach(stat => {
            // 支持多种数据格式：achievement_id 或 id
            const achievementId = stat.achievement_id || stat.id;
            if (achievementId) {
                statsMap.set(String(achievementId), stat);
            }
        });
        
        this.achievements.forEach(achievement => {
            // 确保ID是字符串格式进行匹配
            const achievementId = String(achievement.id);
            const stat = statsMap.get(achievementId);
            
            if (stat) {
                achievement.userCount = parseInt(stat.user_count || stat.unlockCount || 0, 10);
                achievement.percentage = parseFloat(stat.percentage || 0);
            } else {
                achievement.userCount = 0;
                achievement.percentage = 0;
            }
            
            // 确保稀有度存在（从定义中获取）
            if (!achievement.rarity) {
                achievement.rarity = 'common';
            }
        });
    }
    
    /**
     * 应用搜索和排序（默认按人数降序）
     */
    applyFilters() {
        let filtered = [...this.achievements];
        
        // 搜索筛选
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(achievement => {
                const name = (achievement.name || '').toLowerCase();
                const desc = (achievement.description || '').toLowerCase();
                const category = (achievement.category || '').toLowerCase();
                return name.includes(query) || desc.includes(query) || category.includes(query);
            });
        }
        
        // 默认按人数降序排序
        filtered.sort((a, b) => {
                    return (b.userCount || 0) - (a.userCount || 0);
        });
        
        this.filteredAchievements = filtered;
        this.updateAchievementsList();
    }
    
    /**
     * 更新成就列表显示
     */
    updateAchievementsList() {
        const listEl = document.getElementById('achievementsList');
        const countEl = document.getElementById('achievementListCount');
        
        if (!listEl) return;
        
        // 更新计数
        if (countEl) {
            const countSpan = countEl.querySelector('span');
            if (countSpan) {
                countSpan.textContent = `${this.filteredAchievements.length}`;
            }
        }
        
        // 空状态
        if (this.filteredAchievements.length === 0) {
            listEl.innerHTML = `
                <div class="text-center py-16 px-4">
                    <div class="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <svg class="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                        </svg>
                    </div>
                    <p class="text-gray-500 dark:text-gray-400 text-base font-medium">暂无匹配的成就</p>
                    <p class="text-gray-400 dark:text-gray-500 text-sm mt-2">尝试调整搜索条件</p>
                </div>
            `;
            return;
        }
        
        // 渲染成就卡片（网格布局 - 简约风格）
        listEl.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                ${this.filteredAchievements.map(achievement => {
                    const rarity = this.normalizeRarity(achievement.rarity);
                    const rarityText = this.getRarityText(achievement.rarity);
            const rarityColors = {
                        common: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
                        uncommon: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
                        rare: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
                        epic: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
                        legendary: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
                        mythic: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
                        festival: 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300',
                        special: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                    };
                    const rarityColor = rarityColors[rarity] || rarityColors.common;
            
            return `
                        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                            <!-- 标题和稀有度 -->
                            <div class="flex items-start justify-between mb-2">
                                <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 flex-1 pr-2">
                                    ${this.escapeHtml(achievement.name || '未命名成就')}
                                </h3>
                                <span class="px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${rarityColor}">
                                    ${rarityText}
                                </span>
                            </div>
                            
                            <!-- 描述 -->
                            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                                ${this.escapeHtml(achievement.description || '无描述')}
                            </p>
                            
                            <!-- 统计信息 -->
                            <div class="flex items-center justify-between text-sm pt-3 border-t border-gray-100 dark:border-gray-700">
                                <span class="text-gray-600 dark:text-gray-400">
                                    ${this.formatNumber(achievement.userCount || 0)} 人
                                </span>
                                <span class="text-gray-500 dark:text-gray-500">
                                    ${(achievement.percentage || 0).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    `;
                }).join('')}
                </div>
            `;
    }
    
    /**
     * 标准化稀有度（将首字母大写的格式转为小写）
     */
    normalizeRarity(rarity) {
        if (!rarity) return 'common';
        // 将首字母大写的格式（如 "Common"）转为小写（如 "common"）
        return rarity.toLowerCase();
    }
    
    /**
     * 获取稀有度文本
     */
    getRarityText(rarity) {
        const normalizedRarity = this.normalizeRarity(rarity);
        const texts = {
            common: '普通',
            uncommon: '不常见',
            rare: '稀有',
            epic: '史诗',
            legendary: '传说',
            mythic: '神话',
            festival: '节日',
            special: '特殊'
        };
        return texts[normalizedRarity] || '普通';
    }
    
    /**
     * 格式化数字
     */
    formatNumber(num) {
        if (num >= 10000) {
            return (num / 10000).toFixed(1) + '万';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toString();
    }
    
    /**
     * 导出成就配置
     */
    exportAchievements() {
        if (!this.filteredAchievements || this.filteredAchievements.length === 0) {
            Toast.show('暂无数据可导出', 'warning');
            return;
        }
        
        try {
            // 准备CSV数据
            const headers = ['成就ID', '成就名称', '描述', '分类', '稀有度', '获得人数', '获得率(%)'];
            const rows = this.filteredAchievements.map(achievement => {
                return [
                    achievement.id || '',
                    achievement.name || '',
                    achievement.description || '',
                    achievement.category || '',
                    this.getRarityText(achievement.rarity),
                    achievement.userCount || 0,
                    (achievement.percentage || 0).toFixed(2)
                ];
            });
            
            // 转换为CSV格式
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            ].join('\n');
            
            // 添加BOM以支持中文
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
            
            // 创建下载链接
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `成就列表_${new Date().toISOString().split('T')[0]}.csv`;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            
            // 延迟清理，确保下载已开始
            setTimeout(() => {
            document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
            
            Toast.show('导出成功', 'success');
        } catch (error) {
            console.error('导出失败:', error);
            Toast.show('导出失败: ' + (error.message || '未知错误'), 'error');
        }
    }
    
    /**
     * HTML转义
     */
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }
}
