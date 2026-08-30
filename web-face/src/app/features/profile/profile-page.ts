import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { AuthService } from '../../core/auth/auth.service';
import { UserService } from '../../core/services/user.service';

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

  protected onFieldChange(): void {
    this.saved.set(false);
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
