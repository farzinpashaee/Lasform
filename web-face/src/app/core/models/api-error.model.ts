/** Mirrors com.csl.lasform.exception.ApiError, the body GlobalExceptionHandler returns on error. */
export interface ApiError {
  timestamp: string;
  status: number;
  message: string;
  fieldErrors?: Record<string, string>;
}
