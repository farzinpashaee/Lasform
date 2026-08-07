import { InjectionToken, Provider, inject } from '@angular/core';

import { MapSettingsService } from '../services/map-settings.service';
import { GoogleMapsMapProvider } from './google-maps-map-provider';
import { LeafletMapProvider } from './leaflet-map-provider';
import { MapProvider } from './map-provider.model';

export const MAP_PROVIDER = new InjectionToken<MapProvider>('MAP_PROVIDER');

/** Picks the MapProvider implementation named by MapSettingsService (env-backed, user-overridable). */
export function provideMapProvider(): Provider {
  return {
    provide: MAP_PROVIDER,
    useFactory: (): MapProvider => {
      const settings = inject(MapSettingsService);
      switch (settings.getProvider()) {
        case 'google':
          return new GoogleMapsMapProvider(settings.getApiKey());
        case 'leaflet':
        default:
          return new LeafletMapProvider();
      }
    },
  };
}
