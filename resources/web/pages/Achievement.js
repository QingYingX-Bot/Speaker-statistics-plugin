/**
 * 成就页面 - 现代简约风格
 */
import { Input } from '/assets/js/components/index.js';

export default class Achievement {
    constructor(app) {
        this.app = app;
        this.groups = [];
        this.currentGroupId = null;
        this.achievements = [];
        this.currentDisplayAchievementId = null; // 当前显示的成就ID
        this.displayInfo = null; // 显示成就的详细信息（包含autoDisplayAt等）
    }
    
    async render() {
        return `
            <div class="bg-white dark:bg-gray-900 min-h-full">
                <div class="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
                    <!-- 页面标题和筛选器 -->
                    <div class="mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                        <div>
                            <h1 class="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">成就</h1>
                            <p class="text-xs text-gray-500 dark:text-gray-400">查看和管理您的成就</p>
                        </div>
                        
                        <!-- 群选择 -->
                        <div class="w-full sm:w-auto sm:min-w-[220px]">
                            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">选择群聊</label>
                            <div class="relative">
                                <select id="groupSelect" class="select-custom w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-gray-800 dark:text-gray-200 text-sm appearance-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600">
                                    <option value="">加载中...</option>
                                </select>
                                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 成就内容 -->
                    <div id="achievementContent" style="min-height: 200px; transition: opacity 0.3s ease-in-out;">
                        <!-- 内容将由 loadAchievements 方法加载 -->
                    </div>
                </div>
            </div>
        `;
    }
    
    async mounted() {
        // 设置事件监听器（不阻塞）
        this.setupEventListeners();
        this.setupGlobalEventListeners();
        
        // 并行执行：验证身份和加载群列表
        const [_, groupsLoaded] = await Promise.all([
            this.verifyIdentity().catch(err => {
                console.warn('身份验证失败:', err);
            }),
            this.loadGroups().catch(err => {
                console.error('加载群列表失败:', err);
                return false;
            })
        ]);
        
        // 群列表加载完成后，加载成就数据
        if (groupsLoaded !== false) {
            this.loadAchievements().catch(err => {
                console.error('加载成就失败:', err);
            });
        }
    }
    
    /**
     * 验证身份
     */
    async verifyIdentity() {
        // 检查是否已经验证过（使用sessionStorage，只在当前会话有效）
        const verifiedKey = sessionStorage.getItem(`achievement_verified_${this.app.userId}`);
        if (verifiedKey) {
            return verifiedKey;
        }
        
        // 尝试从本地存储获取秘钥
        const localKey = await SecretKeyManager.get(this.app.userId, false);
        if (localKey) {
            // 验证秘钥是否有效
            try {
                const response = await api.validateSecretKey(this.app.userId, localKey);
                if (response.success && response.data?.valid) {
                    // 验证成功，保存到sessionStorage
                    sessionStorage.setItem(`achievement_verified_${this.app.userId}`, localKey);
                    return localKey;
                }
            } catch (error) {
                console.warn('验证本地秘钥失败:', error);
            }
        }
        
        // 如果没有有效秘钥，弹出验证窗口
        return await this.showIdentityVerification();
    }
    
    /**
     * 显示身份验证窗口
     */
    async showIdentityVerification() {
        return new Promise((resolve) => {
            window.Modal.show('身份验证', `
                <div class="space-y-4">
                    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div class="flex items-start gap-3">
                            <svg class="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                            </svg>
                            <div class="flex-1">
                                <p class="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">需要身份验证</p>
                                <p class="text-xs text-blue-700 dark:text-blue-400">请输入您的秘钥以访问成就设置功能</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">秘钥</label>
                        ${Input.renderInput({
                            type: 'password',
                            id: 'achievementSecretKeyInput',
                            placeholder: '请输入秘钥',
                            className: 'px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                        })}
                    </div>
                </div>
            `, `
                <button class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium" id="confirmAchievementBtn">确认验证</button>
                <button class="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium" onclick="Modal.hide()">取消</button>
            `);
            
            setTimeout(() => {
                const confirmBtn = document.getElementById('confirmAchievementBtn');
                const keyInput = document.getElementById('achievementSecretKeyInput');
                
                if (confirmBtn && keyInput) {
                    const handleConfirm = async () => {
                        const secretKey = keyInput.value.trim();
                        
                        if (!secretKey) {
                            Toast.show('请输入秘钥', 'error');
                            return;
                        }
                        
                        try {
                            confirmBtn.disabled = true;
                            confirmBtn.textContent = '验证中...';
                            
                            // 验证秘钥
                            const response = await api.validateSecretKey(this.app.userId, secretKey);
                            
                            if (!response.success || !response.data?.valid) {
                                Toast.show(response.message || '秘钥验证失败', 'error');
                                confirmBtn.disabled = false;
                                confirmBtn.textContent = '确认验证';
                                return;
                            }
                            
                            Toast.show(response.message || '秘钥验证成功', 'success');
                            
                            // 验证成功，保存秘钥
                            await SecretKeyManager.save(this.app.userId, secretKey);
                            sessionStorage.setItem(`achievement_verified_${this.app.userId}`, secretKey);
                            
                            // 关闭弹窗
                            window.Modal.hide();
                            Toast.show('验证成功', 'success');
                            
                            resolve(secretKey);
                        } catch (error) {
                            console.error('验证秘钥失败:', error);
                            Toast.show('验证失败: ' + (error.message || '未知错误'), 'error');
                            confirmBtn.disabled = false;
                            confirmBtn.textContent = '确认验证';
                        }
                    };
                    
                    confirmBtn.addEventListener('click', handleConfirm);
                    keyInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            handleConfirm();
                        }
                    });
                    keyInput.focus();
                }
            }, 100);
        });
    }
    
    setupGlobalEventListeners() {
        // 使用事件委托，监听整个成就内容区域的点击
        const content = document.getElementById('achievementContent');
        if (!content) {
            // 如果内容区域还不存在，稍后重试
            setTimeout(() => this.setupGlobalEventListeners(), 100);
            return;
        }
        
        // 移除旧的事件监听器（如果存在）
        if (this._achievementClickHandler) {
            content.removeEventListener('click', this._achievementClickHandler);
        }
        
        // 创建新的事件处理函数
        this._achievementClickHandler = async (e) => {
            const btn = e.target.closest('.set-display-btn');
            if (!btn || btn.disabled) {
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            const achievementId = btn.getAttribute('data-achievement-id');
            const achievementName = btn.getAttribute('data-achievement-name');
            const achievementRarity = btn.getAttribute('data-achievement-rarity');
            
            if (achievementId && achievementName) {
                try {
                    await this.setDisplayAchievement(achievementId, achievementName, achievementRarity);
                } catch (error) {
                    console.error('设置显示成就时发生错误:', error);
                    Toast.show('设置失败: ' + (error.message || '未知错误'), 'error');
                }
            } else {
                console.warn('按钮缺少必要的数据属性', { achievementId, achievementName, btn });
                Toast.show('操作失败：缺少必要信息', 'error');
            }
        };
        
        // 添加事件监听器
        content.addEventListener('click', this._achievementClickHandler);
    }
    
    destroy() {
        // 清理事件监听器
        const content = document.getElementById('achievementContent');
        if (content && this._achievementClickHandler) {
            content.removeEventListener('click', this._achievementClickHandler);
            this._achievementClickHandler = null;
        }
    }
    
    async loadGroups() {
        try {
            const response = await api.getUserGroups(this.app.userId);
            this.groups = response.data || [];
            
            const select = document.getElementById('groupSelect');
            if (!select) return true;
            
            select.innerHTML = '';
            
            if (this.groups.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '暂无群聊';
                select.appendChild(option);
                select.disabled = true;
                return true;
            }
            
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
            
            // 默认选择第一个群聊
            if (this.groups.length > 0) {
                this.currentGroupId = this.groups[0].group_id;
                select.value = this.currentGroupId;
                // 如果只有一个群聊，隐藏整个选择器容器
                if (this.groups.length === 1) {
                    const container = select.closest('div');
                    if (container && container.parentElement) {
                        container.parentElement.style.display = 'none';
                    }
                }
            }
            
            return true;
        } catch (error) {
            console.error('加载群列表失败:', error);
            Toast.show('加载群列表失败', 'error');
            return false;
        }
    }
    
    setupEventListeners() {
        const select = document.getElementById('groupSelect');
        if (select) {
            select.addEventListener('change', async (e) => {
                this.currentGroupId = e.target.value;
                await this.loadAchievements();
            });
        }
    }
    
    async loadAchievements() {
        const content = document.getElementById('achievementContent');
        if (!content) return;
        
        // 如果当前没有群ID，不加载
        if (!this.currentGroupId) {
            return;
        }
        
        // 使用淡出效果（仅在已有内容时）
        if (content.innerHTML.trim() && !content.innerHTML.includes('加载中')) {
            content.style.opacity = '0.6';
            content.style.transition = 'opacity 0.15s ease-in-out';
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // 显示加载状态
        content.innerHTML = `
            ${Loading.render({ text: '加载中...', size: 'medium', className: 'py-20' })}
        `;
        
        // 立即显示加载状态（淡入）
        requestAnimationFrame(() => {
            content.style.opacity = '1';
        });
        
        try {
            if (!this.currentGroupId) {
                // 淡出加载状态
                content.style.opacity = '0';
                await new Promise(resolve => setTimeout(resolve, 200));
                
                content.innerHTML = `
                    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-16 text-center" style="min-height: 200px;">
                        <div class="text-4xl mb-3 text-gray-400 dark:text-gray-500">🎖️</div>
                        <div class="text-gray-500 dark:text-gray-400 text-sm">请选择群聊查看成就</div>
                    </div>
                `;
                
                // 淡入新内容
                requestAnimationFrame(() => {
                    content.style.opacity = '1';
                });
                return;
            }
            
            const groupId = this.currentGroupId;
            
            const response = await api.getAchievementList(groupId, this.app.userId);
            
            // API返回的data是一个对象，包含achievements数组
            if (response.success && response.data) {
                this.achievements = response.data.achievements || [];
                
                // 从API响应中获取当前显示的成就ID和显示信息
                this.currentDisplayAchievementId = response.data.current_display || null;
                this.displayInfo = response.data.display_info || null;
            } else {
                this.achievements = [];
                this.currentDisplayAchievementId = null;
                this.displayInfo = null;
            }
            
            // 如果响应中没有，尝试从成就列表中查找标记为显示的成就
            if (!this.currentDisplayAchievementId && this.achievements.length > 0) {
                const displayedAchievement = this.achievements.find(a => 
                    a.is_display === true
                );
                if (displayedAchievement) {
                    this.currentDisplayAchievementId = displayedAchievement.id || displayedAchievement.achievement_id;
                }
            }
            
            await this.renderAchievements();
        } catch (error) {
            console.error('加载成就列表失败:', error);
            
            // 淡出加载状态
            content.style.opacity = '0';
            await new Promise(resolve => setTimeout(resolve, 200));
            
            content.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-16 text-center" style="min-height: 200px;">
                    <div class="text-4xl mb-3 text-gray-400 dark:text-gray-500">❌</div>
                    <div class="text-gray-500 dark:text-gray-400 text-sm">加载失败: ${error.message}</div>
                </div>
            `;
            
            // 淡入错误信息
            requestAnimationFrame(() => {
                content.style.opacity = '1';
            });
        }
    }
    
    async renderAchievements() {
        const content = document.getElementById('achievementContent');
        if (!content) return;
        
        // 淡出当前内容
        content.style.opacity = '0';
        content.style.transition = 'opacity 0.2s ease-in-out';
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (this.achievements.length === 0) {
            content.innerHTML = EmptyState.renderCard({ 
                message: '暂无成就数据',
                icon: '<div class="text-4xl mb-3 text-gray-400 dark:text-gray-500">🎖️</div>',
                className: 'p-16'
            });
            // 淡入空状态
            requestAnimationFrame(() => {
                content.style.opacity = '1';
            });
            return;
        }
        
        // 按稀有度排序
        const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Festival', 'Special'];
        
        const sortedAchievements = [...this.achievements].sort((a, b) => {
            const aRarity = rarityOrder.indexOf(a.rarity || 'Common');
            const bRarity = rarityOrder.indexOf(b.rarity || 'Common');
            if (aRarity !== bRarity) return bRarity - aRarity;
            return a.unlocked ? -1 : 1;
        });
        
        const unlocked = sortedAchievements.filter(a => a.unlocked);
        const locked = sortedAchievements.filter(a => !a.unlocked);
        
        let html = '';
        
        // 已解锁成就
        if (unlocked.length > 0) {
            html += `
                <div class="mb-4 sm:mb-6">
                    <h2 class="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4">已解锁成就 <span class="text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-400">(${unlocked.length})</span></h2>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            `;
            
            unlocked.forEach(achievement => {
                html += this.renderAchievementCard(achievement, true);
            });
            
            html += '</div></div>';
        }
        
        // 未解锁成就
        if (locked.length > 0) {
            html += `
                <div class="${unlocked.length > 0 ? 'mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700' : ''}">
                    <h2 class="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4">未解锁成就 <span class="text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-400">(${locked.length})</span></h2>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            `;
            
            locked.forEach(achievement => {
                html += this.renderAchievementCard(achievement, false);
            });
            
            html += '</div></div>';
        }
        
        content.innerHTML = html;
        
        // 确保内容有最小高度，避免布局跳动
        const firstChild = content.firstElementChild;
        if (firstChild && !firstChild.style.minHeight) {
            firstChild.style.minHeight = '200px';
        }
        
        // 淡入新内容
        requestAnimationFrame(() => {
            content.style.opacity = '1';
        });
        
        // 重新设置事件监听器（内容已更新）
        this.setupGlobalEventListeners();
    }
    
    renderAchievementCard(achievement, unlocked) {
        const rarityEmoji = {
            'Common': '🥉',
            'Uncommon': '🥈',
            'Rare': '🥇',
            'Epic': '💎',
            'Legendary': '👑',
            'Mythic': '🔥',
            'Festival': '🎊',
            'Special': '✨'
        };
        
        const rarityColors = {
            'Common': 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600',
            'Uncommon': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700',
            'Rare': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700',
            'Epic': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700',
            'Legendary': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700',
            'Mythic': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700',
            'Festival': 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 border-pink-300 dark:border-pink-700',
            'Special': 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700'
        };
        
        // 稀有度中文映射
        const rarityNames = {
            'Common': '普通',
            'Uncommon': '不普通',
            'Rare': '稀有',
            'Epic': '史诗',
            'Legendary': '传说',
            'Mythic': '神话',
            'Special': '特殊',
            'Festival': '节日'
        };
        
        // 规范化稀有度值（首字母大写，其余小写）
        const normalizedRarity = achievement.rarity ? (achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1).toLowerCase()) : 'Common';
        
        const emoji = rarityEmoji[normalizedRarity] || '🎖️';
        const rarityColor = rarityColors[normalizedRarity] || rarityColors['Common'];
        const rarityName = rarityNames[normalizedRarity] || rarityNames['Common'];
        const opacityClass = unlocked ? '' : 'opacity-60';
        
        // 检查是否当前显示的成就 - 使用currentDisplayAchievementId和is_display字段
        const achievementId = achievement.id || achievement.achievement_id;
        const isDisplayed = (this.currentDisplayAchievementId && 
            (this.currentDisplayAchievementId === achievementId ||
             this.currentDisplayAchievementId.toString() === achievementId.toString())) ||
            achievement.is_display === true;
        
        // 计算卸下时间（仅对自动佩戴的成就显示）
        let removeTimeInfo = '';
        // 只有自动佩戴的成就才显示卸下时间（isManual 为 false 或 undefined）
        if (isDisplayed && this.displayInfo && 
            (this.displayInfo.isManual === false || this.displayInfo.isManual === undefined) && 
            this.displayInfo.autoDisplayAt) {
            try {
                // 解析 autoDisplayAt 为 UTC+8 时区的 Date 对象
                // autoDisplayAt 可能是：
                // 1. ISO 8601 格式字符串（PostgreSQL JSON序列化）："2025-11-14T15:52:22.000Z"
                // 2. 普通日期时间字符串（SQLite）："YYYY-MM-DD HH:mm:ss"
                // 3. Date 对象（很少见）
                const autoDisplayAtValue = this.displayInfo.autoDisplayAt;
                let autoDisplayAt;
                
                if (typeof autoDisplayAtValue === 'string' && autoDisplayAtValue.trim()) {
                    // 检查是否是 ISO 8601 格式（包含 'T'）
                    if (autoDisplayAtValue.includes('T')) {
                        // ISO 8601 格式：可能是 "2025-11-14T15:52:22.000Z" 或 "2025-11-14T15:52:22"
                        // 直接解析为 Date 对象
                        autoDisplayAt = new Date(autoDisplayAtValue);
                        
                        // 验证日期是否有效
                        if (isNaN(autoDisplayAt.getTime())) {
                            console.warn('autoDisplayAt ISO 格式解析失败:', autoDisplayAtValue);
                            removeTimeInfo = '';
                        } else {
                            // auto_display_at 存储的是 UTC+8 时区的本地时间字符串（格式：YYYY-MM-DD HH:mm:ss）
                            // PostgreSQL 的 TIMESTAMP 类型在 JSON 序列化时会转换为 ISO 8601 格式
                            // 如果带 Z（如 "2025-11-14T15:52:22.000Z"），表示 UTC 时间
                            // 但实际存储的是 UTC+8 时区的本地时间，所以需要正确处理时区
                            // 
                            // 例如：存储的是 "2025-11-14 15:52:22"（UTC+8 时区的本地时间）
                            // PostgreSQL 可能返回 "2025-11-14T15:52:22.000Z"（被当作 UTC 时间）
                            // 但实际上这个时间应该是 UTC+8 时区的本地时间
                            // 所以需要加8小时来得到正确的 UTC+8 时间
                            if (autoDisplayAtValue.endsWith('Z')) {
                                // 如果是 UTC 时间（带 Z），需要加8小时转换为 UTC+8
                                // 因为存储的是 UTC+8 时区的本地时间，但被序列化为 UTC 了
                                const utc8Offset = 8 * 60 * 60 * 1000;
                                autoDisplayAt = new Date(autoDisplayAt.getTime() + utc8Offset);
                            } else if (autoDisplayAtValue.includes('+') || autoDisplayAtValue.includes('-') && autoDisplayAtValue.match(/[+-]\d{2}:\d{2}$/)) {
                                // 如果包含时区偏移（如 +08:00），直接解析即可
                                // Date 对象会自动处理时区
                            }
                            // 如果不带时区信息，说明已经是本地时间（UTC+8），直接使用
                        }
                    } else {
                        // 普通日期时间格式：YYYY-MM-DD HH:mm:ss（UTC+8 时区）
                        const parts = autoDisplayAtValue.split(' ');
                        if (!parts || parts.length < 2) {
                            console.warn('autoDisplayAt 格式不正确:', autoDisplayAtValue);
                            removeTimeInfo = '';
                        } else {
                            const [datePart, timePart] = parts;
                            if (!datePart || !timePart) {
                                console.warn('autoDisplayAt 格式不正确:', autoDisplayAtValue);
                                removeTimeInfo = '';
                            } else {
                                const dateParts = datePart.split('-');
                                const timeParts = timePart.split(':');
                                if (dateParts.length < 3 || timeParts.length < 2) {
                                    console.warn('autoDisplayAt 格式不正确:', autoDisplayAtValue);
                                    removeTimeInfo = '';
                                } else {
                                    const [year, month, day] = dateParts.map(Number);
                                    const [hour, minute, second] = timeParts.map(Number);
                                    
                                    // 验证数字是否有效
                                    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
                                        console.warn('autoDisplayAt 包含无效数字:', autoDisplayAtValue);
                                        removeTimeInfo = '';
                                    } else {
                                        // 创建 UTC+8 时区的 Date 对象
                                        const utc8Offset = 8 * 60 * 60 * 1000;
                                        const utcTimestamp = Date.UTC(year, month - 1, day, hour, minute, second || 0);
                                        autoDisplayAt = new Date(utcTimestamp - utc8Offset);
                                    }
                                }
                            }
                        }
                    }
                } else if (autoDisplayAtValue instanceof Date) {
                    // Date 对象，直接使用
                    autoDisplayAt = autoDisplayAtValue;
                } else {
                    // 未知类型或无效值
                    console.warn('autoDisplayAt 类型不正确或为空:', typeof autoDisplayAtValue, autoDisplayAtValue);
                    removeTimeInfo = '';
                }
                
                // 如果成功解析了日期，计算剩余时间
                if (removeTimeInfo === '' && autoDisplayAt && !isNaN(autoDisplayAt.getTime())) {
                    // 计算24小时后的时间（从获取成就的时间开始计算）
                    const removeAt = new Date(autoDisplayAt.getTime() + 24 * 60 * 60 * 1000);
                    
                    // 获取当前 UTC+8 时区的时间
            const now = new Date();
                    const utc8Offset = 8 * 60 * 60 * 1000;
                    const nowUTC8 = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + utc8Offset);
                    
                    const diffMs = removeAt.getTime() - nowUTC8.getTime();
            
            if (diffMs > 0) {
                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                removeTimeInfo = `
                    <div class="text-xs text-blue-600 font-medium">
                        <span class="inline-flex items-center gap-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            自动卸下: ${hours}小时${minutes > 0 ? minutes + '分钟' : ''}后
                        </span>
                    </div>
                `;
            } else {
                removeTimeInfo = `
                    <div class="text-xs text-orange-600 font-medium">
                        <span class="inline-flex items-center gap-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            即将自动卸下
                        </span>
                    </div>
                `;
                    }
                }
            } catch (error) {
                console.error('计算卸下时间失败:', error, 'autoDisplayAt:', this.displayInfo?.autoDisplayAt);
                // 出错时不显示卸下时间，但不影响其他功能
                removeTimeInfo = '';
            }
        }
        
        // 如果是当前显示的成就，添加特殊样式
        const displayedClass = isDisplayed ? 'border-primary border-2' : '';
        const displayedBadge = isDisplayed ? `
            <div class="absolute top-2 right-2 px-2 py-0.5 bg-primary text-white text-xs font-medium rounded-full flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>已佩戴</span>
            </div>
        ` : '';
        
        return `
            <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors ${opacityClass} ${displayedClass} flex flex-col h-full relative">
                ${displayedBadge}
                <div class="flex items-start gap-2.5 sm:gap-3 mb-2.5 sm:mb-3 flex-shrink-0">
                    <div class="text-2xl sm:text-3xl flex-shrink-0">${emoji}</div>
                    <div class="flex-1 min-w-0">
                        <div class="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5 truncate">${achievement.name || achievement.id}</div>
                        ${removeTimeInfo ? `
                            <div class="mb-1.5">
                                ${removeTimeInfo.replace('mt-2', 'mt-0')}
                            </div>
                        ` : ''}
                        <div class="inline-block px-2 py-0.5 rounded text-xs font-medium border ${rarityColor}">
                            ${rarityName}
                        </div>
                    </div>
                </div>
                <div class="text-xs text-gray-600 dark:text-gray-400 mb-2.5 sm:mb-3 line-clamp-2 flex-1">
                    ${achievement.description || '无描述'}
                </div>
                ${unlocked ? `
                    ${isDisplayed ? `
                        <div class="mt-auto">
                            <button 
                                type="button"
                                class="set-display-btn w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium cursor-not-allowed"
                                disabled
                                data-achievement-id="${achievementId}"
                                data-achievement-name="${achievement.name || achievementId}"
                                data-achievement-rarity="${achievement.rarity || 'Common'}"
                            >
                                已设置为显示
                            </button>
                        </div>
                    ` : `
                        <button 
                            type="button"
                            class="set-display-btn w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-hover transition-colors mt-auto"
                            data-achievement-id="${achievementId}"
                            data-achievement-name="${achievement.name || achievementId}"
                            data-achievement-rarity="${achievement.rarity || 'Common'}"
                        >
                            设为显示
                        </button>
                    `}
                ` : `
                    <div class="text-xs text-gray-400 dark:text-gray-500 text-center py-1.5 sm:py-2 mt-auto">未解锁</div>
                `}
            </div>
        `;
    }
    
    async setDisplayAchievement(achievementId, achievementName, achievementRarity) {
        // 获取秘钥
        let secretKey;
        try {
            secretKey = await SecretKeyManager.get(this.app.userId, true);
        } catch (error) {
            // 用户取消输入
            return;
        }
        
        if (!secretKey) {
            Toast.show('请先设置秘钥', 'error');
            return;
        }
        
        if (!this.currentGroupId) {
            Toast.show('请选择群聊', 'error');
            return;
        }
        
        const groupId = this.currentGroupId;
        
        try {
            // 显示加载状态
            const btn = document.querySelector(`.set-display-btn[data-achievement-id="${achievementId}"]`);
            if (btn) {
                btn.disabled = true;
                btn.textContent = '设置中...';
            }
            
            const result = await api.setDisplayAchievement(this.app.userId, groupId, achievementId, secretKey);
            
            // 从API响应中获取当前显示的成就ID
            const newDisplayId = result?.current_display || result?.displayAchievementId || achievementId;
            
            if (newDisplayId) {
                this.currentDisplayAchievementId = newDisplayId;
            } else {
                this.currentDisplayAchievementId = achievementId;
            }
            
            Toast.show(`已设置为显示：${achievementName}`, 'success');
            
            // 重新加载成就列表以获取最新状态（从服务器获取最新数据）
            await this.loadAchievements();
        } catch (error) {
            console.error('设置显示成就失败:', error);
            console.error('错误详情:', error.message, error.stack);
            Toast.show('设置失败: ' + (error.message || '未知错误'), 'error');
            
            // 恢复按钮状态
            const btn = document.querySelector(`.set-display-btn[data-achievement-id="${achievementId}"]`);
            if (btn) {
                btn.disabled = false;
                btn.textContent = '设为显示';
            }
        }
    }
    
}
