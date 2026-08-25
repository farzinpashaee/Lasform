/** Mirrors com.csl.lasform.model.entity.Image — a single image attached to a Location or Device. */
export interface Image {
  filename: string;
  /** Whether this is the entity's primary/cover image; at most one should be true per entity. */
  primary: boolean;
}
