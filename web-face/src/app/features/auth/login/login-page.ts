import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, TranslocoPipe],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly transloco = inject(TranslocoService);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // Already logged in (e.g. restored session) and landed on /login anyway — just move on.
    if (this.authService.isAuthenticated()) {
      this.redirectAfterLogin();
    }
  }

  protected submit(): void {
    const email = this.email().trim();
    const password = this.password();
    if (!email || !password || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);

    this.authService.login(email, password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.redirectAfterLogin();
      },
      error: () => {
        this.submitting.set(false);
        this.error.set(this.transloco.translate('auth.login.invalidCredentials'));
      },
    });
  }

  protected close(): void {
    this.router.navigate(['/']);
  }

  private redirectAfterLogin(): void {
    if (this.authService.mustResetPassword()) {
      this.router.navigate(['/reset-password']);
      return;
    }
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.router.navigateByUrl(returnUrl && returnUrl !== '/login' ? returnUrl : '/');
  }
}
