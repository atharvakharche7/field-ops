package com.fieldops.dto.response;

import com.fieldops.entity.Ticket;
import com.fieldops.entity.enums.Category;
import com.fieldops.entity.enums.Priority;
import com.fieldops.entity.enums.Status;

import java.time.LocalDateTime;

/** One card in a ticket list. */
public record TicketSummaryDto(Long id, String ticketNo, String title, Priority priority, Status status,
                               Category category, String siteName, String city, String assignedToName,
                               LocalDateTime updatedAt) {

    public static TicketSummaryDto from(Ticket t) {
        return new TicketSummaryDto(t.getId(), t.getTicketNo(), t.getTitle(), t.getPriority(), t.getStatus(),
                t.getCategory(), t.getSite().getName(), t.getSite().getCity(),
                t.getAssignedTo() == null ? null : t.getAssignedTo().getName(),
                t.getUpdatedAt());
    }
}
