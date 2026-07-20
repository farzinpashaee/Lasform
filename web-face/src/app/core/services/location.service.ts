import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { GeoResults } from '../models/geo.model';
import { Location } from '../models/location.model';
import { CrudService } from './crud.service';
import { buildHttpParams } from './http-params.util';

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

  findByCategoryId(categoryId: string): Observable<Location[]> {
    return this.http.get<Location[]>(`${this.resourceUrl}/search`, {
      params: buildHttpParams({ categoryId }),
    });
  }

  findByTag(tag: string): Observable<Location[]> {
    return this.http.get<Location[]>(`${this.resourceUrl}/search`, {
      params: buildHttpParams({ tag }),
    });
  }

  /** Locations having at least one of the given tags. */
  findByTagsIn(tags: string[]): Observable<Location[]> {
    return this.http.get<Location[]>(`${this.resourceUrl}/search`, {
      params: buildHttpParams({ tags }),
    });
  }
}
