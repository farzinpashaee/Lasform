import { InjectionToken, Provider } from '@angular/core';

import { environment } from '../../../environments/environment';
import { GoogleMapsMapProvider } from './google-maps-map-provider';
import { LeafletMapProvider } from './leaflet-map-provider';
import { MapProvider } from './map-provider.model';

export const MAP_PROVIDER = new InjectionToken<MapProvider>('MAP_PROVIDER');

/** Picks the MapProvider implementation named by environment.mapProvider (defaults to Leaflet). */
export function provideMapProvider(): Provider {
  return {
    provide: MAP_PROVIDER,
    useFactory: (): MapProvider => {
      switch (environment.mapProvider) {
        case 'google':
          return new GoogleMapsMapProvider(environment.googleMapsApiKey ?? '');
        case 'leaflet':
        default:
          return new LeafletMapProvider();
      }
    },
  };
}
