import { MarkerClusterer } from '@googlemaps/markerclusterer';

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
import { loadGoogleMaps } from './google-maps-script-loader';

const GEOFENCE_SHAPE_OPTIONS = { strokeColor: '#da5050', strokeWeight: 3, fillColor: '#da5050', fillOpacity: 0.15 };
/**
 * google.maps.drawing.DrawingManager is deprecated (empty stub as of @types/google.maps 3.65+,
 * removed from the Maps JS API) — circle drawing instead places a default-radius circle on the
 * first click and immediately hands off to the same editable drag-handle flow used post-draw.
 */
const DEFAULT_CIRCLE_RADIUS_METERS = 150;

export class GoogleMapsMapProvider implements MapProvider {
  private map?: google.maps.Map;
  private infoWindow?: google.maps.InfoWindow;
  private markers: google.maps.Marker[] = [];
  private markersById = new Map<string, { marker: google.maps.Marker; title?: string }>();
  private clusterer?: MarkerClusterer;
  private clusteringEnabled = false;
  private userLocationMarker?: google.maps.Marker;
  private geofenceOverlaysById = new Map<string, google.maps.Circle | google.maps.Polygon>();
  private drawClickListener?: google.maps.MapsEventListener;
  private drawDblClickListener?: google.maps.MapsEventListener;
  /** Live preview of the in-progress polygon outline while clicking vertices. */
  private drawPreviewPolyline?: google.maps.Polyline;

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

  setMapType(type: MapType): void {
    this.map?.setMapTypeId(type);
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

  startDrawingGeofence(kind: GeofenceShapeKind, onComplete: (shape: GeofenceShapeData) => void): void {
    if (!this.map) {
      return;
    }
    this.cancelDrawingGeofence();

    if (kind === 'CIRCLE') {
      // One click places a default-radius circle; the caller immediately re-renders it
      // editable, so dragging the radius/center handles is how the user actually sizes it.
      this.drawClickListener = this.map.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (!event.latLng) {
          return;
        }
        this.cancelDrawingGeofence();
        const circle: CircleShape = {
          shape: 'CIRCLE',
          center: { lat: event.latLng.lat(), lng: event.latLng.lng() },
          radiusMeters: DEFAULT_CIRCLE_RADIUS_METERS,
        };
        onComplete(circle);
      });
      return;
    }

    // POLYGON: each click adds a vertex to a live preview outline; double-click finishes.
    const points: google.maps.LatLng[] = [];
    const previewPolyline = new google.maps.Polyline({ ...GEOFENCE_SHAPE_OPTIONS, map: this.map });
    this.drawPreviewPolyline = previewPolyline;

    this.drawClickListener = this.map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) {
        return;
      }
      points.push(event.latLng);
      previewPolyline.setPath(points);
    });
    this.drawDblClickListener = this.map.addListener('dblclick', () => {
      // The two clicks of a double-click already pushed two (near-identical) vertices above;
      // drop the last one so the shape doesn't end with a redundant point at the finish click.
      points.pop();
      const shape: PolygonShape | null =
        points.length >= 3 ? { shape: 'POLYGON', path: points.map((point) => ({ lat: point.lat(), lng: point.lng() })) } : null;
      this.cancelDrawingGeofence();
      if (shape) {
        onComplete(shape);
      }
    });
  }

  cancelDrawingGeofence(): void {
    if (this.drawClickListener) {
      google.maps.event.removeListener(this.drawClickListener);
      this.drawClickListener = undefined;
    }
    if (this.drawDblClickListener) {
      google.maps.event.removeListener(this.drawDblClickListener);
      this.drawDblClickListener = undefined;
    }
    this.drawPreviewPolyline?.setMap(null);
    this.drawPreviewPolyline = undefined;
  }

  renderGeofence(
    id: string,
    shape: GeofenceShapeData,
    editable: boolean,
    onEdited?: (shape: GeofenceShapeData) => void,
    onClick?: () => void,
  ): void {
    if (!this.map) {
      return;
    }
    this.removeGeofence(id);

    const overlay = this.overlayFromShape(shape, editable);
    overlay.setMap(this.map);
    this.geofenceOverlaysById.set(id, overlay);

    if (editable && onEdited) {
      if (overlay instanceof google.maps.Circle) {
        overlay.addListener('center_changed', () => onEdited(this.shapeFromOverlay(overlay)));
        overlay.addListener('radius_changed', () => onEdited(this.shapeFromOverlay(overlay)));
      } else {
        const path = overlay.getPath();
        const emit = () => onEdited(this.shapeFromOverlay(overlay));
        path.addListener('set_at', emit);
        path.addListener('insert_at', emit);
        path.addListener('remove_at', emit);
      }
    }
    if (onClick) {
      overlay.addListener('click', () => onClick());
    }
  }

  removeGeofence(id: string): void {
    const overlay = this.geofenceOverlaysById.get(id);
    if (!overlay) {
      return;
    }
    google.maps.event.clearInstanceListeners(overlay);
    overlay.setMap(null);
    this.geofenceOverlaysById.delete(id);
  }

  clearGeofences(): void {
    for (const id of [...this.geofenceOverlaysById.keys()]) {
      this.removeGeofence(id);
    }
  }

  fitBoundsToGeofence(shape: GeofenceShapeData): void {
    if (!this.map) {
      return;
    }
    if (shape.shape === 'CIRCLE') {
      // Built directly as a Circle (not via overlayFromShape) so getBounds() stays available —
      // overlayFromShape's Circle | Polygon return type would otherwise lose it (Polygon has no getBounds).
      const circle = new google.maps.Circle({ center: shape.center, radius: shape.radiusMeters });
      const bounds = circle.getBounds();
      if (bounds) {
        this.map.fitBounds(bounds);
      }
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    shape.path.forEach((point) => bounds.extend(point));
    this.map.fitBounds(bounds);
  }

  private overlayFromShape(shape: GeofenceShapeData, editable: boolean): google.maps.Circle | google.maps.Polygon {
    if (shape.shape === 'CIRCLE') {
      return new google.maps.Circle({ ...GEOFENCE_SHAPE_OPTIONS, center: shape.center, radius: shape.radiusMeters, editable });
    }
    return new google.maps.Polygon({ ...GEOFENCE_SHAPE_OPTIONS, paths: shape.path, editable });
  }

  private shapeFromOverlay(overlay: google.maps.Circle | google.maps.Polygon): GeofenceShapeData {
    if (overlay instanceof google.maps.Circle) {
      const center = overlay.getCenter()!;
      const circle: CircleShape = {
        shape: 'CIRCLE',
        center: { lat: center.lat(), lng: center.lng() },
        radiusMeters: overlay.getRadius(),
      };
      return circle;
    }
    const polygon: PolygonShape = {
      shape: 'POLYGON',
      path: overlay
        .getPath()
        .getArray()
        .map((latlng) => ({ lat: latlng.lat(), lng: latlng.lng() })),
    };
    return polygon;
  }

  destroy(): void {
    this.teardownMarkers();
    this.infoWindow?.close();
    this.userLocationMarker?.setMap(null);
    this.userLocationMarker = undefined;
    this.clearGeofences();
    this.cancelDrawingGeofence();
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
