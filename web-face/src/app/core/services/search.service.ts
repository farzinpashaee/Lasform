import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Page } from '../models/page.model';
import { SearchHit, SearchResultType } from '../models/search.model';
import { buildHttpParams } from './http-params.util';

export interface SearchParams {
  /** Free-text match against name/tags. */
  q?: string;
  type?: SearchResultType;
  category?: string;
  tag?: string;
  page?: number;
  size?: number;
}

/** Cross-entity search over Location and Device, backing GET /api/v1/search. */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly http = inject(HttpClient);

  search(params: SearchParams): Observable<Page<SearchHit>> {
    return this.http.get<Page<SearchHit>>(`${environment.apiUrl}/search`, {
      params: buildHttpParams(params),
    });
  }
}
