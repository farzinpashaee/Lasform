import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MapProviderKind } from '../../../core/maps/map-provider.model';
import { MapSettingsService } from '../../../core/services/map-settings.service';

@Component({
  selector: 'app-map-provider-settings',
  imports: [FormsModule],
  templateUrl: './map-provider-settings.html',
  styleUrl: './map-provider-settings.scss',
})
export class MapProviderSettings {
  private readonly settings = inject(MapSettingsService);

  protected readonly provider = signal<MapProviderKind>(this.settings.getProvider());
  protected readonly apiKey = signal(this.settings.getApiKey());
  protected readonly saved = signal(false);

  protected save(): void {
    this.settings.save(this.provider(), this.apiKey().trim());
    this.saved.set(true);
  }

  protected onFieldChange(): void {
    this.saved.set(false);
  }

  protected reload(): void {
    window.location.reload();
  }
}
