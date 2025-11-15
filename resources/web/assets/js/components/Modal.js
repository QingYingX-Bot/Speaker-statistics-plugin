/**
 * 模态框组件 - 简约风格
 */
export class Modal {
    constructor() {
        this.overlay = null;
        this.currentModal = null;
        this.onClose = null;
    }
    
    /**
     * 显示模态框
     * @param {Object|string} optionsOrTitle 配置选项或标题（向后兼容）
     * @param {string} [content] 内容HTML（向后兼容）
     * @param {string} [footer] 底部按钮HTML（向后兼容）
     */
    show(optionsOrTitle, content = null, footer = null) {
        // 向后兼容：支持旧API (title, content, footer) 和新API ({ title, content, footer })
        let title, options = {};
        if (typeof optionsOrTitle === 'string') {
            // 旧API：Modal.show(title, content, footer)
            title = optionsOrTitle;
            options.content = content || '';
            options.footer = footer || '';
            options.onClose = null;
            options.showCloseButton = true;
        } else {
            // 新API：Modal.show({ title, content, footer, ... })
            options = { ...optionsOrTitle };
            title = options.title || '';
            options.content = options.content || '';
            options.footer = options.footer || '';
            options.onClose = options.onClose || null;
            options.showCloseButton = options.showCloseButton !== false;
        }
        
        // 创建或获取模态框容器
        let overlay = document.getElementById('modalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalOverlay';
            overlay.className = 'fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50 p-4';
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.2s ease-in-out';
            document.body.appendChild(overlay);
        }
        
        this.overlay = overlay;
        
        // 设置模态框内容 - 简约风格（深色模式适配）
        const closeButton = options.showCloseButton ? 
            `<button class="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" id="modalClose" title="关闭">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>` : '';
        
        overlay.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden relative transform transition-all duration-200" style="transform: scale(0.95) translateY(10px);">
                ${title ? `
                <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 relative">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 pr-8">${title}</h3>
                    ${closeButton}
                </div>
                ` : closeButton ? `<div class="absolute top-4 right-4 z-10">${closeButton}</div>` : ''}
                <div class="px-6 py-5 text-gray-700 dark:text-gray-300 max-h-[60vh] overflow-y-auto" id="modalBody">
                    ${options.content}
                </div>
                ${options.footer ? `
                    <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-end gap-3" id="modalFooter">
                        ${options.footer}
                    </div>
                ` : ''}
            </div>
        `;
        
        // 显示模态框
        overlay.style.display = 'flex';
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            const modalContainer = overlay.querySelector('div > div');
            if (modalContainer) {
                modalContainer.style.transform = 'scale(1) translateY(0)';
            }
        });
        
        // 绑定关闭事件
        const closeBtn = overlay.querySelector('#modalClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
        
        // 点击背景关闭
        const overlayClickHandler = (e) => {
            if (e.target === overlay) {
                this.hide();
            }
        };
        overlay.addEventListener('click', overlayClickHandler);
        this.overlayClickHandler = overlayClickHandler;
        
        // ESC键关闭
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        };
        document.addEventListener('keydown', escapeHandler);
        this.escapeHandler = escapeHandler;
        
        // 保存关闭回调
        if (options.onClose) {
            this.onClose = options.onClose;
        }
    }
    
    /**
     * 隐藏模态框
     */
    hide() {
        if (this.overlay) {
            this.overlay.style.opacity = '0';
            const modalContainer = this.overlay.querySelector('div > div');
            if (modalContainer) {
                modalContainer.style.transform = 'scale(0.95) translateY(10px)';
            }
            
            setTimeout(() => {
                if (this.overlay) {
                    this.overlay.style.display = 'none';
                }
                if (this.onClose) {
                    this.onClose();
                    this.onClose = null;
                }
                
                // 清理事件监听
                if (this.overlayClickHandler) {
                    this.overlay.removeEventListener('click', this.overlayClickHandler);
                    this.overlayClickHandler = null;
                }
                if (this.escapeHandler) {
                    document.removeEventListener('keydown', this.escapeHandler);
                    this.escapeHandler = null;
                }
            }, 200);
        }
    }
    
    /**
     * 确认对话框
     * @param {Object} options 配置选项
     * @param {string} options.title 标题
     * @param {string} options.message 消息
     * @param {Function} options.onConfirm 确认回调
     * @param {Function} options.onCancel 取消回调（可选）
     */
    confirm({ title = '确认', message, onConfirm, onCancel = null }) {
        const footer = `
            <button class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium" id="modalCancel">取消</button>
            <button class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium" id="modalConfirm">确认</button>
        `;
        
        this.show({
            title,
            content: `<p class="text-gray-700 dark:text-gray-300 leading-relaxed">${message}</p>`,
            footer
        });
        
        // 绑定按钮事件
        setTimeout(() => {
            const confirmBtn = document.getElementById('modalConfirm');
            const cancelBtn = document.getElementById('modalCancel');
            
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    if (onConfirm) onConfirm();
                    this.hide();
                });
            }
            
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    if (onCancel) onCancel();
                    this.hide();
                });
            }
        }, 100);
    }
    
    /**
     * 输入对话框
     * @param {Object} options 配置选项
     * @param {string} options.title 标题
     * @param {string} options.message 消息
     * @param {string} options.placeholder 输入框占位符
     * @param {string} options.type 输入框类型（text, password等）
     * @param {string} options.value 默认值
     * @param {Function} options.onConfirm 确认回调，参数为输入值
     * @param {Function} options.onCancel 取消回调（可选）
     */
    prompt({ title = '输入', message, placeholder = '请输入', type = 'text', value = '', onConfirm, onCancel = null }) {
        const content = `
            ${message ? `<p class="text-sm text-gray-600 dark:text-gray-400 mb-3">${message}</p>` : ''}
            <div>
                <input type="${type}" class="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 text-sm placeholder-gray-400 dark:placeholder-gray-500" id="modalInput" placeholder="${placeholder}" value="${value}">
            </div>
        `;
        
        const footer = `
            <button class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium" id="modalCancel">取消</button>
            <button class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium" id="modalConfirm">确认</button>
        `;
        
        this.show({
            title,
            content,
            footer
        });
        
        // 聚焦输入框
        setTimeout(() => {
            const input = document.getElementById('modalInput');
            if (input) {
                input.focus();
                input.select();
                
                // 回车确认
                const enterHandler = (e) => {
                    if (e.key === 'Enter') {
                        document.getElementById('modalConfirm')?.click();
                    }
                };
                input.addEventListener('keypress', enterHandler);
                this.inputEnterHandler = enterHandler;
            }
        }, 100);
        
        // 绑定按钮事件
        setTimeout(() => {
            const confirmBtn = document.getElementById('modalConfirm');
            const cancelBtn = document.getElementById('modalCancel');
            
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    const input = document.getElementById('modalInput');
                    const inputValue = input ? input.value.trim() : '';
                    if (onConfirm) onConfirm(inputValue);
                    this.hide();
                });
            }
            
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    if (onCancel) onCancel();
                    this.hide();
                });
            }
        }, 100);
    }
}

// 创建全局实例
const modalInstance = new Modal();

// 静态方法
Modal.show = (title, content, footer) => modalInstance.show(title, content, footer);
Modal.hide = () => modalInstance.hide();
Modal.confirm = (options) => modalInstance.confirm(options);
Modal.prompt = (options) => modalInstance.prompt(options);

export default modalInstance;
