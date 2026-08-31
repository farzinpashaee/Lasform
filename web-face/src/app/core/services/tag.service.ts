import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { buildHttpParams } from './http-params.util';

/** Free-text tag autocomplete, aggregated across Location and Device. */
@Injectable({ providedIn: 'root' })
export class TagService {
  private readonly http = inject(HttpClient);

  suggest(prefix: string, limit = 10): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiUrl}/tags`, {
      params: buildHttpParams({ prefix, limit }),
    });
  }
}
