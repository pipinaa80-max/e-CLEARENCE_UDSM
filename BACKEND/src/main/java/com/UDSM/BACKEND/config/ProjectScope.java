package com.UDSM.BACKEND.config;

import com.UDSM.BACKEND.Model.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class ProjectScope {
    private ProjectScope() { }

    public static String currentProjectId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return null;
        }
        if (authentication.getPrincipal() instanceof ProjectAdminPrincipal principal) {
            return principal.projectId();
        }
        if (authentication.getPrincipal() instanceof User user) {
            return user.getProjectId();
        }
        return null;
    }

    public static boolean isProjectAdmin() {
        return currentProjectId() != null;
    }
}
