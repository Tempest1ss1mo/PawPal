#!/bin/bash

# Deployment script for User Service on Cloud Compute VM
# This script automates the deployment process

set -e

echo "🚀 Starting User Service deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root${NC}"
   exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js version: $NODE_VERSION${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed.${NC}"
    exit 1
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install --production

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    if [ -f config/database.env.example ]; then
        cp config/database.env.example .env
        echo -e "${YELLOW}Please edit .env file with your configuration${NC}"
    else
        echo -e "${RED}Environment template not found. Creating basic .env...${NC}"
        cat > .env << EOF
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_NAME=pawpal_db
DB_POOL_MAX=10
ALLOWED_ORIGINS=http://localhost:3000
SKIP_DB=false
EOF
        echo -e "${YELLOW}Please edit .env file with your configuration${NC}"
    fi
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Test database connection (if SKIP_DB is not true)
if grep -q "SKIP_DB=true" .env 2>/dev/null; then
    echo -e "${YELLOW}⚠ Skipping database connection test (SKIP_DB=true)${NC}"
else
    echo -e "${YELLOW}Testing database connection...${NC}"
    # This would require a test script - skip for now
    echo -e "${YELLOW}⚠ Database connection test skipped (implement if needed)${NC}"
fi

# Create logs directory
mkdir -p logs
echo -e "${GREEN}✓ Logs directory created${NC}"

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✓ PM2 is installed${NC}"
    echo -e "${YELLOW}You can use PM2 to manage the service:${NC}"
    echo "  pm2 start src/app.js --name user-service"
    echo "  pm2 save"
    echo "  pm2 startup"
else
    echo -e "${YELLOW}PM2 is not installed. Install with: npm install -g pm2${NC}"
fi

# Check if systemd service exists
if [ -f /etc/systemd/system/user-service.service ]; then
    echo -e "${GREEN}✓ Systemd service file exists${NC}"
    echo -e "${YELLOW}To restart service: sudo systemctl restart user-service${NC}"
else
    echo -e "${YELLOW}Systemd service not found. See DEPLOYMENT.md for setup instructions.${NC}"
fi

echo -e "${GREEN}✅ Deployment preparation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Start the service:"
echo "   - Using PM2: pm2 start src/app.js --name user-service"
echo "   - Using systemd: sudo systemctl start user-service"
echo "   - Direct: node src/app.js"
echo "3. Test the service: curl http://localhost:3001/health"

