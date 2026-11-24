import { Component, inject, signal, WritableSignal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { HasPermissionDirective } from '../../core/auth/has-permission.directive';
import { FEATURE_FLAGS } from '../../core/feature-flag-keys';
import { FeatureFlagsService } from '../../core/services/feature-flags.service';
import { AccountMenu } from '../../shared/account-menu/account-menu';

const DARK_MODE_STORAGE_KEY = 'lasform.darkMode';

interface NavLeaf {
  /** A transloco translation key, not display text — resolved in the template via the transloco pipe. */
  labelKey: string;
  path: string;
  /** Material Symbols Outlined icon name, shown before the label. */
  icon: string;
  /** Omitted for leaves that only require being logged in (enforced by the route's canActivateChild already). */
  permission?: string;
}

interface NavGroup {
  labelKey: string;
  icon: string;
  children: NavLeaf[];
  /** Whether the group's children are shown; toggled by clicking the group header. */
  expanded: WritableSignal<boolean>;
}

@Component({
  selector: 'app-management-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslocoPipe, HasPermissionDirective, AccountMenu],
  templateUrl: './management-shell.html',
  styleUrl: './management-shell.scss',
})
export class ManagementShell {
  private readonly router = inject(Router);
  protected readonly featureFlags = inject(FeatureFlagsService);
  protected readonly FEATURE_FLAGS = FEATURE_FLAGS;

  protected readonly darkMode = signal(localStorage.getItem(DARK_MODE_STORAGE_KEY) === 'true');

  /** Off-canvas nav drawer state, mobile only (see management-shell.scss's breakpoint) — the
   *  sidebar stays permanently visible above that breakpoint regardless of this signal. */
  protected readonly sidebarOpen = signal(false);

  protected readonly navGroups: NavGroup[] = [
    {
      labelKey: 'management.settingsGroup',
      icon: 'settings',
      expanded: signal(false),
      children: [
        { labelKey: 'management.navGeneralSettings', path: 'settings/general', icon: 'tune', permission: 'config:write' },
        { labelKey: 'management.navMapProvider', path: 'settings/map-provider', icon: 'map', permission: 'config:write' },
        {
          labelKey: 'management.navFeaturesManagement',
          path: 'settings/features-management',
          icon: 'toggle_on',
          permission: 'config:write',
        },
      ],
    },
  ];

  protected readonly navLinks: NavLeaf[] = [
    { labelKey: 'management.navLocations', path: 'locations', icon: 'location_on', permission: 'location:read' },
    { labelKey: 'management.navDevices', path: 'devices', icon: 'smartphone', permission: 'device:read' },
    { labelKey: 'management.navCategories', path: 'categories', icon: 'category' },
    { labelKey: 'management.navUsers', path: 'users', icon: 'group', permission: 'user:read' },
    { labelKey: 'management.navGeofences', path: 'geofences', icon: 'draw', permission: 'geofence:read' },
  ];

  protected toggleGroup(group: NavGroup): void {
    group.expanded.update((expanded) => !expanded);
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  protected toggleDarkMode(): void {
    this.darkMode.update((enabled) => !enabled);
    localStorage.setItem(DARK_MODE_STORAGE_KEY, String(this.darkMode()));
  }

  protected backToMap(): void {
    this.router.navigate(['/']);
  }
}
