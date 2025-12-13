# 本地验证设置指南

## 前提条件

1. MySQL 已安装（通过 Homebrew）
2. Node.js 已安装
3. 项目代码已克隆

## 快速设置步骤

### Step 1: 启动 MySQL

```bash
brew services start mysql
```

### Step 2: 设置数据库

**如果你知道 MySQL root 密码：**

```bash
cd /Users/xuanming/Project/4153_NEW_NEW
mysql -u root -p < database/schema.sql
mysql -u root -p pawpal_db < database/sample_data.sql
```

**如果不知道密码或想重置为空密码：**

```bash
# 停止 MySQL
brew services stop mysql

# 以安全模式启动（跳过权限检查）
mysqld_safe --skip-grant-tables &

# 连接到 MySQL（不需要密码）
mysql -u root

# 在 MySQL 中执行：
ALTER USER 'root'@'localhost' IDENTIFIED BY '';
FLUSH PRIVILEGES;
EXIT;

# 停止安全模式
killall mysqld_safe
killall mysqld

# 正常启动 MySQL
brew services start mysql

# 现在可以无密码连接了
mysql -u root < database/schema.sql
mysql -u root pawpal_db < database/sample_data.sql
```

**或者使用交互式脚本：**

```bash
cd /Users/xuanming/Project/4153_NEW_NEW/user-service
./setup-local-db.sh
# 脚本会提示输入密码
```

### Step 3: 配置环境变量

编辑 `user-service/.env` 文件：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=你的密码（如果没有密码就留空）
DB_NAME=pawpal_db
SKIP_DB=false
```

### Step 4: 验证数据库

```bash
mysql -u root -p pawpal_db -e "SHOW TABLES;"
mysql -u root -p pawpal_db -e "SELECT COUNT(*) FROM users;"
mysql -u root -p pawpal_db -e "SELECT COUNT(*) FROM dogs;"
```

### Step 5: 测试数据库连接

```bash
cd /Users/xuanming/Project/4153_NEW_NEW/user-service
node -e "
require('dotenv').config();
const { connectDatabase } = require('./src/config/database');
connectDatabase().then(() => {
  console.log('✅ Database connection successful!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
  process.exit(1);
});
"
```

### Step 6: 启动服务

```bash
cd /Users/xuanming/Project/4153_NEW_NEW/user-service
npm start
```

应该看到：
```
📊 Database connection established
✅ Database test query successful: { test: 1 }
✅ Database connected successfully
🚀 PawPal User Service running on port 3001
```

### Step 7: 测试 API

```bash
# 健康检查
curl http://localhost:3001/health

# 获取用户列表（从数据库）
curl http://localhost:3001/api/users

# 创建用户（写入数据库）
curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","role":"owner"}' \
  http://localhost:3001/api/users

# 验证数据在数据库中
mysql -u root -p pawpal_db -e "SELECT * FROM users WHERE email='test@example.com';"
```

## 故障排除

### MySQL 连接失败

1. 检查 MySQL 是否运行：
   ```bash
   brew services list | grep mysql
   ```

2. 检查端口：
   ```bash
   lsof -i :3306
   ```

3. 测试连接：
   ```bash
   mysql -u root -p -e "SELECT 1;"
   ```

### 数据库不存在

```bash
mysql -u root -p < database/schema.sql
```

### 权限问题

确保 .env 文件中的密码正确，或者重置 MySQL root 密码。

