package com.csl.lasform.review.infrastructure.mongo.springdata;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.csl.lasform.review.domain.model.ReviewStatus;
import com.csl.lasform.review.infrastructure.mongo.document.ReviewDocument;

public interface SpringDataReviewRepository extends MongoRepository<ReviewDocument, String> {

    Optional<ReviewDocument> findByLocationIdAndUserId(String locationId, String userId);

    Page<ReviewDocument> findByLocationIdAndStatusAndDeletedFalse(String locationId, ReviewStatus status, Pageable pageable);

    Page<ReviewDocument> findByStatusAndDeletedFalse(ReviewStatus status, Pageable pageable);
}
