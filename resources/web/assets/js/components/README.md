# 公共组件使用文档

## 📦 组件列表

### 1. Navbar - 导航栏组件

```javascript
import { Navbar } from '/assets/js/components/index.js';

const navbar = new Navbar();
const html = navbar.render(userId, isAdmin);
// 初始化事件
navbar.init();
// 更新激活状态
navbar.updateActive('/');
```

### 2. Sidebar - 侧边栏组件

```javascript
import { Sidebar } from '/assets/js/components/index.js';

const sidebar = new Sidebar();
const items = [
    { route: '/', label: '首页', icon: '🏠' },
    { route: '/ranking', label: '排行榜', icon: '🏆' }
];
const html = sidebar.render(items, currentRoute);
// 初始化事件
sidebar.init();
// 切换显示
sidebar.toggle();
```

### 3. Card - 卡片组件

```javascript
import { Card } from '/assets/js/components/index.js';

// 普通卡片
const cardHtml = Card.render({
    title: '卡片标题',
    content: '<p>卡片内容</p>',
    footer: '<button>操作</button>', // 可选
    className: 'custom-class', // 可选
    id: 'cardId' // 可选
});

// 统计卡片
const statHtml = Card.renderStat({
    label: '今日发言',
    value: '100',
    id: 'todayCount', // 可选
    className: 'span-2' // 可选，用于跨列
});
```

### 4. Modal - 模态框组件

```javascript
import Modal from '/assets/js/components/index.js';

// 基础模态框
Modal.show({
    title: '标题',
    content: '<p>内容</p>',
    footer: '<button>确认</button>',
    onClose: () => console.log('关闭了')
});

// 确认对话框
Modal.confirm({
    title: '确认删除',
    message: '确定要删除吗？',
    onConfirm: () => console.log('确认'),
    onCancel: () => console.log('取消')
});

// 输入对话框
Modal.prompt({
    title: '输入名称',
    message: '请输入名称',
    placeholder: '名称',
    onConfirm: (value) => console.log('输入:', value),
    onCancel: () => console.log('取消')
});

// 关闭模态框
Modal.hide();
```

### 5. Button - 按钮组件

```javascript
import { Button } from '/assets/js/components/index.js';

// 渲染HTML字符串
const btnHtml = Button.render({
    text: '点击我',
    variant: 'primary', // primary, secondary, danger
    icon: '🚀', // 可选
    onClick: null, // 仅用于create方法
    disabled: false,
    className: 'custom-class',
    id: 'btnId',
    type: 'button'
});

// 创建DOM元素
const btnEl = Button.create({
    text: '点击我',
    variant: 'primary',
    onClick: () => console.log('点击了')
});
document.body.appendChild(btnEl);
```

### 6. Input - 输入框组件

```javascript
import { Input } from '/assets/js/components/index.js';

// 渲染HTML字符串
const inputHtml = Input.render({
    type: 'text',
    id: 'username',
    name: 'username',
    placeholder: '请输入用户名',
    value: '',
    label: '用户名',
    className: 'custom-class',
    required: true,
    pattern: '^[a-zA-Z0-9]+$'
});

// 创建DOM元素
const inputEl = Input.create({
    type: 'text',
    id: 'username',
    label: '用户名',
    placeholder: '请输入用户名'
});
document.body.appendChild(inputEl);
```

## 🎯 使用示例

### 在页面中使用组件

```javascript
// pages/Example.js
import { Card, Button, Modal } from '/assets/js/components/index.js';

export default class Example {
    async render() {
        return `
            <div class="page">
                ${Card.render({
                    title: '示例卡片',
                    content: '<p>这是内容</p>'
                })}
                ${Button.render({
                    text: '打开对话框',
                    variant: 'primary',
                    id: 'openModalBtn'
                })}
            </div>
        `;
    }
    
    async mounted() {
        // 绑定事件
        document.getElementById('openModalBtn').addEventListener('click', () => {
            Modal.confirm({
                title: '确认',
                message: '确定要执行吗？',
                onConfirm: () => {
                    Toast.show('已确认', 'success');
                }
            });
        });
    }
}
```

## 📝 注意事项

1. 组件已全局注册，可以直接使用 `window.Card`, `window.Modal` 等
2. 使用 `import` 导入时，注意使用命名导出或默认导出
3. Modal 是单例模式，直接使用全局实例
4. 组件提供 `render()` 方法返回HTML字符串，便于在模板中使用

