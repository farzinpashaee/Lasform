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
        return { lat, lng, title: location.name };
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
    const point = this.hitPoint(hit);
    if (!point) {
      return;
    }
    const [lng, lat] = point.coordinates;
    this.mapProvider.panTo(lat, lng, 16);
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

  private showResultsOnMap(hits: SearchHit[]): void {
    const markers: MapMarkerData[] = [];
    for (const hit of hits) {
      const point = this.hitPoint(hit);
      if (!point) {
        continue;
      }
      const [lng, lat] = point.coordinates;
      markers.push({ lat, lng, title: this.resultTitle(hit) });
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
