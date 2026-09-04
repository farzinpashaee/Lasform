import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subject, Subscription, debounceTime } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { FEATURE_FLAGS } from '../../core/feature-flag-keys';
import {
  GeofenceShapeData,
  GeofenceShapeKind,
  MAP_PROVIDER,
  MapBounds,
  MapContextMenuEvent,
  MapMarkerData,
  MapProvider,
  MapType,
} from '../../core/maps';
import { geofenceToShapeData, shapeDataToGeofenceFields } from '../../core/maps/geofence-geometry';
import { Category } from '../../core/models/category.model';
import { Device } from '../../core/models/device.model';
import { DeviceStatus, GeofenceStatus } from '../../core/models/enums';
import { Geofence } from '../../core/models/geofence.model';
import { Location } from '../../core/models/location.model';
import { Review } from '../../core/models/review.model';
import { SearchHit } from '../../core/models/search.model';
import { CategoryService } from '../../core/services/category.service';
import { DeviceLiveService } from '../../core/services/device-live.service';
import { DeviceService } from '../../core/services/device.service';
import { FeatureFlagsService } from '../../core/services/feature-flags.service';
import { GeofenceService } from '../../core/services/geofence.service';
import { LocationService } from '../../core/services/location.service';
import { ReviewService } from '../../core/services/review.service';
import { SearchService } from '../../core/services/search.service';
import { TagService } from '../../core/services/tag.service';
import { AccountMenu } from '../../shared/account-menu/account-menu';

type DetailsTab = 'overview' | 'reviews';

const DEVICE_STATUSES: DeviceStatus[] = ['ACTIVE', 'INACTIVE', 'OFFLINE', 'MAINTENANCE', 'DECOMMISSIONED'];
const GEOFENCE_STATUSES: GeofenceStatus[] = ['ACTIVE', 'INACTIVE'];
/** Id used for the shape-in-progress overlay while creating a geofence, before it has a real id. */
const DRAFT_GEOFENCE_ID = '__draft__';
/** How many of the most recent positions the individually-tracked device's breadcrumb trail keeps. */
const MAX_DEVICE_TRAIL_POINTS = 10;

const DARK_MODE_STORAGE_KEY = 'lasform.darkMode';

interface GeofenceFormTarget {
  mode: 'create' | 'edit-shape';
  geofenceId?: string;
}

interface MapContextMenuState {
  lat: number;
  lng: number;
  x: number;
  y: number;
}

@Component({
  selector: 'app-map-page',
  imports: [FormsModule, NgTemplateOutlet, TranslocoPipe, AccountMenu, DatePipe],
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss',
})
export class MapPage implements AfterViewInit, OnDestroy {
  protected readonly title = signal('LasformWebFace');

  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly transloco = inject(TranslocoService);
  private readonly locationService = inject(LocationService);
  private readonly deviceService = inject(DeviceService);
  private readonly deviceLiveService = inject(DeviceLiveService);
  private readonly categoryService = inject(CategoryService);
  private readonly tagService = inject(TagService);
  private readonly searchService = inject(SearchService);
  private readonly reviewService = inject(ReviewService);
  private readonly geofenceService = inject(GeofenceService);
  private readonly mapProvider: MapProvider = inject(MAP_PROVIDER);
  protected readonly featureFlags = inject(FeatureFlagsService);
  protected readonly FEATURE_FLAGS = FEATURE_FLAGS;

  private readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  /** Locations currently shown as markers (i.e. within the map's visible bounds) before any search; looked up on marker click when hasSearched() is false. */
  private visibleLocationHits: SearchHit[] = [];
  /** Debounced so a rapid pan/zoom sequence doesn't fire a within-bounds request per intermediate step. */
  private readonly boundsChanged$ = new Subject<MapBounds>();
  private boundsChangedSubscription?: Subscription;
  /** Geofences currently rendered read-only on the map; looked up by id when one is clicked. */
  private geofencesById = new Map<string, Geofence>();
  /** The device id behind deviceLiveActive(), if any — see stopDeviceLive() for why this isn't read off selectedResult(). */
  private liveTrackedDeviceId: string | null = null;
  /** Whether the map should auto-recenter on liveTrackedDeviceId's next update — see onUserPanStart wiring in ngAfterViewInit. */
  private followingLiveDevice = false;
  /** liveTrackedDeviceId's last MAX_DEVICE_TRAIL_POINTS positions, oldest first — the breadcrumb trail rendered behind it. */
  private deviceTrailPoints: { lat: number; lng: number }[] = [];
  private tagSuggestionTimer?: ReturnType<typeof setTimeout>;

  protected readonly categories = signal<Category[]>([]);
  private readonly categoryMap = computed(() => {
    const map = new Map<string, Category>();
    for (const category of this.categories()) {
      if (category.id) {
        map.set(category.id, category);
      }
    }
    return map;
  });

  protected readonly searchQuery = signal('');
  protected readonly searchResults = signal<SearchHit[]>([]);
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);
  protected readonly hasSearched = signal(false);
  protected readonly selectedResult = signal<SearchHit | null>(null);
  protected readonly coverImageUrl = signal<string | null>(null);
  protected readonly selectedGeofence = signal<Geofence | null>(null);
  protected readonly entityMenuOpen = signal(false);
  /** Collapses the open details panel down to just its title bar — see toggleDetailsMinimized().
   *  Mainly for mobile, where the full panel can cover most of the map in live mode. */
  protected readonly detailsMinimized = signal(false);
  protected readonly detailsTab = signal<DetailsTab>('overview');
  protected readonly reviews = signal<Review[]>([]);
  protected readonly loadingReviews = signal(false);
  protected readonly reviewsLoadError = signal<string | null>(null);
  protected readonly locating = signal(false);
  protected readonly clusteringEnabled = signal(false);
  /** Map-wide "Live" toggle — live-tracks every DEVICE currently in searchResults(). */
  protected readonly liveEnabled = signal(false);
  /** Whether the currently-selected device (its details card) is being individually live-tracked. */
  protected readonly deviceLiveActive = signal(false);
  protected readonly mapType = signal<MapType>('roadmap');
  protected readonly mapTypeMenuOpen = signal(false);
  protected readonly mapTypeOptions: { type: MapType; labelKey: string; icon: string }[] = [
    { type: 'roadmap', labelKey: 'map.mapView', icon: 'map' },
    { type: 'satellite', labelKey: 'map.satelliteView', icon: 'satellite_alt' },
    { type: 'terrain', labelKey: 'map.terrainView', icon: 'terrain' },
  ];
  protected readonly darkMode = signal(localStorage.getItem(DARK_MODE_STORAGE_KEY) === 'true');

  protected readonly mapContextMenu = signal<MapContextMenuState | null>(null);
  protected readonly newLocationTarget = signal<{ lat: number; lng: number } | null>(null);
  protected readonly newLocationName = signal('');
  protected readonly newLocationDescription = signal('');
  protected readonly newLocationCategoryId = signal('');
  protected readonly newLocationTagInput = signal('');
  protected readonly newLocationTags = signal<string[]>([]);
  protected readonly tagSuggestions = signal<string[]>([]);
  protected readonly addingLocation = signal(false);
  protected readonly addLocationError = signal<string | null>(null);

  protected readonly addCategoryModalOpen = signal(false);
  protected readonly newCategoryName = signal('');
  protected readonly newCategoryDescription = signal('');
  protected readonly newCategoryMarker = signal('');
  protected readonly addingCategory = signal(false);
  protected readonly addCategoryError = signal<string | null>(null);

  protected readonly deviceStatuses = DEVICE_STATUSES;
  protected readonly editingTarget = signal<SearchHit | null>(null);
  protected readonly editName = signal('');
  protected readonly editDescription = signal('');
  protected readonly editStatus = signal<DeviceStatus | ''>('');
  protected readonly savingEdit = signal(false);
  protected readonly editError = signal<string | null>(null);

  protected readonly deleteTarget = signal<SearchHit | null>(null);
  protected readonly deletingEntity = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  protected readonly geofenceDeleteTarget = signal<Geofence | null>(null);
  protected readonly deletingGeofence = signal(false);
  protected readonly deleteGeofenceError = signal<string | null>(null);

  /** Set when the marker load 401s — e.g. an admin revoked map:view_public for anonymous callers. */
  protected readonly mapAccessDenied = signal(false);

  protected readonly geofenceStatuses = GEOFENCE_STATUSES;
  protected readonly geofencesVisible = signal(true);
  protected readonly geofenceDrawMenuOpen = signal(false);
  protected readonly geofenceDraftShape = signal<GeofenceShapeData | null>(null);
  protected readonly geofenceFormTarget = signal<GeofenceFormTarget | null>(null);
  protected readonly geofenceFormName = signal('');
  protected readonly geofenceFormDescription = signal('');
  protected readonly geofenceFormStatus = signal<GeofenceStatus>('ACTIVE');
  protected readonly geofenceFormDeviceIds = signal<string[]>([]);
  protected readonly geofenceDeviceInput = signal('');
  protected readonly savingGeofence = signal(false);
  protected readonly geofenceFormError = signal<string | null>(null);
  protected readonly devices = signal<Device[]>([]);
  private readonly deviceMap = computed(() => {
    const map = new Map<string, Device>();
    for (const device of this.devices()) {
      if (device.id) {
        map.set(device.id, device);
      }
    }
    return map;
  });
  protected readonly geofenceDeviceSuggestions = computed(() => {
    const query = this.geofenceDeviceInput().trim().toLowerCase();
    if (!query) {
      return [];
    }
    const selected = new Set(this.geofenceFormDeviceIds());
    return this.devices()
      .filter((device) => device.id && !selected.has(device.id) && device.name.toLowerCase().includes(query))
      .slice(0, 8);
  });
  /** The geofence currently being reshaped, captured so cancelGeofenceForm can revert the map to its saved shape. */
  private editingGeofenceOriginal: Geofence | null = null;

  async ngAfterViewInit(): Promise<void> {
    await this.mapProvider.initialize(this.mapContainer().nativeElement, {
      center: { lat: 43.8628, lng: -79.4308 },
      zoom: 14,
    });

    this.loadLocationMarkers();
    this.loadCategories();
    this.loadDevices();
    this.loadGeofences();
    this.mapProvider.onContextMenu((event) => this.openMapContextMenu(event));
    this.mapProvider.onUserPanStart(() => {
      this.followingLiveDevice = false;
    });
    // Re-fetch whatever's in view on every pan/zoom, instead of the initial load being the only
    // one — see loadLocationMarkers()'s doc comment. Skipped entirely while a text search is
    // active: renderSearchMarkers() (not bounds) owns the marker set until the search is cleared.
    this.boundsChangedSubscription = this.boundsChanged$.pipe(debounceTime(300)).subscribe((bounds) => {
      if (!this.hasSearched()) {
        this.loadLocationMarkers(bounds);
      }
    });
    this.mapProvider.onBoundsChanged((bounds) => this.boundsChanged$.next(bounds));
    this.jumpToQueryLocation();
    this.jumpToQueryGeofence();
    this.jumpToDrawGeofence();
  }

  /** Handles ?locationId=... deep links (e.g. the "View on map" action from the Locations table). */
  private jumpToQueryLocation(): void {
    const locationId = this.route.snapshot.queryParamMap.get('locationId');
    if (!locationId) {
      return;
    }
    this.locationService.getById(locationId).subscribe({
      next: (location) => this.selectResult({ type: 'LOCATION', data: location }),
    });
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  /** Handles ?geofenceId=... deep links (the "View on map"/"Edit shape" actions from the Geofences table). */
  private jumpToQueryGeofence(): void {
    const geofenceId = this.route.snapshot.queryParamMap.get('geofenceId');
    if (!geofenceId) {
      return;
    }
    this.geofenceService.getById(geofenceId).subscribe({
      next: (geofence) => this.openGeofenceForEdit(geofence),
    });
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  /** Renders the geofence, and — only if the caller has geofence:write — opens it in the editable draw/save panel. */
  private openGeofenceForEdit(geofence: Geofence): void {
    if (!geofence.id) {
      return;
    }
    const shape = geofenceToShapeData(geofence);
    if (!shape) {
      return;
    }
    const editable = this.authService.hasPermission('geofence:write');
    this.mapProvider.renderGeofence(
      geofence.id,
      shape,
      editable,
      geofence.name,
      editable ? (updated) => this.geofenceDraftShape.set(updated) : undefined,
    );
    this.mapProvider.fitBoundsToGeofence(shape);
    if (!editable) {
      return;
    }
    this.editingGeofenceOriginal = geofence;
    this.geofenceDraftShape.set(shape);
    this.geofenceFormTarget.set({ mode: 'edit-shape', geofenceId: geofence.id });
    this.geofenceFormName.set(geofence.name ?? '');
    this.geofenceFormDescription.set(geofence.description ?? '');
    this.geofenceFormStatus.set(geofence.status ?? 'ACTIVE');
    this.geofenceFormDeviceIds.set([...(geofence.deviceIds ?? [])]);
    this.geofenceDeviceInput.set('');
    this.geofenceFormError.set(null);
  }

  /** Handles ?drawGeofence=circle|polygon deep links (the Geofences table's "Add geofence" popover). */
  private jumpToDrawGeofence(): void {
    const kind = this.route.snapshot.queryParamMap.get('drawGeofence');
    if (kind !== 'circle' && kind !== 'polygon') {
      return;
    }
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    this.startDrawGeofence(kind === 'circle' ? 'CIRCLE' : 'POLYGON');
  }

  private loadDevices(): void {
    this.deviceService.findAll({ size: 200 }).subscribe({
      next: (page) => this.devices.set(page.content),
      // Non-critical (only feeds the geofence device picker) — silently no-op on failure.
      error: () => {},
    });
  }

  /** Renders every active geofence as a read-only background layer, visible to anyone with geofence:read. */
  private loadGeofences(): void {
    this.geofenceService.search({ status: 'ACTIVE' }).subscribe({
      next: (geofences) => {
        this.mapProvider.clearGeofences();
        this.geofencesById.clear();
        for (const geofence of geofences) {
          const shape = geofence.id ? geofenceToShapeData(geofence) : null;
          if (geofence.id && shape) {
            this.geofencesById.set(geofence.id, geofence);
            this.mapProvider.renderGeofence(geofence.id, shape, false, geofence.name, undefined, () => this.onGeofenceClicked(geofence.id!));
          }
        }
      },
      // Non-critical background layer (e.g. anonymous callers without geofence:read) — silently no-op.
      error: () => {},
    });
  }

  private onGeofenceClicked(id: string): void {
    const geofence = this.geofencesById.get(id);
    if (!geofence) {
      return;
    }
    this.selectedResult.set(null);
    this.selectedGeofence.set(geofence);
    this.entityMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected closeOverlays(): void {
    this.mapContextMenu.set(null);
    this.mapTypeMenuOpen.set(false);
    this.entityMenuOpen.set(false);
    this.geofenceDrawMenuOpen.set(false);
    this.selectedGeofence.set(null);
    this.closeAddCategoryModal();
    this.closeAddLocationModal();
    this.closeEditModal();
    this.closeDeleteConfirm();
    this.closeDeleteConfirmGeofence();
    if (this.geofenceFormTarget()) {
      this.cancelGeofenceForm();
    }
  }

  ngOnDestroy(): void {
    this.mapProvider.destroy();
    this.boundsChangedSubscription?.unsubscribe();
    this.revokeCoverImageUrl();
    this.deviceLiveService.unsubscribeAll();
  }

  protected openManagement(): void {
    this.router.navigate(['/management']);
  }

  protected goToLogin(): void {
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/' } });
  }

  protected canEditHit(hit: SearchHit): boolean {
    return this.authService.hasPermission(hit.type === 'LOCATION' ? 'location:write' : 'device:write');
  }

  protected toggleEntityMenu(): void {
    this.entityMenuOpen.update((open) => !open);
  }

  protected closeEntityMenu(): void {
    this.entityMenuOpen.set(false);
  }

  /** Tag chips shown under the name in the details panel. */
  protected resultTags(hit: SearchHit): string[] | null {
    const tags = hit.type === 'LOCATION' ? (hit.data as Location).tags : (hit.data as Device).tags;
    return tags && tags.length > 0 ? tags : null;
  }

  /** Plain-text category label shown under the title — first category, if any. */
  protected resultCategoryLabel(hit: SearchHit): string | null {
    const categoryIds = hit.type === 'LOCATION' ? (hit.data as Location).categoryIds : (hit.data as Device).categoryIds;
    if (!categoryIds || categoryIds.length === 0) {
      return null;
    }
    const category = this.categoryMap().get(categoryIds[0]);
    if (!category) {
      return categoryIds[0];
    }
    return category.marker ? `${category.marker} ${category.name}` : category.name;
  }

  /**
   * Loads only the Locations within the given (or, if omitted, the map's current) bounds — the
   * marker set is re-fetched every time the visible area changes instead of loading the whole
   * collection once, so it scales independently of how many locations exist overall. See
   * onBoundsChanged() below for what re-triggers this on pan/zoom.
   */
  private loadLocationMarkers(bounds?: MapBounds): void {
    const effectiveBounds = bounds ?? this.mapProvider.getBounds();
    if (!effectiveBounds) {
      return;
    }
    this.locationService.findWithinBounds(effectiveBounds).subscribe({
      next: (locations) => {
        this.mapAccessDenied.set(false);
        this.visibleLocationHits = locations.map((location) => ({ type: 'LOCATION' as const, data: location }));
        const markers = locations.map((location) => {
          const [lng, lat] = location.point.coordinates;
          return { id: location.id, lat, lng, title: location.name };
        });
        this.mapProvider.setMarkers(markers, (id) => this.onMarkerClicked(id));
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.mapAccessDenied.set(true);
        }
      },
    });
  }

  private loadCategories(): void {
    this.categoryService.findAll({ size: 100, sort: 'name,asc' }).subscribe((page) => {
      this.categories.set(page.content);
    });
  }

  protected toggleClustering(): void {
    this.clusteringEnabled.update((enabled) => !enabled);
    this.mapProvider.setClusteringEnabled(this.clusteringEnabled());
  }

  protected toggleGeofencesVisible(): void {
    const visible = !this.geofencesVisible();
    this.geofencesVisible.set(visible);
    if (visible) {
      this.loadGeofences();
    } else {
      this.mapProvider.clearGeofences();
      this.geofencesById.clear();
      this.selectedGeofence.set(null);
    }
  }

  protected toggleLive(): void {
    const enabled = !this.liveEnabled();
    this.liveEnabled.set(enabled);
    if (enabled) {
      this.startGlobalLive();
    } else {
      this.deviceLiveService.unsubscribe('global');
    }
  }

  /** (Re)subscribes 'global' to whichever DEVICE hits are currently shown — a no-op if liveEnabled() is off. */
  private startGlobalLive(): void {
    if (!this.liveEnabled()) {
      return;
    }
    const deviceIds = this.searchResults()
      .filter((hit): hit is SearchHit & { type: 'DEVICE' } => hit.type === 'DEVICE' && !!hit.data.id)
      .map((hit) => hit.data.id!);
    this.deviceLiveService.subscribe('global', deviceIds, (device) => this.applyLiveDeviceUpdate(device));
  }

  protected toggleDeviceLive(hit: SearchHit): void {
    if (hit.type !== 'DEVICE' || !hit.data.id) {
      return;
    }
    if (this.deviceLiveActive()) {
      this.stopDeviceLive();
      return;
    }
    this.liveTrackedDeviceId = hit.data.id;
    this.deviceLiveActive.set(true);
    this.followingLiveDevice = true;
    this.deviceTrailPoints = [];
    const point = this.hitPoint(hit);
    if (point) {
      const [lng, lat] = point.coordinates;
      this.pushDeviceTrailPoint(hit.data.id, lat, lng);
    }
    this.deviceLiveService.subscribe(`device:${hit.data.id}`, [hit.data.id], (device) => this.applyLiveDeviceUpdate(device));
  }

  /** Appends a position to the tracked device's breadcrumb trail, dropping the oldest once past MAX_DEVICE_TRAIL_POINTS, and re-renders it. */
  private pushDeviceTrailPoint(deviceId: string, lat: number, lng: number): void {
    this.deviceTrailPoints.push({ lat, lng });
    if (this.deviceTrailPoints.length > MAX_DEVICE_TRAIL_POINTS) {
      this.deviceTrailPoints.shift();
    }
    this.mapProvider.setDeviceTrail(deviceId, this.deviceTrailPoints);
  }

  /** Re-engages auto-follow for the device already being tracked — e.g. the user clicked its
   *  marker again after a manual pan turned following off. No-op if nothing is being tracked. */
  private resumeFollowingLiveDevice(): void {
    if (!this.liveTrackedDeviceId) {
      return;
    }
    this.followingLiveDevice = true;
    const hit = this.searchResults().find((candidate) => candidate.type === 'DEVICE' && candidate.data.id === this.liveTrackedDeviceId);
    const point = hit && this.hitPoint(hit);
    if (point) {
      const [lng, lat] = point.coordinates;
      this.mapProvider.panTo(lat, lng);
    }
  }

  /** Stops the single individually-tracked device, if any — tracked by id rather than reading
   *  selectedResult(), since callers (e.g. resetDetailsPanelState) may run after it's already
   *  been reassigned to a *different* hit. */
  private stopDeviceLive(): void {
    if (this.liveTrackedDeviceId) {
      this.deviceLiveService.unsubscribe(`device:${this.liveTrackedDeviceId}`);
      this.mapProvider.clearDeviceTrail(this.liveTrackedDeviceId);
      this.liveTrackedDeviceId = null;
    }
    this.deviceLiveActive.set(false);
    this.followingLiveDevice = false;
    this.deviceTrailPoints = [];
  }

  /** Shared handler for both the global and per-device live subscriptions. */
  private applyLiveDeviceUpdate(device: Device): void {
    if (!device.id) {
      return;
    }
    if (device.lastKnownPoint) {
      const [lng, lat] = device.lastKnownPoint.coordinates;
      this.mapProvider.moveMarker(device.id, lat, lng);
      if (device.id === this.liveTrackedDeviceId) {
        this.pushDeviceTrailPoint(device.id, lat, lng);
      }
      if (this.followingLiveDevice && device.id === this.liveTrackedDeviceId) {
        this.mapProvider.panTo(lat, lng);
      }
    }
    this.searchResults.update((results) =>
      results.map((hit) => (hit.type === 'DEVICE' && hit.data.id === device.id ? { type: 'DEVICE' as const, data: device } : hit)),
    );
    const selected = this.selectedResult();
    if (selected?.type === 'DEVICE' && selected.data.id === device.id) {
      this.selectedResult.set({ type: 'DEVICE', data: device });
    }
  }

  protected toggleMapTypeMenu(): void {
    this.mapTypeMenuOpen.update((open) => !open);
  }

  protected closeMapTypeMenu(): void {
    this.mapTypeMenuOpen.set(false);
  }

  protected selectMapType(type: MapType): void {
    this.mapType.set(type);
    this.mapProvider.setMapType(type);
    this.closeMapTypeMenu();
  }

  protected toggleDarkMode(): void {
    this.darkMode.update((enabled) => !enabled);
    localStorage.setItem(DARK_MODE_STORAGE_KEY, String(this.darkMode()));
  }

  protected zoomIn(): void {
    this.mapProvider.zoomIn();
  }

  protected zoomOut(): void {
    this.mapProvider.zoomOut();
  }

  protected locateMe(): void {
    if (!navigator.geolocation || this.locating()) {
      return;
    }
    this.locating.set(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.mapProvider.setUserLocation(latitude, longitude);
        // Guards against the map already being centered there, where moveend/idle may never fire.
        const stopLoading = () => this.locating.set(false);
        const fallback = setTimeout(stopLoading, 3000);
        this.mapProvider.panTo(latitude, longitude, 15, () => {
          clearTimeout(fallback);
          stopLoading();
        });
      },
      () => this.locating.set(false),
    );
  }

  private openMapContextMenu(event: MapContextMenuEvent): void {
    const menuSize = { width: 220, height: 176 };
    const x = Math.min(event.clientX, window.innerWidth - menuSize.width - 8);
    const y = Math.min(event.clientY, window.innerHeight - menuSize.height - 8);
    this.mapContextMenu.set({ lat: event.lat, lng: event.lng, x, y });
  }

  protected closeMapContextMenu(): void {
    this.mapContextMenu.set(null);
    this.geofenceDrawMenuOpen.set(false);
  }

  protected copyMapContextCoordinates(): void {
    const menu = this.mapContextMenu();
    if (!menu) {
      return;
    }
    navigator.clipboard?.writeText(`${menu.lat.toFixed(5)},${menu.lng.toFixed(5)}`).catch(() => {
      // Clipboard access can be denied (permissions, insecure context, ...); not worth surfacing to the user.
    });
    this.closeMapContextMenu();
  }

  protected centerMapContextMenuHere(): void {
    const menu = this.mapContextMenu();
    if (!menu) {
      return;
    }
    this.mapProvider.panTo(menu.lat, menu.lng);
    this.closeMapContextMenu();
  }

  protected openAddLocationModal(): void {
    const menu = this.mapContextMenu();
    if (!menu) {
      return;
    }
    this.newLocationTarget.set({ lat: menu.lat, lng: menu.lng });
    this.newLocationName.set('');
    this.newLocationDescription.set('');
    this.newLocationCategoryId.set('');
    this.newLocationTagInput.set('');
    this.newLocationTags.set([]);
    this.tagSuggestions.set([]);
    this.addLocationError.set(null);
    this.closeMapContextMenu();
  }

  protected closeAddLocationModal(): void {
    this.newLocationTarget.set(null);
    this.addingLocation.set(false);
    this.tagSuggestions.set([]);
    clearTimeout(this.tagSuggestionTimer);
  }

  protected submitAddLocation(): void {
    const target = this.newLocationTarget();
    const name = this.newLocationName().trim();
    if (!target || !name || this.addingLocation()) {
      return;
    }
    this.addingLocation.set(true);
    this.addLocationError.set(null);

    const categoryId = this.newLocationCategoryId();
    const location: Location = {
      point: { type: 'Point', coordinates: [target.lng, target.lat] },
      name,
      description: this.newLocationDescription().trim() || undefined,
      categoryIds: categoryId ? [categoryId] : undefined,
      tags: this.newLocationTags().length > 0 ? this.newLocationTags() : undefined,
    };

    this.locationService.create(location).subscribe({
      next: () => {
        this.addingLocation.set(false);
        this.closeAddLocationModal();
        this.loadLocationMarkers();
      },
      error: () => {
        this.addingLocation.set(false);
        this.addLocationError.set(this.transloco.translate('map.addLocationFailed'));
      },
    });
  }

  protected toggleGeofenceDrawMenu(): void {
    this.geofenceDrawMenuOpen.update((open) => !open);
  }

  protected startDrawGeofence(kind: GeofenceShapeKind): void {
    this.closeMapContextMenu();
    this.mapProvider.startDrawingGeofence(kind, (shape) => this.onGeofenceDrawn(shape));
  }

  private onGeofenceDrawn(shape: GeofenceShapeData): void {
    this.geofenceDraftShape.set(shape);
    this.geofenceFormTarget.set({ mode: 'create' });
    this.geofenceFormName.set('');
    this.geofenceFormDescription.set('');
    this.geofenceFormStatus.set('ACTIVE');
    this.geofenceFormDeviceIds.set([]);
    this.geofenceDeviceInput.set('');
    this.geofenceFormError.set(null);
    this.mapProvider.renderGeofence(DRAFT_GEOFENCE_ID, shape, true, undefined, (updated) => this.geofenceDraftShape.set(updated));
    this.mapProvider.fitBoundsToGeofence(shape);
  }

  protected geofenceShapeSummary(): string {
    const shape = this.geofenceDraftShape();
    return shape ? this.shapeSummaryText(shape) : '';
  }

  protected geofenceShapeSummaryFor(geofence: Geofence): string {
    const shape = geofenceToShapeData(geofence);
    return shape ? this.shapeSummaryText(shape) : '';
  }

  private shapeSummaryText(shape: GeofenceShapeData): string {
    if (shape.shape === 'CIRCLE') {
      return this.transloco.translate('map.geofenceCircleSummary', { radius: Math.round(shape.radiusMeters) });
    }
    return this.transloco.translate('map.geofencePolygonSummary', { points: shape.path.length });
  }

  protected geofenceDeviceNames(geofence: Geofence): string {
    if (!geofence.deviceIds || geofence.deviceIds.length === 0) {
      return this.transloco.translate('geofences.allDevices');
    }
    return geofence.deviceIds.map((id) => this.deviceLabel(id)).join(', ');
  }

  protected geofenceDetailFields(geofence: Geofence): { label: string; value: string }[] {
    const fields: { label: string; value: string }[] = [
      { label: this.detailLabel('map.detail.shape'), value: this.geofenceShapeSummaryFor(geofence) },
      { label: this.detailLabel('map.detail.status'), value: geofence.status ?? 'ACTIVE' },
      { label: this.detailLabel('map.detail.devices'), value: this.geofenceDeviceNames(geofence) },
    ];
    if (geofence.createdAt) {
      fields.push({ label: this.detailLabel('map.detail.created'), value: new Date(geofence.createdAt).toLocaleString() });
    }
    return fields;
  }

  protected closeGeofenceDetails(): void {
    this.selectedGeofence.set(null);
    this.entityMenuOpen.set(false);
  }

  protected editGeofenceFromDetails(geofence: Geofence): void {
    this.closeGeofenceDetails();
    this.openGeofenceForEdit(geofence);
  }

  protected openDeleteConfirmGeofence(geofence: Geofence): void {
    this.geofenceDeleteTarget.set(geofence);
    this.deleteGeofenceError.set(null);
  }

  protected closeDeleteConfirmGeofence(): void {
    this.geofenceDeleteTarget.set(null);
    this.deletingGeofence.set(false);
  }

  protected confirmDeleteGeofence(): void {
    const geofence = this.geofenceDeleteTarget();
    if (!geofence?.id || this.deletingGeofence()) {
      return;
    }
    this.deletingGeofence.set(true);
    this.deleteGeofenceError.set(null);
    const id = geofence.id;

    this.geofenceService.deleteById(id).subscribe({
      next: () => {
        this.deletingGeofence.set(false);
        this.closeDeleteConfirmGeofence();
        this.closeGeofenceDetails();
        this.mapProvider.removeGeofence(id);
        this.geofencesById.delete(id);
      },
      error: () => {
        this.deletingGeofence.set(false);
        this.deleteGeofenceError.set(this.transloco.translate('map.deleteGeofenceFailed'));
      },
    });
  }

  protected onGeofenceDeviceInputChange(value: string): void {
    this.geofenceDeviceInput.set(value);
  }

  protected addGeofenceDevice(deviceId: string): void {
    if (!this.geofenceFormDeviceIds().includes(deviceId)) {
      this.geofenceFormDeviceIds.update((ids) => [...ids, deviceId]);
    }
    this.geofenceDeviceInput.set('');
  }

  protected removeGeofenceDevice(deviceId: string): void {
    this.geofenceFormDeviceIds.update((ids) => ids.filter((id) => id !== deviceId));
  }

  protected deviceLabel(deviceId: string): string {
    return this.deviceMap().get(deviceId)?.name ?? deviceId;
  }

  protected cancelGeofenceForm(): void {
    const target = this.geofenceFormTarget();
    this.mapProvider.cancelDrawingGeofence();
    if (target?.mode === 'create') {
      this.mapProvider.removeGeofence(DRAFT_GEOFENCE_ID);
    } else if (target?.mode === 'edit-shape' && target.geofenceId) {
      // Revert the map to the last-saved shape rather than leaving the user's unsaved drag edits visible.
      const shape = this.editingGeofenceOriginal ? geofenceToShapeData(this.editingGeofenceOriginal) : null;
      if (shape) {
        this.mapProvider.renderGeofence(target.geofenceId, shape, false, this.editingGeofenceOriginal?.name);
      } else {
        this.mapProvider.removeGeofence(target.geofenceId);
      }
    }
    this.geofenceDraftShape.set(null);
    this.geofenceFormTarget.set(null);
    this.geofenceFormError.set(null);
    this.savingGeofence.set(false);
    this.editingGeofenceOriginal = null;
  }

  protected submitGeofenceForm(): void {
    const target = this.geofenceFormTarget();
    const shape = this.geofenceDraftShape();
    const name = this.geofenceFormName().trim();
    if (!target || !shape || !name || this.savingGeofence()) {
      return;
    }
    this.savingGeofence.set(true);
    this.geofenceFormError.set(null);

    const geometryFields = shapeDataToGeofenceFields(shape);
    const description = this.geofenceFormDescription().trim() || undefined;
    const status = this.geofenceFormStatus();
    const deviceIds = this.geofenceFormDeviceIds();

    if (target.mode === 'create') {
      const geofence: Geofence = { name, description, status, deviceIds, ...geometryFields };
      this.geofenceService.create(geofence).subscribe({
        next: () => this.handleGeofenceSaveSuccess(),
        error: () => this.handleGeofenceSaveError(),
      });
      return;
    }

    const geofenceId = target.geofenceId;
    if (!geofenceId) {
      this.savingGeofence.set(false);
      return;
    }
    // Full merged object where available — PATCH replaces whatever fields are present in the
    // body, so a sparse partial would wipe fields (e.g. version) not part of this form.
    const original = this.editingGeofenceOriginal;
    const updated: Partial<Geofence> = original
      ? { ...original, name, description, status, deviceIds, ...geometryFields }
      : { name, description, status, deviceIds, ...geometryFields };
    this.geofenceService.update(geofenceId, updated).subscribe({
      next: () => this.handleGeofenceSaveSuccess(),
      error: () => this.handleGeofenceSaveError(),
    });
  }

  private handleGeofenceSaveSuccess(): void {
    this.savingGeofence.set(false);
    this.geofenceDraftShape.set(null);
    this.geofenceFormTarget.set(null);
    this.editingGeofenceOriginal = null;
    // Reloading clears every rendered geofence (including the draft/edited overlay) and
    // repopulates from the authoritative server list, which now includes this save.
    this.loadGeofences();
  }

  private handleGeofenceSaveError(): void {
    this.savingGeofence.set(false);
    this.geofenceFormError.set(this.transloco.translate('map.geofenceSaveFailed'));
  }

  protected openAddCategoryModal(): void {
    this.newCategoryName.set('');
    this.newCategoryDescription.set('');
    this.newCategoryMarker.set('');
    this.addCategoryError.set(null);
    this.addCategoryModalOpen.set(true);
  }

  protected closeAddCategoryModal(): void {
    this.addCategoryModalOpen.set(false);
    this.addingCategory.set(false);
  }

  protected submitAddCategory(): void {
    const name = this.newCategoryName().trim();
    if (!name || this.addingCategory()) {
      return;
    }
    this.addingCategory.set(true);
    this.addCategoryError.set(null);

    const category: Category = {
      name,
      description: this.newCategoryDescription().trim() || undefined,
      marker: this.newCategoryMarker().trim() || undefined,
    };

    this.categoryService.create(category).subscribe({
      next: (created) => {
        this.addingCategory.set(false);
        this.categories.update((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
        this.newLocationCategoryId.set(created.id ?? '');
        this.closeAddCategoryModal();
      },
      error: () => {
        this.addingCategory.set(false);
        this.addCategoryError.set(this.transloco.translate('map.addCategoryFailed'));
      },
    });
  }

  /** Debounces tag suggestion lookups so we don't fire a request per keystroke. */
  protected onTagInputChange(value: string): void {
    this.newLocationTagInput.set(value);
    clearTimeout(this.tagSuggestionTimer);

    const prefix = value.trim();
    if (prefix.length < 2) {
      this.tagSuggestions.set([]);
      return;
    }
    this.tagSuggestionTimer = setTimeout(() => {
      this.tagService.suggest(prefix).subscribe({
        next: (suggestions) => {
          const alreadyAdded = new Set(this.newLocationTags());
          this.tagSuggestions.set(suggestions.filter((tag) => !alreadyAdded.has(tag)));
        },
        error: () => this.tagSuggestions.set([]),
      });
    }, 250);
  }

  protected onTagInputKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ',') {
      return;
    }
    event.preventDefault();
    this.addTag(this.newLocationTagInput());
  }

  protected addTag(rawTag: string): void {
    const tag = rawTag.trim();
    if (!tag) {
      return;
    }
    if (!this.newLocationTags().includes(tag)) {
      this.newLocationTags.update((tags) => [...tags, tag]);
    }
    this.newLocationTagInput.set('');
    this.tagSuggestions.set([]);
  }

  protected removeTag(tag: string): void {
    this.newLocationTags.update((tags) => tags.filter((t) => t !== tag));
  }

  protected onSearchSubmit(): void {
    const query = this.searchQuery().trim();
    if (!query) {
      return;
    }
    this.hasSearched.set(true);
    this.searching.set(true);
    this.searchError.set(null);
    this.selectedResult.set(null);
    this.selectedGeofence.set(null);
    this.stopDeviceLive();

    this.searchService.search({ q: query, size: 50 }).subscribe({
      next: (page) => {
        this.searching.set(false);
        this.searchResults.set(page.content);
        this.showResultsOnMap(page.content);
        this.startGlobalLive();
      },
      error: () => {
        this.searching.set(false);
        this.searchResults.set([]);
        this.searchError.set(this.transloco.translate('map.searchFailed'));
      },
    });
  }

  protected selectResult(hit: SearchHit): void {
    this.selectedGeofence.set(null);
    this.selectedResult.set(hit);
    this.resetDetailsPanelState(hit);
    this.loadCoverImage(hit);

    const point = this.hitPoint(hit);
    if (!point) {
      return;
    }
    const [lng, lat] = point.coordinates;
    this.mapProvider.panTo(lat, lng, 16);
    if (hit.data.id) {
      this.mapProvider.openMarkerPopup(hit.data.id);
    }
  }

  protected closeDetails(): void {
    this.selectedResult.set(null);
    this.entityMenuOpen.set(false);
    this.detailsMinimized.set(false);
    this.revokeCoverImageUrl();
    this.stopDeviceLive();
  }

  protected toggleDetailsMinimized(): void {
    this.detailsMinimized.update((minimized) => !minimized);
  }

  protected selectDetailsTab(tab: DetailsTab, hit: SearchHit): void {
    this.detailsTab.set(tab);
    if (tab === 'reviews' && hit.type === 'LOCATION' && hit.data.id) {
      this.loadReviews(hit.data.id);
    }
  }

  private loadReviews(locationId: string): void {
    this.loadingReviews.set(true);
    this.reviewsLoadError.set(null);
    this.reviewService.listForLocation(locationId, { size: 50, sort: 'createdAt,desc' }).subscribe({
      next: (page) => {
        this.loadingReviews.set(false);
        this.reviews.set(page.content);
      },
      error: () => {
        this.loadingReviews.set(false);
        this.reviewsLoadError.set(this.transloco.translate('map.reviews.loadFailed'));
      },
    });
  }

  protected locationDescription(hit: SearchHit): string | null {
    return hit.type === 'LOCATION' ? (hit.data as Location).description || null : null;
  }

  protected starsForRating(rating: number): boolean[] {
    const filled = Math.round(rating);
    return Array.from({ length: 5 }, (_, i) => i < filled);
  }

  protected openEditModal(hit: SearchHit): void {
    this.editingTarget.set(hit);
    this.editName.set(hit.data.name ?? '');
    this.editDescription.set(hit.type === 'LOCATION' ? ((hit.data as Location).description ?? '') : '');
    this.editStatus.set(hit.type === 'DEVICE' ? ((hit.data as Device).status ?? '') : '');
    this.editError.set(null);
  }

  protected closeEditModal(): void {
    this.editingTarget.set(null);
    this.savingEdit.set(false);
  }

  protected submitEdit(): void {
    const hit = this.editingTarget();
    const name = this.editName().trim();
    if (!hit || !hit.data.id || !name || this.savingEdit()) {
      return;
    }
    this.savingEdit.set(true);
    this.editError.set(null);
    const id = hit.data.id;

    if (hit.type === 'LOCATION') {
      // Send the full current object back, not just the edited fields — the backend's
      // update() replaces whatever fields are present in the body, so a sparse partial
      // would wipe categoryIds/tags/images/etc. that aren't part of this form.
      const updated: Location = { ...(hit.data as Location), name, description: this.editDescription().trim() || undefined };
      this.locationService.update(id, updated).subscribe({
        next: (saved) => this.applyHitUpdate({ type: 'LOCATION', data: saved }),
        error: () => this.handleEditError(),
      });
    } else {
      const updated: Device = { ...(hit.data as Device), name, status: this.editStatus() || undefined };
      this.deviceService.update(id, updated).subscribe({
        next: (saved) => this.applyHitUpdate({ type: 'DEVICE', data: saved }),
        error: () => this.handleEditError(),
      });
    }
  }

  private applyHitUpdate(hit: SearchHit): void {
    this.savingEdit.set(false);
    this.closeEditModal();
    this.selectedResult.set(hit);
    this.searchResults.update((results) => results.map((r) => (r.data.id === hit.data.id ? hit : r)));
    this.refreshMapMarkers();
  }

  private handleEditError(): void {
    this.savingEdit.set(false);
    this.editError.set(this.transloco.translate('map.saveFailed'));
  }

  protected openDeleteConfirm(hit: SearchHit): void {
    this.deleteTarget.set(hit);
    this.deleteError.set(null);
  }

  protected closeDeleteConfirm(): void {
    this.deleteTarget.set(null);
    this.deletingEntity.set(false);
  }

  protected confirmDelete(): void {
    const hit = this.deleteTarget();
    if (!hit || !hit.data.id || this.deletingEntity()) {
      return;
    }
    this.deletingEntity.set(true);
    this.deleteError.set(null);
    const id = hit.data.id;

    const request = hit.type === 'LOCATION' ? this.locationService.deleteById(id) : this.deviceService.deleteById(id);
    request.subscribe({
      next: () => {
        this.deletingEntity.set(false);
        this.closeDeleteConfirm();
        this.closeDetails();
        this.searchResults.update((results) => results.filter((r) => r.data.id !== id));
        this.visibleLocationHits = this.visibleLocationHits.filter((h) => h.data.id !== id);
        this.refreshMapMarkers();
      },
      error: () => {
        this.deletingEntity.set(false);
        this.deleteError.set(this.transloco.translate('map.deleteFailed'));
      },
    });
  }

  /** Re-renders whichever marker set is currently shown (search results, or all locations) after an edit/delete. */
  private refreshMapMarkers(): void {
    if (this.hasSearched()) {
      this.renderSearchMarkers(this.searchResults());
    } else {
      this.loadLocationMarkers();
    }
    this.startGlobalLive();
  }

  private onMarkerClicked(id: string): void {
    const source = this.hasSearched() ? this.searchResults() : this.visibleLocationHits;
    const hit = source.find((candidate) => candidate.data.id === id);
    if (hit) {
      this.selectedGeofence.set(null);
      this.selectedResult.set(hit);
      this.resetDetailsPanelState(hit);
      this.loadCoverImage(hit);
    }
  }

  /** Clears the previous selection's tab/menu/reviews state so it doesn't leak into a newly selected hit.
   *  Re-selecting the device already being live-tracked (e.g. clicking its marker again after a
   *  manual pan) resumes following instead of stopping it — see resumeFollowingLiveDevice(). */
  private resetDetailsPanelState(hit: SearchHit): void {
    this.detailsTab.set('overview');
    this.entityMenuOpen.set(false);
    this.detailsMinimized.set(false);
    this.reviews.set([]);
    this.reviewsLoadError.set(null);
    if (hit.type === 'DEVICE' && hit.data.id && hit.data.id === this.liveTrackedDeviceId) {
      this.resumeFollowingLiveDevice();
    } else {
      this.stopDeviceLive();
    }
  }

  /** Loads the location's primary (cover) photo, if it has one — a normal, silent no-op otherwise. */
  private loadCoverImage(hit: SearchHit): void {
    this.revokeCoverImageUrl();
    if (hit.type !== 'LOCATION') {
      return;
    }
    const location = hit.data as Location;
    const cover = location.images?.find((image) => image.primary) ?? location.images?.[0];
    if (!location.id || !cover) {
      return;
    }
    this.locationService.loadImage(location.id, cover.filename).subscribe({
      next: (blob) => this.coverImageUrl.set(URL.createObjectURL(blob)),
      // No/unreadable cover image is a normal state here, not an error — leave the banner blank.
      error: () => {},
    });
  }

  private revokeCoverImageUrl(): void {
    const url = this.coverImageUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.coverImageUrl.set(null);
  }

  protected resultTitle(hit: SearchHit): string {
    return (
      hit.data.name ||
      this.transloco.translate(hit.type === 'LOCATION' ? 'map.unnamedLocation' : 'map.unnamedDevice')
    );
  }

  protected resultSubtitle(hit: SearchHit): string {
    if (hit.type === 'LOCATION') {
      const location = hit.data as Location;
      return location.address?.address || location.description || 'Location';
    }
    const device = hit.data as Device;
    return device.deviceIdentifier || 'Device';
  }

  /** 5 booleans (filled/empty), rounded to the nearest star — null for devices, unreviewed locations, or when the reviews feature is off. */
  protected resultRatingStars(hit: SearchHit): boolean[] | null {
    if (hit.type !== 'LOCATION' || !this.featureFlags.isEnabled(FEATURE_FLAGS.locationReviews)) {
      return null;
    }
    const location = hit.data as Location;
    if (!location.reviewCount) {
      return null;
    }
    return this.starsForRating(location.averageRating ?? 0);
  }

  protected resultDetailFields(hit: SearchHit): { label: string; value: string }[] {
    if (hit.type === 'LOCATION') {
      return this.locationDetailFields(hit.data as Location);
    }
    return this.deviceDetailFields(hit.data as Device);
  }

  /** Description is rendered separately, unlabeled, above these fields — see locationDescription(). */
  private locationDetailFields(location: Location): { label: string; value: string }[] {
    const fields: { label: string; value: string }[] = [];
    const address = [location.address?.address, location.address?.city, location.address?.country]
      .filter(Boolean)
      .join(', ');
    if (address) {
      fields.push({ label: this.detailLabel('map.detail.address'), value: address });
    }
    if (location.phoneNumbers?.length) {
      const phones = location.phoneNumbers
        .map((phone) => [phone.countryCode, phone.number].filter(Boolean).join(' ') + (phone.extension ? ` ext. ${phone.extension}` : ''))
        .join(', ');
      fields.push({ label: this.detailLabel('map.detail.phone'), value: phones });
    }
    const [lng, lat] = location.point.coordinates;
    fields.push({ label: this.detailLabel('map.detail.coordinates'), value: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    if (location.createdAt) {
      fields.push({ label: this.detailLabel('map.detail.created'), value: new Date(location.createdAt).toLocaleString() });
    }
    return fields;
  }

  private deviceDetailFields(device: Device): { label: string; value: string }[] {
    const fields: { label: string; value: string }[] = [
      { label: this.detailLabel('map.detail.identifier'), value: device.deviceIdentifier ?? '' },
      { label: this.detailLabel('map.detail.type'), value: device.type },
    ];
    if (device.status) {
      fields.push({ label: this.detailLabel('map.detail.status'), value: device.status });
    }
    if (device.batteryLevel != null) {
      fields.push({ label: this.detailLabel('map.detail.battery'), value: `${device.batteryLevel}%` });
    }
    if (device.lastSeenAt) {
      fields.push({ label: this.detailLabel('map.detail.lastSeen'), value: new Date(device.lastSeenAt).toLocaleString() });
    }
    if (device.lastKnownPoint) {
      const [lng, lat] = device.lastKnownPoint.coordinates;
      fields.push({ label: this.detailLabel('map.detail.lastLocation'), value: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    }
    return fields;
  }

  private detailLabel(key: string): string {
    return `${this.transloco.translate(key)}:`;
  }

  private showResultsOnMap(hits: SearchHit[]): void {
    const markers = this.renderSearchMarkers(hits);
    if (markers.length > 0) {
      this.mapProvider.panTo(markers[0].lat, markers[0].lng);
    }
  }

  /** Rebuilds the map markers for the given hits, without recentering — used after search and after edit/delete. */
  private renderSearchMarkers(hits: SearchHit[]): MapMarkerData[] {
    const markers: MapMarkerData[] = [];
    for (const hit of hits) {
      const point = this.hitPoint(hit);
      if (!point) {
        continue;
      }
      const [lng, lat] = point.coordinates;
      markers.push({ id: hit.data.id, lat, lng, title: this.resultTitle(hit), kind: hit.type === 'DEVICE' ? 'device' : 'location' });
    }
    this.mapProvider.setMarkers(markers, (id) => this.onMarkerClicked(id));
    return markers;
  }

  private hitPoint(hit: SearchHit) {
    return hit.type === 'LOCATION' ? (hit.data as Location).point : (hit.data as Device).lastKnownPoint;
  }
}
