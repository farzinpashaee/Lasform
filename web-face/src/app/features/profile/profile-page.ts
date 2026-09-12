import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { AuthService } from '../../core/auth/auth.service';
import { UserService } from '../../core/services/user.service';

/** A custom avatar upload can't be bigger than this in either dimension — enforced again server-side, this is just to fail fast client-side. */
const MAX_AVATAR_DIMENSION_PX = 512;
/** Mirrors UserManagementService's MAX_AVATAR_SIZE_BYTES. */
const MAX_AVATAR_SIZE_BYTES = 1024 * 1024;
/** Mirrors the formats UserManagementService's AVATAR_DATA_URL pattern accepts. */
const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

@Component({
  selector: 'app-profile-page',
  imports: [FormsModule, TranslocoPipe],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePage {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly email = computed(() => this.authService.currentUser()?.email ?? '');
  protected readonly displayName = signal(this.authService.currentUser()?.displayName ?? '');
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal<string | null>(null);

  /** A user-uploaded photo takes priority over Google's profile picture; null shows the letter avatar instead. */
  protected readonly avatarPreview = computed(
    () => this.authService.customAvatarImage() ?? this.authService.currentUser()?.avatarUrl ?? null,
  );
  protected readonly hasCustomAvatar = computed(() => this.authService.customAvatarImage() !== null);
  /** First letter of displayName if set, else of email — mirrors AccountMenu's accountLetter. */
  protected readonly accountLetter = computed(() => {
    const user = this.authService.currentUser();
    const source = (user?.displayName?.trim() || user?.email || '').trim();
    return source ? source.charAt(0).toUpperCase() : '?';
  });
  protected readonly avatarSaving = signal(false);
  protected readonly avatarError = signal<string | null>(null);

  protected onFieldChange(): void {
    this.saved.set(false);
  }

  /**
   * Validates size/type/dimensions client-side purely to fail fast with a specific message —
   * the backend re-derives all three from the decoded bytes regardless (see
   * UserManagementService#validateAvatarImage) since none of this can be trusted from the client.
   */
  protected onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file || this.avatarSaving()) {
      return;
    }

    this.avatarError.set(null);

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      this.avatarError.set(this.transloco.translate('profile.avatarInvalidType'));
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      this.avatarError.set(this.transloco.translate('profile.avatarTooLarge'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => this.checkDimensionsAndUpload(reader.result as string);
    reader.onerror = () => this.avatarError.set(this.transloco.translate('profile.avatarInvalidType'));
    reader.readAsDataURL(file);
  }

  private checkDimensionsAndUpload(dataUrl: string): void {
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth > MAX_AVATAR_DIMENSION_PX || image.naturalHeight > MAX_AVATAR_DIMENSION_PX) {
        this.avatarError.set(this.transloco.translate('profile.avatarDimensionsTooLarge'));
        return;
      }
      this.uploadAvatar(dataUrl);
    };
    image.onerror = () => this.avatarError.set(this.transloco.translate('profile.avatarInvalidType'));
    image.src = dataUrl;
  }

  private uploadAvatar(dataUrl: string): void {
    this.avatarSaving.set(true);
    this.userService.uploadOwnAvatar(dataUrl).subscribe({
      next: () => {
        this.authService.setCustomAvatarImage(dataUrl);
        // Best-effort — the letter/Google-photo state is still correct without it, this just keeps hasCustomAvatar in sync for the next refresh cycle.
        this.authService.refreshAccessToken().subscribe({ error: () => undefined });
        this.avatarSaving.set(false);
      },
      error: () => {
        this.avatarSaving.set(false);
        this.avatarError.set(this.transloco.translate('profile.avatarSaveFailed'));
      },
    });
  }

  protected removeAvatar(): void {
    if (this.avatarSaving()) {
      return;
    }
    this.avatarSaving.set(true);
    this.avatarError.set(null);
    this.userService.deleteOwnAvatar().subscribe({
      next: () => {
        this.authService.setCustomAvatarImage(null);
        this.authService.refreshAccessToken().subscribe({ error: () => undefined });
        this.avatarSaving.set(false);
      },
      error: () => {
        this.avatarSaving.set(false);
        this.avatarError.set(this.transloco.translate('profile.avatarSaveFailed'));
      },
    });
  }

  protected save(): void {
    const name = this.displayName().trim();
    if (!name || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);

    this.userService.updateOwnProfile(name).subscribe({
      next: () => {
        // Refreshes the access token so the new displayName shows up immediately (e.g. in the account popup).
        this.authService.refreshAccessToken().subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.set(true);
          },
          error: () => {
            this.saving.set(false);
            this.saved.set(true);
          },
        });
      },
      error: () => {
        this.saving.set(false);
        this.error.set(this.transloco.translate('profile.saveFailed'));
      },
    });
  }

  protected signOut(): void {
    this.authService.logout();
    this.router.navigateByUrl('/');
  }

  protected backToMap(): void {
    this.router.navigateByUrl('/');
  }
}
