import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { UserStatus } from '../models/enums';
import { User } from '../models/user.model';

export interface CreateUserRequest {
  email: string;
  temporaryPassword: string;
}

export interface SignUpRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  displayName: string | null;
  status: UserStatus;
}

/**
 * Lives under {@link environment.authApiUrl} (`/api/users`), not `/api/v1` like CrudService's
 * resources — this is part of the auth module, not the versioned entity API.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly resourceUrl = `${environment.authApiUrl}/users`;

  /** Requires user:read. Flat/unpaginated — matches the backend, which doesn't paginate this yet either. */
  list(): Observable<User[]> {
    return this.http.get<User[]>(this.resourceUrl);
  }

  /** Requires user:invite. The created user always has mustResetPassword=true. */
  create(request: CreateUserRequest): Observable<User> {
    return this.http.post<User>(this.resourceUrl, request);
  }

  /** Requires user:manage_roles. Additive — grants roleId alongside whatever the user already has. */
  assignRole(userId: string, roleId: string): Observable<void> {
    return this.http.post<void>(`${this.resourceUrl}/${userId}/roles`, { roleId });
  }

  /** Requires user:manage_roles. Idempotent — removing a role the user doesn't have is a no-op. */
  removeRole(userId: string, roleId: string): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${userId}/roles/${roleId}`);
  }

  /** No special permission — any authenticated user may edit their own displayName. */
  updateOwnProfile(displayName: string): Observable<User> {
    return this.http.patch<User>(`${this.resourceUrl}/me`, { displayName });
  }

  /** Requires user:write. Admin editing another user's info/status; the backend rejects disabling yourself this way. */
  update(userId: string, request: UpdateUserRequest): Observable<User> {
    return this.http.patch<User>(`${this.resourceUrl}/${userId}`, request);
  }

  /**
   * Public self-registration — no auth required. The created account is DISABLED with only the
   * VIEWER role, so it can't sign in until an admin activates it (see core/README.md on the backend).
   */
  signUp(request: SignUpRequest): Observable<User> {
    return this.http.post<User>(`${this.resourceUrl}/signup`, request);
  }
}
