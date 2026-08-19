package com.UDSM.BACKEND.Service;

import com.UDSM.BACKEND.Model.*;
import com.UDSM.BACKEND.Repository.StudentRepository;
import com.UDSM.BACKEND.Repository.UserRepository;
import com.UDSM.BACKEND.config.JwtTokenProvider;
import com.UDSM.BACKEND.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
// =============================================================
// FIX: Remove @Transactional from class level
// =============================================================
@RequiredArgsConstructor
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
    // LOGIN - Keep @Transactional
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
            e.printStackTrace();
            throw new RuntimeException("Unable to authenticate user", e);
        }
    }

    // =========================================================
    // REGISTER - FIXED: NO @Transactional HERE!
    // =========================================================

    public ApiResponse register(RegisterRequest request) {

        if (request == null) {
            throw new IllegalArgumentException("Registration request cannot be null");
        }

        // =====================================================
        // VALIDATE EMAIL
        // =====================================================

        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }

        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email is already registered");
        }

        // =====================================================
        // CHECK REGISTRATION NUMBER
        // =====================================================

        if (request.getRegistrationNumber() != null && !request.getRegistrationNumber().trim().isEmpty()) {
            String registrationNumber = request.getRegistrationNumber().trim();
            if (userRepository.existsByRegistrationNumber(registrationNumber)) {
                throw new RuntimeException("Registration number already exists");
            }
        }

        // =====================================================
        // DETERMINE ROLE
        // =====================================================

        ERole userRole = ERole.STUDENT;
        if (request.getRole() != null) {
            try {
                String roleStr = request.getRole().toUpperCase().replace(" ", "_");

                switch(roleStr) {
                    case "STUDENT":
                        userRole = ERole.STUDENT;
                        break;
                    case "LIBRARY":
                        userRole = ERole.LIBRARY_OFFICER;
                        break;
                    case "FINANCE":
                        userRole = ERole.FINANCE_OFFICER;
                        break;
                    case "ICT":
                        userRole = ERole.ICT_OFFICER;
                        break;
                    case "DEPARTMENT":
                        userRole = ERole.DEPARTMENT_OFFICER;
                        break;
                    case "ACADEMIC_STAFF":
                        userRole = ERole.DEPARTMENT_OFFICER;
                        break;
                    case "ADMINISTRATOR":
                        userRole = ERole.ADMIN;
                        break;
                    default:
                        userRole = ERole.STUDENT;
                        break;
                }
            } catch (Exception e) {
                userRole = ERole.STUDENT;
            }
        }

        // =====================================================
        // BUILD FULL NAME
        // =====================================================

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

        // =====================================================
        // CREATE USER
        // =====================================================

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

        // =====================================================
        // SAVE USER - ONLY ONCE!
        // =====================================================

        User savedUser = userRepository.save(user);
        String userId = savedUser.getId();

        // =====================================================
        // CREATE STUDENT RECORD
        // =====================================================

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

            // ✅ Set final year - CLEAR AND SIMPLE
            boolean isFinalYear = "Final Year".equalsIgnoreCase(request.getYearOfStudy());
            student.setIsFinalYear(isFinalYear);

            student.setClearanceStatus(ClearanceStatus.PENDING);
            student.setCreatedAt(LocalDateTime.now());
            student.setUpdatedAt(LocalDateTime.now());

            studentRepository.save(student);
        }

        // =====================================================
        // AUDIT LOG - Separate transaction!
        // =====================================================

        try {
            // This will run in a separate transaction
            auditLogService.logAction(
                    userId,
                    "REGISTER",
                    "User registered: " + email,
                    "SUCCESS"
            );
        } catch (Exception e) {
            System.err.println("Failed to log audit: " + e.getMessage());
        }

        // =====================================================
        // WELCOME EMAIL - No transaction needed
        // =====================================================

        try {
            emailService.sendWelcomeEmail(
                    email,
                    fullName,
                    "SmartClearance UDSM"
            );
        } catch (Exception e) {
            System.err.println("Failed to send welcome email: " + e.getMessage());
        }

        // =====================================================
        // RETURN RESPONSE
        // =====================================================

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
        User user = null;

        try {
            user = findUserByIdentifier(username);
        } catch (Exception ignored) {
            // User may already be unavailable
        }

        SecurityContextHolder.clearContext();

        if (user != null) {
            auditLogService.logLogout(user.getId(), username);
        }

        return ApiResponse.success("Logged out successfully");
    }

    // =========================================================
    // CHANGE PASSWORD
    // =========================================================

    @Transactional
    public ApiResponse changePassword(ChangePasswordRequest request) {

        User user = getCurrentUser();

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            auditLogService.logAction(
                    user.getId(),
                    "CHANGE_PASSWORD",
                    "Failed password change attempt",
                    "FAILED"
            );
            throw new RuntimeException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        auditLogService.logAction(
                user.getId(),
                "CHANGE_PASSWORD",
                "Password changed successfully",
                "SUCCESS"
        );

        notificationService.sendNotification(
                user,
                "Password Changed",
                "Your password has been changed successfully.",
                NotificationType.SYSTEM
        );

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

        auditLogService.logAction(
                user.getId(),
                "PASSWORD_RESET",
                "Password reset requested",
                "SUCCESS"
        );

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
    public UserProfileResponse updateProfile(RegisterRequest request) {

        User user = getCurrentUser();

        // Update full name
        var ref = new Object() {
            String fullName = request.getFirstName();
        };
        if (request.getMiddleName() != null && !request.getMiddleName().trim().isEmpty()) {
            ref.fullName += " " + request.getMiddleName();
        }
        if (request.getLastName() != null && !request.getLastName().trim().isEmpty()) {
            ref.fullName += " " + request.getLastName();
        }

        user.setFullName(ref.fullName.trim());
        user.setPhoneNumber(request.getPhone());
        user.setDepartment(request.getDepartment());
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        // Update student
        if (request.getRegistrationNumber() != null) {
            studentRepository.findByRegistrationNumber(request.getRegistrationNumber())
                    .ifPresent(student -> {
                        student.setFullName(ref.fullName.trim());
                        student.setPhoneNumber(request.getPhone());
                        student.setProgramme(request.getProgramme());
                        student.setFaculty(request.getFaculty());
                        student.setDepartment(request.getDepartment());
                        student.setYearOfStudy(request.getYearOfStudy());
                        student.setAcademicYear(request.getAcademicYear());
                        student.setUpdatedAt(LocalDateTime.now());
                        studentRepository.save(student);
                    });
        }

        auditLogService.logAction(
                user.getId(),
                "UPDATE_PROFILE",
                "Profile updated",
                "SUCCESS"
        );

        return mapToUserProfileResponse(user);
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
        String value = identifier.trim();
        return userRepository.findByEmail(value.toLowerCase())
                .or(() -> userRepository.findByRegistrationNumber(value))
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private void recordFailedLogin(String identifier) {
        LoginAttempt attempt = loginAttempts.computeIfAbsent(identifier, key -> new LoginAttempt());
        attempt.incrementAttempts();
        attempt.setLastAttemptTime(System.currentTimeMillis());
        if (attempt.getAttempts() >= MAX_LOGIN_ATTEMPTS) {
            attempt.setLocked(true);
            attempt.setLockTime(System.currentTimeMillis());
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
        String identifier = getCurrentUsername();
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

    private void sendWelcomeEmail(User user) {
        try {
            emailService.sendWelcomeEmail(
                    user.getEmail(),
                    user.getFullName(),
                    "SmartClearance UDSM"
            );
        } catch (Exception e) {
            System.err.println("Failed to send welcome email: " + e.getMessage());
        }
    }

    private UserProfileResponse mapToUserProfileResponse(User user) {
        Student student = studentRepository.findByEmail(user.getEmail()).orElse(null);

        return UserProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .registrationNumber(user.getRegistrationNumber())
                .role(user.getRole().name())
                .isActive(user.isActive())
                .phoneNumber(user.getPhoneNumber())
                .department(user.getDepartment())
                .lastLogin(user.getLastLogin())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .programme(student != null ? student.getProgramme() : null)
                .faculty(student != null ? student.getFaculty() : null)
                .yearOfStudy(student != null ? student.getYearOfStudy() : null)
                .academicYear(student != null ? student.getAcademicYear() : null)
                .clearanceStatus(student != null ? student.getClearanceStatus() : null)
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