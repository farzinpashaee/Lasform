import type { MapProviderKind } from '../app/core/maps';

export const environment = {
  production: false,
  apiUrl: 'http://localhost:8078/api/v1',
  /** Auth endpoints (login/refresh/reset-password, users, roles) live under /api, not /api/v1. */
  authApiUrl: 'http://localhost:8078/api',
  /** Which MapProvider implementation to use; see core/maps. */
  mapProvider: 'leaflet' as MapProviderKind,
  /** Required only when mapProvider is 'google'. */
  googleMapsApiKey: '',
  /** See environment.ts for what this is and how to obtain one. */
  googleClientId: '',
};
