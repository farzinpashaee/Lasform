import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { MapProviderKind } from '../maps/map-provider.model';

const PROVIDER_KEY = 'lasform.mapProvider';
const API_KEY_KEY = 'lasform.googleMapsApiKey';

/**
 * User-configurable override for which MapProvider to use, persisted in localStorage.
 * Falls back to the build-time environment.mapProvider/googleMapsApiKey when unset.
 * Read by provideMapProvider() at bootstrap, written by the Map Provider settings page.
 */
@Injectable({ providedIn: 'root' })
export class MapSettingsService {
  getProvider(): MapProviderKind {
    const stored = localStorage.getItem(PROVIDER_KEY);
    return stored === 'google' || stored === 'leaflet' ? stored : environment.mapProvider;
  }

  getApiKey(): string {
    return localStorage.getItem(API_KEY_KEY) ?? environment.googleMapsApiKey ?? '';
  }

  save(provider: MapProviderKind, apiKey: string): void {
    localStorage.setItem(PROVIDER_KEY, provider);
    localStorage.setItem(API_KEY_KEY, apiKey);
  }
}
