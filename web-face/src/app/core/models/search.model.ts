import { Device } from './device.model';
import { Location } from './location.model';

/** Mirrors the backend's SearchResultType enum. */
export type SearchResultType = 'LOCATION' | 'DEVICE';

/** Mirrors the backend's SearchHit record returned by GET /api/v1/search. */
export interface SearchHit {
  type: SearchResultType;
  data: Location | Device;
}
