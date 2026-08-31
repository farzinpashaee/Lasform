import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { Category } from '../../../core/models/category.model';
import { PhoneNumberType } from '../../../core/models/enums';
import { Image } from '../../../core/models/image.model';
import { Location } from '../../../core/models/location.model';
import { PhoneNumber } from '../../../core/models/phone-number.model';
import { CategoryService } from '../../../core/services/category.service';
import { LocationService } from '../../../core/services/location.service';
import { TagService } from '../../../core/services/tag.service';

interface SortableColumn {
  field: string;
  /** A transloco translation key, not display text — resolved in the template via the transloco pipe. */
  labelKey: string;
}

const PAGE_SIZE = 10;

const SORTABLE_COLUMNS: SortableColumn[] = [
  { field: 'name', labelKey: 'common.nameColumn' },
  { field: 'createdAt', labelKey: 'common.createdColumn' },
  { field: 'updatedAt', labelKey: 'common.updatedColumn' },
];

const PHONE_NUMBER_TYPES: PhoneNumberType[] = ['MOBILE', 'LANDLINE', 'FAX', 'WHATSAPP', 'TOLL_FREE', 'OTHER'];

/** Kept in sync with FileSystemImageStorageService's allow-list (core/.../ImageStorageProperties). */
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-locations-page',
  imports: [FormsModule, DatePipe, TranslocoPipe],
  templateUrl: './locations-page.html',
  styleUrl: './locations-page.scss',
})
export class LocationsPage implements OnInit, OnDestroy {
  private readonly locationService = inject(LocationService);
  private readonly categoryService = inject(CategoryService);
  private readonly tagService = inject(TagService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly sortableColumns = SORTABLE_COLUMNS;
  protected readonly phoneNumberTypes = PHONE_NUMBER_TYPES;

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
  protected readonly formPhoneNumbers = signal<PhoneNumber[]>([]);

  protected readonly formImages = signal<Image[]>([]);
  protected readonly formImageUrls = signal<Map<string, string>>(new Map());
  protected readonly imageUploading = signal(false);
  protected readonly imageDragOver = signal(false);
  protected readonly imageError = signal<string | null>(null);
  private imageUploadQueue: File[] = [];

  protected readonly deleteTarget = signal<Location | null>(null);
  protected readonly deletingLocation = signal(false);
  protected readonly deleteError = signal<string | null>(null);

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
    this.revokeImageUrls();
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
          this.loadError.set(this.transloco.translate('locations.loadFailed'));
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

  protected viewOnMap(location: Location): void {
    if (!location.id) {
      return;
    }
    this.router.navigate(['/'], { queryParams: { locationId: location.id } });
  }

  protected categoryLabel(categoryId: string): string {
    const category = this.categoryMap().get(categoryId);
    if (!category) {
      return categoryId;
    }
    return category.marker ? `${category.marker} ${category.name}` : category.name;
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
    this.formPhoneNumbers.set([]);
    this.formError.set(null);
    this.resetImageState();
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
    this.formPhoneNumbers.set((location.phoneNumbers ?? []).map((phone) => ({ ...phone })));
    this.formError.set(null);
    this.resetImageState();
    this.formImages.set([...(location.images ?? [])]);
    for (const image of location.images ?? []) {
      this.loadImageThumbnail(image.filename);
    }
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.formSaving.set(false);
    this.formTagSuggestions.set([]);
    clearTimeout(this.formTagDebounceTimer);
    this.revokeImageUrls();
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
    const phoneNumbers = this.collectFormPhoneNumbers();

    if (this.formMode() === 'add') {
      const location: Location = {
        point,
        name,
        description,
        categoryIds,
        tags,
        phoneNumbers,
      };
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
    const updated: Location = { ...original, point, name, description, categoryIds, tags, phoneNumbers };
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
    this.formError.set(this.transloco.translate('locations.saveFailed'));
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

  protected addFormPhoneNumber(): void {
    this.formPhoneNumbers.update((phones) => [...phones, { type: 'MOBILE', countryCode: '', number: '', extension: '' }]);
  }

  protected removeFormPhoneNumber(index: number): void {
    this.formPhoneNumbers.update((phones) => phones.filter((_, i) => i !== index));
  }

  protected updateFormPhoneNumber(index: number, field: keyof PhoneNumber, value: string): void {
    this.formPhoneNumbers.update((phones) =>
      phones.map((phone, i) => (i === index ? { ...phone, [field]: value } : phone)),
    );
  }

  /** Blank rows (no number entered) are dropped rather than sent to the backend. */
  private collectFormPhoneNumbers(): PhoneNumber[] | undefined {
    const phones = this.formPhoneNumbers()
      .filter((phone) => phone.number.trim())
      .map((phone) => ({
        type: phone.type,
        countryCode: phone.countryCode?.trim() || undefined,
        number: phone.number.trim(),
        extension: phone.extension?.trim() || undefined,
      }));
    return phones.length > 0 ? phones : undefined;
  }

  /** File-picker `<input>` change handler. Resets the input afterward so re-picking the same file re-fires change. */
  protected onImageInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.queueImageUploads(input.files ? Array.from(input.files) : []);
    input.value = '';
  }

  protected onImageDrop(event: DragEvent): void {
    event.preventDefault();
    this.imageDragOver.set(false);
    this.queueImageUploads(event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : []);
  }

  protected onImageDragOver(event: DragEvent): void {
    event.preventDefault();
    this.imageDragOver.set(true);
  }

  protected onImageDragLeave(): void {
    this.imageDragOver.set(false);
  }

  /** Validates client-side (fast feedback), then uploads one at a time — see uploadNextQueuedImage for why. */
  private queueImageUploads(files: File[]): void {
    const locationId = this.editingLocation?.id;
    if (!locationId || files.length === 0) {
      return;
    }
    this.imageError.set(null);

    const valid: File[] = [];
    for (const file of files) {
      const error = this.validateImageFile(file);
      if (error) {
        this.imageError.set(error);
      } else {
        valid.push(file);
      }
    }
    if (valid.length === 0) {
      return;
    }

    this.imageUploadQueue.push(...valid);
    if (!this.imageUploading()) {
      this.uploadNextQueuedImage();
    }
  }

  private validateImageFile(file: File): string | null {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return this.transloco.translate('locations.images.invalidType');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return this.transloco.translate('locations.images.tooLarge');
    }
    return null;
  }

  /**
   * Uploads the queue one file at a time rather than in parallel: the backend auto-marks the
   * first image on a location as primary, and concurrent requests hitting that empty-list check
   * at once could both win, leaving two images marked primary.
   */
  private uploadNextQueuedImage(): void {
    const locationId = this.editingLocation?.id;
    const file = this.imageUploadQueue.shift();
    if (!locationId || !file) {
      this.imageUploading.set(false);
      return;
    }
    this.imageUploading.set(true);
    this.locationService.uploadImage(locationId, file).subscribe({
      next: (image) => {
        this.onImageUploaded(image);
        this.uploadNextQueuedImage();
      },
      error: () => {
        this.imageError.set(this.transloco.translate('locations.images.uploadFailed'));
        this.uploadNextQueuedImage();
      },
    });
  }

  private onImageUploaded(image: Image): void {
    this.formImages.update((images) => [
      ...images.map((existing) => (image.primary ? { ...existing, primary: false } : existing)),
      image,
    ]);
    this.syncEditingLocationImages();
    this.loadImageThumbnail(image.filename);
  }

  private loadImageThumbnail(filename: string): void {
    const locationId = this.editingLocation?.id;
    if (!locationId) {
      return;
    }
    this.locationService.loadImage(locationId, filename).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.formImageUrls.update((urls) => new Map(urls).set(filename, url));
      },
      error: () => {},
    });
  }

  protected setPrimaryImage(filename: string): void {
    const locationId = this.editingLocation?.id;
    if (!locationId) {
      return;
    }
    this.locationService.setPrimaryImage(locationId, filename).subscribe({
      next: () => {
        this.formImages.update((images) =>
          images.map((image) => ({ ...image, primary: image.filename === filename })),
        );
        this.syncEditingLocationImages();
      },
      error: () => this.imageError.set(this.transloco.translate('locations.images.updateFailed')),
    });
  }

  protected removeImage(filename: string): void {
    const locationId = this.editingLocation?.id;
    if (!locationId) {
      return;
    }
    this.locationService.deleteImage(locationId, filename).subscribe({
      next: () => {
        this.formImages.update((images) => images.filter((image) => image.filename !== filename));
        this.syncEditingLocationImages();
        const url = this.formImageUrls().get(filename);
        if (url) {
          URL.revokeObjectURL(url);
          this.formImageUrls.update((urls) => {
            const next = new Map(urls);
            next.delete(filename);
            return next;
          });
        }
      },
      error: () => this.imageError.set(this.transloco.translate('locations.images.deleteFailed')),
    });
  }

  /**
   * Keeps `editingLocation` and the row in `locations()` in step with `formImages` after every
   * upload/delete/set-primary. Without this, `editingLocation.images` stays frozen at whatever it
   * was when the modal opened — so re-opening the same row's edit modal would show stale photos,
   * and worse, `submitForm`'s edit-mode PATCH spreads `{ ...editingLocation, ... }` and would send
   * that stale `images` array right back to the server, undoing the upload on the next save.
   */
  private syncEditingLocationImages(): void {
    const current = this.editingLocation;
    if (!current?.id) {
      return;
    }
    const updated: Location = { ...current, images: this.formImages() };
    this.editingLocation = updated;
    this.locations.update((list) => list.map((location) => (location.id === updated.id ? updated : location)));
  }

  private resetImageState(): void {
    this.revokeImageUrls();
    this.imageUploadQueue = [];
    this.imageUploading.set(false);
    this.imageDragOver.set(false);
    this.imageError.set(null);
    this.formImages.set([]);
  }

  private revokeImageUrls(): void {
    for (const url of this.formImageUrls().values()) {
      URL.revokeObjectURL(url);
    }
    this.formImageUrls.set(new Map());
  }

  protected openDeleteConfirm(location: Location): void {
    this.deleteTarget.set(location);
    this.deleteError.set(null);
  }

  protected closeDeleteConfirm(): void {
    this.deleteTarget.set(null);
    this.deletingLocation.set(false);
  }

  protected confirmDelete(): void {
    const location = this.deleteTarget();
    if (!location?.id || this.deletingLocation()) {
      return;
    }
    this.deletingLocation.set(true);
    this.deleteError.set(null);

    this.locationService.deleteById(location.id).subscribe({
      next: () => {
        this.deletingLocation.set(false);
        this.closeDeleteConfirm();
        this.loadLocations();
      },
      error: () => {
        this.deletingLocation.set(false);
        this.deleteError.set(this.transloco.translate('locations.deleteFailed'));
      },
    });
  }
}
