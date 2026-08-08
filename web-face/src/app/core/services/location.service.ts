import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { GeoResults } from '../models/geo.model';
import { Location } from '../models/location.model';
import { Page, Pageable } from '../models/page.model';
import { CrudService } from './crud.service';
import { buildHttpParams } from './http-params.util';

export interface LocationSearchParams extends Pageable {
  q?: string;
  categoryId?: string;
  tags?: string[];
}

@Injectable({ providedIn: 'root' })
export class LocationService extends CrudService<Location> {
  constructor() {
    super('locations');
  }

  findNear(lat: number, lng: number, radiusMeters: number): Observable<GeoResults<Location>> {
    return this.http.get<GeoResults<Location>>(`${this.resourceUrl}/near`, {
      params: buildHttpParams({ lat, lng, radiusMeters }),
    });
  }

  /** Paginated/sortable listing, optionally filtered by free-text query, category, and/or tags. */
  search(params: LocationSearchParams = {}): Observable<Page<Location>> {
    return this.http.get<Page<Location>>(`${this.resourceUrl}/search`, {
      params: buildHttpParams(params),
    });
  }
}
