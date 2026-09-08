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

/** Diameter of the round "live device" badge itself, excluding the heading arrow. */
const DEVICE_BADGE_DIAMETER = 26;
const DEVICE_BADGE_RADIUS = DEVICE_BADGE_DIAMETER / 2;
/** Empty space left between the badge's edge and the arrow's (nearest) base. */
const DEVICE_ARROW_GAP = 2;
/** How far the heading arrow's tip sticks out beyond the badge's edge, past DEVICE_ARROW_GAP. */
const DEVICE_ARROW_LENGTH = 8;
/** Half of the icon's total footprint (badge + gap + arrow at any rotation) — the radius from center out to the arrow's tip. */
const DEVICE_ICON_RADIUS = DEVICE_BADGE_RADIUS + DEVICE_ARROW_GAP + DEVICE_ARROW_LENGTH;
const DEVICE_ICON_DIAMETER = DEVICE_ICON_RADIUS * 2;
/** Heading is rounded to the nearest multiple of this before generating/caching a rotated icon — re-rendering a canvas for every trivial fluctuation buys nothing visible. */
const HEADING_BUCKET_DEGREES = 5;

/** `null` keys the no-heading-known variant (badge only, no arrow at all). */
const deviceIconsByHeadingBucket = new Map<number | null, google.maps.Icon>();

function normalizeHeadingDegrees(degrees: number): number {
  const wrapped = degrees % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/** The round badge's fixed circle + signal glyph, identical in every cached icon regardless of heading — echoes the Material Symbols `sensors` glyph used for the equivalent Leaflet marker (see .device-marker-badge in styles.scss), redrawn as plain vector shapes since a canvas has no access to that icon font. */
function drawDeviceBadge(context: CanvasRenderingContext2D, center: number): void {
  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.45)';
  context.shadowBlur = 4;
  context.shadowOffsetY = 2;
  context.beginPath();
  context.arc(center, center, DEVICE_BADGE_RADIUS, 0, Math.PI * 2);
  context.fillStyle = '#da5050';
  context.fill();
  context.restore();

  context.save();
  context.strokeStyle = '#fff';
  context.fillStyle = '#fff';
  context.lineWidth = 1.8;
  context.lineCap = 'round';
  const originX = center - 4;
  const originY = center + 4;
  context.beginPath();
  context.arc(originX, originY, 1.6, 0, Math.PI * 2);
  context.fill();
  for (const radius of [5, 8.5]) {
    context.beginPath();
    context.arc(originX, originY, radius, (-125 * Math.PI) / 180, (-35 * Math.PI) / 180);
    context.stroke();
  }
  context.restore();
}

/** The heading arrow, filled in pointing straight up then rotated around the badge's own center — same shape/placement as .device-marker-arrow's CSS triangle in the Leaflet version. */
function drawDeviceArrow(context: CanvasRenderingContext2D, center: number, headingDegrees: number): void {
  context.save();
  context.translate(center, center);
  context.rotate((headingDegrees * Math.PI) / 180);
  const baseRadius = DEVICE_BADGE_RADIUS + DEVICE_ARROW_GAP;
  context.beginPath();
  context.moveTo(0, -(baseRadius + DEVICE_ARROW_LENGTH));
  context.lineTo(-5, -baseRadius);
  context.lineTo(5, -baseRadius);
  context.closePath();
  context.fillStyle = '#da5050';
  context.fill();
  context.restore();
}

/**
 * google.maps.Marker's classic Icon interface is a single flat image with no way to layer or
 * independently rotate a child element the way a DOM-based divIcon can — so unlike the Leaflet
 * version (a fixed badge with a separately-rotating arrow element), here the *whole bitmap* is
 * regenerated per heading. The badge itself is still drawn identically, at the same fixed center,
 * in every variant — only the arrow actually differs between them — so it reads as the same
 * requirement (a static badge, a rotating arrow), just achieved by re-rendering rather than by
 * rotating a separate element. `headingDegrees` undefined renders the badge with no arrow at all
 * (heading not known yet). Cached per heading "bucket" (nearest 5°) rather than regenerated on
 * every fluctuation.
 */
function deviceIcon(headingDegrees?: number): google.maps.Icon {
  const bucket = headingDegrees === undefined ? null : Math.round(normalizeHeadingDegrees(headingDegrees) / HEADING_BUCKET_DEGREES) * HEADING_BUCKET_DEGREES;
  const key = bucket === null ? null : bucket % 360;
  let icon = deviceIconsByHeadingBucket.get(key);
  if (!icon) {
    const size = DEVICE_ICON_DIAMETER;
    const center = DEVICE_ICON_RADIUS;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) {
      return { url: '', scaledSize: new google.maps.Size(size, size), anchor: new google.maps.Point(center, center) };
    }
    drawDeviceBadge(context, center);
    if (key !== null) {
      drawDeviceArrow(context, center, key);
    }
    icon = { url: canvas.toDataURL(), scaledSize: new google.maps.Size(size, size), anchor: new google.maps.Point(center, center) };
    deviceIconsByHeadingBucket.set(key, icon);
  }
  return icon;
}

export class GoogleMapsMapProvider implements MapProvider {
  private map?: google.maps.Map;
  private infoWindow?: google.maps.InfoWindow;
  private markers: google.maps.Marker[] = [];
  private markersById = new Map<string, { marker: google.maps.Marker; title?: string }>();
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
        icon: markerData.kind === 'device' ? deviceIcon(markerData.heading) : this.locationMarkerIcon(),
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
      }
    }
    this.applyClustering();
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

  moveMarker(id: string, lat: number, lng: number, headingDegrees?: number): void {
    const entry = this.markersById.get(id);
    if (!entry) {
      return;
    }
    entry.marker.setPosition({ lat, lng });
    if (headingDegrees !== undefined) {
      entry.marker.setIcon(deviceIcon(headingDegrees));
    }
    // Unlike Leaflet's cluster plugin, @googlemaps/markerclusterer doesn't watch marker
    // position on its own — render() is its documented "recalculate and redraw" call.
    this.clusterer?.render();
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

  getCenter(): { lat: number; lng: number } | null {
    const center = this.map?.getCenter();
    return center ? { lat: center.lat(), lng: center.lng() } : null;
  }

  getZoom(): number | null {
    return this.map?.getZoom() ?? null;
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
  }
}
