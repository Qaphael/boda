# AGENTS.md — Boda Project

## What Is This

Boda is a rides and delivery platform for Gulu, Uganda. Customers book boda boda (motorcycle) riders for rides and deliveries. Payments via MTN/Airtel MoMo escrow.

## Architecture

```
Customer App (React Native/Expo)  ─┐
Rider App (React Native/Expo)     ─┼── HTTPS + WebSocket ──→ Backend API (Fastify) ──→ PostgreSQL (Docker)
Admin Dashboard (React/Vite)       ─┘                                    └→ Redis (Docker)
```

## Directory Structure

```
D:\code\
├── backend/src/           # Fastify API (server.js is entry, routes/ has handlers)
├── admin/src/             # React admin dashboard
├── customer-app/src/      # React Native customer app
├── rider-app/src/         # React Native rider app
├── deploy/                # Deployment scripts and DEPLOYMENT.md
└── docker-compose.yml     # PostgreSQL 15 + Redis 7
```

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/server.js` | Route registration, Socket.io setup |
| `backend/src/routes/*.js` | API handlers (auth, bookings, riders, admin, profile, support, settings, notifications) |
| `backend/src/middleware/auth.js` | JWT verification + role checking |
| `backend/src/schema.sql` | Database schema |
| `backend/src/migrations/` | SQL migration files |
| `customer-app/src/services/api.js` | All API methods for customer app |
| `rider-app/src/services/api.js` | All API methods for rider app |
| `admin/src/services/api.js` | All API methods for admin dashboard |

## Tech Stack

- **Backend**: Node.js + Fastify v5, JWT auth (access + refresh tokens)
- **Database**: PostgreSQL 15 + PostGIS (Docker), Redis 7 for sessions/cache
- **Mobile**: React Native (Expo SDK 56), React Navigation v7
- **Admin**: React 19 + Vite + Tailwind CSS v4
- **Realtime**: Socket.io (rider location tracking, booking status)
- **Maps**: Leaflet + OpenStreetMap in WebView (not Google Maps in Expo Go)
- **Geocoding**: Nominatim (requires `User-Agent` header)
- **Routing**: OSRM public API for road distance/fare

## API Base URL

- Production: `https://boda.ocaya.space`
- Local: `http://localhost:3000`

## Common Commands

### Backend deploy (from PC)
```powershell
scp -i "$env:USERPROFILE\.ssh\id_rsa" <file> root@212.47.72.186:/root/boda/backend/src/<path>
ssh -i "$env:USERPROFILE\.ssh\id_rsa" root@212.47.72.186 "systemctl restart boda-api"
```

### Admin deploy
```powershell
cd D:\code\admin && cmd /c "npx vite build"
scp -i "$env:USERPROFILE\.ssh\id_rsa" -r "D:\code\admin\dist\*" root@212.47.72.186:/var/www/boda-admin/
```

### Mobile app dev
```powershell
cd D:\code\customer-app; npx expo start
```

### Mobile app build
```powershell
$env:EXPO_TOKEN = "<token>"; $env:EAS_NO_VCS = "1"
cd D:\code\customer-app; cmd /c eas.cmd build -p android --profile preview --non-interactive
```

### Database access
```bash
ssh -i ~/.ssh/id_rsa root@212.47.72.186
docker exec -it boda-postgres psql -U boda -d boda
```

### Run migrations
```bash
ssh -i ~/.ssh/id_rsa root@212.47.72.186
docker exec -i boda-postgres psql -U boda -d boda < /root/boda/backend/src/migrations/002_profile_features.sql
```

### Check API health
```powershell
Invoke-WebRequest -Uri "https://boda.ocaya.space/health"
```

### Live logs
```bash
ssh -i ~/.ssh/id_rsa root@212.47.72.186 "journalctl -u boda-api -f"
```

### Testing

**Backend (Jest):**
```bash
cd D:\code\backend
npm test              # Run all tests
npm run test:watch    # Watch mode
```

**Admin (Vitest):**
```bash
cd D:\code\admin
npm test              # Run all tests
npm run test:watch    # Watch mode
```

**Rider App (Vitest):**
```bash
cd D:\code\rider-app
npm test              # Run all tests
npm run test:watch    # Watch mode
```

**Customer App:**
```bash
cd D:\code\customer-app
npx expo start        # No test script configured
```

## VPS Details

- IP: `212.47.72.186`, user: `root`, SSH key: `~/.ssh/id_rsa`
- Services: boda-api (systemd, port 3000), PostgreSQL (Docker, 5432), Redis (Docker, 6379), Nginx (80/443)
- Live: `https://boda.ocaya.space` (API), `https://admin.ocaya.space` (admin dashboard)
- Other services on VPS (don't touch): aitoolkit, chatai, landverify-backend, passport-app, vagi-agent

## Database Tables

Core: `users`, `riders`, `bookings`, `payments`, `ratings`, `admins`
Support: `support_tickets`, `ticket_messages`, `admin_settings`
Audit: `rider_rejections`, `rider_suspensions`, `payment_flags`
Profile: `saved_places`, `payment_methods`, `referral_codes`, `referrals`, `emergency_contacts`, `user_settings`, `customer_notifications`

## Backend Routes (registered in server.js)

Auth: `POST /auth/send-otp`, `/auth/verify-otp`, `/auth/refresh`, `/auth/logout`
Riders: `POST /riders/register`, `GET /riders/nearby`, `PATCH /riders/:riderId/location`, `/riders/:riderId/online`, `GET /riders/:id/profile`, `GET /riders/:riderId/earnings`
Bookings: `POST /bookings`, `GET /bookings/:id`, `GET /bookings/my/customer`, `GET /bookings/my/rider`, `PATCH /bookings/:id/accept`, `POST /bookings/:id/request-rider`, `PATCH /bookings/:id/start`, `PATCH /bookings/:id/complete`, `PATCH /bookings/:id/cancel`, `POST /bookings/:id/rate`, `POST /deliveries/:id/confirm`
Profile: `GET /profile/customer`, `PUT /profile/customer`, `GET|POST|PUT|DELETE /profile/saved-places`, `GET|POST|DELETE /profile/payment-methods`, `PATCH /profile/payment-methods/:id/default`, `GET /profile/referral`, `POST /profile/referral/apply`, `GET|POST|DELETE /profile/emergency-contacts`, `GET|PUT /profile/settings`, `GET /profile/notifications`, `PATCH /profile/notifications/:id/read`, `PATCH /profile/notifications/read-all`
Admin: `/admin/*` (dashboard, riders, bookings, payments, support, settings, profile, notifications)

## How Backend Changes Work

1. Edit file in `D:\code\backend\src\`
2. `scp` the changed file to VPS
3. `ssh` to restart: `systemctl restart boda-api`
4. Verify: `curl https://boda.ocaya.space/health`

## Phone Number Format

All numbers: `256XXXXXXXXX` (12 digits, Ugandan format).

## OTP Dev Mode

OTP codes are logged to server console, not sent via SMS. Check logs to get the code:
```bash
ssh -i ~/.ssh/id_rsa root@212.47.72.186 "journalctl -u boda-api -f"
```

## Making User Admin

```sql
INSERT INTO admins (user_id, is_active) VALUES ('<user-uuid>', true);
```
User must log out and back in for JWT to pick up the `admin` role.

## Node Version

- VPS: Node.js 20 (works fine)
- Local PC: Node.js 24 has npm 11 bug with `caniuse-lite`. If `npm install` fails with `Invalid Version:`, regenerate `package-lock.json` on VPS and copy it over.

## EAS Build

- Expo account: qaphael
- Expo token: `D:\code\expo-token.txt`
- Use `EAS_NO_VCS=1` (no git repo)
- Customer project ID: `7ead97ed-1081-4bed-afe3-2447e9deab06`
- Rider project ID: `015496c8-ca9b-4291-825e-37d3473087d0`

## Critical Rules (from production bugs)

### Backend
- **Parameterized queries only** — never string concatenation in SQL
- **Cast CASE params** — `$1::varchar` when using `$1` in both SET and CASE WHEN
- **Server-side fares** — never trust client-submitted fare values
- **Use JWT IDs** — `req.user.userId`/`req.user.riderId`, never `req.params` for ownership
- **Re-derive roles on refresh** — look up `admins` table, don't hardcode role
- **Handle empty PATCH bodies** — `const { x } = req.body || {}`
- **Rate limit all auth endpoints** — not just send-otp
- **Generic auth errors** — "Invalid or expired OTP" (never confirm if user exists)
- **Soft delete** — `is_deleted` column, filter in all queries
- **Logout invalidates session** — `POST /auth/logout` deletes Redis key
- **WebSocket auth required** — JWT verification on socket connection
- **CORS whitelist** — never `origin: true`, list specific domains
- **JWT secrets >= 32 chars** — server won't start without it
- **Redis password required** — `boda_redis_2026!`

### Frontend (Admin)
- **Tailwind v4** — config is in CSS `@theme`, not `tailwind.config.js`
- **Every button needs onClick** — grep for `<button` after building
- **No `alert()`** — use styled modals
- **No hardcoded data** — fetch from API

### Mobile Apps (React Native)
- **No `Alert.alert()`** — use `useModal` hook + `<AppModal>`
- **Every TouchableOpacity needs onPress** — grep after building
- **No hardcoded data** — fetch from API
- **No localhost URLs** — all point to `https://boda.ocaya.space`
- **Every stack screen needs back button** — except root tabs
- **WebView maps**: keep HTML source stable, use `injectJavaScript` for dynamic updates
- **Nominatim requires User-Agent**: `fetch(url, { headers: { 'User-Agent': 'BodaApp/1.0' } })`
- **OSRM polyline decoder** must be in WebView HTML
- **fitBounds with padding** for map centering when bottom sheets overlay
- **`useFocusEffect`** for screens that refresh on navigation back
- **Active booking 409** → show modal with View Active + Cancel It
- **Backend returns `data.bookingId`** not `data.booking?.id`
- **Run `npx expo-doctor`** after app.json changes (SDK 56 removed `splash` field)

## Security Audit

Completed June 2026. See `deploy/SECURITY_AUDIT.md`. 17 vulnerabilities fixed covering fare manipulation, WebSocket auth, CORS, Redis auth, rate limiting, session management, file uploads, and error message leakage.

---

## Lessons Learned (Production Bugs)

These are real bugs that broke production. Read before making changes.

### Backend

**1. Fare manipulation** — `completeBooking` accepted `fare_final` from request body. Rider could set fare to 0. Fix: always use server-calculated fare. Rule: ANY financial calculation must be server-side. Client values are untrusted.

**2. Location spoofing** — `updateLocation` used `req.params.riderId`. Any rider could update another rider's location. Fix: use `req.user.riderId` from JWT. Rule: for resource ownership, always use authenticated user's ID from JWT, never URL params.

**3. Role hardcoding on refresh** — `refreshAccessToken` hardcoded `role: 'customer'`. Admins got demoted on token refresh. Fix: look up `admins` table on every refresh. Rule: role must be re-verified from DB on every token refresh.

**4. PostgreSQL CASE type inference** — `CASE WHEN $1 = 'resolved'` caused `500 error: inconsistent types deduced for parameter $1`. Fix: cast with `$1::varchar`. Rule: when using `$1` in both SET and CASE WHEN, always cast explicitly.

**5. Empty PATCH body crash** — `cancelBooking` destructured `{ reason } = req.body` but PATCH sent empty body → crash. Fix: `const { reason } = req.body || {}`. Rule: all PATCH endpoints must handle empty/missing request bodies.

**6. WebSocket no auth** — Socket.io had no auth. Anyone could connect, spoof rider locations, track any booking. Fix: added JWT verification middleware on socket connection. Rule: ALL WebSocket connections must authenticate.

**7. Session not invalidated on logout** — Logout only cleared localStorage. Refresh token in Redis stayed valid for 7 days. Fix: `POST /auth/logout` deletes Redis session key. Rule: always provide logout endpoint that invalidates server-side sessions.

**8. CORS too permissive** — `origin: true` reflected any requesting origin. Fix: explicit whitelist `['https://admin.ocaya.space', 'http://localhost:5173']`. Rule: never use `origin: true` in production.

**9. Redis no password** — If VPS compromised, all sessions/OTPs exposed. Fix: set `requirepass` in Redis config. Rule: every service must have authentication.

**10. Weak JWT secrets** — No minimum length enforced. Fix: server won't start if `JWT_SECRET` < 32 chars. Rule: enforce minimum secret length at startup.

**11. Missing rate limiting** — Only `/send-otp` had rate limiting. `/verify-otp` had none — unlimited brute force. Fix: added per-phone and per-IP rate limiting on both. Rule: rate limit ALL auth endpoints.

**12. Error messages leak user existence** — "No OTP found. Request a new one." confirmed phone numbers exist. Fix: "Invalid or expired OTP" — same message for both cases. Rule: auth error messages must never confirm whether a resource exists.

**13. File upload no validation** — Rider photos accepted any content — no type, size, or format check. Fix: validate JPEG/PNG/WebP, 5MB max. Rule: validate ALL file uploads.

### Frontend (Admin)

**14. Hardcoded dashboard data** — Dashboard had hardcoded rider names, ticket counts, stats. Data never matched reality. Fix: all data from API calls. Rule: NEVER hardcode data in UI.

**15. Dead buttons** — 13 buttons across 4 pages had no onClick handlers. Fix: every button must have an onClick. Rule: after building any page, grep for `<button` and verify every one has an onClick.

**16. `alert()` usage** — Used `alert()` for payment details and rider info. Looks unprofessional. Rule: never use `alert()` or `confirm()` in production UI. Use styled modals.

**17. Soft delete vs hard delete** — `DELETE FROM riders` permanently destroyed data. Fix: added `is_deleted` boolean column. Rule: use soft delete for any user-generated data.

### Mobile Apps (React Native)

**18. `Alert.alert()` usage** — 42 calls across both mobile apps. Rule: NEVER use `Alert.alert()`. Always use `useModal` hook + `<AppModal>`.

**19. TouchableOpacity without onPress** — 21 TouchableOpacity elements across 5 screens had no onPress. Rule: after building any RN screen, grep for `<TouchableOpacity` and verify every one has an onPress.

**20. Wrong API method** — Called `bookingAPI.getNearby()` but `getNearby` is defined on `riderAPI`. Would crash. Rule: before calling any API method, verify it exists on the correct API object.

**21. Unreachable screens** — `DeliveryDetailsScreen` was registered in App.js but no screen navigated to it. Rule: after adding a screen, grep for `navigate('ScreenName')` to verify it's reachable.

**22. Missing back button** — `BookingDetailScreen` had no back button — users trapped. Rule: every stack screen (not root tab) must have a back button.

**23. Expo SDK 56 removed `splash`** — Kept `splash: { backgroundColor }` in app.json — schema validation failed. Rule: run `npx expo-doctor` after any app.json change.

**24. Socket URLs pointing to localhost** — `useLocationTracking.js` had `SOCKET_URL = 'http://localhost:3000'`. Rule: all hardcoded URLs in mobile apps must point to production. Never use localhost in shipped code.

**25. Orphaned components** — `BottomNav.jsx` created but never imported. Rule: after creating a component, verify it's imported by at least one file.

**26. OTP length mismatch** — Mobile apps had 4-digit OTP inputs but backend generated 6-digit codes. Users couldn't log in. Rule: always verify OTP length matches between frontend and backend.

**27. AppModal crash on undefined actions** — `AppModal` called `actions.map()` unconditionally. Modal visible=false still evaluates children. Fix: `(actions || []).map(...)`. Rule: always null-guard array operations in components that may receive undefined props.

**28. WebView reloads lose injectJavaScript** — Put dropoff coordinates in WebView `source={{ html }}`. Every change reloaded entire WebView, losing dynamic updates. Fix: keep HTML source stable, use `injectJavaScript` for dynamic data. Rule: never put frequently-changing state in WebView source HTML.

**29. Nominatim no User-Agent** — Nominatim fetch failed with JSON parse error. Returns HTML error page without User-Agent header. Fix: add `User-Agent: 'AppName/1.0'` to all Nominatim requests. Rule: always include User-Agent header for Nominatim.

**30. Active booking 409 not handled** — Backend returns 409 with `activeBookingId` when user has pending booking. Client showed generic error. Fix: parse `activeBookingId`, show modal with "View Active" and "Cancel It" options. Rule: when backend returns conflict errors with entity IDs, always give the user a path to resolve it.

**31. useFocusEffect needed** — HomeScreen used `useEffect` to load bookings — only ran on mount. After navigating back, stale data showed. Fix: use `useFocusEffect(useCallback(() => { loadData(); }, []))`. Rule: screens with data that can change while navigating away must use useFocusEffect.

**32. Fixed pixel positioning** — Used `bottom: 230` for floating action buttons. When bottom sheet grew/shrank, buttons overlapped. Fix: flex layout — map on top, buttons in bottom container. Rule: never use fixed pixel values for elements above variable-height content.

**33. Map centering behind bottom sheet** — `map.setView(lat, lng, zoom)` centered dead-center. User location hidden behind sheet. Fix: `fitBounds` with `paddingBottomRight` to offset above sheet. Rule: when screen has overlays, use fitBounds with padding.

**34. Ride and delivery mixed** — NewBookingScreen had both ride and delivery vehicle types. User could switch mid-flow. Fix: separate flows — "Request Ride" → NewBookingScreen, "Send Delivery" → DeliveryDetailsScreen. Rule: keep ride and delivery as completely separate flows.

**35. Cancel endpoint empty body** — Cancel API sent empty PATCH body. Backend crashed on `const { reason } = req.body`. Fix: `const { reason } = req.body || {}`. Rule: all PATCH endpoints must handle empty body.

**36. Saved places hardcoded** — Profile had hardcoded "Home", "Work", "Market" addresses. Fix: real saved_places table with Nominatim search. Rule: never hardcode location data.

**37. Wallet mock data** — WalletScreen had hardcoded balance, payment methods, transactions. Fix: real API calls to profile/payment endpoints. Rule: never hardcode financial data.

**38. Profile stats hardcoded** — Rating "4.92" and "128 rides" were hardcoded. Fix: real stats from bookings table via profile API. Rule: never hardcode user statistics.

**39. Missing payment methods in profile** — Profile showed "coming soon" for payment methods. Fix: full CRUD for MoMo numbers with default selection. Rule: if a feature exists in the backend, wire it up in the frontend.
