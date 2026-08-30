package com.csl.lasform.service.impl;

import java.util.List;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.regex.Pattern;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import com.csl.lasform.model.entity.Device;
import com.csl.lasform.model.entity.Location;
import com.csl.lasform.service.TagService;

/**
 * MongoDB's distinct command only uses the query to pick which documents to scan — it doesn't
 * filter individual array elements — so matching a prefix against each tag has to happen here in
 * application code rather than as a distinct+filter Mongo query.
 */
@Service
public class TagServiceImpl implements TagService {

    /** Caps how many candidate documents each collection scan pulls back, not the result count. */
    private static final int MAX_DOCUMENTS_SCANNED = 200;

    private final MongoTemplate mongoTemplate;

    public TagServiceImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public List<String> suggest(String prefix, int limit) {
        String trimmed = prefix == null ? "" : prefix.trim();
        if (trimmed.isEmpty()) {
            return List.of();
        }

        // Pattern.quote guards against regex metacharacters/ReDoS in user-supplied text.
        Query query = new Query(Criteria.where("tags").regex("^" + Pattern.quote(trimmed), "i"))
                .limit(MAX_DOCUMENTS_SCANNED);

        TreeSet<String> matches = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        collectMatchingTags(mongoTemplate.find(query, Location.class), Location::getTags, trimmed, matches);
        collectMatchingTags(mongoTemplate.find(query, Device.class), Device::getTags, trimmed, matches);

        return matches.stream().limit(limit).toList();
    }

    private <T> void collectMatchingTags(
            List<T> documents, Function<T, List<String>> tagsOf, String prefix, TreeSet<String> matches) {
        for (T document : documents) {
            List<String> tags = tagsOf.apply(document);
            if (tags == null) {
                continue;
            }
            for (String tag : tags) {
                if (tag != null && tag.regionMatches(true, 0, prefix, 0, prefix.length())) {
                    matches.add(tag);
                }
            }
        }
    }
}
