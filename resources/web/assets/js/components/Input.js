/**
 * 输入框组件
 */
export class Input {
    /**
     * 渲染输入框
     * @param {Object} options 配置选项
     * @param {string} options.type 输入框类型（text, password, email等）
     * @param {string} options.id ID
     * @param {string} options.name name属性
     * @param {string} options.placeholder 占位符
     * @param {string} options.value 默认值
     * @param {string} options.label 标签文本（可选）
     * @param {string} options.className 额外CSS类名
     * @param {boolean} options.required 是否必填
     * @param {string} options.pattern 验证模式（可选）
     * @param {boolean} options.includeContainer 是否包含容器div（默认true）
     * @param {number} options.maxlength 最大长度（可选）
     * @param {string} options.accept 文件类型（可选，用于file类型）
     * @param {string} options.extraAttrs 额外的HTML属性（可选，格式如 'maxlength="6" accept="image/*"'）
     * @returns {string} HTML字符串
     */
    static render({
        type = 'text',
        id = '',
        name = '',
        placeholder = '',
        value = '',
        label = '',
        className = '',
        required = false,
        pattern = '',
        includeContainer = true,
        maxlength = '',
        accept = '',
        extraAttrs = ''
    }) {
        const idAttr = id ? `id="${id}"` : '';
        const nameAttr = name ? `name="${name}"` : '';
        const requiredAttr = required ? 'required' : '';
        const patternAttr = pattern ? `pattern="${pattern}"` : '';
        const maxlengthAttr = maxlength ? `maxlength="${maxlength}"` : '';
        const acceptAttr = accept ? `accept="${accept}"` : '';
        
        const labelHtml = label ? `
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" for="${id}">${label}</label>
        ` : '';
        
        const inputClasses = `w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all duration-200 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 ${className}`.trim();
        
        const inputHtml = `
                <input 
                    type="${type}" 
                    class="${inputClasses}"
                    ${idAttr}
                    ${nameAttr}
                    placeholder="${placeholder}"
                    value="${value}"
                    ${requiredAttr}
                    ${patternAttr}
                    ${maxlengthAttr}
                    ${acceptAttr}
                    ${extraAttrs}
                >
        `;
        
        if (!includeContainer) {
            return inputHtml;
        }
        
        return `
            <div class="mb-4">
                ${labelHtml}
                ${inputHtml}
            </div>
        `;
    }
    
    /**
     * 只渲染输入框元素（不包含容器）
     * @param {Object} options 配置选项
     * @returns {string} HTML字符串
     */
    static renderInput({
        type = 'text',
        id = '',
        name = '',
        placeholder = '',
        value = '',
        className = '',
        required = false,
        pattern = '',
        maxlength = '',
        accept = '',
        extraAttrs = ''
    }) {
        return this.render({
            type,
            id,
            name,
            placeholder,
            value,
            className,
            required,
            pattern,
            includeContainer: false,
            maxlength,
            accept,
            extraAttrs
        });
    }
    
    /**
     * 创建输入框元素
     * @param {Object} options 配置选项
     * @returns {HTMLElement} 输入框元素
     */
    static create({
        type = 'text',
        id = '',
        name = '',
        placeholder = '',
        value = '',
        label = '',
        className = '',
        required = false
    }) {
        const group = document.createElement('div');
        group.className = 'mb-4';
        
        if (label) {
            const labelEl = document.createElement('label');
            labelEl.className = 'block text-sm font-medium text-gray-700 mb-2';
            labelEl.setAttribute('for', id);
            labelEl.textContent = label;
            group.appendChild(labelEl);
        }
        
        const input = document.createElement('input');
        input.type = type;
        input.className = `w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all duration-200 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 ${className}`.trim();
        if (id) input.id = id;
        if (name) input.name = name;
        if (placeholder) input.placeholder = placeholder;
        if (value) input.value = value;
        if (required) input.required = true;
        
        group.appendChild(input);
        
        return group;
    }
}

export default Input;
