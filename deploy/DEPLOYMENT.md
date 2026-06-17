# Boda VPS Deployment Guide

## Server Info
- **VPS IP**: 212.47.72.186
- **OS**: Ubuntu (Debian-based)
- **User**: root
- **Deploy path**: /root/boda
- **API Subdomain**: boda.ocaya.space
- **API URL**: https://boda.ocaya.space
- **Admin Subdomain**: admin.ocaya.space
- **Admin URL**: https://admin.ocaya.space

---

## Prerequisites
- SSH key access to VPS (key at `~/.ssh/id_rsa`)
- Docker and Docker Compose installed on VPS
- Node.js 20+ installed on VPS
- Nginx installed on VPS (for reverse proxy)

---

## Step 1: SSH into VPS

```bash
ssh -i ~/.ssh/id_rsa root@212.47.72.186
```

---

## Step 2: Install Docker (if not installed)

```bash
curl -fsSL https://get.docker.com -o /tmp/get-docker.sh && sh /tmp/get-docker.sh
```

---

## Step 3: Transfer Project Files (from PC)

From your local machine (PowerShell):

```powershell
# Transfer docker-compose.yml
scp "D:\code\docker-compose.yml" root@212.47.72.186:/root/boda/

# Transfer backend (excluding node_modules)
scp "D:\code\backend\package.json" root@212.47.72.186:/root/boda/backend/
scp "D:\code\backend\.env.example" root@212.47.72.186:/root/boda/backend/

# Transfer src files
scp -r "D:\code\backend\src\*" root@212.47.72.186:/root/boda/backend/src/
```

---

## Step 4: Start PostgreSQL and Redis (Docker)

On VPS:

```bash
cd /root/boda

# Stop any existing native postgres if it conflicts
systemctl stop postgresql 2>/dev/null
systemctl disable postgresql 2>/dev/null

# Start containers
docker compose up -d
```

Verify:
```bash
docker ps
# Should show: boda-postgres (port 5432) and boda-redis (port 6379)
```

---

## Step 5: Create .env File

On VPS:

```bash
cat > /root/boda/backend/.env << 'EOF'
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://boda:boda123@localhost:5432/boda
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-random-secret-here
JWT_REFRESH_SECRET=your-other-random-secret-here
MTN_SUBSCRIPTION_KEY=your-mtn-subscription-key
MTN_API_USER=your-api-user-uuid
MTN_API_KEY=your-api-key
MTN_DISBURSEMENT_KEY=your-disbursement-subscription-key
MTN_TARGET_ENV=sandbox
AIRTEL_CLIENT_ID=your-airtel-client-id
AIRTEL_CLIENT_SECRET=your-airtel-client-secret
AIRTEL_PIN=your-merchant-pin
AT_API_KEY=your-africas-talking-api-key
AT_USERNAME=your-at-username
GOOGLE_MAPS_API_KEY=your-google-maps-key
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=boda-rider-docs
AWS_REGION=af-south-1
EOF
```

Edit with real credentials:
```bash
nano /root/boda/backend/.env
```

---

## Step 6: Install Backend Dependencies

```bash
cd /root/boda/backend
npm install
```

---

## Step 7: Initialize Database Schema

```bash
docker exec -i boda-postgres psql -U boda -d boda < /root/boda/backend/src/schema.sql
```

---

## Step 8: Create Systemd Service

```bash
cat > /etc/systemd/system/boda-api.service << 'EOF'
[Unit]
Description=Boda API Server
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/boda/backend
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start:
```bash
systemctl daemon-reload
systemctl enable boda-api
systemctl start boda-api
```

---

## Step 9: Verify

```bash
# Check service status
systemctl status boda-api

# Test health endpoint
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"..."}

# Test from public IP
curl http://212.47.72.186:3000/health
```

---

## Step 10: Set Up Nginx Reverse Proxy (Optional - with subdomain)

When you have a subdomain (e.g., `boda.ocaya.space`):

### 10a. Point DNS
Add an A record for your subdomain pointing to `212.47.72.186`.

### 10b. Get SSL Certificate
```bash
certbot --nginx -d boda.ocaya.space
```

### 10c. Create Nginx Config
```bash
cat > /etc/nginx/sites-enabled/boda << 'EOF'
server {
    listen 80;
    server_name boda.ocaya.space;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name boda.ocaya.space;

    ssl_certificate /etc/letsencrypt/live/boda.ocaya.space/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/boda.ocaya.space/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }

    # WebSocket support for Socket.io
    location /socket.io {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF
```

### 10d. Reload Nginx
```bash
nginx -t && systemctl reload nginx
```

---

## Building Mobile Apps (APK)

Both apps use **Expo** and build via **EAS (Expo Application Services)**.

### Prerequisites
- Node.js installed on PC
- Expo account (https://expo.dev/signup)
- EAS CLI installed globally

### Step 1: Install EAS CLI
```powershell
npm install -g eas-cli
```

### Step 2: Login to Expo
```powershell
eas login
```

### Step 3: API URL is already configured
Both apps point to `https://boda.ocaya.space` in `src/services/api.js`.

### Step 4: Build Customer App APK
```powershell
cd D:\code\customer-app
eas build -p android --profile preview
```

### Step 5: Build Rider App APK
```powershell
cd D:\code\rider-app
eas build -p android --profile preview
```

### Step 6: Download APKs
After build completes, EAS gives you a download link. Install the APKs on Android phones.

### App Configurations

| App | Package Name | Bundle ID |
|-----|-------------|-----------|
| Boda (Customer) | com.ocaya.boda.customer | com.ocaya.boda.customer |
| Boda Rider | com.ocaya.boda.rider | com.ocaya.boda.rider |

### Files Configured

| File | Purpose |
|------|---------|
| `app.json` | App name, icon, permissions, plugins |
| `eas.json` | Build profiles (preview = APK, production = AAB) |
| `src/services/api.js` | API URL → https://boda.ocaya.space |

### Build Profiles

| Profile | Use Case | Output |
|---------|----------|--------|
| `preview` | Testing on devices (direct install) | APK |
| `production` | Play Store submission | AAB |
| `development` | Dev builds with debugger | APK |

### Expo Project IDs

| App | Expo Project | Dashboard |
|-----|-------------|-----------|
| Boda (Customer) | @qaphael/boda-customer | https://expo.dev/accounts/qaphael/projects/boda-customer |
| Boda Rider | @qaphael/boda-rider | https://expo.dev/accounts/qaphael/projects/boda-rider |

### Build Commands (reference)
```powershell
# Set token
$env:EXPO_TOKEN = "<your-expo-token>"
$env:EAS_NO_VCS = "1"

# Init project (first time only)
cd D:\code\customer-app
cmd /c eas.cmd init --non-interactive --force

cd D:\code\rider-app
cmd /c eas.cmd init --non-interactive --force

# Build APKs
cd D:\code\customer-app
cmd /c eas.cmd build -p android --profile preview --non-interactive

cd D:\code\rider-app
cmd /c eas.cmd build -p android --profile preview --non-interactive
```

---

## Updating the App (after code changes)

From PC:
```powershell
scp -i ~/.ssh/id_rsa "D:\code\backend\src\server.js" root@212.47.72.186:/root/boda/backend/src/server.js
# ... repeat for other changed files
```

On VPS:
```bash
systemctl restart boda-api
```

---

## File Locations on VPS

| Path | Description |
|------|-------------|
| `/root/boda/` | Project root |
| `/root/boda/backend/` | Backend Node.js app |
| `/root/boda/backend/.env` | Environment variables (secrets) |
| `/root/boda/backend/src/` | Source code |
| `/root/boda/docker-compose.yml` | Docker config for Postgres + Redis |
| `/etc/systemd/system/boda-api.service` | Systemd service file |
| `/etc/nginx/sites-enabled/boda` | Nginx config - API reverse proxy |
| `/etc/nginx/sites-enabled/boda-admin` | Nginx config - Admin dashboard |
| `/var/www/boda-admin/` | Admin dashboard build files |

---

## Deploying the Admin Dashboard

### From PC: Build
```powershell
# Update API URL in admin/.env
# VITE_API_URL=https://boda.ocaya.space

cd D:\code\admin
cmd /c "npx vite build"
```

### From PC: Transfer
```powershell
scp -i ~/.ssh/id_rsa -r "D:\code\admin\dist\*" root@212.47.72.186:/var/www/boda-admin/
```

### On VPS: Nginx Config (create HTTP-only first for cert)
```bash
cat > /etc/nginx/sites-enabled/boda-admin << 'EOF'
server {
    listen 80;
    server_name admin.ocaya.space;

    root /var/www/boda-admin;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

nginx -t && systemctl reload nginx
```

### On VPS: Get SSL
```bash
certbot --nginx -d admin.ocaya.space --non-interactive --agree-tos --email admin@ocaya.space
```

### On VPS: Update with SSL config
```bash
cat > /etc/nginx/sites-enabled/boda-admin << 'EOF'
server {
    listen 80;
    server_name admin.ocaya.space;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.ocaya.space;

    ssl_certificate /etc/letsencrypt/live/admin.ocaya.space/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.ocaya.space/privkey.pem;

    root /var/www/boda-admin;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

nginx -t && systemctl reload nginx
```
