package com.csl.lasform.service;

import com.csl.lasform.model.entity.Category;

public interface CategoryService extends CrudService<Category, String> {

    Category findByName(String name);
}
