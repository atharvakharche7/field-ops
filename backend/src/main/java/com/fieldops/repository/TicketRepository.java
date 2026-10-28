package com.fieldops.repository;

import com.fieldops.entity.Ticket;
import com.fieldops.entity.enums.Priority;
import com.fieldops.entity.enums.Status;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    /**
     * Ticket list with optional filters. A null parameter means "don't filter on it",
     * so one query serves both roles: technicians pass their own id, supervisors pass null.
     *
     * Priority is stored as text, and alphabetical order would put LOW before MEDIUM,
     * so the CASE turns it into a number: CRITICAL first, then oldest first.
     *
     * The @EntityGraph loads each ticket's site and technician in the same SQL query.
     * Without it, showing 20 cards would run 1 query for the list plus up to 40 more,
     * one per site and per technician: the "N+1 query problem".
     */
    @EntityGraph(attributePaths = {"site", "assignedTo"})
    @Query(value = """
            SELECT t FROM Ticket t
            WHERE (:assigneeId IS NULL OR t.assignedTo.id = :assigneeId)
              AND (:status IS NULL OR t.status = :status)
              AND (:priority IS NULL OR t.priority = :priority)
            ORDER BY CASE t.priority
                       WHEN com.fieldops.entity.enums.Priority.CRITICAL THEN 0
                       WHEN com.fieldops.entity.enums.Priority.HIGH THEN 1
                       WHEN com.fieldops.entity.enums.Priority.MEDIUM THEN 2
                       ELSE 3
                     END,
                     t.createdAt ASC, t.id ASC
            """,
            countQuery = """
            SELECT COUNT(t) FROM Ticket t
            WHERE (:assigneeId IS NULL OR t.assignedTo.id = :assigneeId)
              AND (:status IS NULL OR t.status = :status)
              AND (:priority IS NULL OR t.priority = :priority)
            """)
    Page<Ticket> search(@Param("assigneeId") Long assigneeId,
                        @Param("status") Status status,
                        @Param("priority") Priority priority,
                        Pageable pageable);

    // "findWithSiteAndAssigneeById" is a normal findById; the words in the middle are just a label.
    @EntityGraph(attributePaths = {"site", "assignedTo"})
    Optional<Ticket> findWithSiteAndAssigneeById(Long id);

    // Dashboard counts run in MySQL with GROUP BY, instead of loading every ticket into memory.
    @Query("SELECT t.status, COUNT(t) FROM Ticket t GROUP BY t.status")
    List<Object[]> countByStatus();

    @Query("SELECT t.priority, COUNT(t) FROM Ticket t GROUP BY t.priority")
    List<Object[]> countByPriority();

    long countByStatusAndResolvedAtGreaterThanEqual(Status status, LocalDateTime since);

    long countByPriorityAndStatusNot(Priority priority, Status status);

    /** Active (ASSIGNED or IN_PROGRESS) tickets per technician. LEFT JOIN keeps technicians with 0 tickets. */
    @Query("""
            SELECT u.id, u.name, COUNT(t)
            FROM User u
            LEFT JOIN Ticket t ON t.assignedTo = u
                 AND t.status IN (com.fieldops.entity.enums.Status.ASSIGNED, com.fieldops.entity.enums.Status.IN_PROGRESS)
            WHERE u.role = com.fieldops.entity.enums.Role.TECHNICIAN
            GROUP BY u.id, u.name
            ORDER BY u.name
            """)
    List<Object[]> technicianLoad();
}
