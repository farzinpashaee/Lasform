/** Fields contributed by every entity extending Auditable, as ISO-8601 instants. */
export interface Auditable {
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}
