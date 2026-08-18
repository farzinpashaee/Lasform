package com.csl.lasform.service.impl;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;

/**
 * Generates {@code Device.deviceIdentifier}: {@code md5(deviceId + yyyyMMddHHmmss)}, timestamped
 * in UTC so the result doesn't depend on the server's local time zone. Deterministic uniqueness
 * follows from {@code deviceId} already being a globally-unique Mongo ObjectId — see
 * DeviceServiceImpl#create, which pre-generates that id specifically so it's available before the
 * document is first saved.
 */
final class DeviceIdentifierGenerator {

    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss").withZone(ZoneOffset.UTC);

    private DeviceIdentifierGenerator() {
    }

    static String generate(String deviceId) {
        String input = deviceId + TIMESTAMP_FORMAT.format(Instant.now());
        try {
            MessageDigest digest = MessageDigest.getInstance("MD5");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            // MD5 is a JDK-mandatory algorithm (JCA standard names) — this can't actually happen.
            throw new IllegalStateException("MD5 algorithm unavailable", e);
        }
    }
}
