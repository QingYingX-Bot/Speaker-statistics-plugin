/**
 * 工具函数
 */

// Toast 提示
class Toast {
    static timeoutId = null;
    
    static show(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        const icon = document.getElementById('toastIcon');
        const messageEl = document.getElementById('toastMessage');
        
        if (!toast || !icon || !messageEl) {
            console.warn('Toast elements not found');
            return;
        }
        
        // 清除之前的 timeout
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        
        // 先移除 show 类，确保动画可以重新触发
        toast.classList.remove('show');
        
        // 等待一小段时间确保动画重置
        setTimeout(() => {
            const iconMap = {
                'info': 'ℹ️',
                'success': '✅',
                'error': '❌',
                'warning': '⚠️'
            };
            
            icon.textContent = iconMap[type] || 'ℹ️';
            messageEl.textContent = message;
            
            // 添加 show 类显示 Toast
            toast.classList.add('show');
            
            // 设置自动隐藏
            this.timeoutId = setTimeout(() => {
                toast.classList.remove('show');
                this.timeoutId = null;
            }, duration);
        }, 50);
    }
    
    static hide() {
        const toast = document.getElementById('toast');
        if (toast && this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
            toast.classList.remove('show');
        }
    }
}


// 格式化数字
function formatNumber(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    }
    return num.toLocaleString();
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 时间工具函数
const TimeUtils = {
    // 获取当前周键（格式：YYYY-WW，使用ISO周数）
    getCurrentWeekKey() {
        const now = new Date();
        const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        const year = d.getUTCFullYear();
        return `${year}-W${weekNo.toString().padStart(2, '0')}`;
    },
    
    // 获取当前月键（格式：YYYY-MM）
    getCurrentMonthKey() {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        return `${year}-${month}`;
    }
};

// 导出到全局
window.TimeUtils = TimeUtils;

// 格式化相对时间
function formatRelativeTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
}

// 获取URL参数
function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// 设置URL参数
function setUrlParam(name, value) {
    const url = new URL(window.location.href);
    url.searchParams.set(name, value);
    window.history.pushState({}, '', url);
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 本地存储管理
const Storage = {
    get(key) {
        try {
            const item = localStorage.getItem(key);
            if (item === null) return null;
            // 尝试解析JSON，如果失败则直接返回字符串（用于秘钥等字符串值）
            try {
                return JSON.parse(item);
            } catch (e) {
                return item;
            }
        } catch (e) {
            console.error('Storage.get 错误:', e);
            return null;
        }
    },
    
    set(key, value) {
        try {
            // 对于字符串类型的值（如秘钥），直接存储，不进行JSON序列化
            // 这样可以避免移动设备模拟模式下的序列化问题
            if (typeof value === 'string') {
                localStorage.setItem(key, value);
            } else {
                localStorage.setItem(key, JSON.stringify(value));
            }
            // 验证存储是否成功（某些情况下可能失败，如存储空间不足）
            const stored = localStorage.getItem(key);
            if (stored === null) {
                console.warn(`Storage.set 失败: 无法存储 ${key}`);
                return false;
            }
            return true;
        } catch (e) {
            console.error('Storage.set 错误:', e);
            // 如果是存储空间不足的错误，尝试清理一些数据
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                console.warn('存储空间不足，尝试清理缓存...');
                // 可以在这里添加清理逻辑
            }
            return false;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage.remove 错误:', e);
            return false;
        }
    },
    
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('Storage.clear 错误:', e);
            return false;
        }
    }
};

// 加载HTML模板
async function loadTemplate(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load template: ${path}`);
        }
        return await response.text();
    } catch (error) {
        console.error('加载模板失败:', error);
        return null;
    }
}

// 导出
window.Toast = Toast;
// Modal 已由组件系统导出，无需重复导出
window.formatNumber = formatNumber;
window.formatDate = formatDate;
window.formatRelativeTime = formatRelativeTime;
window.getUrlParam = getUrlParam;
window.setUrlParam = setUrlParam;
window.debounce = debounce;
window.throttle = throttle;
window.Storage = Storage;
window.loadTemplate = loadTemplate;

// 降低滚动速度 - 更平滑的滚动体验
(function() {
    let isScrolling = false;
    let scrollVelocity = 0;
    
    // 监听鼠标滚轮事件，降低滚动速度
    document.addEventListener('wheel', function(e) {
        // 如果滚动量太大，降低速度
        const scrollAmount = e.deltaY;
        if (Math.abs(scrollAmount) > 100) {
            e.preventDefault();
            const reducedAmount = scrollAmount * 0.6; // 降低到60%速度
            window.scrollBy({
                top: reducedAmount,
                behavior: 'smooth'
            });
        }
    }, { passive: false });
    
    // 平滑滚动设置
    if ('scrollBehavior' in document.documentElement.style) {
        document.documentElement.style.scrollBehavior = 'smooth';
    }
})();

/**
 * 秘钥管理工具类
 * 统一管理秘钥的检查、获取、保存等功能
 */
class SecretKeyManager {
    /**
     * 获取本地存储的秘钥（内部方法）
     * @returns {string|null} 秘钥或null
     */
    static _getLocalSecretKey() {
        if (typeof Storage === 'undefined') {
            return null;
        }
        const key = Storage.get('secretKey');
        return (key && typeof key === 'string' && key.trim().length > 0) ? key : null;
    }
    
    /**
     * 保存秘钥到本地存储（内部方法）
     * @param {string} secretKey 秘钥
     * @returns {boolean} 是否保存成功
     */
    static _saveLocalSecretKey(secretKey) {
        if (typeof Storage === 'undefined') {
            return false;
        }
        const success = Storage.set('secretKey', secretKey);
        if (!success) {
            // 如果Storage.set失败，尝试直接使用localStorage作为备用
            try {
                localStorage.setItem('secretKey', secretKey);
                return true;
            } catch (e) {
                console.error('保存秘钥到本地存储失败:', e);
                return false;
            }
        }
        return true;
    }
    
    /**
     * 检查秘钥是否存在（本地或服务器）
     * @param {string} userId 用户ID
     * @returns {Promise<boolean>} 秘钥是否存在
     */
    static async checkExists(userId) {
        try {
            // 先检查本地存储
            const localSecretKey = this._getLocalSecretKey();
            if (localSecretKey) {
                console.log('本地存储中找到秘钥');
                return true;
            }
            
            // 如果本地没有，检查服务器是否有保存的秘钥
            if (userId) {
                try {
                    const result = await api.getSecretKey(userId);
                    if (result && result.secretKey && result.secretKey.length > 0 && result.secretKey !== '***已加密***') {
                        // 如果服务器有原始秘钥，保存到本地
                        this._saveLocalSecretKey(result.secretKey);
                        console.log('服务器中找到秘钥，已同步到本地');
                        return true;
                    }
                } catch (error) {
                    // 404错误表示秘钥不存在，这是正常情况
                    if (error.message && (error.message.includes('404') || error.message.includes('秘钥文件不存在'))) {
                        console.log('服务器上秘钥不存在，这是正常情况');
                    } else {
                        console.log('检查服务器秘钥时发生错误:', error.message);
                    }
                }
            }
            
            console.log('秘钥不存在（本地和服务器都没有）');
            return false;
        } catch (error) {
            console.error('检查秘钥存在性失败:', error);
            return false;
        }
    }
    
    /**
     * 验证本地秘钥是否与服务器匹配
     * @param {string} userId 用户ID
     * @param {string} userName 用户名称（可选）
     * @returns {Promise<{matched: boolean, serverKey?: string, message?: string}>}
     */
    static async validateLocalKey(userId, userName = null) {
        try {
            // 检查本地是否有秘钥
            if (typeof Storage === 'undefined') {
                return { matched: false, message: '本地存储不可用' };
            }
            
            const localSecretKey = this._getLocalSecretKey();
            if (!localSecretKey) {
                // 本地没有秘钥，检查服务器是否有
                try {
                    const result = await api.getSecretKey(userId);
                    if (result && result.secretKey && result.secretKey.length > 0 && result.secretKey !== '***已加密***') {
                        // 服务器有原始秘钥，但本地没有，同步到本地
                        this._saveLocalSecretKey(result.secretKey);
                        return { matched: true };
                    }
                } catch (error) {
                    // 服务器也没有秘钥
                    return { matched: true }; // 都不存在，视为匹配
                }
                return { matched: true }; // 都不存在，视为匹配
            }
            
            // 本地有秘钥，检查服务器是否有
            try {
                const result = await api.getSecretKey(userId);
                if (!result || !result.secretKey || result.secretKey.length === 0) {
                    // 服务器没有秘钥，但本地有，视为不匹配
                    return { 
                        matched: false, 
                        message: '本地秘钥与服务器不匹配，请重新设置'
                    };
                }
                
                // 如果服务器返回的是加密占位符，说明服务器有秘钥但无法显示原始值
                // 这种情况下，如果本地有秘钥，我们应该验证本地秘钥是否有效
                if (result.secretKey === '***已加密***') {
                    // 服务器有加密的秘钥，使用验证API验证本地秘钥
                    try {
                        const response = await api.validateSecretKey(userId, localSecretKey);
                        if (response && response.success && response.data?.valid) {
                            return { matched: true };
                        } else {
                            return { 
                                matched: false, 
                                message: `本地秘钥与服务器不匹配\n用户ID: ${userId}${userName ? `\n用户名: ${userName}` : ''}\n请重新设置秘钥`
                            };
                        }
                    } catch (validateError) {
                        // 验证失败，返回匹配（避免误报）
                        console.warn('验证秘钥失败，视为匹配:', validateError);
                        return { matched: true };
                    }
                }
                
                // 比较秘钥是否匹配
                if (localSecretKey.trim() !== result.secretKey.trim()) {
                    // 不匹配
                    return { 
                        matched: false, 
                        serverKey: result.secretKey,
                        message: `本地秘钥与服务器不匹配\n用户ID: ${userId}${userName ? `\n用户名: ${userName}` : ''}\n请重新设置秘钥`
                    };
                }
                
                // 匹配
                return { matched: true };
            } catch (error) {
                // 如果服务器返回404，说明服务器没有秘钥
                if (error.message && (error.message.includes('404') || error.message.includes('秘钥文件不存在') || error.message.includes('用户秘钥不存在'))) {
                    // 服务器没有秘钥，但本地有，视为不匹配
                    return { 
                        matched: false, 
                        message: '服务器上没有您的秘钥，请重新设置'
                    };
                }
                // 其他错误，无法确定，返回匹配（避免误报）
                console.error('验证本地秘钥时发生错误:', error);
                return { matched: true };
            }
        } catch (error) {
            console.error('验证本地秘钥失败:', error);
            return { matched: true }; // 出错时视为匹配，避免误报
        }
    }
    
    /**
     * 获取秘钥（从本地存储获取，如果没有则提示用户输入）
     * @param {string} userId 用户ID（可选，用于保存到服务器）
     * @param {boolean} saveToServer 是否保存到服务器，默认true
     * @returns {Promise<string>} 秘钥
     */
    static async get(userId = null, saveToServer = true) {
        // 从本地存储获取
        const localSecretKey = this._getLocalSecretKey();
        if (localSecretKey) {
            return localSecretKey;
        }
        
        // 提示用户输入秘钥
        return new Promise((resolve, reject) => {
            // 使用 Modal.show 静态方法
            if (!window.Modal || typeof window.Modal.show !== 'function') {
                console.error('Modal 组件未加载');
                Toast.show('系统错误：Modal组件未加载', 'error');
                reject(new Error('Modal组件未加载'));
                return;
            }
            
            window.Modal.show('输入秘钥', `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">请输入您的秘钥</label>
                        <input type="password" id="secretKeyInput" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm" placeholder="请输入秘钥">
                        <div class="mt-2 text-xs text-gray-500">
                            秘钥用于验证您的身份，请妥善保管
                        </div>
                    </div>
                </div>
            `, `
                <div class="flex gap-3">
                    <button id="confirmSecretKeyBtn" class="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
                        确认
                    </button>
                    <button id="cancelSecretKeyBtn" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors">
                        取消
                    </button>
                </div>
            `);
            
            // 使用事件委托，确保在DOM更新后绑定
            setTimeout(() => {
                const confirmBtn = document.getElementById('confirmSecretKeyBtn');
                const cancelBtn = document.getElementById('cancelSecretKeyBtn');
                const input = document.getElementById('secretKeyInput');
                
                const handleConfirm = async () => {
                    const key = input?.value.trim();
                    if (!key) {
                        Toast.show('请输入秘钥', 'error');
                        return;
                    }
                    
                    // 禁用按钮，显示加载状态
                    if (confirmBtn) {
                        confirmBtn.disabled = true;
                        confirmBtn.textContent = '保存中...';
                    }
                    
                    try {
                        // 保存到本地存储
                        const saved = SecretKeyManager._saveLocalSecretKey(key);
                        if (!saved) {
                            Toast.show('保存秘钥到本地存储失败，请检查浏览器设置', 'error');
                        }
                        
                        // 如果提供了userId且需要保存到服务器，则保存到服务器
                        if (userId && saveToServer) {
                            await api.saveSecretKey(userId, key);
                        }
                        
                        window.Modal.hide();
                        Toast.show('秘钥已保存', 'success');
                        resolve(key);
                    } catch (error) {
                        console.error('保存秘钥失败:', error);
                        Toast.show('保存失败: ' + (error.message || '未知错误'), 'error');
                        if (confirmBtn) {
                            confirmBtn.disabled = false;
                            confirmBtn.textContent = '确认';
                        }
                        // 即使保存到服务器失败，也返回本地保存的秘钥
                        const savedKey = SecretKeyManager._getLocalSecretKey();
                        if (savedKey) {
                            window.Modal.hide();
                            resolve(savedKey);
                        }
                    }
                };
                
                const handleCancel = () => {
                    window.Modal.hide();
                    reject(new Error('用户取消'));
                };
                
                if (confirmBtn) confirmBtn.addEventListener('click', handleConfirm);
                if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
                if (input) {
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            handleConfirm();
                        }
                    });
                    // 自动聚焦
                    input.focus();
                }
            }, 100);
        });
    }
    
    /**
     * 保存秘钥到服务器和本地存储
     * @param {string} userId 用户ID
     * @param {string} secretKey 秘钥
     * @returns {Promise<void>}
     */
    static async save(userId, secretKey) {
        // 保存到服务器
        await api.saveSecretKey(userId, secretKey);
        
        // 保存到本地存储
        const saved = this._saveLocalSecretKey(secretKey);
        if (!saved) {
            throw new Error('无法保存秘钥到本地存储');
        }
        
        // 验证存储是否成功
        const stored = this._getLocalSecretKey();
        if (stored !== secretKey) {
            console.warn('秘钥存储验证失败，存储的值与预期不符');
        }
    }
    
    /**
     * 显示秘钥设置窗口（用于首次设置）
     * @param {string} userId 用户ID
     * @returns {Promise<void>}
     */
    static async prompt(userId) {
        // 等待 Modal 组件加载
        if (!window.Modal || typeof window.Modal.show !== 'function') {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (!window.Modal || typeof window.Modal.show !== 'function') {
                console.warn('Modal 组件未加载，无法显示秘钥设置窗口');
                return;
            }
        }
        
        return new Promise((resolve) => {
            window.Modal.show('设置秘钥', `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">请输入您的秘钥</label>
                        <input type="password" id="secretKeyInput" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm" placeholder="请输入秘钥">
                        <div class="mt-2 text-xs text-gray-500">
                            秘钥用于验证您的身份，请妥善保管
                        </div>
                    </div>
                </div>
            `, `
                <div class="flex gap-3">
                    <button id="confirmSecretKeyBtn" class="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
                        确认
                    </button>
                    <button id="cancelSecretKeyBtn" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors">
                        稍后设置
                    </button>
                </div>
            `);
            
            setTimeout(() => {
                const confirmBtn = document.getElementById('confirmSecretKeyBtn');
                const cancelBtn = document.getElementById('cancelSecretKeyBtn');
                const input = document.getElementById('secretKeyInput');
                
                const handleConfirm = async () => {
                    const key = input?.value.trim();
                    if (!key) {
                        Toast.show('请输入秘钥', 'error');
                        return;
                    }
                    
                    if (confirmBtn) {
                        confirmBtn.disabled = true;
                        confirmBtn.textContent = '保存中...';
                    }
                    
                    try {
                        await SecretKeyManager.save(userId, key);
                        window.Modal.hide();
                        Toast.show('秘钥已保存', 'success');
                        resolve();
                    } catch (error) {
                        console.error('保存秘钥失败:', error);
                        Toast.show('保存失败: ' + (error.message || '未知错误'), 'error');
                        if (confirmBtn) {
                            confirmBtn.disabled = false;
                            confirmBtn.textContent = '确认';
                        }
                    }
                };
                
                const handleCancel = () => {
                    window.Modal.hide();
                    resolve();
                };
                
                if (confirmBtn) confirmBtn.addEventListener('click', handleConfirm);
                if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
                if (input) {
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            handleConfirm();
                        }
                    });
                    input.focus();
                }
            }, 100);
        });
    }
}

// 导出到全局
window.SecretKeyManager = SecretKeyManager;
