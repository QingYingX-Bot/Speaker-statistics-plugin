# 🗄️ 数据库安装教程 | AI写的 应该对的（

本文档提供 PostgreSQL 数据库的详细安装和配置指南。

---

## 📋 目录

- [前置要求](#前置要求)
- [安装 PostgreSQL](#安装-postgresql)
  - [Linux 安装](#linux-安装)
  - [Windows 安装](#windows-安装)
  - [macOS 安装](#macos-安装)
- [创建数据库](#创建数据库)
- [配置插件](#配置插件)
- [验证安装](#验证安装)
- [常见问题](#常见问题)

---

## 前置要求

- 操作系统：Linux / Windows / macOS
- 内存：建议至少 2GB RAM
- 磁盘空间：建议至少 1GB 可用空间

---

## 安装 PostgreSQL

### Linux 安装

#### Ubuntu / Debian

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

#### CentOS / RHEL / Fedora

```bash
# 安装 PostgreSQL（使用 yum/dnf）
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

#### 使用 Docker（推荐）

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

---

### Windows 安装

#### 方法一：官方安装程序（推荐）

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

#### 方法二：使用 Chocolatey

```powershell
# 安装 Chocolatey（如未安装）
# 访问 https://chocolatey.org/install

# 安装 PostgreSQL
choco install postgresql

# 安装后需要手动设置密码
```

#### 方法三：使用 Docker Desktop

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

---

### macOS 安装

#### 方法一：使用 Homebrew（推荐）

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

#### 方法二：使用 Postgres.app

1. **下载 Postgres.app**
   - 访问 [Postgres.app 官网](https://postgresapp.com/)
   - 下载并安装 `.dmg` 文件

2. **启动应用**
   - 打开应用程序，点击「启动」按钮
   - PostgreSQL 将在 `localhost:5432` 运行

#### 方法三：使用 Docker

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

---

## 创建数据库

### 方法一：使用命令行（推荐）

#### Linux / macOS

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

#### Windows

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

### 方法二：使用 pgAdmin（图形界面）

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

---

## 配置插件

### 编辑配置文件

编辑插件配置文件：`plugins/Speaker-statistics-plugin/data/global.json`

```json
{
  "database": {
    "host": "localhost",
    "port": 5432,
    "database": "speech_statistics",
    "user": "speech_user",
    "password": "your_secure_password",
    "max": 20,
    "idleTimeoutMillis": 30000
  }
}
```

### 配置说明

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `host` | 数据库服务器地址 | `localhost` |
| `port` | 数据库端口 | `5432` |
| `database` | 数据库名称 | `speech_statistics` |
| `user` | 数据库用户名 | `speech_user` |
| `password` | 数据库密码 | （需设置） |
| `max` | 连接池最大连接数 | `20` |
| `idleTimeoutMillis` | 空闲连接超时时间（毫秒） | `30000` |

### 使用 Docker 时的配置

如果使用 Docker 安装的 PostgreSQL，配置基本相同，但需要注意：

- **host**：如果是本机 Docker，使用 `localhost`；如果是远程服务器，使用服务器 IP 地址
- **端口**：确保 Docker 容器的端口映射正确（`-p 5432:5432`）

---

## 验证安装

### 方法一：测试连接

重启 Yunzai-Bot 后，插件会自动初始化数据库。查看日志中是否出现以下信息：

```
[发言统计插件] 数据库连接成功
[发言统计插件] 数据库表结构初始化完成
```

### 方法二：使用命令行验证

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

### 方法三：测试插件命令

在机器人所在群聊中发送：

```
#水群信息
```

如果返回群聊信息而不是错误，说明数据库连接正常。

---

## 常见问题

### 问题 1：连接被拒绝

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

---

### 问题 2：认证失败

**错误信息**：`password authentication failed for user`

**解决方案**：
1. 确认用户名和密码是否正确
2. 尝试使用 `postgres` 用户登录测试
3. 重置用户密码：
   ```sql
   ALTER USER speech_user WITH PASSWORD 'new_password';
   ```

---

### 问题 3：数据库不存在

**错误信息**：`database "speech_statistics" does not exist`

**解决方案**：
1. 创建数据库（参考 [创建数据库](#创建数据库) 部分）
2. 检查配置文件中数据库名称是否正确

---

### 问题 4：权限不足

**错误信息**：`permission denied for schema public`

**解决方案**：
```sql
-- 连接到数据库
\c speech_statistics

-- 授予权限
GRANT ALL ON SCHEMA public TO speech_user;
GRANT ALL PRIVILEGES ON DATABASE speech_statistics TO speech_user;
```

---

### 问题 5：连接池耗尽

**错误信息**：`sorry, too many clients already`

**解决方案**：
1. 增加 `max` 连接数（但不要过大，建议 20-50）
2. 检查是否有其他程序占用连接
3. 重启 PostgreSQL 服务

---

### 问题 6：Docker 容器无法连接

**解决方案**：
1. 确认容器正在运行：`docker ps | grep postgres`
2. 检查端口映射：`docker port postgres-speech-stats`
3. 检查防火墙设置
4. 如果使用 Docker Desktop，确保 WSL2 后端正常运行

---

## 性能优化建议

### 1. 连接池配置

根据实际使用情况调整连接池大小：

```json
{
  "database": {
    "max": 20,  // 根据并发量调整（建议 10-50）
    "idleTimeoutMillis": 30000
  }
}
```

### 2. 数据库索引优化

插件会自动创建必要的索引，如需进一步优化，可以参考数据库日志。

### 3. 定期维护

建议定期执行 VACUUM 操作：

```sql
VACUUM ANALYZE;
```

---

## 备份与恢复

### 备份数据库

```bash
# 使用 pg_dump 备份
pg_dump -h localhost -U speech_user -d speech_statistics -F c -f backup_$(date +%Y%m%d).dump

# 或备份为 SQL 文件
pg_dump -h localhost -U speech_user -d speech_statistics > backup_$(date +%Y%m%d).sql
```

### 恢复数据库

```bash
# 从 dump 文件恢复
pg_restore -h localhost -U speech_user -d speech_statistics backup_20241219.dump

# 或从 SQL 文件恢复
psql -h localhost -U speech_user -d speech_statistics < backup_20241219.sql
```

---

## 安全建议

1. **使用强密码**：为数据库用户设置复杂密码
2. **限制访问**：只允许必要的 IP 地址访问数据库
3. **定期更新**：保持 PostgreSQL 版本更新
4. **备份数据**：定期备份数据库，防止数据丢失
5. **权限最小化**：只授予必要的数据库权限

---

## 获取帮助

如果遇到其他问题，可以：

- 📖 查看 [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- 🐛 提交 [Issue](https://gitee.com/qingyingxbot/Speaker-statistics-plugin/issues)
- 💬 在 Gitee 讨论区提问

---

**最后更新**：2025-11-17

