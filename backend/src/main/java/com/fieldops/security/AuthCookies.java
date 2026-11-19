package com.fieldops.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Builds the cookie that carries the login token. The browser stores it and sends it
 * back automatically on every request to our site, so the website's JavaScript never
 * touches the token.
 */
@Component
public class AuthCookies {

    public static final String NAME = "fieldops_token";

    private final boolean secure;
    private final Duration maxAge;

    public AuthCookies(@Value("${app.cookie.secure}") boolean secure,
                       @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.secure = secure;
        this.maxAge = Duration.ofMillis(expirationMs); // cookie lives exactly as long as the token
    }

    /** Set-Cookie value for a fresh login. */
    public ResponseCookie login(String token) {
        return base(token).maxAge(maxAge).build();
    }

    /** Set-Cookie value that deletes the cookie: same name and path, empty value, Max-Age=0. */
    public ResponseCookie logout() {
        return base("").maxAge(0).build();
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)      // page scripts can't read it, so an XSS bug can't steal it
                .secure(secure)      // HTTPS only in production
                .sameSite("Strict")  // never sent on requests started by another site: blocks CSRF
                .path("/");          // sent with every request to this site
    }
}
