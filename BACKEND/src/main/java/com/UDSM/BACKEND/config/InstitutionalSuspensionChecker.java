package com.UDSM.BACKEND.config;

import com.UDSM.BACKEND.Model.ERole;
import com.UDSM.BACKEND.Model.User;
import com.UDSM.BACKEND.Repository.UserRepository;
import java.util.List;
import java.util.Set;

public final class InstitutionalSuspensionChecker {

    private static final Set<String> GENERIC_DOMAINS = Set.of(
            "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
            "admin.local", "localhost", "icloud.com", "protonmail.com"
    );

    private InstitutionalSuspensionChecker() {}

    public static boolean isGenericDomain(String domain) {
        if (domain == null) return true;
        return GENERIC_DOMAINS.contains(domain.trim().toLowerCase());
    }

    public static boolean isInstitutionalAdminSuspended(User user, UserRepository userRepository) {
        if (user == null || user.getRole() == ERole.SUPERUSER) {
            return false;
        }

        // 1. Check if user itself is set inactive
        if (!user.isActive()) {
            return true;
        }

        List<User> admins = userRepository.findByRole(ERole.ADMINISTRATOR);
        for (User admin : admins) {
            if (admin.isActive()) {
                continue; // Admin is active, check next
            }

            // A) Check by matching projectId
            if (admin.getProjectId() != null && !admin.getProjectId().isBlank()) {
                if (admin.getProjectId().equals(user.getProjectId())) {
                    return true;
                }
            }

            // B) Check by matching email domain
            if (admin.getEmail() != null && admin.getEmail().contains("@") && user.getEmail() != null && user.getEmail().contains("@")) {
                String adminDomain = admin.getEmail().substring(admin.getEmail().indexOf("@") + 1).toLowerCase();
                String userDomain = user.getEmail().substring(user.getEmail().indexOf("@") + 1).toLowerCase();
                if (!isGenericDomain(adminDomain) && adminDomain.equals(userDomain)) {
                    return true;
                }
            }

            // C) Check by matching university / college / department keywords for UDOM or specific campuses
            String adminEmail = admin.getEmail() != null ? admin.getEmail().toLowerCase() : "";
            if (adminEmail.contains("udom") || (admin.getFirstName() != null && admin.getFirstName().toLowerCase().contains("dodoma"))) {
                boolean userHasUdom = (user.getEmail() != null && user.getEmail().toLowerCase().contains("udom"))
                        || (user.getCollege() != null && user.getCollege().toLowerCase().contains("dodoma"))
                        || (user.getDepartment() != null && user.getDepartment().toLowerCase().contains("dodoma"))
                        || (user.getProgramme() != null && user.getProgramme().toLowerCase().contains("dodoma"));
                if (userHasUdom) {
                    return true;
                }
            }
        }

        return false;
    }
}
