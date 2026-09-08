package com.UDSM.BACKEND.Service;

import com.UDSM.BACKEND.Model.User;
import com.UDSM.BACKEND.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        log.info("🔍 Loading user by identifier: {}", identifier);

        // ✅ Try to find by email first (case-insensitive)
        Optional<User> userOptional = userRepository.findByEmail(identifier.toLowerCase());

        // If not found by email, try registration number
        if (userOptional.isEmpty()) {
            log.debug("User not found by email, trying registration number: {}", identifier);
            userOptional = userRepository.findByRegistrationNumber(identifier);
        }

        // If still not found, throw exception
        User user = userOptional.orElseThrow(() -> {
            log.error("❌ User not found with identifier: {}", identifier);
            return new UsernameNotFoundException("User not found with identifier: " + identifier);
        });

        log.info("✅ User found: {} with role: {}", user.getEmail(), user.getRole());

        // Keep the domain user as the principal so projectId is available to every
        // authenticated request and can be carried into a project-scoped query.
        return user;
    }
}