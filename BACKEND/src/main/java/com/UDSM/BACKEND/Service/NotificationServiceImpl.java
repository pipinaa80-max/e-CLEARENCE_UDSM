package com.UDSM.BACKEND.Service;

import com.UDSM.BACKEND.Model.*;
import com.UDSM.BACKEND.Repository.NotificationRepository;
import com.UDSM.BACKEND.Repository.StudentRepository;
import com.UDSM.BACKEND.Repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    private User resolveStudentUser(Student student) {
        if (student == null) return null;
        if (student.getUser() != null) return student.getUser();
        if (student.getEmail() != null && !student.getEmail().isBlank()) {
            Optional<User> byEmail = userRepository.findByEmail(student.getEmail());
            if (byEmail.isPresent()) {
                student.setUser(byEmail.get());
                try { studentRepository.save(student); } catch (Exception ignored) {}
                return byEmail.get();
            }
        }
        if (student.getRegistrationNumber() != null && !student.getRegistrationNumber().isBlank()) {
            Optional<User> byReg = userRepository.findByRegistrationNumberIgnoreCase(student.getRegistrationNumber())
                    .or(() -> userRepository.findByUsername(student.getRegistrationNumber()));
            if (byReg.isPresent()) {
                student.setUser(byReg.get());
                try { studentRepository.save(student); } catch (Exception ignored) {}
                return byReg.get();
            }
        }
        return null;
    }

    private Student resolveUserStudent(User user) {
        if (user == null) return null;
        return studentRepository.findByUser(user)
                .or(() -> user.getId() != null ? studentRepository.findByUserId(user.getId()) : Optional.empty())
                .or(() -> user.getEmail() != null ? studentRepository.findByEmail(user.getEmail()) : Optional.empty())
                .or(() -> user.getRegistrationNumber() != null ? studentRepository.findByRegistrationNumberIgnoreCase(user.getRegistrationNumber()) : Optional.empty())
                .orElse(null);
    }

    @Override
    public void sendNotification(User user, String title, String message, NotificationType type) {
        Notification notification = new Notification();
        notification.setUser(user);
        Student student = resolveUserStudent(user);
        if (student != null) {
            notification.setStudent(student);
        }
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setCreatedAt(LocalDateTime.now());
        notification.setRead(false);

        notificationRepository.save(notification);
        log.info("🔔 Sent notification to user {}: {}", user != null ? user.getEmail() : "null", title);

        if (user != null) {
            if (type == NotificationType.EMAIL && user.getEmail() != null) {
                sendEmail(user.getEmail(), title, message);
            } else if (type == NotificationType.SMS && user.getPhoneNumber() != null) {
                sendSms(user.getPhoneNumber(), message);
            }
        }
    }

    @Override
    public List<Notification> sendBulkNotification(List<User> users, String title, String message, NotificationType type) {
        List<Notification> notifications = new ArrayList<>();
        for (User user : users) {
            Notification notification = new Notification();
            notification.setUser(user);
            Student student = resolveUserStudent(user);
            if (student != null) {
                notification.setStudent(student);
            }
            notification.setTitle(title);
            notification.setMessage(message);
            notification.setType(type);
            notification.setCreatedAt(LocalDateTime.now());
            notification.setRead(false);
            notifications.add(notification);
        }
        return notificationRepository.saveAll(notifications);
    }

    @Override
    public void sendEmail(String to, String subject, String body) {
        log.info("📧 Sending simple email to: {}", to);
        emailService.sendHtmlEmail(to, subject, "<p>" + body + "</p>");
    }

    @Override
    public void sendSms(String phoneNumber, String message) {
        System.out.println("Sending SMS to: " + phoneNumber);
        System.out.println("Message: " + message);
    }

    @Override
    public List<Notification> getUserNotifications(User user) {
        return notificationRepository.findByUserOrderByCreatedAtDesc(user);
    }

    @Override
    public Page<Notification> getUserNotifications(User user, Pageable pageable) {
        return notificationRepository.findByUser(user, pageable);
    }

    @Override
    public long getUnreadCount(User user) {
        return notificationRepository.countByUserAndIsReadFalse(user);
    }

    @Override
    public Notification markAsRead(String notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    @Override
    public void markAllAsRead(User user) {
        List<Notification> unreadNotifications = notificationRepository.findByUserAndIsReadFalse(user);
        unreadNotifications.forEach(notification -> notification.setRead(true));
        notificationRepository.saveAll(unreadNotifications);
    }

    @Override
    public void deleteNotification(String notificationId) {
        notificationRepository.deleteById(notificationId);
    }

    @Override
    public void deleteAllUserNotifications(User user) {
        notificationRepository.deleteByUser(user);
    }

    @Override
    public void sendClearanceUpdate(String studentId, String status, String comments) {
        Student student = studentRepository.findById(studentId)
                .or(() -> studentRepository.findByRegistrationNumber(studentId))
                .or(() -> studentRepository.findByRegistrationNumberIgnoreCase(studentId))
                .orElse(null);
        if (student == null) return;
        User targetUser = resolveStudentUser(student);
        Notification notification = new Notification();
        notification.setUser(targetUser);
        notification.setStudent(student);
        notification.setTitle("Clearance Update - " + status);
        notification.setMessage(comments != null && !comments.isBlank() ? comments : "Your clearance status has been updated to: " + status);
        notification.setType(NotificationType.CLEARANCE_UPDATE);
        notification.setCreatedAt(LocalDateTime.now());
        notification.setRead(false);
        notificationRepository.save(notification);
    }

    @Override
    public void sendApprovalNotification(String studentId, String department, String approver) {
        Student student = studentRepository.findById(studentId)
                .or(() -> studentRepository.findByRegistrationNumber(studentId))
                .or(() -> studentRepository.findByRegistrationNumberIgnoreCase(studentId))
                .orElse(null);
        if (student == null) {
            log.warn("⚠️ Student not found for approval notification: {}", studentId);
            return;
        }

        User targetUser = resolveStudentUser(student);

        String title = "Clearance Approved - " + department;
        String message = "Your clearance request has been approved by the " + department + " office.";

        Notification notification = new Notification();
        notification.setUser(targetUser);
        notification.setStudent(student);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(NotificationType.APPROVAL);
        notification.setCreatedAt(LocalDateTime.now());
        notification.setRead(false);
        notificationRepository.save(notification);
        log.info("🔔 Created approval notification for student {} (user: {}) - {}", student.getRegistrationNumber(), targetUser != null ? targetUser.getEmail() : "null", title);

        // Send Real Email
        try {
            emailService.sendClearanceUpdateEmail(student, "APPROVED", department, "Verified by " + approver);
        } catch (Exception e) {
            log.error("❌ Failed to send approval email to student {}: {}", studentId, e.getMessage());
        }
    }

    @Override
    public void sendRejectionNotification(String studentId, String department, String reason) {
        Student student = studentRepository.findById(studentId)
                .or(() -> studentRepository.findByRegistrationNumber(studentId))
                .or(() -> studentRepository.findByRegistrationNumberIgnoreCase(studentId))
                .orElse(null);
        if (student == null) {
            log.warn("⚠️ Student not found for rejection notification: {}", studentId);
            return;
        }

        User targetUser = resolveStudentUser(student);

        String title = "Clearance Action Required - " + department;
        String message = "Your clearance request was rejected by " + department + ". Reason: " + reason;

        Notification notification = new Notification();
        notification.setUser(targetUser);
        notification.setStudent(student);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(NotificationType.REJECTION);
        notification.setCreatedAt(LocalDateTime.now());
        notification.setRead(false);
        notificationRepository.save(notification);
        log.info("🔔 Created rejection notification for student {} (user: {}) - {}", student.getRegistrationNumber(), targetUser != null ? targetUser.getEmail() : "null", title);

        // Send Real Email
        try {
            emailService.sendClearanceUpdateEmail(student, "REJECTED", department, reason);
        } catch (Exception e) {
            log.error("❌ Failed to send rejection email to student {}: {}", studentId, e.getMessage());
        }
    }

    @Override
    public void sendCertificateReadyNotification(String studentId) {
        Student student = studentRepository.findById(studentId)
                .or(() -> studentRepository.findByRegistrationNumber(studentId))
                .or(() -> studentRepository.findByRegistrationNumberIgnoreCase(studentId))
                .orElse(null);
        if (student == null) return;
        User targetUser = resolveStudentUser(student);
        Notification notification = new Notification();
        notification.setUser(targetUser);
        notification.setStudent(student);
        notification.setTitle("Certificate Ready for Collection");
        notification.setMessage("Your degree certificate and academic transcript are now ready for physical collection at the DUS office.");
        notification.setType(NotificationType.CERTIFICATE_READY);
        notification.setCreatedAt(LocalDateTime.now());
        notification.setRead(false);
        notificationRepository.save(notification);
    }

    @Override
    public void sendReminderNotification(String studentId, String department, String dueDate) {
        Student student = studentRepository.findById(studentId)
                .or(() -> studentRepository.findByRegistrationNumber(studentId))
                .or(() -> studentRepository.findByRegistrationNumberIgnoreCase(studentId))
                .orElse(null);
        if (student == null) return;
        User targetUser = resolveStudentUser(student);
        Notification notification = new Notification();
        notification.setUser(targetUser);
        notification.setStudent(student);
        notification.setTitle("Clearance Reminder - " + department);
        notification.setMessage("Reminder: Your clearance action for " + department + " is pending. Due date: " + dueDate);
        notification.setType(NotificationType.REMINDER);
        notification.setCreatedAt(LocalDateTime.now());
        notification.setRead(false);
        notificationRepository.save(notification);
    }
}
