/**
 * 管理页面 - 重构版
 */
import { AdminOverview } from './admin/AdminOverview.js';
import { AdminGroups } from './admin/AdminGroups.js';
import { AdminUsers } from './admin/AdminUsers.js';
import { AdminSettings } from './admin/AdminSettings.js';

export default class Admin {
    constructor(app) {
        this.app = app;
        this.groups = [];
        this.users = [];
        this.overview = null;
        this.secretKey = null;
        this.selectedGroupId = null;
        this.selectedGroupStats = null;
        this.selectedUserId = null;
        this.selectedUserData = null;
        this.groupRanking = null;
        // 搜索和筛选状态
        this.groupSearchQuery = '';
        this.userSearchQuery = '';
        this.groupSortBy = 'name';
        this.userSortBy = 'name';
        // 加载状态
        this.loading = {
            overview: false,
            groups: false,
            users: false
        };
        // 配置数据
        this.globalConfig = null;
        this.configChanged = false;
        
        // 初始化模块
        this.overviewModule = new AdminOverview(this);
        this.groupsModule = new AdminGroups(this);
        this.usersModule = new AdminUsers(this);
        this.settingsModule = new AdminSettings(this);
    }
    
    async render() {
        return `
            <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
                <!-- 顶部导航栏（标签页样式） -->
                <div class="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <div class="px-4 sm:px-6 lg:px-8">
                        <div class="flex items-center justify-between h-16">
                            <!-- 左侧导航标签 -->
                            <nav class="flex items-end -mb-px space-x-1" role="tablist">
                                <button 
                                    id="tabOverview" 
                                    class="admin-tab-btn active relative px-5 py-3 text-sm font-medium transition-all duration-200 bg-white dark:bg-gray-800 text-primary border-b-2 border-primary"
                                    role="tab"
                                    aria-selected="true"
                                >
                                    <span class="flex items-center space-x-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                        </svg>
                                        <span>概览</span>
                                    </span>
                                </button>
                                <button 
                                    id="tabGroups" 
                                    class="admin-tab-btn relative px-5 py-3 text-sm font-medium transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 border-b-2 border-transparent"
                                    role="tab"
                                    aria-selected="false"
                                >
                                    <span class="flex items-center space-x-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                        </svg>
                                        <span>群管理</span>
                                    </span>
                                </button>
                                <button 
                                    id="tabUsers" 
                                    class="admin-tab-btn relative px-5 py-3 text-sm font-medium transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 border-b-2 border-transparent"
                                    role="tab"
                                    aria-selected="false"
                                >
                                    <span class="flex items-center space-x-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                                        </svg>
                                        <span>用户管理</span>
                                    </span>
                                </button>
                                <button 
                                    id="tabSettings" 
                                    class="admin-tab-btn relative px-5 py-3 text-sm font-medium transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 border-b-2 border-transparent"
                                    role="tab"
                                    aria-selected="false"
                                >
                                    <span class="flex items-center space-x-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                        </svg>
                                        <span>系统设置</span>
                                    </span>
                                </button>
                            </nav>
                            <!-- 右侧操作按钮 -->
                            <div class="flex items-center space-x-3">
                                <button 
                                    id="refreshAllBtn" 
                                    class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium flex items-center space-x-2 shadow-sm hover:shadow-md"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                    </svg>
                                    <span>刷新全部</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>

                <!-- 标签页内容区域 -->
                <div class="flex-1 overflow-hidden flex flex-col bg-white dark:bg-gray-800">
                    <!-- 概览标签页 -->
                    <div id="contentOverview" class="tab-content h-full overflow-y-auto">
                        <div class="px-4 sm:px-6 lg:px-8 py-6">
                            <!-- 统计卡片 -->
                            <div class="mb-8">
                                <div class="flex items-center justify-between mb-6">
                                    <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">数据概览</h2>
                                    </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                                    <!-- 总群数 -->
                                    <div class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex items-center justify-between mb-2">
                                            <p class="text-xs font-medium text-blue-600 dark:text-blue-400">总群数</p>
                                            <div class="w-8 h-8 bg-blue-500/20 dark:bg-blue-500/30 rounded-lg flex items-center justify-center">
                                                <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                        </svg>
                                    </div>
                                </div>
                                        <p id="totalGroups" class="text-2xl font-bold text-blue-900 dark:text-blue-100">-</p>
                            </div>
                            
                                    <!-- 总用户数 -->
                                    <div class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-4 border border-green-200 dark:border-green-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex items-center justify-between mb-2">
                                            <p class="text-xs font-medium text-green-600 dark:text-green-400">总用户数</p>
                                            <div class="w-8 h-8 bg-green-500/20 dark:bg-green-500/30 rounded-lg flex items-center justify-center">
                                                <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                                        </svg>
                                    </div>
                                </div>
                                        <p id="totalUsers" class="text-2xl font-bold text-green-900 dark:text-green-100">-</p>
                            </div>
                            
                                    <!-- 总消息数 -->
                                    <div class="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-4 border border-purple-200 dark:border-purple-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex items-center justify-between mb-2">
                                            <p class="text-xs font-medium text-purple-600 dark:text-purple-400">总消息数</p>
                                            <div class="w-8 h-8 bg-purple-500/20 dark:bg-purple-500/30 rounded-lg flex items-center justify-center">
                                                <svg class="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                                        </svg>
                                    </div>
                                </div>
                                        <p id="totalMessages" class="text-2xl font-bold text-purple-900 dark:text-purple-100">-</p>
                            </div>
                                    
                                    <!-- 今日消息 -->
                                    <div class="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl p-4 border border-orange-200 dark:border-orange-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex items-center justify-between mb-2">
                                            <p class="text-xs font-medium text-orange-600 dark:text-orange-400">今日消息</p>
                                            <div class="w-8 h-8 bg-orange-500/20 dark:bg-orange-500/30 rounded-lg flex items-center justify-center">
                                                <svg class="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <p id="todayMessages" class="text-2xl font-bold text-orange-900 dark:text-orange-100">-</p>
                        </div>

                                    <!-- 活跃群数 -->
                                    <div class="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/30 dark:to-pink-800/30 rounded-xl p-4 border border-pink-200 dark:border-pink-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex items-center justify-between mb-2">
                                            <p class="text-xs font-medium text-pink-600 dark:text-pink-400">活跃群数</p>
                                            <div class="w-8 h-8 bg-pink-500/20 dark:bg-pink-500/30 rounded-lg flex items-center justify-center">
                                                <svg class="w-4 h-4 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <p id="activeGroups" class="text-2xl font-bold text-pink-900 dark:text-pink-100">-</p>
                            </div>

                                    <!-- 今日新增用户 -->
                                    <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-xl p-4 border border-indigo-200 dark:border-indigo-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex items-center justify-between mb-2">
                                            <p class="text-xs font-medium text-indigo-600 dark:text-indigo-400">今日新增用户</p>
                                            <div class="w-8 h-8 bg-indigo-500/20 dark:bg-indigo-500/30 rounded-lg flex items-center justify-center">
                                                <svg class="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                                                </svg>
                                    </div>
                                        </div>
                                        <p id="todayNewUsers" class="text-2xl font-bold text-indigo-900 dark:text-indigo-100">-</p>
                                </div>

                                    <!-- 平均消息/群 -->
                                    <div class="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-800/30 rounded-xl p-4 border border-teal-200 dark:border-teal-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex items-center justify-between mb-2">
                                            <p class="text-xs font-medium text-teal-600 dark:text-teal-400">平均消息/群</p>
                                            <div class="w-8 h-8 bg-teal-500/20 dark:bg-teal-500/30 rounded-lg flex items-center justify-center">
                                                <svg class="w-4 h-4 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                                </svg>
                                                </div>
                                            </div>
                                        <p id="avgMessagesPerGroup" class="text-2xl font-bold text-teal-900 dark:text-teal-100">-</p>
                                        </div>
                                        
                                    <!-- 平均消息/用户 -->
                                    <div class="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/30 rounded-xl p-4 border border-cyan-200 dark:border-cyan-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex items-center justify-between mb-2">
                                            <p class="text-xs font-medium text-cyan-600 dark:text-cyan-400">平均消息/用户</p>
                                            <div class="w-8 h-8 bg-cyan-500/20 dark:bg-cyan-500/30 rounded-lg flex items-center justify-center">
                                                <svg class="w-4 h-4 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                                    </svg>
                                            </div>
                                        </div>
                                        <p id="avgMessagesPerUser" class="text-2xl font-bold text-cyan-900 dark:text-cyan-100">-</p>
                                    </div>
                                </div>
                                                </div>
                                                
                            <!-- 图表区域 -->
                            <div class="space-y-6">
                                <div class="flex items-center justify-between">
                                    <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">数据图表</h2>
                                                            </div>
                                
                                <!-- 第一行图表 -->
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <!-- 消息趋势图 -->
                                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300">
                                        <div class="flex items-center justify-between mb-4">
                                            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">消息趋势（近7天）</h3>
                                            <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                                                <span>消息数</span>
                                            </div>
                                        </div>
                                        <div id="messageTrendChart" style="width: 100%; height: 360px;"></div>
                                    </div>
                                    
                                    <!-- 群组活跃度分布 -->
                                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300">
                                        <div class="flex items-center justify-between mb-4">
                                            <div class="flex items-center gap-2">
                                                <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">群组活跃度分布</h3>
                                                <span class="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">Top 10</span>
                                            </div>
                                            <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                                                <span>消息数</span>
                                            </div>
                                        </div>
                                        <div id="groupActivityChart" style="width: 100%; height: 360px;"></div>
                                                        </div>
                                                    </div>
                                                    
                                <!-- 第二行图表 -->
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <!-- 消息密度散点图 -->
                                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300">
                                        <div class="flex items-center justify-between mb-4">
                                            <div class="flex items-center gap-2">
                                                <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">消息密度分布</h3>
                                                <span class="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">所有群组</span>
                                            </div>
                                            <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                <div class="w-2 h-2 rounded-full bg-purple-500"></div>
                                                <span>群组</span>
                                            </div>
                                        </div>
                                        <div id="messageDensityChart" style="width: 100%; height: 360px;"></div>
                                    </div>
                                    
                                    <!-- 群组增长趋势 -->
                                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300">
                                        <div class="flex items-center justify-between mb-4">
                                            <div class="flex items-center gap-2">
                                                <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">群组增长趋势</h3>
                                                <span class="px-2 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full">近7天</span>
                                            </div>
                                            <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                <div class="w-2 h-2 rounded-full bg-orange-500"></div>
                                                <span>新增群组</span>
                                            </div>
                                        </div>
                                        <div id="groupGrowthChart" style="width: 100%; height: 360px;"></div>
                                    </div>
                                </div>
                            </div>
                                                        </div>
                                                    </div>
                                                    
                                <!-- 群管理标签页 -->
                    <div id="contentGroups" class="tab-content hidden h-full overflow-hidden flex flex-col">
                        <div class="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4 lg:gap-6 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                                        <!-- 左侧：群聊列表 -->
                            <div class="flex-shrink-0 lg:w-80 xl:w-96 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <!-- 搜索和筛选栏 -->
                                <div class="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 space-y-3 bg-gray-50 dark:bg-gray-800/50">
                                    <div class="relative">
                                        <input 
                                            type="text" 
                                            id="groupSearchInput" 
                                            placeholder="搜索群聊名称或ID..." 
                                            class="w-full px-4 py-2.5 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 text-sm transition-all"
                                                            >
                                        <svg class="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                                                </svg>
                                                        </div>
                                    <div class="flex items-center space-x-2">
                                        <div class="relative flex-1">
                                            <select 
                                                id="groupSortSelect" 
                                                class="select-custom w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-gray-800 dark:text-gray-200 text-sm appearance-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600"
                                            >
                                                <option value="name">按名称</option>
                                                <option value="messages">按消息数</option>
                                                <option value="users">按用户数</option>
                                            </select>
                                        </div>
                                        <span id="groupListCount" class="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">-</span>
                                            </div>
                                        </div>
                                <!-- 群列表 -->
                                <div class="flex-1 overflow-y-auto p-4">
                                    <div id="groupsList" class="space-y-2">
                                        <div class="loading-spinner">
                                            <div class="spinner"></div>
                                            <p>加载中...</p>
                                        </div>
                                    </div>
                                                        </div>
                                                    </div>
                                                    
                            <!-- 右侧：群详情和管理 -->
                            <div class="flex-1 overflow-hidden flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                <div id="groupDetailPanel" class="flex-1 overflow-y-auto">
                                    <!-- 空状态 -->
                                    <div class="text-center py-16 px-4">
                                        <div class="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                            <svg class="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                                            </svg>
                                                        </div>
                                        <p class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">选择一个群聊</p>
                                        <p class="text-sm text-gray-500 dark:text-gray-400">从左侧列表中选择一个群聊以查看详细信息</p>
                                                    </div>
                                                    
                                    <!-- 群详情内容 -->
                                    <div id="groupDetailContent" class="hidden">
                                        <!-- 顶部操作栏 -->
                                        <div class="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                                            <div class="flex-1 min-w-0">
                                                <h3 id="groupDetailTitle" class="text-xl font-bold text-gray-900 dark:text-gray-100 truncate"></h3>
                                                <p id="groupDetailId" class="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1"></p>
                                            </div>
                                            <div class="flex items-center space-x-2 ml-4">
                                                            <button 
                                                                id="refreshRankingBtn" 
                                                    class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                    title="刷新排名"
                                                            >
                                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                                                </svg>
                                                            </button>
                                                            <button 
                                                                id="refreshGroupStatsBtn" 
                                                    class="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                                                    title="刷新统计"
                                                            >
                                                    刷新
                                                            </button>
                                                            <button 
                                                                id="clearGroupStatsBtn" 
                                                    class="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                                                    title="清除数据"
                                                            >
                                                    清除
                                                            </button>
                                                        </div>
                                                    </div>
                                        
                                        <div class="p-6">
                                            <!-- 统计卡片 -->
                                            <div class="grid grid-cols-3 gap-4 mb-6">
                                                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">群成员</p>
                                                    <p id="groupUserCount" class="text-2xl font-bold text-gray-900 dark:text-gray-100">-</p>
                                                </div>
                                                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">总消息数</p>
                                                    <p id="groupMessageCount" class="text-2xl font-bold text-gray-900 dark:text-gray-100">-</p>
                                            </div>
                                                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">总字数</p>
                                                    <p id="groupWordCount" class="text-2xl font-bold text-gray-900 dark:text-gray-100">-</p>
                                                </div>
                                            </div>
                                            
                                            <!-- 群内用户排名 -->
                                            <div>
                                                <div class="flex items-center justify-between mb-3">
                                                    <h4 class="text-base font-semibold text-gray-900 dark:text-gray-100">群内用户排名</h4>
                                                    <span class="text-xs text-gray-500 dark:text-gray-400">Top 10</span>
                                                </div>
                                                <div id="groupRankingList" class="space-y-2 max-h-[500px] overflow-y-auto">
                                                    <div class="loading-spinner">
                                                        <div class="spinner"></div>
                                                        <p>加载中...</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- 用户管理标签页 -->
                    <div id="contentUsers" class="tab-content hidden h-full overflow-hidden flex flex-col">
                        <div class="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4 lg:gap-6 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                                        <!-- 左侧：用户列表 -->
                            <div class="flex-shrink-0 lg:w-80 xl:w-96 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <!-- 搜索和筛选栏 -->
                                <div class="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 space-y-3 bg-gray-50 dark:bg-gray-800/50">
                                    <div class="relative">
                                        <input 
                                            type="text" 
                                            id="userSearchInput" 
                                            placeholder="搜索用户名称或ID..." 
                                            class="w-full px-4 py-2.5 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 text-sm transition-all"
                                        >
                                        <svg class="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                        </svg>
                                                </div>
                                    <div class="flex items-center space-x-2">
                                        <div class="relative flex-1">
                                            <select 
                                                id="userSortSelect" 
                                                class="select-custom w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-gray-800 dark:text-gray-200 text-sm appearance-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600"
                                            >
                                                <option value="name">按名称</option>
                                                <option value="role">按角色</option>
                                                <option value="groups">按群数</option>
                                            </select>
                                        </div>
                                        <span id="userCount" class="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">-</span>
                                    </div>
                                </div>
                                <!-- 用户列表 -->
                                <div class="flex-1 overflow-y-auto p-4">
                                    <div id="usersList" class="space-y-2">
                                        <div class="loading-spinner">
                                            <div class="spinner"></div>
                                            <p>加载中...</p>
                                        </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- 右侧：用户详情 -->
                            <div class="flex-1 overflow-hidden flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                <div id="userDetailPanel" class="flex-1 overflow-y-auto">
                                    <!-- 空状态 -->
                                    <div class="text-center py-16 px-4">
                                        <div class="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                            <svg class="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                                    </svg>
                                        </div>
                                        <p class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">选择一个用户</p>
                                        <p class="text-sm text-gray-500 dark:text-gray-400">从左侧列表中选择一个用户以查看详细信息</p>
                                                </div>
                                                
                                    <!-- 用户详情内容 -->
                                                <div id="userDetailContent" class="hidden">
                                        <!-- 顶部操作栏 -->
                                        <div class="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                                            <div class="flex-1 min-w-0 flex items-center space-x-3">
                                                <div class="flex-1 min-w-0">
                                                    <h3 id="userDetailTitle" class="text-xl font-bold text-gray-900 dark:text-gray-100 truncate"></h3>
                                                    <p id="userDetailId" class="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1"></p>
                                                </div>
                                                <span id="userDetailRoleBadge" class="px-3 py-1 text-sm font-semibold rounded-full flex-shrink-0"></span>
                                            </div>
                                            <div class="flex items-center space-x-2 ml-4">
                                                <div class="relative">
                                                    <select 
                                                        id="userRoleSelect" 
                                                        class="select-custom px-3 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-gray-800 dark:text-gray-200 appearance-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600"
                                                    >
                                                        <option value="user">普通用户</option>
                                                        <option value="admin">管理员</option>
                                                    </select>
                                                </div>
                                                <button 
                                                    id="updateUserRoleBtn" 
                                                    class="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                                                    title="更新权限"
                                                >
                                                    更新
                                                </button>
                                                <button 
                                                    id="clearUserDataBtn" 
                                                    class="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                                                    title="清除数据"
                                                >
                                                    清除
                                                </button>
                                            </div>
                                                        </div>
                                                        
                                        <div class="p-6">
                                            <!-- 统计卡片 -->
                                            <div class="grid grid-cols-4 gap-4 mb-6">
                                                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">用户ID</p>
                                                    <p id="userDetailIdCard" class="text-sm font-semibold text-gray-900 dark:text-gray-100 break-all">-</p>
                                                            </div>
                                                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">所在群数</p>
                                                    <p id="userGroupCount" class="text-2xl font-bold text-gray-900 dark:text-gray-100">-</p>
                                                            </div>
                                                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">总消息数</p>
                                                    <p id="userTotalMessages" class="text-2xl font-bold text-gray-900 dark:text-gray-100">-</p>
                                                            </div>
                                                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">总字数</p>
                                                    <p id="userTotalWords" class="text-2xl font-bold text-gray-900 dark:text-gray-100">-</p>
                                                            </div>
                                                        </div>
                                                        
                                                        <!-- 时间信息 -->
                                            <div class="grid grid-cols-2 gap-4 mb-6">
                                                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">创建时间</p>
                                                    <p id="userCreatedAt" class="text-sm font-semibold text-gray-900 dark:text-gray-100">-</p>
                                                            </div>
                                                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">最后更新</p>
                                                    <p id="userUpdatedAt" class="text-sm font-semibold text-gray-900 dark:text-gray-100">-</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <!-- 用户所在群列表 -->
                                            <div>
                                                <div class="flex items-center justify-between mb-3">
                                                    <h4 class="text-base font-semibold text-gray-900 dark:text-gray-100">所在群聊</h4>
                                                    <span id="userGroupsCount" class="text-xs text-gray-500 dark:text-gray-400"></span>
                                                        </div>
                                                <div id="userGroupsList" class="space-y-2 max-h-[500px] overflow-y-auto">
                                                    <div class="loading-spinner">
                                                        <div class="spinner"></div>
                                                        <p>加载中...</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                                                        </div>
                                                    </div>
                                                    
                    <!-- 系统设置标签页 -->
                    <div id="contentSettings" class="tab-content hidden h-full overflow-y-auto">
                        <div class="px-4 sm:px-6 lg:px-8 py-6">
                            <div class="flex items-center justify-between mb-6">
                                <div>
                                    <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">系统设置</h2>
                                    <p id="configStatus" class="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden"></p>
                                                                </div>
                                                                <button 
                                    id="saveConfigBtn" 
                                    class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                    <svg id="saveConfigIcon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                                                    </svg>
                                    <span id="saveConfigText">保存配置</span>
                                                                </button>
                                                            </div>
                                                            
                            <!-- 全局设置 -->
                            <div class="mb-6">
                                <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                                        <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                                    </svg>
                                        <span>全局设置</span>
                                    </h3>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div>
                                                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">启用统计</p>
                                                <p class="text-xs text-gray-500 dark:text-gray-400">启用消息统计功能</p>
                                                                </div>
                                            <label class="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="config-global-enableStatistics" class="sr-only peer">
                                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                        
                                        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div>
                                                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">记录消息</p>
                                                <p class="text-xs text-gray-500 dark:text-gray-400">记录用户消息</p>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="config-global-recordMessage" class="sr-only peer">
                                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                        
                                        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div>
                                                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">启用字数统计</p>
                                                <p class="text-xs text-gray-500 dark:text-gray-400">统计消息字数</p>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="config-global-enableWordCount" class="sr-only peer">
                                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                        
                                        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div>
                                                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">调试日志</p>
                                                <p class="text-xs text-gray-500 dark:text-gray-400">启用调试日志输出</p>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="config-global-debugLog" class="sr-only peer">
                                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                        
                                        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div>
                                                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">启用备份</p>
                                                <p class="text-xs text-gray-500 dark:text-gray-400">自动备份数据</p>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="config-global-enableBackup" class="sr-only peer">
                                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                        
                                        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div>
                                                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">启用完成标记</p>
                                                <p class="text-xs text-gray-500 dark:text-gray-400">用于大文件处理时的完成标记</p>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="config-global-useOkMarker" class="sr-only peer">
                                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 显示设置 -->
                            <div class="mb-6">
                                <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                                        <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                                                    </svg>
                                        <span>显示设置</span>
                                    </h3>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">显示数量</label>
                                            <input type="number" id="config-display-displayCount" min="1" max="100" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors">
                                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">排行榜显示数量 (1-100)</p>
                                                            </div>
                                        
                                        <div>
                                            <label class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">全局统计显示数量</label>
                                            <input type="number" id="config-display-globalStatsDisplayCount" min="1" max="100" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors">
                                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">全局统计显示数量 (1-100)</p>
                                                        </div>
                                        
                                        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div>
                                                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">使用转发</p>
                                                <p class="text-xs text-gray-500 dark:text-gray-400">使用合并转发消息</p>
                                                    </div>
                                            <label class="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="config-display-useForward" class="sr-only peer">
                                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                            </label>
                                                </div>
                                        
                                        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div>
                                                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">使用图片</p>
                                                <p class="text-xs text-gray-500 dark:text-gray-400">使用图片渲染</p>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="config-display-usePicture" class="sr-only peer">
                                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 消息设置 -->
                            <div class="mb-6">
                                <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                                        <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                                        </svg>
                                        <span>消息设置</span>
                                    </h3>
                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div>
                                                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">仅文本消息</p>
                                                <p class="text-xs text-gray-500 dark:text-gray-400">只统计文本消息</p>
                        </div>
                                            <label class="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="config-message-onlyTextMessages" class="sr-only peer">
                                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                            </label>
                    </div>
                                        
                                        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div>
                                                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">统计机器人消息</p>
                                                <p class="text-xs text-gray-500 dark:text-gray-400">统计机器人发送的消息</p>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="config-message-countBotMessages" class="sr-only peer">
                                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                        
                                        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div>
                                                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">每条消息更新排名</p>
                                                <p class="text-xs text-gray-500 dark:text-gray-400">实时更新排行榜</p>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="config-message-updateRankingOnEveryMessage" class="sr-only peer">
                                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 成就设置 -->
                            <div class="mb-6">
                                <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                                        <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                                        </svg>
                                        <span>成就设置</span>
                                    </h3>
                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div>
                                                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">启用成就</p>
                                                <p class="text-xs text-gray-500 dark:text-gray-400">启用成就系统</p>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="config-achievements-enabled" class="sr-only peer">
                                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                        
                                        <div>
                                            <label class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">检查间隔（秒）</label>
                                            <input type="number" id="config-achievements-checkInterval" min="0" step="1" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors">
                                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">0表示禁用定时检查</p>
                                        </div>
                                        
                                        <div>
                                            <label class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">排行榜显示数量</label>
                                            <input type="number" id="config-achievements-rankingDisplayCount" min="1" max="100" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors">
                                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">成就排行榜显示数量 (1-100)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 数据存储设置 -->
                            <div class="mb-6">
                                <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                                        <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path>
                                        </svg>
                                        <span>数据存储设置</span>
                                    </h3>
                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">备份保留数量</label>
                                            <input type="number" id="config-dataStorage-backupRetentionCount" min="1" max="100" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors">
                                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">(1-100)</p>
                                        </div>
                                        
                                        <div>
                                            <label class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">锁定超时（毫秒）</label>
                                            <input type="number" id="config-dataStorage-lockTimeout" min="1000" step="1000" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors">
                                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">≥ 1000ms</p>
                                        </div>
                                        
                                        <div>
                                            <label class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">锁定过期（毫秒）</label>
                                            <input type="number" id="config-dataStorage-lockExpiration" min="5000" step="1000" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors">
                                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">≥ 5000ms</p>
                                        </div>
                                        
                                        <div>
                                            <label class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">最大重试次数</label>
                                            <input type="number" id="config-dataStorage-maxRetries" min="1" max="10" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors">
                                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">(1-10)</p>
                                        </div>
                                        
                                        <div>
                                            <label class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">重试延迟基数（毫秒）</label>
                                            <input type="number" id="config-dataStorage-retryDelayBase" min="50" step="50" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors">
                                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">≥ 50ms</p>
                                        </div>
                                        
                                        <div>
                                            <label class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">最大重试延迟（毫秒）</label>
                                            <input type="number" id="config-dataStorage-maxRetryDelay" min="100" step="100" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors">
                                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">≥ 100ms</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 背景服务器设置 -->
                            <div>
                                <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                                        <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path>
                                        </svg>
                                        <span>背景服务器设置</span>
                                    </h3>
                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">主机地址</label>
                                            <input type="text" id="config-backgroundServer-host" placeholder="0.0.0.0" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors">
                                        </div>
                                        
                                        <div>
                                            <label class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">端口</label>
                                            <input type="number" id="config-backgroundServer-port" min="1" max="65535" placeholder="39999" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors">
                                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">(1-65535)</p>
                                        </div>
                                        
                                        <div>
                                            <label class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">协议</label>
                                            <div class="relative">
                                                <select id="config-backgroundServer-protocol" class="select-custom w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-gray-800 dark:text-gray-200 text-sm appearance-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600">
                                                    <option value="">请选择协议</option>
                                                    <option value="http">HTTP</option>
                                                    <option value="https">HTTPS</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">域名</label>
                                            <input type="text" id="config-backgroundServer-domain" placeholder="example.com" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async mounted() {
        await this.initSecretKey();
        this.setupEventListeners();
        await this.loadData();
        
        // 延迟初始化自定义下拉框，避免阻塞页面渲染
        this.initCustomSelectsDelayed();
        
        // 延迟初始化图表，确保 DOM 已渲染
        setTimeout(() => {
            this.overviewModule.initCharts();
        }, 500);
    }
    
    initCustomSelectsDelayed() {
        // 使用 requestAnimationFrame 优化初始化时机
        requestAnimationFrame(() => {
            this.initCustomSelectsForActiveTab();
        });
    }
    
    initCustomSelectsForActiveTab() {
        // 只初始化当前可见标签页的下拉框
        const activeTab = document.querySelector('.tab-btn.active');
        if (!activeTab) return;
        
        const tabId = activeTab.id.replace('tab', '');
        const activeContent = document.getElementById(`content${tabId}`);
        if (!activeContent || !window.CustomSelect) return;
        
        // 只初始化当前可见内容区域的下拉框
        const selects = activeContent.querySelectorAll('select.select-custom:not([data-custom-select-initialized])');
        if (selects.length === 0) return;
        
        // 批量初始化，使用 requestAnimationFrame 优化性能
        // 分批处理，避免一次性处理太多导致卡顿
        const batchSize = 5;
        let index = 0;
        
        const initBatch = () => {
            const end = Math.min(index + batchSize, selects.length);
            for (let i = index; i < end; i++) {
                const select = selects[i];
                if (select.dataset.customSelectInitialized === 'true') continue;
                
                try {
                    select.dataset.customSelectInitialized = 'true';
                    select._customSelectInstance = new window.CustomSelect(select);
                } catch (error) {
                    console.warn('初始化下拉框失败:', error);
                }
            }
            
            index = end;
            if (index < selects.length) {
                requestAnimationFrame(initBatch);
            }
        };
        
        requestAnimationFrame(initBatch);
    }
    
    async initSecretKey() {
        try {
            const verifiedKey = sessionStorage.getItem(`admin_verified_${this.app.userId}`);
            if (verifiedKey) {
                this.secretKey = verifiedKey;
                return;
            }
            
            const localKey = await SecretKeyManager.get(this.app.userId, false);
            if (localKey) {
                try {
                    const response = await api.validateSecretKey(this.app.userId, localKey);
                    if (response.success && response.data?.valid) {
                        this.secretKey = localKey;
                        sessionStorage.setItem(`admin_verified_${this.app.userId}`, localKey);
                        return;
                    }
                } catch (error) {
                    console.warn('验证本地秘钥失败:', error);
                }
            }
            
            await this.verifyAdminAccess();
        } catch (error) {
            console.error('获取秘钥失败:', error);
            Toast.show('获取秘钥失败，请先设置秘钥', 'error');
        }
    }
    
    async verifyAdminAccess() {
        return new Promise((resolve) => {
            window.Modal.show('管理员身份验证', `
                <div class="space-y-4">
                    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div class="flex items-start gap-3">
                            <svg class="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                            </svg>
                            <div class="flex-1">
                                <p class="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">需要管理员权限</p>
                                <p class="text-xs text-blue-700 dark:text-blue-400">请输入您的管理员秘钥以访问管理功能</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">管理员秘钥</label>
                        <input type="password" id="adminSecretKeyInput" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500" placeholder="请输入管理员秘钥">
                    </div>
                </div>
            `, `
                <button class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium" id="confirmAdminBtn">确认验证</button>
                <button class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium" onclick="Modal.hide()">取消</button>
            `);
            
            setTimeout(() => {
                const confirmBtn = document.getElementById('confirmAdminBtn');
                const keyInput = document.getElementById('adminSecretKeyInput');
                
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
                            
                            const response = await api.validateSecretKey(this.app.userId, secretKey);
                            
                            if (!response.success || !response.data?.valid) {
                                Toast.show(response.message || '秘钥验证失败', 'error');
                                confirmBtn.disabled = false;
                                confirmBtn.textContent = '确认验证';
                                return;
                            }
                            
                            Toast.show('秘钥验证成功', 'success');
                            this.secretKey = secretKey;
                            sessionStorage.setItem(`admin_verified_${this.app.userId}`, secretKey);
                            window.Modal.hide();
                            await this.loadData();
                            resolve();
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
    
    setupEventListeners() {
        // 刷新全部按钮
        const refreshAllBtn = document.getElementById('refreshAllBtn');
        if (refreshAllBtn) {
            refreshAllBtn.addEventListener('click', () => this.loadData());
        }
        
        // 标签页切换
        const tabs = ['Overview', 'Groups', 'Users', 'Settings'];
        tabs.forEach(tab => {
            const tabBtn = document.getElementById(`tab${tab}`);
            const content = document.getElementById(`content${tab}`);
            if (tabBtn && content) {
                tabBtn.addEventListener('click', () => this.switchTab(tab));
            }
        });
        
        // 系统设置按钮
        const managePermissionsBtn = document.getElementById('managePermissionsBtn');
        if (managePermissionsBtn) {
            managePermissionsBtn.addEventListener('click', () => {
                this.switchTab('Users');
            });
        }
        
        const optimizeDbBtn = document.getElementById('optimizeDbBtn');
        if (optimizeDbBtn) {
            optimizeDbBtn.addEventListener('click', () => {
                Toast.show('优化数据库功能待实现', 'info');
            });
        }
        
        const clearCacheBtn = document.getElementById('clearCacheBtn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => {
                Toast.show('清理缓存功能待实现', 'info');
            });
        }
        
        // 保存配置按钮
        const saveConfigBtn = document.getElementById('saveConfigBtn');
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => this.settingsModule.saveGlobalConfig());
        }
        
        // 群搜索
        const groupSearchInput = document.getElementById('groupSearchInput');
        if (groupSearchInput) {
            groupSearchInput.addEventListener('input', (e) => {
                this.groupSearchQuery = e.target.value.toLowerCase();
                this.groupsModule.updateGroupsList();
            });
        }
        
        // 群排序
        const groupSortSelect = document.getElementById('groupSortSelect');
        if (groupSortSelect) {
            groupSortSelect.addEventListener('change', (e) => {
                this.groupSortBy = e.target.value;
                this.groupsModule.updateGroupsList();
            });
        }
        
        // 用户搜索
        const userSearchInput = document.getElementById('userSearchInput');
        if (userSearchInput) {
            userSearchInput.addEventListener('input', (e) => {
                this.userSearchQuery = e.target.value.toLowerCase();
                this.usersModule.updateUsersList();
            });
        }
        
        // 用户排序
        const userSortSelect = document.getElementById('userSortSelect');
        if (userSortSelect) {
            userSortSelect.addEventListener('change', (e) => {
                this.userSortBy = e.target.value;
                this.usersModule.updateUsersList();
            });
        }
        
        // 刷新统计按钮
        const refreshStatsBtn = document.getElementById('refreshGroupStatsBtn');
        if (refreshStatsBtn) {
            refreshStatsBtn.addEventListener('click', () => this.groupsModule.refreshGroupStats());
        }
        
        // 刷新排名按钮
        const refreshRankingBtn = document.getElementById('refreshRankingBtn');
        if (refreshRankingBtn) {
            refreshRankingBtn.addEventListener('click', () => {
                if (this.selectedGroupId) {
                    this.groupsModule.loadGroupRanking(this.selectedGroupId);
                }
            });
        }
        
        // 清除统计按钮
        const clearStatsBtn = document.getElementById('clearGroupStatsBtn');
        if (clearStatsBtn) {
            clearStatsBtn.addEventListener('click', () => this.groupsModule.clearGroupStats());
        }
        
        // 清除用户数据按钮
        const clearUserDataBtn = document.getElementById('clearUserDataBtn');
        if (clearUserDataBtn) {
            clearUserDataBtn.addEventListener('click', () => this.usersModule.clearUserData());
        }
        
        // 更新用户权限按钮
        const updateUserRoleBtn = document.getElementById('updateUserRoleBtn');
        if (updateUserRoleBtn) {
            updateUserRoleBtn.addEventListener('click', () => this.usersModule.updateUserRole());
        }
    }
    
    async switchTab(tabName) {
        // 更新按钮状态（标签页样式）
        document.querySelectorAll('.admin-tab-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-white', 'dark:bg-gray-800', 'text-primary', 'border-primary');
            btn.classList.add('text-gray-600', 'dark:text-gray-400', 'border-transparent');
            btn.setAttribute('aria-selected', 'false');
        });
        
        const activeBtn = document.getElementById(`tab${tabName}`);
        if (activeBtn) {
            activeBtn.classList.add('active', 'bg-white', 'dark:bg-gray-800', 'text-primary', 'border-primary');
            activeBtn.classList.remove('text-gray-600', 'dark:text-gray-400', 'border-transparent');
            activeBtn.setAttribute('aria-selected', 'true');
        }

        // 更新内容显示
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        const activeContent = document.getElementById(`content${tabName}`);
        if (activeContent) {
            activeContent.classList.remove('hidden');
        }

        // 加载对应数据
        if (tabName === 'Overview') {
            // 如果概览数据未加载，先加载数据
            if (!this.overview) {
                await this.overviewModule.loadOverview();
            } else {
                // 如果数据已加载，直接更新图表
                this.overviewModule.updateOverview();
            }
            // 初始化并更新图表
            setTimeout(() => {
                this.overviewModule.initCharts();
                if (this.overview) {
                    this.overviewModule.updateCharts();
            }
            }, 200);
        } else if (tabName === 'Groups' && this.groups.length === 0) {
            await this.groupsModule.loadGroups();
        } else if (tabName === 'Users' && this.users.length === 0) {
            await this.usersModule.loadUsers();
        } else if (tabName === 'Settings') {
            this.overviewModule.updateSettingsStats();
            // 先初始化下拉框，确保在设置值之前下拉框已经准备好
            this.initCustomSelectsForActiveTab();
            
            if (!this.globalConfig) {
                await this.settingsModule.loadGlobalConfig();
            } else {
                // 如果配置已加载，确保下拉框显示正确的值
                requestAnimationFrame(() => {
                    const protocolSelect = document.getElementById('config-backgroundServer-protocol');
                    if (protocolSelect && window.updateCustomSelect) {
                        window.updateCustomSelect(protocolSelect);
                    }
                });
            }
            // 确保在加载配置后设置监听器（只设置一次）
            requestAnimationFrame(() => {
                this.settingsModule.setupConfigChangeListeners();
            });
                        } else {
            // 其他标签页切换时，初始化当前标签页的下拉框
            this.initCustomSelectsForActiveTab();
        }
    }
    
    async loadData() {
        const refreshBtn = document.getElementById('refreshAllBtn');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div><span>刷新中...</span>';
            }
        
        try {
        await Promise.all([
            this.overviewModule.loadOverview(),
            this.groupsModule.loadGroups(),
            this.usersModule.loadUsers()
        ]);
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg><span>刷新全部</span>';
            }
        }
        }
    
}
