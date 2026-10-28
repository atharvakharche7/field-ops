package com.fieldops.security;

import com.fieldops.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/** Tells Spring Security how to find a user: by email, in our users table. */
@Service
@RequiredArgsConstructor
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public AppUser loadUserByUsername(String email) {
        return userRepository.findByEmail(email)
                .map(AppUser::new)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
