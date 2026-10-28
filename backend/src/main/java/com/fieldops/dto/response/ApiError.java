package com.fieldops.dto.response;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/** The one JSON shape every error response uses. */
public record ApiError(LocalDateTime timestamp, int status, String error, String message, String path) {

    public static ApiError of(int status, String error, String message, String path) {
        return new ApiError(LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS), status, error, message, path);
    }
}
