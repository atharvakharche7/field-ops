package com.fieldops.repository;

import com.fieldops.entity.TicketUpdate;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TicketUpdateRepository extends JpaRepository<TicketUpdate, Long> {

    // Used for idempotency: if the phone resends the same update, we find the saved one instead of saving again.
    @EntityGraph(attributePaths = {"ticket", "updatedBy", "attachments"})
    Optional<TicketUpdate> findByClientUpdateId(String clientUpdateId);

    // A ticket's timeline, oldest first, with who made each update and its photos in one query.
    @EntityGraph(attributePaths = {"updatedBy", "attachments"})
    List<TicketUpdate> findByTicketIdOrderByIdAsc(Long ticketId);
}
