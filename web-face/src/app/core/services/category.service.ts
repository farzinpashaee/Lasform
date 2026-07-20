import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Category } from '../models/category.model';
import { CrudService } from './crud.service';

@Injectable({ providedIn: 'root' })
export class CategoryService extends CrudService<Category> {
  constructor() {
    super('categories');
  }

  findByName(name: string): Observable<Category> {
    return this.http.get<Category>(`${this.resourceUrl}/by-name/${name}`);
  }
}
