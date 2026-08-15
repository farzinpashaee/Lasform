import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { loadGoogleIdentityServices } from './google-identity-script-loader';

/** Thrown when the user closes the Google popup or denies consent — callers should treat this as silent, not an error to surface. */
export class GoogleSignInCancelledError extends Error {}

/**
 * Wraps Google Identity Services' OAuth2 token-client flow (a real popup on click, unlike the
 * flakier One Tap prompt) so login/signup pages don't each reimplement the callback-to-Promise
 * plumbing. Only asks for `openid email profile` — just enough for the backend's
 * GoogleUserInfoClient to read fullname/email/picture; no ongoing access to any Google API.
 */
@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  /** Reused across calls — Google's own guidance is to create the token client once, not per click. */
  private tokenClient?: google.accounts.oauth2.TokenClient;

  async requestAccessToken(): Promise<string> {
    if (!environment.googleClientId) {
      throw new Error('googleClientId is not set in the environment; Google sign-in is not configured.');
    }
    await loadGoogleIdentityServices();

    return new Promise<string>((resolve, reject) => {
      // (Re)assigning the callback per call rather than per client, since each call needs its own
      // resolve/reject closure — initTokenClient itself is cheap and safe to call again.
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: environment.googleClientId,
        scope: 'openid email profile',
        callback: (response) => {
          if (response.error) {
            reject(new GoogleSignInCancelledError(response.error_description || response.error));
            return;
          }
          resolve(response.access_token);
        },
        error_callback: (error) => {
          reject(new GoogleSignInCancelledError(error.message || error.type));
        },
      });
      this.tokenClient.requestAccessToken();
    });
  }
}
