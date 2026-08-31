import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Device } from '../models/device.model';
import { DeviceStatus } from '../models/enums';
import { Page, Pageable } from '../models/page.model';
import { CrudService } from './crud.service';
import { buildHttpParams } from './http-params.util';

export interface DeviceSearchParams extends Pageable {
  q?: string;
  categoryId?: string;
  tags?: string[];
  status?: DeviceStatus;
}

@Injectable({ providedIn: 'root' })
export class DeviceService extends CrudService<Device> {
  constructor() {
    super('devices');
  }

  findByDeviceIdentifier(deviceIdentifier: string): Observable<Device> {
    return this.http.get<Device>(`${this.resourceUrl}/by-identifier/${deviceIdentifier}`);
  }

  /** Recomputes and persists a fresh deviceIdentifier for an existing device. Requires device:write. */
  regenerateIdentifier(id: string): Observable<Device> {
    return this.http.post<Device>(`${this.resourceUrl}/${id}/identifier/regenerate`, {});
  }

  /** Paginated/sortable listing, optionally filtered by free-text query, category, tags, and/or status. */
  search(params: DeviceSearchParams = {}): Observable<Page<Device>> {
    return this.http.get<Page<Device>>(`${this.resourceUrl}/search`, { params: buildHttpParams(params) });
  }
}
