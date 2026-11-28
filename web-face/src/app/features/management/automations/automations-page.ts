import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { Category } from '../../../core/models/category.model';
import { Device } from '../../../core/models/device.model';
import { Rule } from '../../../core/models/rule.model';
import { CategoryService } from '../../../core/services/category.service';
import { DeviceService } from '../../../core/services/device.service';
import { RuleService } from '../../../core/services/rule.service';

@Component({
  selector: 'app-automations-page',
  imports: [TranslocoPipe],
  templateUrl: './automations-page.html',
  styleUrl: './automations-page.scss',
})
export class AutomationsPage implements OnInit {
  private readonly ruleService = inject(RuleService);
  private readonly deviceService = inject(DeviceService);
  private readonly categoryService = inject(CategoryService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly rules = signal<Rule[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);

  private readonly devices = signal<Device[]>([]);
  private readonly categories = signal<Category[]>([]);
  private readonly deviceMap = computed(() => new Map(this.devices().map((d) => [d.id, d])));
  private readonly categoryMap = computed(() => new Map(this.categories().map((c) => [c.id, c])));

  protected readonly deleteTarget = signal<Rule | null>(null);
  protected readonly deletingRule = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadRules();
    this.deviceService.findAll({ size: 200 }).subscribe({ next: (page) => this.devices.set(page.content), error: () => {} });
    this.categoryService.findAll({ size: 200 }).subscribe({ next: (page) => this.categories.set(page.content), error: () => {} });
  }

  private loadRules(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.ruleService.findAll({ size: 100, sort: 'name,asc' }).subscribe({
      next: (page) => {
        this.loading.set(false);
        this.rules.set(page.content);
      },
      error: () => {
        this.loading.set(false);
        this.rules.set([]);
        this.loadError.set(this.transloco.translate('automations.loadFailed'));
      },
    });
  }

  /** "Device 'Simulator'" or "Category 'Vehicles'" — a short human summary of what fires this rule. */
  protected triggerSummary(rule: Rule): string {
    if (rule.triggerType === 'DEVICE') {
      const name = rule.triggerDeviceId ? (this.deviceMap().get(rule.triggerDeviceId)?.name ?? rule.triggerDeviceId) : '—';
      return `${this.transloco.translate('automations.triggerType.DEVICE')}: ${name}`;
    }
    const name = rule.triggerCategoryId ? (this.categoryMap().get(rule.triggerCategoryId)?.name ?? rule.triggerCategoryId) : '—';
    return `${this.transloco.translate('automations.triggerType.CATEGORY')}: ${name}`;
  }

  protected addRule(): void {
    this.router.navigate(['/management/automations/new']);
  }

  protected editRule(rule: Rule): void {
    if (rule.id) {
      this.router.navigate(['/management/automations', rule.id]);
    }
  }

  protected toggleEnabled(rule: Rule): void {
    if (!rule.id) {
      return;
    }
    const enabled = !rule.enabled;
    this.rules.update((rules) => rules.map((r) => (r.id === rule.id ? { ...r, enabled } : r)));
    this.ruleService.update(rule.id, { ...rule, enabled }).subscribe({
      error: () => this.rules.update((rules) => rules.map((r) => (r.id === rule.id ? { ...r, enabled: !enabled } : r))),
    });
  }

  protected openDeleteConfirm(rule: Rule): void {
    this.deleteTarget.set(rule);
    this.deleteError.set(null);
  }

  protected closeDeleteConfirm(): void {
    this.deleteTarget.set(null);
    this.deletingRule.set(false);
  }

  protected confirmDelete(): void {
    const rule = this.deleteTarget();
    if (!rule?.id || this.deletingRule()) {
      return;
    }
    this.deletingRule.set(true);
    this.deleteError.set(null);
    this.ruleService.deleteById(rule.id).subscribe({
      next: () => {
        this.deletingRule.set(false);
        this.closeDeleteConfirm();
        this.loadRules();
      },
      error: () => {
        this.deletingRule.set(false);
        this.deleteError.set(this.transloco.translate('automations.deleteFailed'));
      },
    });
  }
}
