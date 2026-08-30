import { Routes } from '@angular/router';

import { CategoriesPage } from './features/management/categories/categories-page';
import { ComingSoon } from './features/management/coming-soon/coming-soon';
import { DevicesPage } from './features/management/devices/devices-page';
import { GeofencesPage } from './features/management/geofences/geofences-page';
import { LocationsPage } from './features/management/locations/locations-page';
import { ManagementShell } from './features/management/management-shell';
import { FeatureManagementPage } from './features/management/settings/feature-management-page';
import { GeneralSettings } from './features/management/settings/general-settings';
import { MapProviderSettings } from './features/management/settings/map-provider-settings';
import { UsersPage } from './features/management/users/users-page';
import { MapPage } from './features/map/map-page';
import { LoginPage } from './features/auth/login/login-page';
import { NotAuthorizedPage } from './features/auth/not-authorized/not-authorized-page';
import { ResetPasswordPage } from './features/auth/reset-password/reset-password-page';
import { SignUpPage } from './features/auth/signup/signup-page';
import { ProfilePage } from './features/profile/profile-page';
import { permissionGuard } from './core/auth/permission.guard';
import { forcePasswordResetGuard } from './core/auth/force-password-reset.guard';

export const routes: Routes = [
  // Fully open, even to anonymous callers — it resolves against the ANONYMOUS role's permissions.
  // forcePasswordResetGuard still bounces an authenticated-but-must-reset user to /reset-password
  // without breaking anonymous access, unlike permissionGuard.
  { path: '', component: MapPage, canActivate: [forcePasswordResetGuard] },
  { path: 'login', component: LoginPage },
  { path: 'signup', component: SignUpPage },
  { path: 'reset-password', component: ResetPasswordPage, canActivate: [permissionGuard] },
  { path: 'profile', component: ProfilePage, canActivate: [permissionGuard] },
  { path: 'not-authorized', component: NotAuthorizedPage },
  {
    path: 'management',
    component: ManagementShell,
    // Applies to every child below: must be authenticated (and not mid forced-reset) to enter
    // the management shell at all. Individual children add their own permission requirement.
    canActivateChild: [permissionGuard],
    children: [
      { path: '', redirectTo: 'locations', pathMatch: 'full' },
      { path: 'settings/general', component: GeneralSettings, data: { permissions: 'config:write' } },
      { path: 'settings/map-provider', component: MapProviderSettings, data: { permissions: 'config:write' } },
      { path: 'settings/web-face-styles', component: ComingSoon, data: { titleKey: 'management.navWebFaceStyles' } },
      {
        path: 'settings/features-management',
        component: FeatureManagementPage,
        data: { permissions: 'config:write' },
      },
      { path: 'users', component: UsersPage, data: { permissions: 'user:read' } },
      { path: 'locations', component: LocationsPage, data: { permissions: 'location:read' } },
      { path: 'devices', component: DevicesPage, data: { permissions: 'device:read' } },
      { path: 'categories', component: CategoriesPage },
      { path: 'geofences', component: GeofencesPage, data: { permissions: 'geofence:read' } },
    ],
  },
];
