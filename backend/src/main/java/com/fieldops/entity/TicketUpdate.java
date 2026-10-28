package com.fieldops.entity;

import com.fieldops.entity.enums.Status;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** One row in a ticket's history: who changed it, from what to what, where and when. */
@Entity
@Table(name = "ticket_updates")
@Getter
@Setter
@NoArgsConstructor
public class TicketUpdate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "updated_by", nullable = false)
    private User updatedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", nullable = false, length = 15)
    private Status fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 15)
    private Status toStatus;

    @Column(length = 500)
    private String note;

    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    // UUID made on the phone. Unique, so a retried offline update can't be saved twice.
    @Column(name = "client_update_id", unique = true, length = 36)
    private String clientUpdateId;

    // When it happened on the phone; may be earlier than createdAt if the phone was offline.
    @Column(name = "device_time")
    private LocalDateTime deviceTime;

    // When the server received it.
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "ticketUpdate")
    private List<Attachment> attachments = new ArrayList<>();
}
