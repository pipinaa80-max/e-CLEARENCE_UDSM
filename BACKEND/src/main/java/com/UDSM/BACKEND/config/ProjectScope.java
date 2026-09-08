package com.UDSM.BACKEND.config;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class ProjectScope {
    private ProjectScope() { }

    public static String currentProjectId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof ProjectAdminPrincipal principal)) {
            return null;
        }
        return principal.projectId();
    }

    public static boolean isProjectAdmin() {
        return currentProjectId() != null;
    }
}
