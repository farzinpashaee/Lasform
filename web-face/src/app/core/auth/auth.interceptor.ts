import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from './auth.service';

/** Requests to these are the auth flow itself — never retried-after-refresh or treated as "your session just expired". */
const AUTH_ENDPOINT_SEGMENTS = ['/auth/login', '/auth/refresh', '/auth/reset-password'];

/**
 * Attaches the access token to every request, and reacts to two specific failure statuses:
 *  - 401: if the caller currently holds a session, attempts exactly one silent refresh
 *    (AuthService dedupes concurrent attempts into one HTTP call), retries the original request
 *    with the new token, and if the refresh itself also fails, clears the session and sends the
 *    user to /login. If the caller has no session at all (anonymous — e.g. the public map with no
 *    token), there is nothing to refresh and no login to bounce back to: the 401 is simply passed
 *    through so the calling page can show its own "sign in to continue" state instead.
 *  - 403: the request was authenticated but the permission wasn't there — surfaced via
 *    AuthService.forbiddenNotice (see the banner in App) rather than a redirect, since the rest of
 *    the page the user was on is usually still perfectly usable.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const accessToken = authService.getAccessToken();
  const authedReq = accessToken ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } }) : req;

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const isAuthEndpoint = AUTH_ENDPOINT_SEGMENTS.some((segment) => req.url.includes(segment));

      if (error.status === 401 && !isAuthEndpoint && authService.isAuthenticated()) {
        return authService.refreshAccessToken().pipe(
          switchMap((newAccessToken) => next(req.clone({ setHeaders: { Authorization: `Bearer ${newAccessToken}` } }))),
          catchError((refreshError: unknown) => {
            authService.logout();
            router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
            return throwError(() => refreshError);
          }),
        );
      }

      if (error.status === 403) {
        authService.notifyForbidden(readErrorMessage(error) ?? 'You do not have permission to do that.');
      }

      return throwError(() => error);
    }),
  );
};

function readErrorMessage(error: HttpErrorResponse): string | undefined {
  const body = error.error as { message?: string } | undefined;
  return body?.message;
}
