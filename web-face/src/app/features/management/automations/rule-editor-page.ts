import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { Category } from '../../../core/models/category.model';
import { Device } from '../../../core/models/device.model';
import { AlertSeverity, RuleActionType, RuleLogicalOperator, RuleOperator, RuleTriggerType } from '../../../core/models/enums';
import { Event as DeviceEvent } from '../../../core/models/event.model';
import { Rule, RuleAction, RuleCondition } from '../../../core/models/rule.model';
import { CategoryService } from '../../../core/services/category.service';
import { DeviceService } from '../../../core/services/device.service';
import { EvaluationOutcome, RuleService } from '../../../core/services/rule.service';

/** Which node's config panel is currently showing. */
type NodeSelection = 'trigger' | { condition: number } | { action: number };

interface Point {
  x: number;
  y: number;
}

const WHITELISTED_FIELDS = ['type', 'speed', 'heading', 'accuracy', 'altitude'];
const RULE_OPERATORS: RuleOperator[] = ['EQ', 'NE', 'GT', 'GTE', 'LT', 'LTE', 'CONTAINS', 'EXISTS', 'NOT_EXISTS'];
const ALERT_SEVERITIES: AlertSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// Default auto-layout geometry — a node's position is only looked up from nodePositions() (set by
// dragging it); until then it falls back to a position computed from these constants, so newly
// added nodes always appear in a sensible spot instead of stacked at the origin.
//
// NODE_HEIGHT must match .node's own CSS height exactly (see rule-editor-page.scss) — it's what
// every port dot, connector endpoint, and the inline "+" button's position is computed from, so a
// mismatch (the earlier bug) shows up as dots/buttons landing inside a node instead of on its edge.
const CANVAS_CENTER_X = 320;
const TRIGGER_Y = 50;
const NODE_WIDTH = 160;
const NODE_HEIGHT = 96;
const VERTICAL_GAP = 126;

const DEFAULT_SAMPLE_EVENT = JSON.stringify(
  {
    type: 'LOCATION_RECEIVED',
    speed: 12.5,
    heading: 90,
    accuracy: 5,
    altitude: 100,
    point: { type: 'Point', coordinates: [0, 0] },
    payload: { fuelLevelPercent: 42 },
    occurredAt: new Date().toISOString(),
  },
  null,
  2,
);

function blankRule(): Rule {
  return {
    name: '',
    description: '',
    enabled: true,
    triggerType: 'DEVICE',
    conditions: { operator: 'AND', conditions: [] },
    actions: [],
  };
}

function blankAction(type: RuleActionType): RuleAction {
  return type === 'NOTIFICATION'
    ? { type: 'NOTIFICATION', severity: 'MEDIUM', message: '' }
    : { type: 'WEBHOOK', webhookUrl: '', webhookHeaders: {}, webhookSecret: '' };
}

@Component({
  selector: 'app-rule-editor-page',
  imports: [FormsModule, TranslocoPipe],
  templateUrl: './rule-editor-page.html',
  styleUrl: './rule-editor-page.scss',
})
export class RuleEditorPage implements OnInit {
  private readonly ruleService = inject(RuleService);
  private readonly deviceService = inject(DeviceService);
  private readonly categoryService = inject(CategoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly whitelistedFields = WHITELISTED_FIELDS;
  protected readonly ruleOperators = RULE_OPERATORS;
  protected readonly alertSeverities = ALERT_SEVERITIES;
  protected readonly nodeWidth = NODE_WIDTH;
  protected readonly nodeHeight = NODE_HEIGHT;

  private ruleId: string | null = null;
  protected readonly rule = signal<Rule>(blankRule());
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected readonly selectedNode = signal<NodeSelection>('trigger');

  /** Manually-dragged node positions, keyed by node id ("trigger", "condition-0", "action-1", ...) —
   *  anything not in here falls back to its auto-layout position (see the position methods below). */
  protected readonly nodePositions = signal<Record<string, Point>>({});
  private dragging: { key: string; startX: number; startY: number; origin: Point } | null = null;

  /** The top-right "Add" dropdown — always adds at the auto-layout's default next slot. */
  protected readonly addMenuOpen = signal(false);
  /** The right-click canvas menu — set while open, holding where the new node should land. */
  protected readonly canvasMenu = signal<Point | null>(null);

  protected readonly devices = signal<Device[]>([]);
  protected readonly categories = signal<Category[]>([]);

  protected readonly testSampleEventJson = signal(DEFAULT_SAMPLE_EVENT);
  protected readonly testing = signal(false);
  protected readonly testOutcome = signal<EvaluationOutcome | null>(null);
  protected readonly testError = signal<string | null>(null);

  ngOnInit(): void {
    this.deviceService.findAll({ size: 200 }).subscribe({ next: (page) => this.devices.set(page.content), error: () => {} });
    this.categoryService.findAll({ size: 200 }).subscribe({ next: (page) => this.categories.set(page.content), error: () => {} });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id || id === 'new') {
      return;
    }
    this.ruleId = id;
    this.loading.set(true);
    this.ruleService.getById(id).subscribe({
      next: (rule) => {
        this.loading.set(false);
        this.rule.set(rule);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(this.transloco.translate('automations.loadFailed'));
      },
    });
  }

  // --- node selection ---

  protected selectTrigger(): void {
    this.selectedNode.set('trigger');
  }

  protected selectCondition(index: number): void {
    this.selectedNode.set({ condition: index });
  }

  protected selectAction(index: number): void {
    this.selectedNode.set({ action: index });
  }

  protected isTriggerSelected(): boolean {
    return this.selectedNode() === 'trigger';
  }

  protected isConditionSelected(index: number): boolean {
    const selection = this.selectedNode();
    return typeof selection === 'object' && 'condition' in selection && selection.condition === index;
  }

  protected isActionSelected(index: number): boolean {
    const selection = this.selectedNode();
    return typeof selection === 'object' && 'action' in selection && selection.action === index;
  }

  protected selectedConditionIndex(): number | null {
    const selection = this.selectedNode();
    return typeof selection === 'object' && 'condition' in selection ? selection.condition : null;
  }

  protected selectedActionIndex(): number | null {
    const selection = this.selectedNode();
    return typeof selection === 'object' && 'action' in selection ? selection.action : null;
  }

  /** The selected condition/action itself, if any — a method (not the index) so `@if (...; as x)` works even for index 0. */
  protected selectedCondition(): RuleCondition | null {
    const index = this.selectedConditionIndex();
    return index != null ? (this.rule().conditions.conditions[index] ?? null) : null;
  }

  protected selectedAction(): RuleAction | null {
    const index = this.selectedActionIndex();
    return index != null ? (this.rule().actions[index] ?? null) : null;
  }

  // --- canvas layout (auto-computed positions + drag overrides) ---

  protected triggerPosition(): Point {
    return this.nodePositions()['trigger'] ?? { x: CANVAS_CENTER_X, y: TRIGGER_Y };
  }

  protected conditionPosition(index: number): Point {
    return this.nodePositions()[`condition-${index}`] ?? { x: CANVAS_CENTER_X, y: TRIGGER_Y + (index + 1) * VERTICAL_GAP };
  }

  protected addConditionPosition(): Point {
    const count = this.rule().conditions.conditions.length;
    return { x: CANVAS_CENTER_X, y: TRIGGER_Y + (count + 1) * VERTICAL_GAP };
  }

  /** Actions continue the same single vertical column as the trigger/conditions above them —
   *  one node directly under the next, never side by side — so index 0 picks up right where the
   *  conditions chain (or the trigger, if there are none) left off. */
  protected actionPosition(index: number): Point {
    const stored = this.nodePositions()[`action-${index}`];
    if (stored) {
      return stored;
    }
    const previous = index === 0 ? this.chainEndPosition() : this.actionPosition(index - 1);
    return { x: previous.x, y: previous.y + VERTICAL_GAP };
  }

  protected addActionPosition(): Point {
    const last = this.lastChainNodePosition();
    return { x: last.x, y: last.y + VERTICAL_GAP };
  }

  /** Indices of the gaps *between* condition nodes — where the shared AND/OR chip sits. */
  protected conditionGapIndices(): number[] {
    const count = this.rule().conditions.conditions.length;
    return count > 1 ? Array.from({ length: count - 1 }, (_, i) => i) : [];
  }

  protected operatorChipPosition(gapIndex: number): Point {
    const a = this.conditionPosition(gapIndex);
    const b = this.conditionPosition(gapIndex + 1);
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  /** The last node in the fixed trigger->conditions chain — the last condition, or the trigger
   *  itself if there are none — which is where the (now equally vertical) actions continue from. */
  private chainEndPosition(): Point {
    const conditions = this.rule().conditions.conditions;
    return conditions.length > 0 ? this.conditionPosition(conditions.length - 1) : this.triggerPosition();
  }

  /** The very last node anywhere in the pipeline — the last action if any exist, otherwise
   *  chainEndPosition() — i.e. wherever the single vertical column currently ends. */
  private lastChainNodePosition(): Point {
    const actions = this.rule().actions;
    return actions.length > 0 ? this.actionPosition(actions.length - 1) : this.chainEndPosition();
  }

  /** The n8n-style inline "+" sitting on the connector right after the pipeline's current last
   *  node — always present, so it reads as "add the next step" regardless of how much exists yet. */
  protected inlineAddButtonPosition(): Point {
    const end = this.lastChainNodePosition();
    return { x: end.x, y: end.y + VERTICAL_GAP / 2 };
  }

  protected openInlineAddMenu(): void {
    this.canvasMenu.set(this.inlineAddButtonPosition());
  }

  /** Curved (n8n-style) connector paths down a single vertical column: trigger -> each condition
   *  in order -> each action in order -> a short dangling stub down to the inline "+" button,
   *  always present at the tail so there's always somewhere obvious to continue the pipeline. */
  protected edges(): string[] {
    const edges: string[] = [];
    const conditions = this.rule().conditions.conditions;
    const actions = this.rule().actions;

    let previous = this.triggerPosition();
    for (let i = 0; i < conditions.length; i++) {
      const position = this.conditionPosition(i);
      edges.push(this.pathBetween(previous, position));
      previous = position;
    }
    for (let i = 0; i < actions.length; i++) {
      const position = this.actionPosition(i);
      edges.push(this.pathBetween(previous, position));
      previous = position;
    }
    edges.push(this.pathBetween(previous, this.inlineAddButtonPosition()));
    return edges;
  }

  /** A port dot sits at the exact start/end of every edge — see edgeEndpoint(). */
  protected edgeEndpoint(position: Point, side: 'top' | 'bottom'): Point {
    return { x: position.x, y: side === 'top' ? position.y - NODE_HEIGHT / 2 : position.y + NODE_HEIGHT / 2 };
  }

  /** A vertical S-curve, matching n8n's own connectors: pulled straight down from the source and
   *  straight up into the target, so it's a plain vertical line when the two share an x position
   *  and bows smoothly sideways (like the reference screenshot) whenever a dragged node doesn't. */
  private pathBetween(from: Point, to: Point): string {
    const start = this.edgeEndpoint(from, 'bottom');
    const end = this.edgeEndpoint(to, 'top');
    const bend = (end.y - start.y) / 2;
    return `M ${start.x} ${start.y} C ${start.x} ${start.y + bend}, ${end.x} ${end.y - bend}, ${end.x} ${end.y}`;
  }

  // --- dragging ---

  protected startDrag(key: string, current: Point, event: PointerEvent): void {
    event.preventDefault();
    this.dragging = { key, startX: event.clientX, startY: event.clientY, origin: current };
    const onMove = (moveEvent: PointerEvent) => this.handleDragMove(moveEvent);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      this.dragging = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  private handleDragMove(event: PointerEvent): void {
    const drag = this.dragging;
    if (!drag) {
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    this.nodePositions.update((positions) => ({
      ...positions,
      [drag.key]: { x: drag.origin.x + dx, y: drag.origin.y + dy },
    }));
  }

  /** Drops any manually-dragged positions for conditions/actions — used whenever the list itself
   *  changes shape (add/remove/reorder), since positions are keyed by array index and would
   *  otherwise end up misattributed to a different condition/action after the shift. */
  private resetPositions(prefix: 'condition' | 'action'): void {
    this.nodePositions.update((positions) => {
      const next = { ...positions };
      for (const key of Object.keys(next)) {
        if (key.startsWith(`${prefix}-`)) {
          delete next[key];
        }
      }
      return next;
    });
  }

  // --- "add" menus (top-right dropdown + right-click canvas menu) ---

  protected toggleAddMenu(): void {
    this.addMenuOpen.update((open) => !open);
  }

  protected closeAddMenu(): void {
    this.addMenuOpen.set(false);
  }

  /** Opens the right-click menu at the clicked spot — canvasEl.scrollLeft/Top account for the
   *  canvas having scrolled, so the new node lands under the cursor regardless. */
  protected openCanvasMenu(event: MouseEvent, canvasEl: HTMLElement): void {
    event.preventDefault();
    const rect = canvasEl.getBoundingClientRect();
    this.canvasMenu.set({
      x: event.clientX - rect.left + canvasEl.scrollLeft,
      y: event.clientY - rect.top + canvasEl.scrollTop,
    });
  }

  protected closeCanvasMenu(): void {
    this.canvasMenu.set(null);
  }

  protected addConditionFromMenu(): void {
    const at = this.canvasMenu();
    this.closeCanvasMenu();
    this.closeAddMenu();
    this.addCondition(at ?? undefined);
  }

  protected addActionFromMenu(type: RuleActionType): void {
    const at = this.canvasMenu();
    this.closeCanvasMenu();
    this.closeAddMenu();
    this.addAction(type, at ?? undefined);
  }

  // --- trigger ---

  protected setTriggerType(type: RuleTriggerType): void {
    this.rule.update((r) => ({ ...r, triggerType: type, triggerDeviceId: undefined, triggerCategoryId: undefined }));
  }

  protected setTriggerDeviceId(id: string): void {
    this.rule.update((r) => ({ ...r, triggerDeviceId: id || undefined }));
  }

  protected setTriggerCategoryId(id: string): void {
    this.rule.update((r) => ({ ...r, triggerCategoryId: id || undefined }));
  }

  // --- conditions ---

  protected setConditionsOperator(operator: RuleLogicalOperator): void {
    this.rule.update((r) => ({ ...r, conditions: { ...r.conditions, operator } }));
  }

  protected toggleConditionsOperator(): void {
    this.setConditionsOperator(this.rule().conditions.operator === 'AND' ? 'OR' : 'AND');
  }

  /** `at`, if given, drops the new node exactly where the user right-clicked instead of the
   *  auto-layout's default next slot (see addConditionPosition()). */
  protected addCondition(at?: Point): void {
    const fallbackPosition = this.addConditionPosition();
    this.resetPositions('condition');
    this.rule.update((r) => ({
      ...r,
      conditions: { ...r.conditions, conditions: [...r.conditions.conditions, { field: '', operator: 'EQ', value: '' }] },
    }));
    const index = this.rule().conditions.conditions.length - 1;
    this.selectCondition(index);
    this.nodePositions.update((positions) => ({ ...positions, [`condition-${index}`]: at ?? fallbackPosition }));
  }

  protected removeCondition(index: number): void {
    this.resetPositions('condition');
    this.rule.update((r) => ({
      ...r,
      conditions: { ...r.conditions, conditions: r.conditions.conditions.filter((_, i) => i !== index) },
    }));
    if (this.isConditionSelected(index)) {
      this.selectTrigger();
    }
  }

  protected updateCondition(index: number, patch: Partial<RuleCondition>): void {
    this.rule.update((r) => ({
      ...r,
      conditions: {
        ...r.conditions,
        conditions: r.conditions.conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)),
      },
    }));
  }

  protected valueHidden(operator: RuleOperator): boolean {
    return operator === 'EXISTS' || operator === 'NOT_EXISTS';
  }

  /** A short canvas-node label for a condition, e.g. "speed > 50" — blank parts just collapse. */
  protected conditionSummary(condition: RuleCondition): string {
    const operatorLabel = this.transloco.translate(`automations.operator.${condition.operator}`);
    const parts = [condition.field || '…', operatorLabel];
    if (!this.valueHidden(condition.operator) && condition.value !== '' && condition.value != null) {
      parts.push(String(condition.value));
    }
    return parts.join(' ');
  }

  // --- actions ---

  /** `at`, if given, drops the new node exactly where the user right-clicked instead of the
   *  auto-layout's default next slot (see addActionPosition()). */
  protected addAction(type: RuleActionType, at?: Point): void {
    const fallbackPosition = this.addActionPosition();
    this.resetPositions('action');
    this.rule.update((r) => ({ ...r, actions: [...r.actions, blankAction(type)] }));
    const index = this.rule().actions.length - 1;
    this.selectAction(index);
    this.nodePositions.update((positions) => ({ ...positions, [`action-${index}`]: at ?? fallbackPosition }));
  }

  protected removeAction(index: number): void {
    this.resetPositions('action');
    this.rule.update((r) => ({ ...r, actions: r.actions.filter((_, i) => i !== index) }));
    if (this.isActionSelected(index)) {
      this.selectTrigger();
    }
  }

  protected moveActionUp(index: number): void {
    this.swapActions(index, index - 1);
  }

  protected moveActionDown(index: number): void {
    this.swapActions(index, index + 1);
  }

  private swapActions(a: number, b: number): void {
    if (b < 0 || b >= this.rule().actions.length) {
      return;
    }
    this.resetPositions('action');
    this.rule.update((r) => {
      const actions = [...r.actions];
      [actions[a], actions[b]] = [actions[b], actions[a]];
      return { ...r, actions };
    });
    if (this.isActionSelected(a)) {
      this.selectAction(b);
    }
  }

  protected updateAction(index: number, patch: Partial<RuleAction>): void {
    this.rule.update((r) => ({ ...r, actions: r.actions.map((a, i) => (i === index ? { ...a, ...patch } : a)) }));
  }

  /** Extra webhook headers, edited as "Key: Value" lines rather than individually-addable rows. */
  protected webhookHeadersText(action: RuleAction): string {
    return Object.entries(action.webhookHeaders ?? {})
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }

  protected updateWebhookHeadersText(index: number, text: string): void {
    const headers: Record<string, string> = {};
    for (const line of text.split('\n')) {
      const colonIndex = line.indexOf(':');
      if (colonIndex <= 0) {
        continue;
      }
      const key = line.slice(0, colonIndex).trim();
      if (key) {
        headers[key] = line.slice(colonIndex + 1).trim();
      }
    }
    this.updateAction(index, { webhookHeaders: headers });
  }

  // --- test ---

  protected testConditions(): void {
    let sampleEvent: DeviceEvent;
    try {
      sampleEvent = JSON.parse(this.testSampleEventJson());
    } catch {
      this.testOutcome.set(null);
      this.testError.set(this.transloco.translate('automations.testFailed'));
      return;
    }
    this.testing.set(true);
    this.testError.set(null);
    this.ruleService.evaluate(this.rule().conditions, sampleEvent).subscribe({
      next: (outcome) => {
        this.testing.set(false);
        this.testOutcome.set(outcome);
      },
      error: () => {
        this.testing.set(false);
        this.testOutcome.set(null);
        this.testError.set(this.transloco.translate('automations.testFailed'));
      },
    });
  }

  // --- save/cancel ---

  protected canSave(): boolean {
    const rule = this.rule();
    return rule.name.trim().length > 0 && rule.actions.length > 0 && !this.saving();
  }

  protected save(): void {
    if (!this.canSave()) {
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    const rule = this.rule();
    const request = this.ruleId ? this.ruleService.update(this.ruleId, rule) : this.ruleService.create(rule);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/management/automations']);
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set(this.transloco.translate('automations.saveFailed'));
      },
    });
  }

  protected cancel(): void {
    this.router.navigate(['/management/automations']);
  }
}
