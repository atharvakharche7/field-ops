package com.fieldops.exception;

/** Turned into a 403 response by GlobalExceptionHandler. */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
