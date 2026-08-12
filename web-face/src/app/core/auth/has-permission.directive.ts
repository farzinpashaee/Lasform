import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';

import { AuthService } from './auth.service';

/**
 * `*hasPermission="'device:write'"` (or an array, `*hasPermission="['a', 'b']"`, requiring all of
 * them) shows/hides its host element based on the current access token's permissions.
 *
 * This is COSMETIC ONLY — it just hides a button so a user isn't invited to click something the
 * backend will reject. It is not a security boundary: anyone can inspect/modify the DOM, and every
 * endpoint is independently enforced server-side via `@PreAuthorize` regardless of what this
 * directive does or doesn't render. Never rely on this directive alone to protect sensitive data —
 * only ever use it to declutter the UI.
 */
@Directive({ selector: '[hasPermission]' })
export class HasPermissionDirective {
  private readonly authService = inject(AuthService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  private requiredPermissions: string[] = [];
  private hasView = false;

  @Input({ required: true })
  set hasPermission(value: string | string[]) {
    this.requiredPermissions = Array.isArray(value) ? value : [value];
    this.updateView();
  }

  constructor() {
    effect(() => {
      this.authService.currentPermissions();
      this.updateView();
    });
  }

  private updateView(): void {
    const allowed = this.requiredPermissions.every((key) => this.authService.hasPermission(key));

    if (allowed && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!allowed && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
