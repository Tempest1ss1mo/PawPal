#!/bin/bash

# PawPal Web Application Setup and Run Script
# This script helps set up and run all services for Sprint 2

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🐾 PawPal Sprint 2 - Setup and Run Script${NC}"
echo "=========================================="
echo ""

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for service
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=0
    
    echo -e "${YELLOW}Waiting for $service_name to be ready...${NC}"
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" "$url/health" | grep -q "200\|404"; then
            echo -e "${GREEN}✓ $service_name is ready!${NC}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}✗ $service_name failed to start${NC}"
    return 1
}

# Check project structure
echo -e "${BLUE}Checking project structure...${NC}"
if [ ! -d "$PROJECT_ROOT/Cloud-Computing-Database" ]; then
    echo -e "${RED}✗ Cloud-Computing-Database directory not found!${NC}"
    echo "  Expected structure:"
    echo "  Sprint2-Project/"
    echo "  ├── Cloud-Computing-Database/"
    echo "  └── pawpal-webapp/"
    echo ""
    echo "Please ensure Cloud-Computing-Database is in: $PROJECT_ROOT/"
    exit 1
fi

echo -e "${GREEN}✓ Project structure verified${NC}"
echo ""

# Option selection
echo "Select what to run:"
echo "1) Setup only (install dependencies)"
echo "2) Run all services"
echo "3) Run web app only (assumes other services are running)"
echo "4) Stop all services"
echo ""
read -p "Enter option (1-4): " option

case $option in
    1)
        echo ""
        echo -e "${BLUE}Setting up services...${NC}"
        
        # Setup User Service
        echo -e "${YELLOW}Setting up User Service...${NC}"
        cd "$PROJECT_ROOT/Cloud-Computing-Database/user-service"
        if [ ! -d "node_modules" ]; then
            npm install
        fi
        echo -e "${GREEN}✓ User Service dependencies installed${NC}"
        
        # Setup Composite Service
        echo -e "${YELLOW}Setting up Composite Service...${NC}"
        cd "$PROJECT_ROOT/Cloud-Computing-Database/composite-service"
        if [ ! -f ".env" ]; then
            cp .env.example .env 2>/dev/null || echo "No .env.example found"
        fi
        if [ ! -d "node_modules" ]; then
            npm install
        fi
        echo -e "${GREEN}✓ Composite Service dependencies installed${NC}"
        
        # Setup Web App
        echo -e "${YELLOW}Setting up Web Application...${NC}"
        cd "$SCRIPT_DIR"
        if [ ! -f ".env" ]; then
            cp .env.example .env
            echo -e "${YELLOW}  Created .env file - please update with your configuration${NC}"
        fi
        
        # Create virtual environment if needed
        if [ ! -d "venv" ]; then
            python3 -m venv venv
        fi
        source venv/bin/activate
        pip install -r requirements.txt
        echo -e "${GREEN}✓ Web Application dependencies installed${NC}"
        
        echo ""
        echo -e "${GREEN}✅ Setup complete!${NC}"
        echo "Next steps:"
        echo "1. Update .env files if needed"
        echo "2. Run this script again with option 2 to start all services"
        ;;
        
    2)
        echo ""
        echo -e "${BLUE}Starting all services...${NC}"
        
        # Check MySQL
        echo -e "${YELLOW}Checking MySQL...${NC}"
        if ! mysqladmin ping -h localhost --silent 2>/dev/null; then
            echo -e "${RED}✗ MySQL is not running. Please start MySQL first.${NC}"
            echo "  On macOS: sudo /usr/local/mysql/support-files/mysql.server start"
            exit 1
        fi
        echo -e "${GREEN}✓ MySQL is running${NC}"
        
        # Start User Service
        if ! check_port 3001; then
            echo -e "${YELLOW}Starting User Service on port 3001...${NC}"
            cd "$PROJECT_ROOT/Cloud-Computing-Database/user-service"
            npm start > "$PROJECT_ROOT/user-service.log" 2>&1 &
            echo $! > "$PROJECT_ROOT/user-service.pid"
            wait_for_service "http://localhost:3001" "User Service"
        else
            echo -e "${GREEN}✓ User Service already running on port 3001${NC}"
        fi
        
        # Start Composite Service
        if ! check_port 3002; then
            echo -e "${YELLOW}Starting Composite Service on port 3002...${NC}"
            cd "$PROJECT_ROOT/Cloud-Computing-Database/composite-service"
            npm start > "$PROJECT_ROOT/composite-service.log" 2>&1 &
            echo $! > "$PROJECT_ROOT/composite-service.pid"
            wait_for_service "http://localhost:3002" "Composite Service"
        else
            echo -e "${GREEN}✓ Composite Service already running on port 3002${NC}"
        fi
        
        # Start Web App
        if ! check_port 5000; then
            echo -e "${YELLOW}Starting Web Application on port 5000...${NC}"
            cd "$SCRIPT_DIR"
            source venv/bin/activate 2>/dev/null || true
            python app.py > "$PROJECT_ROOT/webapp.log" 2>&1 &
            echo $! > "$PROJECT_ROOT/webapp.pid"
            wait_for_service "http://localhost:5000" "Web Application"
        else
            echo -e "${GREEN}✓ Web Application already running on port 5000${NC}"
        fi
        
        echo ""
        echo -e "${GREEN}✅ All services are running!${NC}"
        echo ""
        echo "Access points:"
        echo "  • Web Application: http://localhost:5000"
        echo "  • Sprint 2 Demo: http://localhost:5000 (click 'Sprint 2 Demo')"
        echo "  • User Service API: http://localhost:3001"
        echo "  • Composite Service API: http://localhost:3002"
        echo ""
        echo "Logs are available at:"
        echo "  • User Service: $PROJECT_ROOT/user-service.log"
        echo "  • Composite Service: $PROJECT_ROOT/composite-service.log"
        echo "  • Web App: $PROJECT_ROOT/webapp.log"
        echo ""
        echo "To stop all services, run this script with option 4"
        ;;
        
    3)
        echo ""
        echo -e "${BLUE}Starting Web Application only...${NC}"
        
        # Check if other services are running
        if ! check_port 3001; then
            echo -e "${YELLOW}⚠ Warning: User Service (port 3001) is not running${NC}"
        fi
        if ! check_port 3002; then
            echo -e "${YELLOW}⚠ Warning: Composite Service (port 3002) is not running${NC}"
        fi
        
        cd "$SCRIPT_DIR"
        
        # Activate virtual environment
        if [ -d "venv" ]; then
            source venv/bin/activate
        else
            echo -e "${YELLOW}Virtual environment not found. Creating...${NC}"
            python3 -m venv venv
            source venv/bin/activate
            pip install -r requirements.txt
        fi
        
        echo -e "${GREEN}Starting Web Application...${NC}"
        python app.py
        ;;
        
    4)
        echo ""
        echo -e "${BLUE}Stopping all services...${NC}"
        
        # Stop services using PID files
        for service in user-service composite-service webapp; do
            pidfile="$PROJECT_ROOT/$service.pid"
            if [ -f "$pidfile" ]; then
                pid=$(cat "$pidfile")
                if kill -0 "$pid" 2>/dev/null; then
                    echo -e "${YELLOW}Stopping $service (PID: $pid)...${NC}"
                    kill "$pid"
                    rm "$pidfile"
                fi
            fi
        done
        
        # Also check by port as backup
        for port in 3001 3002 5000; do
            if check_port $port; then
                pid=$(lsof -ti:$port)
                if [ ! -z "$pid" ]; then
                    echo -e "${YELLOW}Stopping process on port $port (PID: $pid)...${NC}"
                    kill $pid 2>/dev/null || true
                fi
            fi
        done
        
        echo -e "${GREEN}✅ All services stopped${NC}"
        ;;
        
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac
