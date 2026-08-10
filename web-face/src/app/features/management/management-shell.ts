import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

const DARK_MODE_STORAGE_KEY = 'lasform.darkMode';

interface NavLeaf {
  label: string;
  path: string;
}

interface NavGroup {
  label: string;
  children: NavLeaf[];
}

@Component({
  selector: 'app-management-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './management-shell.html',
  styleUrl: './management-shell.scss',
})
export class ManagementShell {
  private readonly router = inject(Router);

  protected readonly darkMode = signal(localStorage.getItem(DARK_MODE_STORAGE_KEY) === 'true');

  protected readonly navGroups: NavGroup[] = [
    {
      label: 'Settings',
      children: [
        { label: 'Map Provider', path: 'settings/map-provider' },
        { label: 'Web Face Styles', path: 'settings/web-face-styles' },
      ],
    },
  ];

  protected readonly navLinks: NavLeaf[] = [
    { label: 'Users', path: 'users' },
    { label: 'Locations', path: 'locations' },
    { label: 'Devices', path: 'devices' },
    { label: 'Categories', path: 'categories' },
    { label: 'Geofences', path: 'geofences' },
  ];

  protected toggleDarkMode(): void {
    this.darkMode.update((enabled) => !enabled);
    localStorage.setItem(DARK_MODE_STORAGE_KEY, String(this.darkMode()));
  }

  protected backToMap(): void {
    this.router.navigate(['/']);
  }
}
