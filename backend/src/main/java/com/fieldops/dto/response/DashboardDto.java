package com.fieldops.dto.response;

import com.fieldops.entity.enums.Priority;
import com.fieldops.entity.enums.Status;

import java.util.List;
import java.util.Map;

public record DashboardDto(Map<Status, Long> byStatus, Map<Priority, Long> byPriority, long resolvedToday,
                           long openCritical, List<TechnicianLoad> technicians) {

    public record TechnicianLoad(Long id, String name, long activeTickets) {
    }
}
