package com.fieldops.controller;

import com.fieldops.dto.response.DashboardDto;
import com.fieldops.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPERVISOR')") // on the class, so it covers every method here
public class DashboardController {

    private final DashboardService dashboardService;

    // 9. Counts for the supervisor dashboard.
    @GetMapping("/summary")
    public DashboardDto summary() {
        return dashboardService.summary();
    }
}
