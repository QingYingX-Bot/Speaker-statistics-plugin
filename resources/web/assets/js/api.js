/**
 * API 封装 - 统一管理所有 API 请求
 */
class API {
    constructor() {
        this.baseURL = ''; // 相对路径，同源请求
    }
    
    /**
     * 统一的请求方法
     * @param {string} url 请求 URL
     * @param {Object} options 请求选项
     * @returns {Promise} 响应数据
     */
    async request(url, options = {}) {
        // 如果 body 是 FormData，不设置 Content-Type（让浏览器自动设置）
        // 否则默认使用 JSON
        const headers = { ...(options.headers || {}) };
        
        if (!(options.body instanceof FormData)) {
            if (!headers['Content-Type']) {
                headers['Content-Type'] = 'application/json';
            }
        }
        
        // 如果 body 是普通对象且不是 FormData，自动转换为 JSON
        let body = options.body;
        if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams) && !(body instanceof Blob)) {
            if (headers['Content-Type'] === 'application/json') {
                body = JSON.stringify(body);
            }
        }
        
        const config = {
            ...options,
            headers,
            body
        };
        
        try {
            const response = await fetch(`${this.baseURL}${url}`, config);
            
            // 检查响应类型
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                // 如果不是 JSON，尝试解析为文本
                const text = await response.text();
                try {
                    data = JSON.parse(text);
                } catch {
                    data = text;
                }
            }
            
            if (!response.ok) {
                throw new Error(data.error || data.message || `请求失败: ${response.status} ${response.statusText}`);
            }
            
            return data;
        } catch (error) {
            console.error('API请求失败:', url, error);
            throw error;
        }
    }
    
    // ========== 统计数据API ==========
    
    /**
     * 获取用户统计数据
     * @param {string} userId 用户ID
     * @param {string} groupId 群组ID
     * @returns {Promise} 用户统计数据
     */
    async getUserStats(userId, groupId) {
        return this.request(`/api/stats/user/${userId}?groupId=${groupId}`);
    }
    
    /**
     * 获取群组统计数据
     * @param {string} groupId 群组ID
     * @returns {Promise} 群组统计数据
     */
    async getGroupStats(groupId) {
        return this.request(`/api/stats/group/${groupId}`);
    }
    
    /**
     * 获取用户所在的所有群组
     * @param {string} userId 用户ID
     * @returns {Promise} 群组列表
     */
    async getUserGroups(userId) {
        return this.request(`/api/stats/user/${userId}/groups`);
    }
    
    // ========== 排行榜API ==========
    
    /**
     * 获取排行榜数据
     * @param {string} type 排行榜类型 (total, daily, weekly, monthly, yearly)
     * @param {string} groupId 群组ID
     * @param {Object} options 选项
     * @param {number} options.limit 每页数量
     * @param {number} options.page 页码
     * @returns {Promise} 排行榜数据
     */
    async getRanking(type, groupId, options = {}) {
        const params = new URLSearchParams({
            limit: options.limit || 20,
            page: options.page || 1,
        });
        return this.request(`/api/rankings/${type}/${groupId}?${params}`);
    }
    
    // ========== 成就API ==========
    
    /**
     * 获取成就列表
     * @param {string} groupId 群组ID
     * @param {string|null} userId 用户ID（可选）
     * @returns {Promise} 成就列表
     */
    async getAchievementList(groupId, userId = null) {
        const url = userId 
            ? `/api/achievements/list/${groupId}?userId=${userId}`
            : `/api/achievements/list/${groupId}`;
        return this.request(url);
    }
    
    /**
     * 获取成就列表（管理员）
     * @param {string} userId 管理员用户ID
     * @param {string} secretKey 管理员秘钥
     * @param {string} groupId 群组ID
     * @returns {Promise} 成就列表
     */
    async getAdminAchievementList(userId, secretKey, groupId) {
        return this.request(`/api/admin/achievements/list/${groupId}?userId=${userId}&secretKey=${encodeURIComponent(secretKey)}`);
    }
    
    /**
     * 获取用户成就
     * @param {string} userId 用户ID
     * @param {string} groupId 群组ID
     * @returns {Promise} 用户成就数据
     */
    async getUserAchievements(userId, groupId) {
        return this.request(`/api/achievements/user/${userId}/${groupId}`);
    }
    
    /**
     * 获取成就统计
     * @param {string} groupId 群组ID
     * @returns {Promise} 成就统计数据
     */
    async getAchievementStats(groupId) {
        return this.request(`/api/achievements/stats/${groupId}`);
    }
    
    /**
     * 获取成就统计（管理员）
     * @param {string} userId 管理员用户ID
     * @param {string} secretKey 管理员秘钥
     * @param {string} groupId 群组ID
     * @returns {Promise} 成就统计数据
     */
    async getAdminAchievementStats(userId, secretKey, groupId) {
        return this.request(`/api/admin/achievements/stats/${groupId}?userId=${userId}&secretKey=${encodeURIComponent(secretKey)}`);
    }
    
    /**
     * 获取全部成就统计（所有群组汇总）
     * @param {string} userId 用户ID
     * @param {string} secretKey 秘钥
     * @returns {Promise} 成就统计
     */
    async getAdminAchievementStatsAll(userId, secretKey) {
        return this.request(`/api/admin/achievements/stats/all?userId=${userId}&secretKey=${encodeURIComponent(secretKey)}`);
    }
    
    /**
     * 设置显示成就
     * @param {string} userId 用户ID
     * @param {string} groupId 群组ID
     * @param {string} achievementId 成就ID
     * @param {string} secretKey 秘钥
     * @returns {Promise} 操作结果
     */
    async setDisplayAchievement(userId, groupId, achievementId, secretKey) {
        return this.request('/api/achievements/set-display', {
            method: 'POST',
            body: {
                userId,
                groupId,
                achievementId,
                secretKey
            },
        });
    }
    
    // ========== 背景API ==========
    
    /**
     * 获取背景图片 URL
     * @param {string} userId 用户ID
     * @param {string} type 背景类型 (normal, ranking)
     * @returns {string} 背景图片 URL
     */
    getBackground(userId, type = 'ranking') {
        // 返回背景图片的完整 URL（用于 img src）
        return `${this.baseURL}/api/background/${userId}?type=${type}`;
    }
    
    /**
     * 上传背景图片
     * @param {string} userId 用户ID
     * @param {File} file 图片文件
     * @param {string} backgroundType 背景类型
     * @param {string} secretKey 秘钥
     * @returns {Promise} 上传结果
     */
    async uploadBackground(userId, file, backgroundType, secretKey) {
        const formData = new FormData();
        formData.append('background', file);
        formData.append('userId', userId);
        formData.append('secretKey', secretKey);
        formData.append('backgroundType', backgroundType);
        
        return this.request('/api/apply-background', {
            method: 'POST',
            body: formData
        });
    }
    
    /**
     * 删除背景
     * @param {string} userId 用户ID
     * @param {string} type 背景类型 (normal, ranking)
     * @param {string|null} secretKey 秘钥（可选）
     * @returns {Promise} 删除结果
     */
    async deleteBackground(userId, type = 'normal', secretKey = null) {
        let url = `/api/background/${userId}?type=${type}`;
        if (secretKey) {
            url += `&secretKey=${encodeURIComponent(secretKey)}`;
        }
        
        return this.request(url, {
            method: 'DELETE',
        });
    }
    
    // ========== 用户认证API ==========
    
    /**
     * 获取当前用户信息（从cookie或userId参数）
     * @param {string} userId 用户ID（可选，如果提供则作为query参数传递）
     * @returns {Promise} 当前用户信息
     */
    async getCurrentUser(userId = null) {
        const url = userId ? `/api/current-user?userId=${encodeURIComponent(userId)}` : '/api/current-user';
        const result = await this.request(url);
        return result;
    }
    
    // ========== 秘钥API ==========
    
    /**
     * 获取秘钥
     * @param {string} userId 用户ID
     * @returns {Promise} 秘钥数据
     */
    async getSecretKey(userId) {
        const result = await this.request(`/api/secret-key/${userId}`);
        return result;
    }
    
    /**
     * 保存秘钥
     * @param {string} userId 用户ID
     * @param {string} secretKey 秘钥
     * @param {string} oldSecretKey 旧秘钥（可选，用于修改秘钥时验证）
     * @param {string} verificationCode 验证码（可选，如果提供且验证成功，将跳过旧秘钥验证）
     * @returns {Promise} 保存结果
     */
    async saveSecretKey(userId, secretKey, oldSecretKey = null, verificationCode = null) {
        const body = {
            userId,
            secretKey
        };
        if (oldSecretKey) {
            body.oldSecretKey = oldSecretKey;
        }
        if (verificationCode) {
            body.verificationCode = verificationCode;
        }
        const result = await this.request('/api/save-secret-key', {
            method: 'POST',
            body: body,
        });
        return result;
    }
    
    /**
     * 验证秘钥
     * @param {string} userId 用户ID
     * @param {string} secretKey 秘钥
     * @returns {Promise} 验证结果
     */
    async validateSecretKey(userId, secretKey) {
        const result = await this.request('/api/validate-secret-key', {
            method: 'POST',
            body: {
                userId,
                secretKey
            },
        });
        return result;
    }
    
    // ========== 管理API ==========
    
    /**
     * 获取管理群组列表
     * @param {string} userId 用户ID
     * @param {string} secretKey 秘钥
     * @returns {Promise} 群组列表
     */
    async getAdminGroups(userId, secretKey) {
        return this.request(`/api/admin/groups?userId=${userId}&secretKey=${encodeURIComponent(secretKey)}`);
    }
    
    /**
     * 获取全局配置
     * @param {string} userId 用户ID
     * @param {string} secretKey 秘钥
     * @returns {Promise} 全局配置
     */
    async getGlobalConfig(userId, secretKey) {
        return this.request(`/api/admin/config?userId=${userId}&secretKey=${encodeURIComponent(secretKey)}`);
    }
    
    /**
     * 保存全局配置
     * @param {string} userId 用户ID
     * @param {string} secretKey 秘钥
     * @param {Object} config 配置对象
     * @returns {Promise} 保存结果
     */
    async saveGlobalConfig(userId, secretKey, config) {
        return this.request(`/api/admin/config?userId=${userId}&secretKey=${encodeURIComponent(secretKey)}`, {
            method: 'POST',
            body: { config }
        });
    }
    
    /**
     * 更新单个配置项
     * @param {string} userId 用户ID
     * @param {string} secretKey 秘钥
     * @param {string} key 配置键
     * @param {any} value 配置值
     * @returns {Promise} 更新结果
     */
    async updateConfigItem(userId, secretKey, key, value) {
        return this.request(`/api/admin/config/${encodeURIComponent(key)}?userId=${userId}&secretKey=${encodeURIComponent(secretKey)}`, {
            method: 'PUT',
            body: { value }
        });
    }
    
    /**
     * 清除群组统计数据
     * @param {string} groupId 群组ID
     * @param {string} userId 用户ID
     * @param {string} secretKey 秘钥
     * @returns {Promise} 操作结果
     */
    async clearGroupStats(groupId, userId, secretKey) {
        return this.request(`/api/admin/stats/${groupId}?userId=${userId}&secretKey=${encodeURIComponent(secretKey)}`, {
            method: 'DELETE',
        });
    }
    
    /**
     * 获取用户列表（管理员）
     * @param {string} userId 用户ID
     * @param {string} secretKey 秘钥
     * @returns {Promise} 用户列表
     */
    async getAdminUsers(userId, secretKey) {
        return this.request(`/api/admin/users?userId=${userId}&secretKey=${encodeURIComponent(secretKey)}`);
    }
    
    /**
     * 获取权限信息（管理员）
     * @param {string} userId 用户ID
     * @param {string} secretKey 秘钥
     * @returns {Promise} 权限信息
     */
    async getAdminPermission(userId, secretKey) {
        return this.request(`/api/admin/permission?userId=${userId}&secretKey=${encodeURIComponent(secretKey)}`);
    }
    
    /**
     * 更新用户角色（管理员）
     * @param {string} targetUserId 目标用户ID
     * @param {string} role 角色 ('admin' | 'user')
     * @param {string} userId 当前用户ID
     * @param {string} secretKey 秘钥
     * @returns {Promise} 更新结果
     */
    async updateUserRole(targetUserId, role, userId, secretKey) {
        return this.request(`/api/admin/users/${targetUserId}/role?userId=${userId}&secretKey=${encodeURIComponent(secretKey)}`, {
            method: 'PUT',
            body: { role },
        });
    }
    
    /**
     * 重置用户密码（管理员）
     * @param {string} targetUserId 目标用户ID
     * @param {string} userId 当前用户ID
     * @param {string} secretKey 秘钥
     * @returns {Promise} 重置结果
     */
    async resetUserPassword(targetUserId, userId, secretKey) {
        return this.request(`/api/admin/users/${targetUserId}/password?userId=${userId}&secretKey=${encodeURIComponent(secretKey)}`, {
            method: 'PUT',
        });
    }
    
    /**
     * 获取统计概览（管理员）
     * @param {string} userId 用户ID
     * @param {string} secretKey 秘钥
     * @returns {Promise} 统计概览
     */
    async getAdminOverview(userId, secretKey) {
        return this.request(`/api/admin/overview?userId=${userId}&secretKey=${encodeURIComponent(secretKey)}`);
    }
    
    /**
     * 获取统计数据（管理员）- 支持日期范围查询
     * @param {string} userId 用户ID
     * @param {string} secretKey 秘钥
     * @param {string} startDate 开始日期 (YYYY-MM-DD)
     * @param {string} endDate 结束日期 (YYYY-MM-DD)
     * @returns {Promise} 统计数据
     */
    async getAdminStatistics(userId, secretKey, startDate, endDate) {
        return this.request(`/api/admin/statistics?userId=${userId}&secretKey=${encodeURIComponent(secretKey)}&startDate=${startDate}&endDate=${endDate}`);
    }
    
    /**
     * 获取词云数据
     * @param {string} userId 用户ID
     * @param {string} secretKey 秘钥
     * @returns {Promise} 词云数据
     */
    async getWordCloud(userId, secretKey) {
        return this.request(`/api/admin/wordcloud?userId=${userId}&secretKey=${encodeURIComponent(secretKey)}`);
    }
    
    // ========== 系统API ==========
    
    /**
     * 获取系统版本信息
     * @returns {Promise} 系统版本信息
     */
    async getSystemVersion() {
        return this.request('/api/system/version');
    }
    
    // ========== 验证码API ==========
    
    /**
     * 发送验证码
     * @param {string} userId 用户ID
     * @returns {Promise} 发送结果
     */
    async sendVerificationCode(userId) {
        return this.request('/api/send-verification-code', {
            method: 'POST',
            body: { userId },
        });
    }
    
    /**
     * 验证验证码
     * @param {string} userId 用户ID
     * @param {string} code 验证码
     * @returns {Promise} 验证结果
     */
    async verifyCode(userId, code) {
        return this.request('/api/verify-code', {
            method: 'POST',
            body: { userId, code },
        });
    }
}

// 创建全局实例
window.api = new API();
