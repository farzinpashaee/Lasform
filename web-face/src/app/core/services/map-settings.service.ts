import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CONFIG_KEYS } from '../config-keys';
import { MapProviderKind } from '../maps/map-provider.model';
import { ConfigEntry } from '../models/config-entry.model';
import { ConfigService } from './config.service';

const PROVIDER_KEY = 'lasform.mapProvider';

/**
 * Which MapProvider to use is still a local browser preference (localStorage), but the Google
 * Maps API key now lives in the backend's generic config collection (map.google.api.key) rather
 * than being shipped in the frontend bundle — see ConfigService/ConfigController.
 */
@Injectable({ providedIn: 'root' })
export class MapSettingsService {
  private readonly configService = inject(ConfigService);

  /** Populated by prefetchApiKey(); empty until then or if the key isn't configured yet. */
  private cachedApiKey = '';

  getProvider(): MapProviderKind {
    const stored = localStorage.getItem(PROVIDER_KEY);
    return stored === 'google' || stored === 'leaflet' ? stored : environment.mapProvider;
  }

  getApiKey(): string {
    return this.cachedApiKey;
  }

  /**
   * Loads map.google.api.key from the backend so getApiKey() has a value by the time
   * provideMapProvider()'s factory reads it — call once via provideAppInitializer at bootstrap
   * (see app.config.ts). Resolves even if the key isn't configured yet; getApiKey() then just
   * returns '' and GoogleMapsMapProvider fails clearly if 'google' is the selected provider.
   */
  async prefetchApiKey(): Promise<void> {
    try {
      const entry = await firstValueFrom(this.configService.get(CONFIG_KEYS.googleMapsApiKey));
      this.cachedApiKey = entry.value;
    } catch {
      this.cachedApiKey = '';
    }
  }

  saveProvider(provider: MapProviderKind): void {
    localStorage.setItem(PROVIDER_KEY, provider);
  }

  saveApiKey(apiKey: string): Observable<ConfigEntry> {
    const trimmed = apiKey.trim();
    return this.configService
      .upsert(CONFIG_KEYS.googleMapsApiKey, trimmed)
      .pipe(tap(() => (this.cachedApiKey = trimmed)));
  }
}
