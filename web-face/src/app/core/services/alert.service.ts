import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Alert } from '../models/alert.model';
import { AlertStatus } from '../models/enums';
import { CrudService } from './crud.service';
import { buildHttpParams } from './http-params.util';

export interface AlertSearchParams {
  deviceId?: string;
  status?: AlertStatus;
}

@Injectable({ providedIn: 'root' })
export class AlertService extends CrudService<Alert> {
  constructor() {
    super('alerts');
  }

  /** Provide at least one of deviceId or status, matching the backend's /search contract. */
  search(params: AlertSearchParams): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.resourceUrl}/search`, { params: buildHttpParams(params) });
  }

  countByStatus(status: AlertStatus): Observable<number> {
    return this.http.get<number>(`${this.resourceUrl}/count`, { params: buildHttpParams({ status }) });
  }
}
