/**
 * 主应用
 */

class App {
    constructor() {
        this.userId = null;
        this.secretKey = null;
        this.currentGroupId = null;
        this.isAdmin = false; // 用户权限状态
        this.navigation = null; // 导航栏组件实例
    }
    
    async init() {
        // 优先从本地存储获取（快速显示），然后从API验证
        this.userId = Storage.get('userId');
        
        // 并行执行：获取API用户信息和初始化路由
        let fromToken = false;
        try {
            // 使用 Promise.race 设置超时，避免长时间等待
            // 如果本地存储有 userId，传递给 API
            const response = await Promise.race([
                api.getCurrentUser(this.userId), // 传递本地存储的 userId
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
            ]).catch(err => {
                // 超时或失败时，使用本地存储的userId
                return null;
            });
            
            if (response && response.success) {
                // API返回格式：{ success: true, userId: ..., userName: ... } 或 { success: true, data: { userId, userName } }
                const userId = response.userId || (response.data && response.data.userId);
                const userName = response.userName || (response.data && response.data.userName);
                
                if (userId) {
                    this.userId = userId;
                    fromToken = true; // 标记为从token/cookie获取
                    // 如果API返回了用户名，保存到本地
                    if (userName) {
                        localStorage.setItem(`userName_${this.userId}`, userName);
                    }
                }
            }
        } catch (error) {
            // 静默失败，使用本地存储
        }
        
        if (!this.userId) {
            // 如果没有userId，显示输入框
            this.showUserIdInput();
            return;
        }
        
        // 保存userId
        Storage.set('userId', this.userId);
        
        // 初始化导航栏
        await this.initNavigation();
        
        // 初始化路由（不等待用户信息更新，提升加载速度）
        this.initRoutes();
        
        // 并行执行：更新UI、检查权限和检查秘钥
        Promise.all([
            this.checkUserPermission().catch(() => {}),
            this.checkAndPromptSecretKey(fromToken).catch(() => {})
        ]).then(() => {
            // 更新导航栏（权限检查完成后）
            this.renderNavigation();
            // 启动路由（在所有初始化完成后）
        router.init();
        });
        
        // updateUserInfo 单独执行，避免重复调用 getCurrentUser
        this.updateUserInfo().catch(() => {});
    }
    
    /**
     * 检查秘钥是否存在，如果不存在或不匹配则弹出设置窗口
     * @param {boolean} fromToken 是否从token访问（通过QQ命令链接）
     */
    async checkAndPromptSecretKey(fromToken = false) {
        // 防止重复调用
        if (this._checkingSecretKey) {
            return;
        }
        
        this._checkingSecretKey = true;
        
        try {
            // 如果是从token访问，检查是否已经验证过（只在第一次访问时验证）
            if (fromToken) {
                const tokenVerified = sessionStorage.getItem(`token_verified_${this.userId}`);
                if (tokenVerified) {
                    // 已经验证过，跳过
                    this._checkingSecretKey = false;
                    return;
                }
                
                // 第一次访问，显示确认弹窗
                const userName = localStorage.getItem(`userName_${this.userId}`) || null;
                await this.showTokenAccessConfirm(userName);
                // 标记为已验证
                sessionStorage.setItem(`token_verified_${this.userId}`, 'true');
                this._checkingSecretKey = false;
                return;
            }
            
            // 先检查秘钥是否存在
            const hasSecretKey = await SecretKeyManager.checkExists(this.userId);
            if (!hasSecretKey) {
                await SecretKeyManager.prompt(this.userId);
                this._checkingSecretKey = false;
                return;
            }
            
            // 检查是否刚刚更新了秘钥（1分钟内跳过验证，因为服务器可能需要时间同步）
            const updateTimestamp = sessionStorage.getItem(`secret_key_updated_${this.userId}`);
            if (updateTimestamp) {
                const updateTime = parseInt(updateTimestamp, 10);
                const now = Date.now();
                const timeDiff = now - updateTime;
                const oneMinute = 1 * 60 * 1000; // 1分钟
                
                if (timeDiff < oneMinute) {
                    // 1分钟内，跳过验证（避免服务器同步延迟导致的误报）
                    // 清除验证状态，确保使用新秘钥
                    sessionStorage.removeItem(`achievement_verified_${this.userId}`);
                    this._checkingSecretKey = false;
                    return;
                } else {
                    // 超过1分钟，清除标记，正常验证
                    sessionStorage.removeItem(`secret_key_updated_${this.userId}`);
                }
            }
            
            // 如果存在，验证本地秘钥是否与服务器匹配
            const userName = localStorage.getItem(`userName_${this.userId}`) || null;
            const validation = await SecretKeyManager.validateLocalKey(this.userId, userName);
            
            if (!validation.matched) {
                // 显示警告并要求修改秘钥
                // 注意：用户修改完成后，showKeyMismatchWarning 会调用 SecretKeyManager.save 更新本地存储
                // 并在内部设置 secret_key_updated 时间戳
                await this.showKeyMismatchWarning(validation.message, userName);
            } else {
                // 验证成功，清除更新标记（如果存在），因为已经验证成功，不需要再跳过验证
                if (updateTimestamp) {
                    sessionStorage.removeItem(`secret_key_updated_${this.userId}`);
                }
                // 清除验证状态，确保后续使用正确的秘钥
                sessionStorage.removeItem(`achievement_verified_${this.userId}`);
            }
        } catch (error) {
            console.error('检查秘钥存在性失败:', error);
            // 即使检查失败，也尝试弹出设置窗口
            await SecretKeyManager.prompt(this.userId);
        } finally {
            this._checkingSecretKey = false;
        }
    }
    
    /**
     * 显示token访问确认弹窗（替换之前的秘钥不匹配弹窗）
     * @param {string} userName 用户名
     */
    async showTokenAccessConfirm(userName = null) {
        // 等待 Modal 组件加载
        if (!window.Modal || typeof window.Modal.show !== 'function') {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (!window.Modal || typeof window.Modal.show !== 'function') {
                console.warn('Modal 组件未加载，无法显示确认窗口');
                return;
            }
        }
        
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
                        <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            秘钥用于验证您的身份，请妥善保管
                        </div>
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
                
                // 处理"这不是我账号"按钮
                if (notMyAccountBtn) {
                    notMyAccountBtn.addEventListener('click', () => {
                        // 清除当前用户ID和相关信息
                        this.userId = null;
                        Storage.remove('userId');
                        // 清除本地秘钥
                        Storage.remove('secretKey');
                        // 清除cookie（通过设置过期时间）
                        document.cookie = 'userId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                        
                        // 关闭弹窗
                        window.Modal.hide();
                        
                        // 显示用户ID输入框，让用户重新输入
                        this.showUserIdInput();
                        
                        // 更新导航栏
                        this.updateUserInfo();
                        
                        resolve();
                    });
                }
                
                // 确认验证
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
                            const response = await api.validateSecretKey(this.userId, secretKey);
                            
                            if (!response.success || !response.data?.valid) {
                                Toast.show(response.message || '秘钥验证失败', 'error');
                                confirmBtn.disabled = false;
                                confirmBtn.textContent = '确认验证';
                                return;
                            }
                            
                            Toast.show(response.message || '秘钥验证成功', 'success');
                            
                            // 验证成功，保存秘钥到本地
                            await SecretKeyManager.save(this.userId, secretKey);
                            
                            // 标记token已验证
                            sessionStorage.setItem(`token_verified_${this.userId}`, 'true');
                            
                            // 关闭弹窗
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
                        if (e.key === 'Enter') {
                            handleConfirm();
                        }
                    });
                    keyInput.focus();
                }
            }, 100);
        });
    }
    
    /**
     * 显示秘钥不匹配警告，先让用户输入正确秘钥，如果输入错误再要求重新设置
     */
    async showKeyMismatchWarning(message, userName = null) {
        // 等待 Modal 组件加载
        if (!window.Modal || typeof window.Modal.show !== 'function') {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (!window.Modal || typeof window.Modal.show !== 'function') {
                console.warn('Modal 组件未加载，无法显示警告');
                return;
            }
        }
        
        return new Promise((resolve) => {
            const displayMessage = message || `本地秘钥与服务器不匹配${userName ? `\n用户名: ${userName}` : ''}\n请输入正确的秘钥进行验证`;
            
            // 第一步：输入正确秘钥验证
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
                        <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            如果输入正确，将自动保存；如果输入错误，将要求重新设置
                        </div>
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
                
                // 处理"这不是我账号"按钮
                if (notMyAccountBtn) {
                    notMyAccountBtn.addEventListener('click', () => {
                        // 清除当前用户ID和相关信息
                        this.userId = null;
                        Storage.remove('userId');
                        // 清除本地秘钥
                        Storage.remove('secretKey');
                        
                        // 关闭弹窗
                        window.Modal.hide();
                        
                        // 显示用户ID输入框，让用户重新输入
                        this.showUserIdInput();
                        
                        // 更新导航栏
                        this.updateUserInfo();
                        
                        resolve();
                    });
                }
                
                // 验证正确秘钥
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
                            
                            // 验证秘钥
                            const response = await api.validateSecretKey(this.userId, secretKey);
                            
                            if (response.success && response.data?.valid) {
                                // 验证成功，保存秘钥
                                Toast.show(response.message || '秘钥验证成功', 'success');
                                
                                await SecretKeyManager.save(this.userId, secretKey);
                                
                                // 清除所有相关的 sessionStorage 验证状态
                                sessionStorage.removeItem(`achievement_verified_${this.userId}`);
                                sessionStorage.removeItem(`token_verified_${this.userId}`);
                                
                                // 标记秘钥已更新（使用时间戳），避免立即重新验证（服务器可能需要一点时间同步）
                                const updateTimestamp = Date.now();
                                sessionStorage.setItem(`secret_key_updated_${this.userId}`, updateTimestamp.toString());
                                
                                window.Modal.hide();
                                Toast.show('秘钥已更新', 'success');
                                resolve();
                            } else {
                                // 验证失败，显示重新设置流程
                                verifyBtn.disabled = false;
                                verifyBtn.textContent = '验证秘钥';
                                
                                Toast.show(response.message || '秘钥验证失败，请重新设置', 'error');
                                
                                // 关闭当前弹窗，显示重新设置弹窗
                                window.Modal.hide();
                                
                                // 显示重新设置流程（需要验证码）
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
                        if (e.key === 'Enter') {
                            handleVerify();
                        }
                    });
                    keyInput.focus();
                }
            }, 100);
        });
    }
    
    /**
     * 显示重新设置秘钥的弹窗（需要验证码）
     */
    async showResetSecretKeyModal(userName = null, resolveCallback = null) {
        // 等待 Modal 组件加载
        if (!window.Modal || typeof window.Modal.show !== 'function') {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (!window.Modal || typeof window.Modal.show !== 'function') {
                console.warn('Modal 组件未加载，无法显示警告');
                return;
            }
        }
        
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
                        <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            秘钥用于验证您的身份，请妥善保管
                        </div>
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
                
                // 处理"这不是我账号"按钮
                if (notMyAccountBtn) {
                    notMyAccountBtn.addEventListener('click', () => {
                        // 清除当前用户ID和相关信息
                        this.userId = null;
                        Storage.remove('userId');
                        // 清除本地秘钥
                        Storage.remove('secretKey');
                        
                        // 关闭弹窗
                        window.Modal.hide();
                        
                        // 显示用户ID输入框，让用户重新输入
                        this.showUserIdInput();
                        
                        // 更新导航栏
                        this.updateUserInfo();
                        
                        if (resolveCallback) resolveCallback();
                        resolve();
                    });
                }
                
                let countdownTimer = null;
                let countdown = 0;
                
                // 发送验证码功能
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
                            
                            // 验证码通过，保存新秘钥
                            confirmBtn.disabled = true;
                            confirmBtn.textContent = '保存中...';
                            
                            await SecretKeyManager.save(this.userId, key);
                            
                            // 清除所有相关的 sessionStorage 验证状态
                            sessionStorage.removeItem(`achievement_verified_${this.userId}`);
                            sessionStorage.removeItem(`token_verified_${this.userId}`);
                            
                            // 标记秘钥已更新（使用时间戳），避免立即重新验证（服务器可能需要一点时间同步）
                            const updateTimestamp = Date.now();
                            sessionStorage.setItem(`secret_key_updated_${this.userId}`, updateTimestamp.toString());
                            
                            // 清理定时器
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
                        if (e.key === 'Enter') {
                            handleUpdate();
                        }
                    });
                    keyInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            handleUpdate();
                        }
                    });
                    codeInput.focus();
                }
            }, 100);
        });
    }
    
    // 显示用户ID输入框
    showUserIdInput() {
        const content = document.getElementById('pageContent');
        content.innerHTML = `
            <div class="bg-white dark:bg-gray-900 min-h-full" style="min-height: calc(100vh - 56px);">
                <div class="max-w-2xl mx-auto px-3 sm:px-4 lg:px-8 py-8 sm:py-12 lg:py-16">
                    <!-- 页面标题 -->
                    <div class="mb-6 sm:mb-8 text-center">
                        <h1 class="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">请输入用户ID</h1>
                        <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">请输入您的QQ号以继续使用</p>
                </div>
                    
                    <!-- 输入表单卡片 -->
                    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6 lg:p-8">
                        <div class="space-y-4 sm:space-y-6">
                            <div>
                                <label for="userIdInput" class="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    用户ID
                                </label>
                                <input 
                                    type="text" 
                                    id="userIdInput" 
                                    class="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm sm:text-base text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500" 
                                    placeholder="请输入您的QQ号"
                                    autocomplete="off"
                                    autofocus
                                >
                                <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    用户ID用于识别您的身份，请确保输入正确
                                </p>
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
        
        // 添加事件监听器
        const confirmBtn = document.getElementById('confirmUserIdBtn');
        const userIdInput = document.getElementById('userIdInput');
        
        const handleConfirm = async () => {
            const userId = userIdInput.value.trim();
            if (!userId) {
                Toast.show('请输入用户ID', 'error');
                userIdInput.focus();
                return;
            }
            
            // 验证用户ID格式（应该是数字）
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
                
                // 更新用户信息
                await this.updateUserInfo();
                
                // 初始化路由
                this.initRoutes();
                router.init();
                
                // 恢复按钮状态
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
        
        // 支持回车键提交
        userIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleConfirm();
            }
        });
        
        // 自动聚焦输入框
        setTimeout(() => {
            userIdInput.focus();
        }, 100);
    }
    
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
            
            if (response && response.success && response.data) {
                this.isAdmin = response.data.isAdmin === true;
                // 更新导航栏显示
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
    
    // 更新用户信息显示
    async updateUserInfo() {
        const userIdEl = document.getElementById('userId');
        const mobileUserIdEl = document.getElementById('mobileUserId');
        const adminLink = document.getElementById('adminLink');
        const mobileAdminLink = document.getElementById('mobileAdminLink');
        
        if (!this.userId) {
            if (userIdEl) userIdEl.textContent = '未登录';
            if (mobileUserIdEl) mobileUserIdEl.textContent = '未登录';
            // 隐藏管理链接
            if (adminLink) adminLink.style.display = 'none';
            if (mobileAdminLink) mobileAdminLink.classList.add('hidden');
            return;
        }
        
        // 从API获取用户信息（包括权限）
        try {
            const response = await api.getCurrentUser(this.userId);
            
            if (response && response.success) {
                // 更新用户名
                if (response.data && response.data.userName) {
                    localStorage.setItem(`userName_${this.userId}`, response.data.userName);
                }
                
                // 检查并显示/隐藏管理链接
                this.isAdmin = response.data && response.data.isAdmin === true;
                // 使用统一的方法更新管理链接显示
                this.updateAdminLinkVisibility();
                    } else {
                // 隐藏管理链接（如果获取失败，默认不显示）
                this.isAdmin = false;
                this.updateAdminLinkVisibility();
            }
        } catch (error) {
            // 隐藏管理链接（如果获取失败，默认不显示）
            this.isAdmin = false;
            this.updateAdminLinkVisibility();
        }
        
        // 尝试从localStorage获取用户名（作为后备）
        let userName = localStorage.getItem(`userName_${this.userId}`);
        
        // 如果没有存储的用户名，尝试从统计数据中获取
        if (!userName) {
            try {
                // 尝试获取用户所在的第一个群的统计数据来获取用户名
                const groupsResponse = await api.getUserGroups(this.userId);
                if (groupsResponse.success && groupsResponse.data && groupsResponse.data.length > 0) {
                    const firstGroup = groupsResponse.data[0];
                    const statsResponse = await api.getUserStats(this.userId, firstGroup.group_id);
                    if (statsResponse.success && statsResponse.data && statsResponse.data.nickname) {
                        userName = statsResponse.data.nickname;
                        // 缓存用户名
                        localStorage.setItem(`userName_${this.userId}`, userName);
                    }
                }
            } catch (error) {
                    // 静默失败，使用用户ID
            }
        }
        
        // 更新桌面端和移动端显示
        const displayText = userName || this.userId;
        
        // 只更新导航栏中的 userId 元素（避免影响 Profile 页面中的 userId 元素）
        // 检查 userIdEl 是否在导航栏中（通过检查父元素是否包含导航相关的类或 ID）
        if (userIdEl) {
            const isInNav = userIdEl.closest('nav') || userIdEl.closest('#userInfoBtn');
            if (isInNav) {
                userIdEl.textContent = displayText;
            }
        }
        
        if (mobileUserIdEl) {
            mobileUserIdEl.textContent = displayText;
    }
    
        // 更新左侧导航栏的用户名显示（优先显示用户名）
        const leftNavUserId = document.getElementById('leftNavUserId');
        if (leftNavUserId) {
            // 优先使用用户名，如果没有用户名则使用用户ID
            const displayName = userName || this.userId || '未登录';
            leftNavUserId.textContent = displayName;
        }
    }
    
    /**
     * 初始化导航栏组件
     */
    async initNavigation() {
        try {
            // 动态导入 Navigation 组件
            const { Navigation } = await import('/assets/js/components/Navigation.js');
            this.navigation = new Navigation();
            
            // 初始化时设置 body 类名
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
     * 渲染导航栏 - 简化布局逻辑
     */
    renderNavigation() {
        if (!this.navigation) return;
        
        const container = document.getElementById('navigationContainer');
        if (!container) return;
        
        const currentRoute = router?.getCurrentRoute() || '/';
        const position = this.navigation.getPosition();
        
        // 渲染导航栏 HTML
        const navHtml = this.navigation.render(this.userId, this.isAdmin, currentRoute);
        container.innerHTML = navHtml;
        
        // 更新 body 类名以应用正确的布局样式
        if (position === 'left') {
            document.body.classList.add('nav-left');
        } else {
            document.body.classList.remove('nav-left');
        }
        
        // 初始化导航栏事件
        this.navigation.init();
        
        // 绑定事件监听器
        this.setupNavigationEvents();
        
        // 更新激活状态（确保在 DOM 更新后执行）
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
            themeToggleBtn.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        // 设置按钮
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn && !settingsBtn.dataset.listenerBound) {
            settingsBtn.dataset.listenerBound = 'true';
            settingsBtn.addEventListener('click', () => {
                router.navigate('/settings');
            });
        }
        
        // 用户信息按钮 - 点击跳转到个人中心
        const userInfoBtn = document.getElementById('userInfoBtn');
        if (userInfoBtn && !userInfoBtn.dataset.listenerBound) {
            userInfoBtn.dataset.listenerBound = 'true';
            userInfoBtn.addEventListener('click', () => {
                // 跳转到个人中心页面
                if (router) {
                    router.navigate('/profile');
                }
            });
        }
        
        // 导航栏位置切换按钮（如果 Navigation 组件没有绑定，这里作为备用）
        const navPositionToggleBtn = document.getElementById('navPositionToggleBtn');
        if (navPositionToggleBtn && !navPositionToggleBtn.dataset.listenerBound) {
            navPositionToggleBtn.dataset.listenerBound = 'true';
            navPositionToggleBtn.addEventListener('click', () => {
                if (this.navigation) {
                    this.navigation.togglePosition();
                }
            });
        }
    }

    /**
     * 更新导航栏位置 - 简化逻辑
     */
    updateNavigationPosition(position) {
        if (!this.navigation) return;
        
        this.navigation.setPosition(position);
        
        // 重新渲染导航栏（会自动更新 body 类名和激活状态）
        this.renderNavigation();
    }
    
    /**
     * 切换主题
     */
    toggleTheme() {
        const isDark = document.documentElement.classList.contains('dark');
        const favicon = document.querySelector('link[rel="icon"]');
        
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            if (favicon) {
                favicon.href = '/assets/favicon-light.ico';
            }
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            if (favicon) {
                favicon.href = '/assets/favicon-dark.ico';
            }
        }
        
        // 主题切换后，更新导航栏激活状态以刷新样式
        if (this.navigation) {
            const currentRoute = router?.getCurrentRoute() || '/';
            requestAnimationFrame(() => {
                this.navigation.updateActive(currentRoute);
            });
        }
    }
    
    // 初始化路由
    initRoutes() {
        // 首页
        router.register('/', () => {
            this.loadPage('Home');
        });
        
        // 排行榜
        router.register('/ranking', () => {
            this.loadPage('Ranking');
        });
        
        // 成就
        router.register('/achievements', () => {
            this.loadPage('Achievement');
        });
        
        // 背景设置
        router.register('/background', () => {
            this.loadPage('Background');
        });
        
        // 管理页面（需要权限检查）
        router.register('/admin', () => {
            // 检查权限
            if (!this.isAdmin) {
                // 重新检查权限（可能权限状态未更新）
                this.checkUserPermission().then(() => {
                    if (!this.isAdmin) {
                        // 无权限，显示提示并跳转到首页
                        Toast.show('您没有管理员权限，无法访问管理页面', 'error', 3000);
                        router.navigate('/');
                        return;
                    }
                    // 有权限，加载管理页面
            this.loadPage('Admin');
                }).catch(() => {
                    router.navigate('/');
                    Toast.show('权限检查失败，请重试', 'error');
                });
            } else {
                // 有权限，直接加载
                this.loadPage('Admin');
            }
        });
        
        // 设置页面
        router.register('/settings', () => {
            this.loadPage('Settings');
        });
        
        // 个人中心页面
        router.register('/profile', () => {
            this.loadPage('Profile');
        });
    }
    
    // 加载页面
    async loadPage(pageName) {
        try {
            // 如果是管理页面，再次检查权限
            if (pageName === 'Admin') {
                // 如果权限状态未知，先检查权限
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
            
            // 显示加载状态（仅在首次加载或切换页面时）
            if (content && (!content.dataset.loading || content.dataset.loading !== pageName)) {
                content.dataset.loading = pageName;
                // 不显示加载动画，直接加载页面（提升体验）
            }
            
            // 并行执行：更新用户信息和加载页面组件
            const [_, pageModule] = await Promise.all([
            // 每次加载页面时更新用户信息（包括权限），确保权限变化能及时反映
                this.updateUserInfo().catch(() => {
                    // 不影响页面加载
                }),
            // 动态加载页面组件
                import(`/pages/${pageName}.js`)
            ]);
            
            if (pageModule.default) {
                const page = new pageModule.default(this);
                const html = await page.render();
                
                // 使用 requestAnimationFrame 优化 DOM 更新
                requestAnimationFrame(() => {
                    if (content) {
                        content.innerHTML = html;
                if (page.mounted) {
                            // 延迟执行 mounted，确保 DOM 已更新
                            requestAnimationFrame(async () => {
                    await page.mounted();
                    // 初始化自定义下拉框（延迟执行，避免阻塞）
                    // 注意：Admin 页面有自己的初始化逻辑，这里只处理其他页面
                    if (window.initCustomSelects && !page.initCustomSelectsForActiveTab) {
                        setTimeout(() => {
                            window.initCustomSelects();
                        }, 150);
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

// 设置按钮事件
document.addEventListener('DOMContentLoaded', async () => {
    // 动态导入组件（如果需要）
    try {
        await import('/assets/js/components/index.js');
    } catch (error) {
        console.warn('组件加载失败，使用基础功能:', error);
    }
    
    // 初始化应用
    const app = new App();
    window.app = app;
    
    // 监听页面可见性变化，当页面重新可见时更新用户信息（包括权限）
    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden && app.userId) {
            // 页面重新可见时，更新用户信息以检测权限变化
            await app.updateUserInfo();
        }
    });
    
    // 监听窗口焦点变化，当窗口重新获得焦点时更新用户信息
    window.addEventListener('focus', async () => {
        if (app.userId) {
            await app.updateUserInfo();
        }
    });
    
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            // 导航到设置页面
            router.navigate('/settings');
        });
    }
    
    // 移动端菜单按钮
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenuBtn && mobileMenu) {
        const toggleMenu = (show) => {
            if (show) {
                mobileMenu.classList.remove('hidden');
                // 使用 requestAnimationFrame 确保 DOM 更新后再设置高度
                requestAnimationFrame(() => {
                    mobileMenu.style.maxHeight = mobileMenu.scrollHeight + 'px';
                });
            } else {
                mobileMenu.style.maxHeight = '0';
                // 等待动画完成后再隐藏
                setTimeout(() => {
                    mobileMenu.classList.add('hidden');
                }, 300);
            }
        };
        
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = mobileMenu.classList.contains('hidden');
            toggleMenu(isHidden);
        });
        
        // 点击移动端菜单项后关闭菜单
        const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                toggleMenu(false);
            });
        });
        
        // 点击外部区域关闭菜单
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
        // 检查本地存储的主题设置
        const savedTheme = localStorage.getItem('theme');
        
        // 如果没有保存的主题，自动跟随系统偏好
        if (!savedTheme) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.documentElement.classList.add('dark');
                if (favicon) {
                    favicon.href = '/assets/favicon-dark.ico';
                }
            } else {
                document.documentElement.classList.remove('dark');
                if (favicon) {
                    favicon.href = '/assets/favicon-light.ico';
                }
            }
        } else {
            // 如果有保存的主题，使用保存的主题
            if (savedTheme === 'dark') {
                document.documentElement.classList.add('dark');
                if (favicon) {
                    favicon.href = '/assets/favicon-dark.ico';
                }
            } else {
                document.documentElement.classList.remove('dark');
                if (favicon) {
                    favicon.href = '/assets/favicon-light.ico';
                }
            }
        }
    };
    
    // 切换主题
    const toggleTheme = () => {
        const isDark = document.documentElement.classList.contains('dark');
        
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            if (favicon) {
                favicon.href = '/assets/favicon-light.ico';
            }
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            if (favicon) {
                favicon.href = '/assets/favicon-dark.ico';
            }
        }
    };
    
    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // 只有在用户没有手动设置主题时才跟随系统
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                document.documentElement.classList.add('dark');
                if (favicon) {
                    favicon.href = '/assets/favicon-dark.ico';
                }
            } else {
                document.documentElement.classList.remove('dark');
                if (favicon) {
                    favicon.href = '/assets/favicon-light.ico';
                }
            }
        }
    });
    
    // 初始化主题
    initTheme();
    
    // 绑定主题切换按钮
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
    
    // 初始化应用（app 已在上面创建）
    app.init();
});
