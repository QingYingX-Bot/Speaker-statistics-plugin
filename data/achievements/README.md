# 成就定义文件夹说明

## 📁 文件夹用途

成就系统支持三层结构：**系统默认**、**用户自定义**、**群专属**。

### 🏗️ 目录结构

```
config/
  ├── achievements-config.json          # 成就分类和稀有度配置
  └── achievements/                      # 系统默认成就目录（41个成就，按分类分文件，只读）
      ├── basic.json                    # 基础类成就
      ├── count.json                    # 计数类成就
      ├── words.json                    # 字数类成就
      ├── active.json                   # 活跃类成就
      ├── daily.json                    # 每日类成就
      ├── streak.json                   # 连续类成就
      ├── time.json                     # 时段类成就
      ├── social.json                   # 社交类成就
      └── competition.json              # 竞赛类成就

data/
  └── achievements/                      # 用户自定义成就目录
      ├── README.md                      # 本说明文档
      ├── custom1.json                   # 用户自定义成就文件1
      ├── custom2.json                   # 用户自定义成就文件2
      └── group/                         # 群专属成就目录
          └── {群ID}/                    # 特定群组目录
              ├── group_custom1.json     # 群专属成就文件1
              └── group_custom2.json     # 群专属成就文件2
```

### 📄 配置文件说明

#### 1. 系统默认成就（`config/achievements/` 目录）

包含41个系统预定义的成就，按分类分文件存储，作为基础成就配置。

- ✅ **只读**：由插件提供，不建议修改
- 📁 **分类存储**：每个分类独立文件，便于管理和维护
- 📦 **配置分离**：成就定义、分类配置、稀有度配置分别存储

#### 2. 用户自定义成就（`data/achievements/` 目录）

用户可以在此目录下创建自定义成就文件。

**文件格式示例：**
```json
{
  "my_custom_achievement": {
    "id": "my_custom_achievement",
    "name": "我的自定义成就",
    "description": "这是一个自定义成就",
    "rarity": "epic",
    "category": "basic",
    "condition": {
      "type": "total_count",
      "value": 9999
    }
  }
}
```

- ✅ **可自定义**：可以添加、修改、删除自己的成就
- 🔄 **支持多个文件**：可以分成多个文件便于管理
- ⚠️ **仅成就定义**：只包含 achievements，不包括 categories 和 rarities

#### 3. 群专属成就（`data/achievements/group/{群ID}/` 目录）

为特定群组创建专属成就，仅在该群内生效。

**文件格式示例：**
```json
{
  "group_special_achievement": {
    "id": "group_special_achievement",
    "name": "群专属成就",
    "description": "仅本群可获得的成就",
    "rarity": "legendary",
    "category": "basic",
    "condition": {
      "type": "total_count",
      "value": 666
    }
  }
}
```

- 🎯 **群组专用**：只对该群成员显示和生效
- 📝 **灵活配置**：可以覆盖或扩展全局成就
- 🏷️ **独立管理**：每个群可以有完全不同的成就设置

### 🔄 加载优先级

成就加载遵循以下优先级（后加载的覆盖先加载的）：

1. **系统默认**：加载 `config/achievements/` 目录下的默认成就（按分类分文件）
2. **用户自定义**：加载 `data/achievements/` 目录下的用户自定义成就
3. **群专属**：针对特定群组，加载 `data/achievements/group/{群ID}/` 目录下的群专属成就

## 📝 成就定义字段说明

- `id`: 成就唯一标识符
- `name`: 成就名称（显示在排行榜等地方）
- `description`: 成就描述
- `rarity`: 稀有度（common, uncommon, rare, epic, legendary, festival）
- `category`: 分类（basic, count, words, active, daily, streak, time）
- `condition`: 解锁条件
  - `type`: 条件类型（见下方支持的类型列表）
  - `value`: 条件值（数字或字符串，根据类型而定）
  - `times`: 次数（用于 text_contains_times）
  - `pattern`: 正则表达式模式（用于 text_contains 和 text_contains_times）

### 🎯 支持的成就类型（17种）

**基础类：**
- `first_message`: 首次发言

**计数类（需要 value 参数）：**
- `total_count`: 累计发言数
- `daily_count`: 单日发言数
- `weekly_count`: 本周发言数
- `monthly_count`: 本月发言数

**字数类（需要 value 参数）：**
- `total_words`: 累计字数
- `daily_words`: 单日字数
- `weekly_words`: 本周字数
- `monthly_words`: 本月字数

**天数类（需要 value 参数）：**
- `active_days`: 活跃天数
- `daily_streak`: 连续天数（从今天往前的连续天数，遇到中断即停止）
- `max_continuous_days`: 最长连续天数（历史所有记录中的最大值）

**时段类：**
- `night_time`: 夜间发言（22:00-06:00，UTC+8）（不需要 value 参数）
- `morning_time`: 早晨发言（06:00-09:00，UTC+8）（不需要 value 参数）
- `time_window`: 时间窗口（需要 start 和 end 参数，例如："2024-01-01T00:00:00"）

**文本类（需要 value 参数）：**
- `text_contains`: 文本包含（支持字符串、数组或正则对象）
- `text_contains_times`: 文本包含次数（需要 value 和 times 参数）

## 🎯 当前状态

- ✅ 系统默认成就：`config/achievements/` 目录已创建，包含41个成就定义（按分类分文件，只读）
- ✅ 用户自定义目录：`data/achievements/` 文件夹已创建
- ✅ 群专属支持：支持在 `data/achievements/group/{群ID}/` 创建群专属成就
- ✅ 三层结构完整：系统默认 → 用户自定义 → 群专属，支持完整覆盖

## 💡 使用建议

### 基础使用
直接使用系统默认的41个成就即可，无需额外配置。

### 扩展使用
1. **添加自定义成就**：在 `data/achievements/` 目录下创建 JSON 文件
2. **覆盖系统成就**：在自定义文件中定义相同 ID 的成就即可覆盖
3. **群组定制**：为特定群组在 `data/achievements/group/{群ID}/` 目录下创建专属成就

### 管理建议
- 按分类分文件管理，例如：`daily.json`、`count.json` 等
- 使用有意义的文件名，便于后续维护
- 定期备份自定义配置

