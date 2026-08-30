/**
 * Google Identity Services is a global <script> singleton, not an npm module — loading it twice
 * throws, so the pending/resolved load is cached here across calls. Mirrors google-maps-script-loader.ts.
 */
let loaderPromise: Promise<void> | null = null;

export function loadGoogleIdentityServices(): Promise<void> {
  if (typeof google !== 'undefined' && google.accounts?.oauth2) {
    return Promise.resolve();
  }
  if (!loaderPromise) {
    loaderPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
  }
  return loaderPromise;
}
