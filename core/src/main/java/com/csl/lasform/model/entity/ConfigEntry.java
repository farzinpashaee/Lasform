package com.csl.lasform.model.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A generic application setting, keyed by a namespaced dot-separated name (e.g. {@code
 * sso.google.client.id}, {@code map.google.api.key}) rather than a per-domain field, so new
 * settings never require a schema/migration — just a new key. The key IS the Mongo document id,
 * so uniqueness is enforced by MongoDB itself rather than a separate unique index.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
@Document(collection = "config_entries")
public class ConfigEntry extends Auditable {

    @Id
    private String key;

    private String value;
}
