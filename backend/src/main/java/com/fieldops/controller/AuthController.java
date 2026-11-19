package com.fieldops.controller;

import com.fieldops.dto.request.LoginRequest;
import com.fieldops.dto.response.LoginResponse;
import com.fieldops.dto.response.UserDto;
import com.fieldops.security.AppUser;
import com.fieldops.security.AuthCookies;
import com.fieldops.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuthCookies authCookies;

    // 1. Public. Checks the password, puts the token in an httpOnly cookie and returns the user.
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthService.LoginResult result = authService.login(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authCookies.login(result.token()).toString())
                .body(result.body());
    }

    // 2. Any logged-in user: returns who the cookie (or Bearer token) belongs to. The site calls it on start.
    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal AppUser user) {
        return authService.me(user);
    }

    // 11. Public, so logging out works even with an expired token. Tells the browser to delete the cookie.
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, authCookies.logout().toString())
                .build();
    }
}
