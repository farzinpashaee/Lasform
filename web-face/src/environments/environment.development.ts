import type { MapProviderKind } from '../app/core/maps';

export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1',
  /** Which MapProvider implementation to use; see core/maps. */
  mapProvider: 'leaflet' as MapProviderKind,
  /** Required only when mapProvider is 'google'. */
  googleMapsApiKey: '',
};
