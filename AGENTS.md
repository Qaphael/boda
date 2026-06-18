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
│   │   ├── routes/           # auth.js, riders.js, bookings.js, admin.js, support.js, settings.js
│   │   ├── middleware/        # auth.js (JWT + role checking)
│   │   ├── services/         # paymentService.js
│   │   └── __tests__/        # Jest tests
│   ├── package.json
│   └── .env.example          # Environment variables template
├── admin/                    # React + Vite admin dashboard
│   ├── src/
│   │   ├── components/       # Layout.jsx (responsive sidebar)
│   │   ├── pages/            # Login, Dashboard, Riders, Bookings, Payments, Settings, Support
│   │   ├── context/          # AuthContext.jsx
│   │   └── services/         # api.js (all admin API calls)
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
- `GET /admin/dashboard` — Dashboard stats (riders, bookings, payments, users)
- `GET /admin/riders/pending` — Pending rider applications
- `GET /admin/riders/:id` — Rider details + trips + ratings
- `PATCH /admin/riders/:id/verify` — Approve/reject rider
- `PATCH /admin/riders/:id/suspend` — Suspend rider
- `PATCH /admin/riders/:id/reinstate` — Reinstate suspended rider
- `GET /admin/bookings` — All bookings (filterable by status, type)
- `GET /admin/bookings/:id` — Booking details + payments + ratings
- `GET /admin/payments` — All payments (filterable by status)
- `POST /admin/payments/:id/release` — Release held payment
- `POST /admin/payments/:id/flag` — Flag suspicious payment
- `GET /admin/support/tickets` — Support tickets (filterable by status, priority)
- `GET /admin/support/tickets/:id` — Ticket details + messages
- `POST /admin/support/tickets` — Create new ticket
- `PATCH /admin/support/tickets/:id/status` — Update ticket status
- `POST /admin/support/tickets/:id/messages` — Add reply/note to ticket
- `GET /admin/settings` — Get all admin settings (grouped by category)
- `PUT /admin/settings` — Update settings
- `GET /admin/profile` — Get admin profile
- `PUT /admin/profile` — Update admin profile

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
- `support_tickets` — support tickets (subject, description, priority, category, status, user_id, rider_id)
- `ticket_messages` — ticket conversation messages (ticket_id, admin_id, message, type)
- `admin_settings` — platform settings (key, value, category)
- `rider_rejections` — rejection audit trail
- `rider_suspensions` — suspension audit trail
- `payment_flags` — payment flag audit trail

---

## Admin Dashboard Design System

### Stack
- React 19 + Vite + **Tailwind CSS v4** (uses `@theme` in CSS, NOT `tailwind.config.js`)
- PostCSS via `@tailwindcss/postcss`
- React Router DOM v7
- Axios for API calls

### Design Tokens (in `src/index.css` via `@theme`)
- **Primary**: `#0050cb` (Hyper Blue)
- **Surface**: `#fbf8ff` (slightly off-white)
- **Font**: Geist (from jsdelivr CDN), JetBrains Mono for IDs/currency
- **Icons**: Material Symbols Outlined (Google Fonts)
- **Radius**: 2px (sm), 4px (lg), 8px (xl), 12px (full)
- **Spacing**: 4px base unit

### Tailwind v4 Configuration
**IMPORTANT**: This project uses Tailwind CSS v4 which configures themes in CSS, not in `tailwind.config.js`. The `tailwind.config.js` file has NO effect. All custom colors must be defined in `src/index.css` using the `@theme` block:

```css
@import "tailwindcss";

@theme {
  --color-primary: #0050cb;
  --color-surface: #fbf8ff;
  /* ... all custom colors ... */
}
```

### Typography Classes (defined in `src/index.css`)
Custom typography is defined as plain CSS classes to avoid conflicts with Tailwind's `text-{color}` utilities:
- `.text-display` — 24px / 32px / weight 600
- `.text-headline-sm` — 18px / 24px / weight 600
- `.text-body-lg` — 14px / 20px
- `.text-body-md` — 13px / 18px
- `.text-body-sm` — 12px / 16px
- `.text-label-md` — 12px / 16px / weight 500 / letter-spacing 0.02em
- `.text-label-xs` — 11px / 14px / weight 500

### Responsive Breakpoints
- `sm:` — 640px (mobile landscape)
- `md:` — 768px (tablet)
- `lg:` — 1024px (desktop)
- Sidebar: fixed on desktop (`lg:static`), slides in on mobile with overlay
- Detail panels: full-screen overlay on mobile, side panel on desktop (`lg:static`)
- Tables: horizontal scroll on mobile

### Pages
| Page | Route | Features |
|------|-------|----------|
| Login | `/login` | Phone OTP, 6-digit auto-tab inputs |
| Dashboard | `/` | 8 stat cards, revenue chart, fleet map, quick actions, rider table |
| Riders | `/riders` | Filter tabs, table, slide-in detail panel (approve/reject) |
| Bookings | `/bookings` | Split layout, filterable table, detail panel (pickup/dropoff, rider, payment) |
| Payments | `/payments` | Stats row, filter tabs, table, flag/release modals |
| Settings | `/settings` | Secondary nav, profile, system config, notifications, security, regional |
| Support | `/support` | Stats, ticket queue, conversation thread, knowledge base |

### Admin Login Credentials
- Phone: `256772100001` (David Okello)
- OTP: check server logs (`journalctl -u boda-api -f`)

### Seeded Data
- 15 users, 12 riders (7 verified, 3 pending, 1 suspended), 20 bookings, 17 payments, 14 ratings, 8 support tickets, 6 notifications, 8 support ticket messages

---

## Security Audit (Completed June 2026)

Full audit report at `D:\code\deploy\SECURITY_AUDIT.md`. All 17 vulnerabilities fixed:

| Priority | Fixed | Key Changes |
|----------|-------|-------------|
| CRITICAL | 1 | Fare manipulation — server calculates fare, ignores client input |
| HIGH | 5 | WebSocket auth, refresh token role fix, CORS whitelist, Redis password, booking ownership |
| MEDIUM | 9 | OTP IP rate limiting, verify-otp rate limiting, session invalidation on logout, JWT secret enforcement, rider location spoofing fix, socket room auth, payment validation |
| LOW | 3 | File upload validation (JPEG/PNG/WebP, 5MB max), generic error messages, soft delete for riders |

### Key Security Changes
- **Redis password**: `boda_redis_2026!` (in `/root/boda/backend/.env`)
- **CORS whitelist**: Only `admin.ocaya.space`, `localhost:5173`, `localhost:3000`
- **JWT secret**: Must be >= 32 characters, server won't start without it
- **Rate limits**: 10 OTP requests per IP, 5 verify attempts per phone
- **Soft delete**: `riders.is_deleted` column, all queries filter `is_deleted = false`
- **Logout**: `POST /auth/logout` invalidates Redis session

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

---

## Mistakes Made & Lessons Learned (June 2026)

**Read this section before making ANY changes. These are real bugs that broke the system in production.**

### 1. Tailwind CSS v4 — `tailwind.config.js` Does Nothing
**Mistake**: Wrote custom colors in `tailwind.config.js` and expected them to work. All pages rendered with no styling.

**Root cause**: This project uses **Tailwind CSS v4** (`@tailwindcss/postcss`), which configures themes in CSS via `@theme`, not in `tailwind.config.js`. The JS config file is completely ignored.

**Fix**: All custom colors MUST be defined in `src/index.css`:
```css
@import "tailwindcss";
@theme {
  --color-primary: #0050cb;
  --color-surface: #fbf8ff;
  /* ... */
}
```

**Rule**: Before writing any Tailwind config, check which version is installed. V4 = CSS config. V3 = JS config.

### 2. Font CDN URLs Must Be Correct
**Mistake**: Used `cdn.jsdelivr.net/font/geist/Geist-Regular.woff2` — all fonts 404'd.

**Fix**: Use `cdn.jsdelivr.net/npm/geist@1.3.0/dist/fonts/geist-sans/Geist-Regular.woff2`

**Rule**: Always test CDN URLs in browser before hardcoding them.

### 3. CORS Must Allow All HTTP Methods
**Mistake**: Used `@fastify/cors` with `{ origin: true }` — PATCH and DELETE requests were blocked by browsers.

**Fix**:
```js
await fastify.register(cors, {
  origin: ['https://admin.ocaya.space', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

**Rule**: Always list all HTTP methods explicitly. Never use `origin: true` in production — whitelist specific domains.

### 4. PostgreSQL Type Inference Fails with CASE Expressions
**Mistake**: SQL query `CASE WHEN $1 = 'resolved' THEN NOW() ELSE resolved_at END` caused `500 error: inconsistent types deduced for parameter $1`.

**Fix**: Cast parameters explicitly: `$1::varchar = 'resolved'`

**Rule**: When using `$1` in both SET and CASE WHEN in the same query, always cast with `::varchar` or `::text`.

### 5. Fare Calculation Must Be Server-Side Only
**Mistake**: `completeBooking` accepted `fare_final` from the request body. A rider could set fare to 0 or 1,000,000.

**Fix**: Always use server-calculated fare:
```js
const finalFare = booking.rows[0].fare_estimate; // Never trust client input
```

**Rule**: ANY financial calculation (fares, payments, splits) must be done server-side. Client values are untrusted.

### 6. Never Use `req.params` for Authenticated Resources
**Mistake**: `updateLocation` used `req.params.riderId` — any rider could update another rider's location.

**Fix**: Use `req.user.riderId` from the JWT:
```js
const riderId = req.user.riderId; // From JWT, not params
```

**Rule**: For resource ownership, always use the authenticated user's ID from the JWT, never from URL params.

### 7. Refresh Token Must Re-derive Role from Database
**Mistake**: `refreshAccessToken` hardcoded `role: 'customer'`. Admins got demoted on refresh.

**Fix**: Look up role from database:
```js
const adminCheck = await pool.query('SELECT id FROM admins WHERE user_id = $1 AND is_active = true', [decoded.userId]);
const role = adminCheck.rows.length > 0 ? 'admin' : 'customer';
```

**Rule**: Role must be re-verified from DB on every token refresh. Never hardcode roles.

### 8. Sessions Must Be Invalidated on Logout
**Mistake**: Logout only cleared localStorage. The refresh token in Redis remained valid for 7 days.

**Fix**: Added `POST /auth/logout` that deletes the Redis session key.

**Rule**: Always provide a logout endpoint that invalidates server-side sessions.

### 9. WebSocket Connections Need Authentication
**Mistake**: Socket.io had no auth — anyone could connect, spoof rider locations, or track any booking.

**Fix**: Added JWT verification middleware on Socket.io connection:
```js
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  socket.userId = decoded.userId;
  next();
});
```

**Rule**: ALL WebSocket connections must authenticate. Never allow anonymous socket connections.

### 10. Hardcoded Data in Dashboard
**Mistake**: Dashboard had hardcoded rider names, ticket counts, stats. Data never matched reality.

**Fix**: All data comes from API calls:
```js
const [dashRes, ridersRes, ticketsRes] = await Promise.all([
  adminAPI.getDashboard(),
  adminAPI.getPendingRiders({ limit: 50 }),
  adminAPI.getTickets({ limit: 1 }),
]);
```

**Rule**: NEVER hardcode data in UI. Always fetch from API. If API doesn't have the data, build the endpoint first.

### 11. Every Button Must Have an onClick
**Mistake**: 13 buttons across 4 pages had no onClick handlers — they looked clickable but did nothing.

**Fix**: Every `<button>` must have an onClick. Dead buttons destroy user trust. If a feature isn't built yet, don't show the button.

**Rule**: After building any page, grep for `<button` and verify every one has an onClick.

### 12. Use Modals/Panels, Not `alert()`
**Mistake**: Used `alert()` to display payment details and rider info. Looks unprofessional.

**Fix**: Created proper modal components matching the design system.

**Rule**: Never use `alert()` or `confirm()` in production UI. Use styled modals.

### 13. Soft Delete > Hard Delete
**Mistake**: `DELETE FROM riders` permanently destroyed data with no recovery.

**Fix**: Added `is_deleted` boolean column. All queries filter `WHERE is_deleted = false`.

**Rule**: Use soft delete for any user-generated data. Add audit trail tables for compliance.

### 14. Rate Limit on Every Auth Endpoint
**Mistake**: Only `/send-otp` had rate limiting. `/verify-otp` had none — unlimited brute force.

**Fix**: Added per-phone and per-IP rate limiting on both endpoints.

**Rule**: Rate limit ALL authentication endpoints, not just the first one.

### 15. Generic Error Messages
**Mistake**: Errors like "No OTP found. Request a new one." confirmed phone numbers exist.

**Fix**: Changed to "Invalid or expired OTP" — same message for both cases.

**Rule**: Auth error messages must never confirm whether a resource (user, phone, email) exists.

### 16. File Upload Validation Is Mandatory
**Mistake**: Rider photos accepted any content — no type, size, or format check.

**Fix**: Added validation for JPEG/PNG/WebP, 5MB max, data URI or URL format.

**Rule**: Validate ALL file uploads: type, size, format. Never store raw user input.

### 17. Redis Needs Authentication
**Mistake**: Redis had no password. If VPS is compromised, all sessions/OTPs exposed.

**Fix**: Set `requirepass` in Redis config, updated connection string with password.

**Rule**: Every service (Redis, PostgreSQL, etc.) must have authentication enabled.

### 18. JWT Secrets Must Be Strong
**Mistake**: No minimum length enforced. Weak secrets = forged tokens.

**Fix**: Server won't start if `JWT_SECRET` < 32 characters.

**Rule**: Enforce minimum secret length at startup. Log a warning if using defaults.

### 19. CORS Origins Must Be Whitelisted
**Mistake**: `origin: true` reflected any requesting origin — effectively allowing all domains.

**Fix**: Explicit whitelist: `['https://admin.ocaya.space', 'http://localhost:5173']`

**Rule**: Never use `origin: true` in production. Always whitelist specific domains.

### 20. Session Invalidation Needs Backend Endpoint
**Mistake**: Frontend logout only cleared localStorage. Backend session in Redis stayed valid.

**Fix**: Added `POST /auth/logout` endpoint that deletes Redis session key.

**Rule**: Logout must always call a backend endpoint to invalidate the session server-side.

---

## Agent Workflow Checklist

When making changes to this project, follow this order:

### Before Starting
1. Read this AGENTS.md file completely
2. Check which Tailwind version is in use (v4 = CSS config)
3. Check the backend server.js for existing routes
4. Check the frontend api.js for existing API methods

### When Building Backend
1. Add route to the appropriate routes file
2. Export the handler in module.exports
3. Register the route in server.js with proper auth middleware
4. Use parameterized queries (`$1`, `$2`) — NEVER string concatenation
5. Cast types explicitly when using CASE expressions
6. Add rate limiting on auth endpoints
7. Use soft delete for user data
8. Add audit trail for sensitive actions

### When Building Frontend
1. Add API method to `src/services/api.js`
2. Import `adminAPI` or `authAPI` in the page component
3. Every `<button>` MUST have an onClick
4. Never use `alert()` — use styled modals
5. Never hardcode data — fetch from API
6. Make responsive: sidebar toggle on mobile, full-screen overlays for panels
7. After building, grep for dead buttons: `grep -n "<button" src/pages/*.jsx`

### When Deploying
1. Build frontend: `cd D:\code\admin && cmd /c "npx vite build"`
2. Deploy frontend: `scp -r dist/* root@212.47.72.186:/var/www/boda-admin/`
3. Deploy backend: `scp backend files root@212.47.72.186:/root/boda/backend/src/`
4. Restart backend: `ssh root@212.47.72.186 "systemctl restart boda-api"`
5. Verify: `Invoke-WebRequest -Uri "https://boda.ocaya.space/health"`
6. Hard refresh browser: `Ctrl+Shift+R`

### Security Checklist
Before any deploy, verify:
- [ ] No `alert()` or `console.log` with sensitive data
- [ ] All endpoints have auth middleware
- [ ] All financial calculations are server-side
- [ ] CORS is whitelisted (not `origin: true`)
- [ ] JWT secrets are >= 32 characters
- [ ] Redis has password
- [ ] SQL uses parameterized queries
- [ ] File uploads are validated
- [ ] Error messages don't leak internals
