import { Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';

import { Alert } from '../models/alert.model';
import { AlertStatus } from '../models/enums';
import { CrudService } from './crud.service';
import { buildHttpParams } from './http-params.util';

/** How often the notification bell re-checks for newly fired alerts — see class doc. */
const UNREAD_POLL_INTERVAL_MS = 20000;

export interface AlertSearchParams {
  deviceId?: string;
  status?: AlertStatus;
}

/**
 * Standard Alert CRUD plus the notification-center's own needs: an unread (status === 'NEW')
 * count kept current by a background poll, same "poll rather than add a push channel just for
 * this" trade-off FeatureFlagsService already made (see its class doc) — true instant delivery
 * would need a per-user SSE/WebSocket channel this app doesn't otherwise have.
 */
@Injectable({ providedIn: 'root' })
export class AlertService extends CrudService<Alert> {
  private readonly _unreadCount = signal(0);
  readonly unreadCount = this._unreadCount.asReadonly();

  constructor() {
    super('alerts');
    setInterval(() => this.refreshUnreadCount().subscribe(), UNREAD_POLL_INTERVAL_MS);
  }

  /** Provide at least one of deviceId or status, matching the backend's /search contract. */
  search(params: AlertSearchParams): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.resourceUrl}/search`, { params: buildHttpParams(params) });
  }

  countByStatus(status: AlertStatus): Observable<number> {
    return this.http.get<number>(`${this.resourceUrl}/count`, { params: buildHttpParams({ status }) });
  }

  refreshUnreadCount(): Observable<number> {
    return this.countByStatus('NEW').pipe(
      tap((count) => this._unreadCount.set(count)),
      // A failed check (not signed in yet, briefly unreachable, ...) keeps the last-known count
      // rather than resetting the badge to 0.
      catchError(() => of(this._unreadCount())),
    );
  }

  /** Marks an alert read — sets status/acknowledgedByUserId/acknowledgedAt server-side. */
  acknowledge(id: string): Observable<Alert> {
    return this.http
      .post<Alert>(`${this.resourceUrl}/${id}/acknowledge`, {})
      .pipe(tap(() => this.refreshUnreadCount().subscribe()));
  }
}
