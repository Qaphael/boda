# AGENTS.md — Boda Project

## Project Overview

**Boda** is a rides and delivery platform for Gulu, Uganda. It connects customers with verified boda boda (motorcycle) riders for rides and deliveries, with mobile money escrow payments (MTN/Airtel MoMo).

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  CLIENT LAYER                    │
│  Customer App (React Native/Expo)               │
│  Rider App (React Native/Expo)                  │
│  Admin Dashboard (React/Vite)                   │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS + WebSocket
┌──────────────────────▼──────────────────────────┐
│              BACKEND API (Node.js/Fastify)       │
│  Auth │ Bookings │ Tracking │ Payments │ Ratings │
└──────┬──────────────────────────────────┬───────┘
       │                                  │
┌──────▼──────┐  ┌────────────┐  ┌───────▼────────┐
│ PostgreSQL  │  │   Redis    │  │  File Storage  │
│  (Docker)   │  │  (Docker)  │  │  (AWS S3)      │
└─────────────┘  └────────────┘  └────────────────┘
```

## Directory Structure

```
D:\code\
├── backend/                  # Node.js + Fastify API server
│   ├── src/
│   │   ├── server.js         # Entry point, route registration
│   │   ├── schema.sql        # Database schema
│   │   ├── config/           # database.js, redis.js
│   │   ├── routes/           # auth.js, riders.js, bookings.js, admin.js
│   │   ├── middleware/        # auth.js (JWT + role checking)
│   │   ├── services/         # paymentService.js
│   │   └── __tests__/        # Jest tests
│   ├── package.json
│   └── .env.example          # Environment variables template
├── admin/                    # React + Vite admin dashboard
│   ├── src/
│   ├── dist/                 # Built output
│   └── package.json
├── customer-app/             # React Native (Expo) customer app
│   ├── src/
│   │   └── services/api.js   # API client (points to boda.ocaya.space)
│   ├── app.json              # Expo config
│   ├── eas.json              # EAS build config
│   └── package.json
├── rider-app/                # React Native (Expo) rider app
│   ├── src/
│   │   ├── services/api.js   # API client (points to boda.ocaya.space)
│   │   ├── hooks/            # useLocationTracking.js
│   │   └── context/          # AuthContext.js
│   ├── app.json              # Expo config
│   ├── eas.json              # EAS build config
│   └── package.json
├── deploy/                   # Deployment scripts and docs
│   ├── DEPLOYMENT.md         # Full deployment guide
│   └── *.sh, *.sql, *.nginx  # Deployment artifacts
├── docker-compose.yml        # PostgreSQL 15 + Redis 7
└── Boda_Technical_Documentation.md  # Full technical spec
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Node.js + Fastify v5 |
| Database | PostgreSQL 15 (Docker) |
| Cache / Realtime | Redis 7 (Docker) + Socket.io |
| Auth | JWT (access + refresh tokens), phone OTP |
| Admin Dashboard | React 19 + Vite + Tailwind CSS |
| Mobile Apps | React Native (Expo SDK 56) |
| Build / Deploy | EAS Build (mobile), systemd + nginx (server) |

## API Base URL

- **Production**: `https://boda.ocaya.space`
- **Local dev**: `http://localhost:3000`

## Key API Endpoints

### Auth
- `POST /auth/send-otp` — Send OTP to phone (Ugandan format: `256XXXXXXXXX`)
- `POST /auth/verify-otp` — Verify OTP, returns JWT + user
- `POST /auth/refresh` — Refresh access token

### Riders
- `POST /riders/register` — Register as rider
- `GET /riders/nearby` — Get nearby riders (auth required)
- `PATCH /riders/:id/location` — Update GPS location
- `PATCH /riders/:id/online` — Toggle online status

### Bookings
- `POST /bookings` — Create ride/delivery booking
- `GET /bookings/:id` — Get booking details
- `PATCH /bookings/:id/accept` — Rider accepts
- `PATCH /bookings/:id/complete` — Complete booking
- `POST /bookings/:id/rate` — Rate after trip

### Admin (requires `admin` role)
- `GET /admin/dashboard` — Dashboard stats
- `GET /admin/riders/pending` — Pending rider applications
- `PATCH /admin/riders/:id/verify` — Approve rider
- `PATCH /admin/riders/:id/suspend` — Suspend rider

## Environment Variables

See `backend/.env.example` for the full list. Key ones:

```env
DATABASE_URL=postgresql://boda:boda123@localhost:5432/boda
REDIS_URL=redis://localhost:6379
JWT_SECRET=<random-secret>
JWT_REFRESH_SECRET=<random-secret>
```

## Common Commands

### Backend (on VPS)
```bash
# Service management
systemctl status boda-api
systemctl restart boda-api
journalctl -u boda-api -f          # live logs

# Database
docker exec boda-postgres psql -U boda -d boda   # connect to DB
```

### Mobile App Builds (on PC)
```powershell
$env:EXPO_TOKEN = "<token>"
$env:EAS_NO_VCS = "1"

cd D:\code\customer-app
cmd /c eas.cmd build -p android --profile preview --non-interactive

cd D:\code\rider-app
cmd /c eas.cmd build -p android --profile preview --non-interactive
```

### Admin Dashboard (on PC)
```powershell
cd D:\code\admin
cmd /c "npx vite build"
```

## Build Profiles (EAS)

| Profile | Output | Use |
|---------|--------|-----|
| `preview` | APK | Direct install on Android |
| `production` | AAB | Play Store submission |
| `development` | APK | Dev builds with debugger |

## Important Notes

### Phone Number Format
All phone numbers use Ugandan format: `256XXXXXXXXX` (12 digits, starts with 256).

### OTP is in Dev Mode
Currently, OTP codes are logged to the server console (`journalctl -u boda-api -f`) instead of being sent via SMS. Africa's Talking integration is pending.

### Admin Role
To make a user an admin:
1. User must exist in `users` table
2. Insert into `admins` table: `INSERT INTO admins (user_id, is_active) VALUES ('<user-uuid>', true);`
3. User must log out and back in to get a new JWT with `admin` role

### Node Version Compatibility
- **VPS**: Node.js 20 (works with npm 10)
- **Local PC**: Node.js 24 has an npm 11 bug with `caniuse-lite` version parsing. If `npm install` fails with `Invalid Version:`, generate `package-lock.json` on the VPS and copy it to the PC, or use Node.js 20 via nvm.

### Git Not Required
EAS builds use `EAS_NO_VCS=1` since the project is not in a git repository.

## Deployment

See `deploy/DEPLOYMENT.md` for the full deployment guide including:
- VPS setup (Docker, Node.js, nginx)
- Backend deployment (systemd service)
- Admin dashboard deployment (nginx static files)
- SSL certificates (Let's Encrypt / certbot)
- Mobile app builds (EAS Build)

## Custom Setup — What We Did

### VPS Details
- **IP**: `212.47.72.186`
- **OS**: Ubuntu (Debian-based)
- **User**: root
- **SSH Key**: `~/.ssh/id_rsa` (generated locally)
- **Docker**: v29.5.3
- **Docker Compose**: v5.1.4 (plugin)
- **Node.js**: v20.20.2
- **Nginx**: v1.24.0 (with SSL via Let's Encrypt)

### What Was Deployed on VPS
| Service | Port | Status |
|---------|------|--------|
| boda-api (Node.js) | 3000 | systemd managed |
| PostgreSQL 15 (Docker) | 5432 | auto-restart |
| Redis 7 (Docker) | 6379 | auto-restart |
| Nginx (reverse proxy) | 80/443 | SSL for all subdomains |

### Live URLs
| URL | What |
|-----|------|
| `https://boda.ocaya.space` | Backend API (reverse proxy to :3000) |
| `https://admin.ocaya.space` | Admin Dashboard (static files) |
| `http://212.47.72.186:3000/health` | Direct API health check |

### Files on VPS
| Path | Description |
|------|-------------|
| `/root/boda/` | Project root |
| `/root/boda/backend/` | Backend Node.js app |
| `/root/boda/backend/.env` | Environment variables (secrets) |
| `/root/boda/backend/src/` | Source code |
| `/root/boda/docker-compose.yml` | Docker config for Postgres + Redis |
| `/var/www/boda-admin/` | Admin dashboard build files |
| `/etc/systemd/system/boda-api.service` | Systemd service file |
| `/etc/nginx/sites-enabled/boda` | Nginx config — API reverse proxy |
| `/etc/nginx/sites-enabled/boda-admin` | Nginx config — Admin dashboard |

### Commands to SSH into VPS
```bash
# From PowerShell (use cmd /c if SSH not in PATH)
ssh -i ~/.ssh/id_rsa root@212.47.72.186
```

### Transferring Files to VPS
```powershell
# Transfer a single file
scp -i "$env:USERPROFILE\.ssh\id_rsa" "D:\code\backend\src\server.js" root@212.47.72.186:/root/boda/backend/src/server.js

# Transfer a directory (excluding node_modules)
scp -i "$env:USERPROFILE\.ssh\id_rsa" -r "D:\code\admin\dist\*" root@212.47.72.186:/var/www/boda-admin/
```

### Bugs We Fixed

#### 1. Redis "Socket already opened" (server.js)
The original `server.js` called `connectRedis()` and then tried to connect `pubClient` (the same object) again. Fix: removed the redundant `connectRedis()` call.

#### 2. Admin Role Missing (auth.js + admins table)
The `admins` table was missing from the database schema, and the auth code hardcoded `role: 'customer'` in JWTs. Fix:
- Created `admins` table on VPS
- Updated `auth.js` to check `admins` table and issue correct role in JWT

#### 3. PostGIS Extension Missing
The schema requires PostGIS but the Docker PostgreSQL image doesn't include it. Tables were created successfully without it. Not critical for MVP — used for future geo queries.

#### 4. Native PostgreSQL Port Conflict
Port 5432 was occupied by a pre-installed PostgreSQL. Fix: disabled native PostgreSQL (`systemctl disable postgresql`), used Docker PostgreSQL instead.

### Expo / EAS Build Details

#### Expo Account
- **Username**: qaphael
- **Expo Token**: stored in `D:\code\expo-token.txt` (delete after use)

#### Expo Projects
| App | Project ID | Dashboard |
|-----|-----------|-----------|
| Boda (Customer) | `7ead97ed-1081-4bed-afe3-2447e9deab06` | https://expo.dev/accounts/qaphael/projects/boda-customer |
| Boda Rider | `015496c8-ca9b-4291-825e-37d3473087d0` | https://expo.dev/accounts/qaphael/projects/boda-rider |

#### Build Commands (reference)
```powershell
$env:EXPO_TOKEN = "<token>"
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

# Check build status
cmd /c eas.cmd build:list --limit 1 --json
```

#### Rider App Build Issues (and fixes)
1. **`@testing-library/react-hooks` peer dep conflict** — required React 16/17 but project uses React 19. Fix: removed it, updated imports to use `@testing-library/react-native`.
2. **`package-lock.json` out of sync** — EAS runs `npm ci` which requires lock file match. Fix: regenerated lock file on VPS (Node 20, npm 10).
3. **npm 11 `Invalid Version` bug** — Node 24's npm 11 has a `caniuse-lite` version parsing bug. Fix: generate lock file on VPS, copy `node_modules` from customer-app.

### Other Services on VPS (not ours)
The VPS hosts other projects too. Do not touch these:
- `aitoolkit.service` — AI Toolkit Flask app
- `chatai.service` — ChatAI system
- `landverify-backend.service` — LandVerify Uganda API
- `passport-app.service` — Passport Photo App
- `vani-agent.service` — Vani Voice Agent
- Multiple webhook services

---

## How to Interact with This Codebase

### Starting Point
When joining this project, first read this file (`AGENTS.md`) and `deploy/DEPLOYMENT.md`. The backend is already live at `https://boda.ocaya.space`. The admin dashboard is live at `https://admin.ocaya.space`. The customer app APK is built and downloadable from Expo. The rider app APK build is pending (see Current Challenges below).

### Making Backend Changes
1. Edit files in `D:\code\backend\src\`
2. Transfer changed files to VPS: `scp -i "$env:USERPROFILE\.ssh\id_rsa" <file> root@212.47.72.186:/root/boda/backend/src/`
3. Restart the service on VPS: `ssh -i "$env:USERPROFILE\.ssh\id_rsa" root@212.47.72.186 "systemctl restart boda-api"`
4. Verify: `curl https://boda.ocaya.space/health`

### Making Admin Dashboard Changes
1. Edit files in `D:\code\admin\src\`
2. Set API URL: ensure `admin/.env` has `VITE_API_URL=https://boda.ocaya.space`
3. Build: `cd D:\code\admin && cmd /c "npx vite build"`
4. Transfer: `scp -i "$env:USERPROFILE\.ssh\id_rsa" -r "D:\code\admin\dist\*" root@212.47.72.186:/var/www/boda-admin/`

### Making Mobile App Changes
1. Edit files in `customer-app/src/` or `rider-app/src/`
2. API URL is already set to `https://boda.ocaya.space` in `src/services/api.js`
3. Build APK:
   ```powershell
   $env:EXPO_TOKEN = "see expo-token.txt or ask user"
   $env:EAS_NO_VCS = "1"
   cd D:\code\customer-app
   cmd /c eas.cmd build -p android --profile preview --non-interactive
   ```

### Testing the API
The OTP is in dev mode. To test login:
1. Send OTP request to `https://boda.ocaya.space/auth/send-otp` with phone in format `256XXXXXXXXX`
2. Check server logs for OTP: `ssh -i "$env:USERPROFILE\.ssh\id_rsa" root@212.47.72.186 "journalctl -u boda-api -f"`
3. Verify OTP with the code from logs

### Accessing the Database
```bash
ssh -i ~/.ssh/id_rsa root@212.47.72.186
docker exec -it boda-postgres psql -U boda -d boda
```

### Key Tables
- `users` — customer accounts (phone, name, is_active)
- `riders` — rider profiles (linked to users, has status, location, plate_number)
- `bookings` — ride/delivery requests (customer_id, rider_id, status, fares)
- `payments` — escrow payments (amount, method: mtn/airtel/cash, status)
- `ratings` — trip ratings (score 1-5, comment)
- `admins` — admin users (user_id, is_active)

---

## Current Challenges

### 1. Rider App APK Build (BLOCKED)
The rider app (`D:\code\rider-app\`) cannot build an APK via EAS. The root cause: **Node.js 24 on the local PC ships npm 11, which has a `caniuse-lite` version parsing bug** that breaks `npm install`, `npm ci`, and even `npm install --force`. This prevents:
- Generating a valid `package-lock.json` locally
- Installing `node_modules` locally (needed by EAS CLI for plugin resolution)

**What works**: The customer app builds fine because it has fewer dependencies and its lock file was generated on the VPS (Node 20, npm 10) before the local npm broke.

**Fix options (pick one):**
1. **Install Node.js 20 via nvm** on the PC and use it for `npm install` in the rider-app directory
2. **Generate lock file on VPS** and copy it back, then copy `node_modules` from customer-app and install rider-specific extras (`expo-camera`, `expo-image-picker`, `expo-notifications`, `react-native-maps`)
3. **Upgrade the PC to Node.js 22** (not 24) which has npm 10 and doesn't have this bug

### 2. OTP SMS Not Sending
OTP codes are logged to console only. Africa's Talking SMS integration is not yet implemented. For now, check logs with:
```bash
ssh -i ~/.ssh/id_rsa root@212.47.72.186 "journalctl -u boda-api -f"
```

### 3. PostGIS Extension Missing
The database schema references PostGIS for geo queries but the Docker PostgreSQL image doesn't include it. Tables were created without it. Not critical for MVP but needed for future proximity-based rider matching.

### 4. No Payment Integration Yet
The `.env` has placeholder keys for MTN MoMo, Airtel Money, and Africa's Talking. These need real credentials before payments and SMS work in production.

### 5. No Real-Time Rider Tracking
Socket.io is set up and working, but the rider app needs to send location updates continuously. The `useLocationTracking` hook exists but needs testing end-to-end with a real device.
