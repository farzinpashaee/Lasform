/**
 * Decodes a JWT's payload without verifying its signature — the browser has no way to verify an
 * HMAC-signed token anyway (it doesn't have the secret), and it isn't meant to: this is purely
 * for reading claims to drive UI state (which permissions to show/hide, when the token expires).
 * The backend re-verifies and re-authorizes every request regardless of what the UI thinks.
 */
export function decodeJwtPayload<T>(token: string): T | null {
  const segments = token.split('.');
  if (segments.length !== 3) {
    return null;
  }
  try {
    const base64 = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    // atob gives a byte-per-char string; re-encode each byte as %XX so decodeURIComponent can
    // rebuild it as proper UTF-8 (handles non-ASCII claim values correctly).
    const json = decodeURIComponent(
      Array.from(binary, (char) => '%' + char.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
    );
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
