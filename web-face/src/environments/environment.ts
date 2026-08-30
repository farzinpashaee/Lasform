import type { MapProviderKind } from '../app/core/maps';

export const environment = {
  production: true,
  apiUrl: '/api/v1',
  /** Auth endpoints (login/refresh/reset-password, users, roles) live under /api, not /api/v1. */
  authApiUrl: '/api',
  /**
   * Which MapProvider implementation to use; see core/maps. The Google Maps API key itself
   * (required when this is 'google') and the Google OAuth Client ID for Sign in with Google are
   * no longer build-time config — both are read from the backend's generic config collection at
   * runtime (map.google.api.key, lasform.security.sso.google.client.id — see ConfigService/ConfigController) so
   * they're admin-editable without a redeploy and never shipped in the frontend bundle unset.
   */
  mapProvider: 'leaflet' as MapProviderKind,
};
