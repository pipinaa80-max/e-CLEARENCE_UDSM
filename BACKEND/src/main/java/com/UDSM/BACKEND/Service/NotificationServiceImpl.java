package com.UDSM.BACKEND.Service;
import com.UDSM.BACKEND.Model.Notification;
import com.UDSM.BACKEND.Model.NotificationType;
import com.UDSM.BACKEND.Model.User;
import com.UDSM.BACKEND.Repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class NotificationServiceImpl implements NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Override
    public void sendNotification(User user, String title, String message, NotificationType type) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setCreatedAt(LocalDateTime.now());
        notification.setRead(false);

        notificationRepository.save(notification);

        // Optionally send email/SMS based on type
        if (type == NotificationType.EMAIL) {
            sendEmail(user.getEmail(), title, message);
        } else if (type == NotificationType.SMS) {
            sendSms(user.getPhoneNumber(), message);
        }
    }

    @Override
    public List<Notification> sendBulkNotification(List<User> users, String title, String message, NotificationType type) {
        List<Notification> notifications = new ArrayList<>();
        for (User user : users) {
            Notification notification = new Notification();
            notification.setUser(user);
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
        // Implement email sending logic
        // You can use JavaMailSender or other email services
        System.out.println("Sending email to: " + to);
        System.out.println("Subject: " + subject);
        System.out.println("Body: " + body);
        // TODO: Add actual email implementation
    }

    @Override
    public void sendSms(String phoneNumber, String message) {
        // Implement SMS sending logic
        System.out.println("Sending SMS to: " + phoneNumber);
        System.out.println("Message: " + message);
        // TODO: Add actual SMS implementation
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
        // Find user by studentId and send notification
        // Implementation depends on your UserRepository
        System.out.println("Clearance update for student: " + studentId);
        System.out.println("Status: " + status);
        System.out.println("Comments: " + comments);
    }

    @Override
    public void sendApprovalNotification(String studentId, String department, String approver) {
        System.out.println("Approval notification for student: " + studentId);
        System.out.println("Department: " + department);
        System.out.println("Approved by: " + approver);
    }

    @Override
    public void sendRejectionNotification(String studentId, String department, String reason) {
        System.out.println("Rejection notification for student: " + studentId);
        System.out.println("Department: " + department);
        System.out.println("Reason: " + reason);
    }

    @Override
    public void sendCertificateReadyNotification(String studentId) {
        System.out.println("Certificate ready for student: " + studentId);
    }

    @Override
    public void sendReminderNotification(String studentId, String department, String dueDate) {
        System.out.println("Reminder for student: " + studentId);
        System.out.println("Department: " + department);
        System.out.println("Due date: " + dueDate);
    }
}