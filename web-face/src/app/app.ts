import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAP_PROVIDER, MapContextMenuEvent, MapMarkerData, MapProvider } from './core/maps';
import { Device } from './core/models/device.model';
import { DeviceStatus } from './core/models/enums';
import { Location } from './core/models/location.model';
import { SearchHit } from './core/models/search.model';
import { DeviceService } from './core/services/device.service';
import { LocationService } from './core/services/location.service';
import { SearchService } from './core/services/search.service';

const DEVICE_STATUSES: DeviceStatus[] = ['ACTIVE', 'INACTIVE', 'OFFLINE', 'MAINTENANCE', 'DECOMMISSIONED'];

interface MapContextMenuState {
  lat: number;
  lng: number;
  x: number;
  y: number;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements AfterViewInit, OnDestroy {
  protected readonly title = signal('LasformWebFace');

  private readonly locationService = inject(LocationService);
  private readonly deviceService = inject(DeviceService);
  private readonly searchService = inject(SearchService);
  private readonly mapProvider: MapProvider = inject(MAP_PROVIDER);

  private readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  /** All locations shown as markers before any search; looked up on marker click when hasSearched() is false. */
  private allLocationHits: SearchHit[] = [];

  protected readonly searchQuery = signal('');
  protected readonly searchResults = signal<SearchHit[]>([]);
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);
  protected readonly hasSearched = signal(false);
  protected readonly selectedResult = signal<SearchHit | null>(null);
  protected readonly locating = signal(false);
  protected readonly clusteringEnabled = signal(false);

  protected readonly mapContextMenu = signal<MapContextMenuState | null>(null);
  protected readonly newLocationTarget = signal<{ lat: number; lng: number } | null>(null);
  protected readonly newLocationName = signal('');
  protected readonly newLocationDescription = signal('');
  protected readonly addingLocation = signal(false);
  protected readonly addLocationError = signal<string | null>(null);

  protected readonly deviceStatuses = DEVICE_STATUSES;
  protected readonly editingTarget = signal<SearchHit | null>(null);
  protected readonly editName = signal('');
  protected readonly editDescription = signal('');
  protected readonly editStatus = signal<DeviceStatus | ''>('');
  protected readonly savingEdit = signal(false);
  protected readonly editError = signal<string | null>(null);

  protected readonly deleteTarget = signal<SearchHit | null>(null);
  protected readonly deletingEntity = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  async ngAfterViewInit(): Promise<void> {
    await this.mapProvider.initialize(this.mapContainer().nativeElement, {
      center: { lat: 43.8628, lng: -79.4308 },
      zoom: 14,
    });

    this.loadLocationMarkers();
    this.mapProvider.onContextMenu((event) => this.openMapContextMenu(event));
  }

  @HostListener('document:keydown.escape')
  protected closeOverlays(): void {
    this.mapContextMenu.set(null);
    this.closeAddLocationModal();
    this.closeEditModal();
    this.closeDeleteConfirm();
  }

  ngOnDestroy(): void {
    this.mapProvider.destroy();
  }

  private loadLocationMarkers(): void {
    this.locationService.findAll({ size: 200 }).subscribe((page) => {
      this.allLocationHits = page.content.map((location) => ({ type: 'LOCATION' as const, data: location }));
      const markers = page.content.map((location) => {
        const [lng, lat] = location.point.coordinates;
        return { id: location.id, lat, lng, title: location.name };
      });
      this.mapProvider.setMarkers(markers, (id) => this.onMarkerClicked(id));
    });
  }

  protected toggleClustering(): void {
    this.clusteringEnabled.update((enabled) => !enabled);
    this.mapProvider.setClusteringEnabled(this.clusteringEnabled());
  }

  protected zoomIn(): void {
    this.mapProvider.zoomIn();
  }

  protected zoomOut(): void {
    this.mapProvider.zoomOut();
  }

  protected locateMe(): void {
    if (!navigator.geolocation || this.locating()) {
      return;
    }
    this.locating.set(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Guards against the map already being centered there, where moveend/idle may never fire.
        const stopLoading = () => this.locating.set(false);
        const fallback = setTimeout(stopLoading, 3000);
        this.mapProvider.panTo(latitude, longitude, 15, () => {
          clearTimeout(fallback);
          stopLoading();
        });
      },
      () => this.locating.set(false),
    );
  }

  private openMapContextMenu(event: MapContextMenuEvent): void {
    const menuSize = { width: 220, height: 132 };
    const x = Math.min(event.clientX, window.innerWidth - menuSize.width - 8);
    const y = Math.min(event.clientY, window.innerHeight - menuSize.height - 8);
    this.mapContextMenu.set({ lat: event.lat, lng: event.lng, x, y });
  }

  protected closeMapContextMenu(): void {
    this.mapContextMenu.set(null);
  }

  protected copyMapContextCoordinates(): void {
    const menu = this.mapContextMenu();
    if (!menu) {
      return;
    }
    navigator.clipboard?.writeText(`${menu.lat.toFixed(5)},${menu.lng.toFixed(5)}`).catch(() => {
      // Clipboard access can be denied (permissions, insecure context, ...); not worth surfacing to the user.
    });
    this.closeMapContextMenu();
  }

  protected centerMapContextMenuHere(): void {
    const menu = this.mapContextMenu();
    if (!menu) {
      return;
    }
    this.mapProvider.panTo(menu.lat, menu.lng);
    this.closeMapContextMenu();
  }

  protected openAddLocationModal(): void {
    const menu = this.mapContextMenu();
    if (!menu) {
      return;
    }
    this.newLocationTarget.set({ lat: menu.lat, lng: menu.lng });
    this.newLocationName.set('');
    this.newLocationDescription.set('');
    this.addLocationError.set(null);
    this.closeMapContextMenu();
  }

  protected closeAddLocationModal(): void {
    this.newLocationTarget.set(null);
    this.addingLocation.set(false);
  }

  protected submitAddLocation(): void {
    const target = this.newLocationTarget();
    const name = this.newLocationName().trim();
    if (!target || !name || this.addingLocation()) {
      return;
    }
    this.addingLocation.set(true);
    this.addLocationError.set(null);

    const location: Location = {
      point: { type: 'Point', coordinates: [target.lng, target.lat] },
      name,
      description: this.newLocationDescription().trim() || undefined,
      recordedAt: new Date().toISOString(),
    };

    this.locationService.create(location).subscribe({
      next: () => {
        this.addingLocation.set(false);
        this.closeAddLocationModal();
        this.loadLocationMarkers();
      },
      error: () => {
        this.addingLocation.set(false);
        this.addLocationError.set('Failed to add location. Please try again.');
      },
    });
  }

  protected onSearchSubmit(): void {
    const query = this.searchQuery().trim();
    if (!query) {
      return;
    }
    this.hasSearched.set(true);
    this.searching.set(true);
    this.searchError.set(null);
    this.selectedResult.set(null);

    this.searchService.search({ q: query, size: 50 }).subscribe({
      next: (page) => {
        this.searching.set(false);
        this.searchResults.set(page.content);
        this.showResultsOnMap(page.content);
      },
      error: () => {
        this.searching.set(false);
        this.searchResults.set([]);
        this.searchError.set('Search failed. Please try again.');
      },
    });
  }

  protected selectResult(hit: SearchHit): void {
    this.selectedResult.set(hit);

    const point = this.hitPoint(hit);
    if (!point) {
      return;
    }
    const [lng, lat] = point.coordinates;
    this.mapProvider.panTo(lat, lng, 16);
    if (hit.data.id) {
      this.mapProvider.openMarkerPopup(hit.data.id);
    }
  }

  protected closeDetails(): void {
    this.selectedResult.set(null);
  }

  protected openEditModal(hit: SearchHit): void {
    this.editingTarget.set(hit);
    this.editName.set(hit.data.name ?? '');
    this.editDescription.set(hit.type === 'LOCATION' ? ((hit.data as Location).description ?? '') : '');
    this.editStatus.set(hit.type === 'DEVICE' ? ((hit.data as Device).status ?? '') : '');
    this.editError.set(null);
  }

  protected closeEditModal(): void {
    this.editingTarget.set(null);
    this.savingEdit.set(false);
  }

  protected submitEdit(): void {
    const hit = this.editingTarget();
    const name = this.editName().trim();
    if (!hit || !hit.data.id || !name || this.savingEdit()) {
      return;
    }
    this.savingEdit.set(true);
    this.editError.set(null);
    const id = hit.data.id;

    if (hit.type === 'LOCATION') {
      // Send the full current object back, not just the edited fields — the backend's
      // update() replaces whatever fields are present in the body, so a sparse partial
      // would wipe categoryIds/tags/images/etc. that aren't part of this form.
      const updated: Location = { ...(hit.data as Location), name, description: this.editDescription().trim() || undefined };
      this.locationService.update(id, updated).subscribe({
        next: (saved) => this.applyHitUpdate({ type: 'LOCATION', data: saved }),
        error: () => this.handleEditError(),
      });
    } else {
      const updated: Device = { ...(hit.data as Device), name, status: this.editStatus() || undefined };
      this.deviceService.update(id, updated).subscribe({
        next: (saved) => this.applyHitUpdate({ type: 'DEVICE', data: saved }),
        error: () => this.handleEditError(),
      });
    }
  }

  private applyHitUpdate(hit: SearchHit): void {
    this.savingEdit.set(false);
    this.closeEditModal();
    this.selectedResult.set(hit);
    this.searchResults.update((results) => results.map((r) => (r.data.id === hit.data.id ? hit : r)));
    this.refreshMapMarkers();
  }

  private handleEditError(): void {
    this.savingEdit.set(false);
    this.editError.set('Failed to save changes. Please try again.');
  }

  protected openDeleteConfirm(hit: SearchHit): void {
    this.deleteTarget.set(hit);
    this.deleteError.set(null);
  }

  protected closeDeleteConfirm(): void {
    this.deleteTarget.set(null);
    this.deletingEntity.set(false);
  }

  protected confirmDelete(): void {
    const hit = this.deleteTarget();
    if (!hit || !hit.data.id || this.deletingEntity()) {
      return;
    }
    this.deletingEntity.set(true);
    this.deleteError.set(null);
    const id = hit.data.id;

    const request = hit.type === 'LOCATION' ? this.locationService.deleteById(id) : this.deviceService.deleteById(id);
    request.subscribe({
      next: () => {
        this.deletingEntity.set(false);
        this.closeDeleteConfirm();
        this.closeDetails();
        this.searchResults.update((results) => results.filter((r) => r.data.id !== id));
        this.allLocationHits = this.allLocationHits.filter((h) => h.data.id !== id);
        this.refreshMapMarkers();
      },
      error: () => {
        this.deletingEntity.set(false);
        this.deleteError.set('Failed to delete. Please try again.');
      },
    });
  }

  /** Re-renders whichever marker set is currently shown (search results, or all locations) after an edit/delete. */
  private refreshMapMarkers(): void {
    if (this.hasSearched()) {
      this.renderSearchMarkers(this.searchResults());
    } else {
      this.loadLocationMarkers();
    }
  }

  private onMarkerClicked(id: string): void {
    const source = this.hasSearched() ? this.searchResults() : this.allLocationHits;
    const hit = source.find((candidate) => candidate.data.id === id);
    if (hit) {
      this.selectedResult.set(hit);
    }
  }

  protected resultTitle(hit: SearchHit): string {
    return hit.data.name || (hit.type === 'LOCATION' ? 'Unnamed location' : 'Unnamed device');
  }

  protected resultSubtitle(hit: SearchHit): string {
    if (hit.type === 'LOCATION') {
      const location = hit.data as Location;
      return location.address?.address || location.description || 'Location';
    }
    const device = hit.data as Device;
    return device.deviceIdentifier || 'Device';
  }

  protected resultDetailFields(hit: SearchHit): { label: string; value: string }[] {
    if (hit.type === 'LOCATION') {
      return this.locationDetailFields(hit.data as Location);
    }
    return this.deviceDetailFields(hit.data as Device);
  }

  private locationDetailFields(location: Location): { label: string; value: string }[] {
    const fields: { label: string; value: string }[] = [];
    if (location.description) {
      fields.push({ label: 'Description', value: location.description });
    }
    const address = [location.address?.address, location.address?.city, location.address?.country]
      .filter(Boolean)
      .join(', ');
    if (address) {
      fields.push({ label: 'Address', value: address });
    }
    const [lng, lat] = location.point.coordinates;
    fields.push({ label: 'Coordinates', value: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    if (location.recordedAt) {
      fields.push({ label: 'Recorded', value: new Date(location.recordedAt).toLocaleString() });
    }
    if (location.tags?.length) {
      fields.push({ label: 'Tags', value: location.tags.join(', ') });
    }
    return fields;
  }

  private deviceDetailFields(device: Device): { label: string; value: string }[] {
    const fields: { label: string; value: string }[] = [
      { label: 'Identifier', value: device.deviceIdentifier },
      { label: 'Type', value: device.type },
    ];
    if (device.status) {
      fields.push({ label: 'Status', value: device.status });
    }
    if (device.batteryLevel != null) {
      fields.push({ label: 'Battery', value: `${device.batteryLevel}%` });
    }
    if (device.lastSeenAt) {
      fields.push({ label: 'Last seen', value: new Date(device.lastSeenAt).toLocaleString() });
    }
    if (device.lastKnownPoint) {
      const [lng, lat] = device.lastKnownPoint.coordinates;
      fields.push({ label: 'Last location', value: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    }
    if (device.tags?.length) {
      fields.push({ label: 'Tags', value: device.tags.join(', ') });
    }
    return fields;
  }

  private showResultsOnMap(hits: SearchHit[]): void {
    const markers = this.renderSearchMarkers(hits);
    if (markers.length > 0) {
      this.mapProvider.panTo(markers[0].lat, markers[0].lng);
    }
  }

  /** Rebuilds the map markers for the given hits, without recentering — used after search and after edit/delete. */
  private renderSearchMarkers(hits: SearchHit[]): MapMarkerData[] {
    const markers: MapMarkerData[] = [];
    for (const hit of hits) {
      const point = this.hitPoint(hit);
      if (!point) {
        continue;
      }
      const [lng, lat] = point.coordinates;
      markers.push({ id: hit.data.id, lat, lng, title: this.resultTitle(hit) });
    }
    this.mapProvider.setMarkers(markers, (id) => this.onMarkerClicked(id));
    return markers;
  }

  private hitPoint(hit: SearchHit) {
    return hit.type === 'LOCATION' ? (hit.data as Location).point : (hit.data as Device).lastKnownPoint;
  }
}
