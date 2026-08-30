/** The namespaced config-entry keys currently read by the frontend — see ConfigController. */
export const CONFIG_KEYS = {
  googleSsoClientId: 'lasform.security.sso.google.client.id',
  googleMapsApiKey: 'map.google.api.key',
  /** See ImageStorageSettingsService (core) for the effective-value/fallback rules. */
  imageStorageBasePath: 'storage.images.base.path',
  imageStorageAllowedExtensions: 'storage.images.allowed.extensions',
  imageStorageMaxFileSizeMb: 'storage.images.max.file.size',
} as const;
