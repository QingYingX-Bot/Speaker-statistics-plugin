# 🗄️ 数据库安装与配置指南

本文档提供 SQLite 和 PostgreSQL 数据库的详细安装和配置指南。

---

## 📋 目录

- [数据库选择](#数据库选择)
- [SQLite 配置](#sqlite-配置)
  - [快速开始](#快速开始)
  - [配置说明](#配置说明)
  - [备份与恢复](#备份与恢复)
- [PostgreSQL 配置](#postgresql-配置)
  - [安装 PostgreSQL](#安装-postgresql)
  - [创建数据库](#创建数据库)
  - [配置插件](#配置插件)
  - [验证安装](#验证安装)
- [常见问题](#常见问题)
- [性能优化](#性能优化)
- [安全建议](#安全建议)

---

## 数据库选择

插件支持两种数据库类型：

| 特性 | SQLite | PostgreSQL |
|------|--------|------------|
| **适用场景** | 个人使用、小规模部署 | 大规模部署、多用户、高并发 |
| **安装难度** | ⭐ 无需安装 | ⭐⭐⭐ 需要安装数据库服务 |
| **性能** | 单用户优秀 | 多用户并发优秀 |
| **数据存储** | 单个文件 | 独立数据库服务 |
| **备份** | 复制文件即可 | 需要专用工具 |
| **推荐场景** | 单机器人、数据量小 | 多机器人、数据量大、需要高可用 |

**推荐选择**：
- 🟢 **SQLite**：个人使用、测试环境、数据量较小（< 10万条记录）
- 🔵 **PostgreSQL**：生产环境、多机器人、数据量大、需要高并发

---

## SQLite 配置

### 快速开始

SQLite 是默认数据库，**无需额外安装**，只需配置即可使用。

#### 1. 编辑配置文件

编辑插件配置文件：`plugins/Speaker-statistics-plugin/data/global.json`

```json
{
  "database": {
    "type": "sqlite",
    "path": "speech_statistics.db"
  }
}
```

#### 2. 重启机器人

重启 Yunzai-Bot 后，插件会自动创建数据库文件并初始化表结构。

#### 3. 验证安装

查看日志中是否出现以下信息：

```
[发言统计插件] 数据库连接成功
[发言统计插件] 数据库表结构初始化完成
```

### 配置说明

#### 基本配置

```json
{
  "database": {
    "type": "sqlite",
    "path": "speech_statistics.db"
  }
}
```

#### 配置字段说明

| 字段 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `type` | `string` | 数据库类型，设置为 `"sqlite"` | `"sqlite"` |
| `path` | `string` | 数据库文件路径 | `"speech_statistics.db"` |

#### 路径配置方式

**相对路径**（推荐）：
- 只指定文件名：`"path": "speech_statistics.db"` → 自动保存到 `plugins/Speaker-statistics-plugin/data/`
- 相对路径：`"path": "../data/speech_statistics.db"` → 相对于插件目录

**绝对路径**：
- `"path": "/home/user/data/speech_statistics.db"`（Linux/macOS）
- `"path": "C:\\data\\speech_statistics.db"`（Windows）

#### 数据库驱动

插件支持两种 SQLite 驱动（按优先级）：

1. **better-sqlite3**（推荐）：性能更好，同步操作
2. **sqlite3**：备用方案，异步操作

插件会自动检测并使用可用的驱动。如果两个驱动都未安装，会显示详细的安装提示。

**安装驱动**（如需要）：

```bash
# 进入插件目录
cd plugins/Speaker-statistics-plugin

# 安装 better-sqlite3（推荐）
pnpm install better-sqlite3

# 或安装 sqlite3（备用）
pnpm install sqlite3
```

**注意**：如果 `better-sqlite3` 安装失败（通常是 Node.js 版本不匹配），插件会自动回退到 `sqlite3`。

### 备份与恢复

#### 备份数据库

SQLite 数据库是单个文件，备份非常简单：

```bash
# 复制数据库文件
cp plugins/Speaker-statistics-plugin/data/speech_statistics.db backup_$(date +%Y%m%d).db

# 或使用压缩备份
tar -czf backup_$(date +%Y%m%d).tar.gz plugins/Speaker-statistics-plugin/data/speech_statistics.db
```

#### 恢复数据库

```bash
# 停止机器人
# 替换数据库文件
cp backup_20241201.db plugins/Speaker-statistics-plugin/data/speech_statistics.db

# 重启机器人
```

#### 自动备份建议

可以设置定时任务自动备份：

```bash
# 编辑 crontab
crontab -e

# 每天凌晨 2 点备份（示例）
0 2 * * * cp /path/to/plugins/Speaker-statistics-plugin/data/speech_statistics.db /path/to/backup/speech_statistics_$(date +\%Y\%m\%d).db
```

---

## PostgreSQL 配置

### 安装 PostgreSQL

#### Linux 安装

##### Ubuntu / Debian

```bash
# 更新软件包列表
sudo apt update

# 安装 PostgreSQL
sudo apt install postgresql postgresql-contrib

# 启动 PostgreSQL 服务
sudo systemctl start postgresql

# 设置开机自启
sudo systemctl enable postgresql

# 验证安装
sudo -u postgres psql -c "SELECT version();"
```

##### CentOS / RHEL / Fedora

```bash
# 安装 PostgreSQL
sudo yum install postgresql-server postgresql-contrib
# 或
sudo dnf install postgresql-server postgresql-contrib

# 初始化数据库
sudo postgresql-setup --initdb

# 启动 PostgreSQL 服务
sudo systemctl start postgresql

# 设置开机自启
sudo systemctl enable postgresql

# 验证安装
sudo -u postgres psql -c "SELECT version();"
```

##### 使用 Docker（推荐）

```bash
# 拉取 PostgreSQL 镜像
docker pull postgres:15

# 运行 PostgreSQL 容器
docker run -d \
  --name postgres-speech-stats \
  -e POSTGRES_USER=speech_user \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=speech_statistics \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15

# 查看容器状态
docker ps | grep postgres
```

#### Windows 安装

##### 方法一：官方安装程序（推荐）

1. **下载安装程序**
   - 访问 [PostgreSQL 官网](https://www.postgresql.org/download/windows/)
   - 下载 Windows 安装程序（推荐版本 12 或更高）

2. **运行安装程序**
   - 双击下载的 `.exe` 文件
   - 选择安装路径（默认：`C:\Program Files\PostgreSQL\<version>`）
   - 选择组件：保持默认选择即可
   - 设置数据目录（默认：`C:\Program Files\PostgreSQL\<version>\data`）

3. **设置超级用户密码**
   - 输入 `postgres` 用户的密码（请记住此密码）
   - 此密码将用于后续数据库管理

4. **配置端口**
   - 默认端口：`5432`（如无冲突，保持默认）

5. **完成安装**
   - 安装完成后，PostgreSQL 服务会自动启动
   - 可以在 Windows 服务管理中查看 `postgresql-x64-<version>` 服务

##### 方法二：使用 Chocolatey

```powershell
# 安装 Chocolatey（如未安装）
# 访问 https://chocolatey.org/install

# 安装 PostgreSQL
choco install postgresql

# 安装后需要手动设置密码
```

##### 方法三：使用 Docker Desktop

1. **安装 Docker Desktop**
   - 下载 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
   - 安装并启动 Docker Desktop

2. **运行 PostgreSQL 容器**

```powershell
# 打开 PowerShell 或 CMD

docker run -d `
  --name postgres-speech-stats `
  -e POSTGRES_USER=speech_user `
  -e POSTGRES_PASSWORD=your_password `
  -e POSTGRES_DB=speech_statistics `
  -p 5432:5432 `
  -v postgres_data:/var/lib/postgresql/data `
  postgres:15
```

#### macOS 安装

##### 方法一：使用 Homebrew（推荐）

```bash
# 安装 Homebrew（如未安装）
# /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 PostgreSQL
brew install postgresql@15

# 启动 PostgreSQL 服务
brew services start postgresql@15

# 验证安装
psql --version
```

##### 方法二：使用 Postgres.app

1. **下载 Postgres.app**
   - 访问 [Postgres.app 官网](https://postgresapp.com/)
   - 下载并安装 `.dmg` 文件

2. **启动应用**
   - 打开应用程序，点击「启动」按钮
   - PostgreSQL 将在 `localhost:5432` 运行

##### 方法三：使用 Docker

```bash
# 拉取 PostgreSQL 镜像
docker pull postgres:15

# 运行 PostgreSQL 容器
docker run -d \
  --name postgres-speech-stats \
  -e POSTGRES_USER=speech_user \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=speech_statistics \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15
```

### 创建数据库

#### 方法一：使用命令行（推荐）

##### Linux / macOS

```bash
# 切换到 postgres 用户（Linux）
sudo -u postgres psql

# 或直接使用 psql（macOS，如果已设置 PATH）
psql -U postgres

# 在 PostgreSQL 命令行中执行：
CREATE DATABASE speech_statistics;
CREATE USER speech_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE speech_statistics TO speech_user;

# 连接到新数据库并授权
\c speech_statistics
GRANT ALL ON SCHEMA public TO speech_user;

# 退出
\q
```

##### Windows

```powershell
# 打开命令提示符或 PowerShell

# 切换到 PostgreSQL bin 目录
cd "C:\Program Files\PostgreSQL\<version>\bin"

# 连接到 PostgreSQL
.\psql.exe -U postgres

# 在 PostgreSQL 命令行中执行：
CREATE DATABASE speech_statistics;
CREATE USER speech_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE speech_statistics TO speech_user;

# 连接到新数据库并授权
\c speech_statistics
GRANT ALL ON SCHEMA public TO speech_user;

# 退出
\q
```

#### 方法二：使用 pgAdmin（图形界面）

1. **打开 pgAdmin**
   - 安装 PostgreSQL 时会自动安装 pgAdmin（Windows/macOS）
   - Linux 可能需要单独安装：`sudo apt install pgadmin4`

2. **连接到服务器**
   - 启动 pgAdmin
   - 右键点击「Servers」→「Create」→「Server」
   - 在「General」标签页输入服务器名称
   - 在「Connection」标签页：
     - Host: `localhost`
     - Port: `5432`
     - Username: `postgres`
     - Password: （安装时设置的密码）

3. **创建数据库**
   - 右键点击「Databases」→「Create」→「Database」
   - Database name: `speech_statistics`
   - Owner: `postgres` 或选择已创建的用户
   - 点击「Save」

4. **创建用户（可选）**
   - 右键点击「Login/Group Roles」→「Create」→「Login/Group Role」
   - General 标签页：Name: `speech_user`
   - Definition 标签页：Password: `your_secure_password`
   - Privileges 标签页：勾选所需权限
   - 点击「Save」

### 配置插件

#### 编辑配置文件

编辑插件配置文件：`plugins/Speaker-statistics-plugin/data/global.json`

```json
{
  "database": {
    "type": "postgresql",
    "host": "localhost",
    "port": 5432,
    "database": "speech_statistics",
    "user": "speech_user",
    "password": "your_secure_password",
    "pool": {
      "max": 20,
      "min": 5,
      "idleTimeoutMillis": 30000,
      "connectionTimeoutMillis": 2000
    },
    "ssl": false
  }
}
```

#### 配置说明

| 字段 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `type` | `string` | 数据库类型，设置为 `"postgresql"` | `"postgresql"` |
| `host` | `string` | 数据库服务器地址 | `"localhost"` |
| `port` | `number` | 数据库端口 | `5432` |
| `database` | `string` | 数据库名称 | `"speech_statistics"` |
| `user` | `string` | 数据库用户名 | `"speech_user"` |
| `password` | `string` | 数据库密码 | （需设置） |
| `pool.max` | `number` | 连接池最大连接数 | `20` |
| `pool.min` | `number` | 连接池最小连接数 | `5` |
| `pool.idleTimeoutMillis` | `number` | 空闲连接超时时间（毫秒） | `30000` |
| `pool.connectionTimeoutMillis` | `number` | 连接超时时间（毫秒） | `2000` |
| `ssl` | `boolean` | 是否使用 SSL 连接 | `false` |

#### 使用 Docker 时的配置

如果使用 Docker 安装的 PostgreSQL，配置基本相同，但需要注意：

- **host**：如果是本机 Docker，使用 `localhost`；如果是远程服务器，使用服务器 IP 地址
- **端口**：确保 Docker 容器的端口映射正确（`-p 5432:5432`）

### 验证安装

#### 方法一：测试连接

重启 Yunzai-Bot 后，插件会自动初始化数据库。查看日志中是否出现以下信息：

```
[发言统计插件] 数据库连接成功
[发言统计插件] 数据库表结构初始化完成
```

#### 方法二：使用命令行验证

```bash
# 连接到数据库
psql -h localhost -U speech_user -d speech_statistics

# 查看表列表
\dt

# 应该看到以下表：
# - user_stats
# - daily_stats
# - weekly_stats
# - monthly_stats
# - yearly_stats
# - achievements
# - user_display_achievements
# - group_info

# 退出
\q
```

#### 方法三：测试插件命令

在机器人所在群聊中发送：

```
#水群信息
```

如果返回群聊信息而不是错误，说明数据库连接正常。

---

## 常见问题

### SQLite 相关问题

#### 问题 1：数据库驱动未安装

**错误信息**：`SQLite 数据库驱动未安装` 或 `Cannot find module 'better-sqlite3'`

**解决方案**：

1. 安装数据库驱动：
   ```bash
   cd plugins/Speaker-statistics-plugin
   pnpm install better-sqlite3
   ```

2. 如果 `better-sqlite3` 安装失败（通常是 Node.js 版本不匹配），安装备用驱动：
   ```bash
   pnpm install sqlite3
   ```

3. 如果使用 nvm，确保 Node.js 版本正确：
   ```bash
   nvm use 24  # 或使用其他已安装的版本
   pnpm install better-sqlite3 --force
   ```

#### 问题 2：数据库文件权限错误

**错误信息**：`EACCES: permission denied` 或 `SQLITE_CANTOPEN`

**解决方案**：

1. 检查数据库文件所在目录的权限
2. 确保机器人有读写权限：
   ```bash
   # Linux/macOS
   chmod 755 plugins/Speaker-statistics-plugin/data
   chmod 644 plugins/Speaker-statistics-plugin/data/speech_statistics.db
   ```

3. 如果使用绝对路径，确保目录存在且有权限

#### 问题 3：数据库文件损坏

**错误信息**：`database disk image is malformed`

**解决方案**：

1. 如果有备份，恢复备份文件
2. 尝试修复数据库：
   ```bash
   sqlite3 speech_statistics.db ".recover" | sqlite3 speech_statistics_fixed.db
   mv speech_statistics_fixed.db speech_statistics.db
   ```

3. 如果无法修复，从备份恢复或重新初始化数据库

### PostgreSQL 相关问题

#### 问题 1：连接被拒绝

**错误信息**：`connect ECONNREFUSED 127.0.0.1:5432`

**解决方案**：

1. 确认 PostgreSQL 服务是否运行：
   - Linux: `sudo systemctl status postgresql`
   - Windows: 在服务管理中查看 `postgresql-x64-<version>` 服务
   - macOS: `brew services list` 或查看 Postgres.app

2. 检查端口是否正确（默认 5432）

3. 检查 `pg_hba.conf` 文件，确保允许本地连接：
   ```
   # 文件位置：
   # Linux: /etc/postgresql/<version>/main/pg_hba.conf
   # Windows: C:\Program Files\PostgreSQL\<version>\data\pg_hba.conf
   # macOS: /usr/local/var/postgres/pg_hba.conf
   
   # 添加或修改以下行：
   host    all             all             127.0.0.1/32            md5
   local   all             all                                     md5
   ```

4. 重启 PostgreSQL 服务使配置生效

#### 问题 2：认证失败

**错误信息**：`password authentication failed for user`

**解决方案**：

1. 确认用户名和密码是否正确
2. 尝试使用 `postgres` 用户登录测试
3. 重置用户密码：
   ```sql
   ALTER USER speech_user WITH PASSWORD 'new_password';
   ```

#### 问题 3：数据库不存在

**错误信息**：`database "speech_statistics" does not exist`

**解决方案**：

1. 创建数据库（参考 [创建数据库](#创建数据库) 部分）
2. 检查配置文件中数据库名称是否正确

#### 问题 4：权限不足

**错误信息**：`permission denied for schema public`

**解决方案**：

```sql
-- 连接到数据库
\c speech_statistics

-- 授予权限
GRANT ALL ON SCHEMA public TO speech_user;
GRANT ALL PRIVILEGES ON DATABASE speech_statistics TO speech_user;
```

#### 问题 5：连接池耗尽

**错误信息**：`sorry, too many clients already`

**解决方案**：

1. 增加 `pool.max` 连接数（但不要过大，建议 20-50）
2. 检查是否有其他程序占用连接
3. 重启 PostgreSQL 服务

#### 问题 6：Docker 容器无法连接

**解决方案**：

1. 确认容器正在运行：`docker ps | grep postgres`
2. 检查端口映射：`docker port postgres-speech-stats`
3. 检查防火墙设置
4. 如果使用 Docker Desktop，确保 WSL2 后端正常运行

### 通用问题

#### 问题 7：数据库表结构初始化失败

**错误信息**：`duplicate column name` 或表创建失败

**解决方案**：

1. 检查日志中的详细错误信息
2. 如果是 SQLite，检查数据库文件是否损坏
3. 如果是 PostgreSQL，检查用户权限
4. 尝试删除表后重新初始化（**注意：会丢失数据**）

---

## 性能优化

### SQLite 优化

1. **定期清理**：
   ```sql
   -- 在 SQLite 命令行中执行
   VACUUM;
   ANALYZE;
   ```

2. **数据库文件位置**：将数据库文件放在 SSD 上以提高性能

3. **备份策略**：定期备份数据库文件，避免数据丢失

### PostgreSQL 优化

1. **连接池配置**：

根据实际使用情况调整连接池大小：

```json
{
  "database": {
    "pool": {
      "max": 20,  // 根据并发量调整（建议 10-50）
      "min": 5,   // 最小连接数
      "idleTimeoutMillis": 30000,
      "connectionTimeoutMillis": 2000
    }
  }
}
```

2. **数据库索引优化**：

插件会自动创建必要的索引，如需进一步优化，可以参考数据库日志。

3. **定期维护**：

建议定期执行 VACUUM 操作：

```sql
VACUUM ANALYZE;
```

4. **PostgreSQL 配置优化**：

编辑 `postgresql.conf` 文件（位置因安装方式而异）：

```conf
# 根据服务器内存调整
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 4MB
```

---

## 备份与恢复

### SQLite 备份

参考 [SQLite 备份与恢复](#备份与恢复) 部分。

### PostgreSQL 备份

#### 备份数据库

```bash
# 使用 pg_dump 备份
pg_dump -h localhost -U speech_user -d speech_statistics -F c -f backup_$(date +%Y%m%d).dump

# 或备份为 SQL 文件
pg_dump -h localhost -U speech_user -d speech_statistics > backup_$(date +%Y%m%d).sql
```

#### 恢复数据库

```bash
# 从 dump 文件恢复
pg_restore -h localhost -U speech_user -d speech_statistics backup_20241201.dump

# 或从 SQL 文件恢复
psql -h localhost -U speech_user -d speech_statistics < backup_20241201.sql
```

#### 自动备份建议

可以设置定时任务自动备份：

```bash
# 编辑 crontab
crontab -e

# 每天凌晨 2 点备份（示例）
0 2 * * * pg_dump -h localhost -U speech_user -d speech_statistics -F c -f /path/to/backup/speech_statistics_$(date +\%Y\%m\%d).dump
```

---

## 安全建议

1. **使用强密码**：为数据库用户设置复杂密码（PostgreSQL）

2. **限制访问**：
   - PostgreSQL：只允许必要的 IP 地址访问数据库
   - SQLite：确保数据库文件权限正确，避免未授权访问

3. **定期更新**：保持数据库软件版本更新

4. **备份数据**：定期备份数据库，防止数据丢失

5. **权限最小化**：只授予必要的数据库权限（PostgreSQL）

6. **配置文件安全**：
   - 不要将包含密码的配置文件提交到版本控制系统
   - 使用环境变量或配置文件加密（生产环境）

---

## 数据库迁移

### 从 SQLite 迁移到 PostgreSQL

1. **导出 SQLite 数据**（需要手动编写脚本或使用工具）

2. **导入到 PostgreSQL**：
   ```bash
   psql -h localhost -U speech_user -d speech_statistics < exported_data.sql
   ```

3. **更新配置文件**：将 `database.type` 改为 `"postgresql"` 并配置连接信息

4. **重启机器人**：验证数据是否正确迁移

### 从 PostgreSQL 迁移到 SQLite

1. **导出 PostgreSQL 数据**：
   ```bash
   pg_dump -h localhost -U speech_user -d speech_statistics > exported_data.sql
   ```

2. **转换数据格式**（需要手动调整 SQL 语法差异）

3. **导入到 SQLite**：
   ```bash
   sqlite3 speech_statistics.db < converted_data.sql
   ```

4. **更新配置文件**：将 `database.type` 改为 `"sqlite"` 并配置路径

5. **重启机器人**：验证数据是否正确迁移

**注意**：数据库迁移是复杂操作，建议在迁移前备份所有数据，并在测试环境先验证。

---

## 获取帮助

如果遇到其他问题，可以：

- 📖 查看 [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- 📖 查看 [SQLite 官方文档](https://www.sqlite.org/docs.html)
- 🐛 提交 [Issue](https://gitee.com/qingyingxbot/Speaker-statistics-plugin/issues)
- 💬 在 Gitee 讨论区提问

---

**最后更新**：2025-12-01
