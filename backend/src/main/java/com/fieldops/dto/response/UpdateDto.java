package com.fieldops.dto.response;

import com.fieldops.entity.TicketUpdate;
import com.fieldops.entity.enums.Status;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** One entry in a ticket's timeline. */
public record UpdateDto(Long id, String clientUpdateId, Status fromStatus, Status toStatus, String note,
                        BigDecimal latitude, BigDecimal longitude, String updatedByName,
                        LocalDateTime deviceTime, LocalDateTime createdAt, List<AttachmentDto> attachments) {

    public static UpdateDto from(TicketUpdate u) {
        return new UpdateDto(u.getId(), u.getClientUpdateId(), u.getFromStatus(), u.getToStatus(), u.getNote(),
                u.getLatitude(), u.getLongitude(), u.getUpdatedBy().getName(),
                u.getDeviceTime(), u.getCreatedAt(),
                u.getAttachments().stream().map(AttachmentDto::from).toList());
    }
}
