package com.fieldops.security;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Runs once on every request. It looks for the token in the "Authorization: Bearer <token>"
 * header first (Postman, tests), then in the fieldops_token cookie (the website). If the token
 * is valid, it marks the request as logged in as that user. If not, it does nothing, and
 * SecurityConfig turns away requests to protected URLs with a 401.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String BEARER = "Bearer ";

    private final JwtService jwtService;
    private final AppUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = findToken(request);

        if (token != null) {
            try {
                String email = jwtService.extractEmail(token);
                // Load from the database each time, so a deleted user's old token stops working.
                AppUser user = userDetailsService.loadUserByUsername(email);
                var auth = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (JwtException | IllegalArgumentException | UsernameNotFoundException e) {
                // Bad or expired token: stay anonymous and let the security rules answer 401.
                SecurityContextHolder.clearContext();
            }
        }

        chain.doFilter(request, response);
    }

    private String findToken(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER)) {
            return header.substring(BEARER.length());
        }
        Cookie[] cookies = request.getCookies(); // null when the request has no cookies at all
        if (cookies != null) {
            for (Cookie c : cookies) {
                if (AuthCookies.NAME.equals(c.getName()) && !c.getValue().isBlank()) {
                    return c.getValue();
                }
            }
        }
        return null;
    }
}
