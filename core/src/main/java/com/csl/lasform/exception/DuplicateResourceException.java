package com.csl.lasform.exception;

/**
 * Carries a {@link com.csl.lasform.exception.GlobalExceptionHandler}-resolvable message code and
 * its interpolation args rather than a pre-formatted English string, so the response can be
 * localized to the request's Locale.
 */
public class DuplicateResourceException extends RuntimeException {

    private final String code;
    private final Object[] args;

    public DuplicateResourceException(String code, Object... args) {
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
