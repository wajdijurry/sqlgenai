#!/bin/bash
# SQLGenAI Deployment Script
# This script deploys both frontend and backend components to /var/www/html

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
    echo -e "${GREEN}[+] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[!] $1${NC}"
}

print_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Configuration variables
APP_DIR="/var/www/html"
FRONTEND_DIR="${APP_DIR}/frontend"
BACKEND_DIR="${APP_DIR}"
VENV_DIR="${APP_DIR}/venv"
LOG_DIR="${APP_DIR}/logs"
CACHE_DIR="${APP_DIR}/cache"
DOMAIN="sqlgenai.com"
API_DOMAIN="api.sqlgenai.com"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script with sudo or as root"
    exit 1
fi

print_status "Starting SQLGenAI deployment..."

# 1. Create directory structure
print_status "Creating directory structure..."
mkdir -p $APP_DIR
mkdir -p $LOG_DIR
mkdir -p $CACHE_DIR

# 2. Install system dependencies
print_status "Installing system dependencies..."
apt update
apt install -y python3-pip python3-venv nodejs npm git pkg-config default-libmysqlclient-dev python3-dev build-essential unixodbc-dev python3-pyodbc

# 3. Clone or update the repository
if [ -d "${APP_DIR}/.git" ]; then
    print_status "Updating existing repository..."
    cd $APP_DIR
    git pull
else
    print_status "Cloning repository..."
    # Assuming you're running this script from the project directory
    cp -r "$(pwd)/"* $APP_DIR/
fi

# 4. Set up Python virtual environment
print_status "Setting up Python virtual environment..."
cd $BACKEND_DIR
python3 -m venv $VENV_DIR
source $VENV_DIR/bin/activate

# 5. Install Python dependencies
print_status "Installing Python dependencies..."
pip install -r requirements.txt
pip install gunicorn

# 6. Create .env file if it doesn't exist
if [ ! -f "${BACKEND_DIR}/.env" ]; then
    print_status "Creating .env file template..."
    cat > ${BACKEND_DIR}/.env << EOF
# Database Configuration
SQLALCHEMY_DATABASE_URI=mysql+pymysql://username:password@localhost/sqlgenai
SQLALCHEMY_TRACK_MODIFICATIONS=False

# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4

# DeepSeek API Configuration
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-coder

# Claude API Configuration
CLAUDE_API_KEY=your_claude_api_key
CLAUDE_MODEL=claude-3-opus-20240229

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://api.${DOMAIN}/auth/google/callback

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PRICE_ID_BASIC=your_stripe_price_id_basic
STRIPE_PRICE_ID_PRO=your_stripe_price_id_pro

# CORS Configuration
CORS_ORIGINS=https://${DOMAIN},https://www.${DOMAIN},https://${API_DOMAIN}

# Flask Configuration
FLASK_ENV=production
SECRET_KEY=your_secret_key_here
EOF
    print_warning "Please update the .env file with your actual configuration values"
else
    print_status "Using existing .env file"
fi

# 7. Build the frontend
print_status "Building the frontend..."
cd $FRONTEND_DIR

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
npm install --no-audit --no-fund --loglevel=error

# Disable ESLint during build
export DISABLE_ESLINT_PLUGIN=true
export CI=false

# Set production API URL for the build
print_status "Setting production API URL..."
export REACT_APP_API_URL="https://${API_DOMAIN}"

# Run the build
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    print_status "Frontend build completed successfully!"
else
    print_error "Frontend build failed. Please check the logs above for errors."
    exit 1
fi

# 8. Create a systemd service file for the Flask application
print_status "Creating systemd service file..."
cat > /etc/systemd/system/sqlgenai.service << EOF
[Unit]
Description=SQLGenAI Flask Application
After=network.target
Wants=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=${BACKEND_DIR}
Environment="PATH=${VENV_DIR}/bin"
ExecStart=${VENV_DIR}/bin/gunicorn --workers 4 --bind 0.0.0.0:5000 --access-logfile ${LOG_DIR}/gunicorn-access.log --error-logfile ${LOG_DIR}/gunicorn-error.log wsgi:application

# Restart policy
Restart=always
RestartSec=5
StartLimitIntervalSec=0

# Security
PrivateTmp=true
ProtectSystem=full
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

# 9. Set correct permissions
# print_status "Setting correct permissions..."
# chown -R www-data:www-data $APP_DIR
# chmod -R 755 $APP_DIR

# 10. Enable and start the service
print_status "Enabling and starting the service..."
systemctl daemon-reload
systemctl enable sqlgenai.service
systemctl start sqlgenai.service

print_status "Deployment completed successfully!"
print_status "Your application has been deployed to ${APP_DIR}"
print_status "The Flask backend is running as a systemd service (sqlgenai.service)"
print_status "The React frontend has been built to ${FRONTEND_DIR}/build"

print_warning "Important next steps:"
print_warning "1. Update the .env file with your actual configuration values"
print_warning "2. Configure your web server to serve the frontend from ${FRONTEND_DIR}/build"
print_warning "3. Configure your web server to proxy API requests to http://localhost:5000"
print_warning "4. Set up SSL/TLS for both domains"

print_status "You can manage the backend service with the following commands:"
print_status "  - Check status: sudo systemctl status sqlgenai.service"
print_status "  - Restart: sudo systemctl restart sqlgenai.service"
print_status "  - View logs: sudo journalctl -u sqlgenai.service"
