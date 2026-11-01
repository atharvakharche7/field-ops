package com.fieldops.dto.request;

import jakarta.validation.constraints.NotNull;

/** Body of PATCH /api/tickets/{id}/assign. */
public record AssignRequest(@NotNull(message = "Technician is required") Long technicianId) {
}
