import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { GeoResults } from '../models/geo.model';
import { Image } from '../models/image.model';
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

  uploadImage(locationId: string, file: File, primary = false): Observable<Image> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Image>(`${this.resourceUrl}/${locationId}/images`, formData, {
      params: buildHttpParams({ primary }),
    });
  }

  /**
   * The image endpoint requires the same bearer-token auth as every other API call, so a plain
   * `<img src>` (which never sends that header) can't load it directly — fetch it through
   * HttpClient (which does, via the auth interceptor) and hand back a blob for an object URL.
   */
  loadImage(locationId: string, filename: string): Observable<Blob> {
    return this.http.get(`${this.resourceUrl}/${locationId}/images/${encodeURIComponent(filename)}`, {
      responseType: 'blob',
    });
  }

  deleteImage(locationId: string, filename: string): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${locationId}/images/${encodeURIComponent(filename)}`);
  }

  setPrimaryImage(locationId: string, filename: string): Observable<Image> {
    return this.http.put<Image>(`${this.resourceUrl}/${locationId}/images/${encodeURIComponent(filename)}/primary`, {});
  }
}
