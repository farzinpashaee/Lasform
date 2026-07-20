/** Supported map rendering backends; selected via environment.mapProvider. */
export type MapProviderKind = 'leaflet' | 'google';

export interface MapViewOptions {
  center: { lat: number; lng: number };
  zoom: number;
}

export interface MapMarkerData {
  lat: number;
  lng: number;
  title?: string;
}

/**
 * Abstraction over a map rendering library (Leaflet, Google Maps, ...), so
 * components depend on this contract instead of a specific vendor SDK.
 */
export interface MapProvider {
  /** Renders the map into `container`. Resolves once the map is ready for markers. */
  initialize(container: HTMLElement, options: MapViewOptions): Promise<void>;

  /** Replaces all markers currently on the map. */
  setMarkers(markers: MapMarkerData[]): void;

  zoomIn(): void;

  zoomOut(): void;

  /** Recenters the map, optionally changing zoom. */
  panTo(lat: number, lng: number, zoom?: number): void;

  /** Releases the underlying map instance and any listeners/resources it holds. */
  destroy(): void;
}
