import { Routes } from '@angular/router';

import { ComingSoon } from './features/management/coming-soon/coming-soon';
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
      { path: 'locations', component: ComingSoon, data: { title: 'Locations' } },
      { path: 'devices', component: ComingSoon, data: { title: 'Devices' } },
      { path: 'categories', component: ComingSoon, data: { title: 'Categories' } },
      { path: 'tags', component: ComingSoon, data: { title: 'Tags' } },
      { path: 'geofences', component: ComingSoon, data: { title: 'Geofences' } },
    ],
  },
];
