import { HttpParams } from '@angular/common/http';

/** Builds HttpParams from a plain object, skipping null/undefined and repeating keys for arrays. */
export function buildHttpParams(params: object = {}): HttpParams {
  let httpParams = new HttpParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        httpParams = httpParams.append(key, String(item));
      }
    } else {
      httpParams = httpParams.append(key, String(value));
    }
  }
  return httpParams;
}
