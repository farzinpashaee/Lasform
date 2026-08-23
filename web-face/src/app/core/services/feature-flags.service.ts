import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { FeatureFlag } from '../models/feature-flag.model';

/** How often open tabs/sessions re-check for an admin's change — see class doc. */
const POLL_INTERVAL_MS = 15000;

/**
 * Caches the full feature-flag catalog (GET /api/v1/feature-flags, unauthenticated) so the
 * isEnabled() checks scattered across the app (dark mode button, clustering button, reviews,
 * Google SSO buttons) are synchronous signal reads rather than a network call each.
 *
 * "Reflects immediately" has two different meanings here, both handled: the admin's own session
 * updates the instant their save completes (the Feature Management page patches this service's
 * cache directly — see setFlag()); every other open tab/session picks it up within
 * POLL_INTERVAL_MS via the background poll below, no reload needed. True instant cross-tab push
 * would need a WebSocket/SSE channel this app doesn't otherwise have — this polling approach was
 * chosen to avoid adding one just for feature flags.
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
  private readonly http = inject(HttpClient);

  private readonly _flags = signal<FeatureFlag[]>([]);

  /** All flags, most recently fetched — for the Feature Management page to group/render. */
  readonly flags = this._flags.asReadonly();

  constructor() {
    setInterval(() => this.refresh().subscribe(), POLL_INTERVAL_MS);
  }

  private get resourceUrl(): string {
    return `${environment.apiUrl}/feature-flags`;
  }

  /** A key the catalog doesn't (yet) know about defaults to enabled — fail-open, never fail-hidden. */
  isEnabled(key: string): boolean {
    const flag = this._flags().find((f) => f.key === key);
    return flag ? flag.enabled : true;
  }

  /** Called by the Feature Management page right after a successful save, so this tab reflects it immediately. */
  setFlag(key: string, enabled: boolean): void {
    this._flags.update((flags) => flags.map((f) => (f.key === key ? { ...f, enabled } : f)));
  }

  refresh(): Observable<FeatureFlag[]> {
    return this.http.get<FeatureFlag[]>(this.resourceUrl).pipe(
      tap((flags) => this._flags.set(flags)),
      // A failed refresh (backend briefly unreachable, etc.) keeps the last-known values rather
      // than clearing the catalog — isEnabled() would otherwise fail-open on every key at once.
      catchError(() => of(this._flags())),
    );
  }
}
