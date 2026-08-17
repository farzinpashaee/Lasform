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

### Google sign-in/sign-up

```
POST /api/auth/google {accessToken}
  → accessToken is a Google OAuth2 access token obtained client-side via Google Identity
    Services' initTokenClient (scope: openid email profile) — see web-face's GoogleAuthService
  → GoogleUserInfoClient calls Google's userinfo endpoint with it as a Bearer token; a
    successful response IS the proof the token is genuine (Google rejects anything
    expired/revoked/malformed before we'd see a body) — no local JWKS/signature verification
  → look up the returned email:
      no account yet        → create one (DISABLED, VIEWER-only, no password — see
                               UserManagementService#signUpViaGoogle) → {pendingApproval: true}
      account exists, not ACTIVE → same {pendingApproval: true}, no tokens issued
      account exists, ACTIVE     → {pendingApproval: false, accessToken, refreshToken, ...},
                                    same as a normal login, minus the password check
```

One endpoint backs both the "Sign in with Google" and "Sign up with Google" buttons — the two
only ever differed by which case above applies, not by anything the frontend needs to decide
ahead of time. Accounts created this way have `passwordHash = null`; `AuthenticationService.login`
guards against calling the password encoder on that. Requires a Google OAuth2 Client ID configured
on the **frontend** (`googleClientId` in `environment.ts`) — the backend needs no matching config
since it doesn't check the token's audience (see the "Known gaps" note below).

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

Google sign-in has no backend config — see the "Google sign-in/sign-up" section above. The Client
ID it needs lives entirely on the frontend (`googleClientId` in `web-face/src/environments`).

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
- **Google auth doesn't check the access token's audience.** `GoogleUserInfoClient` trusts any
  access token Google's userinfo endpoint accepts, without confirming it was minted for *our*
  Client ID specifically (there's no `lasform.google.*` backend config to check against). Accepted
  for a single-purpose app; add an audience check (Google's `tokeninfo` endpoint, or switch to
  verifying a signed ID token instead of an access token) before this app is ever a shared backend
  for multiple frontends/clients.

## Location reviews

`com.csl.lasform.review` — 1-5 star ratings (+ optional text) on a `Location`, built hexagonal
(`domain`/`application`/`infrastructure`) like `auth`, unlike the classic entity/repository/service
stack `Location`/`Device`/etc. use. It depends on the classic `LocationRepository` directly (there's
no domain port for `Location` to depend on instead) to keep the two denormalized fields in sync —
an accepted seam between the two architectural styles, not an oversight.

### Moderation flow

```
POST /api/locations/{locationId}/reviews {rating, reviewText}
  → upsert: one review per (locationId, userId) — a second submission updates the first,
    it never creates a duplicate (enforced by a unique compound index as a DB-level safety net)
  → always resets status → PENDING and clears any prior soft-delete, even editing an
    already-PUBLISHED review — an edited review needs re-moderation before it counts again
  → reviewText is HTML-escaped on write (HtmlUtils.htmlEscape) — plain text only, never
    rendered as markup by any frontend, so this closes off stored XSS regardless of whether
    a later frontend also escapes on output

GET /api/locations/{locationId}/reviews          — public: PUBLISHED + non-deleted only
DELETE /api/locations/{locationId}/reviews/me      — soft-delete the caller's own review
DELETE /api/reviews/{reviewId}                     — soft-delete someone else's review
GET /api/reviews/pending                           — moderation queue (all PENDING)
PATCH /api/reviews/{reviewId}/status {status}      — PENDING → PUBLISHED | REJECTED only
```

**Soft delete only** — nothing is ever removed from the `reviews` collection. A delete sets
`deleted=true`/`deletedAt`/`deletedBy`; every public/moderation query filters on `deleted=false`
(or the specific status it needs) rather than relying on the document being absent.

**Ownership is checked in the service layer, not just `@PreAuthorize`.** `review:delete_others`
proves the caller *can* delete someone's review, not that the target isn't their own —
`ReviewService.deleteOthers` throws `AccessDeniedException` (403) if `review.userId == callerId`,
regardless of whether that caller also holds `review:delete_own`. Deleting your own review always
goes through the `/me` endpoint instead.

**Status transitions are one-way and PENDING-gated.** `PATCH .../status` only accepts `PUBLISHED`
or `REJECTED` as the target (400 on anything else, including `PENDING`), and only if the review's
*current* status is `PENDING` (400 otherwise) — there's no "unpublish"/"un-reject" transition,
because a resubmit (`POST` again) already resets status to `PENDING` for re-moderation, which is
the only path back into the queue.

**`Location.averageRating`/`reviewCount` are recalculated, never trusted from a client**, after
every write that could change a location's published rating set — upsert, status transition,
delete-own, delete-others — via a Mongo aggregation (`$avg`/`$count` scoped to
`status=PUBLISHED, deleted=false`) in `ReviewRepositoryAdapter#aggregatePublished`, never by
loading every review into memory. `LocationController#create` also zeroes both fields on the
Location side regardless of what a `POST /api/v1/locations` body contains, since
`AbstractCrudService.create` saves the bound entity as-is (unlike `update`, whose field-copy
allow-list in `LocationServiceImpl#applyUpdate` already excludes them by omission).

**No transaction wraps the review write and the location update** — this app runs against a
standalone (non-replica-set) MongoDB instance (see `application.yml`; no `MongoTransactionManager`
bean exists), so the two are separate, sequential writes. A crash between them leaves
`Location.averageRating`/`reviewCount` briefly stale until the next write to that location's
reviews recalculates them. Documented here and in `ReviewService`'s class Javadoc rather than
silently assumed away.

### Permissions

| Key | Who |
|---|---|
| `review:create` | VIEWER, OPERATOR, ADMIN, SUPER_ADMIN — write/upsert your own review |
| `review:view` | ANONYMOUS + everyone — read published reviews |
| `review:delete_own` | VIEWER, OPERATOR, ADMIN, SUPER_ADMIN |
| `review:delete_others` | OPERATOR, ADMIN, SUPER_ADMIN |
| `review:moderate` | OPERATOR, ADMIN, SUPER_ADMIN — queue + approve/reject |

No new roles — same 5 system roles as everything else in the app.
