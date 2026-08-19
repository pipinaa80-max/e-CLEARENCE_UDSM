

package com.UDSM.BACKEND.Service;
import java.util.List;

import com.UDSM.BACKEND.Model.Notification;
import com.UDSM.BACKEND.Model.NotificationType;
import com.UDSM.BACKEND.Model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface NotificationService {
    void sendNotification(User user, String title, String message, NotificationType type);

    List<Notification> sendBulkNotification(List<User> users, String title, String message, NotificationType type);

    void sendEmail(String to, String subject, String body);

    void sendSms(String phoneNumber, String message);

    List<Notification> getUserNotifications(User user);

    Page<Notification> getUserNotifications(User user, Pageable pageable);

    long getUnreadCount(User user);

    Notification markAsRead(String notificationId);

    void markAllAsRead(User user);

    void deleteNotification(String notificationId);

    void deleteAllUserNotifications(User user);

    void sendClearanceUpdate(String studentId, String status, String comments);

    void sendApprovalNotification(String studentId, String department, String approver);

    void sendRejectionNotification(String studentId, String department, String reason);

    void sendCertificateReadyNotification(String studentId);

    void sendReminderNotification(String studentId, String department, String dueDate);
}
