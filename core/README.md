# Lasform Core

Spring Boot backend for Lasform. This file covers the authentication/authorization layer
(`com.csl.lasform.auth` and `com.csl.lasform.config.SecurityConfig`) — everything else about the
project lives in the [repo root README](../README.md).

## Authentication & authorization

### The model

Permissions are atomic capability strings (`device:read`, `user:invite`, ...), defined once in
[`PermissionKey`](src/main/java/com/csl/lasform/auth/domain/model/PermissionKey.java). Roles are
named bundles of permissions. A user is assigned one or more roles (`UserRole`), which resolve to a
flat permission set at login/refresh time (`PermissionResolutionService`). **Nothing in the app
branches on a role name** — every check, everywhere, is `hasAuthority('some:permission')` against
that resolved set. `AuthSeeder` seeds the fixed permission catalog and 5 system roles
(SUPER_ADMIN/ADMIN/OPERATOR/VIEWER/ANONYMOUS) on every startup, idempotently.

### Token flow

```
POST /api/auth/login {email, password}
  → validates credentials, resolves permissions
  → access token  (15m, carries userId/orgId/permissions[]/mustResetPassword)
  → refresh token (7d, carries only a jti pointing at a RefreshToken DB record)

Authenticated request:  Authorization: Bearer <access token>
  → JwtAuthenticationFilter verifies the signature, sets the SecurityContext
  → @PreAuthorize("hasAuthority('...')") on the controller method checks the token's permissions[]

POST /api/auth/refresh {refreshToken}
  → looks up the RefreshToken record by its jti (must exist, not revoked, not expired)
  → re-resolves the user's current permissions (a role change since login takes effect here)
  → issues a new access token only — the refresh token is not rotated
```

**Anonymous requests are not rejected.** No/invalid/expired token → `JwtAuthenticationFilter`
leaves the `SecurityContext` unset → Spring Security's own anonymous-authentication filter fills
it in with the ANONYMOUS role's permissions (resolved once at startup — see
`SecurityConfig.anonymousAuthorities()`). So `hasAuthority('map:view_public')` behaves identically
for a logged-in user and a request with no token at all; nothing needs an `isAnonymous()` special
case. One consequence: Spring Security's normal 401-vs-403 split falls out for free —
`@PreAuthorize` denying an *anonymous* caller routes to `JsonAuthenticationEntryPoint` (401,
"you're not authenticated"), denying an *authenticated* caller routes to
`JsonAccessDeniedHandler` (403, "you're authenticated but not allowed") — see
`ExceptionTranslationFilter` in Spring Security for why; there's no custom branching for this in
the app.

**Forced password reset.** A user created via `POST /api/users` (or seeded as the initial admin)
gets `mustResetPassword=true`. Their access token still carries their real permissions, but
`PasswordResetEnforcementFilter` blocks every request except `/api/auth/{login,refresh,reset-password}`
with 403 (`password_reset_required`) until `POST /api/auth/reset-password` clears the flag. This is
a single filter, not a check repeated in every controller.

### Refresh token storage: DB, not Redis

Refresh tokens are stored in Mongo (`refresh_tokens` collection) rather than Redis. Tradeoff: Mongo
needs a TTL index (`expiresAt`, `expireAfter = "0s"`) to get the same "expires and disappears on
its own" behavior Redis gives for free, and a Mongo round-trip is slower than a Redis lookup — but
it avoids standing up a second stateful service for what's currently a handful of small documents,
and revocation/expiry checks are simple queries against data that's already backed up alongside
everything else. Reach for Redis instead once refresh-token traffic or an actual multi-instance
deployment makes the extra infra worth it — the domain port (`RefreshTokenRepository`) doesn't
change either way, only its adapter would.

### Config

All in `application.yml`, overridable via env var (Spring's relaxed binding, e.g.
`lasform.jwt.secret` ↔ `LASFORM_JWT_SECRET`):

| Property | Env var | Default | Notes |
|---|---|---|---|
| `lasform.jwt.secret` | `LASFORM_JWT_SECRET` | *(none)* | HMAC-SHA256 key, 32+ chars. Unset → an ephemeral random key is generated at startup (logged as a warning) so local dev works with zero config, at the cost of invalidating every token on restart. |
| `lasform.jwt.access-token-ttl` | `LASFORM_JWT_ACCESS_TOKEN_TTL` | `15m` | Spring's simple duration syntax. |
| `lasform.jwt.refresh-token-ttl` | `LASFORM_JWT_REFRESH_TOKEN_TTL` | `7d` | |
| `lasform.seed.enabled` | `LASFORM_SEED_ENABLED` | `true` | Turn off for e.g. a read replica. |
| `lasform.org.name` | `LASFORM_ORG_NAME` | `Lasform` | Name of the single org created on first run. |
| `lasform.admin.email` / `lasform.admin.password` | `LASFORM_ADMIN_EMAIL` / `LASFORM_ADMIN_PASSWORD` | *(none)* | Initial SUPER_ADMIN, created once on first run. Unset → `AuthSeeder` logs a warning and skips creating it, rather than guessing. |

### Adding a new permission-gated endpoint

1. **Add the key** to [`PermissionKey`](src/main/java/com/csl/lasform/auth/domain/model/PermissionKey.java)
   (`SOMETHING_READ("something:read", "...")`). This is the only place a permission key is ever
   defined — don't type the string anywhere else in Java except `@PreAuthorize`.
2. **Grant it to a role.** Add the new `PermissionKey` to the relevant list(s) in
   `AuthSeeder.buildRolePermissions()`. It's picked up automatically on the next restart —
   seeding is idempotent and additive (existing grants are never revoked by re-seeding).
3. **Gate the endpoint**: `@PreAuthorize("hasAuthority('something:read')")` on the controller
   method, using the literal string (this is the one place a permission key legitimately appears
   as a string literal — `@PreAuthorize`'s value is a compile-time annotation constant, so it can't
   reference the enum directly).
   - If the endpoint is one of the CRUD methods inherited from `AbstractCrudController`
     (`getById`/`list`/`update`/`delete`), you must **override it and repeat its original
     `@GetMapping`/`@PatchMapping`/`@DeleteMapping` and parameter annotations**, not just add
     `@PreAuthorize` — overriding a mapped method without redeclaring the mapping annotation
     silently drops the endpoint (Java doesn't inherit annotations across an `@Override`). See any
     of `DeviceController`/`LocationController`/`GeofenceController`/`EventController` for the
     pattern.
4. That's it — no changes needed to `SecurityConfig`, the JWT filter, or anything else.

### Known gaps (not built yet)

- **Event ingestion** (`POST /api/v1/events`) is deliberately left ungated — it's meant to be
  called by devices, not interactive users, and there's no device-credential scheme yet. Anyone
  can currently post events.
- **Refresh token rotation** isn't implemented — a refresh token stays valid, reusable, until its
  own expiry or explicit revocation, rather than being replaced on every use.
- **Role/permission management endpoints** (creating custom roles, editing a role's bundle via
  API) don't exist — `role:manage` is seeded but nothing currently checks it.
- Users can only reset **their own** password via `/api/auth/reset-password`; there's no
  admin-initiated "force a reset" or "revoke all sessions" endpoint yet.
