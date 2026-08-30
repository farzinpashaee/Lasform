/** Mirrors Spring Data MongoDB's GeoJsonPoint: coordinates are [longitude, latitude]. */
export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface Distance {
  value: number;
  unit: string;
  normalizedUnit?: string;
}

/** Mirrors Spring Data's GeoResult<T>/GeoResults<T> JSON shape, returned by proximity searches. */
export interface GeoResult<T> {
  content: T;
  distance: Distance;
}

export interface GeoResults<T> {
  content: GeoResult<T>[];
  averageDistance: Distance;
}
