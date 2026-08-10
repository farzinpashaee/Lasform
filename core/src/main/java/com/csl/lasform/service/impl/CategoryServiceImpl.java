package com.csl.lasform.service.impl;

import java.util.List;
import java.util.regex.Pattern;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import com.csl.lasform.exception.DuplicateResourceException;
import com.csl.lasform.exception.ResourceNotFoundException;
import com.csl.lasform.model.entity.Category;
import com.csl.lasform.repository.CategoryRepository;
import com.csl.lasform.service.CategoryService;

@Service
@Validated
public class CategoryServiceImpl extends AbstractCrudService<Category, String> implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final MongoTemplate mongoTemplate;

    public CategoryServiceImpl(CategoryRepository categoryRepository, MongoTemplate mongoTemplate) {
        super(categoryRepository);
        this.categoryRepository = categoryRepository;
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public Category create(Category entity) {
        if (categoryRepository.existsByName(entity.getName())) {
            throw new DuplicateResourceException("Category name already in use: " + entity.getName());
        }
        return super.create(entity);
    }

    @Override
    public Category findByName(String name) {
        return categoryRepository.findByName(name)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with name: " + name));
    }

    @Override
    public Page<Category> search(String q, Pageable pageable) {
        Query filter = filterQuery(q);
        long total = mongoTemplate.count(filter, Category.class);
        List<Category> content = mongoTemplate.find(filter.with(pageable), Category.class);
        return new PageImpl<>(content, pageable, total);
    }

    private Query filterQuery(String q) {
        if (q == null || q.isBlank()) {
            return new Query();
        }
        // Pattern.quote guards against regex metacharacters/ReDoS in user-supplied text.
        String pattern = Pattern.quote(q.trim());
        return new Query(new Criteria().orOperator(
                Criteria.where("name").regex(pattern, "i"), Criteria.where("description").regex(pattern, "i")));
    }

    @Override
    protected void applyUpdate(Category existing, Category incoming) {
        existing.setName(incoming.getName());
        existing.setDescription(incoming.getDescription());
        existing.setMarker(incoming.getMarker());
    }

    @Override
    protected String entityName() {
        return "Category";
    }
}
