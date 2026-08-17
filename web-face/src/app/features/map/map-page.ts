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

import { AuthService } from '../../core/auth/auth.service';
import { MAP_PROVIDER, MapContextMenuEvent, MapMarkerData, MapProvider, MapType } from '../../core/maps';
import { Category } from '../../core/models/category.model';
import { Device } from '../../core/models/device.model';
import { DeviceStatus } from '../../core/models/enums';
import { Location } from '../../core/models/location.model';
import { Review } from '../../core/models/review.model';
import { SearchHit } from '../../core/models/search.model';
import { CategoryService } from '../../core/services/category.service';
import { DeviceService } from '../../core/services/device.service';
import { LocationService } from '../../core/services/location.service';
import { ReviewService } from '../../core/services/review.service';
import { SearchService } from '../../core/services/search.service';
import { TagService } from '../../core/services/tag.service';
import { AccountMenu } from '../../shared/account-menu/account-menu';

type DetailsTab = 'overview' | 'reviews';

const DEVICE_STATUSES: DeviceStatus[] = ['ACTIVE', 'INACTIVE', 'OFFLINE', 'MAINTENANCE', 'DECOMMISSIONED'];

const DARK_MODE_STORAGE_KEY = 'lasform.darkMode';

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
  private readonly categoryService = inject(CategoryService);
  private readonly tagService = inject(TagService);
  private readonly searchService = inject(SearchService);
  private readonly reviewService = inject(ReviewService);
  private readonly mapProvider: MapProvider = inject(MAP_PROVIDER);

  private readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  /** All locations shown as markers before any search; looked up on marker click when hasSearched() is false. */
  private allLocationHits: SearchHit[] = [];
  private tagSuggestionTimer?: ReturnType<typeof setTimeout>;

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

  protected readonly searchQuery = signal('');
  protected readonly searchResults = signal<SearchHit[]>([]);
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);
  protected readonly hasSearched = signal(false);
  protected readonly selectedResult = signal<SearchHit | null>(null);
  protected readonly entityMenuOpen = signal(false);
  protected readonly detailsTab = signal<DetailsTab>('overview');
  protected readonly reviews = signal<Review[]>([]);
  protected readonly loadingReviews = signal(false);
  protected readonly reviewsLoadError = signal<string | null>(null);
  protected readonly locating = signal(false);
  protected readonly clusteringEnabled = signal(false);
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

  /** Set when the marker load 401s — e.g. an admin revoked map:view_public for anonymous callers. */
  protected readonly mapAccessDenied = signal(false);

  async ngAfterViewInit(): Promise<void> {
    await this.mapProvider.initialize(this.mapContainer().nativeElement, {
      center: { lat: 43.8628, lng: -79.4308 },
      zoom: 14,
    });

    this.loadLocationMarkers();
    this.loadCategories();
    this.mapProvider.onContextMenu((event) => this.openMapContextMenu(event));
    this.jumpToQueryLocation();
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

  @HostListener('document:keydown.escape')
  protected closeOverlays(): void {
    this.mapContextMenu.set(null);
    this.mapTypeMenuOpen.set(false);
    this.entityMenuOpen.set(false);
    this.closeAddCategoryModal();
    this.closeAddLocationModal();
    this.closeEditModal();
    this.closeDeleteConfirm();
  }

  ngOnDestroy(): void {
    this.mapProvider.destroy();
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

  protected categoryLabel(categoryId: string): string {
    const category = this.categoryMap().get(categoryId);
    if (!category) {
      return categoryId;
    }
    return category.marker ? `${category.marker} ${category.name}` : category.name;
  }

  /** The single tag chip shown under the name in the details panel — first category, if any. */
  protected primaryCategoryLabel(hit: SearchHit): string | null {
    const categoryIds = hit.type === 'LOCATION' ? (hit.data as Location).categoryIds : (hit.data as Device).categoryIds;
    return categoryIds && categoryIds.length > 0 ? this.categoryLabel(categoryIds[0]) : null;
  }

  private loadLocationMarkers(): void {
    this.locationService.findAll({ size: 200 }).subscribe({
      next: (page) => {
        this.mapAccessDenied.set(false);
        this.allLocationHits = page.content.map((location) => ({ type: 'LOCATION' as const, data: location }));
        const markers = page.content.map((location) => {
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
    const menuSize = { width: 220, height: 132 };
    const x = Math.min(event.clientX, window.innerWidth - menuSize.width - 8);
    const y = Math.min(event.clientY, window.innerHeight - menuSize.height - 8);
    this.mapContextMenu.set({ lat: event.lat, lng: event.lng, x, y });
  }

  protected closeMapContextMenu(): void {
    this.mapContextMenu.set(null);
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
      recordedAt: new Date().toISOString(),
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

    this.searchService.search({ q: query, size: 50 }).subscribe({
      next: (page) => {
        this.searching.set(false);
        this.searchResults.set(page.content);
        this.showResultsOnMap(page.content);
      },
      error: () => {
        this.searching.set(false);
        this.searchResults.set([]);
        this.searchError.set(this.transloco.translate('map.searchFailed'));
      },
    });
  }

  protected selectResult(hit: SearchHit): void {
    this.selectedResult.set(hit);
    this.resetDetailsPanelState();

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
        this.allLocationHits = this.allLocationHits.filter((h) => h.data.id !== id);
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
  }

  private onMarkerClicked(id: string): void {
    const source = this.hasSearched() ? this.searchResults() : this.allLocationHits;
    const hit = source.find((candidate) => candidate.data.id === id);
    if (hit) {
      this.selectedResult.set(hit);
      this.resetDetailsPanelState();
    }
  }

  /** Clears the previous selection's tab/menu/reviews state so it doesn't leak into a newly selected hit. */
  private resetDetailsPanelState(): void {
    this.detailsTab.set('overview');
    this.entityMenuOpen.set(false);
    this.reviews.set([]);
    this.reviewsLoadError.set(null);
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

  /** 5 booleans (filled/empty), rounded to the nearest star — null for devices or unreviewed locations. */
  protected resultRatingStars(hit: SearchHit): boolean[] | null {
    if (hit.type !== 'LOCATION') {
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
    const [lng, lat] = location.point.coordinates;
    fields.push({ label: this.detailLabel('map.detail.coordinates'), value: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    if (location.recordedAt) {
      fields.push({ label: this.detailLabel('map.detail.recorded'), value: new Date(location.recordedAt).toLocaleString() });
    }
    if (location.tags?.length) {
      fields.push({ label: this.detailLabel('map.detail.tags'), value: location.tags.join(', ') });
    }
    return fields;
  }

  private deviceDetailFields(device: Device): { label: string; value: string }[] {
    const fields: { label: string; value: string }[] = [
      { label: this.detailLabel('map.detail.identifier'), value: device.deviceIdentifier },
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
    if (device.tags?.length) {
      fields.push({ label: this.detailLabel('map.detail.tags'), value: device.tags.join(', ') });
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
      markers.push({ id: hit.data.id, lat, lng, title: this.resultTitle(hit) });
    }
    this.mapProvider.setMarkers(markers, (id) => this.onMarkerClicked(id));
    return markers;
  }

  private hitPoint(hit: SearchHit) {
    return hit.type === 'LOCATION' ? (hit.data as Location).point : (hit.data as Device).lastKnownPoint;
  }
}
