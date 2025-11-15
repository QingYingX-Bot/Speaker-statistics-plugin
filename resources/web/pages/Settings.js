/**
 * 设置页面
 */
export default class Settings {
    constructor(app) {
        this.app = app;
    }
    
    async render() {
        return `
            <div class="bg-white dark:bg-gray-900 min-h-full">
                <div class="max-w-[1200px] mx-auto px-3 sm:px-4 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8">
                    <!-- 页面标题 -->
                    <div class="mb-4 sm:mb-6">
                        <h1 class="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">设置</h1>
                        <p class="text-xs text-gray-500 dark:text-gray-400">管理您的账户和偏好设置</p>
                    </div>
                    
                    <div class="space-y-4 sm:space-y-6">
                        <!-- 用户信息设置 -->
                        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                            <div class="flex items-center justify-between mb-3 sm:mb-4">
                                <div>
                                    <h2 class="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">用户信息</h2>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">管理您的用户ID和登录状态</p>
                                </div>
                            </div>
                            
                            <div class="space-y-3 sm:space-y-4">
                                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 py-2 sm:py-3 border-b border-gray-100 dark:border-gray-800">
                                    <div class="flex-1">
                                        <div class="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">用户ID</div>
                                        <div class="text-xs text-gray-500 dark:text-gray-400 truncate" id="settingsUserId">${this.app.userId || '未登录'}</div>
                                    </div>
                                    <button id="changeUserIdBtn" class="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-primary hover:text-primary-hover transition-colors self-start sm:self-auto">
                                        更换
                                    </button>
                                </div>
                                
                                <div class="flex items-center justify-between py-2 sm:py-3">
                                    <div class="flex-1">
                                        <div class="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">用户名</div>
                                        <div class="text-xs text-gray-500 dark:text-gray-400 truncate" id="settingsUserName">${localStorage.getItem(`userName_${this.app.userId}`) || '未设置'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 安全设置 -->
                        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 lg:p-6">
                            <div class="flex items-center justify-between mb-4">
                                <div>
                                    <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">安全设置</h2>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">管理您的秘钥和安全信息</p>
                                </div>
                            </div>
                            
                            <div class="space-y-4">
                                <div class="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                                    <div class="flex-1">
                                        <div class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">秘钥</div>
                                        <div class="text-xs text-gray-500 dark:text-gray-400">
                                            ${Storage.get('secretKey') ? '已设置' : '未设置'}
                                            ${Storage.get('secretKey') ? `<span class="ml-2 text-gray-400 dark:text-gray-500 font-mono">${this.maskSecretKey(Storage.get('secretKey'))}</span>` : ''}
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button id="changeSecretKeyBtn" class="px-4 py-2 text-sm font-medium text-primary hover:text-primary-hover transition-colors">
                                            ${Storage.get('secretKey') ? '修改' : '设置'}
                                        </button>
                                        ${Storage.get('secretKey') ? `
                                        <button id="clearSecretKeyBtn" class="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors">
                                            清除
                                        </button>
                                        ` : ''}
                                    </div>
                                </div>
                                
                                <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                                    <div class="flex items-start gap-2">
                                        <svg class="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                        </svg>
                                        <div class="text-xs text-yellow-800 dark:text-yellow-300">
                                            <div class="font-medium mb-1">安全提示</div>
                                            <div>秘钥用于验证您的身份，请妥善保管，不要泄露给他人。</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 数据管理 -->
                        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 lg:p-6">
                            <div class="flex items-center justify-between mb-4">
                                <div>
                                    <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">数据管理</h2>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">管理本地存储的数据</p>
                                </div>
                            </div>
                            
                            <div class="space-y-4">
                                <div class="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                                    <div class="flex-1">
                                        <div class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">清除缓存</div>
                                        <div class="text-xs text-gray-500 dark:text-gray-400">清除本地存储的缓存数据，不会影响您的账户信息</div>
                                    </div>
                                    <button id="clearCacheBtn" class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                                        清除
                                    </button>
                                </div>
                                
                                <div class="flex items-center justify-between py-3">
                                    <div class="flex-1">
                                        <div class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">重置所有设置</div>
                                        <div class="text-xs text-gray-500 dark:text-gray-400">清除所有本地存储的数据，包括用户ID和秘钥</div>
                                    </div>
                                    <button id="resetAllBtn" class="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors">
                                        重置
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 关于 -->
                        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 lg:p-6">
                            <div class="flex items-center justify-between mb-4">
                                <div>
                                    <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">关于</h2>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">系统信息和版本</p>
                                </div>
                            </div>
                            
                            <div class="space-y-3">
                                <div class="flex items-center justify-between py-2">
                                    <div class="text-sm text-gray-600 dark:text-gray-400">系统名称</div>
                                    <div class="text-sm font-medium text-gray-900 dark:text-gray-100">发言统计系统</div>
                                </div>
                                <div class="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-800">
                                    <div class="text-sm text-gray-600 dark:text-gray-400">版本</div>
                                    <div class="text-sm font-medium text-gray-900 dark:text-gray-100">1.0.0</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async mounted() {
        this.setupEventListeners();
        await this.updateUserInfo();
        await this.updateSecretKeyDisplay();
    }
    
    maskSecretKey(key) {
        if (!key || key.length <= 8) return '****';
        return key.substring(0, 4) + '****' + key.substring(key.length - 4);
    }
    
    async updateUserInfo() {
        const userIdEl = document.getElementById('settingsUserId');
        const userNameEl = document.getElementById('settingsUserName');
        
        if (userIdEl) {
            userIdEl.textContent = this.app.userId || '未登录';
        }
        
        if (userNameEl) {
            const userName = localStorage.getItem(`userName_${this.app.userId}`);
            userNameEl.textContent = userName || '未设置';
        }
    }
    
    /**
     * 更新秘钥显示（从服务器获取并同步到本地）
     */
    async updateSecretKeyDisplay() {
        try {
            // 先尝试从服务器获取秘钥
            let secretKey = null;
            if (this.app && this.app.userId) {
                try {
                    const result = await api.getSecretKey(this.app.userId);
                    // API返回格式: { secretKey: '...', message: '...', hasExistingKey: true }
                    if (result && result.secretKey) {
                        if (result.secretKey === '***已加密***') {
                            // 服务器有加密的秘钥，但无法显示原始值
                            // 使用本地存储的秘钥（如果有），否则标记为已设置但显示加密状态
                            secretKey = Storage.get('secretKey') || '***已加密***';
                        } else if (result.secretKey.length > 0) {
                            // 服务器返回了原始秘钥
                            secretKey = result.secretKey;
                            // 同步到本地存储
                            Storage.set('secretKey', secretKey);
                        } else {
                            // 空值，使用本地存储
                            secretKey = Storage.get('secretKey');
                        }
                    } else {
                        // 没有返回秘钥，使用本地存储
                        secretKey = Storage.get('secretKey');
                    }
                } catch (error) {
                    // 404错误表示服务器没有秘钥，使用本地存储
                    if (error.message && (error.message.includes('404') || error.message.includes('秘钥文件不存在') || error.message.includes('用户秘钥不存在'))) {
                        secretKey = Storage.get('secretKey');
                    } else {
                        // 其他错误，也尝试使用本地存储
                        console.warn('获取服务器秘钥失败，使用本地存储:', error);
                        secretKey = Storage.get('secretKey');
                    }
                }
            } else {
                // 没有userId，使用本地存储
                secretKey = Storage.get('secretKey');
            }
            
            // 更新显示
            const secretKeyStatusEl = document.querySelector('#changeSecretKeyBtn')?.parentElement?.previousElementSibling?.querySelector('.text-xs');
            const changeBtn = document.getElementById('changeSecretKeyBtn');
            const clearBtn = document.getElementById('clearSecretKeyBtn');
            const clearBtnContainer = clearBtn?.parentElement;
            
            if (secretKeyStatusEl) {
                if (secretKey && secretKey !== '***已加密***') {
                    // 有秘钥且不是加密占位符，显示已设置和遮罩后的秘钥
                    secretKeyStatusEl.innerHTML = `
                        已设置
                        <span class="ml-2 text-gray-400 font-mono">${this.maskSecretKey(secretKey)}</span>
                    `;
                } else if (secretKey === '***已加密***') {
                    // 服务器有加密的秘钥，但无法显示原始值
                    secretKeyStatusEl.innerHTML = `
                        已设置
                        <span class="ml-2 text-gray-400 font-mono">已加密</span>
                    `;
                } else {
                    // 没有秘钥
                    secretKeyStatusEl.textContent = '未设置';
                }
            }
            
            if (changeBtn) {
                changeBtn.textContent = (secretKey && secretKey !== '***已加密***') || secretKey === '***已加密***' ? '修改' : '设置';
            }
            
            // 显示/隐藏清除按钮
            if (clearBtnContainer) {
                if ((secretKey && secretKey !== '***已加密***') || secretKey === '***已加密***') {
                    // 如果清除按钮不存在，添加它
                    if (!clearBtn) {
                        const newClearBtn = document.createElement('button');
                        newClearBtn.id = 'clearSecretKeyBtn';
                        newClearBtn.className = 'px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors';
                        newClearBtn.textContent = '清除';
                        newClearBtn.addEventListener('click', () => {
                            this.clearSecretKey();
                        });
                        clearBtnContainer.appendChild(newClearBtn);
                    }
                } else {
                    // 如果没有秘钥，移除清除按钮
                    if (clearBtn) {
                        clearBtn.remove();
                    }
                }
            }
        } catch (error) {
            console.error('更新秘钥显示失败:', error);
            // 出错时使用本地存储
            const secretKey = Storage.get('secretKey');
            const secretKeyStatusEl = document.querySelector('#changeSecretKeyBtn')?.parentElement?.previousElementSibling?.querySelector('.text-xs');
            if (secretKeyStatusEl) {
                if (secretKey && secretKey !== '***已加密***') {
                    secretKeyStatusEl.innerHTML = `
                        已设置
                        <span class="ml-2 text-gray-400 font-mono">${this.maskSecretKey(secretKey)}</span>
                    `;
                } else if (secretKey === '***已加密***') {
                    secretKeyStatusEl.innerHTML = `
                        已设置
                        <span class="ml-2 text-gray-400 font-mono">已加密</span>
                    `;
                } else {
                    secretKeyStatusEl.textContent = '未设置';
                }
            }
        }
    }
    
    setupEventListeners() {
        // 更换用户ID
        const changeUserIdBtn = document.getElementById('changeUserIdBtn');
        if (changeUserIdBtn) {
            changeUserIdBtn.addEventListener('click', () => {
                this.showUserIdInput();
            });
        }
        
        // 修改/设置秘钥
        const changeSecretKeyBtn = document.getElementById('changeSecretKeyBtn');
        if (changeSecretKeyBtn) {
            changeSecretKeyBtn.addEventListener('click', () => {
                this.showSecretKeyInput();
            });
        }
        
        // 清除秘钥
        const clearSecretKeyBtn = document.getElementById('clearSecretKeyBtn');
        if (clearSecretKeyBtn) {
            clearSecretKeyBtn.addEventListener('click', () => {
                this.clearSecretKey();
            });
        }
        
        // 清除缓存
        const clearCacheBtn = document.getElementById('clearCacheBtn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => {
                this.clearCache();
            });
        }
        
        // 重置所有设置
        const resetAllBtn = document.getElementById('resetAllBtn');
        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', () => {
                this.resetAll();
            });
        }
    }
    
    async showUserIdInput() {
        const currentUserId = this.app.userId || '';
        
        Modal.show('更换用户ID', `
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">请输入新的用户ID</label>
                <input type="text" id="newUserIdInput" class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-gray-900 dark:text-gray-100" placeholder="请输入用户ID" value="${currentUserId}">
                <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    当前用户ID: ${currentUserId || '未设置'}
                </div>
            </div>
        `, `
            <button class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium" id="confirmUserIdBtn">确认</button>
            <button class="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium" onclick="Modal.hide()">取消</button>
        `);
        
        setTimeout(() => {
            const confirmBtn = document.getElementById('confirmUserIdBtn');
            const input = document.getElementById('newUserIdInput');
            if (confirmBtn && input) {
                confirmBtn.addEventListener('click', async () => {
                    const newUserId = input.value.trim();
                    if (newUserId) {
                        Storage.set('userId', newUserId);
                        this.app.userId = newUserId;
                        Modal.hide();
                        Toast.show('用户ID已更新', 'success');
                        this.updateUserInfo();
                        // 重新加载用户信息
                        if (this.app.updateUserInfo) {
                            await this.app.updateUserInfo();
                        }
                        // 重新加载页面
                        window.location.reload();
                    } else {
                        Toast.show('请输入用户ID', 'error');
                    }
                });
                input.focus();
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        confirmBtn.click();
                    }
                });
            }
        }, 100);
    }
    
    showSecretKeyInput() {
        const currentKey = Storage.get('secretKey') || '';
        const isModifying = currentKey.length > 0;
        
        Modal.show(isModifying ? '修改秘钥' : '设置秘钥', `
            <div class="mb-4 space-y-4">
                ${isModifying ? `
                    <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <div class="flex items-start gap-2">
                            <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                            <div class="flex-1">
                                <p class="text-sm font-medium text-yellow-800 dark:text-yellow-300">修改秘钥需要验证码验证</p>
                                <p class="text-xs text-yellow-600 dark:text-yellow-400 mt-1">验证码将发送到您的QQ，有效期1分钟</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">验证码</label>
                        <div class="flex gap-2">
                            <input type="text" id="verificationCodeInput" class="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-gray-900 dark:text-gray-100" placeholder="请输入6位验证码" maxlength="6">
                            <button id="sendCodeBtn" class="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium whitespace-nowrap">发送验证码</button>
                        </div>
                        <div class="mt-1 text-xs text-gray-500 dark:text-gray-400" id="codeHint">验证码将发送到您的QQ</div>
                    </div>
                ` : ''}
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">${isModifying ? '新' : ''}秘钥</label>
                    <input type="password" id="secretKeyInput" class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-gray-900 dark:text-gray-100" placeholder="请输入秘钥" value="${currentKey}">
                    <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        秘钥用于验证您的身份，请妥善保管
                    </div>
                </div>
            </div>
        `, `
            <button class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium" id="confirmSecretKeyBtn">确认</button>
            <button class="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium" onclick="Modal.hide()">取消</button>
        `);
        
        setTimeout(() => {
            const confirmBtn = document.getElementById('confirmSecretKeyBtn');
            const input = document.getElementById('secretKeyInput');
            const sendCodeBtn = document.getElementById('sendCodeBtn');
            const codeInput = document.getElementById('verificationCodeInput');
            const codeHint = document.getElementById('codeHint');
            
            let verificationCode = null;
            let countdownTimer = null;
            let countdown = 0;
            
            // 发送验证码功能
            if (isModifying && sendCodeBtn) {
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
                        }
                    }, 1000);
                };
                
                sendCodeBtn.addEventListener('click', async () => {
                    try {
                        sendCodeBtn.disabled = true;
                        sendCodeBtn.textContent = '发送中...';
                        
                        await api.sendVerificationCode(this.app.userId);
                        
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
            }
            
            if (confirmBtn && input) {
                const handleSave = async () => {
                    // 如果是修改秘钥，需要验证码
                    if (isModifying) {
                        if (!codeInput || !codeInput.value.trim()) {
                            Toast.show('请输入验证码', 'error');
                            return;
                        }
                        
                        try {
                            const verifyResult = await api.verifyCode(this.app.userId, codeInput.value.trim());
                            if (!verifyResult.valid) {
                                Toast.show(verifyResult.message || '验证码错误', 'error');
                                return;
                            }
                            verificationCode = codeInput.value.trim();
                        } catch (error) {
                            console.error('验证码验证失败:', error);
                            Toast.show('验证码验证失败: ' + (error.message || '未知错误'), 'error');
                            return;
                        }
                    }
                    
                    const key = input.value.trim();
                    if (!key) {
                        Toast.show('请输入秘钥', 'error');
                        return;
                    }
                    
                    // 禁用按钮，显示加载状态
                    confirmBtn.disabled = true;
                    confirmBtn.textContent = '保存中...';
                    
                    try {
                        // 使用统一的秘钥保存方法
                        await SecretKeyManager.save(this.app.userId, key);
                        
                        Modal.hide();
                        Toast.show('秘钥已保存', 'success');
                        
                        // 清理定时器
                        if (countdownTimer) {
                            clearInterval(countdownTimer);
                        }
                        
                        // 更新秘钥显示
                        await this.updateSecretKeyDisplay();
                    } catch (error) {
                        console.error('保存秘钥失败:', error);
                        Toast.show('保存失败: ' + (error.message || '未知错误'), 'error');
                        confirmBtn.disabled = false;
                        confirmBtn.textContent = '确认';
                    }
                };
                
                confirmBtn.addEventListener('click', handleSave);
                input.focus();
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        handleSave();
                    }
                });
                
                if (codeInput) {
                    codeInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            handleSave();
                        }
                    });
                }
            }
        }, 100);
    }
    
    async clearSecretKey() {
        // 显示验证码输入窗口
        Modal.show('清除秘钥', `
            <div class="mb-4 space-y-4">
                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div class="flex items-start gap-2">
                        <svg class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                        <div class="flex-1">
                            <p class="text-sm font-medium text-red-800 dark:text-red-300">警告：清除秘钥操作不可逆</p>
                            <p class="text-xs text-red-600 dark:text-red-400 mt-1">清除后需要重新设置才能使用需要验证的功能</p>
                        </div>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">验证码</label>
                    <div class="flex gap-2">
                        <input type="text" id="verificationCodeInput" class="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-gray-900 dark:text-gray-100" placeholder="请输入6位验证码" maxlength="6">
                        <button id="sendCodeBtn" class="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium whitespace-nowrap">发送验证码</button>
                    </div>
                    <div class="mt-1 text-xs text-gray-500 dark:text-gray-400" id="codeHint">验证码将发送到您的QQ</div>
                </div>
            </div>
        `, `
            <button class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium" id="confirmClearBtn">确认清除</button>
            <button class="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium" onclick="Modal.hide()">取消</button>
        `);
        
        setTimeout(() => {
            const confirmBtn = document.getElementById('confirmClearBtn');
            const sendCodeBtn = document.getElementById('sendCodeBtn');
            const codeInput = document.getElementById('verificationCodeInput');
            const codeHint = document.getElementById('codeHint');
            
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
                    
                    await api.sendVerificationCode(this.app.userId);
                    
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
            
            // 确认清除
            if (confirmBtn && codeInput) {
                confirmBtn.addEventListener('click', async () => {
                    const code = codeInput.value.trim();
                    if (!code) {
                        Toast.show('请输入验证码', 'error');
                        return;
                    }
                    
                    try {
                        // 验证验证码
                        const verifyResult = await api.verifyCode(this.app.userId, code);
                        if (!verifyResult.valid) {
                            Toast.show(verifyResult.message || '验证码错误', 'error');
                            return;
                        }
                        
                        // 验证码通过，清除秘钥
                        // 先清除本地存储
                        Storage.remove('secretKey');
                        
                        // 尝试清除服务器上的秘钥（如果有API的话，这里先清除本地）
                        // 注意：目前后端没有删除秘钥的API，只清除本地
                        // 如果需要清除服务器上的秘钥，可以添加 deleteSecretKey API
                        
                        // 清理定时器
                        if (countdownTimer) {
                            clearInterval(countdownTimer);
                        }
                        
                        Modal.hide();
                        Toast.show('秘钥已清除', 'success');
                        
                        // 更新秘钥显示
                        await this.updateSecretKeyDisplay();
                    } catch (error) {
                        console.error('验证码验证失败:', error);
                        Toast.show('验证码验证失败: ' + (error.message || '未知错误'), 'error');
                    }
                });
                
                codeInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        confirmBtn.click();
                    }
                });
                codeInput.focus();
            }
        }, 100);
    }
    
    clearCache() {
        if (!confirm('确定要清除缓存吗？这将清除本地存储的缓存数据，但不会影响您的账户信息。')) {
            return;
        }
        
        // 清除缓存数据（保留用户ID和秘钥）
        const userId = Storage.get('userId');
        const secretKey = Storage.get('secretKey');
        
        // 清除所有localStorage
        localStorage.clear();
        
        // 恢复用户ID和秘钥
        if (userId) {
            Storage.set('userId', userId);
        }
        if (secretKey) {
            Storage.set('secretKey', secretKey);
        }
        
        Toast.show('缓存已清除', 'success');
    }
    
    resetAll() {
        if (!confirm('确定要重置所有设置吗？这将清除所有本地存储的数据，包括用户ID和秘钥。此操作不可撤销！')) {
            return;
        }
        
        if (!confirm('再次确认：这将清除所有数据，您需要重新登录和设置。')) {
            return;
        }
        
        localStorage.clear();
        Toast.show('所有设置已重置', 'success');
        // 重新加载页面
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
}

