package com.fieldops.dto.request;

import com.fieldops.entity.enums.Status;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** The "data" part of POST /api/tickets/{id}/updates. */
public record TicketUpdateRequest(
        // Made on the phone when the user taps Save; the same id on a retry means "same update".
        @NotBlank(message = "clientUpdateId is required")
        @Pattern(regexp = "^[0-9a-fA-F-]{36}$", message = "clientUpdateId must be a UUID")
        String clientUpdateId,
        @NotNull(message = "toStatus is required") Status toStatus,
        @Size(max = 500, message = "Note can be at most 500 characters") String note,
        @DecimalMin("-90") @DecimalMax("90") BigDecimal latitude,
        @DecimalMin("-180") @DecimalMax("180") BigDecimal longitude,
        // Phone's local time without a zone, e.g. 2026-10-14T10:05:00.
        LocalDateTime deviceTime) {
}
