import { Routes } from '@angular/router';

import { CategoriesPage } from './features/management/categories/categories-page';
import { ComingSoon } from './features/management/coming-soon/coming-soon';
import { DevicesPage } from './features/management/devices/devices-page';
import { LocationsPage } from './features/management/locations/locations-page';
import { ManagementShell } from './features/management/management-shell';
import { MapProviderSettings } from './features/management/settings/map-provider-settings';
import { MapPage } from './features/map/map-page';

export const routes: Routes = [
  { path: '', component: MapPage },
  {
    path: 'management',
    component: ManagementShell,
    children: [
      { path: '', redirectTo: 'settings/map-provider', pathMatch: 'full' },
      { path: 'settings/map-provider', component: MapProviderSettings },
      { path: 'settings/web-face-styles', component: ComingSoon, data: { title: 'Web Face Styles' } },
      { path: 'users', component: ComingSoon, data: { title: 'Users' } },
      { path: 'locations', component: LocationsPage },
      { path: 'devices', component: DevicesPage },
      { path: 'categories', component: CategoriesPage },
      { path: 'tags', component: ComingSoon, data: { title: 'Tags' } },
      { path: 'geofences', component: ComingSoon, data: { title: 'Geofences' } },
    ],
  },
];
