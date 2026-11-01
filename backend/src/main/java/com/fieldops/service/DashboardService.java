package com.fieldops.service;

import com.fieldops.dto.response.DashboardDto;
import com.fieldops.entity.enums.Priority;
import com.fieldops.entity.enums.Status;
import com.fieldops.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TicketRepository ticketRepository;

    @Transactional(readOnly = true)
    public DashboardDto summary() {
        List<DashboardDto.TechnicianLoad> technicians = ticketRepository.technicianLoad().stream()
                .map(r -> new DashboardDto.TechnicianLoad((Long) r[0], (String) r[1], (Long) r[2]))
                .toList();

        return new DashboardDto(
                counts(Status.class, ticketRepository.countByStatus()),
                counts(Priority.class, ticketRepository.countByPriority()),
                ticketRepository.countByStatusAndResolvedAtGreaterThanEqual(Status.RESOLVED, LocalDate.now().atStartOfDay()),
                ticketRepository.countByPriorityAndStatusNot(Priority.CRITICAL, Status.RESOLVED),
                technicians);
    }

    // GROUP BY only returns values that have rows. Start every value at 0 so the app always gets all keys, in enum order.
    private static <E extends Enum<E>> Map<E, Long> counts(Class<E> type, List<Object[]> rows) {
        Map<E, Long> map = new EnumMap<>(type);
        for (E value : type.getEnumConstants()) {
            map.put(value, 0L);
        }
        for (Object[] row : rows) {
            map.put(type.cast(row[0]), (Long) row[1]);
        }
        return map;
    }
}
