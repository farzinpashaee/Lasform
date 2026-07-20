/**
 * Google's JS API is a global <script> singleton, not an npm module - loading it twice
 * (e.g. if two providers were ever instantiated) throws, so the pending/resolved load
 * is cached here across calls.
 */
let loaderPromise: Promise<void> | null = null;

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof google !== 'undefined' && google.maps) {
    return Promise.resolve();
  }
  if (!apiKey) {
    return Promise.reject(
      new Error('googleMapsApiKey is not set in the environment; cannot load Google Maps.'),
    );
  }
  if (!loaderPromise) {
    loaderPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load the Google Maps JavaScript API'));
      document.head.appendChild(script);
    });
  }
  return loaderPromise;
}
