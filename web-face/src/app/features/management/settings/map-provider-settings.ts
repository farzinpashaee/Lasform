import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { MapProviderKind } from '../../../core/maps/map-provider.model';
import { ConfigService } from '../../../core/services/config.service';
import { CONFIG_KEYS } from '../../../core/config-keys';
import { MapSettingsService } from '../../../core/services/map-settings.service';

@Component({
  selector: 'app-map-provider-settings',
  imports: [FormsModule, TranslocoPipe],
  templateUrl: './map-provider-settings.html',
  styleUrl: './map-provider-settings.scss',
})
export class MapProviderSettings implements OnInit {
  private readonly settings = inject(MapSettingsService);
  private readonly configService = inject(ConfigService);
  private readonly transloco = inject(TranslocoService);

  protected readonly provider = signal<MapProviderKind>(this.settings.getProvider());
  protected readonly apiKey = signal('');
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.configService.get(CONFIG_KEYS.googleMapsApiKey).subscribe({
      next: (entry) => {
        this.apiKey.set(entry.value);
        this.loading.set(false);
      },
      // Not configured yet is expected on a fresh install — leave the field blank rather than showing an error.
      error: () => this.loading.set(false),
    });
  }

  protected save(): void {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);

    this.settings.saveProvider(this.provider());
    this.settings.saveApiKey(this.apiKey()).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
      },
      error: () => {
        this.saving.set(false);
        this.error.set(this.transloco.translate('mapProviderSettings.saveFailed'));
      },
    });
  }

  protected onFieldChange(): void {
    this.saved.set(false);
  }

  protected reload(): void {
    window.location.reload();
  }
}
