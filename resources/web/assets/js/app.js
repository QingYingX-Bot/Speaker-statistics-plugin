/**
 * 主应用类
 * 负责应用初始化、用户认证、路由管理和UI更新
 */
class App {
    constructor() {
        this.userId = null;
        this.secretKey = null;
        this.currentGroupId = null;
        this.isAdmin = false;
        this.navigation = null;
        this._checkingSecretKey = false;
    }
    
    // ========== 初始化相关 ==========
    
    /**
     * 初始化应用
     */
    async init() {
        // 优先从本地存储获取 userId（快速显示）
        this.userId = Storage.get('userId');
        
        // 尝试从 API 获取用户信息（从 token/cookie）
        let fromToken = false;
        try {
            const response = await Promise.race([
                api.getCurrentUser(this.userId),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
            ]).catch(() => null);
            
            if (response?.success) {
                const userId = response.userId || response.data?.userId;
                const userName = response.userName || response.data?.userName;
                
                if (userId) {
                    this.userId = userId;
                    fromToken = true;
                    if (userName) {
                        localStorage.setItem(`userName_${this.userId}`, userName);
                    }
                }
            }
        } catch (error) {
            // 静默失败，使用本地存储
        }
        
        // 如果没有 userId，显示输入框
        if (!this.userId) {
            this.showUserIdInput();
            return;
        }
        
        // 保存 userId
        Storage.set('userId', this.userId);
        
        // 初始化导航栏
        await this.initNavigation();
        
        // 初始化路由（先注册路由）
        this.initRoutes();
        
        // 启动路由（在权限检查之前，确保路由可以正常工作）
        // 路由初始化会等待 DOM 和路由注册完成
        router.init();
        
        Promise.all([
            this.checkUserPermission().catch(() => {}),
            this.checkAndPromptSecretKey(fromToken).catch(() => {})
        ]).then(() => {
            this.renderNavigation();
        });
        
        // 更新用户信息（单独执行，避免重复调用）
        this.updateUserInfo().catch(() => {});
    }
    
    // ========== 用户ID输入相关 ==========
    
    /**
     * 显示用户ID输入框
     */
    showUserIdInput() {
        const content = document.getElementById('pageContent');
        if (!content) return;
        
        content.innerHTML = `
            <div class="bg-white dark:bg-gray-900 min-h-full" style="min-height: calc(100vh - 56px);">
                <div class="max-w-2xl mx-auto px-3 sm:px-4 lg:px-8 py-8 sm:py-12 lg:py-16">
                    <div class="mb-6 sm:mb-8 text-center">
                        <h1 class="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">请输入用户ID</h1>
                        <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">请输入您的QQ号以继续使用</p>
                    </div>
                    
                    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6 lg:p-8">
                        <div class="space-y-4 sm:space-y-6">
                            <div>
                                <label for="userIdInput" class="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">用户ID</label>
                                <input 
                                    type="text" 
                                    id="userIdInput" 
                                    class="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm sm:text-base text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500" 
                                    placeholder="请输入您的QQ号"
                                    autocomplete="off"
                                    autofocus
                                >
                                <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">用户ID用于识别您的身份，请确保输入正确</p>
                            </div>
                            
                            <div class="pt-2">
                                <button 
                                    id="confirmUserIdBtn" 
                                    class="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm sm:text-base font-medium shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                                >
                                    确认
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 绑定事件
        const confirmBtn = document.getElementById('confirmUserIdBtn');
        const userIdInput = document.getElementById('userIdInput');
        
        const handleConfirm = async () => {
            const userId = userIdInput.value.trim();
            
            if (!userId) {
                Toast.show('请输入用户ID', 'error');
                userIdInput.focus();
                return;
            }
            
            if (!/^\d+$/.test(userId)) {
                Toast.show('用户ID应为数字', 'error');
                userIdInput.focus();
                return;
            }
            
            try {
                confirmBtn.disabled = true;
                confirmBtn.textContent = '验证中...';
                
                this.userId = userId;
                Storage.set('userId', userId);
                
                await this.updateUserInfo();
                this.initRoutes();
                router.init();
                
                confirmBtn.disabled = false;
                confirmBtn.textContent = '确认';
            } catch (error) {
                console.error('设置用户ID失败:', error);
                Toast.show('设置失败，请重试', 'error');
                confirmBtn.disabled = false;
                confirmBtn.textContent = '确认';
            }
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        userIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleConfirm();
        });
        
        setTimeout(() => userIdInput.focus(), 100);
    }
    
    // ========== 秘钥管理相关 ==========
    
    /**
     * 检查秘钥是否存在，如果不存在或不匹配则弹出设置窗口
     * @param {boolean} fromToken 是否从token访问（通过QQ命令链接）
     */
    async checkAndPromptSecretKey(fromToken = false) {
        if (this._checkingSecretKey) return;
        this._checkingSecretKey = true;
        
        try {
            // 如果是从 token 访问，检查是否已经验证过
            if (fromToken) {
                const tokenVerified = sessionStorage.getItem(`token_verified_${this.userId}`);
                if (tokenVerified) {
                    this._checkingSecretKey = false;
                    return;
                }
                
                const userName = localStorage.getItem(`userName_${this.userId}`) || null;
                await this.showTokenAccessConfirm(userName);
                sessionStorage.setItem(`token_verified_${this.userId}`, 'true');
                this._checkingSecretKey = false;
                return;
            }
            
            // 检查秘钥是否存在
            const hasSecretKey = await SecretKeyManager.checkExists(this.userId);
            if (!hasSecretKey) {
                await SecretKeyManager.prompt(this.userId);
                this._checkingSecretKey = false;
                return;
            }
            
            // 检查是否刚刚更新了秘钥（1分钟内跳过验证）
            const updateTimestamp = sessionStorage.getItem(`secret_key_updated_${this.userId}`);
            if (updateTimestamp) {
                const updateTime = parseInt(updateTimestamp, 10);
                const timeDiff = Date.now() - updateTime;
                const oneMinute = 60 * 1000;
                
                if (timeDiff < oneMinute) {
                    sessionStorage.removeItem(`achievement_verified_${this.userId}`);
                    this._checkingSecretKey = false;
                    return;
                } else {
                    sessionStorage.removeItem(`secret_key_updated_${this.userId}`);
                }
            }
            
            // 验证本地秘钥是否与服务器匹配
            const userName = localStorage.getItem(`userName_${this.userId}`) || null;
            const validation = await SecretKeyManager.validateLocalKey(this.userId, userName);
            
            if (!validation.matched) {
                await this.showKeyMismatchWarning(validation.message, userName);
            } else {
                if (updateTimestamp) {
                    sessionStorage.removeItem(`secret_key_updated_${this.userId}`);
                }
                sessionStorage.removeItem(`achievement_verified_${this.userId}`);
            }
        } catch (error) {
            console.error('检查秘钥存在性失败:', error);
            await SecretKeyManager.prompt(this.userId);
        } finally {
            this._checkingSecretKey = false;
        }
    }
    
    /**
     * 等待 Modal 组件加载
     * @returns {Promise<void>}
     */
    async waitForModal() {
        if (window.Modal && typeof window.Modal.show === 'function') {
            return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!window.Modal || typeof window.Modal.show !== 'function') {
            console.warn('Modal 组件未加载');
            throw new Error('Modal组件未加载');
        }
    }
    
    /**
     * 清除用户信息并返回输入界面
     */
    clearUserAndReturn() {
        this.userId = null;
        Storage.remove('userId');
        Storage.remove('secretKey');
        document.cookie = 'userId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.Modal.hide();
        this.showUserIdInput();
        this.updateUserInfo();
    }
    
    /**
     * 绑定"这不是我账号"按钮
     * @param {HTMLElement} btn 按钮元素
     * @param {Function} resolve Promise resolve 函数
     */
    bindNotMyAccountButton(btn, resolve) {
        if (!btn) return;
        
        btn.addEventListener('click', () => {
            this.clearUserAndReturn();
            if (resolve) resolve();
        });
    }
    
    /**
     * 显示token访问确认弹窗
     * @param {string} userName 用户名
     */
    async showTokenAccessConfirm(userName = null) {
        await this.waitForModal();
        
        // 检查用户是否存在于 key.json
        let userExists = false;
        try {
            await api.getSecretKey(this.userId);
            userExists = true;
        } catch (error) {
            if (error.message && (error.message.includes('404') || error.message.includes('不存在'))) {
                userExists = false;
            }
        }
        
        // 如果用户不存在，显示注册界面
        if (!userExists) {
            return this.showSecretKeyRegister(userName);
        }
        
        // 用户存在，显示验证界面
        return new Promise((resolve) => {
            window.Modal.show('身份确认', `
                <div class="space-y-4">
                    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div class="flex items-start gap-3">
                            <svg class="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <div class="flex-1">
                                <p class="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">请确认您的身份</p>
                                <p class="text-xs text-blue-700 dark:text-blue-400 mb-3">请确认以下信息是否正确，然后输入您的秘钥进行验证</p>
                                <div class="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                                    <p class="text-xs text-blue-600 dark:text-blue-400 mb-1">用户ID:</p>
                                    <p class="text-xl font-bold text-blue-800 dark:text-blue-300">${this.userId}</p>
                                    ${userName ? `
                                    <p class="text-xs text-blue-600 dark:text-blue-400 mb-1 mt-3">用户名:</p>
                                    <p class="text-lg font-semibold text-blue-800 dark:text-blue-300">${userName}</p>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">请输入您的秘钥</label>
                        <input type="password" id="secretKeyConfirmInput" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500" placeholder="请输入秘钥进行验证">
                        <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">秘钥用于验证您的身份，请妥善保管</div>
                    </div>
                </div>
            `, `
                <button class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium" id="confirmSecretKeyBtn">确认验证</button>
                <button class="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors text-sm font-medium border border-orange-300 dark:border-orange-700" id="notMyAccountBtn">这不是我账号</button>
                <button class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium" onclick="Modal.hide()">稍后处理</button>
            `);
            
            setTimeout(() => {
                const confirmBtn = document.getElementById('confirmSecretKeyBtn');
                const keyInput = document.getElementById('secretKeyConfirmInput');
                const notMyAccountBtn = document.getElementById('notMyAccountBtn');
                
                this.bindNotMyAccountButton(notMyAccountBtn, resolve);
                
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
                            
                            const response = await api.validateSecretKey(this.userId, secretKey);
                            
                            if (!response.success || !response.data?.valid) {
                                Toast.show(response.message || '秘钥验证失败', 'error');
                                confirmBtn.disabled = false;
                                confirmBtn.textContent = '确认验证';
                                return;
                            }
                            
                            Toast.show(response.message || '秘钥验证成功', 'success');
                            await SecretKeyManager.save(this.userId, secretKey);
                            sessionStorage.setItem(`token_verified_${this.userId}`, 'true');
                            
                            window.Modal.hide();
                            Toast.show('验证成功', 'success');
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
                        if (e.key === 'Enter') handleConfirm();
                    });
                    keyInput.focus();
                }
            }, 100);
        });
    }
    
    /**
     * 显示秘钥注册界面（用户不存在时）
     * @param {string} userName 用户名
     */
    async showSecretKeyRegister(userName = null) {
        await this.waitForModal();
        
        return new Promise((resolve) => {
            window.Modal.show('注册秘钥', `
                <div class="space-y-4">
                    <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <div class="flex items-start gap-3">
                            <svg class="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                            <div class="flex-1">
                                <p class="text-sm font-medium text-green-800 dark:text-green-300 mb-2">欢迎注册</p>
                                <p class="text-xs text-green-700 dark:text-green-400 mb-3">检测到您还未注册秘钥，请设置一个秘钥用于身份验证</p>
                                <div class="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                                    <p class="text-xs text-green-600 dark:text-green-400 mb-1">用户ID:</p>
                                    <p class="text-xl font-bold text-green-800 dark:text-green-300">${this.userId}</p>
                                    ${userName ? `
                                    <p class="text-xs text-green-600 dark:text-green-400 mb-1 mt-3">用户名:</p>
                                    <p class="text-lg font-semibold text-green-800 dark:text-green-300">${userName}</p>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">请设置您的秘钥</label>
                        <input type="password" id="secretKeyRegisterInput" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500" placeholder="请输入您要设置的秘钥">
                        <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">秘钥用于验证您的身份，请妥善保管。设置后请牢记，忘记将无法找回。</div>
                    </div>
                </div>
            `, `
                <button class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium" id="confirmRegisterBtn">确认注册</button>
                <button class="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors text-sm font-medium border border-orange-300 dark:border-orange-700" id="notMyAccountBtn">这不是我账号</button>
                <button class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium" onclick="Modal.hide()">稍后处理</button>
            `);
            
            setTimeout(() => {
                const confirmBtn = document.getElementById('confirmRegisterBtn');
                const keyInput = document.getElementById('secretKeyRegisterInput');
                const notMyAccountBtn = document.getElementById('notMyAccountBtn');
                
                this.bindNotMyAccountButton(notMyAccountBtn, resolve);
                
                if (confirmBtn && keyInput) {
                    const handleConfirm = async () => {
                        const secretKey = keyInput.value.trim();
                        
                        if (!secretKey) {
                            Toast.show('请输入秘钥', 'error');
                            return;
                        }
                        
                        if (secretKey.length < 4) {
                            Toast.show('秘钥长度至少为4个字符', 'error');
                            return;
                        }
                        
                        try {
                            confirmBtn.disabled = true;
                            confirmBtn.textContent = '注册中...';
                            
                            await SecretKeyManager.save(this.userId, secretKey);
                            sessionStorage.setItem(`token_verified_${this.userId}`, 'true');
                            sessionStorage.setItem(`secret_key_updated_${this.userId}`, Date.now().toString());
                            
                            window.Modal.hide();
                            Toast.show('秘钥注册成功', 'success');
                            resolve();
                        } catch (error) {
                            console.error('注册秘钥失败:', error);
                            Toast.show('注册失败: ' + (error.message || '未知错误'), 'error');
                            confirmBtn.disabled = false;
                            confirmBtn.textContent = '确认注册';
                        }
                    };
                    
                    confirmBtn.addEventListener('click', handleConfirm);
                    keyInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') handleConfirm();
                    });
                    keyInput.focus();
                }
            }, 100);
        });
    }
    
    /**
     * 显示秘钥不匹配警告
     * @param {string} message 错误消息
     * @param {string} userName 用户名
     */
    async showKeyMismatchWarning(message, userName = null) {
        await this.waitForModal();
        
        return new Promise((resolve) => {
            const displayMessage = message || `本地秘钥与服务器不匹配${userName ? `\n用户名: ${userName}` : ''}\n请输入正确的秘钥进行验证`;
            
            window.Modal.show('秘钥不匹配', `
                <div class="space-y-4">
                    <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <div class="flex items-start gap-3">
                            <svg class="w-6 h-6 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                            <div class="flex-1">
                                <p class="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">提示</p>
                                <p class="text-xs text-yellow-700 dark:text-yellow-400 whitespace-pre-line mb-3">${displayMessage}</p>
                                <div class="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800">
                                    <p class="text-xs text-yellow-600 dark:text-yellow-500 mb-1">当前用户ID:</p>
                                    <p class="text-xl font-bold text-yellow-800 dark:text-yellow-300">${this.userId}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">请输入正确的秘钥</label>
                        <input type="password" id="correctSecretKeyInput" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500" placeholder="请输入正确的秘钥">
                        <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">如果输入正确，将自动保存；如果输入错误，将要求重新设置</div>
                    </div>
                </div>
            `, `
                <button class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium" id="verifyCorrectKeyBtn">验证秘钥</button>
                <button class="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors text-sm font-medium border border-orange-300 dark:border-orange-800" id="notMyAccountBtn">这不是我账号</button>
                <button class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium" onclick="Modal.hide()">稍后处理</button>
            `);
            
            setTimeout(() => {
                const verifyBtn = document.getElementById('verifyCorrectKeyBtn');
                const keyInput = document.getElementById('correctSecretKeyInput');
                const notMyAccountBtn = document.getElementById('notMyAccountBtn');
                
                this.bindNotMyAccountButton(notMyAccountBtn, resolve);
                
                if (verifyBtn && keyInput) {
                    const handleVerify = async () => {
                        const secretKey = keyInput.value.trim();
                        
                        if (!secretKey) {
                            Toast.show('请输入秘钥', 'error');
                            return;
                        }
                        
                        try {
                            verifyBtn.disabled = true;
                            verifyBtn.textContent = '验证中...';
                            
                            const response = await api.validateSecretKey(this.userId, secretKey);
                            
                            if (response.success && response.data?.valid) {
                                Toast.show(response.message || '秘钥验证成功', 'success');
                                await SecretKeyManager.save(this.userId, secretKey);
                                
                                sessionStorage.removeItem(`achievement_verified_${this.userId}`);
                                sessionStorage.removeItem(`token_verified_${this.userId}`);
                                sessionStorage.setItem(`secret_key_updated_${this.userId}`, Date.now().toString());
                                
                                window.Modal.hide();
                                Toast.show('秘钥已更新', 'success');
                                resolve();
                            } else {
                                verifyBtn.disabled = false;
                                verifyBtn.textContent = '验证秘钥';
                                Toast.show(response.message || '秘钥验证失败，请重新设置', 'error');
                                window.Modal.hide();
                                this.showResetSecretKeyModal(userName, resolve);
                            }
                        } catch (error) {
                            console.error('验证秘钥失败:', error);
                            Toast.show('验证失败: ' + (error.message || '未知错误'), 'error');
                            verifyBtn.disabled = false;
                            verifyBtn.textContent = '验证秘钥';
                        }
                    };
                    
                    verifyBtn.addEventListener('click', handleVerify);
                    keyInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') handleVerify();
                    });
                    keyInput.focus();
                }
            }, 100);
        });
    }
    
    /**
     * 显示重新设置秘钥的弹窗（需要验证码）
     * @param {string} userName 用户名
     * @param {Function} resolveCallback Promise resolve 回调
     */
    async showResetSecretKeyModal(userName = null, resolveCallback = null) {
        await this.waitForModal();
        
        return new Promise((resolve) => {
            window.Modal.show('重新设置秘钥', `
                <div class="space-y-4">
                    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div class="flex items-start gap-3">
                            <svg class="w-6 h-6 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                            <div class="flex-1">
                                <p class="text-sm font-medium text-red-800 dark:text-red-300 mb-2">需要重新设置</p>
                                <p class="text-xs text-red-700 dark:text-red-400 mb-3">秘钥验证失败，请通过验证码重新设置秘钥</p>
                                <div class="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                                    <p class="text-xs text-red-600 dark:text-red-500 mb-1">当前用户ID:</p>
                                    <p class="text-xl font-bold text-red-800 dark:text-red-300">${this.userId}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">验证码</label>
                        <div class="flex gap-2">
                            <input type="text" id="verificationCodeInput" class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500" placeholder="请输入6位验证码" maxlength="6">
                            <button id="sendCodeBtn" class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium whitespace-nowrap">发送验证码</button>
                        </div>
                        <div class="mt-1 text-xs text-gray-500 dark:text-gray-400" id="codeHint">验证码将发送到您的QQ</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">新秘钥</label>
                        <input type="password" id="secretKeyInput" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500" placeholder="请输入新秘钥">
                        <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">秘钥用于验证您的身份，请妥善保管</div>
                    </div>
                </div>
            `, `
                <button class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium" id="confirmUpdateBtn">确认修改</button>
                <button class="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors text-sm font-medium border border-orange-300 dark:border-orange-800" id="notMyAccountBtn">这不是我账号</button>
                <button class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium" onclick="Modal.hide()">稍后处理</button>
            `);
            
            setTimeout(() => {
                const confirmBtn = document.getElementById('confirmUpdateBtn');
                const sendCodeBtn = document.getElementById('sendCodeBtn');
                const codeInput = document.getElementById('verificationCodeInput');
                const keyInput = document.getElementById('secretKeyInput');
                const codeHint = document.getElementById('codeHint');
                const notMyAccountBtn = document.getElementById('notMyAccountBtn');
                
                this.bindNotMyAccountButton(notMyAccountBtn, () => {
                    if (resolveCallback) resolveCallback();
                    resolve();
                });
                
                let countdownTimer = null;
                let countdown = 0;
                
                // 发送验证码倒计时
                const startCountdown = () => {
                    countdown = 60;
                    sendCodeBtn.disabled = true;
                    sendCodeBtn.textContent = `${countdown}秒后重试`;
                    
                    countdownTimer = setInterval(() => {
                        countdown--;
                        if (countdown > 0) {
                            sendCodeBtn.textContent = `${countdown}秒后重试`;
                        } else {
                            clearInterval(countdownTimer);
                            sendCodeBtn.disabled = false;
                            sendCodeBtn.textContent = '发送验证码';
                            codeHint.textContent = '验证码将发送到您的QQ';
                            codeHint.className = 'mt-1 text-xs text-gray-500 dark:text-gray-400';
                        }
                    }, 1000);
                };
                
                // 发送验证码
                sendCodeBtn.addEventListener('click', async () => {
                    try {
                        sendCodeBtn.disabled = true;
                        sendCodeBtn.textContent = '发送中...';
                        
                        await api.sendVerificationCode(this.userId);
                        
                        Toast.show('验证码已发送，请查看QQ消息', 'success');
                        codeHint.textContent = '验证码已发送，请查看QQ消息（有效期1分钟）';
                        codeHint.className = 'mt-1 text-xs text-green-600 dark:text-green-400';
                        
                        startCountdown();
                    } catch (error) {
                        console.error('发送验证码失败:', error);
                        Toast.show('发送失败: ' + (error.message || '未知错误'), 'error');
                        sendCodeBtn.disabled = false;
                        sendCodeBtn.textContent = '发送验证码';
                    }
                });
                
                // 确认修改
                if (confirmBtn && codeInput && keyInput) {
                    const handleUpdate = async () => {
                        const code = codeInput.value.trim();
                        const key = keyInput.value.trim();
                        
                        if (!code) {
                            Toast.show('请输入验证码', 'error');
                            return;
                        }
                        
                        if (!key) {
                            Toast.show('请输入新秘钥', 'error');
                            return;
                        }
                        
                        try {
                            // 验证验证码
                            const verifyResult = await api.verifyCode(this.userId, code);
                            if (!verifyResult.success || !verifyResult.data?.valid) {
                                Toast.show(verifyResult.message || '验证码错误', 'error');
                                return;
                            }
                            
                            // 保存新秘钥
                            confirmBtn.disabled = true;
                            confirmBtn.textContent = '保存中...';
                            
                            await SecretKeyManager.save(this.userId, key);
                            
                            sessionStorage.removeItem(`achievement_verified_${this.userId}`);
                            sessionStorage.removeItem(`token_verified_${this.userId}`);
                            sessionStorage.setItem(`secret_key_updated_${this.userId}`, Date.now().toString());
                            
                            if (countdownTimer) {
                                clearInterval(countdownTimer);
                            }
                            
                            window.Modal.hide();
                            Toast.show('秘钥已更新', 'success');
                            if (resolveCallback) resolveCallback();
                            resolve();
                        } catch (error) {
                            console.error('更新秘钥失败:', error);
                            Toast.show('更新失败: ' + (error.message || '未知错误'), 'error');
                            confirmBtn.disabled = false;
                            confirmBtn.textContent = '确认修改';
                        }
                    };
                    
                    confirmBtn.addEventListener('click', handleUpdate);
                    codeInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') handleUpdate();
                    });
                    keyInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') handleUpdate();
                    });
                    codeInput.focus();
                }
            }, 100);
        });
    }
    
    // ========== 用户权限相关 ==========
    
    /**
     * 检查用户权限（管理员）
     */
    async checkUserPermission() {
        if (!this.userId) {
            this.isAdmin = false;
            return;
        }
        
        try {
            const response = await api.getCurrentUser(this.userId);
            if (response?.success && response.data) {
                this.isAdmin = response.data.isAdmin === true;
                this.updateAdminLinkVisibility();
            } else {
                this.isAdmin = false;
            }
        } catch (error) {
            this.isAdmin = false;
        }
    }
    
    /**
     * 更新管理链接的显示/隐藏状态
     */
    updateAdminLinkVisibility() {
        const adminLink = document.getElementById('adminLink');
        const mobileAdminLink = document.getElementById('mobileAdminLink');
        
        if (adminLink) {
            adminLink.style.display = this.isAdmin ? 'block' : 'none';
        }
        
        if (mobileAdminLink) {
            if (this.isAdmin) {
                mobileAdminLink.classList.remove('hidden');
            } else {
                mobileAdminLink.classList.add('hidden');
            }
        }
    }
    
    /**
     * 更新用户信息显示
     */
    async updateUserInfo() {
        const topNavUserIdEl = document.getElementById('topNavUserId');
        const mobileUserIdEl = document.getElementById('mobileUserId');
        const adminLink = document.getElementById('adminLink');
        const mobileAdminLink = document.getElementById('mobileAdminLink');
        
        if (!this.userId) {
            if (topNavUserIdEl) topNavUserIdEl.textContent = '未登录';
            if (mobileUserIdEl) mobileUserIdEl.textContent = '未登录';
            if (adminLink) adminLink.style.display = 'none';
            if (mobileAdminLink) mobileAdminLink.classList.add('hidden');
            return;
        }
        
        // 从 API 获取用户信息（包括权限）
        try {
            const response = await api.getCurrentUser(this.userId);
            if (response?.success) {
                if (response.data?.userName) {
                    localStorage.setItem(`userName_${this.userId}`, response.data.userName);
                }
                this.isAdmin = response.data?.isAdmin === true;
                this.updateAdminLinkVisibility();
            } else {
                this.isAdmin = false;
                this.updateAdminLinkVisibility();
            }
        } catch (error) {
            this.isAdmin = false;
            this.updateAdminLinkVisibility();
        }
        
        // 尝试从 localStorage 获取用户名（作为后备）
        let userName = localStorage.getItem(`userName_${this.userId}`);
        
        // 如果没有存储的用户名，尝试从统计数据中获取
        if (!userName) {
            try {
                const groupsResponse = await api.getUserGroups(this.userId);
                if (groupsResponse.success && groupsResponse.data?.length > 0) {
                    const firstGroup = groupsResponse.data[0];
                    const statsResponse = await api.getUserStats(this.userId, firstGroup.group_id);
                    if (statsResponse.success && statsResponse.data?.nickname) {
                        userName = statsResponse.data.nickname;
                        localStorage.setItem(`userName_${this.userId}`, userName);
                    }
                }
            } catch (error) {
                // 静默失败，使用用户ID
            }
        }
        
        // 更新显示（导航栏显示用户名，页面内容中的用户ID不受影响）
        const displayText = userName || this.userId;
        
        // 更新顶部导航栏的用户名显示
        if (topNavUserIdEl) {
            topNavUserIdEl.textContent = displayText;
        }
        
        if (mobileUserIdEl) {
            mobileUserIdEl.textContent = displayText;
        }
        
        // 更新左侧导航栏的用户名显示
        const leftNavUserId = document.getElementById('leftNavUserId');
        if (leftNavUserId) {
            leftNavUserId.textContent = userName || this.userId || '未登录';
        }
    }
    
    // ========== 导航栏相关 ==========
    
    /**
     * 初始化导航栏组件
     */
    async initNavigation() {
        try {
            const { Navigation } = await import('/assets/js/components/Navigation.js');
            this.navigation = new Navigation();
            
            const position = this.navigation.getPosition();
            if (position === 'left') {
                document.body.classList.add('nav-left');
            } else {
                document.body.classList.remove('nav-left');
            }
            
            this.renderNavigation();
        } catch (error) {
            console.error('初始化导航栏失败:', error);
        }
    }
    
    /**
     * 渲染导航栏
     */
    renderNavigation() {
        if (!this.navigation) return;
        
        const container = document.getElementById('navigationContainer');
        if (!container) return;
        
        const currentRoute = router?.getCurrentRoute() || '/';
        const position = this.navigation.getPosition();
        
        container.innerHTML = this.navigation.render(this.userId, this.isAdmin, currentRoute);
        
        if (position === 'left') {
            document.body.classList.add('nav-left');
        } else {
            document.body.classList.remove('nav-left');
        }
        
        this.navigation.init();
        this.setupNavigationEvents();
        
        requestAnimationFrame(() => {
            this.navigation.updateActive(currentRoute);
        });
    }
    
    /**
     * 设置导航栏事件监听器
     */
    setupNavigationEvents() {
        // 主题切换按钮
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        if (themeToggleBtn && !themeToggleBtn.dataset.listenerBound) {
            themeToggleBtn.dataset.listenerBound = 'true';
            themeToggleBtn.addEventListener('click', (e) => this.toggleTheme(e));
        }
        
        // 设置按钮
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn && !settingsBtn.dataset.listenerBound) {
            settingsBtn.dataset.listenerBound = 'true';
            settingsBtn.addEventListener('click', () => router.navigate('/settings'));
        }
        
        // 用户信息按钮
        const userInfoBtn = document.getElementById('userInfoBtn');
        if (userInfoBtn && !userInfoBtn.dataset.listenerBound) {
            userInfoBtn.dataset.listenerBound = 'true';
            userInfoBtn.addEventListener('click', () => {
                if (router) router.navigate('/profile');
            });
        }
        
        // 导航栏位置切换按钮
        const navPositionToggleBtn = document.getElementById('navPositionToggleBtn');
        if (navPositionToggleBtn && !navPositionToggleBtn.dataset.listenerBound) {
            navPositionToggleBtn.dataset.listenerBound = 'true';
            navPositionToggleBtn.addEventListener('click', () => {
                if (this.navigation) this.navigation.togglePosition();
            });
        }
    }
    
    /**
     * 更新导航栏位置
     * @param {string} position 位置（'left' 或 'top'）
     */
    updateNavigationPosition(position) {
        if (!this.navigation) return;
        this.navigation.setPosition(position);
        this.renderNavigation();
    }
    
    /**
     * 切换主题（带平滑动画效果）
     */
    toggleTheme(event) {
        const isDark = document.documentElement.classList.contains('dark');
        const favicon = document.querySelector('link[rel="icon"]');
        
        // 直接切换主题，依靠CSS过渡效果实现平滑切换
            if (isDark) {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
                if (favicon) favicon.href = '/assets/favicon-light.ico';
            } else {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
                if (favicon) favicon.href = '/assets/favicon-dark.ico';
            }
            
            // 更新导航栏激活状态
            if (this.navigation) {
                const currentRoute = router?.getCurrentRoute() || '/';
                requestAnimationFrame(() => {
                    this.navigation.updateActive(currentRoute);
                });
            }
        
        // 更新图表（主题切换后重新生成图表以更新颜色）
        // 使用双重 requestAnimationFrame 确保 DOM 和样式完全更新后再更新图表
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    if (window.app && window.app.currentPage && window.app.currentPage.overviewModule) {
                        // 强制重新生成图表：先销毁所有图表实例，然后重新创建
                        const overviewModule = window.app.currentPage.overviewModule;
                        
                        // 销毁所有图表实例
                        if (overviewModule.groupActivityChart) {
                            overviewModule.groupActivityChart.dispose();
                            overviewModule.groupActivityChart = null;
                        }
                        if (overviewModule.messageTrendChart) {
                            overviewModule.messageTrendChart.dispose();
                            overviewModule.messageTrendChart = null;
                        }
                        if (overviewModule.messageDensityChart) {
                            overviewModule.messageDensityChart.dispose();
                            overviewModule.messageDensityChart = null;
                        }
                        if (overviewModule.groupGrowthChart) {
                            overviewModule.groupGrowthChart.dispose();
                            overviewModule.groupGrowthChart = null;
                        }
                        
                        // 重新初始化并更新图表
                        overviewModule.updateCharts();
                    }
                }, 200);
            });
        });
    }
    
    // ========== 路由相关 ==========
    
    /**
     * 初始化路由
     */
    initRoutes() {
        // 确保路由按顺序注册，重要路由先注册
        router.register('/background', () => this.loadPage('Background'));
        router.register('/ranking', () => this.loadPage('Ranking'));
        router.register('/achievements', () => this.loadPage('Achievement'));
        router.register('/settings', () => this.loadPage('Settings'));
        router.register('/profile', () => this.loadPage('Profile'));
        router.register('/', () => this.loadPage('Home')); // 根路由最后注册，作为默认路由
        
        // 管理页面（需要权限检查）
        router.register('/admin', () => {
            if (!this.isAdmin) {
                this.checkUserPermission().then(() => {
                    if (!this.isAdmin) {
                        Toast.show('您没有管理员权限，无法访问管理页面', 'error', 3000);
                        router.navigate('/');
                        return;
                    }
                    this.loadPage('Admin');
                }).catch(() => {
                    router.navigate('/');
                    Toast.show('权限检查失败，请重试', 'error');
                });
            } else {
                this.loadPage('Admin');
            }
        });
    }
    
    /**
     * 加载页面
     * @param {string} pageName 页面名称
     */
    async loadPage(pageName) {
        try {
            // 管理页面权限检查
            if (pageName === 'Admin') {
                if (this.isAdmin === undefined || this.isAdmin === null) {
                    await this.checkUserPermission();
                }
                if (!this.isAdmin) {
                    Toast.show('您没有管理员权限，无法访问管理页面', 'error', 3000);
                    router.navigate('/');
                    return;
                }
            }
            
            const content = document.getElementById('pageContent');
            if (content && (!content.dataset.loading || content.dataset.loading !== pageName)) {
                content.dataset.loading = pageName;
            }
            
            // 并行执行：更新用户信息和加载页面组件
            const [_, pageModule] = await Promise.all([
                this.updateUserInfo().catch(() => {}),
                import(`/pages/${pageName}.js`)
            ]);
            
            if (pageModule.default) {
                const page = new pageModule.default(this);
                const html = await page.render();
                
                requestAnimationFrame(() => {
                    if (content) {
                        content.innerHTML = html;
                        if (page.mounted) {
                            requestAnimationFrame(async () => {
                                await page.mounted();
                                if (window.initCustomSelects && !page.initCustomSelectsForActiveTab) {
                                    setTimeout(() => window.initCustomSelects(), 150);
                                }
                            });
                        }
                    }
                });
            }
        } catch (error) {
            console.error(`加载页面 ${pageName} 失败:`, error);
            const content = document.getElementById('pageContent');
            if (content) {
                content.innerHTML = `
                    <div class="bg-white min-h-full flex items-center justify-center">
                        <div class="text-center px-4">
                            <div class="text-4xl mb-4">❌</div>
                            <div class="text-lg font-medium text-gray-900 mb-2">页面加载失败</div>
                            <div class="text-sm text-gray-500">${error.message || '未知错误'}</div>
                            <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm">
                                刷新页面
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    }
}

// ========== 应用初始化 ==========

document.addEventListener('DOMContentLoaded', async () => {
    // 动态导入组件
    try {
        await import('/assets/js/components/index.js');
    } catch (error) {
        console.warn('组件加载失败，使用基础功能:', error);
    }
    
    // 创建应用实例
    const app = new App();
    window.app = app;
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden && app.userId) {
            await app.updateUserInfo();
        }
    });
    
    // 监听窗口焦点变化
    window.addEventListener('focus', async () => {
        if (app.userId) {
            await app.updateUserInfo();
        }
    });
    
    // 设置按钮事件
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => router.navigate('/settings'));
    }
    
    // 移动端菜单按钮
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenuBtn && mobileMenu) {
        const toggleMenu = (show) => {
            if (show) {
                mobileMenu.classList.remove('hidden');
                requestAnimationFrame(() => {
                    mobileMenu.style.maxHeight = mobileMenu.scrollHeight + 'px';
                });
            } else {
                mobileMenu.style.maxHeight = '0';
                setTimeout(() => {
                    mobileMenu.classList.add('hidden');
                }, 300);
            }
        };
        
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu(mobileMenu.classList.contains('hidden'));
        });
        
        document.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', () => toggleMenu(false));
        });
        
        document.addEventListener('click', (e) => {
            if (mobileMenu && !mobileMenu.classList.contains('hidden') && 
                !mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                toggleMenu(false);
            }
        });
    }
    
    // 主题切换功能
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const favicon = document.getElementById('favicon');
    
    // 初始化主题
    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        
        if (!savedTheme) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.documentElement.classList.add('dark');
                if (favicon) favicon.href = '/assets/favicon-dark.ico';
            } else {
                document.documentElement.classList.remove('dark');
                if (favicon) favicon.href = '/assets/favicon-light.ico';
            }
        } else {
            if (savedTheme === 'dark') {
                document.documentElement.classList.add('dark');
                if (favicon) favicon.href = '/assets/favicon-dark.ico';
            } else {
                document.documentElement.classList.remove('dark');
                if (favicon) favicon.href = '/assets/favicon-light.ico';
            }
        }
    };
    
    // 切换主题
    const toggleTheme = () => {
        const isDark = document.documentElement.classList.contains('dark');
        
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            if (favicon) favicon.href = '/assets/favicon-light.ico';
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            if (favicon) favicon.href = '/assets/favicon-dark.ico';
        }
    };
    
    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                document.documentElement.classList.add('dark');
                if (favicon) favicon.href = '/assets/favicon-dark.ico';
            } else {
                document.documentElement.classList.remove('dark');
                if (favicon) favicon.href = '/assets/favicon-light.ico';
            }
        }
    });
    
    // 初始化主题并绑定事件
    initTheme();
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
    
    // 初始化应用
    app.init();
});