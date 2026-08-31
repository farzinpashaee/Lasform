import { Address } from './address.model';
import { Auditable } from './auditable.model';
import { GeoJsonPoint } from './geo.model';
import { Image } from './image.model';
import { PhoneNumber } from './phone-number.model';

export interface Location extends Auditable {
  id?: string;
  point: GeoJsonPoint;
  name?: string;
  description?: string;
  altitude?: number;
  address?: Address;
  phoneNumbers?: PhoneNumber[];
  categoryIds?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  images?: Image[];
  /** Denormalized from published reviews — see com.csl.lasform.review. */
  averageRating?: number;
  reviewCount?: number;
}
