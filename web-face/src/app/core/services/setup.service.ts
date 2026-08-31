import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TokenResponse } from '../auth/auth.model';

export interface CreateInitialAdminRequest {
  displayName: string;
  email: string;
  password: string;
}

/**
 * Backs the first-run setup wizard (`/setup`) — see core/README.md's "First-run setup wizard"
 * section. Unlike FeatureFlagsService there's no polling: needsSetup transitions from true to
 * false at most once, ever, per install, and only ever from this app's own actions.
 */
@Injectable({ providedIn: 'root' })
export class SetupService {
  private readonly http = inject(HttpClient);

  /** Fail-open default — if the initial status check fails, don't lock a working install behind a wizard. */
  private readonly _needsSetup = signal(false);
  readonly needsSetup = this._needsSetup.asReadonly();

  private get setupUrl(): string {
    return `${environment.authApiUrl}/setup`;
  }

  refreshStatus(): Observable<boolean> {
    return this.http.get<{ needsSetup: boolean }>(`${this.setupUrl}/status`).pipe(
      map((response) => response.needsSetup),
      tap((needsSetup) => this._needsSetup.set(needsSetup)),
      catchError(() => of(this._needsSetup())),
    );
  }

  createAdmin(request: CreateInitialAdminRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.setupUrl}/admin`, request);
  }

  /** Called by the wizard right after step 1 succeeds, so this tab reflects it immediately (no need to wait/re-fetch). */
  markSetupComplete(): void {
    this._needsSetup.set(false);
  }
}
