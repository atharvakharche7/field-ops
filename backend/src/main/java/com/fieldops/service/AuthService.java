package com.fieldops.service;

import com.fieldops.dto.request.LoginRequest;
import com.fieldops.dto.response.LoginResponse;
import com.fieldops.dto.response.UserDto;
import com.fieldops.repository.UserRepository;
import com.fieldops.exception.NotFoundException;
import com.fieldops.security.AppUser;
import com.fieldops.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    /**
     * Checks the email and password against the BCrypt hash. A wrong email and a wrong
     * password both throw BadCredentialsException, which becomes the same 401 message,
     * so nobody can use the login form to find out which emails exist.
     */
    public LoginResponse login(LoginRequest request) {
        var auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        AppUser user = (AppUser) auth.getPrincipal();
        return new LoginResponse(jwtService.generateToken(user), toDto(user));
    }

    @Transactional(readOnly = true)
    public UserDto me(AppUser current) {
        return userRepository.findById(current.getId())
                .map(UserDto::from)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    private UserDto toDto(AppUser user) {
        return new UserDto(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }
}
