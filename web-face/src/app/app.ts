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

import { MAP_PROVIDER, MapProvider } from './core/maps';
import { LocationService } from './core/services/location.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements AfterViewInit, OnDestroy {
  protected readonly title = signal('LasformWebFace');

  private readonly locationService = inject(LocationService);
  private readonly mapProvider: MapProvider = inject(MAP_PROVIDER);

  private readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  protected readonly searchQuery = signal('');

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
    // Placeholder: wire up to a real geocoding/search service later.
  }
}
