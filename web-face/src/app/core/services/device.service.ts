import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Device } from '../models/device.model';
import { DeviceStatus } from '../models/enums';
import { CrudService } from './crud.service';
import { buildHttpParams } from './http-params.util';

export interface DeviceSearchParams {
  ownerId?: string;
  status?: DeviceStatus;
  tag?: string;
  /** Devices having at least one of the given tags. */
  tags?: string[];
}

@Injectable({ providedIn: 'root' })
export class DeviceService extends CrudService<Device> {
  constructor() {
    super('devices');
  }

  findByDeviceIdentifier(deviceIdentifier: string): Observable<Device> {
    return this.http.get<Device>(`${this.resourceUrl}/by-identifier/${deviceIdentifier}`);
  }

  /** Provide exactly one of ownerId, status, tag or tags, matching the backend's /search contract. */
  search(params: DeviceSearchParams): Observable<Device[]> {
    return this.http.get<Device[]>(`${this.resourceUrl}/search`, { params: buildHttpParams(params) });
  }
}
