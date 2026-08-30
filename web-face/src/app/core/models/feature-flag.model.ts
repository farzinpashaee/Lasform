/** Mirrors com.csl.lasform.controller.FeatureFlagStatus. */
export interface FeatureFlag {
  key: string;
  category: string;
  label: string;
  description?: string;
  enabled: boolean;
}
