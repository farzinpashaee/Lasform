import { DatePipe } from '@angular/common';
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { Alert } from '../../core/models/alert.model';
import { AlertService } from '../../core/services/alert.service';

const RECENT_ALERTS_LIMIT = 8;
/** How many of the most recent alerts to fetch before filtering out acknowledged ones — bigger
 *  than RECENT_ALERTS_LIMIT so a handful of already-read alerts in that recent stretch don't leave
 *  the panel showing fewer than it should. */
const RECENT_ALERTS_FETCH_SIZE = 20;

/**
 * The notification bell + its dropdown panel — shared by every page with a header that wants it
 * (currently just the management shell), same pattern as AccountMenu. Lists the most recent
 * *unread* alerts only (including rule-fired ones — see Rule); acknowledging one here drops it
 * from the list immediately rather than leaving a "read" row behind — the full, unfiltered history
 * (acknowledged included) lives on the dedicated notifications page instead (see viewAll()).
 * AlertService's own background poll keeps the badge count current; this component only refetches
 * the list itself when opened.
 */
@Component({
  selector: 'app-notification-center',
  imports: [DatePipe, TranslocoPipe],
  templateUrl: './notification-center.html',
  styleUrl: './notification-center.scss',
})
export class NotificationCenter implements OnInit {
  protected readonly alertService = inject(AlertService);
  private readonly router = inject(Router);

  protected readonly panelOpen = signal(false);
  protected readonly alerts = signal<Alert[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadError = signal(false);

  ngOnInit(): void {
    this.alertService.refreshUnreadCount().subscribe();
  }

  @HostListener('document:keydown.escape')
  protected closePanel(): void {
    this.panelOpen.set(false);
  }

  protected togglePanel(): void {
    this.panelOpen.update((open) => !open);
    if (this.panelOpen()) {
      this.loadRecent();
    }
  }

  private loadRecent(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.alertService.findAll({ size: RECENT_ALERTS_FETCH_SIZE, sort: 'triggeredAt,desc' }).subscribe({
      next: (page) => {
        this.loading.set(false);
        this.alerts.set(page.content.filter((alert) => alert.status !== 'ACKNOWLEDGED').slice(0, RECENT_ALERTS_LIMIT));
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
        this.alerts.set([]);
      },
    });
  }

  /** Acknowledging here drops the alert out of the panel straight away, rather than leaving it
   *  visible-but-read — see the class doc. */
  protected markRead(alert: Alert, event: Event): void {
    event.stopPropagation();
    if (!alert.id || alert.status === 'ACKNOWLEDGED') {
      return;
    }
    this.alertService.acknowledge(alert.id).subscribe({
      next: () => this.alerts.update((alerts) => alerts.filter((a) => a.id !== alert.id)),
    });
  }

  protected viewAll(): void {
    this.closePanel();
    this.router.navigate(['/management/notifications']);
  }
}
