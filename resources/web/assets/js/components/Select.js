/**
 * 下拉选择器组件
 */
export class Select {
    /**
     * 渲染下拉选择器
     * @param {Object} options 配置选项
     * @param {string} options.id ID
     * @param {string} options.name name属性
     * @param {Array} options.options 选项数组 [{value: '', label: '', selected: false}]
     * @param {string} options.placeholder 占位符（可选）
     * @param {string} options.value 默认值（可选）
     * @param {string} options.label 标签文本（可选）
     * @param {string} options.className 额外CSS类名
     * @param {boolean} options.required 是否必填
     * @param {boolean} options.showArrow 是否显示下拉箭头（默认true）
     * @returns {string} HTML字符串
     */
    static render({
        id = '',
        name = '',
        options = [],
        placeholder = '',
        value = '',
        label = '',
        className = '',
        required = false,
        showArrow = true
    }) {
        const idAttr = id ? `id="${id}"` : '';
        const nameAttr = name ? `name="${name}"` : '';
        const requiredAttr = required ? 'required' : '';
        
        const labelHtml = label ? `
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5" for="${id}">${label}</label>
        ` : '';
        
        const baseClasses = 'w-full px-3 py-2.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm focus:ring-2 focus:ring-primary outline-none transition-all duration-200 text-gray-800 dark:text-gray-200 text-sm appearance-none cursor-pointer hover:shadow-md focus:shadow-md';
        const selectClasses = `${baseClasses} ${className}`.trim();
        
        const optionsHtml = options.map(opt => {
            const selected = opt.selected || (value && opt.value === value) ? 'selected' : '';
            return `<option value="${opt.value}" ${selected} class="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">${opt.label}</option>`;
        }).join('');
        
        const placeholderOption = placeholder ? `<option value="" disabled ${!value ? 'selected' : ''} class="text-gray-400 dark:text-gray-500">${placeholder}</option>` : '';
        
        const arrowHtml = showArrow ? `
            <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none transition-transform duration-200 group-hover:scale-110">
                <svg class="w-4 h-4 text-gray-400 dark:text-gray-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
                </svg>
            </div>
        ` : '';
        
        return `
            <div class="relative group">
                ${labelHtml}
                <select 
                    class="${selectClasses}"
                    ${idAttr}
                    ${nameAttr}
                    ${requiredAttr}
                >
                    ${placeholderOption}
                    ${optionsHtml}
                </select>
                ${arrowHtml}
            </div>
        `;
    }
    
    /**
     * 创建下拉选择器元素
     * @param {Object} options 配置选项
     * @returns {HTMLElement} 选择器元素
     */
    static create({
        id = '',
        name = '',
        options = [],
        placeholder = '',
        value = '',
        label = '',
        className = '',
        required = false,
        showArrow = true
    }) {
        const container = document.createElement('div');
        container.className = 'relative';
        
        if (label) {
            const labelEl = document.createElement('label');
            labelEl.className = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5';
            labelEl.setAttribute('for', id);
            labelEl.textContent = label;
            container.appendChild(labelEl);
        }
        
        const select = document.createElement('select');
        const baseClasses = 'w-full px-3 py-2.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm focus:ring-2 focus:ring-primary outline-none transition-all duration-200 text-gray-800 dark:text-gray-200 text-sm appearance-none cursor-pointer hover:shadow-md focus:shadow-md';
        select.className = `${baseClasses} ${className}`.trim();
        if (id) select.id = id;
        if (name) select.name = name;
        if (required) select.required = true;
        
        if (placeholder) {
            const placeholderOpt = document.createElement('option');
            placeholderOpt.value = '';
            placeholderOpt.disabled = true;
            placeholderOpt.selected = !value;
            placeholderOpt.textContent = placeholder;
            select.appendChild(placeholderOpt);
        }
        
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            if (opt.selected || (value && opt.value === value)) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        container.appendChild(select);
        
        if (showArrow) {
            container.classList.add('group');
            const arrow = document.createElement('div');
            arrow.className = 'absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none transition-transform duration-200 group-hover:scale-110';
            arrow.innerHTML = `
                <svg class="w-4 h-4 text-gray-400 dark:text-gray-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
                </svg>
            `;
            container.appendChild(arrow);
        }
        
        return container;
    }
}

export default Select;

