/** Supported map rendering backends; selected via environment.mapProvider. */
export type MapProviderKind = 'leaflet' | 'google';

export interface MapViewOptions {
  center: { lat: number; lng: number };
  zoom: number;
}

export interface MapMarkerData {
  /** Stable key used to look the marker back up later, e.g. for openMarkerPopup. */
  id?: string;
  lat: number;
  lng: number;
  title?: string;
}

export interface MapContextMenuEvent {
  lat: number;
  lng: number;
  /** Viewport-relative coordinates of the right-click, for positioning a custom menu. */
  clientX: number;
  clientY: number;
}

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

  /** Toggles grouping nearby markers into cluster badges; re-applies to whatever markers are current. */
  setClusteringEnabled(enabled: boolean): void;

  zoomIn(): void;

  zoomOut(): void;

  /** Recenters the map, optionally changing zoom. onComplete fires once the move finishes. */
  panTo(lat: number, lng: number, zoom?: number, onComplete?: () => void): void;

  /** Registers the handler fired on right-click on the map surface. */
  onContextMenu(handler: (event: MapContextMenuEvent) => void): void;

  /** Releases the underlying map instance and any listeners/resources it holds. */
  destroy(): void;
}
