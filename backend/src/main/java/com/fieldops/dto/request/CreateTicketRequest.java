package com.fieldops.dto.request;

import com.fieldops.entity.enums.Category;
import com.fieldops.entity.enums.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Body of POST /api/tickets. assignedToId is optional: without it the ticket starts OPEN. */
public record CreateTicketRequest(
        @NotBlank(message = "Title is required") @Size(max = 150) String title,
        @Size(max = 5000) String description,
        @NotNull(message = "Category is required") Category category,
        @NotNull(message = "Priority is required") Priority priority,
        @NotNull(message = "Site is required") Long siteId,
        Long assignedToId) {
}
