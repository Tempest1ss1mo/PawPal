# PawPal User Service Database - Cloud Deployment Guide

This guide covers deploying the PawPal User Service database on Google Cloud Platform (GCP) or AWS.

## Prerequisites

- Google Cloud Platform account OR AWS account
- Basic knowledge of cloud VMs and MySQL
- SSH access to your cloud instances

## Option 1: Google Cloud Platform (GCP)

### Step 1: Create a VM Instance

```bash
# Create a VM instance for MySQL
gcloud compute instances create pawpal-mysql-vm \
    --zone=us-central1-a \
    --machine-type=e2-medium \
    --image-family=ubuntu-2004-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=20GB \
    --tags=mysql-server \
    --metadata=startup-script='#!/bin/bash
apt-get update
apt-get install -y mysql-server
systemctl enable mysql
systemctl start mysql'
```

### Step 2: Configure Firewall

```bash
# Allow MySQL connections from your microservice VMs
gcloud compute firewall-rules create allow-mysql \
    --allow tcp:3306 \
    --source-tags=microservice \
    --target-tags=mysql-server \
    --description="Allow MySQL connections from microservices"
```

### Step 3: SSH into the VM and Setup MySQL

```bash
# SSH into your MySQL VM
gcloud compute ssh pawpal-mysql-vm --zone=us-central1-a

# Once connected, secure MySQL installation
sudo mysql_secure_installation
```

### Step 4: Configure MySQL for Remote Access

```bash
# Edit MySQL configuration
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# Add/modify these lines:
bind-address = 0.0.0.0
port = 3306

# Restart MySQL
sudo systemctl restart mysql
```

### Step 5: Create Database and Users

```bash
# Connect to MySQL as root
sudo mysql -u root -p

# Run the following SQL commands:
CREATE DATABASE pawpal_db;
CREATE USER 'pawpal_user'@'%' IDENTIFIED BY 'your_secure_password_here';
GRANT ALL PRIVILEGES ON pawpal_db.* TO 'pawpal_user'@'%';
FLUSH PRIVILEGES;
EXIT;
```

## Option 2: AWS EC2

### Step 1: Launch EC2 Instance

1. Go to AWS EC2 Console
2. Launch Instance with Ubuntu 20.04 LTS
3. Choose instance type: t3.medium
4. Configure Security Group:
   - SSH (22) from your IP
   - MySQL (3306) from your microservice security group
5. Launch instance

### Step 2: Connect and Install MySQL

```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Update and install MySQL
sudo apt update
sudo apt install mysql-server -y

# Secure MySQL installation
sudo mysql_secure_installation
```

### Step 3: Configure MySQL for Remote Access

```bash
# Edit MySQL configuration
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# Change bind-address
bind-address = 0.0.0.0

# Restart MySQL
sudo systemctl restart mysql
```

### Step 4: Setup Database

```bash
# Connect to MySQL
sudo mysql -u root -p

# Create database and user
CREATE DATABASE pawpal_db;
CREATE USER 'pawpal_user'@'%' IDENTIFIED BY 'your_secure_password_here';
GRANT ALL PRIVILEGES ON pawpal_db.* TO 'pawpal_user'@'%';
FLUSH PRIVILEGES;
EXIT;
```

## Deploying the Database Schema

### Method 1: Using the Setup Script

```bash
# Copy the database files to your VM
scp -r database/ ubuntu@your-vm-ip:~/
scp -r scripts/ ubuntu@your-vm-ip:~/

# SSH into the VM and run setup
ssh ubuntu@your-vm-ip
chmod +x scripts/setup_database.sh
./scripts/setup_database.sh
```

### Method 2: Manual Deployment

```bash
# Copy schema file to VM
scp database/schema.sql ubuntu@your-vm-ip:~/

# SSH and run schema
ssh ubuntu@your-vm-ip
mysql -u root -p < schema.sql

# Copy and run sample data
scp database/sample_data.sql ubuntu@your-vm-ip:~/
mysql -u root -p pawpal_db < sample_data.sql
```

## Testing the Deployment

### Test from the MySQL VM

```bash
# Test connection locally
mysql -u pawpal_user -p pawpal_db -e "SELECT COUNT(*) FROM users;"
```

### Test from Microservice VM

```bash
# Install MySQL client on your microservice VM
sudo apt install mysql-client -y

# Test remote connection
mysql -h your-mysql-vm-ip -u pawpal_user -p pawpal_db -e "SELECT COUNT(*) FROM users;"
```

### Test from Local Machine

```bash
# Test connection from your local machine
mysql -h your-mysql-vm-ip -u pawpal_user -p pawpal_db -e "SELECT COUNT(*) FROM users;"
```

## Environment Configuration

Update your microservice's database configuration:

```bash
# For production deployment
DB_HOST=your-mysql-vm-ip
DB_PORT=3306
DB_NAME=pawpal_db
DB_USERNAME=pawpal_user
DB_PASSWORD=your_secure_password_here
DB_SSL_ENABLED=false
```

## Security Best Practices

1. **Use Strong Passwords**: Generate secure passwords for database users
2. **Restrict Network Access**: Only allow connections from trusted IPs
3. **Enable SSL**: For production, configure SSL connections
4. **Regular Backups**: Set up automated database backups
5. **Firewall Rules**: Restrict access to necessary ports only
6. **Updates**: Keep MySQL and OS updated

## Backup and Recovery

### Create Backup

```bash
# Create database backup
mysqldump -u root -p pawpal_db > pawpal_backup_$(date +%Y%m%d_%H%M%S).sql

# Compress backup
gzip pawpal_backup_*.sql
```

### Restore from Backup

```bash
# Restore database
mysql -u root -p pawpal_db < pawpal_backup_20241201_120000.sql
```

## Monitoring and Maintenance

### Check Database Status

```bash
# Check MySQL status
sudo systemctl status mysql

# Check database size
mysql -u root -p -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.tables WHERE table_schema='pawpal_db' GROUP BY table_schema;"
```

### Monitor Connections

```bash
# Check active connections
mysql -u root -p -e "SHOW PROCESSLIST;"

# Check connection statistics
mysql -u root -p -e "SHOW STATUS LIKE 'Connections';"
```

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check firewall rules and MySQL bind-address
2. **Access Denied**: Verify user permissions and password
3. **Database Not Found**: Ensure database was created successfully
4. **Timeout Issues**: Check network connectivity and MySQL configuration

### Debug Commands

```bash
# Check MySQL error logs
sudo tail -f /var/log/mysql/error.log

# Test network connectivity
telnet your-mysql-vm-ip 3306

# Check MySQL configuration
mysql -u root -p -e "SHOW VARIABLES LIKE '%bind%';"
```

## Cost Optimization

### GCP Cost Optimization

- Use preemptible instances for non-production environments
- Choose appropriate machine types based on load
- Use committed use discounts for long-term deployments

### AWS Cost Optimization

- Use Reserved Instances for predictable workloads
- Monitor usage with AWS Cost Explorer
- Use Spot Instances for development/testing

---

**Next Steps**: After successful database deployment, configure your User Service microservice to connect to this database and test the full integration.

