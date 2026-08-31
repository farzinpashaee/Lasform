package com.csl.lasform.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import com.csl.lasform.model.entity.Device;
import com.csl.lasform.model.entity.Location;
import com.csl.lasform.model.search.SearchHit;
import com.csl.lasform.model.search.SearchResultType;
import com.csl.lasform.service.SearchService;

/**
 * MongoDB has no cross-collection join or paginated union, so searching both
 * Location and Device means merging two independently queried, createdAt-sorted
 * lists in application code. The top (offset + limit) rows from each side, merged,
 * always contain the correct page: any document past that cutoff on either side
 * can't rank higher than everything already taken from both.
 */
@Service
public class SearchServiceImpl implements SearchService {

    private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "createdAt");

    private final MongoTemplate mongoTemplate;

    public SearchServiceImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public Page<SearchHit> search(SearchResultType type, String category, String tag, String q, Pageable pageable) {
        boolean includeLocations = type == null || type == SearchResultType.LOCATION;
        boolean includeDevices = type == null || type == SearchResultType.DEVICE;

        if (includeLocations && !includeDevices) {
            return searchSingle(Location.class, SearchResultType.LOCATION, category, tag, q, pageable);
        }
        if (includeDevices && !includeLocations) {
            return searchSingle(Device.class, SearchResultType.DEVICE, category, tag, q, pageable);
        }
        return searchBoth(category, tag, q, pageable);
    }

    private <T> Page<SearchHit> searchSingle(
            Class<T> entityClass, SearchResultType type, String category, String tag, String q, Pageable pageable) {
        long total = mongoTemplate.count(filterQuery(category, tag, q), entityClass);
        List<T> content =
                mongoTemplate.find(filterQuery(category, tag, q).with(NEWEST_FIRST).with(pageable), entityClass);
        List<SearchHit> hits = content.stream().map(item -> new SearchHit(type, item)).toList();
        return new PageImpl<>(hits, pageable, total);
    }

    private Page<SearchHit> searchBoth(String category, String tag, String q, Pageable pageable) {
        int offset = pageable.getPageNumber() * pageable.getPageSize();
        int window = offset + pageable.getPageSize();

        List<Location> locations = mongoTemplate.find(
                filterQuery(category, tag, q).with(NEWEST_FIRST).limit(window), Location.class);
        List<Device> devices = mongoTemplate.find(
                filterQuery(category, tag, q).with(NEWEST_FIRST).limit(window), Device.class);

        long totalLocations = mongoTemplate.count(filterQuery(category, tag, q), Location.class);
        long totalDevices = mongoTemplate.count(filterQuery(category, tag, q), Device.class);

        List<SearchHit> merged = mergeNewestFirst(locations, devices);
        int from = Math.min(offset, merged.size());
        int to = Math.min(offset + pageable.getPageSize(), merged.size());

        return new PageImpl<>(merged.subList(from, to), pageable, totalLocations + totalDevices);
    }

    /** Both inputs are already sorted createdAt-descending; a standard two-pointer merge preserves that order. */
    private List<SearchHit> mergeNewestFirst(List<Location> locations, List<Device> devices) {
        List<SearchHit> merged = new ArrayList<>(locations.size() + devices.size());
        int i = 0;
        int j = 0;
        while (i < locations.size() && j < devices.size()) {
            if (!locations.get(i).getCreatedAt().isBefore(devices.get(j).getCreatedAt())) {
                merged.add(new SearchHit(SearchResultType.LOCATION, locations.get(i++)));
            } else {
                merged.add(new SearchHit(SearchResultType.DEVICE, devices.get(j++)));
            }
        }
        while (i < locations.size()) {
            merged.add(new SearchHit(SearchResultType.LOCATION, locations.get(i++)));
        }
        while (j < devices.size()) {
            merged.add(new SearchHit(SearchResultType.DEVICE, devices.get(j++)));
        }
        return merged;
    }

    /** {@code categoryIds}/{@code tags} are arrays on both Location and Device; equality on an array field means "contains". */
    private Query filterQuery(String category, String tag, String q) {
        List<Criteria> criteria = new ArrayList<>();
        if (category != null) {
            criteria.add(Criteria.where("categoryIds").is(category));
        }
        if (tag != null) {
            criteria.add(Criteria.where("tags").is(tag));
        }
        if (q != null && !q.isBlank()) {
            // Pattern.quote guards against regex metacharacters/ReDoS in user-supplied text.
            String pattern = Pattern.quote(q.trim());
            criteria.add(new Criteria()
                    .orOperator(Criteria.where("name").regex(pattern, "i"), Criteria.where("tags").regex(pattern, "i")));
        }
        if (criteria.isEmpty()) {
            return new Query();
        }
        return new Query(new Criteria().andOperator(criteria.toArray(new Criteria[0])));
    }
}
