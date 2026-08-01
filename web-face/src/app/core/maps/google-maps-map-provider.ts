import { MapMarkerData, MapProvider, MapViewOptions } from './map-provider.model';
import { loadGoogleMaps } from './google-maps-script-loader';

export class GoogleMapsMapProvider implements MapProvider {
  private map?: google.maps.Map;
  private infoWindow?: google.maps.InfoWindow;
  private markers: google.maps.Marker[] = [];
  private markersById = new Map<string, { marker: google.maps.Marker; title?: string }>();

  constructor(private readonly apiKey: string) {}

  async initialize(container: HTMLElement, options: MapViewOptions): Promise<void> {
    await loadGoogleMaps(this.apiKey);

    this.map = new google.maps.Map(container, {
      center: options.center,
      zoom: options.zoom,
      disableDefaultUI: true,
    });
    this.infoWindow = new google.maps.InfoWindow();
  }

  setMarkers(markers: MapMarkerData[], onMarkerClick?: (id: string) => void): void {
    if (!this.map) {
      return;
    }
    this.clearMarkers();
    for (const markerData of markers) {
      const marker = new google.maps.Marker({
        position: { lat: markerData.lat, lng: markerData.lng },
        map: this.map,
      });
      if (markerData.title || markerData.id) {
        marker.addListener('click', () => {
          if (markerData.title) {
            this.infoWindow?.setContent(markerData.title!);
            this.infoWindow?.open(this.map, marker);
          }
          if (markerData.id) {
            onMarkerClick?.(markerData.id);
          }
        });
      }
      this.markers.push(marker);
      if (markerData.id) {
        this.markersById.set(markerData.id, { marker, title: markerData.title });
      }
    }
  }

  openMarkerPopup(id: string): void {
    const entry = this.markersById.get(id);
    if (!entry || !this.infoWindow) {
      return;
    }
    if (entry.title) {
      this.infoWindow.setContent(entry.title);
    }
    this.infoWindow.open(this.map, entry.marker);
  }

  zoomIn(): void {
    if (!this.map) {
      return;
    }
    this.map.setZoom((this.map.getZoom() ?? 0) + 1);
  }

  zoomOut(): void {
    if (!this.map) {
      return;
    }
    this.map.setZoom((this.map.getZoom() ?? 0) - 1);
  }

  panTo(lat: number, lng: number, zoom?: number): void {
    if (!this.map) {
      return;
    }
    this.map.panTo({ lat, lng });
    if (zoom !== undefined) {
      this.map.setZoom(zoom);
    }
  }

  destroy(): void {
    this.clearMarkers();
    this.infoWindow?.close();
    this.map = undefined;
  }

  private clearMarkers(): void {
    this.markers.forEach((marker) => marker.setMap(null));
    this.markers = [];
    this.markersById.clear();
  }
}
