/**
 * 管理页面 - 重构版
 */
import { AdminOverview } from './admin/AdminOverview.js';
import { AdminGroups } from './admin/AdminGroups.js';
import { AdminUsers } from './admin/AdminUsers.js';
import { AdminStatistics } from './admin/AdminStatistics.js';
import { AdminAchievements } from './admin/AdminAchievements.js';
import { ChartCard, Button, Input, Select, SearchInput, Badge, Tabs } from '/assets/js/components/index.js';

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
            users: false,
            statistics: false,
            achievements: false
        };
        // 配置数据
        this.globalConfig = null;
        this.configChanged = false;
        
        // 初始化模块
        this.overviewModule = new AdminOverview(this);
        this.groupsModule = new AdminGroups(this);
        this.usersModule = new AdminUsers(this);
        this.statisticsModule = new AdminStatistics(this);
        this.achievementsModule = new AdminAchievements(this);
    }
    
    async render() {
        return `
            <div class="admin-page-container h-full flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
                <!-- 顶部导航栏（标签页样式） -->
                <div class="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-30">
                    <div class="px-2 sm:px-4 lg:px-8">
                        <div class="flex items-center justify-between h-14 sm:h-16">
                            <!-- 左侧导航标签 -->
                            ${Tabs.render({
                                tabs: [
                                    {
                                        id: 'tabOverview',
                                        label: '概览',
                                        icon: '<svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>',
                                        active: true
                                    },
                                    {
                                        id: 'tabGroups',
                                        label: '群管理',
                                        icon: '<svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>',
                                        active: false
                                    },
                                    {
                                        id: 'tabUsers',
                                        label: '用户管理',
                                        icon: '<svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>',
                                        active: false
                                    },
                                    {
                                        id: 'tabStatistics',
                                        label: '数据统计',
                                        icon: '<svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>',
                                        active: false
                                    },
                                    {
                                        id: 'tabAchievements',
                                        label: '成就管理',
                                        icon: '<svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>',
                                        active: false
                                    }
                                ],
                                activeId: 'tabOverview',
                                variant: 'underline',
                                className: ''
                            })}
                        </div>
                    </div>
                    </div>

                <!-- 标签页内容区域 -->
                <div class="flex-1 overflow-hidden flex flex-col bg-white dark:bg-gray-800">
                    <!-- 概览标签页 -->
                    <div id="contentOverview" class="tab-content h-full overflow-y-scroll">
                        <div class="px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
                            <!-- 统计卡片 -->
                            <div class="mb-6 sm:mb-8">
                                <div class="flex items-center justify-between mb-4 sm:mb-6">
                                    <h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">数据概览</h2>
                                    <button 
                                        id="refreshDataBtn" 
                                        class="px-3 sm:px-4 py-1.5 sm:py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-xs sm:text-sm font-medium flex items-center space-x-1 sm:space-x-2 shadow-sm hover:shadow-md"
                                        title="刷新图表数据"
                                    >
                                        <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                        </svg>
                                        <span>刷新数据</span>
                                    </button>
                                </div>
                                <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                                    <!-- 总群数 -->
                                    <div class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex items-center justify-between mb-2">
                                            <p class="text-xs font-medium text-blue-600 dark:text-blue-400">总群数</p>
                                            <div class="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500/20 dark:bg-blue-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                        </svg>
                                    </div>
                                </div>
                                        <p id="totalGroups" class="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900 dark:text-blue-100 truncate">-</p>
                            </div>
                            
                                    <!-- 总用户数 -->
                                    <div class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-green-200 dark:border-green-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex items-center justify-between mb-2">
                                            <p class="text-xs font-medium text-green-600 dark:text-green-400">总用户数</p>
                                            <div class="w-6 h-6 sm:w-8 sm:h-8 bg-green-500/20 dark:bg-green-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                                        </svg>
                                    </div>
                                </div>
                                        <p id="totalUsers" class="text-lg sm:text-xl lg:text-2xl font-bold text-green-900 dark:text-green-100 truncate">-</p>
                            </div>
                            
                                    <!-- 总消息数 -->
                                    <div class="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-purple-200 dark:border-purple-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex items-center justify-between mb-2">
                                            <p class="text-xs font-medium text-purple-600 dark:text-purple-400">总消息数</p>
                                            <div class="w-6 h-6 sm:w-8 sm:h-8 bg-purple-500/20 dark:bg-purple-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                                        </svg>
                                    </div>
                                </div>
                                        <p id="totalMessages" class="text-lg sm:text-xl lg:text-2xl font-bold text-purple-900 dark:text-purple-100 truncate">-</p>
                            </div>
                                    
                                    <!-- 今日消息 -->
                                    <div class="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-orange-200 dark:border-orange-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex items-center justify-between mb-2">
                                            <p class="text-xs font-medium text-orange-600 dark:text-orange-400">今日消息</p>
                                            <div class="w-6 h-6 sm:w-8 sm:h-8 bg-orange-500/20 dark:bg-orange-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <p id="todayMessages" class="text-lg sm:text-xl lg:text-2xl font-bold text-orange-900 dark:text-orange-100 truncate">-</p>
                        </div>

                                    <!-- 活跃群数 -->
                                    <div class="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/30 dark:to-pink-800/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-pink-200 dark:border-pink-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex items-center justify-between mb-2">
                                            <p class="text-xs font-medium text-pink-600 dark:text-pink-400">活跃群数</p>
                                            <div class="w-6 h-6 sm:w-8 sm:h-8 bg-pink-500/20 dark:bg-pink-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <p id="activeGroups" class="text-lg sm:text-xl lg:text-2xl font-bold text-pink-900 dark:text-pink-100 truncate">-</p>
                            </div>

                                    <!-- 今日新增用户 -->
                                    <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-indigo-200 dark:border-indigo-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex items-center justify-between mb-2">
                                            <p class="text-xs font-medium text-indigo-600 dark:text-indigo-400">今日新增用户</p>
                                            <div class="w-6 h-6 sm:w-8 sm:h-8 bg-indigo-500/20 dark:bg-indigo-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                                                </svg>
                                    </div>
                                        </div>
                                        <p id="todayNewUsers" class="text-lg sm:text-xl lg:text-2xl font-bold text-indigo-900 dark:text-indigo-100 truncate">-</p>
                                </div>

                                    <!-- 平均消息/群 -->
                                    <div class="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-800/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-teal-200 dark:border-teal-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex items-center justify-between mb-2">
                                            <p class="text-xs font-medium text-teal-600 dark:text-teal-400">平均消息/群</p>
                                            <div class="w-6 h-6 sm:w-8 sm:h-8 bg-teal-500/20 dark:bg-teal-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                                </svg>
                                                </div>
                                            </div>
                                        <p id="avgMessagesPerGroup" class="text-lg sm:text-xl lg:text-2xl font-bold text-teal-900 dark:text-teal-100 truncate">-</p>
                                        </div>
                                        
                                    <!-- 平均消息/用户 -->
                                    <div class="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-cyan-200 dark:border-cyan-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex items-center justify-between mb-2">
                                            <p class="text-xs font-medium text-cyan-600 dark:text-cyan-400">平均消息/用户</p>
                                            <div class="w-6 h-6 sm:w-8 sm:h-8 bg-cyan-500/20 dark:bg-cyan-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                                    </svg>
                                            </div>
                                        </div>
                                        <p id="avgMessagesPerUser" class="text-lg sm:text-xl lg:text-2xl font-bold text-cyan-900 dark:text-cyan-100 truncate">-</p>
                                    </div>
                                </div>
                                                </div>
                                                
                            <!-- 图表区域 -->
                            <div class="space-y-4 sm:space-y-6">
                                <div class="flex items-center justify-between">
                                    <h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">数据图表</h2>
                                                            </div>
                                
                                <!-- 图表网格 - 响应式布局，优化排列 -->
                                <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                                    <!-- 消息趋势图 - 左上 -->
                                    ${ChartCard.render({
                                        title: `<div class="flex items-center gap-2"><span>消息趋势</span>${Badge.render({ text: "近7天", variant: "info", size: "sm" })}</div>`,
                                        content: '<div id="messageTrendChart" class="w-full" style="height: 320px; min-height: 320px;"></div>',
                                        footer: '<div class="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400"><div class="w-3 h-3 rounded-full bg-blue-500"></div><span>消息数</span></div>',
                                        className: 'hover:shadow-lg transition-all duration-300 order-1',
                                        height: 320
                                    })}
                                    
                                    <!-- 群组活跃度分布 - 右上 -->
                                    ${ChartCard.render({
                                        title: `<div class="flex items-center gap-2"><span>群组活跃度分布</span>${Badge.render({ text: "Top 10", variant: "info", size: "sm" })}</div>`,
                                        content: '<div id="groupActivityChart" class="w-full" style="height: 320px; min-height: 320px;"></div>',
                                        footer: '<div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><div class="w-2 h-2 rounded-full bg-blue-500"></div><span>消息数</span></div>',
                                        className: 'hover:shadow-lg transition-all duration-300 order-2',
                                        height: 320
                                    })}
                                                    
                                    <!-- 新增用户趋势 - 左下 -->
                                    ${ChartCard.render({
                                        title: `<div class="flex items-center gap-2"><span>新增用户</span>${Badge.render({ text: "近7天", variant: "primary", size: "sm" })}</div>`,
                                        content: '<div id="groupGrowthChart" class="w-full" style="height: 320px; min-height: 320px;"></div>',
                                        footer: '<div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><div class="w-2 h-2 rounded-full bg-purple-500"></div><span>新增用户</span></div>',
                                        className: 'hover:shadow-lg transition-all duration-300 order-3',
                                        height: 320
                                    })}
                                    
                                    <!-- 消息密度散点图 - 右下 -->
                                    ${ChartCard.render({
                                        title: `<div class="flex items-center gap-2"><span>消息密度分布</span>${Badge.render({ text: "所有群组", variant: "primary", size: "sm" })}</div>`,
                                        content: '<div id="messageDensityChart" class="w-full" style="height: 320px; min-height: 320px;"></div>',
                                        footer: '<div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><div class="w-2 h-2 rounded-full bg-purple-500"></div><span>群组</span></div>',
                                        className: 'hover:shadow-lg transition-all duration-300 order-4',
                                        height: 320
                                    })}
                                            </div>
                            </div>
                                                        </div>
                                                    </div>
                                                    
                                <!-- 群管理标签页 -->
                    <div id="contentGroups" class="tab-content hidden h-full overflow-hidden flex flex-col">
                        <div class="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4 lg:gap-6 px-3 sm:px-4 lg:px-6 xl:px-8 pt-0 sm:pt-0 lg:py-6 pb-3 sm:pb-4">
                                        <!-- 左侧：群聊列表 -->
                            <div class="flex-shrink-0 lg:w-80 xl:w-96 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-full lg:h-auto">
                                <!-- 搜索栏 -->
                                <div class="flex-shrink-0 p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mt-14 sm:mt-16 lg:mt-0">
                                    ${SearchInput.render({
                                        id: 'groupSearchInput',
                                        name: 'groupSearch',
                                        placeholder: '搜索群聊名称或ID...',
                                        className: 'px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-50 dark:bg-gray-700',
                                        showClearButton: true,
                                        clearButtonId: 'groupSearchClearBtn'
                                    })}
                                    <div class="flex items-center justify-between mt-2">
                                        <span id="groupListCount" class="text-xs text-gray-500 dark:text-gray-400 font-medium">共 <span class="text-primary dark:text-primary">-</span> 个群聊</span>
                                            </div>
                                        </div>
                                <!-- 群列表 -->
                                <div class="flex-1 overflow-y-scroll p-3 sm:p-4 min-h-0">
                                    <div id="groupsList" class="space-y-2">
                                        ${Loading.render({ text: '加载中...', size: 'medium', className: 'py-8' })}
                                    </div>
                                                        </div>
                                                    </div>
                                                    
                            <!-- 右侧：群详情和管理 -->
                            <div class="flex-1 overflow-hidden flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 h-full lg:h-auto">
                                <div id="groupDetailPanel" class="flex-1 overflow-y-scroll min-h-0">
                                    <!-- 空状态 -->
                                    <div class="empty-state flex flex-col items-center justify-center h-full min-h-[400px] px-4">
                                        <div class="w-24 h-24 mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center shadow-inner">
                                            <svg class="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                                            </svg>
                                                        </div>
                                        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">选择一个群聊</h3>
                                        <p class="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">从左侧列表中选择一个群聊以查看详细的统计信息和用户排名</p>
                                                    </div>
                                                    
                                    <!-- 群详情内容 -->
                                    <div id="groupDetailContent" class="hidden h-full flex flex-col">
                                        <!-- 顶部标题栏 -->
                                        <div class="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 sm:px-4 py-3 flex-shrink-0">
                                            <div class="flex items-start justify-between gap-4">
                                                <div class="flex-1 min-w-0 flex items-start gap-3">
                                                    <!-- 移动端返回按钮 -->
                                                            <button 
                                                        id="groupDetailBackBtn" 
                                                        class="lg:hidden mt-1 p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 flex-shrink-0"
                                                        aria-label="返回"
                                                            >
                                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                                                </svg>
                                                            </button>
                                                    <div class="flex-1 min-w-0">
                                                        <h2 id="groupDetailTitle" class="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate leading-tight mb-1"></h2>
                                                        <div class="flex items-center gap-2 mt-1.5">
                                                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono">
                                                                <svg class="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path>
                                                                </svg>
                                                                <span id="groupDetailId">-</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <!-- 操作按钮组 -->
                                                <div class="flex items-center gap-2 flex-shrink-0">
                                                            <button 
                                                                id="refreshGroupStatsBtn" 
                                                        class="btn-primary"
                                                        title="刷新数据"
                                                            >
                                                        <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                                        </svg>
                                                        <span class="hidden sm:inline ml-1.5">刷新</span>
                                                            </button>
                                                            <button 
                                                                id="clearGroupStatsBtn" 
                                                        class="btn-danger"
                                                    title="清除数据"
                                                            >
                                                        <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                        </svg>
                                                        <span class="hidden sm:inline ml-1.5">清除</span>
                                                            </button>
                                                </div>
                                                        </div>
                                                    </div>
                                        
                                        <!-- 内容区域 -->
                                        <div class="flex-1 overflow-y-scroll">
                                            <div class="p-3 sm:p-4 space-y-4">
                                                <!-- 统计概览 -->
                                                <section id="groupStatsSection">
                                                    <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">统计概览</h3>
                                                    <div class="grid grid-cols-3 gap-2 sm:gap-3" id="groupStatsGrid">
                                                        <!-- 统计卡片将通过JavaScript动态生成 -->
                                                </div>
                                                </section>
                                            
                                                <!-- 用户排名 -->
                                                <section>
                                                <div class="flex items-center justify-between mb-3">
                                                        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">用户排名</h3>
                                                        <span class="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary">Top 10</span>
                                                </div>
                                                    <div id="groupRankingList" class="space-y-1.5 custom-scrollbar">
                                                    ${Loading.render({ text: '加载中...', size: 'small', className: 'py-8' })}
                                                </div>
                                                </section>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- 用户管理标签页 -->
                    <div id="contentUsers" class="tab-content hidden h-full overflow-hidden flex flex-col">
                        <div class="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4 lg:gap-6 px-3 sm:px-4 lg:px-6 xl:px-8 pt-0 sm:pt-0 lg:py-6 pb-3 sm:pb-4">
                                        <!-- 左侧：用户列表 -->
                            <div class="flex-shrink-0 lg:w-80 xl:w-96 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-full lg:h-auto">
                                <!-- 搜索栏 -->
                                <div class="flex-shrink-0 p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mt-14 sm:mt-16 lg:mt-0">
                                    ${SearchInput.render({
                                        id: 'userSearchInput',
                                        name: 'userSearch',
                                        placeholder: '搜索用户名称或ID...',
                                        className: 'px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-50 dark:bg-gray-700',
                                        showClearButton: true,
                                        clearButtonId: 'userSearchClearBtn'
                                    })}
                                    <div class="flex items-center justify-between mt-2">
                                        <span id="userListCount" class="text-xs text-gray-500 dark:text-gray-400 font-medium">共 <span class="text-primary dark:text-primary">-</span> 个用户</span>
                                    </div>
                                </div>
                                <!-- 用户列表 -->
                                <div class="flex-1 overflow-y-scroll p-3 sm:p-4 min-h-0">
                                    <div id="usersList" class="space-y-2">
                                        ${Loading.render({ text: '加载中...', size: 'medium', className: 'py-8' })}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- 右侧：用户详情 -->
                            <div class="flex-1 overflow-hidden flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-full lg:h-auto">
                                <div id="userDetailPanel" class="flex-1 overflow-y-scroll min-h-0 lg:!block hidden">
                                    <!-- 空状态 -->
                                    <div class="empty-state flex flex-col items-center justify-center h-full min-h-[400px] px-4">
                                        <div class="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                            <svg class="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                                    </svg>
                                        </div>
                                        <p class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">选择一个用户</p>
                                        <p class="text-sm text-gray-500 dark:text-gray-400">从左侧列表中选择一个用户以查看详细信息</p>
                                                </div>
                                                
                                    <!-- 用户详情内容 -->
                                                <div id="userDetailContent" class="hidden h-full flex flex-col">
                                        <!-- 顶部操作栏 -->
                                        <div class="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex-shrink-0">
                                            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                <div class="flex-1 min-w-0 flex items-center gap-3">
                                                    <!-- 移动端返回按钮 -->
                                                    <button 
                                                        id="userDetailBackBtn" 
                                                        class="lg:hidden mt-1 p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 flex-shrink-0"
                                                        aria-label="返回"
                                                    >
                                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                                        </svg>
                                                    </button>
                                                <div class="flex-1 min-w-0">
                                                        <h3 id="userDetailTitle" class="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate"></h3>
                                                    <p id="userDetailId" class="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1"></p>
                                                </div>
                                                    <span id="userDetailRoleBadge" class="px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full flex-shrink-0"></span>
                                            </div>
                                                <div class="flex items-center gap-2 flex-wrap">
                                                    <div class="relative flex-1 sm:flex-none">
                                                    <select 
                                                        id="userRoleSelect" 
                                                            class="select-custom w-full sm:w-auto px-3 py-2 text-xs sm:text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-gray-800 dark:text-gray-200 appearance-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600"
                                                    >
                                                        <option value="user">普通用户</option>
                                                        <option value="admin">管理员</option>
                                                    </select>
                                                </div>
                                                <button 
                                                    id="updateUserRoleBtn" 
                                                        class="px-3 py-2 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex-1 sm:flex-none"
                                                    title="更新权限"
                                                >
                                                    更新
                                                </button>
                                                <button 
                                                    id="clearUserDataBtn" 
                                                        class="px-3 py-2 text-xs sm:text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex-1 sm:flex-none"
                                                    title="清除数据"
                                                >
                                                    清除
                                                </button>
                                                </div>
                                            </div>
                                                        </div>
                                                        
                                        <div class="flex-1 overflow-y-scroll p-3 sm:p-4 lg:p-6">
                                            <!-- 统计卡片 -->
                                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                                                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                                                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">用户ID</p>
                                                    <p id="userDetailIdCard" class="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 break-all">-</p>
                                                            </div>
                                                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                                                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">所在群数</p>
                                                    <p id="userGroupCount" class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">-</p>
                                                            </div>
                                                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                                                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">总消息数</p>
                                                    <p id="userTotalMessages" class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">-</p>
                                                            </div>
                                                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                                                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">总字数</p>
                                                    <p id="userTotalWords" class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">-</p>
                                                            </div>
                                                        </div>
                                                        
                                                        <!-- 时间信息 -->
                                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                                                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">创建时间</p>
                                                    <p id="userCreatedAt" class="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">-</p>
                                                            </div>
                                                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">最后更新</p>
                                                    <p id="userUpdatedAt" class="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">-</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <!-- 用户所在群列表 -->
                                            <div>
                                                <div class="flex items-center justify-between mb-3">
                                                    <h4 class="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">所在群聊</h4>
                                                    <span id="userGroupsCount" class="text-xs text-gray-500 dark:text-gray-400"></span>
                                                        </div>
                                                <div id="userGroupsList" class="space-y-2 overflow-y-scroll custom-scrollbar">
                                                    ${Loading.render({ text: '加载中...', size: 'small', className: 'py-8' })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                                                        </div>
                                                    </div>
                                                    
                    <!-- 数据统计标签页 -->
                    <div id="contentStatistics" class="tab-content hidden h-full overflow-y-scroll">
                        <div class="px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
                            <!-- 页面标题和筛选器 -->
                            <div class="mb-6 sm:mb-8">
                                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                                    <h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">数据统计</h2>
                                    
                                    <!-- 时间范围选择器 -->
                                    <div class="flex items-center gap-3">
                                        <div class="flex items-center gap-2">
                                            <label class="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">时间范围：</label>
                                            ${Select.render({
                                                id: 'statisticsTimeRange',
                                                name: 'timeRange',
                                                options: [
                                                    { value: 'day', label: '今天', selected: false },
                                                    { value: 'week', label: '最近7天', selected: true },
                                                    { value: 'month', label: '最近30天', selected: false },
                                                    { value: 'year', label: '最近一年', selected: false },
                                                    { value: 'custom', label: '自定义', selected: false }
                                                ],
                                                className: 'px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                            })}
                                        </div>
                                        
                                        <!-- 自定义日期范围（默认隐藏） -->
                                        <div id="customDateRange" class="hidden flex items-center gap-2">
                                            ${Input.renderInput({
                                                type: 'date',
                                                id: 'statisticsStartDate',
                                                className: 'px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                            })}
                                            <span class="text-sm text-gray-500 dark:text-gray-400">至</span>
                                            ${Input.renderInput({
                                                type: 'date',
                                                id: 'statisticsEndDate',
                                                className: 'px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                            })}
                                        </div>
                                        
                                        <!-- 导出按钮 -->
                                        ${Button.render({
                                            id: 'exportStatisticsBtn',
                                            text: '导出数据',
                                            variant: 'primary',
                                            icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>',
                                            className: 'px-3 py-1.5 text-sm shadow-sm hover:shadow-md'
                                        })}
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 加载状态 -->
                            <div id="statisticsLoading" class="hidden flex items-center justify-center py-12">
                                <div class="text-center">
                                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">加载中...</p>
                                </div>
                            </div>
                            
                            <!-- 统计内容 -->
                            <div id="statisticsContent" class="space-y-6">
                                <!-- 统计卡片 -->
                                <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                    <!-- 总消息数 -->
                                    <div class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg sm:rounded-xl p-4 border border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex items-center justify-between mb-2">
                                            <p class="text-xs font-medium text-blue-600 dark:text-blue-400">总消息数</p>
                                            <div class="w-8 h-8 bg-blue-500/20 dark:bg-blue-500/30 rounded-lg flex items-center justify-center">
                                                <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <p id="statTotalMessages" class="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100 mb-1">-</p>
                                        <p class="text-xs text-blue-600 dark:text-blue-400">较上期 <span id="statMessagesChange" class="font-medium">-</span></p>
                                    </div>
                                    
                                    <!-- 总字数 -->
                                    <div class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg sm:rounded-xl p-4 border border-green-200 dark:border-green-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex items-center justify-between mb-2">
                                            <p class="text-xs font-medium text-green-600 dark:text-green-400">总字数</p>
                                            <div class="w-8 h-8 bg-green-500/20 dark:bg-green-500/30 rounded-lg flex items-center justify-center">
                                                <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <p id="statTotalWords" class="text-xl sm:text-2xl font-bold text-green-900 dark:text-green-100 mb-1">-</p>
                                        <p class="text-xs text-green-600 dark:text-green-400">较上期 <span id="statWordsChange" class="font-medium">-</span></p>
                                    </div>
                                    
                                    <!-- 活跃用户数 -->
                                    <div class="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg sm:rounded-xl p-4 border border-purple-200 dark:border-purple-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex items-center justify-between mb-2">
                                            <p class="text-xs font-medium text-purple-600 dark:text-purple-400">活跃用户</p>
                                            <div class="w-8 h-8 bg-purple-500/20 dark:bg-purple-500/30 rounded-lg flex items-center justify-center">
                                                <svg class="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <p id="statActiveUsers" class="text-xl sm:text-2xl font-bold text-purple-900 dark:text-purple-100 mb-1">-</p>
                                        <p class="text-xs text-purple-600 dark:text-purple-400">较上期 <span id="statUsersChange" class="font-medium">-</span></p>
                                    </div>
                                    
                                    <!-- 活跃群数 -->
                                    <div class="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-lg sm:rounded-xl p-4 border border-orange-200 dark:border-orange-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div class="flex items-center justify-between mb-2">
                                            <p class="text-xs font-medium text-orange-600 dark:text-orange-400">活跃群数</p>
                                            <div class="w-8 h-8 bg-orange-500/20 dark:bg-orange-500/30 rounded-lg flex items-center justify-center">
                                                <svg class="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <p id="statActiveGroups" class="text-xl sm:text-2xl font-bold text-orange-900 dark:text-orange-100 mb-1">-</p>
                                        <p class="text-xs text-orange-600 dark:text-orange-400">较上期 <span id="statGroupsChange" class="font-medium">-</span></p>
                                    </div>
                                </div>
                                
                                <!-- 图表区域 -->
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                    <!-- 消息趋势图 -->
                                    ${ChartCard.render({
                                        title: `<div class="flex items-center justify-between"><h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">消息趋势</h3>${Badge.render({ text: "折线图", variant: "info", size: "sm" })}</div>`,
                                        content: '<div id="statisticsTrendChart" class="w-full" style="height: 320px; min-height: 320px;"></div>',
                                        className: 'shadow-sm hover:shadow-md transition-shadow',
                                        height: 320
                                    })}
                                    
                                    <!-- 用户活跃度图 -->
                                    ${ChartCard.render({
                                        title: '<div class="flex items-center justify-between"><h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">用户活跃度</h3><span class="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">柱状图</span></div>',
                                        content: '<div id="statisticsUserActivityChart" class="w-full" style="height: 320px; min-height: 320px;"></div>',
                                        className: 'shadow-sm hover:shadow-md transition-shadow',
                                        height: 320
                                    })}
                                </div>
                                
                                <!-- 详细数据表格 -->
                                <div class="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                                    <div class="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">详细数据</h3>
                                    </div>
                                    <div class="overflow-x-auto">
                                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead class="bg-gray-50 dark:bg-gray-900">
                                                <tr>
                                                    <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">日期</th>
                                                    <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">消息数</th>
                                                    <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">字数</th>
                                                    <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">活跃用户</th>
                                                    <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">活跃群数</th>
                                                </tr>
                                            </thead>
                                            <tbody id="statisticsTableBody" class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                <tr>
                                                    <td colspan="5" class="px-4 sm:px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无数据</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 成就管理标签页 -->
                    <div id="contentAchievements" class="tab-content hidden h-full overflow-y-scroll">
                        <div class="px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
                            <!-- 页面标题和筛选器 -->
                            <div class="mb-6 sm:mb-8">
                                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                                    <h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">成就管理</h2>
                                    
                                    <!-- 筛选和操作按钮 -->
                                    <div class="flex flex-wrap items-center gap-3">
                                        <!-- 群组选择 -->
                                        <div class="flex items-center gap-2">
                                            <label class="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">群组：</label>
                                            ${Select.render({
                                                id: 'achievementGroupSelect',
                                                name: 'achievementGroup',
                                                options: [
                                                    { value: '', label: '请选择群组', selected: true }
                                                ],
                                                className: 'px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                            })}
                                        </div>
                                        
                                        <!-- 刷新按钮 -->
                                        <button id="refreshAchievementsBtn" class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 shadow-sm hover:shadow-md">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                            </svg>
                                            <span class="hidden sm:inline">刷新</span>
                                        </button>
                                        
                                        <!-- 导出按钮 -->
                                        <button id="exportAchievementsBtn" class="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                            </svg>
                                            <span class="hidden sm:inline">导出</span>
                                        </button>
                                    </div>
                                </div>
                                
                                <!-- 搜索框 -->
                                <div class="mb-4">
                                    <div class="relative max-w-md">
                                        ${SearchInput.render({
                                            id: 'achievementSearch',
                                            name: 'achievementSearch',
                                            placeholder: '搜索成就名称、描述或分类...',
                                            className: 'w-full px-4 py-2 text-sm',
                                            showClearButton: false
                                        })}
                                    </div>
                                </div>
                                
                                <!-- 统计信息 -->
                                <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                    <span id="achievementListCount">共 <span>0</span> 个成就</span>
                                </div>
                            </div>
                            
                            <!-- 加载状态 -->
                            <div id="achievementsLoading" class="hidden flex items-center justify-center py-12">
                                <div class="text-center">
                                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">加载中...</p>
                                </div>
                            </div>
                            
                            <!-- 成就列表 -->
                            <div id="achievementsList" class="space-y-4">
                                <!-- 成就列表将在这里动态生成 -->
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
                        ${Input.renderInput({
                            type: 'password',
                            id: 'adminSecretKeyInput',
                            placeholder: '请输入管理员秘钥',
                            className: 'px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        })}
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
        // 刷新数据按钮（概览页面）
        const refreshDataBtn = document.getElementById('refreshDataBtn');
        if (refreshDataBtn) {
            refreshDataBtn.addEventListener('click', () => {
                // 刷新概览数据
                this.loadData();
            });
        }
        
        // 标签页切换
        const tabs = ['Overview', 'Groups', 'Users', 'Statistics', 'Achievements'];
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
        
        // 群管理模块事件监听器
        this.groupsModule.initEventListeners();
        
        // 用户管理模块事件监听器
        this.usersModule.initEventListeners();
    }
    
    async switchTab(tabName) {
        // 更新按钮状态（标签页样式）- 兼容 Tabs 组件
        const tabId = `tab${tabName}`;
        document.querySelectorAll('[role="tab"]').forEach(btn => {
            const isActive = btn.id === tabId;
            if (isActive) {
                btn.classList.add('bg-white', 'dark:bg-gray-800', 'text-primary', 'border-primary');
                btn.classList.remove('text-gray-600', 'dark:text-gray-400', 'border-transparent');
                btn.setAttribute('aria-selected', 'true');
            } else {
                btn.classList.remove('bg-white', 'dark:bg-gray-800', 'text-primary', 'border-primary');
            btn.classList.add('text-gray-600', 'dark:text-gray-400', 'border-transparent');
            btn.setAttribute('aria-selected', 'false');
            }
        });

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
        } else if (tabName === 'Groups') {
            if (this.groups.length === 0) {
            await this.groupsModule.loadGroups();
            }
            // 清除选中状态（从其他页面返回时）
            if (this.selectedGroupId) {
                this.selectedGroupId = null;
                this.selectedGroupStats = null;
                this.groupsModule.updateGroupsList();
                this.groupsModule.updateGroupDetail();
            }
            // 确保移动端详情面板初始状态正确
            if (window.innerWidth < 1024) {
                const detailPanel = document.getElementById('groupDetailPanel');
                if (detailPanel) {
                    detailPanel.classList.add('hidden');
                }
                this.groupsModule.closeMobileDetail();
            }
        } else if (tabName === 'Users') {
            if (this.users.length === 0) {
            await this.usersModule.loadUsers();
            }
            // 确保移动端详情面板初始状态正确
            if (window.innerWidth < 1024) {
                const detailPanel = document.getElementById('userDetailPanel');
                if (detailPanel && !this.selectedUserId) {
                    detailPanel.classList.add('hidden');
                }
                this.usersModule.initMobileLayout();
            }
        } else if (tabName === 'Statistics') {
            // 初始化数据统计页面
            if (!this.statisticsModule.initialized) {
                this.statisticsModule.initialized = true;
                this.statisticsModule.initEventListeners();
            }
            // 初始化图表（每次切换都尝试初始化，确保图表容器可见）
            setTimeout(() => {
                this.statisticsModule.initCharts();
                // 如果图表已存在，调整大小
                if (this.statisticsModule.trendChart) {
                    setTimeout(() => this.statisticsModule.trendChart.resize(), 100);
                }
                if (this.statisticsModule.userActivityChart) {
                    setTimeout(() => this.statisticsModule.userActivityChart.resize(), 100);
                }
            }, 100);
            // 加载统计数据
            await this.statisticsModule.loadStatistics();
        } else if (tabName === 'Achievements') {
            // 初始化成就管理页面
            if (!this.achievementsModule.initialized) {
                this.achievementsModule.initialized = true;
                this.achievementsModule.initEventListeners();
                
                // 加载群组列表到下拉框
                if (this.groups.length === 0) {
                    await this.groupsModule.loadGroups();
                }
                this.updateAchievementGroupSelect();
                
                // 如果有群组，默认加载第一个群组的成就数据
                if (this.groups.length > 0) {
                    await this.achievementsModule.loadAchievements();
                }
            }
        }
        
        // 初始化当前标签页的下拉框
            this.initCustomSelectsForActiveTab();
    }
    
    /**
     * 更新成就管理页面的群组选择下拉框
     */
    updateAchievementGroupSelect() {
        const groupSelect = document.getElementById('achievementGroupSelect');
        if (!groupSelect) return;
        
        // 清空现有选项
        groupSelect.innerHTML = '<option value="">请选择群组</option>';
        
        // 添加群组选项
        this.groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.group_id;
            option.textContent = group.group_name || `群${group.group_id}`;
            groupSelect.appendChild(option);
        });
        
        // 设置默认值为第一个群组
        if (this.groups.length > 0) {
            groupSelect.value = this.groups[0].group_id;
            // 触发成就模块更新选中的群组ID
            if (this.achievementsModule) {
                this.achievementsModule.selectedGroupId = this.groups[0].group_id;
            }
        }
    }
    
    async loadData() {
        const refreshBtn = document.getElementById('refreshDataBtn');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            const originalHTML = refreshBtn.innerHTML;
            refreshBtn.innerHTML = Loading.renderInline({ text: '刷新中...' });
            
            try {
                await Promise.all([
                    this.overviewModule.loadOverview(),
                    this.groupsModule.loadGroups(),
                    this.usersModule.loadUsers()
                ]);
            } finally {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = originalHTML;
            }
        } else {
            // 如果没有按钮，直接加载数据
            await Promise.all([
                this.overviewModule.loadOverview(),
                this.groupsModule.loadGroups(),
                this.usersModule.loadUsers()
            ]);
        }
    }
    
}
