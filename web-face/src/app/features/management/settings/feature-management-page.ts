import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { FeatureFlag } from '../../../core/models/feature-flag.model';
import { ConfigService } from '../../../core/services/config.service';
import { FeatureFlagsService } from '../../../core/services/feature-flags.service';

interface FeatureFlagGroup {
  category: string;
  flags: FeatureFlag[];
}

@Component({
  selector: 'app-feature-management-page',
  imports: [TranslocoPipe],
  templateUrl: './feature-management-page.html',
  styleUrl: './feature-management-page.scss',
})
export class FeatureManagementPage implements OnInit {
  private readonly configService = inject(ConfigService);
  private readonly featureFlagsService = inject(FeatureFlagsService);
  private readonly transloco = inject(TranslocoService);

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  /** The key of the flag currently being saved, if any — disables just that row's toggle. */
  protected readonly savingKey = signal<string | null>(null);
  protected readonly saveError = signal<string | null>(null);

  protected readonly groups = computed<FeatureFlagGroup[]>(() => {
    const byCategory = new Map<string, FeatureFlag[]>();
    for (const flag of this.featureFlagsService.flags()) {
      const list = byCategory.get(flag.category) ?? [];
      list.push(flag);
      byCategory.set(flag.category, list);
    }
    return Array.from(byCategory, ([category, flags]) => ({ category, flags }));
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.featureFlagsService.refresh().subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.loading.set(false);
        this.loadError.set(this.transloco.translate('featureManagement.loadFailed'));
      },
    });
  }

  protected toggle(flag: FeatureFlag): void {
    if (this.savingKey()) {
      return;
    }
    const nextValue = !flag.enabled;
    this.savingKey.set(flag.key);
    this.saveError.set(null);

    this.configService.upsert(flag.key, String(nextValue)).subscribe({
      next: () => {
        this.savingKey.set(null);
        // Patches the shared cache directly (rather than waiting for the next poll) so this same
        // tab's dark-mode button/clustering button/etc. react immediately — see FeatureFlagsService.
        this.featureFlagsService.setFlag(flag.key, nextValue);
      },
      error: () => {
        this.savingKey.set(null);
        this.saveError.set(this.transloco.translate('featureManagement.saveFailed'));
      },
    });
  }
}
