package com.csl.lasform.review.infrastructure.mongo;

import static org.springframework.data.mongodb.core.aggregation.Aggregation.group;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.match;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.newAggregation;

import java.util.Optional;

import org.bson.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.aggregation.GroupOperation;
import org.springframework.data.mongodb.core.aggregation.MatchOperation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Component;

import com.csl.lasform.review.domain.model.Review;
import com.csl.lasform.review.domain.model.ReviewAggregate;
import com.csl.lasform.review.domain.model.ReviewStatus;
import com.csl.lasform.review.domain.repository.ReviewRepository;
import com.csl.lasform.review.infrastructure.mongo.document.ReviewDocument;
import com.csl.lasform.review.infrastructure.mongo.mapper.ReviewMapper;
import com.csl.lasform.review.infrastructure.mongo.springdata.SpringDataReviewRepository;

import lombok.RequiredArgsConstructor;

/** The only place MongoTemplate/aggregation-pipeline types appear for this feature — see ReviewRepository (the domain port) for why. */
@Component
@RequiredArgsConstructor
public class ReviewRepositoryAdapter implements ReviewRepository {

    private static final String COLLECTION = "reviews";

    private final SpringDataReviewRepository springDataReviewRepository;
    private final MongoTemplate mongoTemplate;

    @Override
    public Review save(Review review) {
        ReviewDocument saved = springDataReviewRepository.save(ReviewMapper.toDocument(review));
        return ReviewMapper.toDomain(saved);
    }

    @Override
    public Optional<Review> findById(String id) {
        return springDataReviewRepository.findById(id).map(ReviewMapper::toDomain);
    }

    @Override
    public Optional<Review> findByLocationIdAndUserId(String locationId, String userId) {
        return springDataReviewRepository.findByLocationIdAndUserId(locationId, userId).map(ReviewMapper::toDomain);
    }

    @Override
    public Page<Review> findPublishedByLocationId(String locationId, Pageable pageable) {
        return springDataReviewRepository
                .findByLocationIdAndStatusAndDeletedFalse(locationId, ReviewStatus.PUBLISHED, pageable)
                .map(ReviewMapper::toDomain);
    }

    @Override
    public Page<Review> findByStatus(ReviewStatus status, Pageable pageable) {
        return springDataReviewRepository.findByStatusAndDeletedFalse(status, pageable).map(ReviewMapper::toDomain);
    }

    @Override
    public ReviewAggregate aggregatePublished(String locationId) {
        MatchOperation matchStage = match(Criteria.where("locationId")
                .is(locationId)
                .and("status")
                .is(ReviewStatus.PUBLISHED)
                .and("deleted")
                .is(false));
        GroupOperation groupStage = group().avg("rating").as("averageRating").count().as("reviewCount");

        Aggregation aggregation = newAggregation(matchStage, groupStage);
        AggregationResults<Document> results = mongoTemplate.aggregate(aggregation, COLLECTION, Document.class);
        Document result = results.getUniqueMappedResult();
        if (result == null) {
            return ReviewAggregate.EMPTY;
        }
        double average = result.get("averageRating", Number.class).doubleValue();
        long count = result.get("reviewCount", Number.class).longValue();
        return new ReviewAggregate(average, count);
    }
}
