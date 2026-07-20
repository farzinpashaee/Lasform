import { Auditable } from './auditable.model';

/** A tag a Location can be classified under; a location may carry several. */
export interface Category extends Auditable {
  id?: string;
  name: string;
  description?: string;
}
