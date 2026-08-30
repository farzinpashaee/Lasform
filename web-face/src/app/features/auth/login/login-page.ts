import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { AuthService } from '../../../core/auth/auth.service';
import { isValidEmail } from '../../../core/auth/email.util';
import { GoogleAuthService, GoogleSignInCancelledError } from '../../../core/auth/google-auth.service';
import { FEATURE_FLAGS } from '../../../core/feature-flag-keys';
import { FeatureFlagsService } from '../../../core/services/feature-flags.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, RouterLink, TranslocoPipe],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly googleAuthService = inject(GoogleAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly featureFlags = inject(FeatureFlagsService);
  protected readonly FEATURE_FLAGS = FEATURE_FLAGS;
  private readonly transloco = inject(TranslocoService);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly showPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly emailError = signal<string | null>(null);

  protected readonly googleSubmitting = signal(false);
  /** True once a Google sign-in succeeded but the account is new/still awaiting admin approval — see AuthService.loginWithGoogle. */
  protected readonly googlePending = signal(false);

  constructor() {
    // Already logged in (e.g. restored session) and landed on /login anyway — just move on.
    if (this.authService.isAuthenticated()) {
      this.redirectAfterLogin();
    }
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  /** Called on blur, and again before submit in case the user pastes+submits without blurring. */
  protected validateEmail(): void {
    const value = this.email().trim();
    this.emailError.set(value && !isValidEmail(value) ? this.transloco.translate('auth.invalidEmailFormat') : null);
  }

  protected submit(): void {
    const email = this.email().trim();
    const password = this.password();
    this.validateEmail();
    if (!email || !password || this.emailError() || this.submitting()) {
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

  protected async signInWithGoogle(): Promise<void> {
    if (this.googleSubmitting()) {
      return;
    }
    this.googleSubmitting.set(true);
    this.error.set(null);

    try {
      const googleAccessToken = await this.googleAuthService.requestAccessToken();
      this.authService.loginWithGoogle(googleAccessToken).subscribe({
        next: (pendingApproval) => {
          this.googleSubmitting.set(false);
          if (pendingApproval) {
            this.googlePending.set(true);
          } else {
            this.redirectAfterLogin();
          }
        },
        error: () => {
          this.googleSubmitting.set(false);
          this.error.set(this.transloco.translate('auth.google.failed'));
        },
      });
    } catch (err) {
      this.googleSubmitting.set(false);
      // The user closing the popup or declining consent isn't an error — nothing to show.
      if (!(err instanceof GoogleSignInCancelledError)) {
        this.error.set(this.transloco.translate('auth.google.failed'));
      }
    }
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
