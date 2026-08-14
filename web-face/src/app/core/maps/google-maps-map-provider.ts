import { MarkerClusterer } from '@googlemaps/markerclusterer';

import { MapContextMenuEvent, MapMarkerData, MapProvider, MapViewOptions } from './map-provider.model';
import { loadGoogleMaps } from './google-maps-script-loader';

export class GoogleMapsMapProvider implements MapProvider {
  private map?: google.maps.Map;
  private infoWindow?: google.maps.InfoWindow;
  private markers: google.maps.Marker[] = [];
  private markersById = new Map<string, { marker: google.maps.Marker; title?: string }>();
  private clusterer?: MarkerClusterer;
  private clusteringEnabled = false;
  private userLocationMarker?: google.maps.Marker;

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
    this.teardownMarkers();
    for (const markerData of markers) {
      // No `map` here — applyClustering() below decides whether the clusterer or this
      // provider itself owns adding markers to the map.
      const marker = new google.maps.Marker({
        position: { lat: markerData.lat, lng: markerData.lng },
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
    this.applyClustering();
  }

  setClusteringEnabled(enabled: boolean): void {
    if (this.clusteringEnabled === enabled) {
      return;
    }
    this.clusteringEnabled = enabled;
    this.applyClustering();
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

  panTo(lat: number, lng: number, zoom?: number, onComplete?: () => void): void {
    if (!this.map) {
      onComplete?.();
      return;
    }
    if (onComplete) {
      google.maps.event.addListenerOnce(this.map, 'idle', onComplete);
    }
    this.map.panTo({ lat, lng });
    if (zoom !== undefined) {
      this.map.setZoom(zoom);
    }
  }

  setUserLocation(lat: number, lng: number): void {
    if (!this.map) {
      return;
    }
    const position = { lat, lng };
    if (this.userLocationMarker) {
      this.userLocationMarker.setPosition(position);
      return;
    }
    this.userLocationMarker = new google.maps.Marker({
      position,
      map: this.map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#da5050',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
      zIndex: google.maps.Marker.MAX_ZINDEX + 1,
      clickable: false,
    });
  }

  clearUserLocation(): void {
    this.userLocationMarker?.setMap(null);
    this.userLocationMarker = undefined;
  }

  onContextMenu(handler: (event: MapContextMenuEvent) => void): void {
    if (!this.map) {
      return;
    }
    this.map.addListener('rightclick', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) {
        return;
      }
      const domEvent = e.domEvent as MouseEvent | undefined;
      domEvent?.preventDefault();
      handler({
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
        clientX: domEvent?.clientX ?? 0,
        clientY: domEvent?.clientY ?? 0,
      });
    });
  }

  destroy(): void {
    this.teardownMarkers();
    this.infoWindow?.close();
    this.userLocationMarker?.setMap(null);
    this.userLocationMarker = undefined;
    this.map = undefined;
  }

  /** Applies the current clusteringEnabled mode to whatever's in this.markers, tearing down the other mode first. */
  private applyClustering(): void {
    if (!this.map) {
      return;
    }
    if (this.clusterer) {
      this.clusterer.clearMarkers();
      this.clusterer = undefined;
    } else {
      this.markers.forEach((marker) => marker.setMap(null));
    }
    if (this.clusteringEnabled) {
      this.clusterer = new MarkerClusterer({ map: this.map, markers: this.markers });
    } else {
      this.markers.forEach((marker) => marker.setMap(this.map!));
    }
  }

  private teardownMarkers(): void {
    if (this.clusterer) {
      this.clusterer.clearMarkers();
      this.clusterer = undefined;
    } else {
      this.markers.forEach((marker) => marker.setMap(null));
    }
    this.markers = [];
    this.markersById.clear();
  }
}
