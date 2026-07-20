import { AfterViewInit, Component, ElementRef, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements AfterViewInit {
  protected readonly title = signal('LasformWebFace');

  private readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
  private map!: L.Map;

  protected readonly searchQuery = signal('');

  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainer().nativeElement, {
      center: [43.8628, -79.4308],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);
  }

  protected zoomIn(): void {
    this.map.zoomIn();
  }

  protected zoomOut(): void {
    this.map.zoomOut();
  }

  protected locateMe(): void {
    if (!navigator.geolocation) {
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      this.map.setView([latitude, longitude], 15);
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
