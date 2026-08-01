import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MAP_PROVIDER, MapMarkerData, MapProvider } from './core/maps';
import { Device } from './core/models/device.model';
import { Location } from './core/models/location.model';
import { SearchHit } from './core/models/search.model';
import { LocationService } from './core/services/location.service';
import { SearchService } from './core/services/search.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements AfterViewInit, OnDestroy {
  protected readonly title = signal('LasformWebFace');

  private readonly locationService = inject(LocationService);
  private readonly searchService = inject(SearchService);
  private readonly mapProvider: MapProvider = inject(MAP_PROVIDER);

  private readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  protected readonly searchQuery = signal('');
  protected readonly searchResults = signal<SearchHit[]>([]);
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);
  protected readonly hasSearched = signal(false);
  protected readonly selectedResult = signal<SearchHit | null>(null);

  async ngAfterViewInit(): Promise<void> {
    await this.mapProvider.initialize(this.mapContainer().nativeElement, {
      center: { lat: 43.8628, lng: -79.4308 },
      zoom: 14,
    });

    this.loadLocationMarkers();
  }

  ngOnDestroy(): void {
    this.mapProvider.destroy();
  }

  private loadLocationMarkers(): void {
    this.locationService.findAll({ size: 200 }).subscribe((page) => {
      const markers = page.content.map((location) => {
        const [lng, lat] = location.point.coordinates;
        return { id: location.id, lat, lng, title: location.name };
      });
      this.mapProvider.setMarkers(markers);
    });
  }

  protected zoomIn(): void {
    this.mapProvider.zoomIn();
  }

  protected zoomOut(): void {
    this.mapProvider.zoomOut();
  }

  protected locateMe(): void {
    if (!navigator.geolocation) {
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      this.mapProvider.panTo(latitude, longitude, 15);
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

  protected backToList(): void {
    this.selectedResult.set(null);
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
    const markers: MapMarkerData[] = [];
    for (const hit of hits) {
      const point = this.hitPoint(hit);
      if (!point) {
        continue;
      }
      const [lng, lat] = point.coordinates;
      markers.push({ id: hit.data.id, lat, lng, title: this.resultTitle(hit) });
    }
    this.mapProvider.setMarkers(markers);
    if (markers.length > 0) {
      this.mapProvider.panTo(markers[0].lat, markers[0].lng);
    }
  }

  private hitPoint(hit: SearchHit) {
    return hit.type === 'LOCATION' ? (hit.data as Location).point : (hit.data as Device).lastKnownPoint;
  }
}
