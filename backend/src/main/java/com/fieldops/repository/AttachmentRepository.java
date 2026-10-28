package com.fieldops.repository;

import com.fieldops.entity.Attachment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {

    // Loads the photo together with its update and ticket, so the access check knows who the ticket belongs to.
    @EntityGraph(attributePaths = {"ticketUpdate", "ticketUpdate.ticket"})
    Optional<Attachment> findWithTicketById(Long id);
}
