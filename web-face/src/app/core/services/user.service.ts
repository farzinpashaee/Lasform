import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { User } from '../models/user.model';
import { CrudService } from './crud.service';

@Injectable({ providedIn: 'root' })
export class UserService extends CrudService<User> {
  constructor() {
    super('users');
  }

  findByUsername(username: string): Observable<User> {
    return this.http.get<User>(`${this.resourceUrl}/by-username/${username}`);
  }

  findByEmail(email: string): Observable<User> {
    return this.http.get<User>(`${this.resourceUrl}/by-email/${email}`);
  }
}
