import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Device } from '../models/device.model';

/** Backoff before re-minting a ticket and reopening the stream after a drop. */
const RECONNECT_DELAY_MS = 1500;

interface LiveSubscription {
  deviceIds: string[];
  onUpdate: (device: Device) => void;
  closed: boolean;
  eventSource: EventSource | null;
  reconnectTimer: ReturnType<typeof setTimeout> | undefined;
}

/**
 * Real-time device location/info updates over Server-Sent Events (`GET /devices/live`), for the
 * map's "Live" tracking feature. Callers key each independent subscription themselves (e.g.
 * `'global'` for the map-wide toggle, `` `device:${id}` `` for a single device) so multiple
 * live views can coexist without stepping on each other.
 *
 * `EventSource` can't send an `Authorization` header, so each connection (and reconnection) is
 * preceded by minting a short-lived, single-use ticket through the normal authenticated
 * HttpClient — see `DeviceLiveController` on the backend. Deliberately does not rely on
 * `EventSource`'s native auto-reconnect: that would retry the same URL, whose ticket is now
 * consumed/expired. `onerror` closes the dead connection and mints a fresh ticket instead.
 */
@Injectable({ providedIn: 'root' })
export class DeviceLiveService {
  private readonly http = inject(HttpClient);
  private readonly streamUrl = `${environment.apiUrl}/devices/live`;
  private readonly subscriptions = new Map<string, LiveSubscription>();

  /** Opens (or replaces) a subscription under `key`. An empty deviceIds list just unsubscribes — there is no "all devices" mode. */
  subscribe(key: string, deviceIds: string[], onUpdate: (device: Device) => void): void {
    this.unsubscribe(key);
    if (deviceIds.length === 0) {
      return;
    }
    const subscription: LiveSubscription = { deviceIds, onUpdate, closed: false, eventSource: null, reconnectTimer: undefined };
    this.subscriptions.set(key, subscription);
    this.connect(key, subscription);
  }

  unsubscribe(key: string): void {
    const subscription = this.subscriptions.get(key);
    if (!subscription) {
      return;
    }
    subscription.closed = true;
    clearTimeout(subscription.reconnectTimer);
    subscription.eventSource?.close();
    this.subscriptions.delete(key);
  }

  unsubscribeAll(): void {
    for (const key of [...this.subscriptions.keys()]) {
      this.unsubscribe(key);
    }
  }

  isActive(key: string): boolean {
    return this.subscriptions.has(key);
  }

  private connect(key: string, subscription: LiveSubscription): void {
    this.http.post<{ ticket: string }>(`${this.streamUrl}/tickets`, {}).subscribe({
      next: ({ ticket }) => {
        if (subscription.closed) {
          return;
        }
        const params = new URLSearchParams({ ticket, deviceIds: subscription.deviceIds.join(',') });
        const eventSource = new EventSource(`${this.streamUrl}?${params}`);
        subscription.eventSource = eventSource;
        eventSource.addEventListener('device-update', (event: MessageEvent) => {
          subscription.onUpdate(JSON.parse(event.data));
        });
        eventSource.onerror = () => {
          eventSource.close();
          this.scheduleReconnect(key, subscription);
        };
      },
      error: () => this.scheduleReconnect(key, subscription),
    });
  }

  private scheduleReconnect(key: string, subscription: LiveSubscription): void {
    if (subscription.closed) {
      return;
    }
    subscription.reconnectTimer = setTimeout(() => this.connect(key, subscription), RECONNECT_DELAY_MS);
  }
}
