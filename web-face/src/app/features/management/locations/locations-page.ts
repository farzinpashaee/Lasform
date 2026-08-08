import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Category } from '../../../core/models/category.model';
import { Location } from '../../../core/models/location.model';
import { CategoryService } from '../../../core/services/category.service';
import { LocationService } from '../../../core/services/location.service';
import { TagService } from '../../../core/services/tag.service';

interface SortableColumn {
  field: string;
  label: string;
}

const PAGE_SIZE = 20;

const SORTABLE_COLUMNS: SortableColumn[] = [
  { field: 'name', label: 'Name' },
  { field: 'recordedAt', label: 'Recorded' },
  { field: 'createdAt', label: 'Created' },
  { field: 'updatedAt', label: 'Updated' },
];

@Component({
  selector: 'app-locations-page',
  imports: [FormsModule, DatePipe],
  templateUrl: './locations-page.html',
  styleUrl: './locations-page.scss',
})
export class LocationsPage implements OnInit, OnDestroy {
  private readonly locationService = inject(LocationService);
  private readonly categoryService = inject(CategoryService);
  private readonly tagService = inject(TagService);

  protected readonly sortableColumns = SORTABLE_COLUMNS;

  protected readonly locations = signal<Location[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly page = signal(0);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);

  protected readonly searchTerm = signal('');
  protected readonly categories = signal<Category[]>([]);
  protected readonly selectedCategoryId = signal('');
  protected readonly selectedTags = signal<string[]>([]);
  protected readonly tagFilterInput = signal('');
  protected readonly tagFilterSuggestions = signal<string[]>([]);

  protected readonly sortField = signal('name');
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');

  protected readonly categoryMap = computed(() => {
    const map = new Map<string, Category>();
    for (const category of this.categories()) {
      if (category.id) {
        map.set(category.id, category);
      }
    }
    return map;
  });

  protected readonly formOpen = signal(false);
  protected readonly formMode = signal<'add' | 'edit'>('add');
  protected readonly formSaving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly formName = signal('');
  protected readonly formDescription = signal('');
  protected readonly formLatitude = signal<number | null>(null);
  protected readonly formLongitude = signal<number | null>(null);
  protected readonly formCategoryId = signal('');
  protected readonly formTagInput = signal('');
  protected readonly formTags = signal<string[]>([]);
  protected readonly formTagSuggestions = signal<string[]>([]);

  private editingLocation: Location | null = null;
  private searchDebounceTimer?: ReturnType<typeof setTimeout>;
  private tagFilterDebounceTimer?: ReturnType<typeof setTimeout>;
  private formTagDebounceTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.loadLocations();
    this.categoryService.findAll({ size: 100, sort: 'name,asc' }).subscribe((page) => {
      this.categories.set(page.content);
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.searchDebounceTimer);
    clearTimeout(this.tagFilterDebounceTimer);
    clearTimeout(this.formTagDebounceTimer);
  }

  private loadLocations(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.locationService
      .search({
        q: this.searchTerm().trim() || undefined,
        categoryId: this.selectedCategoryId() || undefined,
        tags: this.selectedTags().length > 0 ? this.selectedTags() : undefined,
        page: this.page(),
        size: PAGE_SIZE,
        sort: `${this.sortField()},${this.sortDirection()}`,
      })
      .subscribe({
        next: (result) => {
          this.loading.set(false);
          this.locations.set(result.content);
          this.totalElements.set(result.totalElements);
          this.totalPages.set(result.totalPages);
        },
        error: () => {
          this.loading.set(false);
          this.locations.set([]);
          this.loadError.set('Failed to load locations. Please try again.');
        },
      });
  }

  /** Debounces search so we don't fire a backend call per keystroke. */
  protected onSearchInputChange(value: string): void {
    this.searchTerm.set(value);
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.page.set(0);
      this.loadLocations();
    }, 300);
  }

  protected onCategoryFilterChange(): void {
    this.page.set(0);
    this.loadLocations();
  }

  protected onTagFilterInputChange(value: string): void {
    this.tagFilterInput.set(value);
    clearTimeout(this.tagFilterDebounceTimer);

    const prefix = value.trim();
    if (prefix.length < 2) {
      this.tagFilterSuggestions.set([]);
      return;
    }
    this.tagFilterDebounceTimer = setTimeout(() => {
      this.tagService.suggest(prefix).subscribe({
        next: (suggestions) => {
          const alreadySelected = new Set(this.selectedTags());
          this.tagFilterSuggestions.set(suggestions.filter((tag) => !alreadySelected.has(tag)));
        },
        error: () => this.tagFilterSuggestions.set([]),
      });
    }, 250);
  }

  protected onTagFilterInputKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ',') {
      return;
    }
    event.preventDefault();
    this.addTagFilter(this.tagFilterInput());
  }

  protected addTagFilter(rawTag: string): void {
    const tag = rawTag.trim();
    if (!tag) {
      return;
    }
    if (!this.selectedTags().includes(tag)) {
      this.selectedTags.update((tags) => [...tags, tag]);
      this.page.set(0);
      this.loadLocations();
    }
    this.tagFilterInput.set('');
    this.tagFilterSuggestions.set([]);
  }

  protected removeTagFilter(tag: string): void {
    this.selectedTags.update((tags) => tags.filter((t) => t !== tag));
    this.page.set(0);
    this.loadLocations();
  }

  protected sortBy(field: string): void {
    if (this.sortField() === field) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
    this.page.set(0);
    this.loadLocations();
  }

  protected goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages() || page === this.page()) {
      return;
    }
    this.page.set(page);
    this.loadLocations();
  }

  protected categoryLabel(categoryId: string): string {
    const category = this.categoryMap().get(categoryId);
    if (!category) {
      return categoryId;
    }
    return category.marker ? `${category.marker} ${category.name}` : category.name;
  }

  protected coordinatesLabel(location: Location): string {
    const [lng, lat] = location.point.coordinates;
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  protected openAddModal(): void {
    this.editingLocation = null;
    this.formMode.set('add');
    this.formName.set('');
    this.formDescription.set('');
    this.formLatitude.set(null);
    this.formLongitude.set(null);
    this.formCategoryId.set('');
    this.formTagInput.set('');
    this.formTags.set([]);
    this.formTagSuggestions.set([]);
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected openEditModal(location: Location): void {
    this.editingLocation = location;
    this.formMode.set('edit');
    this.formName.set(location.name ?? '');
    this.formDescription.set(location.description ?? '');
    const [lng, lat] = location.point.coordinates;
    this.formLatitude.set(lat);
    this.formLongitude.set(lng);
    this.formCategoryId.set(location.categoryIds?.[0] ?? '');
    this.formTagInput.set('');
    this.formTags.set([...(location.tags ?? [])]);
    this.formTagSuggestions.set([]);
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.formSaving.set(false);
    this.formTagSuggestions.set([]);
    clearTimeout(this.formTagDebounceTimer);
  }

  protected submitForm(): void {
    const name = this.formName().trim();
    const lat = this.formLatitude();
    const lng = this.formLongitude();
    if (!name || lat == null || lng == null || this.formSaving()) {
      return;
    }
    this.formSaving.set(true);
    this.formError.set(null);

    const categoryId = this.formCategoryId();
    const point = { type: 'Point' as const, coordinates: [lng, lat] as [number, number] };
    const description = this.formDescription().trim() || undefined;
    const categoryIds = categoryId ? [categoryId] : undefined;
    const tags = this.formTags().length > 0 ? this.formTags() : undefined;

    if (this.formMode() === 'add') {
      const location: Location = { point, name, description, categoryIds, tags, recordedAt: new Date().toISOString() };
      this.locationService.create(location).subscribe({
        next: () => this.handleFormSuccess(),
        error: () => this.handleFormError(),
      });
      return;
    }

    const original = this.editingLocation;
    if (!original?.id) {
      this.formSaving.set(false);
      return;
    }
    // Full merged object — PATCH replaces whatever fields are present in the body, so a
    // sparse partial would wipe images/address/metadata that aren't part of this form.
    const updated: Location = { ...original, point, name, description, categoryIds, tags };
    this.locationService.update(original.id, updated).subscribe({
      next: () => this.handleFormSuccess(),
      error: () => this.handleFormError(),
    });
  }

  private handleFormSuccess(): void {
    this.formSaving.set(false);
    this.closeForm();
    this.loadLocations();
  }

  private handleFormError(): void {
    this.formSaving.set(false);
    this.formError.set('Failed to save location. Please try again.');
  }

  protected onFormTagInputChange(value: string): void {
    this.formTagInput.set(value);
    clearTimeout(this.formTagDebounceTimer);

    const prefix = value.trim();
    if (prefix.length < 2) {
      this.formTagSuggestions.set([]);
      return;
    }
    this.formTagDebounceTimer = setTimeout(() => {
      this.tagService.suggest(prefix).subscribe({
        next: (suggestions) => {
          const alreadyAdded = new Set(this.formTags());
          this.formTagSuggestions.set(suggestions.filter((tag) => !alreadyAdded.has(tag)));
        },
        error: () => this.formTagSuggestions.set([]),
      });
    }, 250);
  }

  protected onFormTagInputKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ',') {
      return;
    }
    event.preventDefault();
    this.addFormTag(this.formTagInput());
  }

  protected addFormTag(rawTag: string): void {
    const tag = rawTag.trim();
    if (!tag) {
      return;
    }
    if (!this.formTags().includes(tag)) {
      this.formTags.update((tags) => [...tags, tag]);
    }
    this.formTagInput.set('');
    this.formTagSuggestions.set([]);
  }

  protected removeFormTag(tag: string): void {
    this.formTags.update((tags) => tags.filter((t) => t !== tag));
  }
}
