import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

const RESET_PASSWORD_PATH = '/reset-password';

/**
 * Applied to routes that must stay reachable by anonymous visitors (the public map) and so can't
 * use {@link import('./permission.guard').permissionGuard}, which redirects anyone unauthenticated
 * to /login. This only enforces the "authenticated but must reset their password first" case —
 * mirroring the backend's PasswordResetEnforcementFilter — and otherwise always allows, anonymous
 * included.
 */
export const forcePasswordResetGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.mustResetPassword()) {
    return router.createUrlTree([RESET_PASSWORD_PATH]);
  }
  return true;
};
