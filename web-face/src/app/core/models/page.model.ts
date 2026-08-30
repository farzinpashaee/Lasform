/** Mirrors Spring Data's Page<T> JSON shape, returned by every list() endpoint. */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

/** Query params accepted by Spring Data's Pageable resolver. */
export interface Pageable {
  page?: number;
  size?: number;
  /** e.g. 'createdAt,desc' — repeat the field for multi-property sort. */
  sort?: string | string[];
}
