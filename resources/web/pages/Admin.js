/**
 * 管理页面
 */
export default class Admin {
    constructor(app) {
        this.app = app;
        this.groups = [];
        this.users = [];
        this.overview = null;
        this.secretKey = null;
        this.selectedGroupId = null;
        this.selectedGroupStats = null;
    }
    
    async render() {
        return `
            <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
                <div class="max-w-7xl mx-auto">
                    <!-- 页面标题 -->
                    <div class="mb-6 sm:mb-8">
                        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">⚙️ 管理面板</h1>
                        <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400">管理员专用功能</p>
                    </div>

                    <!-- 管理内容 -->
                    <div id="adminContent">
                        <!-- 统计概览 -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
                            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">总群数</p>
                                        <p id="totalGroups" class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">-</p>
                                    </div>
                                    <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                        <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">总用户数</p>
                                        <p id="totalUsers" class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">-</p>
                                    </div>
                                    <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                        <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">总消息数</p>
                                        <p id="totalMessages" class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">-</p>
                                    </div>
                                    <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                        <svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 标签页导航 -->
                        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                            <div class="border-b border-gray-200 dark:border-gray-700">
                                <nav class="flex -mb-px">
                                    <button 
                                        id="tabOverview" 
                                        class="tab-btn active px-4 sm:px-6 py-3 text-sm font-medium text-primary border-b-2 border-primary"
                                    >
                                        概览
                                    </button>
                                    <button 
                                        id="tabGroups" 
                                        class="tab-btn px-4 sm:px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                                    >
                                        群管理
                                    </button>
                                    <button 
                                        id="tabUsers" 
                                        class="tab-btn px-4 sm:px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                                    >
                                        用户管理
                                    </button>
                                </nav>
                            </div>

                            <!-- 标签页内容 -->
                            <div class="p-4 sm:p-6">
                                <!-- 概览标签页 -->
                                <div id="contentOverview" class="tab-content">
                                    <h3 class="text-lg font-semibold text-gray-900 mb-4">热门群聊</h3>
                                    <div id="topGroupsList" class="space-y-3">
                                        <p class="text-gray-500 text-center py-8">加载中...</p>
                                    </div>
                                </div>

                                <!-- 群管理标签页 -->
                                <div id="contentGroups" class="tab-content hidden">
                                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                                        <!-- 左侧：群聊列表 -->
                                        <div class="lg:col-span-1">
                                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                                <h3 class="text-lg font-semibold text-gray-900 mb-4">群聊列表</h3>
                                                <div id="groupsList" class="space-y-2 max-h-[600px] overflow-y-auto">
                                                    <p class="text-gray-500 text-center py-8">加载中...</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- 右侧：群详情和管理 -->
                                        <div class="lg:col-span-2">
                                            <div id="groupDetailPanel" class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                                                <div class="text-center py-12">
                                                    <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                                                    </svg>
                                                    <p class="text-gray-500 text-lg">请从左侧选择一个群聊</p>
                                                    <p class="text-gray-400 text-sm mt-2">查看详细信息和管理功能</p>
                                                </div>
                                                
                                                <!-- 群详情内容（动态加载） -->
                                                <div id="groupDetailContent" class="hidden">
                                                    <!-- 群基本信息 -->
                                                    <div class="mb-6">
                                                        <h3 id="groupDetailTitle" class="text-xl font-bold text-gray-900 mb-4"></h3>
                                                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                            <div class="bg-gray-50 rounded-lg p-4">
                                                                <p class="text-xs text-gray-600 mb-1">群成员</p>
                                                                <p id="groupUserCount" class="text-2xl font-bold text-gray-900">-</p>
                                                            </div>
                                                            <div class="bg-gray-50 rounded-lg p-4">
                                                                <p class="text-xs text-gray-600 mb-1">总消息数</p>
                                                                <p id="groupMessageCount" class="text-2xl font-bold text-gray-900">-</p>
                                                            </div>
                                                            <div class="bg-gray-50 rounded-lg p-4">
                                                                <p class="text-xs text-gray-600 mb-1">总字数</p>
                                                                <p id="groupWordCount" class="text-2xl font-bold text-gray-900">-</p>
                                                            </div>
                                                            <div class="bg-gray-50 rounded-lg p-4">
                                                                <p class="text-xs text-gray-600 mb-1">群号</p>
                                                                <p id="groupDetailId" class="text-sm font-medium text-gray-700 break-all">-</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <!-- 群内用户排名 -->
                                                    <div class="border-t border-gray-200 pt-6 mb-6">
                                                        <div class="flex items-center justify-between mb-4">
                                                            <h4 class="text-lg font-semibold text-gray-900">群内用户排名</h4>
                                                            <button 
                                                                id="refreshRankingBtn" 
                                                                class="text-sm text-primary hover:text-primary-hover flex items-center space-x-1"
                                                            >
                                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                                                </svg>
                                                                <span>刷新</span>
                                                            </button>
                                                        </div>
                                                        <div id="groupRankingList" class="space-y-2 max-h-[300px] overflow-y-auto">
                                                            <p class="text-gray-500 text-center py-4">加载中...</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <!-- 管理操作 -->
                                                    <div class="border-t border-gray-200 pt-6">
                                                        <h4 class="text-lg font-semibold text-gray-900 mb-4">管理操作</h4>
                                                        <div class="space-y-3">
                                                            <button 
                                                                id="refreshGroupStatsBtn" 
                                                                class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center space-x-2"
                                                            >
                                                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                                                </svg>
                                                                <span>刷新统计数据</span>
                                                            </button>
                                                            <button 
                                                                id="clearGroupStatsBtn" 
                                                                class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center space-x-2"
                                                            >
                                                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                                </svg>
                                                                <span>清除所有统计数据</span>
                                                            </button>
                                                        </div>
                                                        <p class="text-xs text-red-600 mt-3">
                                                            ⚠️ 清除操作不可恢复，请谨慎操作
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- 用户管理标签页 -->
                                <div id="contentUsers" class="tab-content hidden">
                                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                                        <!-- 左侧：用户列表 -->
                                        <div class="lg:col-span-1">
                                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                                <div class="flex items-center justify-between mb-4">
                                                    <h3 class="text-lg font-semibold text-gray-900">用户列表</h3>
                                                    <span id="userCount" class="text-sm text-gray-500">-</span>
                                                </div>
                                                <div id="usersList" class="space-y-2 max-h-[600px] overflow-y-auto">
                                                    <p class="text-gray-500 text-center py-8">加载中...</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- 右侧：用户详情 -->
                                        <div class="lg:col-span-2">
                                            <div id="userDetailPanel" class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                                                <div class="text-center py-12">
                                                    <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                                    </svg>
                                                    <p class="text-gray-500 text-lg">请从左侧选择一个用户</p>
                                                    <p class="text-gray-400 text-sm mt-2">查看详细信息和统计数据</p>
                                                </div>
                                                
                                                <!-- 用户详情内容（动态加载） -->
                                                <div id="userDetailContent" class="hidden">
                                                    <!-- 用户基本信息 -->
                                                    <div class="mb-6">
                                                        <div class="flex items-center justify-between mb-4">
                                                            <h3 id="userDetailTitle" class="text-xl font-bold text-gray-900"></h3>
                                                            <span id="userDetailRoleBadge" class="px-3 py-1 text-sm font-medium rounded-full"></span>
                                                        </div>
                                                        
                                                        <!-- 基础信息卡片 -->
                                                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                                                            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                                                                <p class="text-xs text-blue-600 mb-1 font-medium">用户ID</p>
                                                                <p id="userDetailId" class="text-sm font-semibold text-blue-900 break-all">-</p>
                                                            </div>
                                                            <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                                                                <p class="text-xs text-purple-600 mb-1 font-medium">所在群数</p>
                                                                <p id="userGroupCount" class="text-2xl font-bold text-purple-900">-</p>
                                                            </div>
                                                            <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                                                                <p class="text-xs text-green-600 mb-1 font-medium">总消息数</p>
                                                                <p id="userTotalMessages" class="text-2xl font-bold text-green-900">-</p>
                                                            </div>
                                                            <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                                                                <p class="text-xs text-orange-600 mb-1 font-medium">总字数</p>
                                                                <p id="userTotalWords" class="text-2xl font-bold text-orange-900">-</p>
                                                            </div>
                                                        </div>
                                                        
                                                        <!-- 时间信息 -->
                                                        <div class="grid grid-cols-2 gap-4">
                                                            <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                                                <p class="text-xs text-gray-600 mb-1">创建时间</p>
                                                                <p id="userCreatedAt" class="text-sm font-medium text-gray-700">-</p>
                                                            </div>
                                                            <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                                                <p class="text-xs text-gray-600 mb-1">最后更新</p>
                                                                <p id="userUpdatedAt" class="text-sm font-medium text-gray-700">-</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <!-- 用户所在群列表 -->
                                                    <div class="border-t border-gray-200 pt-6 mb-6">
                                                        <div class="flex items-center justify-between mb-4">
                                                            <h4 class="text-lg font-semibold text-gray-900">所在群聊</h4>
                                                            <span id="userGroupsCount" class="text-sm text-gray-500"></span>
                                                        </div>
                                                        <div id="userGroupsList" class="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                                                            <p class="text-gray-500 text-center py-4">加载中...</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <!-- 管理操作 -->
                                                    <div class="border-t border-gray-200 pt-6">
                                                        <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                                                            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                            </svg>
                                                            <span>管理操作</span>
                                                        </h4>
                                                        <div class="space-y-4">
                                                            <!-- 修改权限 -->
                                                            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 shadow-sm">
                                                                <div class="flex items-center space-x-2 mb-3">
                                                                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                                                                    </svg>
                                                                    <label class="block text-sm font-semibold text-gray-800">用户权限</label>
                                                                </div>
                                                                <select 
                                                                    id="userRoleSelect" 
                                                                    class="w-full px-4 py-3 border-2 border-blue-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm font-medium"
                                                                >
                                                                    <option value="user">普通用户</option>
                                                                    <option value="admin">管理员</option>
                                                                </select>
                                                                <button 
                                                                    id="updateUserRoleBtn" 
                                                                    class="w-full mt-4 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition font-semibold flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                                                >
                                                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                                                    </svg>
                                                                    <span>更新权限</span>
                                                                </button>
                                                            </div>
                                                            
                                                            <!-- 清除数据 -->
                                                            <div class="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-5 border border-red-200 shadow-sm">
                                                                <div class="flex items-center space-x-2 mb-3">
                                                                    <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                                                    </svg>
                                                                    <label class="block text-sm font-semibold text-gray-800">危险操作</label>
                                                                </div>
                                                                <p class="text-xs text-gray-600 mb-4">
                                                                    ⚠️ 此操作将永久删除用户的所有统计数据，包括消息、字数、成就等，且无法恢复。
                                                                </p>
                                                                <button 
                                                                    id="clearUserDataBtn" 
                                                                    class="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 transition font-semibold flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                                                >
                                                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                                    </svg>
                                                                    <span>清除用户所有数据</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
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
        // 获取秘钥
        await this.initSecretKey();
        
        this.setupEventListeners();
        
        // 直接加载数据
        await this.loadData();
    }
    
    /**
     * 初始化秘钥
     */
    async initSecretKey() {
        try {
            // 检查是否已经验证过（使用sessionStorage，只在当前会话有效）
            const verifiedKey = sessionStorage.getItem(`admin_verified_${this.app.userId}`);
            if (verifiedKey) {
                // 如果已经验证过，直接使用
                this.secretKey = verifiedKey;
                return;
            }
            
            // 尝试从本地存储获取秘钥
            const localKey = await SecretKeyManager.get(this.app.userId, false);
            if (localKey) {
                // 验证秘钥是否有效
                try {
                    const response = await api.validateSecretKey(this.app.userId, localKey);
                    if (response.success && response.data?.valid) {
                        // 验证成功，保存到sessionStorage
                        this.secretKey = localKey;
                        sessionStorage.setItem(`admin_verified_${this.app.userId}`, localKey);
                        return;
                    }
                } catch (error) {
                    console.warn('验证本地秘钥失败:', error);
                }
            }
            
            // 如果没有有效秘钥，弹出验证窗口
            await this.verifyAdminAccess();
        } catch (error) {
            console.error('获取秘钥失败:', error);
            Toast.show('获取秘钥失败，请先设置秘钥', 'error');
        }
    }
    
    /**
     * 验证管理员访问权限
     */
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
                            this.secretKey = secretKey;
                            sessionStorage.setItem(`admin_verified_${this.app.userId}`, secretKey);
                            
                            // 关闭弹窗
                            window.Modal.hide();
                            Toast.show('验证成功', 'success');
                            
                            // 重新加载数据
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
        // 标签页切换
        const tabs = ['Overview', 'Groups', 'Users'];
        tabs.forEach(tab => {
            const tabBtn = document.getElementById(`tab${tab}`);
            const content = document.getElementById(`content${tab}`);
            if (tabBtn && content) {
                tabBtn.addEventListener('click', () => this.switchTab(tab));
            }
        });
        
        // 刷新统计按钮
        const refreshStatsBtn = document.getElementById('refreshGroupStatsBtn');
        if (refreshStatsBtn) {
            refreshStatsBtn.addEventListener('click', () => this.refreshGroupStats());
        }
        
        // 刷新排名按钮
        const refreshRankingBtn = document.getElementById('refreshRankingBtn');
        if (refreshRankingBtn) {
            refreshRankingBtn.addEventListener('click', () => {
                if (this.selectedGroupId) {
                    this.loadGroupRanking(this.selectedGroupId);
                }
            });
        }
        
        // 清除统计按钮
        const clearStatsBtn = document.getElementById('clearGroupStatsBtn');
        if (clearStatsBtn) {
            clearStatsBtn.addEventListener('click', () => this.clearGroupStats());
        }
        
        // 清除用户数据按钮
        const clearUserDataBtn = document.getElementById('clearUserDataBtn');
        if (clearUserDataBtn) {
            clearUserDataBtn.addEventListener('click', () => this.clearUserData());
        }
        
        // 更新用户权限按钮
        const updateUserRoleBtn = document.getElementById('updateUserRoleBtn');
        if (updateUserRoleBtn) {
            updateUserRoleBtn.addEventListener('click', () => this.updateUserRole());
        }
    }
    
    async switchTab(tabName) {
        // 更新按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active', 'text-primary', 'border-primary');
            btn.classList.add('text-gray-500', 'border-transparent');
        });
        
        const activeBtn = document.getElementById(`tab${tabName}`);
        if (activeBtn) {
            activeBtn.classList.add('active', 'text-primary', 'border-primary');
            activeBtn.classList.remove('text-gray-500', 'border-transparent');
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
        if (tabName === 'Groups' && this.groups.length === 0) {
            await this.loadGroups();
        } else if (tabName === 'Users' && this.users.length === 0) {
            await this.loadUsers();
        }
    }
    
    async loadData() {
        await Promise.all([
            this.loadOverview(),
            this.loadGroups(),
            this.loadUsers()
        ]);
    }
    
    async loadOverview() {
        if (!this.secretKey) {
            console.warn('秘钥未设置，无法加载概览');
            return;
        }
        try {
            const response = await api.getAdminOverview(this.app.userId, this.secretKey);
            if (response.success && response.data) {
                this.overview = response.data;
                this.updateOverview();
            }
        } catch (error) {
            console.error('加载概览失败:', error);
            Toast.show('加载概览失败: ' + (error.message || '未知错误'), 'error');
        }
    }
    
    updateOverview() {
        if (!this.overview) return;
        
        const totalGroupsEl = document.getElementById('totalGroups');
        const totalUsersEl = document.getElementById('totalUsers');
        const totalMessagesEl = document.getElementById('totalMessages');
        const topGroupsListEl = document.getElementById('topGroupsList');
        
        if (totalGroupsEl) totalGroupsEl.textContent = formatNumber(this.overview.totalGroups || 0);
        if (totalUsersEl) totalUsersEl.textContent = formatNumber(this.overview.totalUsers || 0);
        if (totalMessagesEl) totalMessagesEl.textContent = formatNumber(this.overview.totalMessages || 0);
        
        if (topGroupsListEl && this.overview.topGroups) {
            if (this.overview.topGroups.length === 0) {
                topGroupsListEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">暂无数据</p>';
            } else {
                topGroupsListEl.innerHTML = this.overview.topGroups.map((group, index) => `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div class="flex items-center space-x-3">
                            <span class="text-lg font-bold text-gray-400">#${index + 1}</span>
                            <div>
                                <p class="font-medium text-gray-900">${group.group_name || `群${group.group_id}`}</p>
                                <p class="text-xs text-gray-500">${group.user_count || 0} 用户 · ${group.group_id}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="font-semibold text-gray-900">${formatNumber(group.message_count || 0)}</p>
                            <p class="text-xs text-gray-500">消息</p>
                        </div>
                    </div>
                `).join('');
            }
        }
    }
    
    async loadGroups() {
        if (!this.secretKey) {
            console.warn('秘钥未设置，无法加载群列表');
            return;
        }
        try {
            const response = await api.getAdminGroups(this.app.userId, this.secretKey);
            if (response.success && response.data) {
                this.groups = response.data;
                this.updateGroupsList();
            }
        } catch (error) {
            console.error('加载群列表失败:', error);
            Toast.show('加载群列表失败: ' + (error.message || '未知错误'), 'error');
        }
    }
    
    updateGroupsList() {
        const groupsListEl = document.getElementById('groupsList');
        if (!groupsListEl) return;
        
        if (this.groups.length === 0) {
            groupsListEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">暂无群聊</p>';
            return;
        }
        
        groupsListEl.innerHTML = this.groups.map(group => {
            const isSelected = this.selectedGroupId === group.group_id;
            return `
                <div 
                    class="group-card p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                    }"
                    data-group-id="${group.group_id}"
                >
                    <div class="flex items-center justify-between">
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-gray-900 truncate">${group.group_name || `群${group.group_id}`}</p>
                            <p class="text-xs text-gray-500 mt-1">${group.group_id}</p>
                        </div>
                        ${isSelected ? `
                            <svg class="w-5 h-5 text-primary flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // 添加点击事件
        groupsListEl.querySelectorAll('.group-card').forEach(card => {
            card.addEventListener('click', () => {
                const groupId = card.dataset.groupId;
                this.selectGroup(groupId);
            });
        });
    }
    
    async selectGroup(groupId) {
        if (!groupId || !this.secretKey) return;
        
        this.selectedGroupId = groupId;
        this.updateGroupsList(); // 更新选中状态
        
        // 加载群详情
        await this.loadGroupStats(groupId);
    }
    
    async loadGroupStats(groupId) {
        if (!this.secretKey) return;
        
        try {
            const response = await api.getGroupStats(groupId);
            if (response.success && response.data) {
                this.selectedGroupStats = response.data;
                this.updateGroupDetail();
                // 加载群内用户排名
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
        
        if (!this.selectedGroupStats) {
            if (detailContent) detailContent.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }
        
        const stats = this.selectedGroupStats;
        const group = this.groups.find(g => g.group_id === stats.group_id);
        
        // 显示详情内容
        if (detailContent) detailContent.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
        
        // 更新标题
        const titleEl = document.getElementById('groupDetailTitle');
        if (titleEl) {
            titleEl.textContent = stats.group_name || `群${stats.group_id}`;
        }
        
        // 更新统计数据
        const userCountEl = document.getElementById('groupUserCount');
        const messageCountEl = document.getElementById('groupMessageCount');
        const wordCountEl = document.getElementById('groupWordCount');
        const groupIdEl = document.getElementById('groupDetailId');
        
        if (userCountEl) userCountEl.textContent = formatNumber(stats.user_count || 0);
        if (messageCountEl) messageCountEl.textContent = formatNumber(stats.total_messages || 0);
        if (wordCountEl) wordCountEl.textContent = formatNumber(stats.total_words || 0);
        if (groupIdEl) groupIdEl.textContent = stats.group_id;
    }
    
    async loadGroupRanking(groupId) {
        if (!groupId || !this.secretKey) return;
        
        try {
            const response = await api.getRanking('total', groupId, { limit: 10, page: 1 });
            
            if (response.success && response.data) {
                this.groupRanking = response.data;
                this.updateGroupRanking();
            } else {
                console.warn('获取群排名失败:', response);
                const rankingListEl = document.getElementById('groupRankingList');
                if (rankingListEl) {
                    rankingListEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">暂无排名数据</p>';
                }
            }
        } catch (error) {
            console.error('加载群排名失败:', error);
            const rankingListEl = document.getElementById('groupRankingList');
            if (rankingListEl) {
                rankingListEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">加载失败</p>';
            }
        }
    }
    
    updateGroupRanking() {
        const rankingListEl = document.getElementById('groupRankingList');
        if (!rankingListEl || !this.groupRanking) return;
        
        if (this.groupRanking.length === 0) {
            rankingListEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">暂无排名数据</p>';
            return;
        }
        
        rankingListEl.innerHTML = this.groupRanking.map((user, index) => {
            // 后端返回的字段是 count 和 user_id，不是 total_count 和 userId
            const messageCount = parseInt(user.count || user.total_count || 0, 10);
            const userId = user.user_id || user.userId;
            const nickname = user.nickname || userId;
            
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            return `
                <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div class="flex items-center space-x-3 flex-1 min-w-0">
                        <span class="text-sm font-bold text-gray-400 w-6">${medal || `#${index + 1}`}</span>
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-gray-900 truncate">${nickname}</p>
                            <p class="text-xs text-gray-500">${userId}</p>
                        </div>
                    </div>
                    <div class="text-right ml-2">
                        <p class="text-sm font-semibold text-gray-900">${formatNumber(messageCount)}</p>
                        <p class="text-xs text-gray-500">消息</p>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    async loadUsers() {
        if (!this.secretKey) {
            console.warn('秘钥未设置，无法加载用户列表');
            return;
        }
        try {
            const response = await api.getAdminUsers(this.app.userId, this.secretKey);
            if (response.success && response.data) {
                this.users = response.data;
                this.updateUsersList();
            }
        } catch (error) {
            console.error('加载用户列表失败:', error);
            Toast.show('加载用户列表失败: ' + (error.message || '未知错误'), 'error');
        }
    }
    
    updateUsersList() {
        const usersListEl = document.getElementById('usersList');
        const userCountEl = document.getElementById('userCount');
        
        if (userCountEl) {
            userCountEl.textContent = `共 ${this.users.length} 个用户`;
        }
        
        if (usersListEl) {
            if (this.users.length === 0) {
                usersListEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">暂无用户</p>';
            } else {
                usersListEl.innerHTML = this.users.map(user => {
                    const isSelected = this.selectedUserId === user.userId;
                    return `
                        <div 
                            class="user-card flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                            }"
                            data-user-id="${user.userId}"
                        >
                            <div class="flex items-center space-x-3 flex-1 min-w-0">
                                <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span class="text-primary font-semibold">${user.role === 'admin' ? 'A' : 'U'}</span>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="font-medium text-gray-900 truncate">${user.username || user.userId}</p>
                                    <p class="text-xs text-gray-500 truncate">
                                        ${user.role === 'admin' ? '管理员' : '普通用户'}
                                        ${user.createdAt ? ` • ${user.createdAt.split(' ')[0]}` : ''}
                                    </p>
                                </div>
                            </div>
                            ${isSelected ? `
                                <svg class="w-5 h-5 text-primary flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                            ` : `
                                <span class="px-2 py-1 text-xs font-medium rounded flex-shrink-0 ${
                                    user.role === 'admin' 
                                        ? 'bg-red-100 text-red-700' 
                                        : 'bg-blue-100 text-blue-700'
                                }">
                                    ${user.role === 'admin' ? '管理员' : '用户'}
                                </span>
                            `}
                        </div>
                    `;
                }).join('');
                
                // 添加点击事件
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
        if (!userId || !this.secretKey) return;
        
        this.selectedUserId = userId;
        this.updateUsersList(); // 更新选中状态
        
        // 加载用户详情
        await this.loadUserDetail(userId);
    }
    
    async loadUserDetail(userId) {
        if (!this.secretKey) return;
        
        try {
            // 获取用户所在的所有群
            const groupsResponse = await api.getUserGroups(userId);
            if (groupsResponse.success && groupsResponse.data) {
                const groups = groupsResponse.data;
                
                // 获取每个群的用户统计数据
                const groupsWithStats = await Promise.all(groups.map(async (group) => {
                    try {
                        const statsResponse = await api.getUserStats(userId, group.group_id);
                        
                        if (statsResponse.success && statsResponse.data) {
                            const stats = statsResponse.data;
                            // 确保数据字段正确映射 - 检查所有可能的字段名
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
                        } else {
                            console.warn(`群 ${group.group_id} 统计数据获取失败:`, statsResponse);
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
                
                // 计算总消息数和总字数
                let totalMessages = 0;
                let totalWords = 0;
                groupsWithStats.forEach(group => {
                    if (group.stats) {
                        totalMessages += group.stats.total_count || 0;
                        totalWords += group.stats.total_words || 0;
                    }
                });
                
                this.selectedUserData = {
                    userId,
                    groups: groupsWithStats,
                    user: this.users.find(u => u.userId === userId),
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
        
        if (!this.selectedUserData) {
            if (detailContent) detailContent.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }
        
        const user = this.selectedUserData.user;
        
        // 显示详情内容
        if (detailContent) detailContent.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
        
        // 更新标题
        const titleEl = document.getElementById('userDetailTitle');
        if (titleEl) {
            titleEl.textContent = user?.username || user?.userId || '未知用户';
        }
        
        // 更新基本信息
        const userIdEl = document.getElementById('userDetailId');
        const roleBadgeEl = document.getElementById('userDetailRoleBadge');
        const groupCountEl = document.getElementById('userGroupCount');
        const totalMessagesEl = document.getElementById('userTotalMessages');
        const totalWordsEl = document.getElementById('userTotalWords');
        const createdAtEl = document.getElementById('userCreatedAt');
        const updatedAtEl = document.getElementById('userUpdatedAt');
        const roleSelectEl = document.getElementById('userRoleSelect');
        const groupsCountEl = document.getElementById('userGroupsCount');
        
        if (userIdEl) userIdEl.textContent = this.selectedUserData.userId;
        
        // 更新角色徽章
        if (roleBadgeEl) {
            const isAdmin = user?.role === 'admin';
            roleBadgeEl.textContent = isAdmin ? '管理员' : '普通用户';
            roleBadgeEl.className = `px-3 py-1 text-sm font-medium rounded-full ${
                isAdmin 
                    ? 'bg-red-100 text-red-700 border border-red-200' 
                    : 'bg-blue-100 text-blue-700 border border-blue-200'
            }`;
        }
        
        if (groupCountEl) groupCountEl.textContent = formatNumber(this.selectedUserData.groups?.length || 0);
        if (totalMessagesEl) totalMessagesEl.textContent = formatNumber(this.selectedUserData.totalMessages || 0);
        if (totalWordsEl) totalWordsEl.textContent = formatNumber(this.selectedUserData.totalWords || 0);
        
        // 更新时间信息
        if (createdAtEl) {
            const createdAt = user?.createdAt || '-';
            createdAtEl.textContent = createdAt !== '-' ? createdAt.split(' ')[0] : '-';
        }
        if (updatedAtEl) {
            const updatedAt = user?.updatedAt || '-';
            updatedAtEl.textContent = updatedAt !== '-' ? updatedAt.split(' ')[0] : '-';
        }
        
        if (roleSelectEl) roleSelectEl.value = user?.role || 'user';
        
        // 更新群列表
        const groupsListEl = document.getElementById('userGroupsList');
        if (groupsListEl) {
            if (this.selectedUserData.groups && this.selectedUserData.groups.length > 0) {
                if (groupsCountEl) {
                    groupsCountEl.textContent = `共 ${this.selectedUserData.groups.length} 个群`;
                }
                
                groupsListEl.innerHTML = this.selectedUserData.groups.map((group, index) => {
                    const stats = group.stats || {};
                    const messageCount = parseInt(stats.total_count || 0, 10);
                    const wordCount = parseInt(stats.total_words || 0, 10);
                    const rank = stats.rank || null;
                    const hasData = messageCount > 0 || wordCount > 0;
                    
                    return `
                        <div class="bg-white rounded-lg p-4 border border-gray-200 hover:border-primary/50 hover:shadow-md transition-all">
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center space-x-3 flex-1 min-w-0">
                                    <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <span class="text-primary font-semibold text-sm">${index + 1}</span>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="font-semibold text-gray-900 truncate">${group.group_name || `群${group.group_id}`}</p>
                                        <p class="text-xs text-gray-500 mt-0.5">${group.group_id}</p>
                                    </div>
                                </div>
                                ${rank !== null && rank !== undefined ? `
                                    <span class="px-2 py-0.5 text-xs font-medium rounded ${
                                        rank === 1 ? 'bg-yellow-100 text-yellow-700' 
                                        : rank === 2 ? 'bg-gray-100 text-gray-700'
                                        : rank === 3 ? 'bg-orange-100 text-orange-700'
                                        : 'bg-blue-100 text-blue-700'
                                    }">
                                        #${rank}
                                    </span>
                                ` : ''}
                            </div>
                            
                            <div class="grid grid-cols-2 gap-3">
                                <div class="bg-gray-50 rounded-lg p-3">
                                    <p class="text-xs text-gray-600 mb-1">消息数</p>
                                    <p class="text-lg font-bold ${hasData ? 'text-gray-900' : 'text-gray-400'}">${formatNumber(messageCount)}</p>
                                </div>
                                <div class="bg-gray-50 rounded-lg p-3">
                                    <p class="text-xs text-gray-600 mb-1">字数</p>
                                    <p class="text-lg font-bold ${hasData ? 'text-gray-900' : 'text-gray-400'}">${formatNumber(wordCount)}</p>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                if (groupsCountEl) {
                    groupsCountEl.textContent = '';
                }
                groupsListEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">该用户不在任何群中</p>';
            }
        }
    }
    
    async updateUserRole() {
        if (!this.selectedUserId) {
            Toast.show('请先选择一个用户', 'error');
            return;
        }
        
        if (!this.secretKey) {
            Toast.show('请先验证权限', 'error');
            return;
        }
        
        const roleSelectEl = document.getElementById('userRoleSelect');
        if (!roleSelectEl) {
            Toast.show('找不到权限选择框', 'error');
            return;
        }
        
        const newRole = roleSelectEl.value;
        const currentRole = this.selectedUserData?.user?.role || 'user';
        
        if (newRole === currentRole) {
            Toast.show('权限未发生变化', 'info');
            return;
        }
        
        const userName = this.selectedUserData?.user?.username || this.selectedUserId;
        const roleText = newRole === 'admin' ? '管理员' : '普通用户';
        
        // 二次确认
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
                this.selectedUserId,
                newRole,
                this.app.userId,
                this.secretKey
            );
            
            if (response.success) {
                Toast.show(`权限已更新为${roleText}`, 'success');
                // 重新加载用户列表和详情
                await this.loadUsers();
                await this.loadUserDetail(this.selectedUserId);
            } else {
                Toast.show(response.message || '更新权限失败', 'error');
            }
        } catch (error) {
            console.error('更新权限失败:', error);
            Toast.show('更新失败: ' + (error.message || '未知错误'), 'error');
        }
    }
    
    async clearUserData() {
        if (!this.selectedUserId) {
            Toast.show('请先选择一个用户', 'error');
            return;
        }
        
        if (!this.secretKey) {
            Toast.show('请先验证权限', 'error');
            return;
        }
        
        const userName = this.selectedUserData?.user?.username || this.selectedUserId;
        
        // 二次确认
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
            // TODO: 需要添加清除用户数据的API
            Toast.show('清除用户数据功能待实现', 'info');
        } catch (error) {
            console.error('清除用户数据失败:', error);
            Toast.show('清除失败: ' + (error.message || '未知错误'), 'error');
        }
    }
    
    async refreshGroupStats() {
        if (!this.selectedGroupId) {
            Toast.show('请先选择一个群聊', 'error');
            return;
        }
        
        await this.loadGroupStats(this.selectedGroupId);
        Toast.show('统计数据已刷新', 'success');
    }
    
    async clearGroupStats() {
        if (!this.selectedGroupId) {
            Toast.show('请先选择一个群聊', 'error');
            return;
        }
        
        if (!this.secretKey) {
            Toast.show('请先验证权限', 'error');
            return;
        }
        
        const groupName = this.selectedGroupStats?.group_name || this.selectedGroupId;
        
        // 二次确认
        const confirmed = await new Promise((resolve) => {
            window.Modal.show('确认清除', `
                <div class="space-y-3">
                    <p class="text-gray-700 dark:text-gray-300">确定要清除群 <strong class="text-red-600 dark:text-red-400">${groupName}</strong> 的所有统计数据吗？</p>
                    <p class="text-sm text-red-600 dark:text-red-400 font-medium">⚠️ 此操作不可恢复！</p>
                </div>
            `, `
                <button class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium" id="confirmClearBtn">
                    确认清除
                </button>
                <button class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium" onclick="window.Modal.hide()">
                    取消
                </button>
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
            const response = await api.clearGroupStats(this.selectedGroupId, this.app.userId, this.secretKey);
            if (response.success) {
                Toast.show('清除成功', 'success');
                // 清空选中状态
                this.selectedGroupId = null;
                this.selectedGroupStats = null;
                // 重新加载数据
                await this.loadData();
                // 更新UI
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
