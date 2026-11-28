import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { Alert } from '../../../core/models/alert.model';
import { AlertService } from '../../../core/services/alert.service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-notifications-page',
  imports: [DatePipe, TranslocoPipe],
  templateUrl: './notifications-page.html',
  styleUrl: './notifications-page.scss',
})
export class NotificationsPage implements OnInit {
  private readonly alertService = inject(AlertService);
  private readonly transloco = inject(TranslocoService);

  protected readonly alerts = signal<Alert[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly page = signal(0);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadAlerts();
  }

  private loadAlerts(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.alertService.findAll({ page: this.page(), size: PAGE_SIZE, sort: 'triggeredAt,desc' }).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.alerts.set(result.content);
        this.totalElements.set(result.totalElements);
        this.totalPages.set(result.totalPages);
      },
      error: () => {
        this.loading.set(false);
        this.alerts.set([]);
        this.loadError.set(this.transloco.translate('notifications.loadFailed'));
      },
    });
  }

  protected goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages() || page === this.page()) {
      return;
    }
    this.page.set(page);
    this.loadAlerts();
  }

  protected markRead(alert: Alert): void {
    if (!alert.id || alert.status === 'ACKNOWLEDGED') {
      return;
    }
    this.alertService.acknowledge(alert.id).subscribe({
      next: (updated) => this.alerts.update((alerts) => alerts.map((a) => (a.id === updated.id ? updated : a))),
    });
  }
}
