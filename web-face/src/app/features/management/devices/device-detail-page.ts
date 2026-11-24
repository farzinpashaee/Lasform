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

interface ChartMetricOption {
  /** A top-level Event field name, or `payload:<key>` for a numeric payload field. */
  key: string;
  label: string;
  unit: string;
}

/** The three numeric top-level Event fields worth charting — offered only when at least one
 *  loaded event actually reports that field (e.g. a stationary sensor never reports heading). */
const CHART_FIELD_METRICS: { key: 'speed' | 'heading' | 'accuracy'; labelKey: string; unit: string }[] = [
  { key: 'speed', labelKey: 'devices.eventsColSpeed', unit: ' m/s' },
  { key: 'heading', labelKey: 'devices.eventsColHeading', unit: '°' },
  { key: 'accuracy', labelKey: 'devices.fieldAccuracy', unit: ' m' },
];

const DEFAULT_CHART_METRIC = 'speed';

interface ChartPoint {
  time: number;
  value: number;
}

interface ChartCoord extends ChartPoint {
  x: number;
  y: number;
}

interface ChartGeometry {
  width: number;
  height: number;
  paddingLeft: number;
  paddingTop: number;
  plotHeight: number;
  linePath: string;
  areaPath: string;
  coords: ChartCoord[];
  yTicks: { y: number; label: string }[];
  last: ChartCoord;
}

const CHART_WIDTH = 640;
const CHART_HEIGHT = 160;
const CHART_PADDING = { left: 48, right: 12, top: 12, bottom: 24 };
const CHART_Y_TICK_COUNT = 4;

interface TimeRangeOption {
  key: string;
  labelKey: string;
  /** Milliseconds back from now; null means "all loaded events" (today's default — the full,
   *  already-bounded RECENT_EVENTS_LIMIT page, not an unbounded history). */
  durationMs: number | null;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Quick-select presets, Kibana-style — "All" first since that's today's existing behavior and
 *  the sensible default for a capped 20-event page; "Custom range" is appended separately in the
 *  template so it can sit behind its own hairline, per the dataviz skill's date-picker spec. */
const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { key: 'all', labelKey: 'devices.eventsRangeAll', durationMs: null },
  { key: '15m', labelKey: 'devices.eventsRange15m', durationMs: 15 * MINUTE },
  { key: '1h', labelKey: 'devices.eventsRange1h', durationMs: HOUR },
  { key: '24h', labelKey: 'devices.eventsRange24h', durationMs: DAY },
  { key: '7d', labelKey: 'devices.eventsRange7d', durationMs: 7 * DAY },
  { key: '30d', labelKey: 'devices.eventsRange30d', durationMs: 30 * DAY },
];

/**
 * Pure layout math for the time-series chart — no Angular/DOM here, so it's trivial to unit test
 * and doesn't need to re-run except when the plotted points actually change (it's called from
 * inside a `computed`, see chartGeometry below).
 */
function buildChartGeometry(points: ChartPoint[]): ChartGeometry {
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  const minTime = points[0].time;
  const maxTime = points[points.length - 1].time;
  const timeSpan = Math.max(maxTime - minTime, 1);

  const values = points.map((p) => p.value);
  let minValue = Math.min(...values);
  let maxValue = Math.max(...values);
  if (minValue === maxValue) {
    // A flat line (or a single point) has no natural range — widen it so the line doesn't sit
    // exactly on an axis edge.
    minValue -= 1;
    maxValue += 1;
  }
  const headroom = (maxValue - minValue) * 0.1;
  minValue -= headroom;
  maxValue += headroom;
  const valueSpan = maxValue - minValue;

  const xFor = (time: number) => CHART_PADDING.left + ((time - minTime) / timeSpan) * plotWidth;
  const yFor = (value: number) => CHART_PADDING.top + plotHeight - ((value - minValue) / valueSpan) * plotHeight;

  const coords: ChartCoord[] = points.map((p) => ({ ...p, x: xFor(p.time), y: yFor(p.value) }));
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ');
  const baseline = CHART_PADDING.top + plotHeight;
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(2)},${baseline.toFixed(2)} L${coords[0].x.toFixed(2)},${baseline.toFixed(2)} Z`;

  const yTicks = Array.from({ length: CHART_Y_TICK_COUNT + 1 }, (_, i) => {
    const value = minValue + (valueSpan * i) / CHART_Y_TICK_COUNT;
    return { y: yFor(value), label: formatAxisValue(value) };
  });

  return {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    paddingLeft: CHART_PADDING.left,
    paddingTop: CHART_PADDING.top,
    plotHeight,
    linePath,
    areaPath,
    coords,
    yTicks,
    last: coords[coords.length - 1],
  };
}

/** Clean, short axis tick labels — a trailing ".0" is dropped, otherwise one decimal place. */
function formatAxisValue(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

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
  /** The event whose details modal is open — clicking any row opens it, null closes it. */
  protected readonly eventDetailsTarget = signal<Event | null>(null);

  protected readonly timeRangeOptions = TIME_RANGE_OPTIONS;
  protected readonly selectedRangeKey = signal<string>('all');
  protected readonly rangeMenuOpen = signal(false);
  protected readonly customRangeFrom = signal('');
  protected readonly customRangeTo = signal('');

  /** Everything below (the metric list, the chart, the table) reacts to this, not to events()
   *  directly — "filters scope everything below them" (dataviz skill). */
  protected readonly filteredEvents = computed(() => {
    const events = this.events();
    const key = this.selectedRangeKey();
    if (key === 'all') {
      return events;
    }
    if (key === 'custom') {
      const from = this.customRangeFrom() ? new Date(this.customRangeFrom()).getTime() : null;
      const to = this.customRangeTo() ? new Date(this.customRangeTo()).getTime() : null;
      return events.filter((event) => {
        const time = new Date(event.occurredAt).getTime();
        return (from == null || time >= from) && (to == null || time <= to);
      });
    }
    const option = this.timeRangeOptions.find((o) => o.key === key);
    if (!option?.durationMs) {
      return events;
    }
    const cutoff = Date.now() - option.durationMs;
    return events.filter((event) => new Date(event.occurredAt).getTime() >= cutoff);
  });

  protected readonly currentRangeLabel = computed(() => {
    const key = this.selectedRangeKey();
    if (key === 'custom') {
      return this.transloco.translate('devices.eventsRangeCustom');
    }
    const option = this.timeRangeOptions.find((o) => o.key === key);
    return this.transloco.translate(option?.labelKey ?? 'devices.eventsRangeAll');
  });

  protected readonly selectedMetricKey = signal<string>(DEFAULT_CHART_METRIC);
  protected readonly hoveredIndex = signal<number | null>(null);

  /** Only metrics at least one event *in the current time range* actually reports — a stationary
   *  IOT_SENSOR's events may have no heading at all, and most payload keys are device-specific. */
  protected readonly availableMetrics = computed<ChartMetricOption[]>(() => {
    const events = this.filteredEvents();
    const metrics: ChartMetricOption[] = [];
    for (const field of CHART_FIELD_METRICS) {
      if (events.some((event) => typeof event[field.key] === 'number')) {
        metrics.push({ key: field.key, label: this.transloco.translate(field.labelKey), unit: field.unit });
      }
    }
    const payloadKeys = new Set<string>();
    for (const event of events) {
      for (const [key, value] of Object.entries(event.payload ?? {})) {
        if (typeof value === 'number') {
          payloadKeys.add(key);
        }
      }
    }
    for (const key of [...payloadKeys].sort()) {
      metrics.push({ key: `payload:${key}`, label: key, unit: '' });
    }
    return metrics;
  });

  /** Falls back to whatever IS available when selectedMetricKey (default: speed) isn't reported
   *  by this device's events, rather than silently charting nothing. */
  protected readonly activeMetricKey = computed(() => {
    const available = this.availableMetrics();
    if (available.some((metric) => metric.key === this.selectedMetricKey())) {
      return this.selectedMetricKey();
    }
    return available[0]?.key ?? null;
  });

  protected readonly activeMetric = computed(
    () => this.availableMetrics().find((metric) => metric.key === this.activeMetricKey()) ?? null,
  );

  protected readonly chartGeometry = computed<ChartGeometry | null>(() => {
    const metricKey = this.activeMetricKey();
    if (!metricKey) {
      return null;
    }
    const points = this.extractChartPoints(metricKey);
    return points.length > 0 ? buildChartGeometry(points) : null;
  });

  protected readonly hoveredCoord = computed(() => {
    const index = this.hoveredIndex();
    const geometry = this.chartGeometry();
    return index != null && geometry ? geometry.coords[index] : null;
  });

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
    if (!device.deviceIdentifier || !this.authService.hasPermission('event:read')) {
      return;
    }
    this.eventsLoading.set(true);
    this.eventsError.set(null);
    // Event.deviceId is the reporting device's deviceIdentifier (what a real device/the
    // simulator sends), never the Mongo _id — see EventIngestionService.syncDeviceState and
    // scripts/README.md's "Connecting it to a real device record". Querying by device.id here
    // silently matched nothing.
    this.eventService.search({ deviceId: device.deviceIdentifier }).subscribe({
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

  protected payloadFieldCount(event: Event): number {
    return Object.keys(event.payload ?? {}).length;
  }

  protected openEventDetails(event: Event): void {
    this.eventDetailsTarget.set(event);
  }

  protected closeEventDetails(): void {
    this.eventDetailsTarget.set(null);
  }

  protected selectMetric(key: string): void {
    this.selectedMetricKey.set(key);
    this.hoveredIndex.set(null);
  }

  private extractChartPoints(metricKey: string): ChartPoint[] {
    const isPayloadMetric = metricKey.startsWith('payload:');
    const payloadKey = isPayloadMetric ? metricKey.slice('payload:'.length) : null;
    const points: ChartPoint[] = [];
    for (const event of this.filteredEvents()) {
      const raw = isPayloadMetric ? event.payload?.[payloadKey!] : (event as unknown as Record<string, unknown>)[metricKey];
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        points.push({ time: new Date(event.occurredAt).getTime(), value: raw });
      }
    }
    // Events are newest-first (see loadEvents); a left-to-right time series reads oldest -> newest.
    return points.sort((a, b) => a.time - b.time);
  }

  protected toggleRangeMenu(): void {
    this.rangeMenuOpen.update((open) => !open);
  }

  protected closeRangeMenu(): void {
    this.rangeMenuOpen.set(false);
  }

  protected selectRange(key: string): void {
    this.selectedRangeKey.set(key);
    this.hoveredIndex.set(null);
    // Custom stays open so the from/to inputs are reachable; every other preset is a one-click pick.
    if (key !== 'custom') {
      this.rangeMenuOpen.set(false);
    }
  }

  /** The SVG's own pointermove, not a per-point listener — the crosshair just needs the nearest
   *  X, same as any line-chart hover (see the dataviz skill's interaction notes). */
  protected onChartPointerMove(event: PointerEvent): void {
    const geometry = this.chartGeometry();
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    if (!geometry || rect.width === 0) {
      return;
    }
    const viewBoxX = ((event.clientX - rect.left) / rect.width) * geometry.width;
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    geometry.coords.forEach((coord, index) => {
      const distance = Math.abs(coord.x - viewBoxX);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    this.hoveredIndex.set(nearestIndex);
  }

  protected onChartPointerLeave(): void {
    this.hoveredIndex.set(null);
  }

  protected formatMetricValue(value: number): string {
    const unit = this.activeMetric()?.unit ?? '';
    return `${Math.round(value * 100) / 100}${unit}`;
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
