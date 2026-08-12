import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-not-authorized-page',
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './not-authorized-page.html',
  styleUrl: './not-authorized-page.scss',
})
export class NotAuthorizedPage {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
