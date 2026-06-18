# Boda Security Audit Report — June 2026

## CRITICAL Vulnerabilities

### 1. Fare Manipulation (bookings.js:250)
**Severity: CRITICAL**
`completeBooking` accepts `fare_final` from the rider's request body. A rider can set any fare amount, including 0 or a massive number, directly affecting payment disbursement.

```js
const finalFare = fare_final || booking.rows[0].fare_estimate;
// rider can pass fare_final = 1 and get paid for a 15000 fare booking
```

**Fix:** Remove `fare_final` from request body. Always use server-calculated estimate or admin-adjusted amount.

### 2. Rider Can Accept Own Booking / No Ownership Check (bookings.js:169-209)
**Severity: HIGH**
`acceptBooking` uses `req.user.userId` as `riderId` but doesn't verify the userId corresponds to a rider record. A customer account could potentially accept bookings if they somehow got a rider ID in their JWT.

**Fix:** Verify `req.user.riderId` exists and matches the rider record.

### 3. No Authorization on getBooking (bookings.js:127-167)
**Severity: HIGH**
Any authenticated user can view any booking by ID. A customer can see other customers' bookings, rider details, payment info. No ownership check.

**Fix:** Verify the requesting user is the customer, rider, or admin for that booking.

### 4. WebSocket No Authentication (server.js:30-48)
**Severity: HIGH**
Socket.io connection has no auth middleware. Anyone can connect and:
- Emit `rider:location` to spoof any rider's location
- Join any `booking:${bookingId}` room to track any booking

**Fix:** Add Socket.io JWT middleware. Validate riderId matches authenticated user.

### 5. OTP Brute Force Window (auth.js:22-25)
**Severity: MEDIUM**
Rate limit is 3 attempts per 5 minutes per phone. But the OTP is 6 digits (1M combinations). An attacker could:
- Hit multiple phones simultaneously
- The rate limit resets after 5 minutes
- No global rate limit per IP

**Fix:** Add IP-based rate limiting, lock accounts after X failed attempts, add CAPTCHA.

### 6. Refresh Token Role Bypass (auth.js:126-129)
**Severity: HIGH**
`refreshAccessToken` hardcodes `role: 'customer'` in the new token:
```js
const newToken = jwt.sign(
  { userId: decoded.userId, phone: decoded.phone, role: 'customer' },
  // Should look up actual role from DB
);
```
An admin refreshing their token gets demoted to customer. More critically, the refresh token itself doesn't contain role, so the role is always re-derived — but hardcoded to 'customer'.

**Fix:** Look up actual role from database when refreshing.

### 7. Rider Can Update Any Rider's Location (riders.js:111-153)
**Severity: MEDIUM**
`updateLocation` uses `req.params.riderId` but doesn't verify it matches `req.user.riderId`. A rider could update another rider's location.

**Fix:** Use `req.user.riderId` from the JWT instead of params.

### 8. No File Upload Validation (riders.js:39-41)
**Severity: MEDIUM**
`id_photo` and `selfie_photo` are stored as raw text (URLs/base64) with no validation:
- No file type check
- No file size limit
- Could store malicious content

**Fix:** Validate file type, size, and use signed URLs for storage.

## HIGH Vulnerabilities

### 9. CORS Allows All Origins (server.js:21)
**Severity: HIGH**
`origin: true` reflects the requesting origin, effectively allowing any domain to make authenticated requests.

**Fix:** Whitelist only `https://admin.ocaya.space` and mobile app origins.

### 10. Redis Has No Password (redis.js:3)
**Severity: HIGH**
Redis connection has no authentication. If the VPS is compromised, attacker gets full Redis access — can read OTPs, sessions, rider locations.

**Fix:** Set `requirepass` in Redis config, use `AUTH` in connection.

### 11. Database Credentials in Connection String (database.js:4)
**Severity: MEDIUM**
PostgreSQL uses `DATABASE_URL` which may contain plaintext password. No SSL enforcement.

**Fix:** Add `ssl: { rejectUnauthorized: false }` for remote connections. Use environment variables.

### 12. JWT Secret Strength (auth.js:81-85)
**Severity: MEDIUM**
JWT_SECRET is from environment. If weak or default, all tokens can be forged. No token rotation on password/role changes.

**Fix:** Enforce minimum secret length, rotate secrets periodically.

### 13. Admin Role Check Bypass Potential (auth.js:52-60)
**Severity: MEDIUM**
`requireRole` checks `admins` table on EVERY request. If an admin is deactivated, their existing JWT (valid for 24h) still works until the DB check fails. This is actually good — but the check adds a DB query per request.

**Fix:** Consider short-lived admin tokens or Redis-cached admin status.

### 14. No Rate Limiting on Auth Endpoints (server.js:52-54)
**Severity: MEDIUM**
`/auth/send-otp` has per-phone rate limiting but:
- No per-IP rate limiting
- No global rate limiting
- `/auth/verify-otp` has no rate limiting at all (can brute force OTP)

**Fix:** Add rate limiting middleware on all auth endpoints.

### 15. Verbose Error Messages (multiple files)
**Severity: LOW**
Error messages sometimes reveal internal state:
- "No OTP found. Request a new one." — confirms phone exists
- "Rider with this ID or phone already exists" — confirms duplicate
- Stack traces in logs may be exposed

**Fix:** Use generic error messages for auth failures.

### 16. Session Not Invalidated on Logout (auth.js:93)
**Severity: MEDIUM**
Logout only removes token from localStorage. The refresh token in Redis is NOT invalidated. Stolen refresh tokens remain valid for 7 days.

**Fix:** Delete `session:${phone}` from Redis on logout.

### 17. Admin Can Delete Any Rider Without Confirmation (admin.js)
**Severity: LOW**
`deleteRider` has no soft-delete, no audit trail, no confirmation. Permanent data loss.

**Fix:** Add soft-delete (is_deleted flag), audit log, and require password confirmation.

### 18. No CSRF Protection on State-Changing Endpoints
**Severity: MEDIUM**
POST/PUT/PATCH/DELETE endpoints have no CSRF tokens. While JWT in header mitigates most CSRF, the admin dashboard uses cookies/localStorage which could be vulnerable.

**Fix:** Add CSRF token middleware for cookie-based auth.

### 19. Socket.io Room Joining Without Auth (server.js:41-43)
**Severity: MEDIUM**
Anyone can join any booking room by emitting `join:booking` with any bookingId. No verification that the user is part of that booking.

**Fix:** Verify user is customer or rider of that booking before joining room.

### 20. Payment Amount Not Validated Against Calculated Fare (bookings.js:265-268)
**Severity: MEDIUM**
When completing a booking, `fare_final` from request is used directly for payment operations. No validation against the original calculated fare.

**Fix:** Validate fare_final is within reasonable range of fare_estimate.

## Summary by Priority

| Priority | Count | Items |
|----------|-------|-------|
| CRITICAL | 1 | ~~Fare manipulation~~ FIXED |
| HIGH | 5 | ~~All 5~~ FIXED |
| MEDIUM | 9 | ~~All 9~~ FIXED |
| LOW | 2 | ~~All 2~~ FIXED |

**All 17 vulnerabilities have been addressed.**

### Remaining
- ~~**File upload validation** (MEDIUM #8)~~ FIXED — JPEG/PNG/WebP only, 5MB max, URL or base64
- ~~**Verbose error messages** (LOW #16)~~ FIXED — Generic auth failure messages
- ~~**Hard delete riders** (LOW #17)~~ FIXED — Soft delete + audit trail in rider_suspensions
