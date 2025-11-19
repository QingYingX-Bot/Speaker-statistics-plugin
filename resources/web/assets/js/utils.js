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
        
        // 先移除 show 类和 data-type，确保动画可以重新触发
        toast.classList.remove('show');
        toast.removeAttribute('data-type');
        
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
            
            // 设置类型属性（用于颜色区分）
            toast.setAttribute('data-type', type);
            
            // 添加 show 类显示 Toast
            toast.classList.add('show');
            
            // 移动端自动调整显示时长（稍长一些，方便阅读）
            const isMobile = window.innerWidth < 640;
            const adjustedDuration = isMobile ? Math.max(duration, 2500) : duration;
            
            // 设置自动隐藏
            this.timeoutId = setTimeout(() => {
                toast.classList.remove('show');
                this.timeoutId = null;
            }, adjustedDuration);
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
    if (num === null || num === undefined) return '0';
    const numValue = Number(num);
    if (isNaN(numValue)) return '0';
    if (numValue >= 10000) {
        return (numValue / 10000).toFixed(1) + '万';
    }
    return numValue.toLocaleString();
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

// HTML转义（防止XSS攻击）
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// 掩码群组ID（显示前4位和后4位，中间用****代替）
function maskGroupId(groupId) {
    if (!groupId) return '-';
    const idStr = String(groupId);
    if (idStr.length <= 8) return idStr;
    return idStr.substring(0, 4) + '****' + idStr.substring(idStr.length - 4);
}

// 获取用户头像URL
function getAvatarUrl(userId) {
    if (!userId) return '';
    // 使用QQ头像API
    return `https://q.qlogo.cn/g?b=qq&s=0&nk=${userId}`;
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
window.escapeHtml = escapeHtml;
window.maskGroupId = maskGroupId;
window.getAvatarUrl = getAvatarUrl;
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
                return true;
            }
            
            // 如果本地没有，检查服务器是否有保存的秘钥
            if (userId) {
                try {
                    const result = await api.getSecretKey(userId);
                    // 处理 API 返回格式：可能是 { secretKey: ... } 或 { success: true, data: { secretKey: ... } }
                    const serverKey = result?.secretKey || (result?.success && result?.data?.secretKey ? result.data.secretKey : null);
                    if (serverKey && serverKey.length > 0 && serverKey !== '***已加密***' && serverKey !== '***已加密存储***') {
                        // 如果服务器有原始秘钥，保存到本地
                        this._saveLocalSecretKey(serverKey);
                        return true;
                    } else if (serverKey === '***已加密***' || serverKey === '***已加密存储***') {
                        // 服务器有加密的秘钥，但无法显示原始值，视为存在
                        return true;
                    }
                } catch (error) {
                    // 静默处理错误
                }
            }
            
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
                    // 处理 API 返回格式：可能是 { secretKey: ... } 或 { success: true, data: { secretKey: ... } }
                    const serverKey = result?.secretKey || (result?.success && result?.data?.secretKey ? result.data.secretKey : null);
                    if (serverKey && serverKey.length > 0 && serverKey !== '***已加密***' && serverKey !== '***已加密存储***') {
                        // 服务器有原始秘钥，但本地没有，同步到本地
                        this._saveLocalSecretKey(serverKey);
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
                
                // 处理 API 返回格式：可能是 { secretKey: ... } 或 { success: true, data: { secretKey: ... } }
                const serverKey = result?.secretKey || (result?.success && result?.data?.secretKey ? result.data.secretKey : null);
                
                if (!serverKey || serverKey.length === 0) {
                    // 服务器没有秘钥，但本地有，视为不匹配
                    return { 
                        matched: false, 
                        message: '本地秘钥与服务器不匹配，请重新设置'
                    };
                }
                
                // 如果服务器返回的是加密占位符，说明服务器有秘钥但无法显示原始值
                // 这种情况下，如果本地有秘钥，我们应该验证本地秘钥是否有效
                if (serverKey === '***已加密***' || serverKey === '***已加密存储***') {
                    // 服务器有加密的秘钥，使用验证API验证本地秘钥
                    try {
                        const response = await api.validateSecretKey(userId, localSecretKey);
                        
                        // 检查响应格式：可能是 { success: true, data: { valid: true } } 或 { valid: true }
                        const isValid = (response && response.success && response.data?.valid === true) || 
                                       (response && response.valid === true);
                        
                        if (isValid) {
                            return { matched: true };
                        } else {
                            return { 
                                matched: false, 
                                message: `本地秘钥与服务器不匹配\n用户ID: ${userId}${userName ? `\n用户名: ${userName}` : ''}\n请重新设置秘钥`
                            };
                        }
                    } catch (validateError) {
                        // 如果是因为网络错误或服务器错误，视为匹配（避免误报）
                        // 但如果是明确的验证失败，应该返回不匹配
                        if (validateError.message && (
                            validateError.message.includes('验证失败') || 
                            validateError.message.includes('不匹配') ||
                            validateError.message.includes('401') ||
                            validateError.message.includes('403')
                        )) {
                            return { 
                                matched: false, 
                                message: `本地秘钥验证失败\n用户ID: ${userId}${userName ? `\n用户名: ${userName}` : ''}\n请重新设置秘钥`
                            };
                        }
                        // 其他错误（网络错误等），视为匹配（避免误报）
                        return { matched: true };
                    }
                }
                
                // 比较秘钥是否匹配（去除首尾空格）
                const localTrimmed = localSecretKey.trim();
                const serverTrimmed = serverKey.trim();
                
                if (localTrimmed !== serverTrimmed) {
                    // 不匹配
                    return { 
                        matched: false, 
                        serverKey: serverKey,
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
                return { matched: true };
            }
        } catch (error) {
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

// 自定义下拉框组件
class CustomSelect {
    constructor(selectElement, options = {}) {
        this.select = selectElement;
        this.options = {
            placeholder: options.placeholder || '请选择',
            searchable: options.searchable || false,
            ...options
        };
        this.isOpen = false;
        this.init();
    }
    
    init() {
        // 优化：批量设置样式，减少重排
        const hasWFull = this.select.classList.contains('w-full');
        
        // 快速获取宽度（优先使用 offsetWidth，避免 getBoundingClientRect）
        let originalWidth = this.select.offsetWidth;
        if (!originalWidth || originalWidth === 0) {
            const parentElement = this.select.parentElement;
            originalWidth = parentElement ? parentElement.offsetWidth : 220;
        }
        
        // 创建 wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'custom-select-wrapper relative';
        if (hasWFull) {
            this.wrapper.style.width = '100%';
        } else if (originalWidth > 0) {
            this.wrapper.style.width = `${originalWidth}px`;
        } else {
            this.wrapper.style.width = '220px';
        }
        
        // 创建 button
        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.className = 'custom-select-button w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-gray-800 dark:text-gray-200 text-sm appearance-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 text-left flex items-center justify-between';
        
        // 创建 buttonText
        this.buttonText = document.createElement('span');
        this.buttonText.className = 'flex-1 text-left truncate';
        const selectedOption = this.select.options[this.select.selectedIndex];
        this.buttonText.textContent = selectedOption ? selectedOption.textContent : (this.options.placeholder || '请选择');
        
        // 创建 buttonIcon（使用 SVG 字符串，避免多次 DOM 操作）
        this.buttonIcon = document.createElement('svg');
        this.buttonIcon.className = 'w-4 h-4 text-gray-400 flex-shrink-0 ml-2 transition-transform';
        this.buttonIcon.setAttribute('fill', 'none');
        this.buttonIcon.setAttribute('stroke', 'currentColor');
        this.buttonIcon.setAttribute('viewBox', '0 0 24 24');
        this.buttonIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>';
        
        // 组装 button
        this.button.appendChild(this.buttonText);
        this.button.appendChild(this.buttonIcon);
        
        // 创建 dropdown
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'custom-select-dropdown absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto hidden';
        
        // 创建 optionsList
        this.optionsList = document.createElement('div');
        this.optionsList.className = 'py-1';
        this.renderOptions();
        
        this.dropdown.appendChild(this.optionsList);
        
        // 组装 wrapper
        this.wrapper.appendChild(this.button);
        this.wrapper.appendChild(this.dropdown);
        
        // 一次性插入到 DOM（减少重排）
        this.select.parentNode.insertBefore(this.wrapper, this.select);
        this.wrapper.appendChild(this.select);
        
        // 隐藏原生 select（在 DOM 插入后，避免影响布局计算）
        this.select.style.cssText = 'opacity:0;position:absolute;pointer-events:none;width:0;height:0;visibility:hidden;';
        
        // 绑定事件
        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        
        // 点击外部关闭（使用事件委托，避免每个实例都绑定）
        if (!window._customSelectGlobalClickHandler) {
            window._customSelectGlobalClickHandler = (e) => {
                document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
                    const instance = wrapper.querySelector('select')?._customSelectInstance;
                    if (instance && !wrapper.contains(e.target)) {
                        instance.close();
                    }
                });
            };
            document.addEventListener('click', window._customSelectGlobalClickHandler);
        }
        
        // 监听原 select 变化
        this.select.addEventListener('change', () => {
            this.updateButtonText();
            this.highlightSelected();
        });
    }
    
    renderOptions() {
        // 使用 DocumentFragment 批量创建，减少重排
        const fragment = document.createDocumentFragment();
        const options = Array.from(this.select.options);
        const selectedValue = this.select.value;
        
        options.forEach((option) => {
            const item = document.createElement('div');
            const isSelected = option.selected || option.value === selectedValue;
            item.className = `custom-select-option px-3 py-2 text-sm cursor-pointer transition-colors text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${isSelected ? 'bg-primary/10 text-primary dark:text-primary' : ''}`;
            item.textContent = option.textContent;
            item.dataset.value = option.value;
            
            item.addEventListener('click', () => {
                this.select.value = option.value;
                this.select.dispatchEvent(new Event('change', { bubbles: true }));
                this.updateButtonText();
                this.highlightSelected();
                this.close();
            });
            
            fragment.appendChild(item);
        });
        
        this.optionsList.innerHTML = '';
        this.optionsList.appendChild(fragment);
    }
    
    updateButtonText() {
        const selectedOption = this.select.options[this.select.selectedIndex];
        this.buttonText.textContent = selectedOption ? selectedOption.textContent : this.options.placeholder;
    }
    
    highlightSelected() {
        const options = this.optionsList.querySelectorAll('.custom-select-option');
        const selectedValue = this.select.value;
        
        options.forEach(option => {
            if (option.dataset.value === selectedValue) {
                option.className = 'custom-select-option px-3 py-2 text-sm cursor-pointer transition-colors bg-primary/10 text-primary dark:text-primary';
            } else {
                option.className = 'custom-select-option px-3 py-2 text-sm cursor-pointer transition-colors text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700';
            }
        });
    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        this.isOpen = true;
        this.dropdown.classList.remove('hidden');
        this.buttonIcon.style.transform = 'rotate(180deg)';
        this.button.classList.add('ring-2', 'ring-primary', 'border-primary');
        this.highlightSelected();
    }
    
    close() {
        this.isOpen = false;
        this.dropdown.classList.add('hidden');
        this.buttonIcon.style.transform = 'rotate(0deg)';
        this.button.classList.remove('ring-2', 'ring-primary', 'border-primary');
    }
    
    updateOptions() {
        // 重新渲染选项列表
        this.renderOptions();
        this.updateButtonText();
        this.highlightSelected();
    }
    
    destroy() {
        if (this.wrapper && this.wrapper.parentNode) {
            this.select.style.display = '';
            this.wrapper.parentNode.replaceChild(this.select, this.wrapper);
        }
    }
}

// 初始化所有自定义下拉框（优化版本，分批初始化避免阻塞）
function initCustomSelects() {
    const selects = Array.from(document.querySelectorAll('select.select-custom:not([data-custom-select-initialized])'));
    if (selects.length === 0) return;
    
    // 分批初始化，避免一次性处理太多元素导致卡顿
    let index = 0;
    const initNext = () => {
        if (index >= selects.length) return;
        
        const select = selects[index];
        // 检查元素是否可见且已渲染
        if (select.offsetParent !== null || select.offsetWidth > 0) {
            try {
                select.dataset.customSelectInitialized = 'true';
                select._customSelectInstance = new CustomSelect(select);
            } catch (error) {
                console.warn('初始化下拉框失败:', error);
            }
        }
        
        index++;
        // 使用 requestIdleCallback 或 setTimeout 继续下一个
        if (window.requestIdleCallback) {
            requestIdleCallback(initNext, { timeout: 50 });
        } else {
            setTimeout(initNext, 10);
        }
    };
    
    // 开始初始化
    if (window.requestIdleCallback) {
        requestIdleCallback(initNext, { timeout: 100 });
    } else {
        setTimeout(initNext, 50);
    }
}

// 更新指定下拉框的选项（当动态添加选项后调用）
function updateCustomSelect(selectElement) {
    if (selectElement && selectElement._customSelectInstance) {
        selectElement._customSelectInstance.updateOptions();
    }
}

/**
 * 图表主题工具类
 * 统一管理图表的主题颜色和主题变化监听
 */
class ChartThemeUtils {
    /**
     * 获取当前主题颜色配置
     * @returns {Object} 主题颜色配置对象
     */
    static getThemeColors() {
        // 强制重新读取主题状态
        const htmlElement = document.documentElement;
        const isDark = htmlElement.classList.contains('dark');
        
        // 深色模式使用纯白色，浅色模式使用纯黑色
        return {
            isDark,
            textColor: isDark ? '#FFFFFF' : '#000000',
            gridColor: isDark ? '#4B5563' : '#E5E7EB',
            tooltipBg: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? '#4B5563' : '#D1D5DB',
            axisLineColor: isDark ? '#4B5563' : '#9CA3AF'
        };
    }
    
    /**
     * 创建主题变化监听器
     * @param {Function} callback 主题变化时的回调函数
     * @param {Object} options 配置选项
     * @param {number} options.debounceDelay 防抖延迟时间（毫秒），默认150
     * @returns {MutationObserver|null} MutationObserver实例，用于后续清理
     */
    static createThemeObserver(callback, options = {}) {
        if (typeof MutationObserver === 'undefined' || typeof callback !== 'function') {
            return null;
        }
        
        const { debounceDelay = 150 } = options;
        let themeChangeTimer = null;
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    // 防抖处理，避免频繁触发
                    if (themeChangeTimer) {
                        clearTimeout(themeChangeTimer);
                    }
                    
                    themeChangeTimer = setTimeout(() => {
                        callback();
                    }, debounceDelay);
                }
            });
        });
        
        // 开始监听 document.documentElement 的 class 属性变化
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        return observer;
    }
    
    /**
     * 获取ECharts主题配置
     * 返回适用于ECharts的完整主题配置对象
     * @returns {Object} ECharts主题配置
     */
    static getEChartsTheme() {
        const colors = this.getThemeColors();
        return {
            backgroundColor: 'transparent',
            textStyle: {
                color: colors.textColor
            },
            tooltip: {
                backgroundColor: colors.tooltipBg,
                borderColor: colors.borderColor,
                borderWidth: 1,
                textStyle: {
                    color: colors.textColor,
                    fontSize: 12
                }
            },
            grid: {
                borderColor: colors.gridColor
            },
            xAxis: {
                axisLine: {
                    lineStyle: {
                        color: colors.axisLineColor
                    }
                },
                axisLabel: {
                    color: colors.textColor,
                    fontSize: 11
                }
            },
            yAxis: {
                axisLine: {
                    lineStyle: {
                        color: colors.axisLineColor
                    }
                },
                axisLabel: {
                    color: colors.textColor,
                    fontSize: 11
                },
                splitLine: {
                    lineStyle: {
                        color: colors.gridColor,
                        type: 'dashed'
                    }
                }
            }
        };
    }
}

// 导出到全局
window.SecretKeyManager = SecretKeyManager;
window.CustomSelect = CustomSelect;
window.initCustomSelects = initCustomSelects;
window.updateCustomSelect = updateCustomSelect;
window.ChartThemeUtils = ChartThemeUtils;
