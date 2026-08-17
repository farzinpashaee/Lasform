import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Page, Pageable } from '../models/page.model';
import { Review } from '../models/review.model';
import { buildHttpParams } from './http-params.util';

/** Lives under environment.authApiUrl (`/api`), not `/api/v1` — see ReviewController's @RequestMapping paths. */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);

  /** Public: published, non-deleted reviews only (requires review:view, held by every role including ANONYMOUS). */
  listForLocation(locationId: string, pageable: Pageable = {}): Observable<Page<Review>> {
    return this.http.get<Page<Review>>(`${environment.authApiUrl}/locations/${locationId}/reviews`, {
      params: buildHttpParams(pageable),
    });
  }
}
