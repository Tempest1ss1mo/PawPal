#!/bin/bash

# Test MySQL Connection Script
echo "=== 测试 MySQL 连接 ==="
echo ""

# Try different connection methods
echo "尝试方法 1: 无密码连接..."
mysql -u root -e "SELECT 1 as test;" 2>&1 | head -3
if [ $? -eq 0 ]; then
    echo "✅ 无密码连接成功！"
    exit 0
fi

echo ""
echo "尝试方法 2: 使用当前用户名连接..."
mysql -u $(whoami) -e "SELECT 1 as test;" 2>&1 | head -3
if [ $? -eq 0 ]; then
    echo "✅ 使用当前用户名连接成功！"
    exit 0
fi

echo ""
echo "❌ 自动连接失败"
echo ""
echo "请运行以下命令之一："
echo "1. 如果你知道 root 密码:"
echo "   mysql -u root -p"
echo ""
echo "2. 运行交互式设置脚本:"
echo "   ./setup-local-db.sh"
echo ""
echo "3. 重置 MySQL root 密码（如果忘记了）:"
echo "   brew services stop mysql"
echo "   mysqld_safe --skip-grant-tables &"
echo "   mysql -u root"
echo "   # 然后执行: ALTER USER 'root'@'localhost' IDENTIFIED BY '';"
echo "   # 然后: FLUSH PRIVILEGES;"

