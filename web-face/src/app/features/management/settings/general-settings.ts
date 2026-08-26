import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { CONFIG_KEYS } from '../../../core/config-keys';
import { ConfigService } from '../../../core/services/config.service';

/**
 * Kept in sync with ImageStorageSettingsService.SUPPORTED_EXTENSIONS (core) — every extension has
 * a matching ImageIO reader on the backend, so real-content verification can actually check it.
 */
const SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];

/** Mirrors ImageStorageProperties' env-configured defaults, shown until an override is saved. */
const DEFAULT_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png'];
const DEFAULT_MAX_FILE_SIZE_MB = 5;

@Component({
  selector: 'app-general-settings',
  imports: [FormsModule, TranslocoPipe],
  templateUrl: './general-settings.html',
  styleUrl: './general-settings.scss',
})
export class GeneralSettings implements OnInit {
  private readonly configService = inject(ConfigService);
  private readonly transloco = inject(TranslocoService);

  protected readonly SUPPORTED_EXTENSIONS = SUPPORTED_EXTENSIONS;

  protected readonly basePath = signal('');
  protected readonly allowedExtensions = signal<string[]>([...DEFAULT_ALLOWED_EXTENSIONS]);
  protected readonly maxFileSizeMb = signal<number | null>(DEFAULT_MAX_FILE_SIZE_MB);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly canSave = computed(
    () => !this.saving() && this.allowedExtensions().length > 0 && (this.maxFileSizeMb() ?? 0) > 0,
  );

  private pendingLoads = 0;

  ngOnInit(): void {
    this.loading.set(true);
    this.pendingLoads = 3;

    this.configService.get(CONFIG_KEYS.imageStorageBasePath).subscribe({
      next: (entry) => {
        this.basePath.set(entry.value);
        this.settleLoad();
      },
      // Not configured yet is expected on a fresh install — the server falls back to its own default.
      error: () => this.settleLoad(),
    });

    this.configService.get(CONFIG_KEYS.imageStorageAllowedExtensions).subscribe({
      next: (entry) => {
        const extensions = entry.value
          .split(',')
          .map((extension) => extension.trim().toLowerCase())
          .filter((extension) => SUPPORTED_EXTENSIONS.includes(extension));
        this.allowedExtensions.set(extensions.length > 0 ? extensions : [...DEFAULT_ALLOWED_EXTENSIONS]);
        this.settleLoad();
      },
      error: () => this.settleLoad(),
    });

    this.configService.get(CONFIG_KEYS.imageStorageMaxFileSizeMb).subscribe({
      next: (entry) => {
        const megabytes = Number(entry.value);
        this.maxFileSizeMb.set(Number.isFinite(megabytes) && megabytes > 0 ? megabytes : DEFAULT_MAX_FILE_SIZE_MB);
        this.settleLoad();
      },
      error: () => this.settleLoad(),
    });
  }

  private settleLoad(): void {
    this.pendingLoads -= 1;
    if (this.pendingLoads <= 0) {
      this.loading.set(false);
    }
  }

  protected toggleExtension(extension: string): void {
    this.allowedExtensions.update((extensions) =>
      extensions.includes(extension) ? extensions.filter((e) => e !== extension) : [...extensions, extension],
    );
    this.onFieldChange();
  }

  protected onFieldChange(): void {
    this.saved.set(false);
  }

  protected save(): void {
    if (!this.canSave()) {
      return;
    }
    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);

    const basePath = this.basePath().trim();
    const extensions = this.allowedExtensions().join(',');
    const maxFileSizeMb = String(this.maxFileSizeMb());

    let pending = 3;
    let failed = false;
    const settleSave = () => {
      pending -= 1;
      if (pending > 0) {
        return;
      }
      this.saving.set(false);
      if (failed) {
        this.error.set(this.transloco.translate('generalSettings.saveFailed'));
      } else {
        this.saved.set(true);
      }
    };
    const onSaveError = () => {
      failed = true;
      settleSave();
    };

    this.configService.upsert(CONFIG_KEYS.imageStorageBasePath, basePath).subscribe({ next: settleSave, error: onSaveError });
    this.configService
      .upsert(CONFIG_KEYS.imageStorageAllowedExtensions, extensions)
      .subscribe({ next: settleSave, error: onSaveError });
    this.configService
      .upsert(CONFIG_KEYS.imageStorageMaxFileSizeMb, maxFileSizeMb)
      .subscribe({ next: settleSave, error: onSaveError });
  }
}
