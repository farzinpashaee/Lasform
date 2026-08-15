import * as L from 'leaflet';
import 'leaflet.markercluster';

import { MapContextMenuEvent, MapMarkerData, MapProvider, MapType, MapViewOptions } from './map-provider.model';

const ROADMAP_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
/** Esri's free World Imagery service — no API key required. */
const SATELLITE_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
/** OpenTopoMap — free, no API key, but its tile server only renders up to z17. */
const TERRAIN_TILE_URL = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
const TERRAIN_MAX_ZOOM = 17;

// Leaflet's default icon resolves its image URLs relative to the stylesheet that
// declared it, which esbuild's bundling breaks — markers render as a broken-image
// icon unless the URLs are pointed at the assets explicitly, once, up front.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'lasform/assets/images/markers/marker-icon.png',
  iconRetinaUrl: 'lasform/assets/images/markers/marker-icon-2x.png',
  shadowUrl: 'lasform/assets/images/markers/marker-shadow.png',
});

export class LeafletMapProvider implements MapProvider {
private map?: L.Map;
  private markersLayer?: L.LayerGroup;
  private markersById = new Map<string, L.Marker>();
  private allMarkers: L.Marker[] = [];
  private clusteringEnabled = false;
  private userLocationMarker?: L.CircleMarker;
  private mapType: MapType = 'roadmap';
  private roadmapLayer?: L.TileLayer;
  private satelliteLayer?: L.TileLayer;
  private terrainLayer?: L.TileLayer;

  initialize(container: HTMLElement, options: MapViewOptions): Promise<void> {
    this.map = L.map(container, {
      center: [options.center.lat, options.center.lng],
      zoom: options.zoom,
      zoomControl: false,
      attributionControl: false,
    });

    this.roadmapLayer = L.tileLayer(ROADMAP_TILE_URL, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    // Leaflet caches the container's size at construction time; if the browser hasn't finished
    // laying out the page yet (common right after Angular's view init), that cache is 0x0 and
    // every layer — tiles included — renders as if the map had no visible area. A deferred
    // invalidateSize() forces a re-measure once layout has actually settled.
    setTimeout(() => this.map?.invalidateSize(), 0);

    return Promise.resolve();
  }

  setMarkers(markers: MapMarkerData[], onMarkerClick?: (id: string) => void): void {
    if (!this.map) {
      return;
    }
    this.markersById.clear();
    this.allMarkers = markers.map((marker) => {
      const leafletMarker = L.marker([marker.lat, marker.lng]);
      if (marker.title) {
        leafletMarker.bindPopup(marker.title);
      }
      if (marker.id) {
        this.markersById.set(marker.id, leafletMarker);
        if (onMarkerClick) {
          leafletMarker.on('click', () => onMarkerClick(marker.id!));
        }
      }
      return leafletMarker;
    });
    this.rebuildMarkersLayer();
  }

  setClusteringEnabled(enabled: boolean): void {
    if (this.clusteringEnabled === enabled) {
      return;
    }
    this.clusteringEnabled = enabled;
    this.rebuildMarkersLayer();
  }

  openMarkerPopup(id: string): void {
    const marker = this.markersById.get(id);
    if (!marker) {
      return;
    }
    if (this.markersLayer instanceof L.MarkerClusterGroup) {
      // A clustered marker isn't in the DOM until its cluster is zoomed/spidered open,
      // so openPopup() alone would silently no-op — zoomToShowLayer handles that first.
      this.markersLayer.zoomToShowLayer(marker, () => marker.openPopup());
    } else {
      marker.openPopup();
    }
  }

  private rebuildMarkersLayer(): void {
    if (!this.map) {
      return;
    }
    this.markersLayer?.remove();
    if (this.clusteringEnabled) {
      const clusterGroup = L.markerClusterGroup();
      clusterGroup.addLayers(this.allMarkers);
      this.markersLayer = clusterGroup;
    } else {
      this.markersLayer = L.layerGroup(this.allMarkers);
    }
    this.markersLayer.addTo(this.map);
  }

  zoomIn(): void {
    this.map?.zoomIn();
  }

  zoomOut(): void {
    this.map?.zoomOut();
  }

  panTo(lat: number, lng: number, zoom?: number, onComplete?: () => void): void {
    if (!this.map) {
      onComplete?.();
      return;
    }
    if (onComplete) {
      this.map.once('moveend', onComplete);
    }
    if (zoom !== undefined) {
      this.map.setView([lat, lng], zoom);
    } else {
      this.map.panTo([lat, lng]);
    }
  }

  setUserLocation(lat: number, lng: number): void {
    if (!this.map) {
      return;
    }
    if (this.userLocationMarker) {
      this.userLocationMarker.setLatLng([lat, lng]);
      return;
    }
    this.userLocationMarker = L.circleMarker([lat, lng], {
      radius: 8,
      color: '#fff',
      weight: 2,
      fillColor: '#da5050',
      fillOpacity: 1,
    }).addTo(this.map);
  }

  clearUserLocation(): void {
    this.userLocationMarker?.remove();
    this.userLocationMarker = undefined;
  }

  setMapType(type: MapType): void {
    if (!this.map || this.mapType === type) {
      return;
    }
    const previousLayer = this.layerFor(this.mapType);
    this.mapType = type;
    previousLayer.remove();
    this.layerFor(type).addTo(this.map);
  }

  /** Lazily creates (and caches) the tile layer for a map type — only the roadmap layer exists eagerly, from initialize(). */
  private layerFor(type: MapType): L.TileLayer {
    if (type === 'satellite') {
      if (!this.satelliteLayer) {
        this.satelliteLayer = L.tileLayer(SATELLITE_TILE_URL, { maxZoom: 19, attribution: 'Tiles &copy; Esri' });
      }
      return this.satelliteLayer;
    }
    if (type === 'terrain') {
      if (!this.terrainLayer) {
        this.terrainLayer = L.tileLayer(TERRAIN_TILE_URL, {
          maxZoom: TERRAIN_MAX_ZOOM,
          attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
        });
      }
      return this.terrainLayer;
    }
    return this.roadmapLayer!;
  }

  onContextMenu(handler: (event: MapContextMenuEvent) => void): void {
    if (!this.map) {
      return;
    }
    this.map.on('contextmenu', (e: L.LeafletMouseEvent) => {
      // Leaflet doesn't suppress the browser's native context menu on its own.
      e.originalEvent.preventDefault();
      handler({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        clientX: e.originalEvent.clientX,
        clientY: e.originalEvent.clientY,
      });
    });
  }

  destroy(): void {
    this.map?.remove();
    this.map = undefined;
    this.markersLayer = undefined;
    this.markersById.clear();
    this.allMarkers = [];
    this.userLocationMarker = undefined;
    this.mapType = 'roadmap';
    this.roadmapLayer = undefined;
    this.satelliteLayer = undefined;
    this.terrainLayer = undefined;
  }
}
