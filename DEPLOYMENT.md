# 🚀 Deployment Guide - WhatsApp Finance Bot

Panduan lengkap untuk deployment WhatsApp Finance Bot ke production environment.

## 📋 Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: 20GB free space
- **Network**: Stable internet connection

### Software Requirements
- **Node.js**: v16.0.0 atau lebih baru
- **MySQL**: v8.0 atau lebih baru
- **Docker**: v20.10+ (opsional)
- **PM2**: v5.0+ (untuk process management)

## 🐳 Docker Deployment (Recommended)

### 1. Quick Start dengan Docker Compose

```bash
# Clone repository
git clone <repository-url>
cd wa-finance-bot

# Copy environment file
cp env.example .env

# Edit environment variables
nano .env

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f bot
```

### 2. Environment Configuration

Edit file `.env`:

```env
# Database Configuration
DB_HOST=mysql
DB_USER=finance_bot
DB_PASSWORD=your_secure_password
DB_NAME=wa_finance_bot
DB_PORT=3306

# Bot Configuration
BOT_NAME=FinanceBot
ADMIN_NUMBER=6281234567890

# Server Configuration
PORT=3000
NODE_ENV=production
TZ=Asia/Jakarta

# Cron Schedule
MONTHLY_REPORT_CRON=0 20 28-31 * *
```

### 3. Production dengan Nginx

```bash
# Start dengan Nginx
docker-compose --profile production up -d

# Check status
docker-compose ps
```

## 🖥️ Manual Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# Install PM2
sudo npm install -g pm2
```

### 2. Database Setup

```bash
# Login ke MySQL
sudo mysql -u root -p

# Buat database dan user
CREATE DATABASE wa_finance_bot;
CREATE USER 'finance_bot'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON wa_finance_bot.* TO 'finance_bot'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import schema
mysql -u finance_bot -p wa_finance_bot < database/setup.sql
```

### 3. Application Deployment

```bash
# Clone repository
git clone <repository-url>
cd wa-finance-bot

# Install dependencies
npm install --production

# Setup environment
cp env.example .env
nano .env

# Create directories
mkdir -p logs
mkdir -p src/.wwebjs_auth

# Set permissions
chmod +x scripts/*.sh
```

### 4. PM2 Configuration

Buat file `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'wa-finance-bot',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 5. Start Application

```bash
# Start dengan PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup

# Check status
pm2 status
pm2 logs wa-finance-bot
```

## 🔒 Security Configuration

### 1. Firewall Setup

```bash
# Install UFW
sudo apt install ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable
```

### 2. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Nginx Configuration

```bash
# Install Nginx
sudo apt install nginx

# Copy configuration
sudo cp nginx/nginx.conf /etc/nginx/sites-available/wa-finance-bot
sudo ln -s /etc/nginx/sites-available/wa-finance-bot /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 📊 Monitoring & Logging

### 1. Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# Check logs
pm2 logs wa-finance-bot --lines 100

# Monitor resources
pm2 show wa-finance-bot
```

### 2. System Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Monitor system resources
htop
iotop
nethogs
```

### 3. Database Monitoring

```bash
# Check MySQL status
sudo systemctl status mysql

# Monitor MySQL performance
mysql -u root -p -e "SHOW PROCESSLIST;"
mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"
```

## 🔄 Backup Strategy

### 1. Database Backup

```bash
# Create backup script
nano scripts/backup.sh

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/mysql"
mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u finance_bot -p wa_finance_bot > $BACKUP_DIR/wa_finance_bot_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/wa_finance_bot_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

# Create cron job
chmod +x scripts/backup.sh
crontab -e
# Add: 0 2 * * * /path/to/wa-finance-bot/scripts/backup.sh
```

### 2. Application Backup

```bash
# Backup application files
tar -czf backup_$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=logs \
  .
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Bot tidak connect ke WhatsApp
```bash
# Check logs
pm2 logs wa-finance-bot

# Restart bot
pm2 restart wa-finance-bot

# Clear WhatsApp session
rm -rf src/.wwebjs_auth/*
```

#### 2. Database connection error
```bash
# Check MySQL status
sudo systemctl status mysql

# Check connection
mysql -u finance_bot -p -e "SELECT 1;"

# Check environment variables
pm2 env wa-finance-bot
```

#### 3. Memory issues
```bash
# Check memory usage
free -h

# Restart with more memory
pm2 restart wa-finance-bot --max-memory-restart 2G
```

### Performance Optimization

#### 1. Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date);
CREATE INDEX idx_expenses_category ON expenses(category_id);

-- Optimize tables
OPTIMIZE TABLE expenses;
OPTIMIZE TABLE users;
```

#### 2. Application Optimization
```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=2048"

# Use PM2 cluster mode
pm2 start ecosystem.config.js -i max
```

## 📈 Scaling Strategy

### 1. Horizontal Scaling
- Load balancer dengan multiple instances
- Database replication (master-slave)
- Redis untuk session management

### 2. Vertical Scaling
- Upgrade server resources
- Optimize database queries
- Implement caching

### 3. Microservices
- Split into multiple services
- API gateway
- Service discovery

## 🔍 Health Checks

### 1. Application Health
```bash
# Check bot status
curl http://localhost:3000/health

# Check bot connection
curl http://localhost:3000/status
```

### 2. Database Health
```bash
# Check MySQL connection
mysql -u finance_bot -p -e "SELECT 'OK' as status;"

# Check database size
mysql -u finance_bot -p -e "SELECT table_name, ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)' FROM information_schema.tables WHERE table_schema = 'wa_finance_bot';"
```

## 📞 Support

### Emergency Contacts
- **Technical Support**: tech@financebot.com
- **24/7 Hotline**: +62 812-3456-7890
- **Documentation**: https://docs.financebot.com

### Maintenance Window
- **Schedule**: Setiap Minggu jam 02:00-04:00 WIB
- **Duration**: 2 jam
- **Notification**: 24 jam sebelumnya via email 