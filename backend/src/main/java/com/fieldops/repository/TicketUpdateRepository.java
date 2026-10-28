package com.fieldops.repository;

import com.fieldops.entity.TicketUpdate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TicketUpdateRepository extends JpaRepository<TicketUpdate, Long> {

    // Used for idempotency: if the phone resends the same update, we find the saved one instead of saving again.
    Optional<TicketUpdate> findByClientUpdateId(String clientUpdateId);
}
