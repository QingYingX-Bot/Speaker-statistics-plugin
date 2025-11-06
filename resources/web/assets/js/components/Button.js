/**
 * 按钮组件
 */
export class Button {
    /**
     * 渲染按钮
     * @param {Object} options 配置选项
     * @param {string} options.text 按钮文本
     * @param {string} options.variant 按钮类型（primary, secondary, danger等）
     * @param {string} options.icon 图标（可选）
     * @param {Function} options.onClick 点击事件（可选）
     * @param {boolean} options.disabled 是否禁用
     * @param {string} options.className 额外CSS类名
     * @param {string} options.id ID
     * @param {string} options.type 按钮类型（button, submit, reset）
     * @returns {string} HTML字符串
     */
    static render({ 
        text, 
        variant = 'primary', 
        icon = '', 
        onClick = null, 
        disabled = false,
        className = '',
        id = '',
        type = 'button'
    }) {
        const idAttr = id ? `id="${id}"` : '';
        const disabledAttr = disabled ? 'disabled' : '';
        const iconHtml = icon ? `<span class="mr-2">${icon}</span>` : '';
        
        // Tailwind CSS 按钮样式
        const variantClasses = {
            primary: 'bg-primary hover:bg-primary-hover text-white shadow-md hover:shadow-lg',
            secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300',
            danger: 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg',
            success: 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg',
            warning: 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-md hover:shadow-lg',
            info: 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
        };
        
        const baseClasses = 'px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
        const variantClass = variantClasses[variant] || variantClasses.primary;
        const classAttr = `${baseClasses} ${variantClass} ${className}`.trim();
        
        return `
            <button type="${type}" class="${classAttr}" ${idAttr} ${disabledAttr}>
                ${iconHtml}
                <span>${text}</span>
            </button>
        `;
    }
    
    /**
     * 创建按钮元素并绑定事件
     * @param {Object} options 配置选项
     * @returns {HTMLElement} 按钮元素
     */
    static create({ 
        text, 
        variant = 'primary', 
        icon = '', 
        onClick = null, 
        disabled = false,
        className = '',
        id = '',
        type = 'button'
    }) {
        const variantClasses = {
            primary: 'bg-primary hover:bg-primary-hover text-white shadow-md hover:shadow-lg',
            secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300',
            danger: 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg',
            success: 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg',
            warning: 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-md hover:shadow-lg',
            info: 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
        };
        
        const baseClasses = 'px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
        const variantClass = variantClasses[variant] || variantClasses.primary;
        
        const button = document.createElement('button');
        button.type = type;
        button.className = `${baseClasses} ${variantClass} ${className}`.trim();
        if (id) button.id = id;
        if (disabled) button.disabled = true;
        
        if (icon) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'mr-2';
            iconSpan.textContent = icon;
            button.appendChild(iconSpan);
        }
        
        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        button.appendChild(textSpan);
        
        if (onClick) {
            button.addEventListener('click', onClick);
        }
        
        return button;
    }
}

export default Button;
