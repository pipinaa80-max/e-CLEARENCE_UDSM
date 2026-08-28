package com.UDSM.BACKEND.Service;

import com.UDSM.BACKEND.Model.*;
import com.UDSM.BACKEND.Repository.StudentRepository;
import com.UDSM.BACKEND.Repository.UserRepository;
import com.UDSM.BACKEND.config.JwtTokenProvider;
import com.UDSM.BACKEND.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final EmailService emailService;

    // =========================================================
    // LOGIN SECURITY SETTINGS
    // =========================================================

    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final long LOCK_TIME_DURATION = 15 * 60 * 1000L;
    private final Map<String, LoginAttempt> loginAttempts = new ConcurrentHashMap<>();

    // =========================================================
    // LOGIN
    // =========================================================

    @Transactional
    public JwtResponse login(LoginRequest request) {

        if (request == null) {
            throw new IllegalArgumentException("Login request cannot be null");
        }

        if (request.getPassword() == null || request.getPassword().isEmpty()) {
            throw new IllegalArgumentException("Password is required");
        }

        String identifier = request.getIdentifier().trim();

        if (isAccountLocked(identifier)) {
            auditLogService.logLoginAttempt(identifier, false, getClientIp());
            throw new RuntimeException("Account is temporarily locked. Please try again later.");
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(identifier, request.getPassword())
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            User user = findUserByIdentifier(identifier);

            if (!user.isActive()) {
                throw new RuntimeException("Your account is inactive. Please contact the administrator.");
            }

            clearLoginAttempts(identifier);

            String accessToken = tokenProvider.generateToken(authentication);
            String refreshToken = tokenProvider.generateRefreshToken(authentication);

            user.setLastLogin(LocalDateTime.now());
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);

            auditLogService.logLoginAttempt(user.getEmail(), true, getClientIp());

            return JwtResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .tokenType("Bearer")
                    .expiresIn(86400000L)
                    .userId(user.getId())
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .role(user.getRole().name())
                    .build();

        } catch (BadCredentialsException e) {
            recordFailedLogin(identifier);
            auditLogService.logLoginAttempt(identifier, false, getClientIp());
            throw new RuntimeException("Invalid email/registration number or password");
        } catch (Exception e) {
            recordFailedLogin(identifier);
            auditLogService.logLoginAttempt(identifier, false, getClientIp());
            log.error("Login error: {}", e.getMessage());
            throw new RuntimeException("Unable to authenticate user", e);
        }
    }

    // =========================================================
    // REGISTER
    // =========================================================

    @Transactional
    public ApiResponse register(RegisterRequest request) {

        if (request == null) {
            throw new IllegalArgumentException("Registration request cannot be null");
        }

        // Validate email
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }

        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email is already registered");
        }

        // Check registration number
        if (request.getRegistrationNumber() != null && !request.getRegistrationNumber().trim().isEmpty()) {
            String registrationNumber = request.getRegistrationNumber().trim();
            if (userRepository.existsByRegistrationNumber(registrationNumber)) {
                throw new RuntimeException("Registration number already exists");
            }
        }

        // Determine role
        ERole userRole = ERole.STUDENT;
        if (request.getRole() != null) {
            try {
                String roleStr = request.getRole().toUpperCase().replace(" ", "_");
                switch(roleStr) {
                    case "STUDENT": userRole = ERole.STUDENT; break;
                    case "LIBRARY": userRole = ERole.LIBRARY_OFFICER; break;
                    case "FINANCE": userRole = ERole.FINANCE_OFFICER; break;
                    case "ICT": userRole = ERole.ICT_OFFICER; break;
                    case "DEPARTMENT": userRole = ERole.DEPARTMENT_OFFICER; break;
                    case "ADMIN":
                    case "ADMINISTRATOR": userRole = ERole.ADMIN; break;
                    default: userRole = ERole.STUDENT; break;
                }
            } catch (Exception e) {
                userRole = ERole.STUDENT;
            }
        }

        // Build full name
        String fullName = "";
        if (request.getFirstName() != null) {
            fullName = request.getFirstName().trim();
        }
        if (request.getMiddleName() != null && !request.getMiddleName().trim().isEmpty()) {
            fullName += " " + request.getMiddleName().trim();
        }
        if (request.getLastName() != null && !request.getLastName().trim().isEmpty()) {
            fullName += " " + request.getLastName().trim();
        }
        fullName = fullName.trim();

        // Create user
        User user = new User();
        user.setUsername(email);
        user.setEmail(email);
        user.setFullName(fullName);
        user.setFirstName(request.getFirstName());
        user.setMiddleName(request.getMiddleName());
        user.setLastName(request.getLastName());
        user.setRegistrationNumber(request.getRegistrationNumber());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(userRole);
        user.setActive(true);
        user.setPhoneNumber(request.getPhone());
        user.setDepartment(request.getDepartment());
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        User savedUser = userRepository.save(user);
        String userId = savedUser.getId();

        // Create student record
        if (request.getRegistrationNumber() != null && !request.getRegistrationNumber().trim().isEmpty()) {
            Student student = new Student();
            student.setRegistrationNumber(request.getRegistrationNumber());
            student.setFullName(fullName);
            student.setEmail(email);
            student.setPhoneNumber(request.getPhone());
            student.setProgramme(request.getProgramme());
            student.setFaculty(request.getFaculty());
            student.setDepartment(request.getDepartment());
            student.setYearOfStudy(request.getYearOfStudy());
            student.setAcademicYear(request.getAcademicYear());
            student.setUser(savedUser);
            student.setFinalYear("Final Year".equalsIgnoreCase(request.getYearOfStudy()));
            student.setClearanceStatus(ClearanceStatus.PENDING);
            student.setCreatedAt(LocalDateTime.now());
            student.setUpdatedAt(LocalDateTime.now());
            studentRepository.save(student);
        }

        // Audit log
        try {
            auditLogService.logAction(userId, "REGISTER", "User registered: " + email, "SUCCESS");
        } catch (Exception e) {
            log.error("Failed to log audit: {}", e.getMessage());
        }

        // Welcome email
        try {
            emailService.sendWelcomeEmail(email, fullName, "SmartClearance UDSM");
        } catch (Exception e) {
            log.error("Failed to send welcome email: {}", e.getMessage());
        }

        return ApiResponse.success("Registration successful. Please login to continue.");
    }

    // =========================================================
    // REFRESH TOKEN
    // =========================================================

    @Transactional
    public JwtResponse refreshToken(String refreshToken) {

        if (refreshToken == null || refreshToken.trim().isEmpty()) {
            throw new IllegalArgumentException("Refresh token is required");
        }

        if (!tokenProvider.validateToken(refreshToken)) {
            throw new RuntimeException("Invalid refresh token");
        }

        String email = tokenProvider.getUsernameFromToken(refreshToken);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.isActive()) {
            throw new RuntimeException("User account is inactive");
        }

        Authentication authentication = new UsernamePasswordAuthenticationToken(
                user.getEmail(),
                null,
                user.getAuthorities()
        );

        String newAccessToken = tokenProvider.generateToken(authentication);
        String newRefreshToken = tokenProvider.generateRefreshToken(authentication);

        return JwtResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .tokenType("Bearer")
                .expiresIn(86400000L)
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .build();
    }

    // =========================================================
    // LOGOUT
    // =========================================================

    public ApiResponse logout() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ApiResponse.success("Already logged out");
        }

        String username = authentication.getName();
        try {
            User user = findUserByIdentifier(username);
            if (user != null) {
                auditLogService.logLogout(user.getId(), username);
            }
        } catch (Exception ignored) {}

        SecurityContextHolder.clearContext();
        return ApiResponse.success("Logged out successfully");
    }

    // =========================================================
    // CHANGE PASSWORD
    // =========================================================

    @Transactional
    public ApiResponse changePassword(ChangePasswordRequest request) {
        User user = getCurrentUser();

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            auditLogService.logAction(user.getId(), "CHANGE_PASSWORD", "Failed password change attempt", "FAILED");
            throw new RuntimeException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        auditLogService.logAction(user.getId(), "CHANGE_PASSWORD", "Password changed successfully", "SUCCESS");
        notificationService.sendNotification(user, "Password Changed", "Your password has been changed successfully.", NotificationType.SYSTEM);

        return ApiResponse.success("Password changed successfully");
    }

    // =========================================================
    // RESET PASSWORD REQUEST
    // =========================================================

    @Transactional
    public ApiResponse resetPassword(String email) {
        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));

        String resetToken = UUID.randomUUID().toString();
        String resetLink = getResetPasswordLink(resetToken);

        emailService.sendPasswordResetEmail(user.getEmail(), resetLink);

        auditLogService.logAction(user.getId(), "PASSWORD_RESET", "Password reset requested", "SUCCESS");

        return ApiResponse.success("Password reset link sent to your email");
    }

    // =========================================================
    // RESET PASSWORD WITH TOKEN
    // =========================================================

    public ApiResponse resetPasswordWithToken(String token, String newPassword) {
        return ApiResponse.success("Password reset successfully");
    }

    // =========================================================
    // GET CURRENT USER PROFILE
    // =========================================================

    public UserProfileResponse getCurrentUserProfile() {
        User user = getCurrentUser();
        return mapToUserProfileResponse(user);
    }

    // =========================================================
    // GET USER PROFILE
    // =========================================================

    public UserProfileResponse getUserProfile(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return mapToUserProfileResponse(user);
    }

    // =========================================================
    // UPDATE PROFILE
    // =========================================================

    @Transactional
    public UserProfileResponse updateProfile(ProfileUpdateRequest request) {
        log.info("📝 Updating profile with request: {}", request);

        User user = getCurrentUser();
        boolean updated = false;

        // Update first name
        if (request.getFirstName() != null && !request.getFirstName().isEmpty()) {
            user.setFirstName(request.getFirstName());
            updated = true;
        }

        // Update last name
        if (request.getLastName() != null && !request.getLastName().isEmpty()) {
            user.setLastName(request.getLastName());
            updated = true;
        }

        // Update middle name
        if (request.getMiddleName() != null && !request.getMiddleName().isEmpty()) {
            user.setMiddleName(request.getMiddleName());
            updated = true;
        }

        // Update full name if provided, or build it from parts
        if (request.getFullName() != null && !request.getFullName().isEmpty()) {
            user.setFullName(request.getFullName());
            updated = true;
        } else if (request.getFirstName() != null || request.getLastName() != null) {
            // Build full name from parts
            String fullName = "";
            if (user.getFirstName() != null) {
                fullName = user.getFirstName();
            }
            if (user.getMiddleName() != null && !user.getMiddleName().isEmpty()) {
                fullName += " " + user.getMiddleName();
            }
            if (user.getLastName() != null) {
                fullName += " " + user.getLastName();
            }
            user.setFullName(fullName.trim());
            updated = true;
        }

        // Update phone number
        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isEmpty()) {
            user.setPhoneNumber(request.getPhoneNumber());
            updated = true;
        }

        // Update department
        if (request.getDepartment() != null && !request.getDepartment().isEmpty()) {
            user.setDepartment(request.getDepartment());
            updated = true;
        }

        // Update registration number
        if (request.getRegistrationNumber() != null && !request.getRegistrationNumber().isEmpty()) {
            // Check if registration number is already taken by another user
            userRepository.findByRegistrationNumber(request.getRegistrationNumber())
                    .ifPresent(existingUser -> {
                        if (!existingUser.getId().equals(user.getId())) {
                            throw new RuntimeException("Registration number is already taken");
                        }
                    });
            user.setRegistrationNumber(request.getRegistrationNumber());
            updated = true;
        }

        // Update college
        if (request.getCollege() != null && !request.getCollege().isEmpty()) {
            user.setCollege(request.getCollege());
            updated = true;
        }

        // Update programme
        if (request.getProgramme() != null && !request.getProgramme().isEmpty()) {
            user.setProgramme(request.getProgramme());
            updated = true;
        }

        // Update hall
        if (request.getHall() != null && !request.getHall().isEmpty()) {
            user.setHall(request.getHall());
            updated = true;
        }

        // Update room number
        if (request.getRoomNumber() != null && !request.getRoomNumber().isEmpty()) {
            user.setRoomNumber(request.getRoomNumber());
            updated = true;
        }

        // Update sponsor
        if (request.getSponsor() != null && !request.getSponsor().isEmpty()) {
            user.setSponsor(request.getSponsor());
            updated = true;
        }

        // Update photo
        if (request.getPhoto() != null && !request.getPhoto().isEmpty()) {
            user.setPhoto(request.getPhoto());
            updated = true;
        }

        // Update academic year
        if (request.getAcademicYear() != null && !request.getAcademicYear().isEmpty()) {
            user.setAcademicYear(request.getAcademicYear());
            updated = true;
        }

        // Update graduation year
        if (request.getGraduationYear() != null && !request.getGraduationYear().isEmpty()) {
            user.setGraduationYear(request.getGraduationYear());
            updated = true;
        }

        // Update semester
        if (request.getSemester() != null && !request.getSemester().isEmpty()) {
            user.setSemester(request.getSemester());
            updated = true;
        }

        // Update email
        if (request.getEmail() != null && !request.getEmail().isEmpty()) {
            String newEmail = request.getEmail().trim().toLowerCase();
            if (!newEmail.equals(user.getEmail())) {
                if (userRepository.existsByEmail(newEmail)) {
                    throw new RuntimeException("Email is already taken");
                }
                user.setEmail(newEmail);
                user.setUsername(newEmail);
                updated = true;
            }
        }

        // Update password
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            updated = true;
        }

        if (updated) {
            user.setUpdatedAt(LocalDateTime.now());
            User savedUser = userRepository.save(user);
            log.info("✅ Profile updated successfully for user: {}", savedUser.getEmail());

            // Update student record if exists
            if (user.getRegistrationNumber() != null) {
                studentRepository.findByRegistrationNumber(user.getRegistrationNumber())
                        .ifPresent(student -> {
                            student.setFullName(user.getFullName());
                            student.setPhoneNumber(user.getPhoneNumber());
                            student.setProgramme(user.getProgramme());
                            student.setFaculty(user.getCollege());
                            student.setDepartment(user.getDepartment());
                            student.setAcademicYear(user.getAcademicYear());
                            student.setUpdatedAt(LocalDateTime.now());
                            studentRepository.save(student);
                        });
            }

            auditLogService.logAction(
                    user.getId(),
                    "UPDATE_PROFILE",
                    "Profile updated successfully",
                    "SUCCESS"
            );

            return mapToUserProfileResponse(savedUser);
        } else {
            log.warn("⚠️ No fields to update for user: {}", user.getEmail());
            return mapToUserProfileResponse(user);
        }
    }

    // =========================================================
    // ACTIVATE ACCOUNT
    // =========================================================

    @Transactional
    public ApiResponse activateAccount(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setActive(true);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        auditLogService.logAction(
                getCurrentUserId(),
                "ACTIVATE_ACCOUNT",
                "Account activated for: " + user.getEmail(),
                "SUCCESS"
        );

        notificationService.sendNotification(
                user,
                "Account Activated",
                "Your account has been activated. You can now login to SmartClearance UDSM.",
                NotificationType.SYSTEM
        );

        return ApiResponse.success("Account activated successfully");
    }

    // =========================================================
    // DEACTIVATE ACCOUNT
    // =========================================================

    @Transactional
    public ApiResponse deactivateAccount(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setActive(false);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        auditLogService.logAction(
                getCurrentUserId(),
                "DEACTIVATE_ACCOUNT",
                "Account deactivated for: " + user.getEmail(),
                "SUCCESS"
        );

        return ApiResponse.success("Account deactivated successfully");
    }

    // =========================================================
    // HELPER METHODS
    // =========================================================

    private User findUserByIdentifier(String identifier) {
        if (identifier == null || identifier.trim().isEmpty()) {
            log.error("❌ Identifier is null or empty");
            throw new RuntimeException("Identifier cannot be null or empty");
        }

        String value = identifier.trim();
        log.debug("🔍 Finding user by identifier: {}", value);

        // Try email first (case insensitive)
        return userRepository.findByEmail(value.toLowerCase())
                .or(() -> {
                    log.debug("🔍 User not found by email, trying registration number: {}", value);
                    return userRepository.findByRegistrationNumber(value);
                })
                .orElseThrow(() -> {
                    log.error("❌ User not found with identifier: {}", value);
                    return new RuntimeException("User not found with identifier: " + value);
                });
    }

    private void recordFailedLogin(String identifier) {
        LoginAttempt attempt = loginAttempts.computeIfAbsent(identifier, key -> new LoginAttempt());
        attempt.incrementAttempts();
        attempt.setLastAttemptTime(System.currentTimeMillis());
        if (attempt.getAttempts() >= MAX_LOGIN_ATTEMPTS) {
            attempt.setLocked(true);
            attempt.setLockTime(System.currentTimeMillis());
            log.warn("🔒 Account locked for identifier: {}", identifier);
        }
    }

    private boolean isAccountLocked(String identifier) {
        LoginAttempt attempt = loginAttempts.get(identifier);
        if (attempt == null || !attempt.isLocked()) {
            return false;
        }
        long lockDuration = System.currentTimeMillis() - attempt.getLockTime();
        if (lockDuration >= LOCK_TIME_DURATION) {
            clearLoginAttempts(identifier);
            return false;
        }
        return true;
    }

    private void clearLoginAttempts(String identifier) {
        loginAttempts.remove(identifier);
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        //  Better check for authentication
        if (authentication == null ||
                !authentication.isAuthenticated() ||
                "anonymousUser".equals(authentication.getPrincipal())) {
            log.error(" No authenticated user found in SecurityContext");
            throw new RuntimeException("User not authenticated. Please login first.");
        }

        String identifier = authentication.getName();
        log.info("Getting current user: {}", identifier);

        return findUserByIdentifier(identifier);
    }
    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("User not authenticated");
        }
        return authentication.getName();
    }

    private String getCurrentUserId() {
        User user = getCurrentUser();
        return user.getId();
    }

    private String getClientIp() {
        return "0.0.0.0";
    }

    private String getResetPasswordLink(String token) {
        return "http://localhost:4200/reset-password?token=" + token;
    }

    private UserProfileResponse mapToUserProfileResponse(User user) {
        // Try to find student by registration number
        Student student = null;
        if (user.getRegistrationNumber() != null && !user.getRegistrationNumber().isEmpty()) {
            student = studentRepository.findByRegistrationNumber(user.getRegistrationNumber()).orElse(null);
        }

        return UserProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .middleName(user.getMiddleName())
                .registrationNumber(user.getRegistrationNumber())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .isActive(user.isActive())
                .phoneNumber(user.getPhoneNumber())
                .department(user.getDepartment())
                .college(user.getCollege())
                .programme(user.getProgramme())
                .hall(user.getHall())
                .roomNumber(user.getRoomNumber())
                .sponsor(user.getSponsor())
                .photo(user.getPhoto())
                .academicYear(user.getAcademicYear())
                .graduationYear(user.getGraduationYear())
                .semester(user.getSemester())
                .lastLogin(user.getLastLogin())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .clearanceStatus(student != null ? student.getClearanceStatus() : null)
                .isFinalYear(student != null ? student.isFinalYear() : false)
                .build();
    }

    // =========================================================
    // LOGIN ATTEMPT CLASS
    // =========================================================

    private static class LoginAttempt {
        private int attempts = 0;
        private long lastAttemptTime = 0L;
        private boolean locked = false;
        private long lockTime = 0L;

        public void incrementAttempts() {
            this.attempts++;
        }

        public int getAttempts() {
            return attempts;
        }

        public void setLastAttemptTime(long lastAttemptTime) {
            this.lastAttemptTime = lastAttemptTime;
        }

        public long getLastAttemptTime() {
            return lastAttemptTime;
        }

        public boolean isLocked() {
            return locked;
        }

        public void setLocked(boolean locked) {
            this.locked = locked;
        }

        public long getLockTime() {
            return lockTime;
        }

        public void setLockTime(long lockTime) {
            this.lockTime = lockTime;
        }
    }
}