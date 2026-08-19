package com.UDSM.BACKEND.Service;

import java.util.List;

import com.UDSM.BACKEND.Model.User;
import com.UDSM.BACKEND.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        log.info("🔍 Loading user by identifier: {}", identifier);

        // ✅ SIMPLE: Only search by email or registration number
        User user = userRepository.findByEmail(identifier)
                .or(() -> userRepository.findByRegistrationNumber(identifier))
                .orElseThrow(() -> {
                    log.error("❌ User not found with identifier: {}", identifier);
                    return new UsernameNotFoundException("User not found with identifier: " + identifier);
                });

        log.info("✅ User found: {} with role: {}", user.getEmail(), user.getRole());

        // ✅ Return Spring Security User with authorities
        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),  // username
                user.getPassword(),  // password
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }
}