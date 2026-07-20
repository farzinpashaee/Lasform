import * as L from 'leaflet';

import { MapMarkerData, MapProvider, MapViewOptions } from './map-provider.model';

export class LeafletMapProvider implements MapProvider {
  private map?: L.Map;
  private markersLayer?: L.LayerGroup;

  initialize(container: HTMLElement, options: MapViewOptions): Promise<void> {
    this.map = L.map(container, {
      center: [options.center.lat, options.center.lng],
      zoom: options.zoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    return Promise.resolve();
  }

  setMarkers(markers: MapMarkerData[]): void {
    if (!this.map) {
      return;
    }
    this.markersLayer?.remove();
    const leafletMarkers = markers.map((marker) => {
      const leafletMarker = L.marker([marker.lat, marker.lng]);
      if (marker.title) {
        leafletMarker.bindPopup(marker.title);
      }
      return leafletMarker;
    });
    this.markersLayer = L.layerGroup(leafletMarkers).addTo(this.map);
  }

  zoomIn(): void {
    this.map?.zoomIn();
  }

  zoomOut(): void {
    this.map?.zoomOut();
  }

  panTo(lat: number, lng: number, zoom?: number): void {
    if (!this.map) {
      return;
    }
    if (zoom !== undefined) {
      this.map.setView([lat, lng], zoom);
    } else {
      this.map.panTo([lat, lng]);
    }
  }

  destroy(): void {
    this.map?.remove();
    this.map = undefined;
    this.markersLayer = undefined;
  }
}
