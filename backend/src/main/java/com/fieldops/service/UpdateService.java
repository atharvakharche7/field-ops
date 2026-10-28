package com.fieldops.service;

import com.fieldops.dto.request.TicketUpdateRequest;
import com.fieldops.dto.response.UpdateDto;
import com.fieldops.entity.Attachment;
import com.fieldops.entity.Ticket;
import com.fieldops.entity.TicketUpdate;
import com.fieldops.entity.enums.Status;
import com.fieldops.exception.BadRequestException;
import com.fieldops.exception.ForbiddenException;
import com.fieldops.exception.NotFoundException;
import com.fieldops.repository.AttachmentRepository;
import com.fieldops.repository.TicketUpdateRepository;
import com.fieldops.repository.UserRepository;
import com.fieldops.security.AppUser;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/** Saves a technician's status update with its note, GPS and photos. */
@Service
@RequiredArgsConstructor
public class UpdateService {

    private static final int MAX_PHOTOS = 5;

    private final TicketService ticketService;
    private final TicketUpdateRepository ticketUpdateRepository;
    private final AttachmentRepository attachmentRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    /** created=false means this clientUpdateId was already saved, and dto is that earlier result. */
    public record Result(UpdateDto dto, boolean created) {
    }

    @Transactional
    public Result addUpdate(Long ticketId, TicketUpdateRequest req, List<MultipartFile> photos, AppUser user) {
        // 1. Idempotency. A phone can send an update, lose signal before the reply arrives,
        //    and send it again. Same clientUpdateId = same update, so return the saved one
        //    instead of creating a duplicate row. The app treats 200 and 201 alike.
        Optional<TicketUpdate> existing = ticketUpdateRepository.findByClientUpdateId(req.clientUpdateId());
        if (existing.isPresent()) {
            TicketUpdate saved = existing.get();
            if (!saved.getTicket().getId().equals(ticketId) || !saved.getUpdatedBy().getId().equals(user.getId())) {
                throw new BadRequestException("This clientUpdateId was already used for a different update");
            }
            return new Result(UpdateDto.from(saved), false);
        }

        // 2. Ticket exists (404) and belongs to this technician (403).
        Ticket ticket = ticketService.getAccessible(ticketId, user);
        if (!TicketService.isAssignedTo(ticket, user)) {
            throw new ForbiddenException("Only the assigned technician can update this ticket");
        }

        // 3. Status rule, from Status.canMoveTo. The server checks it again even though
        //    the app only offers valid choices, because an offline update may be stale.
        Status from = ticket.getStatus();
        Status to = req.toStatus();
        if (!from.canMoveTo(to)) {
            throw new BadRequestException("Cannot move ticket from " + from + " to " + to);
        }

        // 4. A closing note is required.
        String note = req.note() == null ? null : req.note().trim();
        if (to == Status.RESOLVED && (note == null || note.isEmpty())) {
            throw new BadRequestException("A note is required when resolving a ticket");
        }

        // 5. Check every photo before saving anything, so one bad file doesn't leave a half-saved update.
        List<MultipartFile> files = photos == null ? List.of() : photos.stream().filter(p -> !p.isEmpty()).toList();
        if (files.size() > MAX_PHOTOS) {
            throw new BadRequestException("At most " + MAX_PHOTOS + " photos per update");
        }
        files.forEach(fileStorageService::validate);

        // 6. Every status change becomes a history row.
        TicketUpdate update = new TicketUpdate();
        update.setTicket(ticket);
        update.setUpdatedBy(userRepository.getReferenceById(user.getId()));
        update.setFromStatus(from);
        update.setToStatus(to);
        update.setNote(note);
        update.setLatitude(req.latitude());
        update.setLongitude(req.longitude());
        update.setClientUpdateId(req.clientUpdateId());
        update.setDeviceTime(req.deviceTime() != null ? req.deviceTime() : LocalDateTime.now());
        update = ticketUpdateRepository.save(update);

        for (MultipartFile file : files) {
            Attachment a = new Attachment();
            a.setTicketUpdate(update);
            a.setFileName(fileStorageService.store(file));
            a.setContentType(file.getContentType());
            a.setSizeBytes(file.getSize());
            update.getAttachments().add(attachmentRepository.save(a));
        }

        ticket.setStatus(to);
        if (to == Status.RESOLVED) {
            ticket.setResolvedAt(LocalDateTime.now());
        }

        // Write now so the response has the server's createdAt, and so a duplicate
        // clientUpdateId from a simultaneous retry fails here (unique column) and not silently later.
        ticketUpdateRepository.flush();
        return new Result(UpdateDto.from(update), true);
    }

    public record Photo(Resource file, String contentType) {
    }

    /** A photo, but only for someone who may see its ticket: supervisors, or the assigned technician. */
    @Transactional(readOnly = true)
    public Photo getPhoto(Long attachmentId, AppUser user) {
        Attachment a = attachmentRepository.findWithTicketById(attachmentId)
                .orElseThrow(() -> new NotFoundException("Photo not found"));
        Ticket ticket = a.getTicketUpdate().getTicket();
        if (!user.isSupervisor() && !TicketService.isAssignedTo(ticket, user)) {
            throw new ForbiddenException("You don't have access to this photo");
        }
        return new Photo(fileStorageService.load(a.getFileName()), a.getContentType());
    }
}
