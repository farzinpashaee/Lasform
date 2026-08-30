import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Category } from '../models/category.model';
import { Page, Pageable } from '../models/page.model';
import { CrudService } from './crud.service';
import { buildHttpParams } from './http-params.util';

export interface CategorySearchParams extends Pageable {
  q?: string;
}

@Injectable({ providedIn: 'root' })
export class CategoryService extends CrudService<Category> {
  constructor() {
    super('categories');
  }

  findByName(name: string): Observable<Category> {
    return this.http.get<Category>(`${this.resourceUrl}/by-name/${name}`);
  }

  /** Paginated/sortable listing, optionally filtered by free-text query. */
  search(params: CategorySearchParams = {}): Observable<Page<Category>> {
    return this.http.get<Page<Category>>(`${this.resourceUrl}/search`, { params: buildHttpParams(params) });
  }
}
