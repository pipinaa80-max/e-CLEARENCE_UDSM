package com.UDSM.BACKEND.Service;

import com.UDSM.BACKEND.Model.ERole;
import com.UDSM.BACKEND.Model.ProjectSetting;
import com.UDSM.BACKEND.Model.User;
import com.UDSM.BACKEND.Repository.ProjectSettingRepository;
import com.UDSM.BACKEND.Repository.UserRepository;
import com.UDSM.BACKEND.config.ProjectScope;
import com.UDSM.BACKEND.config.JwtTokenProvider;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ControlPlaneService {
    private final UserRepository userRepository;
    private final ProjectSettingRepository projectSettingRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${control-plane.superuser.email:superuser@admin.local}")
    private String configuredSuperuserEmail;

    @Value("${control-plane.superuser.password:ChangeMeImmediately!2026}")
    private String configuredSuperuserPassword;

    @Transactional
    public Map<String, Object> login(String email, String password) {
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
        User user = userRepository.findByEmail(normalizedEmail).orElse(null);
        if (user == null && normalizedEmail.equals(configuredSuperuserEmail.toLowerCase())) {
            user = new User();
            user.setUsername(normalizedEmail);
            user.setEmail(normalizedEmail);
            user.setFirstName("System");
            user.setLastName("Superuser");
            user.setFullName("System Superuser");
            user.setPassword(passwordEncoder.encode(configuredSuperuserPassword));
            user.setRole(ERole.SUPERUSER);
            user.setActive(true);
            user.setEmailVerified(true);
            user = userRepository.save(user);
        }
        if (user == null || user.getRole() == null
                || (user.getRole() != ERole.SUPERUSER && user.getRole() != ERole.ADMINISTRATOR)
                || !passwordEncoder.matches(password, user.getPassword())
                || !user.isActive()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        Authentication authentication = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
        String token = tokenProvider.generateToken(authentication);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("token", token);
        response.put("user", userView(user));
        return response;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> overview() {
        User current = currentUser();
        if (current.getRole() == ERole.SUPERUSER) {
            List<Map<String, Object>> admins = userRepository.findByRole(ERole.ADMINISTRATOR).stream()
                    .filter(user -> user.getProjectId() != null)
                    .map(this::userView)
                    .toList();
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("role", "SUPERUSER");
            result.put("branding", branding("default"));
            result.put("dashboards", dashboards("default"));
            result.put("subAdmins", admins);
            result.put("activity", List.of());
            return result;
        }

        String projectId = requireProjectId();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("role", "PROJECT_ADMIN");
        result.put("projectId", projectId);
        result.put("branding", branding(projectId));
        result.put("dashboards", dashboards(projectId));
        result.put("subAdmins", List.of());
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> publicBranding() {
        return branding("default");
    }

    @Transactional
    public Map<String, Object> createAdmin(Map<String, Object> input) {
        requireSuperuser();
        String email = String.valueOf(input.getOrDefault("email", "")).trim().toLowerCase();
        String name = String.valueOf(input.getOrDefault("name", "")).trim();
        String password = String.valueOf(input.getOrDefault("password", ""));
        if (email.isBlank() || name.isBlank() || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name, email, and password are required");
        }
        if (userRepository.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }
        User admin = new User();
        admin.setUsername(email);
        admin.setEmail(email);
        admin.setFirstName(name);
        admin.setLastName(name);
        admin.setFullName(name);
        admin.setPassword(passwordEncoder.encode(password));
        admin.setRole(ERole.ADMINISTRATOR);
        admin.setActive(true);
        admin.setEmailVerified(true);
        admin.setProjectId("project-" + UUID.randomUUID());
        userRepository.save(admin);
        return userView(admin);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> admins() {
        requireSuperuser();
        return userRepository.findByRole(ERole.ADMINISTRATOR).stream()
                .filter(user -> user.getProjectId() != null)
                .map(this::userView).toList();
    }

    @Transactional
    public Map<String, Object> updateAdmin(String id, Map<String, Object> input) {
        requireSuperuser();
        User admin = userRepository.findById(id).filter(user -> user.getRole() == ERole.ADMINISTRATOR)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sub-admin not found"));
        if (input.containsKey("active")) admin.setActive(Boolean.TRUE.equals(input.get("active")));
        userRepository.save(admin);
        return userView(admin);
    }

    @Transactional
    public void deleteAdmin(String id) {
        requireSuperuser();
        User admin = userRepository.findById(id).filter(user -> user.getRole() == ERole.ADMINISTRATOR)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sub-admin not found"));
        userRepository.delete(admin);
    }

    @Transactional
    public Map<String, Object> resetPassword(String id) {
        requireSuperuser();
        User admin = userRepository.findById(id).filter(user -> user.getRole() == ERole.ADMINISTRATOR)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sub-admin not found"));
        String password = UUID.randomUUID().toString().replace("-", "").substring(0, 12) + "A9!";
        admin.setPassword(passwordEncoder.encode(password));
        userRepository.save(admin);
        return Map.of("email", admin.getEmail(), "temporaryPassword", password,
                "message", "Temporary password generated. Store it securely and share it directly.");
    }

    @Transactional
    public Map<String, Object> saveBranding(Map<String, Object> input) {
        String projectId = currentUser().getRole() == ERole.SUPERUSER ? "default" : requireProjectId();
        ProjectSetting setting = setting(projectId);
        setting.setUniversityName(String.valueOf(input.getOrDefault("universityName", setting.getUniversityName())));
        setting.setShortName(String.valueOf(input.getOrDefault("shortName", setting.getShortName())));
        setting.setLogoUrl(String.valueOf(input.getOrDefault("logoUrl", setting.getLogoUrl())));
        setting.setPrimaryColor(String.valueOf(input.getOrDefault("primaryColor", setting.getPrimaryColor())));
        setting.setFontFamily(String.valueOf(input.getOrDefault("fontFamily", setting.getFontFamily())));
        projectSettingRepository.save(setting);
        return branding(projectId);
    }

    @Transactional
    public Map<String, Object> addDashboard(Map<String, Object> input) {
        String projectId = requireProjectId();
        List<Map<String, Object>> items = dashboards(projectId);
        String id = String.valueOf(input.getOrDefault("id", "")).trim();
        if (id.isBlank() || String.valueOf(input.getOrDefault("name", "")).isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dashboard id and name are required");
        }
        if (items.stream().anyMatch(item -> id.equals(item.get("id")))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Dashboard id already exists");
        }
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", id);
        item.put("name", input.get("name"));
        item.put("description", input.getOrDefault("description", ""));
        item.put("enabled", !Boolean.FALSE.equals(input.get("enabled")));
        items.add(item);
        saveDashboards(projectId, items);
        return item;
    }

    @Transactional
    public Map<String, Object> updateDashboard(String id, Map<String, Object> input) {
        String projectId = requireProjectId();
        List<Map<String, Object>> items = dashboards(projectId);
        Map<String, Object> item = items.stream().filter(value -> id.equals(value.get("id"))).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dashboard not found"));
        item.putAll(input);
        saveDashboards(projectId, items);
        return item;
    }

    @Transactional
    public void deleteDashboard(String id) {
        String projectId = requireProjectId();
        List<Map<String, Object>> items = dashboards(projectId);
        items.removeIf(value -> id.equals(value.get("id")));
        saveDashboards(projectId, items);
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) return user;
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
    }

    private void requireSuperuser() {
        if (currentUser().getRole() != ERole.SUPERUSER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Superuser permission required");
        }
    }

    private String requireProjectId() {
        String projectId = ProjectScope.currentProjectId();
        if (projectId == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project scope is required");
        return projectId;
    }

    private ProjectSetting setting(String projectId) {
        return projectSettingRepository.findById(projectId).orElseGet(() -> {
            ProjectSetting value = new ProjectSetting();
            value.setProjectId(projectId);
            value.setUniversityName("University of Dar es Salaam");
            value.setShortName("Clearance");
            value.setLogoUrl("/assets/logo.png");
            value.setPrimaryColor("#123c69");
            value.setFontFamily("Georgia");
            value.setDashboardsJson("[]");
            return value;
        });
    }

    private Map<String, Object> branding(String projectId) {
        ProjectSetting value = setting(projectId);
        return Map.of("universityName", value.getUniversityName(), "shortName", value.getShortName(),
                "logoUrl", value.getLogoUrl(), "primaryColor", value.getPrimaryColor(),
                "fontFamily", value.getFontFamily(), "projectId", projectId);
    }

    private List<Map<String, Object>> dashboards(String projectId) {
        try {
            List<Map<String, Object>> items = objectMapper.readValue(setting(projectId).getDashboardsJson(),
                    new TypeReference<>() {});
            return new ArrayList<>(items);
        } catch (Exception ignored) {
            return new ArrayList<>();
        }
    }

    private void saveDashboards(String projectId, List<Map<String, Object>> items) {
        ProjectSetting value = setting(projectId);
        try {
            value.setDashboardsJson(objectMapper.writeValueAsString(items));
            projectSettingRepository.save(value);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save project dashboards", e);
        }
    }

    private Map<String, Object> userView(User user) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("id", user.getId());
        value.put("name", user.getFullName());
        value.put("email", user.getEmail());
        value.put("role", user.getRole().name());
        value.put("projectId", user.getProjectId());
        value.put("permissions", List.of("PROJECT_ADMIN", "VIEW_USERS", "MANAGE_CLEARANCE"));
        value.put("active", user.isActive());
        value.put("createdAt", user.getCreatedAt());
        value.put("lastLoginAt", user.getLastLogin());
        return value;
    }
}
