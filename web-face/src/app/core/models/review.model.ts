/** Mirrors com.csl.lasform.review.infrastructure.web.dto.ReviewResponse. */
export interface Review {
  id: string;
  locationId: string;
  userId: string;
  rating: number;
  reviewText?: string;
  status: 'PENDING' | 'PUBLISHED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}
