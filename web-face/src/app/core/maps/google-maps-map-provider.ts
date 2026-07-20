import { MapMarkerData, MapProvider, MapViewOptions } from './map-provider.model';
import { loadGoogleMaps } from './google-maps-script-loader';

export class GoogleMapsMapProvider implements MapProvider {
  private map?: google.maps.Map;
  private infoWindow?: google.maps.InfoWindow;
  private markers: google.maps.Marker[] = [];

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

  setMarkers(markers: MapMarkerData[]): void {
    if (!this.map) {
      return;
    }
    this.clearMarkers();
    for (const markerData of markers) {
      const marker = new google.maps.Marker({
        position: { lat: markerData.lat, lng: markerData.lng },
        map: this.map,
      });
      if (markerData.title) {
        marker.addListener('click', () => {
          this.infoWindow?.setContent(markerData.title!);
          this.infoWindow?.open(this.map, marker);
        });
      }
      this.markers.push(marker);
    }
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
  }
}
