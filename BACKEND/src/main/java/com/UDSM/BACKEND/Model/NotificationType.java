

package com.UDSM.BACKEND.Model;

public enum NotificationType {
    CLEARANCE_UPDATE,
    APPROVAL,
    REJECTION,
    REMINDER,
    SYSTEM,
    CERTIFICATE_READY, EMAIL, SMS;

    private NotificationType() {
    }
}
