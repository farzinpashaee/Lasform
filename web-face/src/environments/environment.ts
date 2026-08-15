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
  /**
   * OAuth2 Client ID from Google Cloud Console (APIs & Services > Credentials > OAuth client ID,
   * type "Web application", with this app's origin(s) under Authorized JavaScript origins — no
   * redirect URI needed, the token-client popup flow doesn't use one). Safe to expose client-side
   * by design. Required for the "Sign in/up with Google" buttons to work at all; left blank they
   * fail with a clear error instead of silently doing nothing.
   */
  googleClientId: '',
};
