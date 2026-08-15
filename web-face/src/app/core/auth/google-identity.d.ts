/**
 * Hand-written ambient types for the small slice of Google Identity Services' OAuth2 token-client
 * API this app actually uses (see google-auth.service.ts). No `@types/google.identity` package
 * exists to install — this merges into the same global `google` namespace `@types/google.maps`
 * declares, since a .d.ts with no top-level import/export is treated as a global script.
 */
declare namespace google.accounts.oauth2 {
  interface TokenResponse {
    access_token: string;
    error?: string;
    error_description?: string;
  }

  interface TokenClientError {
    type: string;
    message?: string;
  }

  interface TokenClientConfig {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: TokenClientError) => void;
  }

  interface TokenClient {
    requestAccessToken(overrideConfig?: { prompt?: string }): void;
  }

  function initTokenClient(config: TokenClientConfig): TokenClient;
}
