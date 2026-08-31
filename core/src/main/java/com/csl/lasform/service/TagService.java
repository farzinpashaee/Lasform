package com.csl.lasform.service;

import java.util.List;

/** Free-text tag autocomplete, aggregated across every entity that carries a {@code tags} field. */
public interface TagService {

    /** Existing tags (across Location and Device) starting with {@code prefix}, case-insensitively. */
    List<String> suggest(String prefix, int limit);
}
