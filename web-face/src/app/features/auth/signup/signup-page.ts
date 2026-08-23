import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { AuthService } from '../../../core/auth/auth.service';
import { isValidEmail } from '../../../core/auth/email.util';
import { GoogleAuthService, GoogleSignInCancelledError } from '../../../core/auth/google-auth.service';
import { FEATURE_FLAGS } from '../../../core/feature-flag-keys';
import { FeatureFlagsService } from '../../../core/services/feature-flags.service';
import { SignUpRequest, UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-signup-page',
  imports: [FormsModule, RouterLink, TranslocoPipe],
  templateUrl: './signup-page.html',
  styleUrl: './signup-page.scss',
})
export class SignUpPage {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly googleAuthService = inject(GoogleAuthService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  protected readonly featureFlags = inject(FeatureFlagsService);
  protected readonly FEATURE_FLAGS = FEATURE_FLAGS;

  protected readonly fullName = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly emailError = signal<string | null>(null);
  protected readonly success = signal(false);
  protected readonly googleSubmitting = signal(false);

  protected togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((visible) => !visible);
  }

  /** Called on blur, and again before submit in case the user pastes+submits without blurring. */
  protected validateEmail(): void {
    const value = this.email().trim();
    this.emailError.set(value && !isValidEmail(value) ? this.transloco.translate('auth.invalidEmailFormat') : null);
  }

  protected submit(): void {
    const fullName = this.fullName().trim();
    const email = this.email().trim();
    const password = this.password();
    this.validateEmail();
    if (!fullName || !email || this.emailError() || password.length < 8 || this.submitting()) {
      return;
    }
    if (password !== this.confirmPassword()) {
      this.error.set(this.transloco.translate('auth.signUp.mismatch'));
      return;
    }
    this.submitting.set(true);
    this.error.set(null);

    const request: SignUpRequest = { fullName, email, password };
    this.userService.signUp(request).subscribe({
      next: () => {
        this.submitting.set(false);
        this.success.set(true);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        const duplicateEmail = err instanceof HttpErrorResponse && err.status === 409;
        this.error.set(this.transloco.translate(duplicateEmail ? 'auth.signUp.duplicateEmail' : 'auth.signUp.failed'));
      },
    });
  }

  /**
   * Same endpoint/outcome as the login page's Google button — see AuthService.loginWithGoogle. An
   * account that already exists and is active just gets logged straight in (no reason to make
   * someone who clicked "Sign up" by mistake, or who forgot they already have an account, hit a
   * dead end); a new or still-pending account reuses this page's regular success message.
   */
  protected async signUpWithGoogle(): Promise<void> {
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
            this.success.set(true);
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
    this.router.navigate([this.authService.mustResetPassword() ? '/reset-password' : '/']);
  }
}
