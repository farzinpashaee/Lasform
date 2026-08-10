import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Category } from '../../../core/models/category.model';
import { Device } from '../../../core/models/device.model';
import { DeviceStatus, DeviceType } from '../../../core/models/enums';
import { CategoryService } from '../../../core/services/category.service';
import { DeviceService } from '../../../core/services/device.service';
import { TagService } from '../../../core/services/tag.service';

interface SortableColumn {
  field: string;
  label: string;
}

const PAGE_SIZE = 10;

const SORTABLE_COLUMNS: SortableColumn[] = [
  { field: 'name', label: 'Name' },
  { field: 'lastSeenAt', label: 'Last Seen' },
  { field: 'createdAt', label: 'Created' },
  { field: 'updatedAt', label: 'Updated' },
];

const DEVICE_TYPES: DeviceType[] = ['GPS_TRACKER', 'MOBILE_PHONE', 'VEHICLE_UNIT', 'WEARABLE', 'IOT_SENSOR', 'OTHER'];

const DEVICE_STATUSES: DeviceStatus[] = ['ACTIVE', 'INACTIVE', 'OFFLINE', 'MAINTENANCE', 'DECOMMISSIONED'];

@Component({
  selector: 'app-devices-page',
  imports: [FormsModule, DatePipe],
  templateUrl: './devices-page.html',
  styleUrl: './devices-page.scss',
})
export class DevicesPage implements OnInit, OnDestroy {
  private readonly deviceService = inject(DeviceService);
  private readonly categoryService = inject(CategoryService);
  private readonly tagService = inject(TagService);

  protected readonly sortableColumns = SORTABLE_COLUMNS;
  protected readonly deviceTypes = DEVICE_TYPES;
  protected readonly deviceStatuses = DEVICE_STATUSES;

  protected readonly devices = signal<Device[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly page = signal(0);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);

  protected readonly searchTerm = signal('');
  protected readonly categories = signal<Category[]>([]);
  protected readonly selectedCategoryId = signal('');
  protected readonly selectedStatus = signal<DeviceStatus | ''>('');
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
  protected readonly formDeviceIdentifier = signal('');
  protected readonly formName = signal('');
  protected readonly formOwnerId = signal('');
  protected readonly formType = signal<DeviceType>('GPS_TRACKER');
  protected readonly formStatus = signal<DeviceStatus>('INACTIVE');
  protected readonly formCategoryId = signal('');
  protected readonly formTagInput = signal('');
  protected readonly formTags = signal<string[]>([]);
  protected readonly formTagSuggestions = signal<string[]>([]);

  protected readonly deleteTarget = signal<Device | null>(null);
  protected readonly deletingDevice = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  private editingDevice: Device | null = null;
  private searchDebounceTimer?: ReturnType<typeof setTimeout>;
  private tagFilterDebounceTimer?: ReturnType<typeof setTimeout>;
  private formTagDebounceTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.loadDevices();
    this.categoryService.findAll({ size: 100, sort: 'name,asc' }).subscribe((page) => {
      this.categories.set(page.content);
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.searchDebounceTimer);
    clearTimeout(this.tagFilterDebounceTimer);
    clearTimeout(this.formTagDebounceTimer);
  }

  private loadDevices(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.deviceService
      .search({
        q: this.searchTerm().trim() || undefined,
        categoryId: this.selectedCategoryId() || undefined,
        status: this.selectedStatus() || undefined,
        tags: this.selectedTags().length > 0 ? this.selectedTags() : undefined,
        page: this.page(),
        size: PAGE_SIZE,
        sort: `${this.sortField()},${this.sortDirection()}`,
      })
      .subscribe({
        next: (result) => {
          this.loading.set(false);
          this.devices.set(result.content);
          this.totalElements.set(result.totalElements);
          this.totalPages.set(result.totalPages);
        },
        error: () => {
          this.loading.set(false);
          this.devices.set([]);
          this.loadError.set('Failed to load devices. Please try again.');
        },
      });
  }

  /** Debounces search so we don't fire a backend call per keystroke. */
  protected onSearchInputChange(value: string): void {
    this.searchTerm.set(value);
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.page.set(0);
      this.loadDevices();
    }, 300);
  }

  protected onCategoryFilterChange(): void {
    this.page.set(0);
    this.loadDevices();
  }

  protected onStatusFilterChange(): void {
    this.page.set(0);
    this.loadDevices();
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
      this.loadDevices();
    }
    this.tagFilterInput.set('');
    this.tagFilterSuggestions.set([]);
  }

  protected removeTagFilter(tag: string): void {
    this.selectedTags.update((tags) => tags.filter((t) => t !== tag));
    this.page.set(0);
    this.loadDevices();
  }

  protected sortBy(field: string): void {
    if (this.sortField() === field) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
    this.page.set(0);
    this.loadDevices();
  }

  protected goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages() || page === this.page()) {
      return;
    }
    this.page.set(page);
    this.loadDevices();
  }

  protected categoryLabel(categoryId: string): string {
    const category = this.categoryMap().get(categoryId);
    if (!category) {
      return categoryId;
    }
    return category.marker ? `${category.marker} ${category.name}` : category.name;
  }

  protected openAddModal(): void {
    this.editingDevice = null;
    this.formMode.set('add');
    this.formDeviceIdentifier.set('');
    this.formName.set('');
    this.formOwnerId.set('');
    this.formType.set('GPS_TRACKER');
    this.formStatus.set('INACTIVE');
    this.formCategoryId.set('');
    this.formTagInput.set('');
    this.formTags.set([]);
    this.formTagSuggestions.set([]);
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected openEditModal(device: Device): void {
    this.editingDevice = device;
    this.formMode.set('edit');
    this.formDeviceIdentifier.set(device.deviceIdentifier);
    this.formName.set(device.name);
    this.formOwnerId.set(device.ownerId);
    this.formType.set(device.type);
    this.formStatus.set(device.status ?? 'INACTIVE');
    this.formCategoryId.set(device.categoryIds?.[0] ?? '');
    this.formTagInput.set('');
    this.formTags.set([...(device.tags ?? [])]);
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
    const deviceIdentifier = this.formDeviceIdentifier().trim();
    const name = this.formName().trim();
    const ownerId = this.formOwnerId().trim();
    if (!deviceIdentifier || !name || !ownerId || this.formSaving()) {
      return;
    }
    this.formSaving.set(true);
    this.formError.set(null);

    const categoryId = this.formCategoryId();
    const categoryIds = categoryId ? [categoryId] : undefined;
    const tags = this.formTags().length > 0 ? this.formTags() : undefined;

    if (this.formMode() === 'add') {
      const device: Device = {
        deviceIdentifier,
        name,
        ownerId,
        type: this.formType(),
        status: this.formStatus(),
        categoryIds,
        tags,
      };
      this.deviceService.create(device).subscribe({
        next: () => this.handleFormSuccess(),
        error: () => this.handleFormError(),
      });
      return;
    }

    const original = this.editingDevice;
    if (!original?.id) {
      this.formSaving.set(false);
      return;
    }
    // Full merged object — PATCH replaces whatever fields are present in the body, so a
    // sparse partial would wipe lastKnownPoint/images/metadata that aren't part of this form.
    const updated: Device = {
      ...original,
      deviceIdentifier,
      name,
      ownerId,
      type: this.formType(),
      status: this.formStatus(),
      categoryIds,
      tags,
    };
    this.deviceService.update(original.id, updated).subscribe({
      next: () => this.handleFormSuccess(),
      error: () => this.handleFormError(),
    });
  }

  private handleFormSuccess(): void {
    this.formSaving.set(false);
    this.closeForm();
    this.loadDevices();
  }

  private handleFormError(): void {
    this.formSaving.set(false);
    this.formError.set('Failed to save device. Please try again.');
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

  protected openDeleteConfirm(device: Device): void {
    this.deleteTarget.set(device);
    this.deleteError.set(null);
  }

  protected closeDeleteConfirm(): void {
    this.deleteTarget.set(null);
    this.deletingDevice.set(false);
  }

  protected confirmDelete(): void {
    const device = this.deleteTarget();
    if (!device?.id || this.deletingDevice()) {
      return;
    }
    this.deletingDevice.set(true);
    this.deleteError.set(null);

    this.deviceService.deleteById(device.id).subscribe({
      next: () => {
        this.deletingDevice.set(false);
        this.closeDeleteConfirm();
        this.loadDevices();
      },
      error: () => {
        this.deletingDevice.set(false);
        this.deleteError.set('Failed to delete device. Please try again.');
      },
    });
  }
}
