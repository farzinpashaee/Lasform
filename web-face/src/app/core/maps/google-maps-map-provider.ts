import { MarkerClusterer } from '@googlemaps/markerclusterer';

import {
  CircleShape,
  DEVICE_TRAIL_COLOR,
  GeofenceShapeData,
  GeofenceShapeKind,
  MapBounds,
  MapContextMenuEvent,
  MapMarkerData,
  MapProvider,
  MapType,
  MapViewOptions,
  PolygonShape,
  interpolateHeading,
  moveDurationMs,
  trailPointOpacity,
} from './map-provider.model';
import { loadGoogleMaps } from './google-maps-script-loader';

const GEOFENCE_SHAPE_OPTIONS = { strokeColor: '#da5050', strokeWeight: 3, fillColor: '#da5050', fillOpacity: 0.15 };
/**
 * google.maps.drawing.DrawingManager is deprecated (empty stub as of @types/google.maps 3.65+,
 * removed from the Maps JS API) — circle drawing instead places a default-radius circle on the
 * first click and immediately hands off to the same editable drag-handle flow used post-draw.
 */
const DEFAULT_CIRCLE_RADIUS_METERS = 150;

const DEVICE_ICON_URL = 'lasform/assets/images/markers/device-marker-icon.png';
const DEVICE_ICON_WIDTH = 25;
const DEVICE_ICON_HEIGHT = 41;
const DEVICE_ICON_ANCHOR: [number, number] = [12, 41];
/**
 * Side length of the square canvas rotatedDeviceIcon() draws into — big enough that the pin's
 * anchor point (its tip, DEVICE_ICON_ANCHOR) can sit exactly at the canvas's own center with room
 * for the whole pin to swing around it at any angle without clipping.
 */
const DEVICE_ICON_ROTATION_CANVAS_SIZE =
  2 * Math.max(DEVICE_ICON_ANCHOR[0], DEVICE_ICON_WIDTH - DEVICE_ICON_ANCHOR[0], DEVICE_ICON_ANCHOR[1], DEVICE_ICON_HEIGHT - DEVICE_ICON_ANCHOR[1]);
/** Heading is rounded to the nearest multiple of this before generating/caching a rotated icon — re-rendering a canvas for every trivial fluctuation buys nothing visible. */
const HEADING_BUCKET_DEGREES = 5;

let deviceIconImage: HTMLImageElement | undefined;
/** The plain device pin image, loaded once and reused as the source bitmap for every rotatedDeviceIcon() render. */
function deviceIconImageElement(): HTMLImageElement {
  if (!deviceIconImage) {
    deviceIconImage = new Image();
    deviceIconImage.src = DEVICE_ICON_URL;
  }
  return deviceIconImage;
}

const rotatedDeviceIconsByBucket = new Map<number, google.maps.Icon>();

/**
 * google.maps.Marker's classic Icon interface has no rotation hook for an image URL (only
 * path-based Symbol icons support a `rotation`), so a heading is instead baked directly into the
 * icon bitmap via an offscreen canvas. Rotating a plain rectangular render around its own center
 * would drag the pin's tip away from the marker's actual geo position at every angle but 0°/180°
 * (the tip sits near the bottom of the icon, not its center) — instead, the pin is drawn onto a
 * canvas sized and offset so its anchor point lands exactly on the canvas's own center, then
 * rotated around THAT center. A rotation always fixes its own center in place, so the tip stays
 * glued to the marker's position at every heading, and the resulting icon's anchor is simply the
 * canvas's fixed center regardless of angle. Cached per heading "bucket" (nearest 5°) rather than
 * regenerated on every fluctuation. Returns undefined until the base image has finished loading
 * (only possible on the very first call after page load) — callers should fall back to the
 * unrotated icon then; the next update almost always succeeds once the (tiny, already-requested)
 * image is cached.
 */
function rotatedDeviceIcon(headingDegrees: number): google.maps.Icon | undefined {
  const image = deviceIconImageElement();
  if (!image.complete || image.naturalWidth === 0) {
    return undefined;
  }
  const bucket = Math.round(headingDegrees / HEADING_BUCKET_DEGREES) * HEADING_BUCKET_DEGREES;
  let icon = rotatedDeviceIconsByBucket.get(bucket);
  if (!icon) {
    const size = DEVICE_ICON_ROTATION_CANVAS_SIZE;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) {
      return undefined;
    }
    context.translate(size / 2, size / 2);
    context.rotate((bucket * Math.PI) / 180);
    context.drawImage(image, -DEVICE_ICON_ANCHOR[0], -DEVICE_ICON_ANCHOR[1], DEVICE_ICON_WIDTH, DEVICE_ICON_HEIGHT);
    icon = { url: canvas.toDataURL(), scaledSize: new google.maps.Size(size, size), anchor: new google.maps.Point(size / 2, size / 2) };
    rotatedDeviceIconsByBucket.set(bucket, icon);
  }
  return icon;
}

const EARTH_RADIUS_METERS = 6371000;
/** Plain haversine great-circle distance — avoids pulling in the Maps JS API's separate `geometry` library (not currently loaded, see google-maps-script-loader.ts) just for computeDistanceBetween(). */
function haversineMeters(from: google.maps.LatLng, to: google.maps.LatLng): number {
  const lat1 = (from.lat() * Math.PI) / 180;
  const lat2 = (to.lat() * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((to.lng() - from.lng()) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

export class GoogleMapsMapProvider implements MapProvider {
  private map?: google.maps.Map;
  private infoWindow?: google.maps.InfoWindow;
  private markers: google.maps.Marker[] = [];
  private markersById = new Map<string, { marker: google.maps.Marker; title?: string }>();
  /** In-flight moveMarker() glide/rotation animations, keyed by marker id — cancelled if a newer moveMarker() call for the same id arrives before one finishes, so they never race each other. */
  private moveAnimations = new Map<string, number>();
  /** Each device marker's current heading, so the next moveMarker() call can turn from it rather than snapping — see interpolateHeading(). */
  private markerHeadings = new Map<string, number>();
  private clusterer?: MarkerClusterer;
  private clusteringEnabled = false;
  private userLocationMarker?: google.maps.Marker;
  private geofenceOverlaysById = new Map<string, google.maps.Circle | google.maps.Polygon>();
  private geofenceLabelsById = new Map<string, google.maps.Marker>();
  private deviceTrailsById = new Map<string, (google.maps.Marker | google.maps.Polyline)[]>();
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
        icon: markerData.kind === 'device' ? this.deviceMarkerIcon(markerData.heading) : this.locationMarkerIcon(),
        label: markerData.kind !== 'device' && markerData.categoryEmoji ? { text: markerData.categoryEmoji, fontSize: '13px' } : undefined,
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
        if (markerData.kind === 'device' && markerData.heading !== undefined) {
          this.markerHeadings.set(markerData.id, markerData.heading);
        }
      }
    }
    this.applyClustering();
  }

  // Built lazily (not a module-level constant) since google.maps.Size/Point only exist once
  // loadGoogleMaps() has resolved — same pin size/anchor as the default red-pin icon. headingDegrees,
  // if given, bakes that heading into the icon bitmap itself (see rotatedDeviceIcon) — classic
  // Marker icons have no separate rotation property for an image URL.
  private deviceMarkerIcon(headingDegrees?: number): google.maps.Icon {
    const rotated = headingDegrees !== undefined ? rotatedDeviceIcon(headingDegrees) : undefined;
    return (
      rotated ?? {
        url: DEVICE_ICON_URL,
        scaledSize: new google.maps.Size(DEVICE_ICON_WIDTH, DEVICE_ICON_HEIGHT),
        anchor: new google.maps.Point(...DEVICE_ICON_ANCHOR),
      }
    );
  }

  /** Lasform's branded pin — replaces Google's default red pin for location markers. Sized to the SVG's 140x200 (0.7:1) viewBox, anchored at its tip. labelOrigin centers a category emoji label (see setMarkers) in the pin's circular head instead of Google's default (the icon's dead center). */
  private locationMarkerIcon(): google.maps.Icon {
    return {
      url: 'lasform/assets/images/markers/lasform-base-marker_140X200.svg',
      scaledSize: new google.maps.Size(23, 33),
      anchor: new google.maps.Point(12, 33),
      labelOrigin: new google.maps.Point(11, 11),
    };
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

  // id is unused: this.infoWindow is a single instance shared across every marker (see
  // openMarkerPopup), so closing it always closes whichever marker's popup is currently open —
  // the id param exists only to match MapProvider's per-marker-id shape.
  closeMarkerPopup(_id: string): void {
    this.infoWindow?.close();
  }

  moveMarker(id: string, lat: number, lng: number, headingDegrees?: number, speedMetersPerSecond?: number): void {
    const entry = this.markersById.get(id);
    if (!entry) {
      return;
    }
    this.cancelMoveAnimation(id);

    const { marker } = entry;
    const from = marker.getPosition() ?? new google.maps.LatLng(lat, lng);
    const to = new google.maps.LatLng(lat, lng);
    const fromHeading = this.markerHeadings.get(id);
    const duration = moveDurationMs(haversineMeters(from, to), speedMetersPerSecond);
    const start = performance.now();

    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / duration);
      marker.setPosition({ lat: from.lat() + (to.lat() - from.lat()) * t, lng: from.lng() + (to.lng() - from.lng()) * t });
      if (headingDegrees !== undefined) {
        marker.setIcon(this.deviceMarkerIcon(interpolateHeading(fromHeading, headingDegrees, t)));
      }
      // Unlike Leaflet's cluster plugin, @googlemaps/markerclusterer doesn't watch marker
      // position on its own — render() is its documented "recalculate and redraw" call.
      this.clusterer?.render();
      if (t < 1) {
        this.moveAnimations.set(id, requestAnimationFrame(step));
      } else {
        this.moveAnimations.delete(id);
        if (headingDegrees !== undefined) {
          this.markerHeadings.set(id, headingDegrees);
        }
      }
    };
    this.moveAnimations.set(id, requestAnimationFrame(step));
  }

  private cancelMoveAnimation(id: string): void {
    const handle = this.moveAnimations.get(id);
    if (handle !== undefined) {
      cancelAnimationFrame(handle);
      this.moveAnimations.delete(id);
    }
  }

  setDeviceTrail(id: string, points: { lat: number; lng: number }[]): void {
    this.clearDeviceTrail(id);
    if (!this.map || points.length === 0) {
      return;
    }
    const overlays: (google.maps.Marker | google.maps.Polyline)[] = [];
    const last = points.length - 1;
    points.forEach((point, i) => {
      const opacity = trailPointOpacity(i, last);
      overlays.push(
        new google.maps.Marker({
          position: point,
          map: this.map,
          clickable: false,
          zIndex: google.maps.Marker.MAX_ZINDEX,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: DEVICE_TRAIL_COLOR,
            fillOpacity: opacity,
            strokeColor: DEVICE_TRAIL_COLOR,
            strokeOpacity: opacity,
            strokeWeight: 1,
          },
        }),
      );
      if (i > 0) {
        overlays.push(
          new google.maps.Polyline({
            path: [points[i - 1], point],
            map: this.map,
            strokeColor: DEVICE_TRAIL_COLOR,
            strokeOpacity: opacity,
            strokeWeight: 3,
          }),
        );
      }
    });
    this.deviceTrailsById.set(id, overlays);
  }

  clearDeviceTrail(id: string): void {
    const overlays = this.deviceTrailsById.get(id);
    if (overlays) {
      overlays.forEach((overlay) => overlay.setMap(null));
      this.deviceTrailsById.delete(id);
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

  onUserPanStart(handler: () => void): void {
    // 'dragstart' fires only for an actual pointer-driven drag of the map — unlike 'center_changed',
    // it never fires for a programmatic panTo()/setCenter(), so no "ignore my own pans" flag is needed.
    this.map?.addListener('dragstart', () => handler());
  }

  getBounds(): MapBounds | null {
    const bounds = this.map?.getBounds();
    if (!bounds) {
      return null;
    }
    return { west: bounds.getSouthWest().lng(), south: bounds.getSouthWest().lat(), east: bounds.getNorthEast().lng(), north: bounds.getNorthEast().lat() };
  }

  onBoundsChanged(handler: (bounds: MapBounds) => void): void {
    // 'idle' fires once the map has settled after a pan/zoom/resize — unlike 'bounds_changed',
    // which fires continuously while dragging or animating.
    this.map?.addListener('idle', () => {
      const bounds = this.getBounds();
      if (bounds) {
        handler(bounds);
      }
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
    label?: string,
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

    if (label) {
      const labelMarker = new google.maps.Marker({
        position: this.centerOfShape(shape),
        map: this.map,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0 },
        label: { text: label, color: '#202124', fontSize: '12px', fontWeight: '600', className: 'geofence-label' },
        clickable: false,
        zIndex: google.maps.Marker.MAX_ZINDEX + 1,
      });
      this.geofenceLabelsById.set(id, labelMarker);
    }
  }

  removeGeofence(id: string): void {
    const overlay = this.geofenceOverlaysById.get(id);
    if (overlay) {
      google.maps.event.clearInstanceListeners(overlay);
      overlay.setMap(null);
      this.geofenceOverlaysById.delete(id);
    }
    const labelMarker = this.geofenceLabelsById.get(id);
    if (labelMarker) {
      labelMarker.setMap(null);
      this.geofenceLabelsById.delete(id);
    }
  }

  clearGeofences(): void {
    for (const id of [...this.geofenceOverlaysById.keys(), ...this.geofenceLabelsById.keys()]) {
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

  private centerOfShape(shape: GeofenceShapeData): google.maps.LatLngLiteral {
    if (shape.shape === 'CIRCLE') {
      return shape.center;
    }
    const bounds = new google.maps.LatLngBounds();
    shape.path.forEach((point) => bounds.extend(point));
    const center = bounds.getCenter();
    return { lat: center.lat(), lng: center.lng() };
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
    for (const id of [...this.deviceTrailsById.keys()]) {
      this.clearDeviceTrail(id);
    }
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
    for (const handle of this.moveAnimations.values()) {
      cancelAnimationFrame(handle);
    }
    this.moveAnimations.clear();
    this.markerHeadings.clear();
  }
}
