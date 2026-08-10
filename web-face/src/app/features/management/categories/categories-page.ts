import { DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Category } from '../../../core/models/category.model';
import { CategoryService } from '../../../core/services/category.service';

interface SortableColumn {
  field: string;
  label: string;
}

const PAGE_SIZE = 10;

const SORTABLE_COLUMNS: SortableColumn[] = [
  { field: 'name', label: 'Name' },
  { field: 'createdAt', label: 'Created' },
  { field: 'updatedAt', label: 'Updated' },
];

@Component({
  selector: 'app-categories-page',
  imports: [FormsModule, DatePipe],
  templateUrl: './categories-page.html',
  styleUrl: './categories-page.scss',
})
export class CategoriesPage implements OnInit, OnDestroy {
  private readonly categoryService = inject(CategoryService);

  protected readonly sortableColumns = SORTABLE_COLUMNS;

  protected readonly categories = signal<Category[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly page = signal(0);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);

  protected readonly searchTerm = signal('');

  protected readonly sortField = signal('name');
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');

  protected readonly formOpen = signal(false);
  protected readonly formMode = signal<'add' | 'edit'>('add');
  protected readonly formSaving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly formName = signal('');
  protected readonly formDescription = signal('');
  protected readonly formMarker = signal('');

  protected readonly deleteTarget = signal<Category | null>(null);
  protected readonly deletingCategory = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  private editingCategory: Category | null = null;
  private searchDebounceTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.loadCategories();
  }

  ngOnDestroy(): void {
    clearTimeout(this.searchDebounceTimer);
  }

  private loadCategories(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.categoryService
      .search({
        q: this.searchTerm().trim() || undefined,
        page: this.page(),
        size: PAGE_SIZE,
        sort: `${this.sortField()},${this.sortDirection()}`,
      })
      .subscribe({
        next: (result) => {
          this.loading.set(false);
          this.categories.set(result.content);
          this.totalElements.set(result.totalElements);
          this.totalPages.set(result.totalPages);
        },
        error: () => {
          this.loading.set(false);
          this.categories.set([]);
          this.loadError.set('Failed to load categories. Please try again.');
        },
      });
  }

  /** Debounces search so we don't fire a backend call per keystroke. */
  protected onSearchInputChange(value: string): void {
    this.searchTerm.set(value);
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.page.set(0);
      this.loadCategories();
    }, 300);
  }

  protected sortBy(field: string): void {
    if (this.sortField() === field) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
    this.page.set(0);
    this.loadCategories();
  }

  protected goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages() || page === this.page()) {
      return;
    }
    this.page.set(page);
    this.loadCategories();
  }

  protected openAddModal(): void {
    this.editingCategory = null;
    this.formMode.set('add');
    this.formName.set('');
    this.formDescription.set('');
    this.formMarker.set('');
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected openEditModal(category: Category): void {
    this.editingCategory = category;
    this.formMode.set('edit');
    this.formName.set(category.name ?? '');
    this.formDescription.set(category.description ?? '');
    this.formMarker.set(category.marker ?? '');
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.formSaving.set(false);
  }

  protected submitForm(): void {
    const name = this.formName().trim();
    if (!name || this.formSaving()) {
      return;
    }
    this.formSaving.set(true);
    this.formError.set(null);

    const description = this.formDescription().trim() || undefined;
    const marker = this.formMarker().trim() || undefined;

    if (this.formMode() === 'add') {
      const category: Category = { name, description, marker };
      this.categoryService.create(category).subscribe({
        next: () => this.handleFormSuccess(),
        error: () => this.handleFormError(),
      });
      return;
    }

    const original = this.editingCategory;
    if (!original?.id) {
      this.formSaving.set(false);
      return;
    }
    // Full merged object — PATCH replaces whatever fields are present in the body.
    const updated: Category = { ...original, name, description, marker };
    this.categoryService.update(original.id, updated).subscribe({
      next: () => this.handleFormSuccess(),
      error: () => this.handleFormError(),
    });
  }

  private handleFormSuccess(): void {
    this.formSaving.set(false);
    this.closeForm();
    this.loadCategories();
  }

  private handleFormError(): void {
    this.formSaving.set(false);
    this.formError.set('Failed to save category. Please try again.');
  }

  protected openDeleteConfirm(category: Category): void {
    this.deleteTarget.set(category);
    this.deleteError.set(null);
  }

  protected closeDeleteConfirm(): void {
    this.deleteTarget.set(null);
    this.deletingCategory.set(false);
  }

  protected confirmDelete(): void {
    const category = this.deleteTarget();
    if (!category?.id || this.deletingCategory()) {
      return;
    }
    this.deletingCategory.set(true);
    this.deleteError.set(null);

    this.categoryService.deleteById(category.id).subscribe({
      next: () => {
        this.deletingCategory.set(false);
        this.closeDeleteConfirm();
        this.loadCategories();
      },
      error: () => {
        this.deletingCategory.set(false);
        this.deleteError.set('Failed to delete category. Please try again.');
      },
    });
  }
}
