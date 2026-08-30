import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';

import { AuthService } from './auth.service';

const RESET_PASSWORD_PATH = '/reset-password';

/**
 * Used as both `canActivate` (on a route carrying `data: { permissions: 'device:write' }` or
 * `data: { permissions: ['a', 'b'] }`) and `canActivateChild` (on a parent route with no `data`,
 * meaning "just require being logged in" — see the `management` route). Order of checks:
 *
 *  1. Not authenticated at all → redirect to /login (with a returnUrl to bounce back afterward).
 *  2. Authenticated but must reset their password → redirect to /reset-password, unless this
 *     *is* /reset-password (mirrors the backend's PasswordResetEnforcementFilter allow-list).
 *  3. No `permissions` in route data → authentication alone was enough, allow.
 *  4. Missing one of the required permissions → redirect to /not-authorized.
 */
export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  if (authService.mustResetPassword() && state.url !== RESET_PASSWORD_PATH) {
    return router.createUrlTree([RESET_PASSWORD_PATH]);
  }

  const required = route.data['permissions'] as string | string[] | undefined;
  if (!required) {
    return true;
  }

  const requiredList = Array.isArray(required) ? required : [required];
  const allowed = requiredList.every((key) => authService.hasPermission(key));
  return allowed ? true : router.createUrlTree(['/not-authorized']);
};
