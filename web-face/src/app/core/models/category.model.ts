import { Auditable } from './auditable.model';

/** A tag a Location can be classified under; a location may carry several. */
export interface Category extends Auditable {
  id?: string;
  name: string;
  description?: string;
  /** A short emoji/symbol representing this category on the map (e.g. "🏥", "🌳"). */
  marker?: string;
}
