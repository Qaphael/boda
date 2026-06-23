# AGENTS.md — Boda Project

> Read this entire file before writing any code. Every rule here comes from a real
> production bug. Violating them breaks the live app used by real people in Gulu, Uganda.

---

## 1. What Is Boda

Ride-hailing and parcel delivery platform for Gulu, Uganda. Customers book boda boda
(motorcycle) riders for rides or deliveries. Payments via MTN/Airtel Mobile Money escrow.

**Target users:** Android phone users in Gulu. Budget devices, varying screen sizes,
gesture and button navigation bars, inconsistent font scaling.

---

## 2. Architecture

```
Customer App (React Native/Expo)  ─┐
Rider App    (React Native/Expo)  ─┼── HTTPS + WebSocket ──→ Fastify API ──→ PostgreSQL (Docker)
Admin Dashboard (React/Vite)      ─┘                                   └──→ Redis (Docker)
```

---

## 3. Directory Structure

```
D:\code\
├── backend/src/           # Fastify API (server.js = entry, routes/ = handlers)
├── admin/src/             # React + Vite admin dashboard
├── customer-app/src/      # React Native customer app
├── rider-app/src/         # React Native rider app
├── deploy/                # Deploy scripts + SECURITY_AUDIT.md
└── docker-compose.yml     # PostgreSQL 15 + Redis 7
```

---

## 4. Tech Stack

| Layer | Stack |
|---|---|
| Backend | Node.js 20 + Fastify v5, JWT (access + refresh tokens) |
| Database | PostgreSQL 15 + PostGIS (Docker), Redis 7 (sessions/cache/OTP) |
| Mobile | React Native, Expo SDK 56, React Navigation v7 |
| Admin | React 19 + Vite + Tailwind CSS v4 |
| Realtime | Socket.io (rider location, booking status) |
| Maps | Leaflet + OpenStreetMap in WebView (not Google Maps — incompatible with Expo Go) |
| Geocoding | Nominatim (MUST include `User-Agent: BodaApp/1.0` header on every request) |
| Routing | OSRM public API (road distance + fare calculation) |

---

## 5. Key Files

| File | Purpose |
|---|---|
| `backend/src/server.js` | Route registration, Socket.io setup |
| `backend/src/routes/*.js` | Handlers: auth, bookings, riders, admin, profile, support, settings, notifications |
| `backend/src/middleware/auth.js` | JWT verification + role checking |
| `backend/src/schema.sql` | Full database schema |
| `backend/src/migrations/` | SQL migration files (run in order) |
| `customer-app/src/services/api.js` | All customer API methods |
| `rider-app/src/services/api.js` | All rider API methods |
| `admin/src/services/api.js` | All admin API methods |

---

## 6. API Endpoints

**Base URLs**
- Production: `https://boda.ocaya.space`
- Local: `http://localhost:3000`
- Never use `localhost` in any mobile app code — always production URL.

**Auth:** `POST /auth/send-otp` `/auth/verify-otp` `/auth/refresh` `/auth/logout`

**Riders:** `POST /riders/register` · `GET /riders/nearby` · `PATCH /riders/:id/location` · `/riders/:id/online` · `GET /riders/:id/profile` · `GET /riders/:id/earnings`

**Bookings:** `POST /bookings` · `GET /bookings/:id` · `GET /bookings/my/customer` · `GET /bookings/my/rider` · `PATCH /bookings/:id/accept` · `POST /bookings/:id/request-rider` · `PATCH /bookings/:id/start` · `PATCH /bookings/:id/complete` · `PATCH /bookings/:id/cancel` · `POST /bookings/:id/rate` · `POST /deliveries/:id/confirm`

**Profile:** `GET|PUT /profile/customer` · `GET|POST|PUT|DELETE /profile/saved-places` · `GET|POST|DELETE /profile/payment-methods` · `PATCH /profile/payment-methods/:id/default` · `GET /profile/referral` · `POST /profile/referral/apply` · `GET|POST|DELETE /profile/emergency-contacts` · `GET|PUT /profile/settings` · `GET /profile/notifications` · `PATCH /profile/notifications/:id/read` · `PATCH /profile/notifications/read-all`

**Admin:** `/admin/*` (dashboard, riders, bookings, payments, support, settings, profile, notifications)

---

## 7. Database Tables

| Group | Tables |
|---|---|
| Core | `users` `riders` `bookings` `payments` `ratings` `admins` |
| Support | `support_tickets` `ticket_messages` `admin_settings` |
| Audit | `rider_rejections` `rider_suspensions` `payment_flags` |
| Profile | `saved_places` `payment_methods` `referral_codes` `referrals` `emergency_contacts` `user_settings` `customer_notifications` |

All user-generated data uses **soft delete** (`is_deleted` column). Filter it in every query.

---

## 8. UI & Layout Patterns

**These are mandatory. Read the full pattern files before building any screen.**

| Pattern File | Covers |
|---|---|
| `BODA_SHEET_MAP_PATTERNS.md` | Bottom sheets, map/WebView layout, keyboard handling, snap points, `BottomSheetTextInput` |
| `BODA_RESPONSIVE_NAVIGATION_PATTERNS.md` | Safe areas, status bar, navigation bar, back buttons, responsive sizing, Android keyboard modes |

### Non-negotiable UI rules

- **`@gorhom/bottom-sheet`** for all draggable sheets — not plain `View` with absolute positioning.
- **`BottomSheetTextInput`** for every input inside a sheet — never plain `TextInput`.
- **`keyboardBehavior="interactive"`** and **`android_keyboardInputMode="adjustResize"`** on every `BottomSheet`.
- **`useSafeAreaInsets()`** for all top/bottom positioning — never hardcoded pixel offsets like `top: 56` or `bottom: 230`.
- **`expo-status-bar`** only — never `StatusBar` from `react-native`.
- **Map screens:** `StatusBar translucent + absoluteFill WebView`, overlays positioned with `insets.top`.
- **`softwareKeyboardLayoutMode: "resize"`** in `app.json`.
- **Snap points as percentages** — never pixels.
- **Touch targets ≥ 44×44** with `hitSlop` where needed.
- **`maxFontSizeMultiplier`** set on all typography tokens in `theme.js`.
- **Responsive sizing** via `wp()`, `hp()`, `scale()`, `rs()` from `src/utils/responsive.js` — never hardcoded layout pixels.
- **`GestureHandlerRootView`** wraps the entire app root.
- **`SafeAreaProvider`** wraps inside `GestureHandlerRootView`.
- **Every `injectJavaScript` call must end with `; true;`**
- **Keep WebView `source={{ html }}` stable** — use `injectJavaScript` for all dynamic updates. Never put changing state in the HTML source.
- **`map.invalidateSize()`** must be called whenever the sheet changes snap point.
- **Separate ride and delivery flows** — `NewBookingScreen` (rides only) → `DeliveryDetailsScreen` (deliveries only). Never mix them.

---

## 9. Critical Rules by Layer

### 9.1 Backend

| Rule | Why |
|---|---|
| Parameterized queries only — never string concatenation in SQL | SQL injection |
| Cast CASE params: `$1::varchar` when `$1` appears in both SET and CASE WHEN | PostgreSQL type inference error (Bug #4) |
| Server-side fare calculation only — reject client-submitted fares | Fare manipulation (Bug #1) |
| Use `req.user.userId` / `req.user.riderId` from JWT — never `req.params` for ownership | Location spoofing (Bug #2) |
| Re-derive role from `admins` table on every token refresh — never hardcode | Role demotion on refresh (Bug #3) |
| All PATCH endpoints: `const { x } = req.body \|\| {}` | Empty body crash (Bug #5) |
| Rate limit ALL auth endpoints (per-phone + per-IP), not just send-otp | Brute force on verify-otp (Bug #11) |
| Auth error messages: "Invalid or expired OTP" — same for all cases | User existence leak (Bug #12) |
| WebSocket connections require JWT verification middleware | Unauthenticated socket (Bug #6) |
| Logout: `POST /auth/logout` must delete Redis session key | Session not invalidated (Bug #7) |
| CORS: explicit whitelist `['https://admin.ocaya.space', 'http://localhost:5173']` — never `origin: true` | Reflected origin (Bug #8) |
| Redis password required: `boda_redis_2026!` | Session exposure (Bug #9) |
| JWT secrets ≥ 32 chars — server.js must refuse to start without it | Weak secrets (Bug #10) |
| File uploads: validate JPEG/PNG/WebP, 5MB max | Arbitrary upload (Bug #13) |
| Soft delete only (`is_deleted = true`) — never `DELETE FROM` user data | Data destruction (Bug #17) |

### 9.2 Mobile Apps (React Native — applies to both customer-app and rider-app)

| Rule | Why |
|---|---|
| Never `Alert.alert()` — always `useModal` hook + `<AppModal>` | 42 Alert calls found in audit (Bug #18) |
| Every `<TouchableOpacity>` must have `onPress` — grep after building | 21 dead touchables found (Bug #19) |
| Before calling any API method, verify it exists on the correct API object (`bookingAPI` vs `riderAPI` etc.) | Wrong object crash (Bug #20) |
| After adding a screen, grep for `navigate('ScreenName')` to verify it's reachable | Orphaned screens (Bug #21) |
| Every stack screen (not root tab) must have a back button | Users trapped (Bug #22) |
| Run `npx expo-doctor` after any `app.json` change | SDK 56 schema errors (Bug #23) |
| Never `localhost` URLs in any mobile code — always `https://boda.ocaya.space` | Localhost in shipped app (Bug #24) |
| After creating a component, verify it's imported by at least one file | Orphaned components (Bug #25) |
| OTP input length must match backend (currently 6 digits) | Login failure (Bug #26) |
| Null-guard all array operations in components: `(actions \|\| []).map(...)` | AppModal crash (Bug #27) |
| Keep WebView HTML stable — use `injectJavaScript` for dynamic data | WebView reload loses state (Bug #28) |
| All Nominatim requests: `headers: { 'User-Agent': 'BodaApp/1.0' }` | HTML error instead of JSON (Bug #29) |
| Handle 409 from booking API: parse `activeBookingId`, show modal with "View Active" + "Cancel It" | Unresolvable conflict (Bug #30) |
| Screens with data that changes while navigating: use `useFocusEffect(useCallback(...))` | Stale data on back (Bug #31) |
| Never fixed pixel values for elements above variable-height content | Overlap when sheet grows (Bug #32) |
| When map has overlays: use `fitBounds` with `paddingBottomRight` offset, not `setView` | Location hidden behind sheet (Bug #33) |
| Never hardcode any data — fetch from API (locations, stats, balances, ratings, payment methods) | Bugs #36–#39 |
| OSRM polyline decoder must be included in WebView HTML | Routing broken without it |
| Backend returns `data.bookingId` not `data.booking?.id` | Field name mismatch |

### 9.3 Admin Dashboard (React/Vite)

| Rule | Why |
|---|---|
| Tailwind v4 config lives in CSS `@theme {}` — not `tailwind.config.js` | Config ignored silently |
| Every `<button>` must have `onClick` — grep after building | 13 dead buttons found (Bug #15) |
| Never `alert()` or `confirm()` — use styled modals | Unprofessional UX (Bug #16) |
| Never hardcode any data — all values from API calls | Fake dashboard data (Bug #14) |

---

## 10. Common Commands

### Backend deploy (from PC, PowerShell)
```powershell
scp -i "$env:USERPROFILE\.ssh\id_rsa" <file> root@212.47.72.186:/root/boda/backend/src/<path>
ssh -i "$env:USERPROFILE\.ssh\id_rsa" root@212.47.72.186 "systemctl restart boda-api"
```

### Admin deploy
```powershell
cd D:\code\admin && cmd /c "npx vite build"
scp -i "$env:USERPROFILE\.ssh\id_rsa" -r "D:\code\admin\dist\*" root@212.47.72.186:/var/www/boda-admin/
```

### Backend change workflow
1. Edit `D:\code\backend\src\<file>`
2. `scp` changed file to VPS
3. `ssh` → `systemctl restart boda-api`
4. Verify: `curl https://boda.ocaya.space/health` or `Invoke-WebRequest -Uri "https://boda.ocaya.space/health"`

### Mobile — dev / build
```powershell
# Dev
cd D:\code\customer-app; npx expo start

# Production build
$env:EXPO_TOKEN = (Get-Content "D:\code\expo-token.txt")
$env:EAS_NO_VCS = "1"
cd D:\code\customer-app; cmd /c eas.cmd build -p android --profile preview --non-interactive
```

### Database access
```bash
ssh -i ~/.ssh/id_rsa root@212.47.72.186
docker exec -it boda-postgres psql -U boda -d boda
```

### Run a migration
```bash
docker exec -i boda-postgres psql -U boda -d boda < /root/boda/backend/src/migrations/<file>.sql
```

### Make a user admin
```sql
INSERT INTO admins (user_id, is_active) VALUES ('<user-uuid>', true);
-- User must log out and back in for JWT to pick up the admin role
```

### Live logs
```bash
ssh -i ~/.ssh/id_rsa root@212.47.72.186 "journalctl -u boda-api -f"
```

### OTP in dev mode
OTPs are logged to the server console (SMS not active in dev). Get them from live logs above.

### Tests
```bash
cd D:\code\backend  && npm test          # Jest
cd D:\code\admin    && npm test          # Vitest
cd D:\code\rider-app && npm test         # Vitest
# customer-app: no test script — use npx expo start
```

---

## 11. Infrastructure

| Item | Value |
|---|---|
| VPS IP | `212.47.72.186` |
| VPS user | `root` |
| SSH key | `~/.ssh/id_rsa` |
| API service | `boda-api` (systemd, port 3000) |
| PostgreSQL | Docker, port 5432 |
| Redis | Docker, port 6379, password: `boda_redis_2026!` |
| Nginx | Ports 80/443 |
| Live API | `https://boda.ocaya.space` |
| Live admin | `https://admin.ocaya.space` |
| **Do not touch** | `aitoolkit` `chatai` `landverify-backend` `passport-app` `vagi-agent` (other VPS tenants) |

---

## 12. EAS / Expo Build

| Item | Value |
|---|---|
| Expo account | `qaphael` |
| Token location | `D:\code\expo-token.txt` |
| VCS | `EAS_NO_VCS=1` (no git repo) |
| Customer project ID | `7ead97ed-1081-4bed-afe3-2447e9deab06` |
| Rider project ID | `015496c8-ca9b-4291-825e-37d3473087d0` |

---

## 13. Known Environment Quirks

**Node version mismatch:** VPS runs Node.js 20. Local PC runs Node.js 24 (npm 11). If `npm install` fails with `Invalid Version: caniuse-lite`, regenerate `package-lock.json` on the VPS and copy it to PC.

**Expo SDK 56:** Removed the `splash` field from `app.json`. Run `npx expo-doctor` after any `app.json` change.

**Phone numbers:** All stored and validated as `256XXXXXXXXX` (12 digits, Ugandan format).

**Security audit:** Completed June 2026. 17 vulnerabilities fixed. See `deploy/SECURITY_AUDIT.md`.
