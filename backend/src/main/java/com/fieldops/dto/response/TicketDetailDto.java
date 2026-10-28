package com.fieldops.dto.response;

import com.fieldops.entity.Ticket;
import com.fieldops.entity.TicketUpdate;
import com.fieldops.entity.enums.Category;
import com.fieldops.entity.enums.Priority;
import com.fieldops.entity.enums.Status;

import java.time.LocalDateTime;
import java.util.List;

/** Everything the Ticket Detail screen shows, including the full update history. */
public record TicketDetailDto(Long id, String ticketNo, String title, String description, Priority priority,
                              Status status, Category category, SiteDto site, PersonDto assignedTo,
                              LocalDateTime createdAt, LocalDateTime updatedAt, LocalDateTime resolvedAt,
                              List<UpdateDto> updates) {

    public static TicketDetailDto from(Ticket t, List<TicketUpdate> updates) {
        return new TicketDetailDto(t.getId(), t.getTicketNo(), t.getTitle(), t.getDescription(), t.getPriority(),
                t.getStatus(), t.getCategory(), SiteDto.from(t.getSite()), PersonDto.from(t.getAssignedTo()),
                t.getCreatedAt(), t.getUpdatedAt(), t.getResolvedAt(),
                updates.stream().map(UpdateDto::from).toList());
    }
}
