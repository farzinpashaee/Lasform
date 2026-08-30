import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-reset-password-page',
  imports: [FormsModule, TranslocoPipe],
  templateUrl: './reset-password-page.html',
  styleUrl: './reset-password-page.scss',
})
export class ResetPasswordPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    const newPassword = this.newPassword();
    if (newPassword.length < 8 || this.submitting()) {
      return;
    }
    if (newPassword !== this.confirmPassword()) {
      this.error.set(this.transloco.translate('auth.resetPassword.mismatch'));
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.authService.resetPassword(newPassword).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl('/');
      },
      error: () => {
        this.submitting.set(false);
        this.error.set(this.transloco.translate('auth.resetPassword.failed'));
      },
    });
  }
}
