# Manual MySQL Root Password Reset Instructions

Since automated scripts aren't working with MySQL 9.0, here are **manual steps** you can run in your terminal:

## Method 1: Using MySQL Safe Mode (Recommended)

**Open a NEW terminal window** and run these commands one by one:

```bash
# Step 1: Stop MySQL
sudo /usr/local/mysql/support-files/mysql.server stop

# Step 2: Start MySQL in safe mode (this will run in the foreground)
sudo /usr/local/mysql/bin/mysqld_safe --skip-grant-tables --skip-networking

# Leave this terminal window open and open a NEW terminal window for the next steps
```

**In the NEW terminal window:**

```bash
# Step 3: Connect to MySQL (no password needed in safe mode)
/usr/local/mysql/bin/mysql -u root

# Step 4: In the MySQL prompt, run these commands:
USE mysql;
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'cloudcomputing123';
FLUSH PRIVILEGES;
EXIT;

# Step 5: Go back to the first terminal and press Ctrl+C to stop safe mode

# Step 6: Start MySQL normally
sudo /usr/local/mysql/support-files/mysql.server start

# Step 7: Test the new password
/usr/local/mysql/bin/mysql -u root -p
# When prompted, enter: cloudcomputing123
```

## Method 2: Using MySQL Init File

If Method 1 doesn't work, try this:

```bash
# Step 1: Create a reset file
cat > /tmp/mysql-init.txt << 'EOF'
ALTER USER 'root'@'localhost' IDENTIFIED BY 'cloudcomputing123';
EOF

# Step 2: Stop MySQL
sudo /usr/local/mysql/support-files/mysql.server stop

# Step 3: Start MySQL with init file
sudo /usr/local/mysql/bin/mysqld --init-file=/tmp/mysql-init.txt --user=_mysql &

# Step 4: Wait a few seconds, then test
sleep 5
/usr/local/mysql/bin/mysql -u root -pcloudcomputing123 -e "SELECT 'SUCCESS' as status;"

# Step 5: Stop and restart normally
sudo pkill mysqld
sudo /usr/local/mysql/support-files/mysql.server start
```

## After Password Reset

Once the password is reset to `cloudcomputing123`, run:

```bash
cd /Users/jessicasun/Documents/GitHub/Cloud-Computing-Database
./scripts/setup_after_password.sh cloudcomputing123
```

This will:
- Create the database
- Create the application user
- Update .env file
- Test the connection

