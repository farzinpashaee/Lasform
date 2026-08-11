package com.csl.lasform.exception;

/**
 * For application-level "the request itself is invalid" errors (missing required filter
 * combination, out-of-range paging params, etc.) that need a localizable message — as opposed to
 * a raw {@link IllegalArgumentException}, whose message is framework/library text we don't own
 * and don't attempt to translate.
 */
public class BadRequestException extends RuntimeException {

    private final String code;
    private final Object[] args;

    public BadRequestException(String code, Object... args) {
        super(code);
        this.code = code;
        this.args = args;
    }

    public String getCode() {
        return code;
    }

    public Object[] getArgs() {
        return args;
    }
}
