/** Supported map rendering backends; selected via environment.mapProvider. */
export type MapProviderKind = 'leaflet' | 'google';

export type MapType = 'roadmap' | 'satellite' | 'terrain';

export interface MapViewOptions {
  center: { lat: number; lng: number };
  zoom: number;
}

/** Shared styling for a live-tracked device's breadcrumb trail — kept in one place so both map providers render it identically. */
export const DEVICE_TRAIL_COLOR = '#da5050';
const OLDEST_TRAIL_OPACITY = 0.1;
const NEWEST_TRAIL_OPACITY = 1;

/** Linearly interpolates a trail point's opacity from OLDEST_TRAIL_OPACITY (index 0) to NEWEST_TRAIL_OPACITY (index === lastIndex). */
export function trailPointOpacity(index: number, lastIndex: number): number {
  if (lastIndex <= 0) {
    return NEWEST_TRAIL_OPACITY;
  }
  return OLDEST_TRAIL_OPACITY + ((NEWEST_TRAIL_OPACITY - OLDEST_TRAIL_OPACITY) * index) / lastIndex;
}

export interface MapMarkerData {
  /** Stable key used to look the marker back up later, e.g. for openMarkerPopup. */
  id?: string;
  lat: number;
  lng: number;
  title?: string;
  /** Which icon to render — defaults to the location pin when omitted. */
  kind?: 'location' | 'device';
}

/** A visible-map rectangle in plain lon/lat, vendor-agnostic (mirrors both Leaflet's LatLngBounds and google.maps.LatLngBounds). */
export interface MapBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface MapContextMenuEvent {
  lat: number;
  lng: number;
  /** Viewport-relative coordinates of the right-click, for positioning a custom menu. */
  clientX: number;
  clientY: number;
}

export type GeofenceShapeKind = 'CIRCLE' | 'POLYGON';

export interface CircleShape {
  shape: 'CIRCLE';
  center: { lat: number; lng: number };
  radiusMeters: number;
}

export interface PolygonShape {
  shape: 'POLYGON';
  /** Vertices in order; not closed (first point isn't repeated at the end). */
  path: { lat: number; lng: number }[];
}

export type GeofenceShapeData = CircleShape | PolygonShape;

/**
 * Abstraction over a map rendering library (Leaflet, Google Maps, ...), so
 * components depend on this contract instead of a specific vendor SDK.
 */
export interface MapProvider {
  /** Renders the map into `container`. Resolves once the map is ready for markers. */
  initialize(container: HTMLElement, options: MapViewOptions): Promise<void>;

  /** Replaces all markers currently on the map. onMarkerClick fires with a marker's id when it's clicked. */
  setMarkers(markers: MapMarkerData[], onMarkerClick?: (id: string) => void): void;

  /** Opens the tooltip/info window for the marker with the given id, if it's currently on the map. */
  openMarkerPopup(id: string): void;

  /** Closes the tooltip/info window for the marker with the given id, if it's currently open. */
  closeMarkerPopup(id: string): void;

  /** Moves an existing marker to a new position, if one exists under this id. Never adds a marker. */
  moveMarker(id: string, lat: number, lng: number): void;

  /**
   * Renders a live-tracked device's recent path as connected, fading dots — oldest first, newest
   * last, newest at full opacity fading to faint for the oldest. Replaces any previous trail
   * under this id.
   */
  setDeviceTrail(id: string, points: { lat: number; lng: number }[]): void;

  /** Removes a device's trail, if one is currently shown. */
  clearDeviceTrail(id: string): void;

  /** Toggles grouping nearby markers into cluster badges; re-applies to whatever markers are current. */
  setClusteringEnabled(enabled: boolean): void;

  /** The currently visible map area, or null before initialize() has resolved. */
  getBounds(): MapBounds | null;

  /** Registers the handler fired once a pan or zoom settles (not on every intermediate frame while dragging/animating). */
  onBoundsChanged(handler: (bounds: MapBounds) => void): void;

  zoomIn(): void;

  zoomOut(): void;

  /** Recenters the map, optionally changing zoom. onComplete fires once the move finishes. */
  panTo(lat: number, lng: number, zoom?: number, onComplete?: () => void): void;

  /** Shows (or moves) a small "you are here" dot at the given position, replacing any previous one. */
  setUserLocation(lat: number, lng: number): void;

  /** Removes the "you are here" dot, if one is currently shown. */
  clearUserLocation(): void;

  /** Switches between the standard road map and satellite imagery. No-op if already on that type. */
  setMapType(type: MapType): void;

  /** Registers the handler fired on right-click on the map surface. */
  onContextMenu(handler: (event: MapContextMenuEvent) => void): void;

  /** Registers the handler fired when the user starts dragging the map — not for programmatic pans/zooms (e.g. panTo()). */
  onUserPanStart(handler: () => void): void;

  /** Arms interactive drawing of a new circle/polygon; onComplete fires once with the drawn shape, then drawing mode ends. */
  startDrawingGeofence(kind: GeofenceShapeKind, onComplete: (shape: GeofenceShapeData) => void): void;

  /** Cancels an in-progress startDrawingGeofence call, if one is active. No-op otherwise. */
  cancelDrawingGeofence(): void;

  /**
   * Renders (or replaces) a geofence shape under the given id. When editable, drag handles are
   * shown and onEdited fires with the updated shape on every change (drag end, vertex add/remove).
   * label, if given, is shown as text centered on the shape. onClick, if given, fires when the
   * shape itself is clicked.
   */
  renderGeofence(
    id: string,
    shape: GeofenceShapeData,
    editable: boolean,
    label?: string,
    onEdited?: (shape: GeofenceShapeData) => void,
    onClick?: () => void,
  ): void;

  /** Removes a single rendered geofence shape, if one exists under that id. No-op otherwise. */
  removeGeofence(id: string): void;

  /** Removes every rendered geofence shape. */
  clearGeofences(): void;

  /** Pans/zooms so the given shape is fully visible. */
  fitBoundsToGeofence(shape: GeofenceShapeData): void;

  /** Releases the underlying map instance and any listeners/resources it holds. */
  destroy(): void;
}
