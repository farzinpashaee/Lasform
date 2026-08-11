import { Component, inject, signal, WritableSignal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

const DARK_MODE_STORAGE_KEY = 'lasform.darkMode';

interface NavLeaf {
  /** A transloco translation key, not display text — resolved in the template via the transloco pipe. */
  labelKey: string;
  path: string;
}

interface NavGroup {
  labelKey: string;
  children: NavLeaf[];
  /** Whether the group's children are shown; toggled by clicking the group header. */
  expanded: WritableSignal<boolean>;
}

@Component({
  selector: 'app-management-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslocoPipe],
  templateUrl: './management-shell.html',
  styleUrl: './management-shell.scss',
})
export class ManagementShell {
  private readonly router = inject(Router);

  protected readonly darkMode = signal(localStorage.getItem(DARK_MODE_STORAGE_KEY) === 'true');

  protected readonly navGroups: NavGroup[] = [
    {
      labelKey: 'management.settingsGroup',
      expanded: signal(true),
      children: [
        { labelKey: 'management.navMapProvider', path: 'settings/map-provider' },
        { labelKey: 'management.navWebFaceStyles', path: 'settings/web-face-styles' },
        { labelKey: 'management.navFeaturesManagement', path: 'settings/features-management' },
      ],
    },
  ];

  protected readonly navLinks: NavLeaf[] = [
    { labelKey: 'management.navUsers', path: 'users' },
    { labelKey: 'management.navLocations', path: 'locations' },
    { labelKey: 'management.navDevices', path: 'devices' },
    { labelKey: 'management.navCategories', path: 'categories' },
    { labelKey: 'management.navGeofences', path: 'geofences' },
  ];

  protected toggleGroup(group: NavGroup): void {
    group.expanded.update((expanded) => !expanded);
  }

  protected toggleDarkMode(): void {
    this.darkMode.update((enabled) => !enabled);
    localStorage.setItem(DARK_MODE_STORAGE_KEY, String(this.darkMode()));
  }

  protected backToMap(): void {
    this.router.navigate(['/']);
  }
}
