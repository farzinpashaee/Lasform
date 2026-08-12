import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Role } from '../models/role.model';

/** Read-only — see core/README.md on the backend for why there's no role CRUD yet. */
@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly http = inject(HttpClient);
  private readonly resourceUrl = `${environment.authApiUrl}/roles`;

  /** Requires user:manage_roles — this exists to power the role picker on the user-management screen. */
  list(): Observable<Role[]> {
    return this.http.get<Role[]>(this.resourceUrl);
  }
}
