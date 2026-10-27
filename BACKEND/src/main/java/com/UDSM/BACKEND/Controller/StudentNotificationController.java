package com.UDSM.BACKEND.Controller;

import com.UDSM.BACKEND.Model.Notification;
import com.UDSM.BACKEND.Model.User;
import com.UDSM.BACKEND.Repository.NotificationRepository;
import com.UDSM.BACKEND.Repository.UserRepository;
import com.UDSM.BACKEND.Service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class StudentNotificationController {
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @GetMapping
    @PreAuthorize("hasRole('STUDENT')")
    public List<Map<String, Object>> list(@AuthenticationPrincipal UserDetails principal) {
        User user = requireUser(principal);
        return notificationRepository.findByUserOrderByCreatedAtDesc(user).stream().map(this::toResponse).toList();
    }

    @PatchMapping("/{id}/read")
    @PreAuthorize("hasRole('STUDENT')")
    public Map<String, Object> markRead(@AuthenticationPrincipal UserDetails principal, @PathVariable String id) {
        User user = requireUser(principal);
        Notification notice = notificationRepository.findById(id)
                .filter(item -> item.getUser() != null && user.getId().equals(item.getUser().getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found."));
        notificationService.markAsRead(notice.getId());
        notice.setRead(true);
        return toResponse(notice);
    }

    @PostMapping("/read-all")
    @PreAuthorize("hasRole('STUDENT')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllRead(@AuthenticationPrincipal UserDetails principal) {
        notificationService.markAllAsRead(requireUser(principal));
    }

    private User requireUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
                .or(() -> userRepository.findByUsername(principal.getUsername()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User account not found."));
    }

    private Map<String, Object> toResponse(Notification notice) {
        return Map.of("id", notice.getId(), "title", notice.getTitle(), "message", notice.getMessage(),
                "type", notice.getType() == null ? "SYSTEM" : notice.getType().name(),
                "read", notice.isRead(), "createdAt", notice.getCreatedAt());
    }
}
