import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Event } from '../models/event.model';
import { Rule, RuleCondition, RuleConditionGroup } from '../models/rule.model';
import { CrudService } from './crud.service';
import { buildHttpParams } from './http-params.util';

export interface ConditionResult {
  condition: RuleCondition;
  matched: boolean;
}

export interface EvaluationOutcome {
  matched: boolean;
  conditionResults: ConditionResult[];
}

@Injectable({ providedIn: 'root' })
export class RuleService extends CrudService<Rule> {
  constructor() {
    super('rules');
  }

  /** Provide ownerId, matching the backend's /search contract. */
  search(ownerId: string): Observable<Rule[]> {
    return this.http.get<Rule[]>(`${this.resourceUrl}/search`, { params: buildHttpParams({ ownerId }) });
  }

  /** Tests a draft condition group against a sample event before saving — nothing is persisted. */
  evaluate(conditions: RuleConditionGroup, sampleEvent: Event): Observable<EvaluationOutcome> {
    return this.http.post<EvaluationOutcome>(`${this.resourceUrl}/evaluate`, { conditions, sampleEvent });
  }
}
