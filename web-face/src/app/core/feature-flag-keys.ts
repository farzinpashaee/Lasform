/** The well-known feature-flag keys checked directly by name — see com.csl.lasform.service.FeatureFlag. */
export const FEATURE_FLAGS = {
  darkMode: 'lasform.ui.darkMode',
  mapClustering: 'lasform.map.clustering',
  locationReviews: 'lasform.location.reviews',
  googleSso: 'lasform.security.googleSso',
} as const;
