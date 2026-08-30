import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../core/auth/auth.service';

/**
 * The account avatar + its dropdown popup — shared by every top-level page that has a header
 * (map, management shell, ...) so login/logout/profile behavior stays identical everywhere
 * instead of being reimplemented per page.
 */
@Component({
  selector: 'app-account-menu',
  imports: [TranslocoPipe],
  templateUrl: './account-menu.html',
  styleUrl: './account-menu.scss',
})
export class AccountMenu {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(false);

  /** First letter of displayName if set, else of email — never blank while logged in. */
  protected readonly accountLetter = computed(() => {
    const user = this.authService.currentUser();
    const source = (user?.displayName?.trim() || user?.email || '').trim();
    return source ? source.charAt(0).toUpperCase() : '?';
  });

  @HostListener('document:keydown.escape')
  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected onAvatarClick(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.menuOpen.update((open) => !open);
  }

  protected goToProfile(): void {
    this.closeMenu();
    this.router.navigate(['/profile']);
  }

  protected signOut(): void {
    this.closeMenu();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
