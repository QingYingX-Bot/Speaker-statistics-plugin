/**
 * 主应用
 */

class App {
    constructor() {
        this.userId = null;
        this.secretKey = null;
        this.currentGroupId = null;
    }
    
    async init() {
        // 优先从API获取当前用户信息（从cookie，可能是通过token访问）
        let fromToken = false;
        try {
            const response = await api.getCurrentUser();
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
                } else {
                    // 如果API没有返回userId，尝试从本地存储获取
                    this.userId = Storage.get('userId');
                }
            } else {
                // 如果API没有返回，尝试从本地存储获取（不再从URL参数获取）
                this.userId = Storage.get('userId');
            }
        } catch (error) {
            console.warn('从API获取用户信息失败，尝试其他方式:', error);
            // API失败时，使用本地存储（不再从URL参数获取）
            this.userId = Storage.get('userId');
        }
        
        if (!this.userId) {
            // 如果没有userId，显示输入框
            this.showUserIdInput();
            return;
        }
        
        // 保存userId
        Storage.set('userId', this.userId);
        
        // 更新UI
        this.updateUserInfo();
        
        // 检查秘钥是否存在，如果不存在则弹出设置窗口
        // 如果是从token访问，显示确认弹窗
        await this.checkAndPromptSecretKey(fromToken);
        
        // 初始化路由
        this.initRoutes();
        
        // 启动路由
        router.init();
    }
    
    /**
     * 检查秘钥是否存在，如果不存在或不匹配则弹出设置窗口
     * @param {boolean} fromToken 是否从token访问（通过QQ命令链接）
     */
    async checkAndPromptSecretKey(fromToken = false) {
        // 防止重复调用
        if (this._checkingSecretKey) {
            console.log('正在检查秘钥，跳过重复调用');
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
                console.log('秘钥不存在，弹出设置窗口');
                await SecretKeyManager.prompt(this.userId);
                this._checkingSecretKey = false;
                return;
            }
            
            // 如果存在，验证本地秘钥是否与服务器匹配
            const userName = localStorage.getItem(`userName_${this.userId}`) || null;
            const validation = await SecretKeyManager.validateLocalKey(this.userId, userName);
            
            if (!validation.matched) {
                console.log('本地秘钥与服务器不匹配，要求用户修改');
                // 显示警告并要求修改秘钥
                await this.showKeyMismatchWarning(validation.message, userName);
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
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div class="flex items-start gap-3">
                            <svg class="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <div class="flex-1">
                                <p class="text-sm font-medium text-blue-800 mb-2">请确认您的身份</p>
                                <p class="text-xs text-blue-700 mb-3">请确认以下信息是否正确，然后输入您的秘钥进行验证</p>
                                <div class="mt-3 pt-3 border-t border-blue-200">
                                    <p class="text-xs text-blue-600 mb-1">用户ID:</p>
                                    <p class="text-xl font-bold text-blue-800">${this.userId}</p>
                                    ${userName ? `
                                    <p class="text-xs text-blue-600 mb-1 mt-3">用户名:</p>
                                    <p class="text-lg font-semibold text-blue-800">${userName}</p>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">请输入您的秘钥</label>
                        <input type="password" id="secretKeyConfirmInput" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" placeholder="请输入秘钥进行验证">
                        <div class="mt-2 text-xs text-gray-500">
                            秘钥用于验证您的身份，请妥善保管
                        </div>
                    </div>
                </div>
            `, `
                <button class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium" id="confirmSecretKeyBtn">确认验证</button>
                <button class="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium border border-orange-300" id="notMyAccountBtn">这不是我账号</button>
                <button class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium" onclick="Modal.hide()">稍后处理</button>
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
                            const validation = await api.validateSecretKey(this.userId, secretKey);
                            
                            if (!validation.valid) {
                                Toast.show(validation.message || '秘钥验证失败', 'error');
                                confirmBtn.disabled = false;
                                confirmBtn.textContent = '确认验证';
                                return;
                            }
                            
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
     * 显示秘钥不匹配警告并要求修改
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
            const displayMessage = message || `本地秘钥与服务器不匹配${userName ? `\n用户名: ${userName}` : ''}\n请重新设置秘钥`;
            
            window.Modal.show('秘钥不匹配', `
                <div class="space-y-4">
                    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div class="flex items-start gap-3">
                            <svg class="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                            <div class="flex-1">
                                <p class="text-sm font-medium text-red-800 mb-2">警告</p>
                                <p class="text-xs text-red-700 whitespace-pre-line mb-3">${displayMessage}</p>
                                <div class="mt-3 pt-3 border-t border-red-200">
                                    <p class="text-xs text-red-600 mb-1">当前用户ID:</p>
                                    <p class="text-xl font-bold text-red-800">${this.userId}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">验证码</label>
                        <div class="flex gap-2">
                            <input type="text" id="verificationCodeInput" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" placeholder="请输入6位验证码" maxlength="6">
                            <button id="sendCodeBtn" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium whitespace-nowrap">发送验证码</button>
                        </div>
                        <div class="mt-1 text-xs text-gray-500" id="codeHint">验证码将发送到您的QQ</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">新秘钥</label>
                        <input type="password" id="secretKeyInput" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" placeholder="请输入新秘钥">
                        <div class="mt-2 text-xs text-gray-500">
                            秘钥用于验证您的身份，请妥善保管
                        </div>
                    </div>
                </div>
            `, `
                <button class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium" id="confirmUpdateBtn">确认修改</button>
                <button class="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium border border-orange-300" id="notMyAccountBtn">这不是我账号</button>
                <button class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium" onclick="Modal.hide()">稍后处理</button>
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
                            codeHint.className = 'mt-1 text-xs text-gray-500';
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
                        codeHint.className = 'mt-1 text-xs text-green-600';
                        
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
                            if (!verifyResult.valid) {
                                Toast.show(verifyResult.message || '验证码错误', 'error');
                                return;
                            }
                            
                            // 验证码通过，保存新秘钥
                            confirmBtn.disabled = true;
                            confirmBtn.textContent = '保存中...';
                            
                            await SecretKeyManager.save(this.userId, key);
                            
                            // 清理定时器
                            if (countdownTimer) {
                                clearInterval(countdownTimer);
                            }
                            
                            Modal.hide();
                            Toast.show('秘钥已更新', 'success');
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
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">请输入用户ID</h2>
                </div>
                <div class="card-body">
                    <div class="input-group">
                        <label class="input-label">用户ID</label>
                        <input type="text" class="input" id="userIdInput" placeholder="请输入您的QQ号">
                    </div>
                    <button class="btn btn-primary" id="confirmUserIdBtn">确认</button>
                </div>
            </div>
        `;
        
        document.getElementById('confirmUserIdBtn').addEventListener('click', async () => {
            const userId = document.getElementById('userIdInput').value.trim();
            if (userId) {
                this.userId = userId;
                Storage.set('userId', userId);
                // 不再在URL中设置userId，使用cookie和本地存储
                await this.updateUserInfo();
                this.initRoutes();
                router.init();
            } else {
                Toast.show('请输入用户ID', 'error');
            }
        });
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
            const response = await api.getCurrentUser();
            if (response && response.success) {
                // 更新用户名
                if (response.data && response.data.userName) {
                    localStorage.setItem(`userName_${this.userId}`, response.data.userName);
                }
                
                // 检查并显示/隐藏管理链接
                const isAdmin = response.data && response.data.isAdmin === true;
                if (adminLink) {
                    adminLink.style.display = isAdmin ? 'block' : 'none';
                }
                if (mobileAdminLink) {
                    if (isAdmin) {
                        mobileAdminLink.classList.remove('hidden');
                    } else {
                        mobileAdminLink.classList.add('hidden');
                    }
                }
            }
        } catch (error) {
            console.debug('获取用户信息失败:', error);
            // 隐藏管理链接（如果获取失败，默认不显示）
            if (adminLink) adminLink.style.display = 'none';
            if (mobileAdminLink) mobileAdminLink.classList.add('hidden');
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
                console.debug('获取用户名失败，使用用户ID:', error);
            }
        }
        
        // 更新桌面端和移动端显示
        const displayText = userName || this.userId;
        if (userIdEl) userIdEl.textContent = displayText;
        if (mobileUserIdEl) mobileUserIdEl.textContent = displayText;
    }
    
    // 更新导航栏激活状态
    updateNavbarActive(route) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const linkRoute = link.getAttribute('data-route');
            if (linkRoute === route || (route && route.startsWith(linkRoute) && linkRoute !== '/')) {
                link.classList.add('bg-primary', 'text-white');
                link.classList.remove('text-gray-700', 'hover:text-primary', 'hover:bg-gray-50');
            } else {
                link.classList.remove('bg-primary', 'text-white');
                link.classList.add('text-gray-700', 'hover:text-primary', 'hover:bg-gray-50');
            }
        });
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
        
        // 管理页面
        router.register('/admin', () => {
            this.loadPage('Admin');
        });
        
        // 设置页面
        router.register('/settings', () => {
            this.loadPage('Settings');
        });
    }
    
    // 加载页面
    async loadPage(pageName) {
        try {
            // 动态加载页面组件
            const pageModule = await import(`/pages/${pageName}.js`);
            const content = document.getElementById('pageContent');
            
            if (pageModule.default) {
                const page = new pageModule.default(this);
                content.innerHTML = await page.render();
                if (page.mounted) {
                    page.mounted();
                }
            }
        } catch (error) {
            console.error(`加载页面 ${pageName} 失败:`, error);
            const content = document.getElementById('pageContent');
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <div class="empty-state-text">页面加载失败: ${error.message}</div>
                </div>
            `;
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
    
    // 初始化应用
    const app = new App();
    window.app = app;
    app.init();
});
