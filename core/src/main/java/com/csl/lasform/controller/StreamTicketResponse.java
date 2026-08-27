package com.csl.lasform.controller;

import java.time.Instant;

public record StreamTicketResponse(String ticket, Instant expiresAt) {
}
