#!/bin/bash

# Local Database Setup Script
# This script helps set up the MySQL database for local testing

echo "=== 本地数据库设置 ==="
echo ""

# Check if MySQL is running
if ! brew services list | grep -q "mysql.*started"; then
    echo "启动 MySQL 服务..."
    brew services start mysql
    sleep 3
fi

# Prompt for MySQL root password
echo "请输入 MySQL root 密码（如果没有密码，直接按回车）:"
read -s MYSQL_PASSWORD

if [ -z "$MYSQL_PASSWORD" ]; then
    MYSQL_CMD="mysql -u root"
else
    MYSQL_CMD="mysql -u root -p${MYSQL_PASSWORD}"
fi

echo ""
echo "正在创建数据库和表..."

# Create database and tables
cd "$(dirname "$0")/.."
$MYSQL_CMD < database/schema.sql 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 数据库创建成功！"
    
    # Load sample data
    echo "正在加载测试数据..."
    $MYSQL_CMD pawpal_db < database/sample_data.sql 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ 测试数据加载成功！"
    else
        echo "⚠️  测试数据加载失败（可能已经存在）"
    fi
    
    # Verify
    echo ""
    echo "验证数据库..."
    $MYSQL_CMD pawpal_db -e "SHOW TABLES;" 2>&1
    $MYSQL_CMD pawpal_db -e "SELECT COUNT(*) as user_count FROM users;" 2>&1
    $MYSQL_CMD pawpal_db -e "SELECT COUNT(*) as dog_count FROM dogs;" 2>&1
    
    # Update .env file
    echo ""
    echo "更新 .env 文件..."
    cd user-service
    if [ -n "$MYSQL_PASSWORD" ]; then
        # Update password in .env
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/DB_PASSWORD=.*/DB_PASSWORD=${MYSQL_PASSWORD}/" .env
        else
            sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=${MYSQL_PASSWORD}/" .env
        fi
        echo "✅ .env 文件已更新（密码已设置）"
    else
        echo "✅ .env 文件已配置（无密码）"
    fi
    
    echo ""
    echo "=== 设置完成！==="
    echo "现在可以运行: cd user-service && npm start"
else
    echo "❌ 数据库创建失败"
    echo "请检查 MySQL 密码是否正确"
    exit 1
fi

