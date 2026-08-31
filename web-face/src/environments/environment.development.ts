import type { MapProviderKind } from '../app/core/maps';

export const environment = {
  production: false,
  apiUrl: 'http://localhost:8078/api/v1',
  /** Auth endpoints (login/refresh/reset-password, users, roles) live under /api, not /api/v1. */
  authApiUrl: 'http://localhost:8078/api',
  /** Which MapProvider implementation to use; see core/maps. See environment.ts for why the
   * Google Maps API key and OAuth Client ID aren't here anymore. */
  mapProvider: 'leaflet' as MapProviderKind,
};
