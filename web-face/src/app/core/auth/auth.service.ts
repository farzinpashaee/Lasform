import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, switchMap, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CurrentUser, GoogleAuthResponse, JwtClaims, TokenResponse } from './auth.model';
import { decodeJwtPayload } from './jwt.util';

const REFRESH_TOKEN_STORAGE_KEY = 'lasform.refreshToken';
/** Proactively refresh this many seconds before the access token's exp, so most requests never hit a 401 from plain expiry. */
const PROACTIVE_REFRESH_SKEW_SECONDS = 60;

/**
 * Token storage: the access token lives only in memory (a signal here) — it's never written to
 * any Storage API, so it can't be read back out after the fact by an injected script; the window
 * for stealing it is limited to actively-running malicious JS during the live session, same as
 * any other in-memory secret. The refresh token *is* persisted to localStorage, purely so a page
 * reload doesn't force a re-login. That's a real, deliberate tradeoff: any script running on this
 * origin can read localStorage and mint fresh access tokens with it until it's revoked (backend
 * has a DB record per refresh token — see core/README.md) or it expires (7 days). The properly
 * hardened version of this is an httpOnly + Secure + SameSite cookie the backend sets on
 * login/refresh and the browser sends automatically, invisible to JS entirely — that needs
 * backend support this pass doesn't add (today's endpoints take the refresh token as a JSON body
 * field, not a cookie).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly authUrl = `${environment.authApiUrl}/auth`;

  private readonly accessTokenSignal = signal<string | null>(null);
  private readonly claimsSignal = signal<JwtClaims | null>(null);

  private refreshInFlight: Observable<string> | null = null;
  private proactiveRefreshTimer?: ReturnType<typeof setTimeout>;

  readonly isAuthenticated = computed(() => this.claimsSignal() !== null);
  readonly mustResetPassword = computed(() => this.claimsSignal()?.mustResetPassword ?? false);
  readonly currentPermissions = computed(() => new Set(this.claimsSignal()?.permissions ?? []));
  readonly currentUser = computed<CurrentUser | null>(() => {
    const claims = this.claimsSignal();
    return claims
      ? {
          userId: claims.sub,
          orgId: claims.orgId,
          mustResetPassword: claims.mustResetPassword,
          email: claims.email,
          displayName: claims.displayName,
        }
      : null;
  });

  /** Set on a 403 response by the auth interceptor; a banner (see App) shows/clears it. Cosmetic — the backend already refused the request. */
  readonly forbiddenNotice = signal<string | null>(null);

  getAccessToken(): string | null {
    return this.accessTokenSignal();
  }

  hasPermission(key: string): boolean {
    return this.currentPermissions().has(key);
  }

  hasAnyPermission(keys: readonly string[]): boolean {
    return keys.some((key) => this.hasPermission(key));
  }

  login(email: string, password: string): Observable<CurrentUser> {
    return this.http.post<TokenResponse>(`${this.authUrl}/login`, { email, password }).pipe(
      tap((response) => this.applyTokenResponse(response)),
      map(() => {
        const user = this.currentUser();
        if (!user) {
          // Unreachable in practice — applyTokenResponse always sets claims from a well-formed TokenResponse.
          throw new Error('Login succeeded but the access token could not be read.');
        }
        return user;
      }),
    );
  }

  /** Only clears local session state — callers navigate afterward themselves (a logout button and a failed silent refresh want different destinations). */
  logout(): void {
    this.clearSession();
  }

  /**
   * Adopts tokens obtained from somewhere other than /auth/login — currently just the setup
   * wizard's POST /api/setup/admin, which returns the same TokenResponse shape a login would, so
   * there's no need for the wizard to log in a second time after creating the admin.
   */
  establishSession(response: TokenResponse): CurrentUser {
    this.applyTokenResponse(response);
    const user = this.currentUser();
    if (!user) {
      // Unreachable in practice — applyTokenResponse always sets claims from a well-formed TokenResponse.
      throw new Error('Session could not be established.');
    }
    return user;
  }

  /**
   * Backs both "Sign in with Google" and "Sign up with Google" — same endpoint, same response
   * shape either way (see core/README.md's "Google sign-in/sign-up" section for why). `accessToken`
   * is the Google OAuth2 token from GoogleAuthService, not a Lasform token. Resolves `true` when
   * the account is newly created or still pending admin approval (no session was established —
   * the caller should show that state, not redirect), `false` once the session is live.
   */
  loginWithGoogle(googleAccessToken: string): Observable<boolean> {
    return this.http.post<GoogleAuthResponse>(`${this.authUrl}/google`, { accessToken: googleAccessToken }).pipe(
      tap((response) => {
        if (!response.pendingApproval && response.accessToken && response.tokenType && response.expiresIn != null) {
          this.applyTokenResponse({
            accessToken: response.accessToken,
            refreshToken: response.refreshToken ?? null,
            tokenType: response.tokenType,
            expiresIn: response.expiresIn,
          });
        }
      }),
      map((response) => response.pendingApproval),
    );
  }

  /**
   * The backend accepts this on the *current* (still mustResetPassword=true) access token — see
   * PasswordResetEnforcementFilter's allow-list. But that token's claims are baked in at issuance
   * and can't change after the fact, so once the backend confirms the reset, this immediately
   * follows up with a refresh to obtain a token that actually reflects mustResetPassword=false —
   * otherwise the guard would keep bouncing the user back here.
   */
  resetPassword(newPassword: string): Observable<void> {
    return this.http
      .post<void>(`${this.authUrl}/reset-password`, { newPassword })
      .pipe(switchMap(() => this.refreshAccessToken()), map(() => undefined));
  }

  /** Called once at app startup (see app.config.ts). Resolves true if a persisted refresh token produced a working session. */
  tryRestoreSession(): Observable<boolean> {
    if (!this.readStoredRefreshToken()) {
      return of(false);
    }
    return this.refreshAccessToken().pipe(
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
    );
  }

  /** Shared by the interceptor's 401 handling and tryRestoreSession — concurrent callers get the same in-flight request, not one each. */
  refreshAccessToken(): Observable<string> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }
    const refreshToken = this.readStoredRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available.'));
    }

    const request$ = this.http.post<TokenResponse>(`${this.authUrl}/refresh`, { refreshToken }).pipe(
      tap((response) => this.applyTokenResponse(response)),
      map((response) => response.accessToken),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.refreshInFlight = request$;
    const clearSlot = () => (this.refreshInFlight = null);
    request$.subscribe({ error: clearSlot, complete: clearSlot });
    return request$;
  }

  private applyTokenResponse(response: TokenResponse): void {
    const claims = decodeJwtPayload<JwtClaims>(response.accessToken);
    this.accessTokenSignal.set(response.accessToken);
    this.claimsSignal.set(claims);
    if (response.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, response.refreshToken);
    }
    this.scheduleProactiveRefresh(claims);
  }

  private scheduleProactiveRefresh(claims: JwtClaims | null): void {
    clearTimeout(this.proactiveRefreshTimer);
    if (!claims) {
      return;
    }
    const msUntilExpiry = claims.exp * 1000 - Date.now();
    const msUntilRefresh = Math.max(msUntilExpiry - PROACTIVE_REFRESH_SKEW_SECONDS * 1000, 0);
    this.proactiveRefreshTimer = setTimeout(() => {
      // Best-effort: if this fails, the interceptor's reactive 401-refresh-retry is still there as a fallback.
      this.refreshAccessToken().subscribe({ error: () => undefined });
    }, msUntilRefresh);
  }

  private readStoredRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  }

  private clearSession(): void {
    clearTimeout(this.proactiveRefreshTimer);
    this.accessTokenSignal.set(null);
    this.claimsSignal.set(null);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }

  notifyForbidden(message: string): void {
    this.forbiddenNotice.set(message);
  }

  dismissForbiddenNotice(): void {
    this.forbiddenNotice.set(null);
  }
}
