import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Page, Pageable } from '../models/page.model';
import { buildHttpParams } from './http-params.util';

/**
 * Mirrors AbstractCrudController/CrudService on the backend: create/getById/findAll/
 * update/deleteById against `{apiUrl}/{resourcePath}`. update() is a PATCH partial
 * merge, matching the backend's semantics, so it accepts a Partial<T>.
 */
export abstract class CrudService<T> {
  protected readonly http = inject(HttpClient);

  protected constructor(private readonly resourcePath: string) {}

  protected get resourceUrl(): string {
    return `${environment.apiUrl}/${this.resourcePath}`;
  }

  create(entity: T): Observable<T> {
    return this.http.post<T>(this.resourceUrl, entity);
  }

  getById(id: string): Observable<T> {
    return this.http.get<T>(`${this.resourceUrl}/${id}`);
  }

  findAll(pageable: Pageable = {}): Observable<Page<T>> {
    return this.http.get<Page<T>>(this.resourceUrl, { params: buildHttpParams(pageable) });
  }

  update(id: string, entity: Partial<T>): Observable<T> {
    return this.http.patch<T>(`${this.resourceUrl}/${id}`, entity);
  }

  deleteById(id: string): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${id}`);
  }
}
