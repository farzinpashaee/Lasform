import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ConfigEntry } from '../models/config-entry.model';

/**
 * Generic key/value app settings — e.g. lasform.security.sso.google.client.id, map.google.api.key. Not a
 * CrudService: entries are addressed by their own key, not a server-generated id.
 */
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly http = inject(HttpClient);

  private get resourceUrl(): string {
    return `${environment.apiUrl}/config`;
  }

  /** Every config entry — admin-only (config:read). */
  list(): Observable<ConfigEntry[]> {
    return this.http.get<ConfigEntry[]>(this.resourceUrl);
  }

  /** A single entry by key — publicly readable, so the login page and public map can read it before authenticating. */
  get(key: string): Observable<ConfigEntry> {
    return this.http.get<ConfigEntry>(`${this.resourceUrl}/${key}`);
  }

  upsert(key: string, value: string): Observable<ConfigEntry> {
    return this.http.put<ConfigEntry>(`${this.resourceUrl}/${key}`, { value });
  }

  deleteByKey(key: string): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${key}`);
  }
}
