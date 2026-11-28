import { Auditable } from './auditable.model';
import { AlertSeverity, RuleActionType, RuleLogicalOperator, RuleOperator, RuleTriggerType } from './enums';

/**
 * One condition inside a RuleConditionGroup. field is either one of the whitelisted Event
 * accessors ('type' | 'speed' | 'heading' | 'accuracy' | 'altitude') or a 'payload.<dot.path>'
 * walked through Event#payload — see the backend's RuleServiceImpl for the whitelist check and
 * RuleConditionEvaluator for how a field resolves and compares.
 */
export interface RuleCondition {
  field: string;
  operator: RuleOperator;
  /** Omitted/ignored for EXISTS and NOT_EXISTS. */
  value?: unknown;
}

/** A rule's single, flat set of conditions — not a recursive tree (see Rule's own doc comment). */
export interface RuleConditionGroup {
  operator: RuleLogicalOperator;
  conditions: RuleCondition[];
}

/**
 * One action a Rule runs when its conditions match. Which fields apply depends on type —
 * NOTIFICATION reads severity/message, WEBHOOK reads the webhookXxx fields.
 */
export interface RuleAction {
  type: RuleActionType;
  /** NOTIFICATION only. */
  severity?: AlertSeverity;
  /** NOTIFICATION only — optional custom text; a default is generated when blank. */
  message?: string;
  /** WEBHOOK only. */
  webhookUrl?: string;
  webhookHeaders?: Record<string, string>;
  /** WEBHOOK only — when set, the request carries an X-Lasform-Signature HMAC-SHA256 header. */
  webhookSecret?: string;
}

/**
 * A device-event automation: fires actions when an incoming Event from triggerType (a specific
 * device, or every device in a category) matches conditions. Deliberately a fixed, linear
 * pipeline (trigger -> one conditions group -> actions), not an arbitrary branching workflow.
 */
export interface Rule extends Auditable {
  id?: string;
  name: string;
  description?: string;
  /** Always server-set from the creating admin's org — never sent by the client. */
  ownerId?: string;
  enabled?: boolean;
  triggerType: RuleTriggerType;
  /** Device#id this rule applies to — set when triggerType === 'DEVICE'. */
  triggerDeviceId?: string;
  /** Category#id this rule applies to — set when triggerType === 'CATEGORY'. */
  triggerCategoryId?: string;
  conditions: RuleConditionGroup;
  actions: RuleAction[];
  version?: number;
}
