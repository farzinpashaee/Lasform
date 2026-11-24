import { DatePipe, JsonPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { toDataURL } from 'qrcode';

import { AuthService } from '../../../core/auth/auth.service';
import { HasPermissionDirective } from '../../../core/auth/has-permission.directive';
import { Category } from '../../../core/models/category.model';
import { Device } from '../../../core/models/device.model';
import { DeviceStatus, DeviceType } from '../../../core/models/enums';
import { Event } from '../../../core/models/event.model';
import { GeoJsonPoint } from '../../../core/models/geo.model';
import { CategoryService } from '../../../core/services/category.service';
import { DeviceService } from '../../../core/services/device.service';
import { EventService } from '../../../core/services/event.service';
import { TagService } from '../../../core/services/tag.service';

const DEVICE_TYPES: DeviceType[] = ['GPS_TRACKER', 'MOBILE_PHONE', 'VEHICLE_UNIT', 'WEARABLE', 'IOT_SENSOR', 'OTHER'];
const DEVICE_STATUSES: DeviceStatus[] = ['ACTIVE', 'INACTIVE', 'OFFLINE', 'MAINTENANCE', 'DECOMMISSIONED'];
/** The recent-events panel is a quick glance, not a full history browser — EventController#search's
 *  deviceId branch returns the device's entire (already-desc-sorted) event history unbounded, so
 *  this caps what's actually rendered rather than adding pagination for a secondary panel. */
const RECENT_EVENTS_LIMIT = 20;

@Component({
  selector: 'app-device-detail-page',
  imports: [FormsModule, DatePipe, JsonPipe, TranslocoPipe, RouterLink, HasPermissionDirective],
  templateUrl: './device-detail-page.html',
  styleUrl: './device-detail-page.scss',
})
export class DeviceDetailPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly deviceService = inject(DeviceService);
  private readonly categoryService = inject(CategoryService);
  private readonly eventService = inject(EventService);
  private readonly tagService = inject(TagService);
  private readonly transloco = inject(TranslocoService);
  protected readonly authService = inject(AuthService);

  protected readonly deviceTypes = DEVICE_TYPES;
  protected readonly deviceStatuses = DEVICE_STATUSES;

  protected readonly device = signal<Device | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly activeTab = signal<'overview' | 'events'>('overview');

  protected readonly categories = signal<Category[]>([]);
  protected readonly categoryMap = computed(() => {
    const map = new Map<string, Category>();
    for (const category of this.categories()) {
      if (category.id) {
        map.set(category.id, category);
      }
    }
    return map;
  });

  protected readonly events = signal<Event[]>([]);
  protected readonly eventsLoading = signal(false);
  protected readonly eventsError = signal<string | null>(null);

  protected readonly formOpen = signal(false);
  protected readonly formSaving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly formDeviceIdentifier = signal('');
  protected readonly regeneratingIdentifier = signal(false);
  protected readonly regenerateIdentifierError = signal<string | null>(null);
  protected readonly formName = signal('');
  protected readonly formType = signal<DeviceType>('GPS_TRACKER');
  protected readonly formStatus = signal<DeviceStatus>('INACTIVE');
  protected readonly formCategoryId = signal('');
  protected readonly formTagInput = signal('');
  protected readonly formTags = signal<string[]>([]);
  protected readonly formTagSuggestions = signal<string[]>([]);

  protected readonly deleteConfirmOpen = signal(false);
  protected readonly deletingDevice = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  protected readonly qrDataUrl = signal<string | null>(null);
  protected readonly qrError = signal<string | null>(null);

  private formTagDebounceTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.categoryService.findAll({ size: 100, sort: 'name,asc' }).subscribe((page) => {
      this.categories.set(page.content);
    });
    this.loadDevice();
  }

  ngOnDestroy(): void {
    clearTimeout(this.formTagDebounceTimer);
  }

  private loadDevice(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.loadError.set(this.transloco.translate('devices.loadFailed'));
      return;
    }
    this.loading.set(true);
    this.loadError.set(null);
    this.deviceService.getById(id).subscribe({
      next: (device) => {
        this.loading.set(false);
        this.device.set(device);
        this.generateQr(device.deviceIdentifier);
        this.loadEvents(device);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(this.transloco.translate('devices.loadFailed'));
      },
    });
  }

  private loadEvents(device: Device): void {
    // event:read is independent of device:read (which the route itself already requires) —
    // *hasPermission on the panel hides it the same way, this just skips the otherwise-guaranteed
    // 403 from even attempting the request.
    if (!device.id || !this.authService.hasPermission('event:read')) {
      return;
    }
    this.eventsLoading.set(true);
    this.eventsError.set(null);
    this.eventService.search({ deviceId: device.id }).subscribe({
      next: (events) => {
        this.eventsLoading.set(false);
        this.events.set(events.slice(0, RECENT_EVENTS_LIMIT));
      },
      error: () => {
        this.eventsLoading.set(false);
        this.eventsError.set(this.transloco.translate('devices.eventsLoadFailed'));
      },
    });
  }

  protected selectTab(tab: 'overview' | 'events'): void {
    this.activeTab.set(tab);
  }

  protected categoryLabel(categoryId: string): string {
    const category = this.categoryMap().get(categoryId);
    if (!category) {
      return categoryId;
    }
    return category.marker ? `${category.marker} ${category.name}` : category.name;
  }

  protected formatPoint(point: GeoJsonPoint): string {
    const [lon, lat] = point.coordinates;
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }

  protected hasPayload(event: Event): boolean {
    return !!event.payload && Object.keys(event.payload).length > 0;
  }

  protected openEditModal(): void {
    const device = this.device();
    if (!device) {
      return;
    }
    this.formDeviceIdentifier.set(device.deviceIdentifier ?? '');
    this.formName.set(device.name);
    this.formType.set(device.type);
    this.formStatus.set(device.status ?? 'INACTIVE');
    this.formCategoryId.set(device.categoryIds?.[0] ?? '');
    this.formTagInput.set('');
    this.formTags.set([...(device.tags ?? [])]);
    this.formTagSuggestions.set([]);
    this.formError.set(null);
    this.regenerateIdentifierError.set(null);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.formSaving.set(false);
    this.formTagSuggestions.set([]);
    clearTimeout(this.formTagDebounceTimer);
  }

  protected regenerateIdentifier(): void {
    const id = this.device()?.id;
    if (!id || this.regeneratingIdentifier()) {
      return;
    }
    this.regeneratingIdentifier.set(true);
    this.regenerateIdentifierError.set(null);
    this.deviceService.regenerateIdentifier(id).subscribe({
      next: (updated) => {
        this.regeneratingIdentifier.set(false);
        this.formDeviceIdentifier.set(updated.deviceIdentifier ?? '');
        this.device.update((device) => (device ? { ...device, deviceIdentifier: updated.deviceIdentifier } : device));
        this.generateQr(updated.deviceIdentifier);
      },
      error: () => {
        this.regeneratingIdentifier.set(false);
        this.regenerateIdentifierError.set(this.transloco.translate('devices.regenerateIdentifierFailed'));
      },
    });
  }

  /** Always-visible in the Overview tab now (no more open/close) — regenerated whenever the
   *  identifier changes, i.e. on initial load and after regenerateIdentifier(). */
  private generateQr(identifier: string | undefined): void {
    if (!identifier) {
      return;
    }
    this.qrError.set(null);
    this.qrDataUrl.set(null);
    toDataURL(identifier, { margin: 1, width: 200 })
      .then((dataUrl) => this.qrDataUrl.set(dataUrl))
      .catch(() => this.qrError.set(this.transloco.translate('devices.qrGenerateFailed')));
  }

  protected submitForm(): void {
    const name = this.formName().trim();
    const original = this.device();
    if (!name || !original?.id || this.formSaving()) {
      return;
    }
    this.formSaving.set(true);
    this.formError.set(null);

    const categoryId = this.formCategoryId();
    const categoryIds = categoryId ? [categoryId] : undefined;
    const tags = this.formTags().length > 0 ? this.formTags() : undefined;

    // Full merged object, not a sparse partial — same reasoning as DevicesPage.submitForm: PATCH
    // replaces whatever fields are present in the body, so leaving lastKnownPoint/images/metadata
    // out would wipe them.
    const updated: Device = {
      ...original,
      name,
      type: this.formType(),
      status: this.formStatus(),
      categoryIds,
      tags,
    };
    this.deviceService.update(original.id, updated).subscribe({
      next: (saved) => {
        this.formSaving.set(false);
        this.closeForm();
        this.device.set(saved);
      },
      error: () => {
        this.formSaving.set(false);
        this.formError.set(this.transloco.translate('devices.saveFailed'));
      },
    });
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

  protected openDeleteConfirm(): void {
    this.deleteConfirmOpen.set(true);
    this.deleteError.set(null);
  }

  protected closeDeleteConfirm(): void {
    this.deleteConfirmOpen.set(false);
    this.deletingDevice.set(false);
  }

  protected confirmDelete(): void {
    const id = this.device()?.id;
    if (!id || this.deletingDevice()) {
      return;
    }
    this.deletingDevice.set(true);
    this.deleteError.set(null);
    this.deviceService.deleteById(id).subscribe({
      next: () => this.router.navigate(['/management/devices']),
      error: () => {
        this.deletingDevice.set(false);
        this.deleteError.set(this.transloco.translate('devices.deleteFailed'));
      },
    });
  }
}
