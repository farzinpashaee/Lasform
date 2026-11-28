package com.csl.lasform.model.entity;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import com.csl.lasform.model.entity.enums.RuleTriggerType;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

/**
 * A device-event automation: fires {@link #actions} when an incoming Event from {@link #triggerType}
 * (a specific device, or every device in a category) matches {@link #conditions} — see
 * EventIngestionService#syncDeviceState for where this gets evaluated.
 *
 * <p>Deliberately a fixed, linear pipeline (trigger -&gt; one conditions group -&gt; actions), not an
 * arbitrary branching workflow — see the project's automations design notes. This keeps both the
 * evaluation engine and the editor UI far smaller than a generic workflow engine while still
 * covering "notify me when this device/category reports X."
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@Document(collection = "rules")
@CompoundIndexes({
        @CompoundIndex(name = "trigger_device_idx", def = "{'enabled': 1, 'triggerType': 1, 'triggerDeviceId': 1}"),
        @CompoundIndex(name = "trigger_category_idx", def = "{'enabled': 1, 'triggerType': 1, 'triggerCategoryId': 1}")
})
public class Rule extends Auditable implements Identifiable {

    @Id
    private String id;

    @NotBlank(message = "{validation.rule.name.required}")
    private String name;

    private String description;

    // Not @NotNull: server-set from the authenticated admin's orgId (see RuleController#create),
    // same rationale as Geofence#ownerId — a client payload legitimately omits it.
    @Indexed
    private String ownerId;

    @Indexed
    @Builder.Default
    private Boolean enabled = true;

    @NotNull(message = "{validation.rule.triggerType.required}")
    private RuleTriggerType triggerType;

    /** Device#id this rule applies to — set when triggerType == DEVICE, otherwise null. */
    private String triggerDeviceId;

    /** Category#id this rule applies to — set when triggerType == CATEGORY, otherwise null. */
    private String triggerCategoryId;

    @Valid
    @NotNull(message = "{validation.rule.conditions.required}")
    @Builder.Default
    private RuleConditionGroup conditions = new RuleConditionGroup();

    @Valid
    @NotEmpty(message = "{validation.rule.actions.required}")
    @Builder.Default
    private List<RuleAction> actions = new ArrayList<>();

    @Version
    private Long version;
}
