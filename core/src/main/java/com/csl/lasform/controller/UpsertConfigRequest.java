package com.csl.lasform.controller;

import jakarta.validation.constraints.NotBlank;

public record UpsertConfigRequest(@NotBlank String value) {
}
