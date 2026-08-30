import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { Device } from '../../../core/models/device.model';
import { GeofenceStatus } from '../../../core/models/enums';
import { Geofence } from '../../../core/models/geofence.model';
import { DeviceService } from '../../../core/services/device.service';
import { GeofenceService } from '../../../core/services/geofence.service';

const GEOFENCE_STATUSES: GeofenceStatus[] = ['ACTIVE', 'INACTIVE'];

@Component({
  selector: 'app-geofences-page',
  imports: [FormsModule, TranslocoPipe],
  templateUrl: './geofences-page.html',
  styleUrl: './geofences-page.scss',
})
export class GeofencesPage implements OnInit {
  private readonly geofenceService = inject(GeofenceService);
  private readonly deviceService = inject(DeviceService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly geofenceStatuses = GEOFENCE_STATUSES;

  protected readonly geofences = signal<Geofence[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);

  protected readonly devices = signal<Device[]>([]);
  private readonly deviceMap = computed(() => {
    const map = new Map<string, Device>();
    for (const device of this.devices()) {
      if (device.id) {
        map.set(device.id, device);
      }
    }
    return map;
  });

  protected readonly addMenuOpen = signal(false);

  protected readonly editTarget = signal<Geofence | null>(null);
  protected readonly editName = signal('');
  protected readonly editDescription = signal('');
  protected readonly editStatus = signal<GeofenceStatus>('ACTIVE');
  protected readonly editDeviceIds = signal<string[]>([]);
  protected readonly editDeviceInput = signal('');
  protected readonly editSaving = signal(false);
  protected readonly editError = signal<string | null>(null);
  protected readonly editDeviceSuggestions = computed(() => {
    const query = this.editDeviceInput().trim().toLowerCase();
    if (!query) {
      return [];
    }
    const selected = new Set(this.editDeviceIds());
    return this.devices()
      .filter((device) => device.id && !selected.has(device.id) && device.name.toLowerCase().includes(query))
      .slice(0, 8);
  });

  protected readonly deleteTarget = signal<Geofence | null>(null);
  protected readonly deletingGeofence = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  private editingGeofence: Geofence | null = null;

  ngOnInit(): void {
    this.loadGeofences();
    this.deviceService.findAll({ size: 200 }).subscribe({
      next: (page) => this.devices.set(page.content),
      error: () => {},
    });
  }

  private loadGeofences(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.geofenceService.findAll({ size: 100, sort: 'name,asc' }).subscribe({
      next: (page) => {
        this.loading.set(false);
        this.geofences.set(page.content);
      },
      error: () => {
        this.loading.set(false);
        this.geofences.set([]);
        this.loadError.set(this.transloco.translate('geofences.loadFailed'));
      },
    });
  }

  protected deviceLabel(deviceId: string): string {
    return this.deviceMap().get(deviceId)?.name ?? deviceId;
  }

  protected toggleAddMenu(): void {
    this.addMenuOpen.update((open) => !open);
  }

  protected closeAddMenu(): void {
    this.addMenuOpen.set(false);
  }

  /** Creation always starts on the map — geometry can't reasonably be typed into a form. */
  protected addGeofenceOnMap(kind: 'circle' | 'polygon'): void {
    this.closeAddMenu();
    this.router.navigate(['/'], { queryParams: { drawGeofence: kind } });
  }

  protected viewOnMap(geofence: Geofence): void {
    if (!geofence.id) {
      return;
    }
    this.router.navigate(['/'], { queryParams: { geofenceId: geofence.id } });
  }

  protected openEditModal(geofence: Geofence): void {
    this.editingGeofence = geofence;
    this.editTarget.set(geofence);
    this.editName.set(geofence.name ?? '');
    this.editDescription.set(geofence.description ?? '');
    this.editStatus.set(geofence.status ?? 'ACTIVE');
    this.editDeviceIds.set([...(geofence.deviceIds ?? [])]);
    this.editDeviceInput.set('');
    this.editError.set(null);
  }

  protected closeEditModal(): void {
    this.editTarget.set(null);
    this.editSaving.set(false);
  }

  protected onEditDeviceInputChange(value: string): void {
    this.editDeviceInput.set(value);
  }

  protected addEditDevice(deviceId: string): void {
    if (!this.editDeviceIds().includes(deviceId)) {
      this.editDeviceIds.update((ids) => [...ids, deviceId]);
    }
    this.editDeviceInput.set('');
  }

  protected removeEditDevice(deviceId: string): void {
    this.editDeviceIds.update((ids) => ids.filter((id) => id !== deviceId));
  }

  protected submitEdit(): void {
    const name = this.editName().trim();
    const original = this.editingGeofence;
    if (!original?.id || !name || this.editSaving()) {
      return;
    }
    this.editSaving.set(true);
    this.editError.set(null);

    // Full merged object, not a sparse partial — the backend's update() blindly copies every
    // field present in the body (see GeofenceServiceImpl#applyUpdate), so omitting the shape
    // fields here would null them out. This form never touches geometry, so it's spread through
    // unchanged from the original.
    const updated: Geofence = {
      ...original,
      name,
      description: this.editDescription().trim() || undefined,
      status: this.editStatus(),
      deviceIds: this.editDeviceIds(),
    };
    this.geofenceService.update(original.id, updated).subscribe({
      next: () => {
        this.editSaving.set(false);
        this.closeEditModal();
        this.loadGeofences();
      },
      error: () => {
        this.editSaving.set(false);
        this.editError.set(this.transloco.translate('geofences.saveFailed'));
      },
    });
  }

  protected openDeleteConfirm(geofence: Geofence): void {
    this.deleteTarget.set(geofence);
    this.deleteError.set(null);
  }

  protected closeDeleteConfirm(): void {
    this.deleteTarget.set(null);
    this.deletingGeofence.set(false);
  }

  protected confirmDelete(): void {
    const geofence = this.deleteTarget();
    if (!geofence?.id || this.deletingGeofence()) {
      return;
    }
    this.deletingGeofence.set(true);
    this.deleteError.set(null);

    this.geofenceService.deleteById(geofence.id).subscribe({
      next: () => {
        this.deletingGeofence.set(false);
        this.closeDeleteConfirm();
        this.loadGeofences();
      },
      error: () => {
        this.deletingGeofence.set(false);
        this.deleteError.set(this.transloco.translate('geofences.deleteFailed'));
      },
    });
  }
}
