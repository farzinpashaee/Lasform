import * as L from 'leaflet';

import { MapMarkerData, MapProvider, MapViewOptions } from './map-provider.model';

// Leaflet's default icon resolves its image URLs relative to the stylesheet that
// declared it, which esbuild's bundling breaks — markers render as a broken-image
// icon unless the URLs are pointed at the assets explicitly, once, up front.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'leaflet/images/marker-icon.png',
  iconRetinaUrl: 'leaflet/images/marker-icon-2x.png',
  shadowUrl: 'leaflet/images/marker-shadow.png',
});

export class LeafletMapProvider implements MapProvider {
  private map?: L.Map;
  private markersLayer?: L.LayerGroup;
  private markersById = new Map<string, L.Marker>();

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
    this.markersById.clear();
    const leafletMarkers = markers.map((marker) => {
      const leafletMarker = L.marker([marker.lat, marker.lng]);
      if (marker.title) {
        leafletMarker.bindPopup(marker.title);
      }
      if (marker.id) {
        this.markersById.set(marker.id, leafletMarker);
      }
      return leafletMarker;
    });
    this.markersLayer = L.layerGroup(leafletMarkers).addTo(this.map);
  }

  openMarkerPopup(id: string): void {
    this.markersById.get(id)?.openPopup();
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
    this.markersById.clear();
  }
}
