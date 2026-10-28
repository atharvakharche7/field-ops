package com.fieldops.controller;

import com.fieldops.dto.response.SiteDto;
import com.fieldops.repository.SiteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/sites")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPERVISOR')")
public class SiteController {

    private final SiteRepository siteRepository;

    // 10. Site dropdown on the Create Ticket form.
    @GetMapping
    public List<SiteDto> list() {
        return siteRepository.findAllByOrderByCodeAsc().stream().map(SiteDto::from).toList();
    }
}
