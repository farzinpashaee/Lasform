import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { AuthService } from '../../core/auth/auth.service';
import { isValidEmail } from '../../core/auth/email.util';
import { SetupService } from '../../core/services/setup.service';
import { FeatureManagementPage } from '../management/settings/feature-management-page';
import { MapProviderSettings } from '../management/settings/map-provider-settings';

const TOTAL_STEPS = 3;

/**
 * First-run wizard shown at /setup whenever the install has zero users (see setupGuard). Step 1
 * (create the admin) is mandatory; steps 2/3 embed the existing Map Provider and Feature
 * Management settings pages verbatim — both are already fully self-contained standalone
 * components, so there's no separate "setup mode" version of that UI to maintain.
 */
@Component({
  selector: 'app-setup-wizard-page',
  imports: [FormsModule, TranslocoPipe, MapProviderSettings, FeatureManagementPage],
  templateUrl: './setup-wizard-page.html',
  styleUrl: './setup-wizard-page.scss',
})
export class SetupWizardPage implements OnInit {
  private readonly setupService = inject(SetupService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly TOTAL_STEPS = TOTAL_STEPS;
  protected readonly currentStep = signal(1);

  protected readonly displayName = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly emailError = signal<string | null>(null);

  /** True once step 1 has succeeded in this component instance — see ngOnInit's redirect check. */
  private sessionEstablishedHere = false;

  ngOnInit(): void {
    // A fresh check (not the cached app-initializer value) so a completed install's /setup link
    // bounces a brand-new visitor straight back out — but see the sessionEstablishedHere guard
    // below, which keeps someone who just finished step 1 on this page for steps 2/3.
    this.setupService.refreshStatus().subscribe((needsSetup) => {
      if (!needsSetup && !this.sessionEstablishedHere) {
        this.router.navigate(['/']);
      }
    });
  }

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

  protected submitAdmin(): void {
    const displayName = this.displayName().trim();
    const email = this.email().trim();
    const password = this.password();
    this.validateEmail();
    if (!displayName || !email || this.emailError() || password.length < 8 || this.submitting()) {
      return;
    }
    if (password !== this.confirmPassword()) {
      this.error.set(this.transloco.translate('auth.signUp.mismatch'));
      return;
    }
    this.submitting.set(true);
    this.error.set(null);

    this.setupService.createAdmin({ displayName, email, password }).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.authService.establishSession(response);
        this.sessionEstablishedHere = true;
        this.setupService.markSetupComplete();
        this.currentStep.set(2);
      },
      error: () => {
        this.submitting.set(false);
        this.error.set(this.transloco.translate('setup.admin.failed'));
      },
    });
  }

  protected goToStep(step: number): void {
    this.currentStep.set(step);
  }

  protected finish(): void {
    this.router.navigate(['/management']);
  }
}
