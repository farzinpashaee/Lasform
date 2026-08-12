import type { MapProviderKind } from '../app/core/maps';

export const environment = {
  production: true,
  apiUrl: '/api/v1',
  /** Auth endpoints (login/refresh/reset-password, users, roles) live under /api, not /api/v1. */
  authApiUrl: '/api',
  /** Which MapProvider implementation to use; see core/maps. */
  mapProvider: 'leaflet' as MapProviderKind,
  /** Required only when mapProvider is 'google'. */
  googleMapsApiKey: '',
};
