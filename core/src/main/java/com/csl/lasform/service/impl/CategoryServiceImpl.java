package com.csl.lasform.service.impl;

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

    public CategoryServiceImpl(CategoryRepository categoryRepository) {
        super(categoryRepository);
        this.categoryRepository = categoryRepository;
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
    protected void applyUpdate(Category existing, Category incoming) {
        existing.setName(incoming.getName());
        existing.setDescription(incoming.getDescription());
    }

    @Override
    protected String entityName() {
        return "Category";
    }
}
