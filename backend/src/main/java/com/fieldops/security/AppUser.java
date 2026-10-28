package com.fieldops.security;

import com.fieldops.entity.User;
import com.fieldops.entity.enums.Role;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * The logged-in user as Spring Security sees it. Controllers receive it with
 * {@code @AuthenticationPrincipal AppUser user}. It's a small copy of the User entity,
 * so the entity itself never leaves the service layer.
 */
@Getter
public class AppUser implements UserDetails {

    private final Long id;
    private final String name;
    private final String email;
    private final String passwordHash;
    private final Role role;

    public AppUser(User user) {
        this.id = user.getId();
        this.name = user.getName();
        this.email = user.getEmail();
        this.passwordHash = user.getPasswordHash();
        this.role = user.getRole();
    }

    public boolean isSupervisor() {
        return role == Role.SUPERVISOR;
    }

    // "ROLE_" prefix is what hasRole('SUPERVISOR') looks for.
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }
}
