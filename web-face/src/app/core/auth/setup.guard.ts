import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SetupService } from '../services/setup.service';

/**
 * Applied as `canActivateChild` on every normal route (see app.routes.ts) — redirects to /setup
 * whenever the app has zero users yet, ahead of even /login. Reads the SetupService signal warmed
 * by an app initializer, so no request happens per navigation.
 */
export const setupGuard: CanActivateFn = () => {
  const setupService = inject(SetupService);
  const router = inject(Router);

  return setupService.needsSetup() ? router.createUrlTree(['/setup']) : true;
};
