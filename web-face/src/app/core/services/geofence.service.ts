import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { GeofenceStatus } from '../models/enums';
import { Geofence } from '../models/geofence.model';
import { CrudService } from './crud.service';
import { buildHttpParams } from './http-params.util';

export interface GeofenceSearchParams {
  ownerId?: string;
  status?: GeofenceStatus;
  deviceId?: string;
}

@Injectable({ providedIn: 'root' })
export class GeofenceService extends CrudService<Geofence> {
  constructor() {
    super('geofences');
  }

  /** Provide exactly one of ownerId, status or deviceId, matching the backend's /search contract. */
  search(params: GeofenceSearchParams): Observable<Geofence[]> {
    return this.http.get<Geofence[]>(`${this.resourceUrl}/search`, { params: buildHttpParams(params) });
  }
}
