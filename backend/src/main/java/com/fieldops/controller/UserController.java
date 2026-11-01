package com.fieldops.controller;

import com.fieldops.dto.response.UserDto;
import com.fieldops.entity.enums.Role;
import com.fieldops.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPERVISOR')")
public class UserController {

    private final UserRepository userRepository;

    // 10. Technician dropdown on the Create Ticket form: GET /api/users?role=TECHNICIAN
    @GetMapping
    public List<UserDto> list(@RequestParam(defaultValue = "TECHNICIAN") Role role) {
        return userRepository.findByRoleOrderByNameAsc(role).stream().map(UserDto::from).toList();
    }
}
