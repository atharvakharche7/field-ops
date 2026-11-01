package com.fieldops.controller;

import com.fieldops.dto.request.AssignRequest;
import com.fieldops.dto.request.CreateTicketRequest;
import com.fieldops.dto.request.TicketUpdateRequest;
import com.fieldops.dto.response.PageResponse;
import com.fieldops.dto.response.TicketDetailDto;
import com.fieldops.dto.response.TicketSummaryDto;
import com.fieldops.dto.response.UpdateDto;
import com.fieldops.entity.enums.Priority;
import com.fieldops.entity.enums.Status;
import com.fieldops.exception.BadRequestException;
import com.fieldops.security.AppUser;
import com.fieldops.service.TicketService;
import com.fieldops.service.UpdateService;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;
    private final UpdateService updateService;
    private final JsonMapper jsonMapper;
    private final Validator validator;

    // 3. Technician: own tickets only. Supervisor: all.
    @GetMapping
    public PageResponse<TicketSummaryDto> list(@RequestParam(required = false) Status status,
                                               @RequestParam(required = false) Priority priority,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size,
                                               @AuthenticationPrincipal AppUser user) {
        return ticketService.list(user, status, priority, page, size);
    }

    // 4. Detail with site and update history. 403 if a technician opens someone else's ticket.
    @GetMapping("/{id}")
    public TicketDetailDto detail(@PathVariable Long id, @AuthenticationPrincipal AppUser user) {
        return ticketService.detail(id, user);
    }

    /**
     * 5. Change status with a note, GPS and photos, as multipart/form-data:
     * a "data" part with the JSON, and zero or more "photos" parts.
     *
     * "data" is read as plain text and parsed here, so it works whether the phone labels
     * the part application/json or text/plain. React Native's FormData often can't set
     * a JSON content type on a text part, which is the usual cause of 415 errors.
     */
    @PostMapping(value = "/{id}/updates", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('TECHNICIAN')")
    public ResponseEntity<UpdateDto> addUpdate(@PathVariable Long id,
                                               @RequestPart("data") String dataJson,
                                               @RequestPart(value = "photos", required = false) List<MultipartFile> photos,
                                               @AuthenticationPrincipal AppUser user) {
        TicketUpdateRequest data = parseAndValidate(dataJson);
        UpdateService.Result result = updateService.addUpdate(id, data, photos, user);
        // 201 = newly saved; 200 = this clientUpdateId was already saved (a retry). Both mean success.
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK).body(result.dto());
    }

    // 7. Supervisor creates a ticket. ASSIGNED if a technician is given, otherwise OPEN.
    @PostMapping
    @PreAuthorize("hasRole('SUPERVISOR')")
    public ResponseEntity<TicketDetailDto> create(@Valid @RequestBody CreateTicketRequest req,
                                                  @AuthenticationPrincipal AppUser user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.create(req, user));
    }

    // 8. Supervisor assigns or reassigns a ticket.
    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasRole('SUPERVISOR')")
    public TicketDetailDto assign(@PathVariable Long id, @Valid @RequestBody AssignRequest req,
                                  @AuthenticationPrincipal AppUser user) {
        return ticketService.assign(id, req, user);
    }

    private TicketUpdateRequest parseAndValidate(String json) {
        TicketUpdateRequest data;
        try {
            data = jsonMapper.readValue(json, TicketUpdateRequest.class);
        } catch (JacksonException e) {
            throw new BadRequestException("The data part is not valid JSON for an update");
        }
        Set<ConstraintViolation<TicketUpdateRequest>> problems = validator.validate(data);
        if (!problems.isEmpty()) {
            throw new BadRequestException(problems.stream()
                    .map(p -> p.getPropertyPath() + ": " + p.getMessage())
                    .sorted()
                    .collect(Collectors.joining(", ")));
        }
        return data;
    }
}
