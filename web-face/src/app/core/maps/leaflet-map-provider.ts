import * as L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet-draw';

import {
  CircleShape,
  GeofenceShapeData,
  GeofenceShapeKind,
  MapContextMenuEvent,
  MapMarkerData,
  MapProvider,
  MapType,
  MapViewOptions,
  PolygonShape,
} from './map-provider.model';

/** leaflet-draw's runtime init hooks attach this to L.Circle/L.Polygon once added to a map — @types/leaflet-draw doesn't declare it. */
interface EditableShapeLayer extends L.Layer {
  editing?: { enable(): void; disable(): void };
}

const GEOFENCE_SHAPE_OPTIONS: L.PathOptions = { color: '#da5050', weight: 3, fillOpacity: 0.15 };

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
  private geofenceLayer?: L.FeatureGroup;
  private geofenceShapesById = new Map<string, L.Circle | L.Polygon>();
  private activeDrawHandler?: L.Draw.Circle | L.Draw.Polygon;
  private activeDrawCreatedListener?: L.LeafletEventHandlerFn;

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

    this.geofenceLayer = L.featureGroup().addTo(this.map);

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

  startDrawingGeofence(kind: GeofenceShapeKind, onComplete: (shape: GeofenceShapeData) => void): void {
    if (!this.map) {
      return;
    }
    this.cancelDrawingGeofence();

    const drawMap = this.map as unknown as L.DrawMap;
    const handler =
      kind === 'CIRCLE'
        ? new L.Draw.Circle(drawMap, { shapeOptions: GEOFENCE_SHAPE_OPTIONS })
        : new L.Draw.Polygon(drawMap, { shapeOptions: GEOFENCE_SHAPE_OPTIONS });
    this.activeDrawHandler = handler;

    // The drawn layer is transient — never added to the map. The caller is expected to
    // immediately call renderGeofence(id, shape, true, ...) with the resulting shape, which
    // becomes the single source of truth for what's actually rendered (avoids a duplicate
    // untracked layer sitting underneath the one renderGeofence creates for the same shape).
    const listener: L.LeafletEventHandlerFn = (event) => {
      this.activeDrawHandler = undefined;
      this.activeDrawCreatedListener = undefined;
      const layer = (event as L.DrawEvents.Created).layer as L.Circle | L.Polygon;
      onComplete(this.shapeFromLayer(layer));
    };
    this.activeDrawCreatedListener = listener;
    this.map.once(L.Draw.Event.CREATED, listener);

    handler.enable();
  }

  cancelDrawingGeofence(): void {
    this.activeDrawHandler?.disable();
    this.activeDrawHandler = undefined;
    if (this.activeDrawCreatedListener) {
      this.map?.off(L.Draw.Event.CREATED, this.activeDrawCreatedListener);
      this.activeDrawCreatedListener = undefined;
    }
  }

  renderGeofence(id: string, shape: GeofenceShapeData, editable: boolean, onEdited?: (shape: GeofenceShapeData) => void): void {
    if (!this.map || !this.geofenceLayer) {
      return;
    }
    this.removeGeofence(id);

    const layer = this.layerFromShape(shape);
    this.geofenceLayer.addLayer(layer);
    this.geofenceShapesById.set(id, layer);

    const editableLayer = layer as EditableShapeLayer;
    if (editable) {
      editableLayer.editing?.enable();
      if (onEdited) {
        layer.on('edit', () => onEdited(this.shapeFromLayer(layer)));
      }
    } else {
      editableLayer.editing?.disable();
    }
  }

  removeGeofence(id: string): void {
    const layer = this.geofenceShapesById.get(id);
    if (!layer) {
      return;
    }
    this.geofenceLayer?.removeLayer(layer);
    this.geofenceShapesById.delete(id);
  }

  clearGeofences(): void {
    this.geofenceLayer?.clearLayers();
    this.geofenceShapesById.clear();
  }

  fitBoundsToGeofence(shape: GeofenceShapeData): void {
    if (!this.map) {
      return;
    }
    this.map.fitBounds(this.layerFromShape(shape).getBounds());
  }

  private layerFromShape(shape: GeofenceShapeData): L.Circle | L.Polygon {
    if (shape.shape === 'CIRCLE') {
      return L.circle([shape.center.lat, shape.center.lng], { ...GEOFENCE_SHAPE_OPTIONS, radius: shape.radiusMeters });
    }
    return L.polygon(
      shape.path.map((point) => [point.lat, point.lng] as L.LatLngTuple),
      GEOFENCE_SHAPE_OPTIONS,
    );
  }

  private shapeFromLayer(layer: L.Circle | L.Polygon): GeofenceShapeData {
    if (layer instanceof L.Circle) {
      const center = layer.getLatLng();
      const circle: CircleShape = { shape: 'CIRCLE', center: { lat: center.lat, lng: center.lng }, radiusMeters: layer.getRadius() };
      return circle;
    }
    const [ring] = layer.getLatLngs() as L.LatLng[][];
    const polygon: PolygonShape = { shape: 'POLYGON', path: ring.map((latlng) => ({ lat: latlng.lat, lng: latlng.lng })) };
    return polygon;
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
    this.geofenceLayer = undefined;
    this.geofenceShapesById.clear();
    this.activeDrawHandler = undefined;
    this.activeDrawCreatedListener = undefined;
  }
}
