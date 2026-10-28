package com.fieldops.exception;

/** Turned into a 404 response by GlobalExceptionHandler. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
