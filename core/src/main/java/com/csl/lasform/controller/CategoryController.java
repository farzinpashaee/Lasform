package com.csl.lasform.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.model.entity.Category;
import com.csl.lasform.service.CategoryService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/categories")
public class CategoryController extends AbstractCrudController<Category> {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @Override
    protected CategoryService service() {
        return categoryService;
    }

    @PostMapping
    public ResponseEntity<Category> create(@Valid @RequestBody Category entity) {
        return createOne(entity);
    }

    @GetMapping("/by-name/{name}")
    public Category getByName(@PathVariable String name) {
        return categoryService.findByName(name);
    }
}
