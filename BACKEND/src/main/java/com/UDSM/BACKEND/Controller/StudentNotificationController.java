package com.UDSM.BACKEND.Controller;

import com.UDSM.BACKEND.Model.*;
import com.UDSM.BACKEND.Repository.ClearanceRequestRepository;
import com.UDSM.BACKEND.Repository.DepartmentApprovalRepository;
import com.UDSM.BACKEND.Repository.NotificationRepository;
import com.UDSM.BACKEND.Repository.StudentRepository;
import com.UDSM.BACKEND.Repository.UserRepository;
import com.UDSM.BACKEND.Service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200", "http://127.0.0.1:4200"}, allowCredentials = "true")
@Transactional
@Slf4j
public class StudentNotificationController {
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final StudentRepository studentRepository;
    private final ClearanceRequestRepository clearanceRequestRepository;
    private final DepartmentApprovalRepository departmentApprovalRepository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<Map<String, Object>> list(@AuthenticationPrincipal UserDetails principal) {
        User user = requireUser(principal);
        syncClearanceNotifications(user);

        String email = user.getEmail() != null ? user.getEmail().trim() : "";
        String regNum = user.getRegistrationNumber() != null ? user.getRegistrationNumber().trim() : "";
        return notificationRepository.findAllForStudent(user, email, regNum).stream().map(this::toResponse).toList();
    }

    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> unreadCount(@AuthenticationPrincipal UserDetails principal) {
        User user = requireUser(principal);
        syncClearanceNotifications(user);

        String email = user.getEmail() != null ? user.getEmail().trim() : "";
        String regNum = user.getRegistrationNumber() != null ? user.getRegistrationNumber().trim() : "";
        long count = notificationRepository.countUnreadForStudent(user, email, regNum);
        return Map.of("unreadCount", count);
    }

    @PatchMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> markRead(@AuthenticationPrincipal UserDetails principal, @PathVariable String id) {
        User user = requireUser(principal);
        String email = user.getEmail() != null ? user.getEmail().trim() : "";
        String regNum = user.getRegistrationNumber() != null ? user.getRegistrationNumber().trim() : "";
        notificationRepository.markSingleAsReadForStudent(id, user, email, regNum);
        Notification notice = notificationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found."));
        return toResponse(notice);
    }

    @PostMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> markAllRead(@AuthenticationPrincipal UserDetails principal) {
        User user = requireUser(principal);
        String email = user.getEmail() != null ? user.getEmail().trim() : "";
        String regNum = user.getRegistrationNumber() != null ? user.getRegistrationNumber().trim() : "";
        int updated = notificationRepository.markAllAsReadForStudent(user, email, regNum);
        return Map.of("updated", updated, "unreadCount", 0);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserDetails principal, @PathVariable String id) {
        User user = requireUser(principal);
        String email = user.getEmail() != null ? user.getEmail().trim() : "";
        String regNum = user.getRegistrationNumber() != null ? user.getRegistrationNumber().trim() : "";
        Notification notice = notificationRepository.findById(id)
                .filter(item -> (item.getUser() != null && user.getId().equals(item.getUser().getId()))
                        || (item.getStudent() != null && item.getStudent().getUser() != null && user.getId().equals(item.getStudent().getUser().getId()))
                        || (item.getStudent() != null && !email.isEmpty() && email.equalsIgnoreCase(item.getStudent().getEmail()))
                        || (item.getStudent() != null && !regNum.isEmpty() && regNum.equalsIgnoreCase(item.getStudent().getRegistrationNumber())))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found."));
        notificationRepository.delete(notice);
    }

    @DeleteMapping("/clear-all")
    @PreAuthorize("isAuthenticated()")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearAll(@AuthenticationPrincipal UserDetails principal) {
        User user = requireUser(principal);
        String email = user.getEmail() != null ? user.getEmail().trim() : "";
        String regNum = user.getRegistrationNumber() != null ? user.getRegistrationNumber().trim() : "";
        List<Notification> notices = notificationRepository.findAllForStudent(user, email, regNum);
        notificationRepository.deleteAll(notices);
    }

    private void syncClearanceNotifications(User user) {
        try {
            Student student = studentRepository.findByUser(user)
                    .or(() -> user.getId() != null ? studentRepository.findByUserId(user.getId()) : java.util.Optional.empty())
                    .or(() -> user.getEmail() != null ? studentRepository.findByEmail(user.getEmail()) : java.util.Optional.empty())
                    .or(() -> user.getRegistrationNumber() != null ? studentRepository.findByRegistrationNumberIgnoreCase(user.getRegistrationNumber()) : java.util.Optional.empty())
                    .orElse(null);
            if (student == null) return;

            if (student.getUser() == null) {
                student.setUser(user);
                try { studentRepository.save(student); } catch (Exception ignored) {}
            }

            List<ClearanceRequest> requests = clearanceRequestRepository.findByStudent(student);
            if (requests.isEmpty()) return;

            ClearanceRequest latestRequest = requests.get(requests.size() - 1);
            List<DepartmentApproval> approvals = departmentApprovalRepository.findByClearanceRequest(latestRequest);

            String email = user.getEmail() != null ? user.getEmail().trim() : "";
            String regNum = user.getRegistrationNumber() != null ? user.getRegistrationNumber().trim() : "";
            List<Notification> existing = notificationRepository.findAllForStudent(user, email, regNum);

            for (DepartmentApproval app : approvals) {
                if (app.getStatus() == ClearanceStatus.APPROVED) {
                    String title = "Clearance Approved - " + app.getDepartment();
                    boolean exists = existing.stream().anyMatch(n -> title.equalsIgnoreCase(n.getTitle()));
                    if (!exists) {
                        Notification n = new Notification();
                        n.setUser(user);
                        n.setStudent(student);
                        n.setTitle(title);
                        n.setMessage("Your clearance request has been approved by the " + app.getDepartment() + " office (" + (app.getApprovedBy() != null ? app.getApprovedBy() : "Verified") + ").");
                        n.setType(NotificationType.APPROVAL);
                        n.setCreatedAt(app.getApprovalDate() != null ? app.getApprovalDate() : LocalDateTime.now());
                        n.setRead(false);
                        notificationRepository.save(n);
                        log.info("🔔 Auto-synced missing approval notification: {} for {}", title, user.getEmail());
                    }
                } else if (app.getStatus() == ClearanceStatus.REJECTED) {
                    String title = "Clearance Action Required - " + app.getDepartment();
                    boolean exists = existing.stream().anyMatch(n -> title.equalsIgnoreCase(n.getTitle()));
                    if (!exists) {
                        Notification n = new Notification();
                        n.setUser(user);
                        n.setStudent(student);
                        n.setTitle(title);
                        n.setMessage("Your clearance request was rejected by " + app.getDepartment() + ". Reason: " + (app.getComments() != null ? app.getComments() : "Action required"));
                        n.setType(NotificationType.REJECTION);
                        n.setCreatedAt(app.getApprovalDate() != null ? app.getApprovalDate() : LocalDateTime.now());
                        n.setRead(false);
                        notificationRepository.save(n);
                        log.info("🔔 Auto-synced missing rejection notification: {} for {}", title, user.getEmail());
                    }
                }
            }

            if (ClearanceStatus.COMPLETED.name().equalsIgnoreCase(latestRequest.getStatus())) {
                String title = "Clearance Complete!";
                boolean exists = existing.stream().anyMatch(n -> title.equalsIgnoreCase(n.getTitle()));
                if (!exists) {
                    Notification n = new Notification();
                    n.setUser(user);
                    n.setStudent(student);
                    n.setTitle(title);
                    n.setMessage("Congratulations! Your clearance has been fully completed and approved by all offices.");
                    n.setType(NotificationType.CERTIFICATE_READY);
                    n.setCreatedAt(LocalDateTime.now());
                    n.setRead(false);
                    notificationRepository.save(n);
                }
            }
        } catch (Exception e) {
            log.warn("⚠️ syncClearanceNotifications encountered: {}", e.getMessage());
        }
    }

    private User requireUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
                .or(() -> userRepository.findByUsername(principal.getUsername()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User account not found."));
    }

    private Map<String, Object> toResponse(Notification notice) {
        Map<String, Object> resp = new HashMap<>();
        resp.put("id", notice.getId() != null ? notice.getId() : "");
        resp.put("title", notice.getTitle() != null ? notice.getTitle() : "Notification");
        resp.put("message", notice.getMessage() != null ? notice.getMessage() : "");
        resp.put("type", notice.getType() != null ? notice.getType().name() : "SYSTEM");
        resp.put("read", notice.isRead());
        resp.put("createdAt", notice.getCreatedAt() != null ? notice.getCreatedAt().toString() : LocalDateTime.now().toString());
        return resp;
    }
}
