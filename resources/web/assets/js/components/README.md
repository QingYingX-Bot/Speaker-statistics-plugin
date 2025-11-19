# 公共组件使用文档

本文档介绍项目中所有可用的公共组件及其使用方法。

## 📦 组件列表

### 1. Navigation - 导航栏组件

```javascript
import { Navbar } from '/assets/js/components/index.js';

const navbar = new Navbar();
const html = navbar.render(userId, isAdmin);
// 初始化事件
navbar.init();
// 更新激活状态
navbar.updateActive('/');
```

### 2. Loading - 加载组件

```javascript
import { Loading } from '/assets/js/components/index.js';

// 基础加载动画
const loadingHtml = Loading.render({
    text: '加载中...',
    size: 'medium', // small, medium, large
    className: 'py-8' // 可选
});

// 内联加载动画
const inlineHtml = Loading.renderInline({
    text: '加载中...',
    className: 'inline-block'
});

// 迷你加载动画
const miniHtml = Loading.renderMini({
    className: 'inline-block'
});
```

### 3. EmptyState - 空状态组件

```javascript
import { EmptyState } from '/assets/js/components/index.js';

// 基础空状态
const emptyHtml = EmptyState.render({
    message: '暂无数据',
    icon: '<svg>...</svg>', // 可选
    action: '<button>刷新</button>' // 可选
});

// 卡片样式空状态
const emptyCardHtml = EmptyState.renderCard({
    message: '暂无数据',
    icon: '<svg>...</svg>',
    action: '<button>刷新</button>'
});
```

### 4. RankCard - 排名卡片组件

```javascript
import { RankCard } from '/assets/js/components/index.js';

// 移动端卡片样式
const cardHtml = RankCard.render({
    rank: 1,
    userId: '123456',
    userName: '用户名',
    avatarUrl: 'https://...',
    count: 100,
    words: 5000,
    dataUserId: '123456' // 可选
});

// 桌面端表格行样式
const rowHtml = RankCard.renderTableRow({
    rank: 1,
    userId: '123456',
    userName: '用户名',
    avatarUrl: 'https://...',
    count: 100,
    words: 5000,
    activeDays: 30, // 可选
    continuousDays: 7 // 可选
});
```

**使用位置**：`Ranking.js` - 排行榜页面的移动端卡片和桌面端表格行

### 5. ChartCard - 图表容器卡片组件

```javascript
import { ChartCard } from '/assets/js/components/index.js';

// 基础图表卡片
const chartHtml = ChartCard.render({
    title: '消息趋势',
    content: '<div id="chart"></div>',
    footer: '<div>图例</div>', // 可选
    className: 'hover:shadow-lg',
    id: 'chartCard', // 可选
    height: 400 // 可选，默认400px
});

// 全宽图表卡片
const fullWidthHtml = ChartCard.renderFullWidth({
    title: '消息趋势',
    content: '<div id="chart"></div>',
    className: 'lg:col-span-2',
    height: 400
});
```

**使用位置**：`Admin.js` - 管理页面的概览和数据统计页面的图表容器

### 6. AchievementCard - 成就卡片组件

```javascript
import { AchievementCard } from '/assets/js/components/index.js';

// 单个成就卡片
const cardHtml = AchievementCard.render({
    achievement: {
        id: 'achievement_1',
        name: '成就名称',
        description: '成就描述',
        rarity: 'epic',
        icon: '🏆'
    },
    unlocked: true,
    unlockedAt: '2024-01-01'
});

// 成就列表
const listHtml = AchievementCard.renderList(achievements, {
    unlocked: true,
    showRarity: true
});
```

**使用位置**：`Profile.js` - 个人页面的成就展示

### 7. Card - 卡片组件

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

// 统计卡片（基础版）
const statHtml = Card.renderStat({
    label: '今日发言',
    value: '100',
    id: 'todayCount', // 可选
    className: 'span-2' // 可选，用于跨列
});

// 统计卡片（增强版 - 带趋势和变化）
const statHtmlEnhanced = Card.renderStat({
    label: '总消息数',
    value: '1,234',
    icon: '<svg>...</svg>', // 可选
    trend: 'up', // 'up', 'down', 'neutral'（可选）
    change: '+5.2%', // 变化百分比（可选）
    color: 'blue', // 'blue', 'green', 'purple', 'orange', 'red', 'gray'（可选，默认'blue'）
    showIcon: true, // 是否显示图标区域（默认true）
    id: 'statCard',
    className: ''
});
```

**使用位置**：`Home.js`, `Profile.js` - 统计卡片和普通卡片；`Admin.js` - 数据统计页面的统计卡片

### 8. Modal - 模态框组件

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

**使用位置**：多个页面 - 确认对话框、输入对话框等

### 9. Button - 按钮组件

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

**使用位置**：`Admin.js` - 数据统计页面的导出按钮

### 10. Input - 输入框组件

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

**使用位置**：可在需要输入框的地方使用

**修复说明**：
- 添加了 `includeContainer` 选项（默认 `true`），可控制是否包含容器 div
- 新增 `renderInput()` 方法，只返回 input 元素（不包含容器）

```javascript
// 只返回 input 元素（不包含容器）
const inputOnly = Input.renderInput({
    type: 'text',
    id: 'username',
    placeholder: '请输入用户名'
});

// 或者使用 includeContainer: false
const inputOnly2 = Input.render({
    type: 'text',
    id: 'username',
    includeContainer: false
});
```

### 11. Select - 下拉选择器组件

```javascript
import { Select } from '/assets/js/components/index.js';

// 渲染HTML字符串
const selectHtml = Select.render({
    id: 'groupSelect',
    name: 'group',
    label: '选择群聊',
    placeholder: '请选择...', // 可选
    options: [
        { value: 'all', label: '全部群聊', selected: false },
        { value: '1', label: '群组1', selected: true },
        { value: '2', label: '群组2', selected: false }
    ],
    className: 'w-full',
    required: false,
    showArrow: true // 默认true
});

// 创建DOM元素
const selectEl = Select.create({
    id: 'groupSelect',
    label: '选择群聊',
    options: [
        { value: 'all', label: '全部群聊' },
        { value: '1', label: '群组1' }
    ]
});
document.body.appendChild(selectEl);
```

**使用位置**：`Ranking.js` - 排行榜类型和群组选择器；`Admin.js` - 数据统计时间范围选择器、成就管理群组选择器

### 12. SearchInput - 搜索输入框组件

```javascript
import { SearchInput } from '/assets/js/components/index.js';

// 渲染HTML字符串
const searchHtml = SearchInput.render({
    id: 'searchInput',
    name: 'search',
    placeholder: '搜索...',
    value: '',
    className: 'w-full',
    showClearButton: true, // 默认true
    clearButtonId: 'clearBtn' // 可选
});

// 创建DOM元素
const searchEl = SearchInput.create({
    id: 'searchInput',
    placeholder: '搜索...',
    showClearButton: true
});
document.body.appendChild(searchEl);
```

**使用位置**：`Admin.js` - 群管理搜索栏、用户管理搜索栏、成就管理搜索栏

### 13. Badge - 徽章组件

```javascript
import { Badge } from '/assets/js/components/index.js';

// 渲染HTML字符串
const badgeHtml = Badge.render({
    text: '新功能',
    variant: 'primary', // primary, secondary, success, warning, danger, info, gray
    size: 'md', // sm, md, lg
    icon: '<svg>...</svg>', // 可选
    className: 'custom-class',
    id: 'badgeId'
});

// 创建DOM元素
const badgeEl = Badge.create({
    text: '新功能',
    variant: 'success',
    size: 'sm'
});
document.body.appendChild(badgeEl);
```

**使用位置**：可在需要显示标签、状态、数量等场景使用

### 14. Tabs - 标签页组件

```javascript
import { Tabs } from '/assets/js/components/index.js';

// 渲染HTML字符串
const tabsHtml = Tabs.render({
    tabs: [
        { id: 'tab1', label: '概览', icon: '<svg>...</svg>', active: true },
        { id: 'tab2', label: '群管理', icon: '<svg>...</svg>', active: false },
        { id: 'tab3', label: '用户管理', active: false }
    ],
    activeId: 'tab1', // 可选，默认使用第一个 active: true 的标签
    variant: 'underline', // 'underline', 'pills', 'default'（默认'underline'）
    className: 'custom-class',
    id: 'tabsContainer'
});

// 创建DOM元素
const tabsEl = Tabs.create({
    tabs: [
        { id: 'tab1', label: '概览', active: true },
        { id: 'tab2', label: '群管理', active: false }
    ],
    variant: 'pills'
});
document.body.appendChild(tabsEl);
```

**使用位置**：可在 `Admin.js` 管理页面的标签页导航中使用

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

## 📊 组件使用统计

| 组件 | 使用位置 | 状态 |
|------|---------|------|
| Navigation | `app.js` | ✅ 已使用 |
| Card | `Home.js`, `Profile.js` | ✅ 已使用 |
| Modal | 多个页面 | ✅ 已使用 |
| Loading | 多个页面 | ✅ 已使用 |
| EmptyState | `Achievement.js`, `Profile.js`, `Ranking.js` | ✅ 已使用 |
| RankCard | `Ranking.js` | ✅ 已使用 |
| ChartCard | `Admin.js` | ✅ 已使用 |
| AchievementCard | `Profile.js` | ✅ 已使用 |
| Button | `Admin.js` | ✅ 已使用 |
| Input | `Admin.js`, `Achievement.js`, `Settings.js`, `Background.js` | ✅ 已使用 |
| Select | `Ranking.js`, `Admin.js` | ✅ 已使用 |
| SearchInput | `Admin.js` | ✅ 已使用 |
| Badge | `Admin.js` | ✅ 已使用 |
| Tabs | `Admin.js` | ✅ 已使用 |

## 💡 组件功能增强

### Card.renderStat 增强功能

- ✅ 支持趋势箭头（`trend: 'up' | 'down' | 'neutral'`）
- ✅ 支持变化百分比显示（`change: '+5.2%'`）
- ✅ 支持多种颜色主题（`color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray'`）
- ✅ 支持自定义图标（`icon: '<svg>...</svg>'`）
- ✅ 支持渐变背景和阴影效果

## 📝 注意事项

1. 组件已全局注册，可以直接使用 `window.Card`, `window.Modal` 等
2. 使用 `import` 导入时，注意使用命名导出或默认导出
3. Modal 是单例模式，直接使用全局实例
4. 组件提供 `render()` 方法返回HTML字符串，便于在模板中使用
5. 部分组件（如 Input）返回的是包含容器的HTML，使用时需要注意

