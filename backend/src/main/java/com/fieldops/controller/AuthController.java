package com.fieldops.controller;

import com.fieldops.dto.request.LoginRequest;
import com.fieldops.dto.response.LoginResponse;
import com.fieldops.dto.response.UserDto;
import com.fieldops.security.AppUser;
import com.fieldops.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // Public: the only endpoint that works without a token.
    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    // Any logged-in user: returns who the token belongs to. The app calls it on startup.
    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal AppUser user) {
        return authService.me(user);
    }
}
