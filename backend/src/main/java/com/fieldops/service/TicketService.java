package com.fieldops.service;

import com.fieldops.dto.request.AssignRequest;
import com.fieldops.dto.request.CreateTicketRequest;
import com.fieldops.dto.response.PageResponse;
import com.fieldops.dto.response.TicketDetailDto;
import com.fieldops.dto.response.TicketSummaryDto;
import com.fieldops.entity.Site;
import com.fieldops.entity.Ticket;
import com.fieldops.entity.TicketUpdate;
import com.fieldops.entity.User;
import com.fieldops.entity.enums.Priority;
import com.fieldops.entity.enums.Role;
import com.fieldops.entity.enums.Status;
import com.fieldops.exception.BadRequestException;
import com.fieldops.exception.ForbiddenException;
import com.fieldops.exception.NotFoundException;
import com.fieldops.repository.SiteRepository;
import com.fieldops.repository.TicketRepository;
import com.fieldops.repository.TicketUpdateRepository;
import com.fieldops.repository.UserRepository;
import com.fieldops.security.AppUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TicketService {

    private static final int MAX_PAGE_SIZE = 100;

    private final TicketRepository ticketRepository;
    private final TicketUpdateRepository ticketUpdateRepository;
    private final SiteRepository siteRepository;
    private final UserRepository userRepository;

    /** Technicians always get only their own tickets, whatever they ask for. Supervisors get all. */
    @Transactional(readOnly = true)
    public PageResponse<TicketSummaryDto> list(AppUser user, Status status, Priority priority, int page, int size) {
        Long assigneeId = user.isSupervisor() ? null : user.getId();
        var pageable = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE));
        return PageResponse.of(ticketRepository.search(assigneeId, status, priority, pageable), TicketSummaryDto::from);
    }

    @Transactional(readOnly = true)
    public TicketDetailDto detail(Long id, AppUser user) {
        Ticket ticket = getAccessible(id, user);
        return TicketDetailDto.from(ticket, ticketUpdateRepository.findByTicketIdOrderByIdAsc(id));
    }

    /**
     * Loads a ticket and applies the ownership rule: a technician may only touch tickets
     * assigned to them. It's checked here on the server, not just hidden in the app,
     * because anyone with a token could call the API directly. 404 comes before 403,
     * so "doesn't exist" and "not yours" stay distinct.
     */
    public Ticket getAccessible(Long id, AppUser user) {
        Ticket ticket = ticketRepository.findWithSiteAndAssigneeById(id)
                .orElseThrow(() -> new NotFoundException("Ticket " + id + " not found"));
        if (!user.isSupervisor() && !isAssignedTo(ticket, user)) {
            throw new ForbiddenException("This ticket is not assigned to you");
        }
        return ticket;
    }

    public static boolean isAssignedTo(Ticket ticket, AppUser user) {
        return ticket.getAssignedTo() != null && ticket.getAssignedTo().getId().equals(user.getId());
    }

    @Transactional
    public TicketDetailDto create(CreateTicketRequest req, AppUser current) {
        Site site = siteRepository.findById(req.siteId())
                .orElseThrow(() -> new BadRequestException("Site " + req.siteId() + " not found"));
        User creator = userRepository.getReferenceById(current.getId());

        Ticket ticket = new Ticket();
        ticket.setTitle(req.title().trim());
        ticket.setDescription(req.description());
        ticket.setCategory(req.category());
        ticket.setPriority(req.priority());
        ticket.setSite(site);
        ticket.setCreatedBy(creator);
        ticket.setStatus(Status.OPEN);
        ticket = ticketRepository.save(ticket);
        // The id only exists after the first save, so the readable number is set right after.
        ticket.setTicketNo("FO-" + (1000 + ticket.getId()));

        if (req.assignedToId() != null) {
            assignTo(ticket, findTechnician(req.assignedToId()), creator);
        }
        return toDetail(ticket);
    }

    @Transactional
    public TicketDetailDto assign(Long id, AssignRequest req, AppUser current) {
        Ticket ticket = ticketRepository.findWithSiteAndAssigneeById(id)
                .orElseThrow(() -> new NotFoundException("Ticket " + id + " not found"));
        if (ticket.getStatus() == Status.RESOLVED) {
            throw new BadRequestException("A resolved ticket can't be reassigned");
        }
        assignTo(ticket, findTechnician(req.technicianId()), userRepository.getReferenceById(current.getId()));
        return toDetail(ticket);
    }

    /** Sets the technician, moves the ticket to ASSIGNED, and records it in the history. */
    private void assignTo(Ticket ticket, User technician, User by) {
        User previous = ticket.getAssignedTo();
        TicketUpdate history = new TicketUpdate();
        history.setTicket(ticket);
        history.setUpdatedBy(by);
        history.setFromStatus(ticket.getStatus());
        history.setToStatus(Status.ASSIGNED);
        history.setNote(previous == null
                ? "Assigned to " + technician.getName()
                : "Reassigned from " + previous.getName() + " to " + technician.getName());
        history.setDeviceTime(LocalDateTime.now());
        ticketUpdateRepository.save(history);

        ticket.setAssignedTo(technician);
        ticket.setStatus(Status.ASSIGNED);
    }

    private User findTechnician(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User " + userId + " not found"));
        if (user.getRole() != Role.TECHNICIAN) {
            throw new BadRequestException(user.getName() + " is not a technician");
        }
        return user;
    }

    private TicketDetailDto toDetail(Ticket ticket) {
        // Write pending changes now, so the timeline query below sees the new history row.
        ticketRepository.flush();
        return TicketDetailDto.from(ticket, ticketUpdateRepository.findByTicketIdOrderByIdAsc(ticket.getId()));
    }
}
