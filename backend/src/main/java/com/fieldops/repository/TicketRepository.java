package com.fieldops.repository;

import com.fieldops.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

// List, filter and dashboard queries are added with the ticket APIs.
public interface TicketRepository extends JpaRepository<Ticket, Long> {
}
