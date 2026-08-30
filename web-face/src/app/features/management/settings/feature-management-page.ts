import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { CONFIG_KEYS } from '../../../core/config-keys';
import { FEATURE_FLAGS } from '../../../core/feature-flag-keys';
import { FeatureFlag } from '../../../core/models/feature-flag.model';
import { ConfigService } from '../../../core/services/config.service';
import { FeatureFlagsService } from '../../../core/services/feature-flags.service';

interface FeatureFlagGroup {
  category: string;
  flags: FeatureFlag[];
}

@Component({
  selector: 'app-feature-management-page',
  imports: [FormsModule, TranslocoPipe],
  templateUrl: './feature-management-page.html',
  styleUrl: './feature-management-page.scss',
})
export class FeatureManagementPage implements OnInit {
  private readonly configService = inject(ConfigService);
  private readonly featureFlagsService = inject(FeatureFlagsService);
  private readonly transloco = inject(TranslocoService);

  protected readonly FEATURE_FLAGS = FEATURE_FLAGS;

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  /** The key of the flag currently being saved, if any — disables just that row's toggle. */
  protected readonly savingKey = signal<string | null>(null);
  protected readonly saveError = signal<string | null>(null);

  /** Google SSO's one required extra setting — shown only while that flag is enabled. */
  protected readonly googleClientId = signal('');
  protected readonly googleClientIdSaving = signal(false);
  protected readonly googleClientIdSaved = signal(false);
  protected readonly googleClientIdError = signal<string | null>(null);
  /** Masked by default, like a password field — the eye icon toggles it. */
  protected readonly showGoogleClientId = signal(false);

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

    this.configService.get(CONFIG_KEYS.googleSsoClientId).subscribe({
      next: (entry) => this.googleClientId.set(entry.value),
      // Not configured yet is expected — leave the field blank rather than showing an error.
      error: () => {},
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

  protected onGoogleClientIdChange(): void {
    this.googleClientIdSaved.set(false);
  }

  protected toggleGoogleClientIdVisibility(): void {
    this.showGoogleClientId.update((visible) => !visible);
  }

  protected saveGoogleClientId(): void {
    const value = this.googleClientId().trim();
    if (this.googleClientIdSaving() || !value) {
      return;
    }
    this.googleClientIdSaving.set(true);
    this.googleClientIdSaved.set(false);
    this.googleClientIdError.set(null);

    this.configService.upsert(CONFIG_KEYS.googleSsoClientId, value).subscribe({
      next: () => {
        this.googleClientIdSaving.set(false);
        this.googleClientIdSaved.set(true);
      },
      error: () => {
        this.googleClientIdSaving.set(false);
        this.googleClientIdError.set(this.transloco.translate('featureManagement.saveFailed'));
      },
    });
  }
}
