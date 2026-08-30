import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { EventType } from '../models/enums';
import { Event } from '../models/event.model';
import { CrudService } from './crud.service';
import { buildHttpParams } from './http-params.util';

export interface EventSearchParams {
  deviceId?: string;
  userId?: string;
  /** type must be paired with from/to (ISO-8601 instants), matching the backend's /search contract. */
  type?: EventType;
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class EventService extends CrudService<Event> {
  constructor() {
    super('events');
  }

  search(params: EventSearchParams): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.resourceUrl}/search`, { params: buildHttpParams(params) });
  }
}
