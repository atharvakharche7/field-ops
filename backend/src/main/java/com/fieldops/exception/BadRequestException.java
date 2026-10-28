package com.fieldops.exception;

/** Turned into a 400 response by GlobalExceptionHandler. */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
