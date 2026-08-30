package com.csl.lasform.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.csl.lasform.model.entity.Category;

public interface CategoryService extends CrudService<Category, String> {

    Category findByName(String name);

    /** Paginated/sortable listing, optionally filtered by free-text {@code q} (name/description). */
    Page<Category> search(String q, Pageable pageable);
}
