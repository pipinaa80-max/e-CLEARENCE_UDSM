package com.UDSM.BACKEND.dto;
import com.UDSM.BACKEND.Model.ClearanceStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.Generated;

import static com.UDSM.BACKEND.Model.ClearanceStatus.APPROVED;
import static com.UDSM.BACKEND.Model.ClearanceStatus.IN_PROGRESS;

@JsonInclude(Include.NON_NULL)
public class ClearanceResponse {
    @JsonProperty("id")
    private String requestId;

    @JsonProperty("student_id")
    private String studentId;

    @JsonProperty("registration_number")
    private String registrationNumber;

    @JsonProperty("student_name")
    private String studentName;

    @JsonProperty("email")
    private String email;

    @JsonProperty("phone_number")
    private String phoneNumber;

    @JsonProperty("profile_picture")
    private String profilePicture;


    @JsonProperty("programme")
    private String programme;

    @JsonProperty("faculty")
    private String faculty;

    @JsonProperty("department")
    private String department;

    @JsonProperty("department_code")
    private String departmentCode;

    @JsonProperty("year_of_study")
    private String yearOfStudy;

    @JsonProperty("academic_year")
    private String academicYear;

    @JsonProperty("semester")
    private String semester;

    @JsonProperty("student_status")
    private String studentStatus;

    @JsonProperty("status")
    private ClearanceStatus status;

    @JsonProperty("status_message")
    private String statusMessage;

    @JsonProperty("status_color")
    private String statusColor;

    @JsonProperty("status_icon")
    private String statusIcon;

    @JsonProperty("status_description")
    private String statusDescription;

    @JsonProperty("is_editable")
    private boolean isEditable;

    @JsonProperty("can_reapply")
    private boolean canReapply;

    @JsonProperty("progress_percentage")
    private int progressPercentage;

    @JsonProperty("total_departments")
    private int totalDepartments;

    @JsonProperty("approved_count")
    private int approvedCount;

    @JsonProperty("pending_count")
    private int pendingCount;


    @JsonProperty("rejected_count")
    private int rejectedCount;


    @JsonProperty("not_started_count")
    private int notStartedCount;

    @JsonProperty("completed_count")
    private int completedCount;

    @JsonProperty("progress_text")
    private String progressText;

    @JsonProperty("progress_level")
    private String progressLevel;

    @JsonProperty("approvals")
    private List<DepartmentApprovalDTO> approvals = new ArrayList();

    @JsonProperty("department_summary")
    private Map<String, DepartmentSummaryDTO> departmentSummary = new HashMap();


    @JsonProperty("request_date")
    private LocalDateTime requestDate;


    @JsonProperty("completed_date")
    private LocalDateTime completedDate;


    @JsonProperty("last_updated")
    private LocalDateTime lastUpdated;

    @JsonProperty("estimated_completion_date")
    private String estimatedCompletionDate;

    @JsonProperty("days_since_request")
    private int daysSinceRequest;

    @JsonProperty("days_remaining")
    private Long daysRemaining;

    @JsonProperty("timeline")
    private List<TimelineEventDTO> timeline = new ArrayList();

    @JsonProperty("documents")
    private List<DocumentDTO> documents = new ArrayList();

    @JsonProperty("has_certificate")
    private boolean hasCertificate;

    @JsonProperty("certificate_url")
    private String certificateUrl;

    @JsonProperty("certificate_generated_date")
    private LocalDateTime certificateGeneratedDate;

    @JsonProperty("certificate_expiry_date")
    private LocalDateTime certificateExpiryDate;

    @JsonProperty("has_pending_notifications")
    private boolean hasPendingNotifications;

    @JsonProperty("notification_count")
    private int notificationCount;

    @JsonProperty("recent_notifications")
    private List<NotificationDTO> recentNotifications = new ArrayList();

    @JsonProperty("last_notification")
    private NotificationDTO lastNotification;

    @JsonProperty("next_action")
    private String nextAction;

    @JsonProperty("available_actions")
    private List<String> availableActions = new ArrayList();

    @JsonProperty("action_buttons")
    private List<ActionButtonDTO> actionButtons = new ArrayList();

    @JsonProperty("metadata")
    private Map<String, Object> metadata = new HashMap();

    @JsonProperty("qr_code_url")
    private String qrCodeUrl;

    @JsonProperty("clearance_certificate_id")
    private String clearanceCertificateId;

    @JsonProperty("is_urgent")
    private boolean isUrgent;

    @JsonProperty("priority_level")
    private String priorityLevel;

    @JsonProperty("remarks")
    private String remarks;

    @JsonProperty("is_complete")
    public boolean isComplete() {
        return this.status == ClearanceStatus.COMPLETED || this.status == ClearanceStatus.CLEARED;
    }

    @JsonProperty("is_pending")
    public boolean isPending() {
        return this.status == ClearanceStatus.PENDING || this.status == ClearanceStatus.IN_PROGRESS;
    }

    @JsonProperty("is_rejected")
    public boolean isRejected() {
        return this.status == ClearanceStatus.REJECTED;
    }

    @JsonProperty("formatted_request_date")
    public String getFormattedRequestDate() {
        return this.requestDate == null ? null : this.requestDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));
    }

    @JsonProperty("formatted_completion_date")
    public String getFormattedCompletionDate() {
        return this.completedDate == null ? null : this.completedDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));
    }

    @JsonProperty("progress_description")
    public String getProgressDescription() {
        if (this.isComplete()) {
            return "✓ Clearance Complete";
        } else if (this.isRejected()) {
            return "✗ Clearance Rejected";
        } else {
            return this.approvedCount > 0 ? String.format("%d of %d departments approved", this.approvedCount, this.totalDepartments) : "Waiting for initial approval";
        }
    }

    @JsonProperty("days_remaining")
    public Long getDaysRemaining() {
        if (this.estimatedCompletionDate != null) {
            try {
                LocalDateTime dueDate = LocalDateTime.parse(this.estimatedCompletionDate);
                return Duration.between(LocalDateTime.now(), dueDate).toDays();
            } catch (Exception var2) {
                return null;
            }
        } else {
            return null;
        }
    }

    @JsonProperty("next_action")
    public String getNextAction() {
        if (this.isComplete()) {
            return "Download Certificate";
        } else if (this.isRejected()) {
            return "Review Rejection and Reapply";
        } else if (this.pendingCount > 0) {
            return "Awaiting Department Approval";
        } else {
            return this.notStartedCount > 0 ? "Submit to Pending Departments" : "Check Status";
        }
    }

    @JsonProperty("progress_level")
    public String getProgressLevel() {
        if (this.progressPercentage >= 100) {
            return "Complete";
        } else if (this.progressPercentage >= 75) {
            return "High";
        } else if (this.progressPercentage >= 50) {
            return "Medium";
        } else {
            return this.progressPercentage >= 25 ? "Low" : "Not Started";
        }
    }

    @JsonProperty("available_actions")
    public List<String> getAvailableActions() {
        List<String> actions = new ArrayList();
        if (this.isPending() && !this.isRejected()) {
            actions.add("VIEW_STATUS");
            actions.add("UPLOAD_DOCUMENT");
        }

        if (this.isComplete()) {
            actions.add("DOWNLOAD_CERTIFICATE");
            actions.add("VIEW_CERTIFICATE");
        }

        if (this.isRejected()) {
            actions.add("VIEW_REJECTION_REASON");
            actions.add("REAPPLY");
        }

        actions.add("CONTACT_SUPPORT");
        return actions;
    }

    @JsonProperty("is_urgent")
    public boolean isUrgent() {
        Long daysRemaining = this.getDaysRemaining();
        return daysRemaining != null && daysRemaining < 7L;
    }

    @JsonProperty("priority_level")
    public String getPriorityLevel() {
        if (this.isUrgent()) {
            return "Urgent";
        } else if (this.isPending() && this.daysSinceRequest > 14) {
            return "High";
        } else {
            return this.isPending() ? "Normal" : "Complete";
        }
    }

    @Generated
    public static ClearanceResponseBuilder builder() {
        return new ClearanceResponseBuilder();
    }

    @Generated
    public String getRequestId() {
        return this.requestId;
    }

    @Generated
    public String getStudentId() {
        return this.studentId;
    }

    @Generated
    public String getRegistrationNumber() {
        return this.registrationNumber;
    }

    @Generated
    public String getStudentName() {
        return this.studentName;
    }

    @Generated
    public String getEmail() {
        return this.email;
    }

    @Generated
    public String getPhoneNumber() {
        return this.phoneNumber;
    }

    @Generated
    public String getProfilePicture() {
        return this.profilePicture;
    }

    @Generated
    public String getProgramme() {
        return this.programme;
    }

    @Generated
    public String getFaculty() {
        return this.faculty;
    }

    @Generated
    public String getDepartment() {
        return this.department;
    }

    @Generated
    public String getDepartmentCode() {
        return this.departmentCode;
    }

    @Generated
    public String getYearOfStudy() {
        return this.yearOfStudy;
    }

    @Generated
    public String getAcademicYear() {
        return this.academicYear;
    }

    @Generated
    public String getSemester() {
        return this.semester;
    }

    @Generated
    public String getStudentStatus() {
        return this.studentStatus;
    }

    @Generated
    public ClearanceStatus getStatus() {
        return this.status;
    }

    @Generated
    public String getStatusMessage() {
        return this.statusMessage;
    }

    @Generated
    public String getStatusColor() {
        return this.statusColor;
    }

    @Generated
    public String getStatusIcon() {
        return this.statusIcon;
    }

    @Generated
    public String getStatusDescription() {
        return this.statusDescription;
    }

    @Generated
    public boolean isEditable() {
        return this.isEditable;
    }

    @Generated
    public boolean isCanReapply() {
        return this.canReapply;
    }

    @Generated
    public int getProgressPercentage() {
        return this.progressPercentage;
    }

    @Generated
    public int getTotalDepartments() {
        return this.totalDepartments;
    }

    @Generated
    public int getApprovedCount() {
        return this.approvedCount;
    }

    @Generated
    public int getPendingCount() {
        return this.pendingCount;
    }

    @Generated
    public int getRejectedCount() {
        return this.rejectedCount;
    }

    @Generated
    public int getNotStartedCount() {
        return this.notStartedCount;
    }

    @Generated
    public int getCompletedCount() {
        return this.completedCount;
    }

    @Generated
    public String getProgressText() {
        return this.progressText;
    }

    @Generated
    public List<DepartmentApprovalDTO> getApprovals() {
        return this.approvals;
    }

    @Generated
    public Map<String, DepartmentSummaryDTO> getDepartmentSummary() {
        return this.departmentSummary;
    }

    @Generated
    public LocalDateTime getRequestDate() {
        return this.requestDate;
    }

    @Generated
    public LocalDateTime getCompletedDate() {
        return this.completedDate;
    }

    @Generated
    public LocalDateTime getLastUpdated() {
        return this.lastUpdated;
    }

    @Generated
    public String getEstimatedCompletionDate() {
        return this.estimatedCompletionDate;
    }

    @Generated
    public int getDaysSinceRequest() {
        return this.daysSinceRequest;
    }

    @Generated
    public List<TimelineEventDTO> getTimeline() {
        return this.timeline;
    }

    @Generated
    public List<DocumentDTO> getDocuments() {
        return this.documents;
    }

    @Generated
    public boolean isHasCertificate() {
        return this.hasCertificate;
    }

    @Generated
    public String getCertificateUrl() {
        return this.certificateUrl;
    }

    @Generated
    public LocalDateTime getCertificateGeneratedDate() {
        return this.certificateGeneratedDate;
    }

    @Generated
    public LocalDateTime getCertificateExpiryDate() {
        return this.certificateExpiryDate;
    }

    @Generated
    public boolean isHasPendingNotifications() {
        return this.hasPendingNotifications;
    }

    @Generated
    public int getNotificationCount() {
        return this.notificationCount;
    }

    @Generated
    public List<NotificationDTO> getRecentNotifications() {
        return this.recentNotifications;
    }

    @Generated
    public NotificationDTO getLastNotification() {
        return this.lastNotification;
    }

    @Generated
    public List<ActionButtonDTO> getActionButtons() {
        return this.actionButtons;
    }

    @Generated
    public Map<String, Object> getMetadata() {
        return this.metadata;
    }

    @Generated
    public String getQrCodeUrl() {
        return this.qrCodeUrl;
    }

    @Generated
    public String getClearanceCertificateId() {
        return this.clearanceCertificateId;
    }

    @Generated
    public String getRemarks() {
        return this.remarks;
    }

    @Generated
    public void setRequestId(final String requestId) {
        this.requestId = requestId;
    }

    @Generated
    public void setStudentId(final String studentId) {
        this.studentId = studentId;
    }

    @Generated
    public void setRegistrationNumber(final String registrationNumber) {
        this.registrationNumber = registrationNumber;
    }

    @Generated
    public void setStudentName(final String studentName) {
        this.studentName = studentName;
    }

    @Generated
    public void setEmail(final String email) {
        this.email = email;
    }

    @Generated
    public void setPhoneNumber(final String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    @Generated
    public void setProfilePicture(final String profilePicture) {
        this.profilePicture = profilePicture;
    }

    @Generated
    public void setProgramme(final String programme) {
        this.programme = programme;
    }

    @Generated
    public void setFaculty(final String faculty) {
        this.faculty = faculty;
    }

    @Generated
    public void setDepartment(final String department) {
        this.department = department;
    }

    @Generated
    public void setDepartmentCode(final String departmentCode) {
        this.departmentCode = departmentCode;
    }

    @Generated
    public void setYearOfStudy(final String yearOfStudy) {
        this.yearOfStudy = yearOfStudy;
    }

    @Generated
    public void setAcademicYear(final String academicYear) {
        this.academicYear = academicYear;
    }

    @Generated
    public void setSemester(final String semester) {
        this.semester = semester;
    }

    @Generated
    public void setStudentStatus(final String studentStatus) {
        this.studentStatus = studentStatus;
    }

    @Generated
    public void setStatus(final ClearanceStatus status) {
        this.status = status;
    }

    @Generated
    public void setStatusMessage(final String statusMessage) {
        this.statusMessage = statusMessage;
    }

    @Generated
    public void setStatusColor(final String statusColor) {
        this.statusColor = statusColor;
    }

    @Generated
    public void setStatusIcon(final String statusIcon) {
        this.statusIcon = statusIcon;
    }

    @Generated
    public void setStatusDescription(final String statusDescription) {
        this.statusDescription = statusDescription;
    }

    @Generated
    public void setEditable(final boolean isEditable) {
        this.isEditable = isEditable;
    }

    @Generated
    public void setCanReapply(final boolean canReapply) {
        this.canReapply = canReapply;
    }

    @Generated
    public void setProgressPercentage(final int progressPercentage) {
        this.progressPercentage = progressPercentage;
    }

    @Generated
    public void setTotalDepartments(final int totalDepartments) {
        this.totalDepartments = totalDepartments;
    }

    @Generated
    public void setApprovedCount(final int approvedCount) {
        this.approvedCount = approvedCount;
    }

    @Generated
    public void setPendingCount(final int pendingCount) {
        this.pendingCount = pendingCount;
    }

    @Generated
    public void setRejectedCount(final int rejectedCount) {
        this.rejectedCount = rejectedCount;
    }

    @Generated
    public void setNotStartedCount(final int notStartedCount) {
        this.notStartedCount = notStartedCount;
    }

    @Generated
    public void setCompletedCount(final int completedCount) {
        this.completedCount = completedCount;
    }

    @Generated
    public void setProgressText(final String progressText) {
        this.progressText = progressText;
    }

    @Generated
    public void setProgressLevel(final String progressLevel) {
        this.progressLevel = progressLevel;
    }

    @Generated
    public void setApprovals(final List<DepartmentApprovalDTO> approvals) {
        this.approvals = approvals;
    }

    @Generated
    public void setDepartmentSummary(final Map<String, DepartmentSummaryDTO> departmentSummary) {
        this.departmentSummary = departmentSummary;
    }

    @Generated
    public void setRequestDate(final LocalDateTime requestDate) {
        this.requestDate = requestDate;
    }

    @Generated
    public void setCompletedDate(final LocalDateTime completedDate) {
        this.completedDate = completedDate;
    }

    @Generated
    public void setLastUpdated(final LocalDateTime lastUpdated) {
        this.lastUpdated = lastUpdated;
    }

    @Generated
    public void setEstimatedCompletionDate(final String estimatedCompletionDate) {
        this.estimatedCompletionDate = estimatedCompletionDate;
    }

    @Generated
    public void setDaysSinceRequest(final int daysSinceRequest) {
        this.daysSinceRequest = daysSinceRequest;
    }

    @Generated
    public void setDaysRemaining(final Long daysRemaining) {
        this.daysRemaining = daysRemaining;
    }

    @Generated
    public void setTimeline(final List<TimelineEventDTO> timeline) {
        this.timeline = timeline;
    }

    @Generated
    public void setDocuments(final List<DocumentDTO> documents) {
        this.documents = documents;
    }

    @Generated
    public void setHasCertificate(final boolean hasCertificate) {
        this.hasCertificate = hasCertificate;
    }

    @Generated
    public void setCertificateUrl(final String certificateUrl) {
        this.certificateUrl = certificateUrl;
    }

    @Generated
    public void setCertificateGeneratedDate(final LocalDateTime certificateGeneratedDate) {
        this.certificateGeneratedDate = certificateGeneratedDate;
    }

    @Generated
    public void setCertificateExpiryDate(final LocalDateTime certificateExpiryDate) {
        this.certificateExpiryDate = certificateExpiryDate;
    }

    @Generated
    public void setHasPendingNotifications(final boolean hasPendingNotifications) {
        this.hasPendingNotifications = hasPendingNotifications;
    }

    @Generated
    public void setNotificationCount(final int notificationCount) {
        this.notificationCount = notificationCount;
    }

    @Generated
    public void setRecentNotifications(final List<NotificationDTO> recentNotifications) {
        this.recentNotifications = recentNotifications;
    }

    @Generated
    public void setLastNotification(final NotificationDTO lastNotification) {
        this.lastNotification = lastNotification;
    }

    @Generated
    public void setNextAction(final String nextAction) {
        this.nextAction = nextAction;
    }

    @Generated
    public void setAvailableActions(final List<String> availableActions) {
        this.availableActions = availableActions;
    }

    @Generated
    public void setActionButtons(final List<ActionButtonDTO> actionButtons) {
        this.actionButtons = actionButtons;
    }

    @Generated
    public void setMetadata(final Map<String, Object> metadata) {
        this.metadata = metadata;
    }

    @Generated
    public void setQrCodeUrl(final String qrCodeUrl) {
        this.qrCodeUrl = qrCodeUrl;
    }

    @Generated
    public void setClearanceCertificateId(final String clearanceCertificateId) {
        this.clearanceCertificateId = clearanceCertificateId;
    }

    @Generated
    public void setUrgent(final boolean isUrgent) {
        this.isUrgent = isUrgent;
    }

    @Generated
    public void setPriorityLevel(final String priorityLevel) {
        this.priorityLevel = priorityLevel;
    }

    @Generated
    public void setRemarks(final String remarks) {
        this.remarks = remarks;
    }

    @Generated
    public boolean equals(final Object o) {
        if (o == this) {
            return true;
        } else if (!(o instanceof ClearanceResponse)) {
            return false;
        } else {
            ClearanceResponse other = (ClearanceResponse)o;
            if (!other.canEqual(this)) {
                return false;
            } else if (this.isEditable() != other.isEditable()) {
                return false;
            } else if (this.isCanReapply() != other.isCanReapply()) {
                return false;
            } else if (this.getProgressPercentage() != other.getProgressPercentage()) {
                return false;
            } else if (this.getTotalDepartments() != other.getTotalDepartments()) {
                return false;
            } else if (this.getApprovedCount() != other.getApprovedCount()) {
                return false;
            } else if (this.getPendingCount() != other.getPendingCount()) {
                return false;
            } else if (this.getRejectedCount() != other.getRejectedCount()) {
                return false;
            } else if (this.getNotStartedCount() != other.getNotStartedCount()) {
                return false;
            } else if (this.getCompletedCount() != other.getCompletedCount()) {
                return false;
            } else if (this.getDaysSinceRequest() != other.getDaysSinceRequest()) {
                return false;
            } else if (this.isHasCertificate() != other.isHasCertificate()) {
                return false;
            } else if (this.isHasPendingNotifications() != other.isHasPendingNotifications()) {
                return false;
            } else if (this.getNotificationCount() != other.getNotificationCount()) {
                return false;
            } else if (this.isUrgent() != other.isUrgent()) {
                return false;
            } else {
                Object this$daysRemaining = this.getDaysRemaining();
                Object other$daysRemaining = other.getDaysRemaining();
                if (this$daysRemaining == null) {
                    if (other$daysRemaining != null) {
                        return false;
                    }
                } else if (!this$daysRemaining.equals(other$daysRemaining)) {
                    return false;
                }

                Object this$requestId = this.getRequestId();
                Object other$requestId = other.getRequestId();
                if (this$requestId == null) {
                    if (other$requestId != null) {
                        return false;
                    }
                } else if (!this$requestId.equals(other$requestId)) {
                    return false;
                }

                Object this$studentId = this.getStudentId();
                Object other$studentId = other.getStudentId();
                if (this$studentId == null) {
                    if (other$studentId != null) {
                        return false;
                    }
                } else if (!this$studentId.equals(other$studentId)) {
                    return false;
                }

                Object this$registrationNumber = this.getRegistrationNumber();
                Object other$registrationNumber = other.getRegistrationNumber();
                if (this$registrationNumber == null) {
                    if (other$registrationNumber != null) {
                        return false;
                    }
                } else if (!this$registrationNumber.equals(other$registrationNumber)) {
                    return false;
                }

                Object this$studentName = this.getStudentName();
                Object other$studentName = other.getStudentName();
                if (this$studentName == null) {
                    if (other$studentName != null) {
                        return false;
                    }
                } else if (!this$studentName.equals(other$studentName)) {
                    return false;
                }

                Object this$email = this.getEmail();
                Object other$email = other.getEmail();
                if (this$email == null) {
                    if (other$email != null) {
                        return false;
                    }
                } else if (!this$email.equals(other$email)) {
                    return false;
                }

                Object this$phoneNumber = this.getPhoneNumber();
                Object other$phoneNumber = other.getPhoneNumber();
                if (this$phoneNumber == null) {
                    if (other$phoneNumber != null) {
                        return false;
                    }
                } else if (!this$phoneNumber.equals(other$phoneNumber)) {
                    return false;
                }

                Object this$profilePicture = this.getProfilePicture();
                Object other$profilePicture = other.getProfilePicture();
                if (this$profilePicture == null) {
                    if (other$profilePicture != null) {
                        return false;
                    }
                } else if (!this$profilePicture.equals(other$profilePicture)) {
                    return false;
                }

                Object this$programme = this.getProgramme();
                Object other$programme = other.getProgramme();
                if (this$programme == null) {
                    if (other$programme != null) {
                        return false;
                    }
                } else if (!this$programme.equals(other$programme)) {
                    return false;
                }

                Object this$faculty = this.getFaculty();
                Object other$faculty = other.getFaculty();
                if (this$faculty == null) {
                    if (other$faculty != null) {
                        return false;
                    }
                } else if (!this$faculty.equals(other$faculty)) {
                    return false;
                }

                Object this$department = this.getDepartment();
                Object other$department = other.getDepartment();
                if (this$department == null) {
                    if (other$department != null) {
                        return false;
                    }
                } else if (!this$department.equals(other$department)) {
                    return false;
                }

                Object this$departmentCode = this.getDepartmentCode();
                Object other$departmentCode = other.getDepartmentCode();
                if (this$departmentCode == null) {
                    if (other$departmentCode != null) {
                        return false;
                    }
                } else if (!this$departmentCode.equals(other$departmentCode)) {
                    return false;
                }

                Object this$yearOfStudy = this.getYearOfStudy();
                Object other$yearOfStudy = other.getYearOfStudy();
                if (this$yearOfStudy == null) {
                    if (other$yearOfStudy != null) {
                        return false;
                    }
                } else if (!this$yearOfStudy.equals(other$yearOfStudy)) {
                    return false;
                }

                Object this$academicYear = this.getAcademicYear();
                Object other$academicYear = other.getAcademicYear();
                if (this$academicYear == null) {
                    if (other$academicYear != null) {
                        return false;
                    }
                } else if (!this$academicYear.equals(other$academicYear)) {
                    return false;
                }

                Object this$semester = this.getSemester();
                Object other$semester = other.getSemester();
                if (this$semester == null) {
                    if (other$semester != null) {
                        return false;
                    }
                } else if (!this$semester.equals(other$semester)) {
                    return false;
                }

                Object this$studentStatus = this.getStudentStatus();
                Object other$studentStatus = other.getStudentStatus();
                if (this$studentStatus == null) {
                    if (other$studentStatus != null) {
                        return false;
                    }
                } else if (!this$studentStatus.equals(other$studentStatus)) {
                    return false;
                }

                Object this$status = this.getStatus();
                Object other$status = other.getStatus();
                if (this$status == null) {
                    if (other$status != null) {
                        return false;
                    }
                } else if (!this$status.equals(other$status)) {
                    return false;
                }

                Object this$statusMessage = this.getStatusMessage();
                Object other$statusMessage = other.getStatusMessage();
                if (this$statusMessage == null) {
                    if (other$statusMessage != null) {
                        return false;
                    }
                } else if (!this$statusMessage.equals(other$statusMessage)) {
                    return false;
                }

                Object this$statusColor = this.getStatusColor();
                Object other$statusColor = other.getStatusColor();
                if (this$statusColor == null) {
                    if (other$statusColor != null) {
                        return false;
                    }
                } else if (!this$statusColor.equals(other$statusColor)) {
                    return false;
                }

                Object this$statusIcon = this.getStatusIcon();
                Object other$statusIcon = other.getStatusIcon();
                if (this$statusIcon == null) {
                    if (other$statusIcon != null) {
                        return false;
                    }
                } else if (!this$statusIcon.equals(other$statusIcon)) {
                    return false;
                }

                Object this$statusDescription = this.getStatusDescription();
                Object other$statusDescription = other.getStatusDescription();
                if (this$statusDescription == null) {
                    if (other$statusDescription != null) {
                        return false;
                    }
                } else if (!this$statusDescription.equals(other$statusDescription)) {
                    return false;
                }

                Object this$progressText = this.getProgressText();
                Object other$progressText = other.getProgressText();
                if (this$progressText == null) {
                    if (other$progressText != null) {
                        return false;
                    }
                } else if (!this$progressText.equals(other$progressText)) {
                    return false;
                }

                Object this$progressLevel = this.getProgressLevel();
                Object other$progressLevel = other.getProgressLevel();
                if (this$progressLevel == null) {
                    if (other$progressLevel != null) {
                        return false;
                    }
                } else if (!this$progressLevel.equals(other$progressLevel)) {
                    return false;
                }

                Object this$approvals = this.getApprovals();
                Object other$approvals = other.getApprovals();
                if (this$approvals == null) {
                    if (other$approvals != null) {
                        return false;
                    }
                } else if (!this$approvals.equals(other$approvals)) {
                    return false;
                }

                Object this$departmentSummary = this.getDepartmentSummary();
                Object other$departmentSummary = other.getDepartmentSummary();
                if (this$departmentSummary == null) {
                    if (other$departmentSummary != null) {
                        return false;
                    }
                } else if (!this$departmentSummary.equals(other$departmentSummary)) {
                    return false;
                }

                Object this$requestDate = this.getRequestDate();
                Object other$requestDate = other.getRequestDate();
                if (this$requestDate == null) {
                    if (other$requestDate != null) {
                        return false;
                    }
                } else if (!this$requestDate.equals(other$requestDate)) {
                    return false;
                }

                Object this$completedDate = this.getCompletedDate();
                Object other$completedDate = other.getCompletedDate();
                if (this$completedDate == null) {
                    if (other$completedDate != null) {
                        return false;
                    }
                } else if (!this$completedDate.equals(other$completedDate)) {
                    return false;
                }

                Object this$lastUpdated = this.getLastUpdated();
                Object other$lastUpdated = other.getLastUpdated();
                if (this$lastUpdated == null) {
                    if (other$lastUpdated != null) {
                        return false;
                    }
                } else if (!this$lastUpdated.equals(other$lastUpdated)) {
                    return false;
                }

                Object this$estimatedCompletionDate = this.getEstimatedCompletionDate();
                Object other$estimatedCompletionDate = other.getEstimatedCompletionDate();
                if (this$estimatedCompletionDate == null) {
                    if (other$estimatedCompletionDate != null) {
                        return false;
                    }
                } else if (!this$estimatedCompletionDate.equals(other$estimatedCompletionDate)) {
                    return false;
                }

                Object this$timeline = this.getTimeline();
                Object other$timeline = other.getTimeline();
                if (this$timeline == null) {
                    if (other$timeline != null) {
                        return false;
                    }
                } else if (!this$timeline.equals(other$timeline)) {
                    return false;
                }

                Object this$documents = this.getDocuments();
                Object other$documents = other.getDocuments();
                if (this$documents == null) {
                    if (other$documents != null) {
                        return false;
                    }
                } else if (!this$documents.equals(other$documents)) {
                    return false;
                }

                Object this$certificateUrl = this.getCertificateUrl();
                Object other$certificateUrl = other.getCertificateUrl();
                if (this$certificateUrl == null) {
                    if (other$certificateUrl != null) {
                        return false;
                    }
                } else if (!this$certificateUrl.equals(other$certificateUrl)) {
                    return false;
                }

                Object this$certificateGeneratedDate = this.getCertificateGeneratedDate();
                Object other$certificateGeneratedDate = other.getCertificateGeneratedDate();
                if (this$certificateGeneratedDate == null) {
                    if (other$certificateGeneratedDate != null) {
                        return false;
                    }
                } else if (!this$certificateGeneratedDate.equals(other$certificateGeneratedDate)) {
                    return false;
                }

                Object this$certificateExpiryDate = this.getCertificateExpiryDate();
                Object other$certificateExpiryDate = other.getCertificateExpiryDate();
                if (this$certificateExpiryDate == null) {
                    if (other$certificateExpiryDate != null) {
                        return false;
                    }
                } else if (!this$certificateExpiryDate.equals(other$certificateExpiryDate)) {
                    return false;
                }

                Object this$recentNotifications = this.getRecentNotifications();
                Object other$recentNotifications = other.getRecentNotifications();
                if (this$recentNotifications == null) {
                    if (other$recentNotifications != null) {
                        return false;
                    }
                } else if (!this$recentNotifications.equals(other$recentNotifications)) {
                    return false;
                }

                Object this$lastNotification = this.getLastNotification();
                Object other$lastNotification = other.getLastNotification();
                if (this$lastNotification == null) {
                    if (other$lastNotification != null) {
                        return false;
                    }
                } else if (!this$lastNotification.equals(other$lastNotification)) {
                    return false;
                }

                Object this$nextAction = this.getNextAction();
                Object other$nextAction = other.getNextAction();
                if (this$nextAction == null) {
                    if (other$nextAction != null) {
                        return false;
                    }
                } else if (!this$nextAction.equals(other$nextAction)) {
                    return false;
                }

                Object this$availableActions = this.getAvailableActions();
                Object other$availableActions = other.getAvailableActions();
                if (this$availableActions == null) {
                    if (other$availableActions != null) {
                        return false;
                    }
                } else if (!this$availableActions.equals(other$availableActions)) {
                    return false;
                }

                Object this$actionButtons = this.getActionButtons();
                Object other$actionButtons = other.getActionButtons();
                if (this$actionButtons == null) {
                    if (other$actionButtons != null) {
                        return false;
                    }
                } else if (!this$actionButtons.equals(other$actionButtons)) {
                    return false;
                }

                Object this$metadata = this.getMetadata();
                Object other$metadata = other.getMetadata();
                if (this$metadata == null) {
                    if (other$metadata != null) {
                        return false;
                    }
                } else if (!this$metadata.equals(other$metadata)) {
                    return false;
                }

                Object this$qrCodeUrl = this.getQrCodeUrl();
                Object other$qrCodeUrl = other.getQrCodeUrl();
                if (this$qrCodeUrl == null) {
                    if (other$qrCodeUrl != null) {
                        return false;
                    }
                } else if (!this$qrCodeUrl.equals(other$qrCodeUrl)) {
                    return false;
                }

                Object this$clearanceCertificateId = this.getClearanceCertificateId();
                Object other$clearanceCertificateId = other.getClearanceCertificateId();
                if (this$clearanceCertificateId == null) {
                    if (other$clearanceCertificateId != null) {
                        return false;
                    }
                } else if (!this$clearanceCertificateId.equals(other$clearanceCertificateId)) {
                    return false;
                }

                Object this$priorityLevel = this.getPriorityLevel();
                Object other$priorityLevel = other.getPriorityLevel();
                if (this$priorityLevel == null) {
                    if (other$priorityLevel != null) {
                        return false;
                    }
                } else if (!this$priorityLevel.equals(other$priorityLevel)) {
                    return false;
                }

                Object this$remarks = this.getRemarks();
                Object other$remarks = other.getRemarks();
                if (this$remarks == null) {
                    if (other$remarks != null) {
                        return false;
                    }
                } else if (!this$remarks.equals(other$remarks)) {
                    return false;
                }

                return true;
            }
        }
    }

    @Generated
    protected boolean canEqual(final Object other) {
        return other instanceof ClearanceResponse;
    }

    @Generated
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + (this.isEditable() ? 79 : 97);
        result = result * 59 + (this.isCanReapply() ? 79 : 97);
        result = result * 59 + this.getProgressPercentage();
        result = result * 59 + this.getTotalDepartments();
        result = result * 59 + this.getApprovedCount();
        result = result * 59 + this.getPendingCount();
        result = result * 59 + this.getRejectedCount();
        result = result * 59 + this.getNotStartedCount();
        result = result * 59 + this.getCompletedCount();
        result = result * 59 + this.getDaysSinceRequest();
        result = result * 59 + (this.isHasCertificate() ? 79 : 97);
        result = result * 59 + (this.isHasPendingNotifications() ? 79 : 97);
        result = result * 59 + this.getNotificationCount();
        result = result * 59 + (this.isUrgent() ? 79 : 97);
        Object $daysRemaining = this.getDaysRemaining();
        result = result * 59 + ($daysRemaining == null ? 43 : $daysRemaining.hashCode());
        Object $requestId = this.getRequestId();
        result = result * 59 + ($requestId == null ? 43 : $requestId.hashCode());
        Object $studentId = this.getStudentId();
        result = result * 59 + ($studentId == null ? 43 : $studentId.hashCode());
        Object $registrationNumber = this.getRegistrationNumber();
        result = result * 59 + ($registrationNumber == null ? 43 : $registrationNumber.hashCode());
        Object $studentName = this.getStudentName();
        result = result * 59 + ($studentName == null ? 43 : $studentName.hashCode());
        Object $email = this.getEmail();
        result = result * 59 + ($email == null ? 43 : $email.hashCode());
        Object $phoneNumber = this.getPhoneNumber();
        result = result * 59 + ($phoneNumber == null ? 43 : $phoneNumber.hashCode());
        Object $profilePicture = this.getProfilePicture();
        result = result * 59 + ($profilePicture == null ? 43 : $profilePicture.hashCode());
        Object $programme = this.getProgramme();
        result = result * 59 + ($programme == null ? 43 : $programme.hashCode());
        Object $faculty = this.getFaculty();
        result = result * 59 + ($faculty == null ? 43 : $faculty.hashCode());
        Object $department = this.getDepartment();
        result = result * 59 + ($department == null ? 43 : $department.hashCode());
        Object $departmentCode = this.getDepartmentCode();
        result = result * 59 + ($departmentCode == null ? 43 : $departmentCode.hashCode());
        Object $yearOfStudy = this.getYearOfStudy();
        result = result * 59 + ($yearOfStudy == null ? 43 : $yearOfStudy.hashCode());
        Object $academicYear = this.getAcademicYear();
        result = result * 59 + ($academicYear == null ? 43 : $academicYear.hashCode());
        Object $semester = this.getSemester();
        result = result * 59 + ($semester == null ? 43 : $semester.hashCode());
        Object $studentStatus = this.getStudentStatus();
        result = result * 59 + ($studentStatus == null ? 43 : $studentStatus.hashCode());
        Object $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : $status.hashCode());
        Object $statusMessage = this.getStatusMessage();
        result = result * 59 + ($statusMessage == null ? 43 : $statusMessage.hashCode());
        Object $statusColor = this.getStatusColor();
        result = result * 59 + ($statusColor == null ? 43 : $statusColor.hashCode());
        Object $statusIcon = this.getStatusIcon();
        result = result * 59 + ($statusIcon == null ? 43 : $statusIcon.hashCode());
        Object $statusDescription = this.getStatusDescription();
        result = result * 59 + ($statusDescription == null ? 43 : $statusDescription.hashCode());
        Object $progressText = this.getProgressText();
        result = result * 59 + ($progressText == null ? 43 : $progressText.hashCode());
        Object $progressLevel = this.getProgressLevel();
        result = result * 59 + ($progressLevel == null ? 43 : $progressLevel.hashCode());
        Object $approvals = this.getApprovals();
        result = result * 59 + ($approvals == null ? 43 : $approvals.hashCode());
        Object $departmentSummary = this.getDepartmentSummary();
        result = result * 59 + ($departmentSummary == null ? 43 : $departmentSummary.hashCode());
        Object $requestDate = this.getRequestDate();
        result = result * 59 + ($requestDate == null ? 43 : $requestDate.hashCode());
        Object $completedDate = this.getCompletedDate();
        result = result * 59 + ($completedDate == null ? 43 : $completedDate.hashCode());
        Object $lastUpdated = this.getLastUpdated();
        result = result * 59 + ($lastUpdated == null ? 43 : $lastUpdated.hashCode());
        Object $estimatedCompletionDate = this.getEstimatedCompletionDate();
        result = result * 59 + ($estimatedCompletionDate == null ? 43 : $estimatedCompletionDate.hashCode());
        Object $timeline = this.getTimeline();
        result = result * 59 + ($timeline == null ? 43 : $timeline.hashCode());
        Object $documents = this.getDocuments();
        result = result * 59 + ($documents == null ? 43 : $documents.hashCode());
        Object $certificateUrl = this.getCertificateUrl();
        result = result * 59 + ($certificateUrl == null ? 43 : $certificateUrl.hashCode());
        Object $certificateGeneratedDate = this.getCertificateGeneratedDate();
        result = result * 59 + ($certificateGeneratedDate == null ? 43 : $certificateGeneratedDate.hashCode());
        Object $certificateExpiryDate = this.getCertificateExpiryDate();
        result = result * 59 + ($certificateExpiryDate == null ? 43 : $certificateExpiryDate.hashCode());
        Object $recentNotifications = this.getRecentNotifications();
        result = result * 59 + ($recentNotifications == null ? 43 : $recentNotifications.hashCode());
        Object $lastNotification = this.getLastNotification();
        result = result * 59 + ($lastNotification == null ? 43 : $lastNotification.hashCode());
        Object $nextAction = this.getNextAction();
        result = result * 59 + ($nextAction == null ? 43 : $nextAction.hashCode());
        Object $availableActions = this.getAvailableActions();
        result = result * 59 + ($availableActions == null ? 43 : $availableActions.hashCode());
        Object $actionButtons = this.getActionButtons();
        result = result * 59 + ($actionButtons == null ? 43 : $actionButtons.hashCode());
        Object $metadata = this.getMetadata();
        result = result * 59 + ($metadata == null ? 43 : $metadata.hashCode());
        Object $qrCodeUrl = this.getQrCodeUrl();
        result = result * 59 + ($qrCodeUrl == null ? 43 : $qrCodeUrl.hashCode());
        Object $clearanceCertificateId = this.getClearanceCertificateId();
        result = result * 59 + ($clearanceCertificateId == null ? 43 : $clearanceCertificateId.hashCode());
        Object $priorityLevel = this.getPriorityLevel();
        result = result * 59 + ($priorityLevel == null ? 43 : $priorityLevel.hashCode());
        Object $remarks = this.getRemarks();
        result = result * 59 + ($remarks == null ? 43 : $remarks.hashCode());
        return result;
    }

    @Generated
    public String toString() {
        String var10000 = this.getRequestId();
        return "ClearanceResponse(requestId=" + var10000 + ", studentId=" + this.getStudentId() + ", registrationNumber=" + this.getRegistrationNumber() + ", studentName=" + this.getStudentName() + ", email=" + this.getEmail() + ", phoneNumber=" + this.getPhoneNumber() + ", profilePicture=" + this.getProfilePicture() + ", programme=" + this.getProgramme() + ", faculty=" + this.getFaculty() + ", department=" + this.getDepartment() + ", departmentCode=" + this.getDepartmentCode() + ", yearOfStudy=" + this.getYearOfStudy() + ", academicYear=" + this.getAcademicYear() + ", semester=" + this.getSemester() + ", studentStatus=" + this.getStudentStatus() + ", status=" + String.valueOf(this.getStatus()) + ", statusMessage=" + this.getStatusMessage() + ", statusColor=" + this.getStatusColor() + ", statusIcon=" + this.getStatusIcon() + ", statusDescription=" + this.getStatusDescription() + ", isEditable=" + this.isEditable() + ", canReapply=" + this.isCanReapply() + ", progressPercentage=" + this.getProgressPercentage() + ", totalDepartments=" + this.getTotalDepartments() + ", approvedCount=" + this.getApprovedCount() + ", pendingCount=" + this.getPendingCount() + ", rejectedCount=" + this.getRejectedCount() + ", notStartedCount=" + this.getNotStartedCount() + ", completedCount=" + this.getCompletedCount() + ", progressText=" + this.getProgressText() + ", progressLevel=" + this.getProgressLevel() + ", approvals=" + String.valueOf(this.getApprovals()) + ", departmentSummary=" + String.valueOf(this.getDepartmentSummary()) + ", requestDate=" + String.valueOf(this.getRequestDate()) + ", completedDate=" + String.valueOf(this.getCompletedDate()) + ", lastUpdated=" + String.valueOf(this.getLastUpdated()) + ", estimatedCompletionDate=" + this.getEstimatedCompletionDate() + ", daysSinceRequest=" + this.getDaysSinceRequest() + ", daysRemaining=" + String.valueOf(this.getDaysRemaining()) + ", timeline=" + String.valueOf(this.getTimeline()) + ", documents=" + String.valueOf(this.getDocuments()) + ", hasCertificate=" + this.isHasCertificate() + ", certificateUrl=" + this.getCertificateUrl() + ", certificateGeneratedDate=" + String.valueOf(this.getCertificateGeneratedDate()) + ", certificateExpiryDate=" + String.valueOf(this.getCertificateExpiryDate()) + ", hasPendingNotifications=" + this.isHasPendingNotifications() + ", notificationCount=" + this.getNotificationCount() + ", recentNotifications=" + String.valueOf(this.getRecentNotifications()) + ", lastNotification=" + String.valueOf(this.getLastNotification()) + ", nextAction=" + this.getNextAction() + ", availableActions=" + String.valueOf(this.getAvailableActions()) + ", actionButtons=" + String.valueOf(this.getActionButtons()) + ", metadata=" + String.valueOf(this.getMetadata()) + ", qrCodeUrl=" + this.getQrCodeUrl() + ", clearanceCertificateId=" + this.getClearanceCertificateId() + ", isUrgent=" + this.isUrgent() + ", priorityLevel=" + this.getPriorityLevel() + ", remarks=" + this.getRemarks() + ")";
    }

    @Generated
    public ClearanceResponse() {
    }

    @Generated
    public ClearanceResponse(final String requestId, final String studentId, final String registrationNumber, final String studentName, final String email, final String phoneNumber, final String profilePicture, final String programme, final String faculty, final String department, final String departmentCode, final String yearOfStudy, final String academicYear, final String semester, final String studentStatus, final ClearanceStatus status, final String statusMessage, final String statusColor, final String statusIcon, final String statusDescription, final boolean isEditable, final boolean canReapply, final int progressPercentage, final int totalDepartments, final int approvedCount, final int pendingCount, final int rejectedCount, final int notStartedCount, final int completedCount, final String progressText, final String progressLevel, final List<DepartmentApprovalDTO> approvals, final Map<String, DepartmentSummaryDTO> departmentSummary, final LocalDateTime requestDate, final LocalDateTime completedDate, final LocalDateTime lastUpdated, final String estimatedCompletionDate, final int daysSinceRequest, final Long daysRemaining, final List<TimelineEventDTO> timeline, final List<DocumentDTO> documents, final boolean hasCertificate, final String certificateUrl, final LocalDateTime certificateGeneratedDate, final LocalDateTime certificateExpiryDate, final boolean hasPendingNotifications, final int notificationCount, final List<NotificationDTO> recentNotifications, final NotificationDTO lastNotification, final String nextAction, final List<String> availableActions, final List<ActionButtonDTO> actionButtons, final Map<String, Object> metadata, final String qrCodeUrl, final String clearanceCertificateId, final boolean isUrgent, final String priorityLevel, final String remarks) {
        this.requestId = requestId;
        this.studentId = studentId;
        this.registrationNumber = registrationNumber;
        this.studentName = studentName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.profilePicture = profilePicture;
        this.programme = programme;
        this.faculty = faculty;
        this.department = department;
        this.departmentCode = departmentCode;
        this.yearOfStudy = yearOfStudy;
        this.academicYear = academicYear;
        this.semester = semester;
        this.studentStatus = studentStatus;
        this.status = status;
        this.statusMessage = statusMessage;
        this.statusColor = statusColor;
        this.statusIcon = statusIcon;
        this.statusDescription = statusDescription;
        this.isEditable = isEditable;
        this.canReapply = canReapply;
        this.progressPercentage = progressPercentage;
        this.totalDepartments = totalDepartments;
        this.approvedCount = approvedCount;
        this.pendingCount = pendingCount;
        this.rejectedCount = rejectedCount;
        this.notStartedCount = notStartedCount;
        this.completedCount = completedCount;
        this.progressText = progressText;
        this.progressLevel = progressLevel;
        this.approvals = approvals;
        this.departmentSummary = departmentSummary;
        this.requestDate = requestDate;
        this.completedDate = completedDate;
        this.lastUpdated = lastUpdated;
        this.estimatedCompletionDate = estimatedCompletionDate;
        this.daysSinceRequest = daysSinceRequest;
        this.daysRemaining = daysRemaining;
        this.timeline = timeline;
        this.documents = documents;
        this.hasCertificate = hasCertificate;
        this.certificateUrl = certificateUrl;
        this.certificateGeneratedDate = certificateGeneratedDate;
        this.certificateExpiryDate = certificateExpiryDate;
        this.hasPendingNotifications = hasPendingNotifications;
        this.notificationCount = notificationCount;
        this.recentNotifications = recentNotifications;
        this.lastNotification = lastNotification;
        this.nextAction = nextAction;
        this.availableActions = availableActions;
        this.actionButtons = actionButtons;
        this.metadata = metadata;
        this.qrCodeUrl = qrCodeUrl;
        this.clearanceCertificateId = clearanceCertificateId;
        this.isUrgent = isUrgent;
        this.priorityLevel = priorityLevel;
        this.remarks = remarks;
    }

    @JsonInclude(Include.NON_NULL)
    public static class DepartmentApprovalDTO {
        @JsonProperty("id")
        private String id;
        @JsonProperty("department_id")
        private String departmentId;
        @JsonProperty("department_name")
        private String departmentName;
        @JsonProperty("department_code")
        private String departmentCode;
        @JsonProperty("department_icon")
        private String departmentIcon;
        @JsonProperty("department_color")
        private String departmentColor;
        @JsonProperty("status")
        private ClearanceStatus status;
        @JsonProperty("status_message")
        private String statusMessage;
        @JsonProperty("status_color")
        private String statusColor;
        @JsonProperty("status_icon")
        private String statusIcon;
        @JsonProperty("approved_by")
        private String approvedBy;
        @JsonProperty("approver_title")
        private String approverTitle;
        @JsonProperty("approval_date")
        private LocalDateTime approvalDate;
        @JsonProperty("comments")
        private String comments;
        @JsonProperty("rejection_reason")
        private String rejectionReason;
        @JsonProperty("requirements")
        private List<RequirementDTO> requirements = new ArrayList();
        @JsonProperty("has_action_required")
        private boolean hasActionRequired;
        @JsonProperty("action_url")
        private String actionUrl;
        @JsonProperty("action_text")
        private String actionText;
        @JsonProperty("order")
        private int order;
        @JsonProperty("is_mandatory")
        private boolean isMandatory = true;
        @JsonProperty("is_completed")
        private boolean isCompleted;
        @JsonProperty("completion_date")
        private LocalDateTime completionDate;
        @JsonProperty("contact_person")
        private String contactPerson;
        @JsonProperty("contact_phone")
        private String contactPhone;
        @JsonProperty("contact_email")
        private String contactEmail;
        @JsonProperty("office_location")
        private String officeLocation;
        @JsonProperty("working_hours")
        private String workingHours;
        @JsonProperty("additional_notes")
        private String additionalNotes;
        @JsonProperty("attachments")
        private List<AttachmentDTO> attachments = new ArrayList();

        @Generated
        public static DepartmentApprovalDTOBuilder builder() {
            return new DepartmentApprovalDTOBuilder();
        }

        @Generated
        public String getId() {
            return this.id;
        }

        @Generated
        public String getDepartmentId() {
            return this.departmentId;
        }

        @Generated
        public String getDepartmentName() {
            return this.departmentName;
        }

        @Generated
        public String getDepartmentCode() {
            return this.departmentCode;
        }

        @Generated
        public String getDepartmentIcon() {
            return this.departmentIcon;
        }

        @Generated
        public String getDepartmentColor() {
            return this.departmentColor;
        }

        @Generated
        public ClearanceStatus getStatus() {
            return this.status;
        }

        @Generated
        public String getStatusMessage() {
            return this.statusMessage;
        }

        @Generated
        public String getStatusColor() {
            return this.statusColor;
        }

        @Generated
        public String getStatusIcon() {
            return this.statusIcon;
        }

        @Generated
        public String getApprovedBy() {
            return this.approvedBy;
        }

        @Generated
        public String getApproverTitle() {
            return this.approverTitle;
        }

        @Generated
        public LocalDateTime getApprovalDate() {
            return this.approvalDate;
        }

        @Generated
        public String getComments() {
            return this.comments;
        }

        @Generated
        public String getRejectionReason() {
            return this.rejectionReason;
        }

        @Generated
        public List<RequirementDTO> getRequirements() {
            return this.requirements;
        }

        @Generated
        public boolean isHasActionRequired() {
            return this.hasActionRequired;
        }

        @Generated
        public String getActionUrl() {
            return this.actionUrl;
        }

        @Generated
        public String getActionText() {
            return this.actionText;
        }

        @Generated
        public int getOrder() {
            return this.order;
        }

        @Generated
        public boolean isMandatory() {
            return this.isMandatory;
        }

        @Generated
        public boolean isCompleted() {
            return this.isCompleted;
        }

        @Generated
        public LocalDateTime getCompletionDate() {
            return this.completionDate;
        }

        @Generated
        public String getContactPerson() {
            return this.contactPerson;
        }

        @Generated
        public String getContactPhone() {
            return this.contactPhone;
        }

        @Generated
        public String getContactEmail() {
            return this.contactEmail;
        }

        @Generated
        public String getOfficeLocation() {
            return this.officeLocation;
        }

        @Generated
        public String getWorkingHours() {
            return this.workingHours;
        }

        @Generated
        public String getAdditionalNotes() {
            return this.additionalNotes;
        }

        @Generated
        public List<AttachmentDTO> getAttachments() {
            return this.attachments;
        }

        @Generated
        public void setId(final String id) {
            this.id = id;
        }

        @Generated
        public void setDepartmentId(final String departmentId) {
            this.departmentId = departmentId;
        }

        @Generated
        public void setDepartmentName(final String departmentName) {
            this.departmentName = departmentName;
        }

        @Generated
        public void setDepartmentCode(final String departmentCode) {
            this.departmentCode = departmentCode;
        }

        @Generated
        public void setDepartmentIcon(final String departmentIcon) {
            this.departmentIcon = departmentIcon;
        }

        @Generated
        public void setDepartmentColor(final String departmentColor) {
            this.departmentColor = departmentColor;
        }

        @Generated
        public void setStatus(final ClearanceStatus status) {
            this.status = status;
        }

        @Generated
        public void setStatusMessage(final String statusMessage) {
            this.statusMessage = statusMessage;
        }

        @Generated
        public void setStatusColor(final String statusColor) {
            this.statusColor = statusColor;
        }

        @Generated
        public void setStatusIcon(final String statusIcon) {
            this.statusIcon = statusIcon;
        }

        @Generated
        public void setApprovedBy(final String approvedBy) {
            this.approvedBy = approvedBy;
        }

        @Generated
        public void setApproverTitle(final String approverTitle) {
            this.approverTitle = approverTitle;
        }

        @Generated
        public void setApprovalDate(final LocalDateTime approvalDate) {
            this.approvalDate = approvalDate;
        }

        @Generated
        public void setComments(final String comments) {
            this.comments = comments;
        }

        @Generated
        public void setRejectionReason(final String rejectionReason) {
            this.rejectionReason = rejectionReason;
        }

        @Generated
        public void setRequirements(final List<RequirementDTO> requirements) {
            this.requirements = requirements;
        }

        @Generated
        public void setHasActionRequired(final boolean hasActionRequired) {
            this.hasActionRequired = hasActionRequired;
        }

        @Generated
        public void setActionUrl(final String actionUrl) {
            this.actionUrl = actionUrl;
        }

        @Generated
        public void setActionText(final String actionText) {
            this.actionText = actionText;
        }

        @Generated
        public void setOrder(final int order) {
            this.order = order;
        }

        @Generated
        public void setMandatory(final boolean isMandatory) {
            this.isMandatory = isMandatory;
        }

        @Generated
        public void setCompleted(final boolean isCompleted) {
            this.isCompleted = isCompleted;
        }

        @Generated
        public void setCompletionDate(final LocalDateTime completionDate) {
            this.completionDate = completionDate;
        }

        @Generated
        public void setContactPerson(final String contactPerson) {
            this.contactPerson = contactPerson;
        }

        @Generated
        public void setContactPhone(final String contactPhone) {
            this.contactPhone = contactPhone;
        }

        @Generated
        public void setContactEmail(final String contactEmail) {
            this.contactEmail = contactEmail;
        }

        @Generated
        public void setOfficeLocation(final String officeLocation) {
            this.officeLocation = officeLocation;
        }

        @Generated
        public void setWorkingHours(final String workingHours) {
            this.workingHours = workingHours;
        }

        @Generated
        public void setAdditionalNotes(final String additionalNotes) {
            this.additionalNotes = additionalNotes;
        }

        @Generated
        public void setAttachments(final List<AttachmentDTO> attachments) {
            this.attachments = attachments;
        }

        @Generated
        public boolean equals(final Object o) {
            if (o == this) {
                return true;
            } else if (!(o instanceof DepartmentApprovalDTO)) {
                return false;
            } else {
                DepartmentApprovalDTO other = (DepartmentApprovalDTO)o;
                if (!other.canEqual(this)) {
                    return false;
                } else if (this.isHasActionRequired() != other.isHasActionRequired()) {
                    return false;
                } else if (this.getOrder() != other.getOrder()) {
                    return false;
                } else if (this.isMandatory() != other.isMandatory()) {
                    return false;
                } else if (this.isCompleted() != other.isCompleted()) {
                    return false;
                } else {
                    Object this$id = this.getId();
                    Object other$id = other.getId();
                    if (this$id == null) {
                        if (other$id != null) {
                            return false;
                        }
                    } else if (!this$id.equals(other$id)) {
                        return false;
                    }

                    Object this$departmentId = this.getDepartmentId();
                    Object other$departmentId = other.getDepartmentId();
                    if (this$departmentId == null) {
                        if (other$departmentId != null) {
                            return false;
                        }
                    } else if (!this$departmentId.equals(other$departmentId)) {
                        return false;
                    }

                    Object this$departmentName = this.getDepartmentName();
                    Object other$departmentName = other.getDepartmentName();
                    if (this$departmentName == null) {
                        if (other$departmentName != null) {
                            return false;
                        }
                    } else if (!this$departmentName.equals(other$departmentName)) {
                        return false;
                    }

                    Object this$departmentCode = this.getDepartmentCode();
                    Object other$departmentCode = other.getDepartmentCode();
                    if (this$departmentCode == null) {
                        if (other$departmentCode != null) {
                            return false;
                        }
                    } else if (!this$departmentCode.equals(other$departmentCode)) {
                        return false;
                    }

                    Object this$departmentIcon = this.getDepartmentIcon();
                    Object other$departmentIcon = other.getDepartmentIcon();
                    if (this$departmentIcon == null) {
                        if (other$departmentIcon != null) {
                            return false;
                        }
                    } else if (!this$departmentIcon.equals(other$departmentIcon)) {
                        return false;
                    }

                    Object this$departmentColor = this.getDepartmentColor();
                    Object other$departmentColor = other.getDepartmentColor();
                    if (this$departmentColor == null) {
                        if (other$departmentColor != null) {
                            return false;
                        }
                    } else if (!this$departmentColor.equals(other$departmentColor)) {
                        return false;
                    }

                    Object this$status = this.getStatus();
                    Object other$status = other.getStatus();
                    if (this$status == null) {
                        if (other$status != null) {
                            return false;
                        }
                    } else if (!this$status.equals(other$status)) {
                        return false;
                    }

                    Object this$statusMessage = this.getStatusMessage();
                    Object other$statusMessage = other.getStatusMessage();
                    if (this$statusMessage == null) {
                        if (other$statusMessage != null) {
                            return false;
                        }
                    } else if (!this$statusMessage.equals(other$statusMessage)) {
                        return false;
                    }

                    Object this$statusColor = this.getStatusColor();
                    Object other$statusColor = other.getStatusColor();
                    if (this$statusColor == null) {
                        if (other$statusColor != null) {
                            return false;
                        }
                    } else if (!this$statusColor.equals(other$statusColor)) {
                        return false;
                    }

                    Object this$statusIcon = this.getStatusIcon();
                    Object other$statusIcon = other.getStatusIcon();
                    if (this$statusIcon == null) {
                        if (other$statusIcon != null) {
                            return false;
                        }
                    } else if (!this$statusIcon.equals(other$statusIcon)) {
                        return false;
                    }

                    Object this$approvedBy = this.getApprovedBy();
                    Object other$approvedBy = other.getApprovedBy();
                    if (this$approvedBy == null) {
                        if (other$approvedBy != null) {
                            return false;
                        }
                    } else if (!this$approvedBy.equals(other$approvedBy)) {
                        return false;
                    }

                    Object this$approverTitle = this.getApproverTitle();
                    Object other$approverTitle = other.getApproverTitle();
                    if (this$approverTitle == null) {
                        if (other$approverTitle != null) {
                            return false;
                        }
                    } else if (!this$approverTitle.equals(other$approverTitle)) {
                        return false;
                    }

                    Object this$approvalDate = this.getApprovalDate();
                    Object other$approvalDate = other.getApprovalDate();
                    if (this$approvalDate == null) {
                        if (other$approvalDate != null) {
                            return false;
                        }
                    } else if (!this$approvalDate.equals(other$approvalDate)) {
                        return false;
                    }

                    Object this$comments = this.getComments();
                    Object other$comments = other.getComments();
                    if (this$comments == null) {
                        if (other$comments != null) {
                            return false;
                        }
                    } else if (!this$comments.equals(other$comments)) {
                        return false;
                    }

                    Object this$rejectionReason = this.getRejectionReason();
                    Object other$rejectionReason = other.getRejectionReason();
                    if (this$rejectionReason == null) {
                        if (other$rejectionReason != null) {
                            return false;
                        }
                    } else if (!this$rejectionReason.equals(other$rejectionReason)) {
                        return false;
                    }

                    Object this$requirements = this.getRequirements();
                    Object other$requirements = other.getRequirements();
                    if (this$requirements == null) {
                        if (other$requirements != null) {
                            return false;
                        }
                    } else if (!this$requirements.equals(other$requirements)) {
                        return false;
                    }

                    Object this$actionUrl = this.getActionUrl();
                    Object other$actionUrl = other.getActionUrl();
                    if (this$actionUrl == null) {
                        if (other$actionUrl != null) {
                            return false;
                        }
                    } else if (!this$actionUrl.equals(other$actionUrl)) {
                        return false;
                    }

                    Object this$actionText = this.getActionText();
                    Object other$actionText = other.getActionText();
                    if (this$actionText == null) {
                        if (other$actionText != null) {
                            return false;
                        }
                    } else if (!this$actionText.equals(other$actionText)) {
                        return false;
                    }

                    Object this$completionDate = this.getCompletionDate();
                    Object other$completionDate = other.getCompletionDate();
                    if (this$completionDate == null) {
                        if (other$completionDate != null) {
                            return false;
                        }
                    } else if (!this$completionDate.equals(other$completionDate)) {
                        return false;
                    }

                    Object this$contactPerson = this.getContactPerson();
                    Object other$contactPerson = other.getContactPerson();
                    if (this$contactPerson == null) {
                        if (other$contactPerson != null) {
                            return false;
                        }
                    } else if (!this$contactPerson.equals(other$contactPerson)) {
                        return false;
                    }

                    Object this$contactPhone = this.getContactPhone();
                    Object other$contactPhone = other.getContactPhone();
                    if (this$contactPhone == null) {
                        if (other$contactPhone != null) {
                            return false;
                        }
                    } else if (!this$contactPhone.equals(other$contactPhone)) {
                        return false;
                    }

                    Object this$contactEmail = this.getContactEmail();
                    Object other$contactEmail = other.getContactEmail();
                    if (this$contactEmail == null) {
                        if (other$contactEmail != null) {
                            return false;
                        }
                    } else if (!this$contactEmail.equals(other$contactEmail)) {
                        return false;
                    }

                    Object this$officeLocation = this.getOfficeLocation();
                    Object other$officeLocation = other.getOfficeLocation();
                    if (this$officeLocation == null) {
                        if (other$officeLocation != null) {
                            return false;
                        }
                    } else if (!this$officeLocation.equals(other$officeLocation)) {
                        return false;
                    }

                    Object this$workingHours = this.getWorkingHours();
                    Object other$workingHours = other.getWorkingHours();
                    if (this$workingHours == null) {
                        if (other$workingHours != null) {
                            return false;
                        }
                    } else if (!this$workingHours.equals(other$workingHours)) {
                        return false;
                    }

                    Object this$additionalNotes = this.getAdditionalNotes();
                    Object other$additionalNotes = other.getAdditionalNotes();
                    if (this$additionalNotes == null) {
                        if (other$additionalNotes != null) {
                            return false;
                        }
                    } else if (!this$additionalNotes.equals(other$additionalNotes)) {
                        return false;
                    }

                    Object this$attachments = this.getAttachments();
                    Object other$attachments = other.getAttachments();
                    if (this$attachments == null) {
                        if (other$attachments != null) {
                            return false;
                        }
                    } else if (!this$attachments.equals(other$attachments)) {
                        return false;
                    }

                    return true;
                }
            }
        }

        @Generated
        protected boolean canEqual(final Object other) {
            return other instanceof DepartmentApprovalDTO;
        }

        @Generated
        public int hashCode() {
            int PRIME = 59;
            int result = 1;
            result = result * 59 + (this.isHasActionRequired() ? 79 : 97);
            result = result * 59 + this.getOrder();
            result = result * 59 + (this.isMandatory() ? 79 : 97);
            result = result * 59 + (this.isCompleted() ? 79 : 97);
            Object $id = this.getId();
            result = result * 59 + ($id == null ? 43 : $id.hashCode());
            Object $departmentId = this.getDepartmentId();
            result = result * 59 + ($departmentId == null ? 43 : $departmentId.hashCode());
            Object $departmentName = this.getDepartmentName();
            result = result * 59 + ($departmentName == null ? 43 : $departmentName.hashCode());
            Object $departmentCode = this.getDepartmentCode();
            result = result * 59 + ($departmentCode == null ? 43 : $departmentCode.hashCode());
            Object $departmentIcon = this.getDepartmentIcon();
            result = result * 59 + ($departmentIcon == null ? 43 : $departmentIcon.hashCode());
            Object $departmentColor = this.getDepartmentColor();
            result = result * 59 + ($departmentColor == null ? 43 : $departmentColor.hashCode());
            Object $status = this.getStatus();
            result = result * 59 + ($status == null ? 43 : $status.hashCode());
            Object $statusMessage = this.getStatusMessage();
            result = result * 59 + ($statusMessage == null ? 43 : $statusMessage.hashCode());
            Object $statusColor = this.getStatusColor();
            result = result * 59 + ($statusColor == null ? 43 : $statusColor.hashCode());
            Object $statusIcon = this.getStatusIcon();
            result = result * 59 + ($statusIcon == null ? 43 : $statusIcon.hashCode());
            Object $approvedBy = this.getApprovedBy();
            result = result * 59 + ($approvedBy == null ? 43 : $approvedBy.hashCode());
            Object $approverTitle = this.getApproverTitle();
            result = result * 59 + ($approverTitle == null ? 43 : $approverTitle.hashCode());
            Object $approvalDate = this.getApprovalDate();
            result = result * 59 + ($approvalDate == null ? 43 : $approvalDate.hashCode());
            Object $comments = this.getComments();
            result = result * 59 + ($comments == null ? 43 : $comments.hashCode());
            Object $rejectionReason = this.getRejectionReason();
            result = result * 59 + ($rejectionReason == null ? 43 : $rejectionReason.hashCode());
            Object $requirements = this.getRequirements();
            result = result * 59 + ($requirements == null ? 43 : $requirements.hashCode());
            Object $actionUrl = this.getActionUrl();
            result = result * 59 + ($actionUrl == null ? 43 : $actionUrl.hashCode());
            Object $actionText = this.getActionText();
            result = result * 59 + ($actionText == null ? 43 : $actionText.hashCode());
            Object $completionDate = this.getCompletionDate();
            result = result * 59 + ($completionDate == null ? 43 : $completionDate.hashCode());
            Object $contactPerson = this.getContactPerson();
            result = result * 59 + ($contactPerson == null ? 43 : $contactPerson.hashCode());
            Object $contactPhone = this.getContactPhone();
            result = result * 59 + ($contactPhone == null ? 43 : $contactPhone.hashCode());
            Object $contactEmail = this.getContactEmail();
            result = result * 59 + ($contactEmail == null ? 43 : $contactEmail.hashCode());
            Object $officeLocation = this.getOfficeLocation();
            result = result * 59 + ($officeLocation == null ? 43 : $officeLocation.hashCode());
            Object $workingHours = this.getWorkingHours();
            result = result * 59 + ($workingHours == null ? 43 : $workingHours.hashCode());
            Object $additionalNotes = this.getAdditionalNotes();
            result = result * 59 + ($additionalNotes == null ? 43 : $additionalNotes.hashCode());
            Object $attachments = this.getAttachments();
            result = result * 59 + ($attachments == null ? 43 : $attachments.hashCode());
            return result;
        }

        @Generated
        public String toString() {
            String var10000 = this.getId();
            return "ClearanceResponse.DepartmentApprovalDTO(id=" + var10000 + ", departmentId=" + this.getDepartmentId() + ", departmentName=" + this.getDepartmentName() + ", departmentCode=" + this.getDepartmentCode() + ", departmentIcon=" + this.getDepartmentIcon() + ", departmentColor=" + this.getDepartmentColor() + ", status=" + String.valueOf(this.getStatus()) + ", statusMessage=" + this.getStatusMessage() + ", statusColor=" + this.getStatusColor() + ", statusIcon=" + this.getStatusIcon() + ", approvedBy=" + this.getApprovedBy() + ", approverTitle=" + this.getApproverTitle() + ", approvalDate=" + String.valueOf(this.getApprovalDate()) + ", comments=" + this.getComments() + ", rejectionReason=" + this.getRejectionReason() + ", requirements=" + String.valueOf(this.getRequirements()) + ", hasActionRequired=" + this.isHasActionRequired() + ", actionUrl=" + this.getActionUrl() + ", actionText=" + this.getActionText() + ", order=" + this.getOrder() + ", isMandatory=" + this.isMandatory() + ", isCompleted=" + this.isCompleted() + ", completionDate=" + String.valueOf(this.getCompletionDate()) + ", contactPerson=" + this.getContactPerson() + ", contactPhone=" + this.getContactPhone() + ", contactEmail=" + this.getContactEmail() + ", officeLocation=" + this.getOfficeLocation() + ", workingHours=" + this.getWorkingHours() + ", additionalNotes=" + this.getAdditionalNotes() + ", attachments=" + String.valueOf(this.getAttachments()) + ")";
        }

        @Generated
        public DepartmentApprovalDTO() {
        }

        @Generated
        public DepartmentApprovalDTO(final String id, final String departmentId, final String departmentName, final String departmentCode, final String departmentIcon, final String departmentColor, final ClearanceStatus status, final String statusMessage, final String statusColor, final String statusIcon, final String approvedBy, final String approverTitle, final LocalDateTime approvalDate, final String comments, final String rejectionReason, final List<RequirementDTO> requirements, final boolean hasActionRequired, final String actionUrl, final String actionText, final int order, final boolean isMandatory, final boolean isCompleted, final LocalDateTime completionDate, final String contactPerson, final String contactPhone, final String contactEmail, final String officeLocation, final String workingHours, final String additionalNotes, final List<AttachmentDTO> attachments) {
            this.id = id;
            this.departmentId = departmentId;
            this.departmentName = departmentName;
            this.departmentCode = departmentCode;
            this.departmentIcon = departmentIcon;
            this.departmentColor = departmentColor;
            this.status = status;
            this.statusMessage = statusMessage;
            this.statusColor = statusColor;
            this.statusIcon = statusIcon;
            this.approvedBy = approvedBy;
            this.approverTitle = approverTitle;
            this.approvalDate = approvalDate;
            this.comments = comments;
            this.rejectionReason = rejectionReason;
            this.requirements = requirements;
            this.hasActionRequired = hasActionRequired;
            this.actionUrl = actionUrl;
            this.actionText = actionText;
            this.order = order;
            this.isMandatory = isMandatory;
            this.isCompleted = isCompleted;
            this.completionDate = completionDate;
            this.contactPerson = contactPerson;
            this.contactPhone = contactPhone;
            this.contactEmail = contactEmail;
            this.officeLocation = officeLocation;
            this.workingHours = workingHours;
            this.additionalNotes = additionalNotes;
            this.attachments = attachments;
        }

        @Generated
        public static class DepartmentApprovalDTOBuilder {
            @Generated
            private String id;
            @Generated
            private String departmentId;
            @Generated
            private String departmentName;
            @Generated
            private String departmentCode;
            @Generated
            private String departmentIcon;
            @Generated
            private String departmentColor;
            @Generated
            private ClearanceStatus status;
            @Generated
            private String statusMessage;
            @Generated
            private String statusColor;
            @Generated
            private String statusIcon;
            @Generated
            private String approvedBy;
            @Generated
            private String approverTitle;
            @Generated
            private LocalDateTime approvalDate;
            @Generated
            private String comments;
            @Generated
            private String rejectionReason;
            @Generated
            private List<RequirementDTO> requirements;
            @Generated
            private boolean hasActionRequired;
            @Generated
            private String actionUrl;
            @Generated
            private String actionText;
            @Generated
            private int order;
            @Generated
            private boolean isMandatory;
            @Generated
            private boolean isCompleted;
            @Generated
            private LocalDateTime completionDate;
            @Generated
            private String contactPerson;
            @Generated
            private String contactPhone;
            @Generated
            private String contactEmail;
            @Generated
            private String officeLocation;
            @Generated
            private String workingHours;
            @Generated
            private String additionalNotes;
            @Generated
            private List<AttachmentDTO> attachments;

            @Generated
            DepartmentApprovalDTOBuilder() {
            }

            @JsonProperty("id")
            @Generated
            public DepartmentApprovalDTOBuilder id(final String id) {
                this.id = id;
                return this;
            }

            @JsonProperty("department_id")
            @Generated
            public DepartmentApprovalDTOBuilder departmentId(final String departmentId) {
                this.departmentId = departmentId;
                return this;
            }

            @JsonProperty("department_name")
            @Generated
            public DepartmentApprovalDTOBuilder departmentName(final String departmentName) {
                this.departmentName = departmentName;
                return this;
            }

            @JsonProperty("department_code")
            @Generated
            public DepartmentApprovalDTOBuilder departmentCode(final String departmentCode) {
                this.departmentCode = departmentCode;
                return this;
            }

            @JsonProperty("department_icon")
            @Generated
            public DepartmentApprovalDTOBuilder departmentIcon(final String departmentIcon) {
                this.departmentIcon = departmentIcon;
                return this;
            }

            @JsonProperty("department_color")
            @Generated
            public DepartmentApprovalDTOBuilder departmentColor(final String departmentColor) {
                this.departmentColor = departmentColor;
                return this;
            }

            @JsonProperty("status")
            @Generated
            public DepartmentApprovalDTOBuilder status(final ClearanceStatus status) {
                this.status = status;
                return this;
            }

            @JsonProperty("status_message")
            @Generated
            public DepartmentApprovalDTOBuilder statusMessage(final String statusMessage) {
                this.statusMessage = statusMessage;
                return this;
            }

            @JsonProperty("status_color")
            @Generated
            public DepartmentApprovalDTOBuilder statusColor(final String statusColor) {
                this.statusColor = statusColor;
                return this;
            }

            @JsonProperty("status_icon")
            @Generated
            public DepartmentApprovalDTOBuilder statusIcon(final String statusIcon) {
                this.statusIcon = statusIcon;
                return this;
            }

            @JsonProperty("approved_by")
            @Generated
            public DepartmentApprovalDTOBuilder approvedBy(final String approvedBy) {
                this.approvedBy = approvedBy;
                return this;
            }

            @JsonProperty("approver_title")
            @Generated
            public DepartmentApprovalDTOBuilder approverTitle(final String approverTitle) {
                this.approverTitle = approverTitle;
                return this;
            }

            @JsonProperty("approval_date")
            @Generated
            public DepartmentApprovalDTOBuilder approvalDate(final LocalDateTime approvalDate) {
                this.approvalDate = approvalDate;
                return this;
            }

            @JsonProperty("comments")
            @Generated
            public DepartmentApprovalDTOBuilder comments(final String comments) {
                this.comments = comments;
                return this;
            }

            @JsonProperty("rejection_reason")
            @Generated
            public DepartmentApprovalDTOBuilder rejectionReason(final String rejectionReason) {
                this.rejectionReason = rejectionReason;
                return this;
            }

            @JsonProperty("requirements")
            @Generated
            public DepartmentApprovalDTOBuilder requirements(final List<RequirementDTO> requirements) {
                this.requirements = requirements;
                return this;
            }

            @JsonProperty("has_action_required")
            @Generated
            public DepartmentApprovalDTOBuilder hasActionRequired(final boolean hasActionRequired) {
                this.hasActionRequired = hasActionRequired;
                return this;
            }

            @JsonProperty("action_url")
            @Generated
            public DepartmentApprovalDTOBuilder actionUrl(final String actionUrl) {
                this.actionUrl = actionUrl;
                return this;
            }

            @JsonProperty("action_text")
            @Generated
            public DepartmentApprovalDTOBuilder actionText(final String actionText) {
                this.actionText = actionText;
                return this;
            }

            @JsonProperty("order")
            @Generated
            public DepartmentApprovalDTOBuilder order(final int order) {
                this.order = order;
                return this;
            }

            @JsonProperty("is_mandatory")
            @Generated
            public DepartmentApprovalDTOBuilder isMandatory(final boolean isMandatory) {
                this.isMandatory = isMandatory;
                return this;
            }

            @JsonProperty("is_completed")
            @Generated
            public DepartmentApprovalDTOBuilder isCompleted(final boolean isCompleted) {
                this.isCompleted = isCompleted;
                return this;
            }

            @JsonProperty("completion_date")
            @Generated
            public DepartmentApprovalDTOBuilder completionDate(final LocalDateTime completionDate) {
                this.completionDate = completionDate;
                return this;
            }

            @JsonProperty("contact_person")
            @Generated
            public DepartmentApprovalDTOBuilder contactPerson(final String contactPerson) {
                this.contactPerson = contactPerson;
                return this;
            }

            @JsonProperty("contact_phone")
            @Generated
            public DepartmentApprovalDTOBuilder contactPhone(final String contactPhone) {
                this.contactPhone = contactPhone;
                return this;
            }

            @JsonProperty("contact_email")
            @Generated
            public DepartmentApprovalDTOBuilder contactEmail(final String contactEmail) {
                this.contactEmail = contactEmail;
                return this;
            }

            @JsonProperty("office_location")
            @Generated
            public DepartmentApprovalDTOBuilder officeLocation(final String officeLocation) {
                this.officeLocation = officeLocation;
                return this;
            }

            @JsonProperty("working_hours")
            @Generated
            public DepartmentApprovalDTOBuilder workingHours(final String workingHours) {
                this.workingHours = workingHours;
                return this;
            }

            @JsonProperty("additional_notes")
            @Generated
            public DepartmentApprovalDTOBuilder additionalNotes(final String additionalNotes) {
                this.additionalNotes = additionalNotes;
                return this;
            }

            @JsonProperty("attachments")
            @Generated
            public DepartmentApprovalDTOBuilder attachments(final List<AttachmentDTO> attachments) {
                this.attachments = attachments;
                return this;
            }

            @Generated
            public DepartmentApprovalDTO build() {
                return new DepartmentApprovalDTO(this.id, this.departmentId, this.departmentName, this.departmentCode, this.departmentIcon, this.departmentColor, this.status, this.statusMessage, this.statusColor, this.statusIcon, this.approvedBy, this.approverTitle, this.approvalDate, this.comments, this.rejectionReason, this.requirements, this.hasActionRequired, this.actionUrl, this.actionText, this.order, this.isMandatory, this.isCompleted, this.completionDate, this.contactPerson, this.contactPhone, this.contactEmail, this.officeLocation, this.workingHours, this.additionalNotes, this.attachments);
            }

            @Generated
            public String toString() {
                String var10000 = this.id;
                return "ClearanceResponse.DepartmentApprovalDTO.DepartmentApprovalDTOBuilder(id=" + var10000 + ", departmentId=" + this.departmentId + ", departmentName=" + this.departmentName + ", departmentCode=" + this.departmentCode + ", departmentIcon=" + this.departmentIcon + ", departmentColor=" + this.departmentColor + ", status=" + String.valueOf(this.status) + ", statusMessage=" + this.statusMessage + ", statusColor=" + this.statusColor + ", statusIcon=" + this.statusIcon + ", approvedBy=" + this.approvedBy + ", approverTitle=" + this.approverTitle + ", approvalDate=" + String.valueOf(this.approvalDate) + ", comments=" + this.comments + ", rejectionReason=" + this.rejectionReason + ", requirements=" + String.valueOf(this.requirements) + ", hasActionRequired=" + this.hasActionRequired + ", actionUrl=" + this.actionUrl + ", actionText=" + this.actionText + ", order=" + this.order + ", isMandatory=" + this.isMandatory + ", isCompleted=" + this.isCompleted + ", completionDate=" + String.valueOf(this.completionDate) + ", contactPerson=" + this.contactPerson + ", contactPhone=" + this.contactPhone + ", contactEmail=" + this.contactEmail + ", officeLocation=" + this.officeLocation + ", workingHours=" + this.workingHours + ", additionalNotes=" + this.additionalNotes + ", attachments=" + String.valueOf(this.attachments) + ")";
            }
        }
    }

    @JsonInclude(Include.NON_NULL)
    public static class DepartmentSummaryDTO {
        @JsonProperty("department_name")
        private String departmentName;
        @JsonProperty("status")
        private ClearanceStatus status;
        @JsonProperty("status_icon")
        private String statusIcon;
        @JsonProperty("last_updated")
        private LocalDateTime lastUpdated;
        @JsonProperty("notes")
        private String notes;
        @JsonProperty("is_approved")
        private boolean isApproved;
        @JsonProperty("is_rejected")
        private boolean isRejected;
        @JsonProperty("is_pending")
        private boolean isPending;

        @Generated
        public static DepartmentSummaryDTOBuilder builder() {
            return new DepartmentSummaryDTOBuilder();
        }

        @Generated
        public String getDepartmentName() {
            return this.departmentName;
        }

        @Generated
        public ClearanceStatus getStatus() {
            return this.status;
        }

        @Generated
        public String getStatusIcon() {
            return this.statusIcon;
        }

        @Generated
        public LocalDateTime getLastUpdated() {
            return this.lastUpdated;
        }

        @Generated
        public String getNotes() {
            return this.notes;
        }

        @Generated
        public boolean isApproved() {
            return this.isApproved;
        }

        @Generated
        public boolean isRejected() {
            return this.isRejected;
        }

        @Generated
        public boolean isPending() {
            return this.isPending;
        }

        @Generated
        public void setDepartmentName(final String departmentName) {
            this.departmentName = departmentName;
        }

        @Generated
        public void setStatus(final ClearanceStatus status) {
            this.status = status;
        }

        @Generated
        public void setStatusIcon(final String statusIcon) {
            this.statusIcon = statusIcon;
        }

        @Generated
        public void setLastUpdated(final LocalDateTime lastUpdated) {
            this.lastUpdated = lastUpdated;
        }

        @Generated
        public void setNotes(final String notes) {
            this.notes = notes;
        }

        @Generated
        public void setApproved(final boolean isApproved) {
            this.isApproved = isApproved;
        }

        @Generated
        public void setRejected(final boolean isRejected) {
            this.isRejected = isRejected;
        }

        @Generated
        public void setPending(final boolean isPending) {
            this.isPending = isPending;
        }

        @Generated
        public boolean equals(final Object o) {
            if (o == this) {
                return true;
            } else if (!(o instanceof DepartmentSummaryDTO)) {
                return false;
            } else {
                DepartmentSummaryDTO other = (DepartmentSummaryDTO)o;
                if (!other.canEqual(this)) {
                    return false;
                } else if (this.isApproved() != other.isApproved()) {
                    return false;
                } else if (this.isRejected() != other.isRejected()) {
                    return false;
                } else if (this.isPending() != other.isPending()) {
                    return false;
                } else {
                    Object this$departmentName = this.getDepartmentName();
                    Object other$departmentName = other.getDepartmentName();
                    if (this$departmentName == null) {
                        if (other$departmentName != null) {
                            return false;
                        }
                    } else if (!this$departmentName.equals(other$departmentName)) {
                        return false;
                    }

                    Object this$status = this.getStatus();
                    Object other$status = other.getStatus();
                    if (this$status == null) {
                        if (other$status != null) {
                            return false;
                        }
                    } else if (!this$status.equals(other$status)) {
                        return false;
                    }

                    Object this$statusIcon = this.getStatusIcon();
                    Object other$statusIcon = other.getStatusIcon();
                    if (this$statusIcon == null) {
                        if (other$statusIcon != null) {
                            return false;
                        }
                    } else if (!this$statusIcon.equals(other$statusIcon)) {
                        return false;
                    }

                    Object this$lastUpdated = this.getLastUpdated();
                    Object other$lastUpdated = other.getLastUpdated();
                    if (this$lastUpdated == null) {
                        if (other$lastUpdated != null) {
                            return false;
                        }
                    } else if (!this$lastUpdated.equals(other$lastUpdated)) {
                        return false;
                    }

                    Object this$notes = this.getNotes();
                    Object other$notes = other.getNotes();
                    if (this$notes == null) {
                        if (other$notes != null) {
                            return false;
                        }
                    } else if (!this$notes.equals(other$notes)) {
                        return false;
                    }

                    return true;
                }
            }
        }

        @Generated
        protected boolean canEqual(final Object other) {
            return other instanceof DepartmentSummaryDTO;
        }

        @Generated
        public int hashCode() {
            int PRIME = 59;
            int result = 1;
            result = result * 59 + (this.isApproved() ? 79 : 97);
            result = result * 59 + (this.isRejected() ? 79 : 97);
            result = result * 59 + (this.isPending() ? 79 : 97);
            Object $departmentName = this.getDepartmentName();
            result = result * 59 + ($departmentName == null ? 43 : $departmentName.hashCode());
            Object $status = this.getStatus();
            result = result * 59 + ($status == null ? 43 : $status.hashCode());
            Object $statusIcon = this.getStatusIcon();
            result = result * 59 + ($statusIcon == null ? 43 : $statusIcon.hashCode());
            Object $lastUpdated = this.getLastUpdated();
            result = result * 59 + ($lastUpdated == null ? 43 : $lastUpdated.hashCode());
            Object $notes = this.getNotes();
            result = result * 59 + ($notes == null ? 43 : $notes.hashCode());
            return result;
        }

        @Generated
        public String toString() {
            String var10000 = this.getDepartmentName();
            return "ClearanceResponse.DepartmentSummaryDTO(departmentName=" + var10000 + ", status=" + String.valueOf(this.getStatus()) + ", statusIcon=" + this.getStatusIcon() + ", lastUpdated=" + String.valueOf(this.getLastUpdated()) + ", notes=" + this.getNotes() + ", isApproved=" + this.isApproved() + ", isRejected=" + this.isRejected() + ", isPending=" + this.isPending() + ")";
        }

        @Generated
        public DepartmentSummaryDTO() {
        }

        @Generated
        public DepartmentSummaryDTO(final String departmentName, final ClearanceStatus status, final String statusIcon, final LocalDateTime lastUpdated, final String notes, final boolean isApproved, final boolean isRejected, final boolean isPending) {
            this.departmentName = departmentName;
            this.status = status;
            this.statusIcon = statusIcon;
            this.lastUpdated = lastUpdated;
            this.notes = notes;
            this.isApproved = isApproved;
            this.isRejected = isRejected;
            this.isPending = isPending;
        }

        @Generated
        public static class DepartmentSummaryDTOBuilder {
            @Generated
            private String departmentName;
            @Generated
            private ClearanceStatus status;
            @Generated
            private String statusIcon;
            @Generated
            private LocalDateTime lastUpdated;
            @Generated
            private String notes;
            @Generated
            private boolean isApproved;
            @Generated
            private boolean isRejected;
            @Generated
            private boolean isPending;

            @Generated
            DepartmentSummaryDTOBuilder() {
            }

            @JsonProperty("department_name")
            @Generated
            public DepartmentSummaryDTOBuilder departmentName(final String departmentName) {
                this.departmentName = departmentName;
                return this;
            }

            @JsonProperty("status")
            @Generated
            public DepartmentSummaryDTOBuilder status(final ClearanceStatus status) {
                this.status = status;
                return this;
            }

            @JsonProperty("status_icon")
            @Generated
            public DepartmentSummaryDTOBuilder statusIcon(final String statusIcon) {
                this.statusIcon = statusIcon;
                return this;
            }

            @JsonProperty("last_updated")
            @Generated
            public DepartmentSummaryDTOBuilder lastUpdated(final LocalDateTime lastUpdated) {
                this.lastUpdated = lastUpdated;
                return this;
            }

            @JsonProperty("notes")
            @Generated
            public DepartmentSummaryDTOBuilder notes(final String notes) {
                this.notes = notes;
                return this;
            }

            @JsonProperty("is_approved")
            @Generated
            public DepartmentSummaryDTOBuilder isApproved(final boolean isApproved) {
                this.isApproved = isApproved;
                return this;
            }

            @JsonProperty("is_rejected")
            @Generated
            public DepartmentSummaryDTOBuilder isRejected(final boolean isRejected) {
                this.isRejected = isRejected;
                return this;
            }

            @JsonProperty("is_pending")
            @Generated
            public DepartmentSummaryDTOBuilder isPending(final boolean isPending) {
                this.isPending = isPending;
                return this;
            }

            @Generated
            public DepartmentSummaryDTO build() {
                return new DepartmentSummaryDTO(this.departmentName, this.status, this.statusIcon, this.lastUpdated, this.notes, this.isApproved, this.isRejected, this.isPending);
            }

            @Generated
            public String toString() {
                String var10000 = this.departmentName;
                return "ClearanceResponse.DepartmentSummaryDTO.DepartmentSummaryDTOBuilder(departmentName=" + var10000 + ", status=" + String.valueOf(this.status) + ", statusIcon=" + this.statusIcon + ", lastUpdated=" + String.valueOf(this.lastUpdated) + ", notes=" + this.notes + ", isApproved=" + this.isApproved + ", isRejected=" + this.isRejected + ", isPending=" + this.isPending + ")";
            }
        }
    }

    @JsonInclude(Include.NON_NULL)
    public static class DocumentDTO {
        @JsonProperty("id")
        private String id;
        @JsonProperty("document_name")
        private String documentName;
        @JsonProperty("document_type")
        private String documentType;
        @JsonProperty("document_url")
        private String documentUrl;
        @JsonProperty("uploaded_by")
        private String uploadedBy;
        @JsonProperty("uploaded_at")
        private LocalDateTime uploadedAt;
        @JsonProperty("status")
        private String status;
        @JsonProperty("description")
        private String description;
        @JsonProperty("file_size")
        private long fileSize;
        @JsonProperty("file_extension")
        private String fileExtension;
        @JsonProperty("is_verified")
        private boolean isVerified;
        @JsonProperty("verified_by")
        private String verifiedBy;
        @JsonProperty("verified_at")
        private LocalDateTime verifiedAt;

        @Generated
        public static DocumentDTOBuilder builder() {
            return new DocumentDTOBuilder();
        }

        @Generated
        public String getId() {
            return this.id;
        }

        @Generated
        public String getDocumentName() {
            return this.documentName;
        }

        @Generated
        public String getDocumentType() {
            return this.documentType;
        }

        @Generated
        public String getDocumentUrl() {
            return this.documentUrl;
        }

        @Generated
        public String getUploadedBy() {
            return this.uploadedBy;
        }

        @Generated
        public LocalDateTime getUploadedAt() {
            return this.uploadedAt;
        }

        @Generated
        public String getStatus() {
            return this.status;
        }

        @Generated
        public String getDescription() {
            return this.description;
        }

        @Generated
        public long getFileSize() {
            return this.fileSize;
        }

        @Generated
        public String getFileExtension() {
            return this.fileExtension;
        }

        @Generated
        public boolean isVerified() {
            return this.isVerified;
        }

        @Generated
        public String getVerifiedBy() {
            return this.verifiedBy;
        }

        @Generated
        public LocalDateTime getVerifiedAt() {
            return this.verifiedAt;
        }

        @Generated
        public void setId(final String id) {
            this.id = id;
        }

        @Generated
        public void setDocumentName(final String documentName) {
            this.documentName = documentName;
        }

        @Generated
        public void setDocumentType(final String documentType) {
            this.documentType = documentType;
        }

        @Generated
        public void setDocumentUrl(final String documentUrl) {
            this.documentUrl = documentUrl;
        }

        @Generated
        public void setUploadedBy(final String uploadedBy) {
            this.uploadedBy = uploadedBy;
        }

        @Generated
        public void setUploadedAt(final LocalDateTime uploadedAt) {
            this.uploadedAt = uploadedAt;
        }

        @Generated
        public void setStatus(final String status) {
            this.status = status;
        }

        @Generated
        public void setDescription(final String description) {
            this.description = description;
        }

        @Generated
        public void setFileSize(final long fileSize) {
            this.fileSize = fileSize;
        }

        @Generated
        public void setFileExtension(final String fileExtension) {
            this.fileExtension = fileExtension;
        }

        @Generated
        public void setVerified(final boolean isVerified) {
            this.isVerified = isVerified;
        }

        @Generated
        public void setVerifiedBy(final String verifiedBy) {
            this.verifiedBy = verifiedBy;
        }

        @Generated
        public void setVerifiedAt(final LocalDateTime verifiedAt) {
            this.verifiedAt = verifiedAt;
        }

        @Generated
        public boolean equals(final Object o) {
            if (o == this) {
                return true;
            } else if (!(o instanceof DocumentDTO)) {
                return false;
            } else {
                DocumentDTO other = (DocumentDTO)o;
                if (!other.canEqual(this)) {
                    return false;
                } else if (this.getFileSize() != other.getFileSize()) {
                    return false;
                } else if (this.isVerified() != other.isVerified()) {
                    return false;
                } else {
                    Object this$id = this.getId();
                    Object other$id = other.getId();
                    if (this$id == null) {
                        if (other$id != null) {
                            return false;
                        }
                    } else if (!this$id.equals(other$id)) {
                        return false;
                    }

                    Object this$documentName = this.getDocumentName();
                    Object other$documentName = other.getDocumentName();
                    if (this$documentName == null) {
                        if (other$documentName != null) {
                            return false;
                        }
                    } else if (!this$documentName.equals(other$documentName)) {
                        return false;
                    }

                    Object this$documentType = this.getDocumentType();
                    Object other$documentType = other.getDocumentType();
                    if (this$documentType == null) {
                        if (other$documentType != null) {
                            return false;
                        }
                    } else if (!this$documentType.equals(other$documentType)) {
                        return false;
                    }

                    Object this$documentUrl = this.getDocumentUrl();
                    Object other$documentUrl = other.getDocumentUrl();
                    if (this$documentUrl == null) {
                        if (other$documentUrl != null) {
                            return false;
                        }
                    } else if (!this$documentUrl.equals(other$documentUrl)) {
                        return false;
                    }

                    Object this$uploadedBy = this.getUploadedBy();
                    Object other$uploadedBy = other.getUploadedBy();
                    if (this$uploadedBy == null) {
                        if (other$uploadedBy != null) {
                            return false;
                        }
                    } else if (!this$uploadedBy.equals(other$uploadedBy)) {
                        return false;
                    }

                    Object this$uploadedAt = this.getUploadedAt();
                    Object other$uploadedAt = other.getUploadedAt();
                    if (this$uploadedAt == null) {
                        if (other$uploadedAt != null) {
                            return false;
                        }
                    } else if (!this$uploadedAt.equals(other$uploadedAt)) {
                        return false;
                    }

                    Object this$status = this.getStatus();
                    Object other$status = other.getStatus();
                    if (this$status == null) {
                        if (other$status != null) {
                            return false;
                        }
                    } else if (!this$status.equals(other$status)) {
                        return false;
                    }

                    Object this$description = this.getDescription();
                    Object other$description = other.getDescription();
                    if (this$description == null) {
                        if (other$description != null) {
                            return false;
                        }
                    } else if (!this$description.equals(other$description)) {
                        return false;
                    }

                    Object this$fileExtension = this.getFileExtension();
                    Object other$fileExtension = other.getFileExtension();
                    if (this$fileExtension == null) {
                        if (other$fileExtension != null) {
                            return false;
                        }
                    } else if (!this$fileExtension.equals(other$fileExtension)) {
                        return false;
                    }

                    Object this$verifiedBy = this.getVerifiedBy();
                    Object other$verifiedBy = other.getVerifiedBy();
                    if (this$verifiedBy == null) {
                        if (other$verifiedBy != null) {
                            return false;
                        }
                    } else if (!this$verifiedBy.equals(other$verifiedBy)) {
                        return false;
                    }

                    Object this$verifiedAt = this.getVerifiedAt();
                    Object other$verifiedAt = other.getVerifiedAt();
                    if (this$verifiedAt == null) {
                        if (other$verifiedAt != null) {
                            return false;
                        }
                    } else if (!this$verifiedAt.equals(other$verifiedAt)) {
                        return false;
                    }

                    return true;
                }
            }
        }

        @Generated
        protected boolean canEqual(final Object other) {
            return other instanceof DocumentDTO;
        }

        @Generated
        public int hashCode() {
            int PRIME = 59;
            int result = 1;
            long $fileSize = this.getFileSize();
            result = result * 59 + (int)($fileSize ^ $fileSize >>> 32);
            result = result * 59 + (this.isVerified() ? 79 : 97);
            Object $id = this.getId();
            result = result * 59 + ($id == null ? 43 : $id.hashCode());
            Object $documentName = this.getDocumentName();
            result = result * 59 + ($documentName == null ? 43 : $documentName.hashCode());
            Object $documentType = this.getDocumentType();
            result = result * 59 + ($documentType == null ? 43 : $documentType.hashCode());
            Object $documentUrl = this.getDocumentUrl();
            result = result * 59 + ($documentUrl == null ? 43 : $documentUrl.hashCode());
            Object $uploadedBy = this.getUploadedBy();
            result = result * 59 + ($uploadedBy == null ? 43 : $uploadedBy.hashCode());
            Object $uploadedAt = this.getUploadedAt();
            result = result * 59 + ($uploadedAt == null ? 43 : $uploadedAt.hashCode());
            Object $status = this.getStatus();
            result = result * 59 + ($status == null ? 43 : $status.hashCode());
            Object $description = this.getDescription();
            result = result * 59 + ($description == null ? 43 : $description.hashCode());
            Object $fileExtension = this.getFileExtension();
            result = result * 59 + ($fileExtension == null ? 43 : $fileExtension.hashCode());
            Object $verifiedBy = this.getVerifiedBy();
            result = result * 59 + ($verifiedBy == null ? 43 : $verifiedBy.hashCode());
            Object $verifiedAt = this.getVerifiedAt();
            result = result * 59 + ($verifiedAt == null ? 43 : $verifiedAt.hashCode());
            return result;
        }

        @Generated
        public String toString() {
            String var10000 = this.getId();
            return "ClearanceResponse.DocumentDTO(id=" + var10000 + ", documentName=" + this.getDocumentName() + ", documentType=" + this.getDocumentType() + ", documentUrl=" + this.getDocumentUrl() + ", uploadedBy=" + this.getUploadedBy() + ", uploadedAt=" + String.valueOf(this.getUploadedAt()) + ", status=" + this.getStatus() + ", description=" + this.getDescription() + ", fileSize=" + this.getFileSize() + ", fileExtension=" + this.getFileExtension() + ", isVerified=" + this.isVerified() + ", verifiedBy=" + this.getVerifiedBy() + ", verifiedAt=" + String.valueOf(this.getVerifiedAt()) + ")";
        }

        @Generated
        public DocumentDTO() {
        }

        @Generated
        public DocumentDTO(final String id, final String documentName, final String documentType, final String documentUrl, final String uploadedBy, final LocalDateTime uploadedAt, final String status, final String description, final long fileSize, final String fileExtension, final boolean isVerified, final String verifiedBy, final LocalDateTime verifiedAt) {
            this.id = id;
            this.documentName = documentName;
            this.documentType = documentType;
            this.documentUrl = documentUrl;
            this.uploadedBy = uploadedBy;
            this.uploadedAt = uploadedAt;
            this.status = status;
            this.description = description;
            this.fileSize = fileSize;
            this.fileExtension = fileExtension;
            this.isVerified = isVerified;
            this.verifiedBy = verifiedBy;
            this.verifiedAt = verifiedAt;
        }

        @Generated
        public static class DocumentDTOBuilder {
            @Generated
            private String id;
            @Generated
            private String documentName;
            @Generated
            private String documentType;
            @Generated
            private String documentUrl;
            @Generated
            private String uploadedBy;
            @Generated
            private LocalDateTime uploadedAt;
            @Generated
            private String status;
            @Generated
            private String description;
            @Generated
            private long fileSize;
            @Generated
            private String fileExtension;
            @Generated
            private boolean isVerified;
            @Generated
            private String verifiedBy;
            @Generated
            private LocalDateTime verifiedAt;

            @Generated
            DocumentDTOBuilder() {
            }

            @JsonProperty("id")
            @Generated
            public DocumentDTOBuilder id(final String id) {
                this.id = id;
                return this;
            }

            @JsonProperty("document_name")
            @Generated
            public DocumentDTOBuilder documentName(final String documentName) {
                this.documentName = documentName;
                return this;
            }

            @JsonProperty("document_type")
            @Generated
            public DocumentDTOBuilder documentType(final String documentType) {
                this.documentType = documentType;
                return this;
            }

            @JsonProperty("document_url")
            @Generated
            public DocumentDTOBuilder documentUrl(final String documentUrl) {
                this.documentUrl = documentUrl;
                return this;
            }

            @JsonProperty("uploaded_by")
            @Generated
            public DocumentDTOBuilder uploadedBy(final String uploadedBy) {
                this.uploadedBy = uploadedBy;
                return this;
            }

            @JsonProperty("uploaded_at")
            @Generated
            public DocumentDTOBuilder uploadedAt(final LocalDateTime uploadedAt) {
                this.uploadedAt = uploadedAt;
                return this;
            }

            @JsonProperty("status")
            @Generated
            public DocumentDTOBuilder status(final String status) {
                this.status = status;
                return this;
            }

            @JsonProperty("description")
            @Generated
            public DocumentDTOBuilder description(final String description) {
                this.description = description;
                return this;
            }

            @JsonProperty("file_size")
            @Generated
            public DocumentDTOBuilder fileSize(final long fileSize) {
                this.fileSize = fileSize;
                return this;
            }

            @JsonProperty("file_extension")
            @Generated
            public DocumentDTOBuilder fileExtension(final String fileExtension) {
                this.fileExtension = fileExtension;
                return this;
            }

            @JsonProperty("is_verified")
            @Generated
            public DocumentDTOBuilder isVerified(final boolean isVerified) {
                this.isVerified = isVerified;
                return this;
            }

            @JsonProperty("verified_by")
            @Generated
            public DocumentDTOBuilder verifiedBy(final String verifiedBy) {
                this.verifiedBy = verifiedBy;
                return this;
            }

            @JsonProperty("verified_at")
            @Generated
            public DocumentDTOBuilder verifiedAt(final LocalDateTime verifiedAt) {
                this.verifiedAt = verifiedAt;
                return this;
            }

            @Generated
            public DocumentDTO build() {
                return new DocumentDTO(this.id, this.documentName, this.documentType, this.documentUrl, this.uploadedBy, this.uploadedAt, this.status, this.description, this.fileSize, this.fileExtension, this.isVerified, this.verifiedBy, this.verifiedAt);
            }

            @Generated
            public String toString() {
                String var10000 = this.id;
                return "ClearanceResponse.DocumentDTO.DocumentDTOBuilder(id=" + var10000 + ", documentName=" + this.documentName + ", documentType=" + this.documentType + ", documentUrl=" + this.documentUrl + ", uploadedBy=" + this.uploadedBy + ", uploadedAt=" + String.valueOf(this.uploadedAt) + ", status=" + this.status + ", description=" + this.description + ", fileSize=" + this.fileSize + ", fileExtension=" + this.fileExtension + ", isVerified=" + this.isVerified + ", verifiedBy=" + this.verifiedBy + ", verifiedAt=" + String.valueOf(this.verifiedAt) + ")";
            }
        }
    }

    @JsonInclude(Include.NON_NULL)
    public static class NotificationDTO {
        @JsonProperty("id")
        private String id;
        @JsonProperty("title")
        private String title;
        @JsonProperty("message")
        private String message;
        @JsonProperty("type")
        private String type;
        @JsonProperty("type_icon")
        private String typeIcon;
        @JsonProperty("type_color")
        private String typeColor;
        @JsonProperty("is_read")
        private boolean isRead;
        @JsonProperty("created_at")
        private LocalDateTime createdAt;
        @JsonProperty("link")
        private String link;
        @JsonProperty("link_text")
        private String linkText;

        @Generated
        public static NotificationDTOBuilder builder() {
            return new NotificationDTOBuilder();
        }

        @Generated
        public String getId() {
            return this.id;
        }

        @Generated
        public String getTitle() {
            return this.title;
        }

        @Generated
        public String getMessage() {
            return this.message;
        }

        @Generated
        public String getType() {
            return this.type;
        }

        @Generated
        public String getTypeIcon() {
            return this.typeIcon;
        }

        @Generated
        public String getTypeColor() {
            return this.typeColor;
        }

        @Generated
        public boolean isRead() {
            return this.isRead;
        }

        @Generated
        public LocalDateTime getCreatedAt() {
            return this.createdAt;
        }

        @Generated
        public String getLink() {
            return this.link;
        }

        @Generated
        public String getLinkText() {
            return this.linkText;
        }

        @Generated
        public void setId(final String id) {
            this.id = id;
        }

        @Generated
        public void setTitle(final String title) {
            this.title = title;
        }

        @Generated
        public void setMessage(final String message) {
            this.message = message;
        }

        @Generated
        public void setType(final String type) {
            this.type = type;
        }

        @Generated
        public void setTypeIcon(final String typeIcon) {
            this.typeIcon = typeIcon;
        }

        @Generated
        public void setTypeColor(final String typeColor) {
            this.typeColor = typeColor;
        }

        @Generated
        public void setRead(final boolean isRead) {
            this.isRead = isRead;
        }

        @Generated
        public void setCreatedAt(final LocalDateTime createdAt) {
            this.createdAt = createdAt;
        }

        @Generated
        public void setLink(final String link) {
            this.link = link;
        }

        @Generated
        public void setLinkText(final String linkText) {
            this.linkText = linkText;
        }

        @Generated
        public boolean equals(final Object o) {
            if (o == this) {
                return true;
            } else if (!(o instanceof NotificationDTO)) {
                return false;
            } else {
                NotificationDTO other = (NotificationDTO)o;
                if (!other.canEqual(this)) {
                    return false;
                } else if (this.isRead() != other.isRead()) {
                    return false;
                } else {
                    Object this$id = this.getId();
                    Object other$id = other.getId();
                    if (this$id == null) {
                        if (other$id != null) {
                            return false;
                        }
                    } else if (!this$id.equals(other$id)) {
                        return false;
                    }

                    Object this$title = this.getTitle();
                    Object other$title = other.getTitle();
                    if (this$title == null) {
                        if (other$title != null) {
                            return false;
                        }
                    } else if (!this$title.equals(other$title)) {
                        return false;
                    }

                    Object this$message = this.getMessage();
                    Object other$message = other.getMessage();
                    if (this$message == null) {
                        if (other$message != null) {
                            return false;
                        }
                    } else if (!this$message.equals(other$message)) {
                        return false;
                    }

                    Object this$type = this.getType();
                    Object other$type = other.getType();
                    if (this$type == null) {
                        if (other$type != null) {
                            return false;
                        }
                    } else if (!this$type.equals(other$type)) {
                        return false;
                    }

                    Object this$typeIcon = this.getTypeIcon();
                    Object other$typeIcon = other.getTypeIcon();
                    if (this$typeIcon == null) {
                        if (other$typeIcon != null) {
                            return false;
                        }
                    } else if (!this$typeIcon.equals(other$typeIcon)) {
                        return false;
                    }

                    Object this$typeColor = this.getTypeColor();
                    Object other$typeColor = other.getTypeColor();
                    if (this$typeColor == null) {
                        if (other$typeColor != null) {
                            return false;
                        }
                    } else if (!this$typeColor.equals(other$typeColor)) {
                        return false;
                    }

                    Object this$createdAt = this.getCreatedAt();
                    Object other$createdAt = other.getCreatedAt();
                    if (this$createdAt == null) {
                        if (other$createdAt != null) {
                            return false;
                        }
                    } else if (!this$createdAt.equals(other$createdAt)) {
                        return false;
                    }

                    Object this$link = this.getLink();
                    Object other$link = other.getLink();
                    if (this$link == null) {
                        if (other$link != null) {
                            return false;
                        }
                    } else if (!this$link.equals(other$link)) {
                        return false;
                    }

                    Object this$linkText = this.getLinkText();
                    Object other$linkText = other.getLinkText();
                    if (this$linkText == null) {
                        if (other$linkText != null) {
                            return false;
                        }
                    } else if (!this$linkText.equals(other$linkText)) {
                        return false;
                    }

                    return true;
                }
            }
        }

        @Generated
        protected boolean canEqual(final Object other) {
            return other instanceof NotificationDTO;
        }

        @Generated
        public int hashCode() {
            int PRIME = 59;
            int result = 1;
            result = result * 59 + (this.isRead() ? 79 : 97);
            Object $id = this.getId();
            result = result * 59 + ($id == null ? 43 : $id.hashCode());
            Object $title = this.getTitle();
            result = result * 59 + ($title == null ? 43 : $title.hashCode());
            Object $message = this.getMessage();
            result = result * 59 + ($message == null ? 43 : $message.hashCode());
            Object $type = this.getType();
            result = result * 59 + ($type == null ? 43 : $type.hashCode());
            Object $typeIcon = this.getTypeIcon();
            result = result * 59 + ($typeIcon == null ? 43 : $typeIcon.hashCode());
            Object $typeColor = this.getTypeColor();
            result = result * 59 + ($typeColor == null ? 43 : $typeColor.hashCode());
            Object $createdAt = this.getCreatedAt();
            result = result * 59 + ($createdAt == null ? 43 : $createdAt.hashCode());
            Object $link = this.getLink();
            result = result * 59 + ($link == null ? 43 : $link.hashCode());
            Object $linkText = this.getLinkText();
            result = result * 59 + ($linkText == null ? 43 : $linkText.hashCode());
            return result;
        }

        @Generated
        public String toString() {
            String var10000 = this.getId();
            return "ClearanceResponse.NotificationDTO(id=" + var10000 + ", title=" + this.getTitle() + ", message=" + this.getMessage() + ", type=" + this.getType() + ", typeIcon=" + this.getTypeIcon() + ", typeColor=" + this.getTypeColor() + ", isRead=" + this.isRead() + ", createdAt=" + String.valueOf(this.getCreatedAt()) + ", link=" + this.getLink() + ", linkText=" + this.getLinkText() + ")";
        }

        @Generated
        public NotificationDTO() {
        }

        @Generated
        public NotificationDTO(final String id, final String title, final String message, final String type, final String typeIcon, final String typeColor, final boolean isRead, final LocalDateTime createdAt, final String link, final String linkText) {
            this.id = id;
            this.title = title;
            this.message = message;
            this.type = type;
            this.typeIcon = typeIcon;
            this.typeColor = typeColor;
            this.isRead = isRead;
            this.createdAt = createdAt;
            this.link = link;
            this.linkText = linkText;
        }

        @Generated
        public static class NotificationDTOBuilder {
            @Generated
            private String id;
            @Generated
            private String title;
            @Generated
            private String message;
            @Generated
            private String type;
            @Generated
            private String typeIcon;
            @Generated
            private String typeColor;
            @Generated
            private boolean isRead;
            @Generated
            private LocalDateTime createdAt;
            @Generated
            private String link;
            @Generated
            private String linkText;

            @Generated
            NotificationDTOBuilder() {
            }

            @JsonProperty("id")
            @Generated
            public NotificationDTOBuilder id(final String id) {
                this.id = id;
                return this;
            }

            @JsonProperty("title")
            @Generated
            public NotificationDTOBuilder title(final String title) {
                this.title = title;
                return this;
            }

            @JsonProperty("message")
            @Generated
            public NotificationDTOBuilder message(final String message) {
                this.message = message;
                return this;
            }

            @JsonProperty("type")
            @Generated
            public NotificationDTOBuilder type(final String type) {
                this.type = type;
                return this;
            }

            @JsonProperty("type_icon")
            @Generated
            public NotificationDTOBuilder typeIcon(final String typeIcon) {
                this.typeIcon = typeIcon;
                return this;
            }

            @JsonProperty("type_color")
            @Generated
            public NotificationDTOBuilder typeColor(final String typeColor) {
                this.typeColor = typeColor;
                return this;
            }

            @JsonProperty("is_read")
            @Generated
            public NotificationDTOBuilder isRead(final boolean isRead) {
                this.isRead = isRead;
                return this;
            }

            @JsonProperty("created_at")
            @Generated
            public NotificationDTOBuilder createdAt(final LocalDateTime createdAt) {
                this.createdAt = createdAt;
                return this;
            }

            @JsonProperty("link")
            @Generated
            public NotificationDTOBuilder link(final String link) {
                this.link = link;
                return this;
            }

            @JsonProperty("link_text")
            @Generated
            public NotificationDTOBuilder linkText(final String linkText) {
                this.linkText = linkText;
                return this;
            }

            @Generated
            public NotificationDTO build() {
                return new NotificationDTO(this.id, this.title, this.message, this.type, this.typeIcon, this.typeColor, this.isRead, this.createdAt, this.link, this.linkText);
            }

            @Generated
            public String toString() {
                String var10000 = this.id;
                return "ClearanceResponse.NotificationDTO.NotificationDTOBuilder(id=" + var10000 + ", title=" + this.title + ", message=" + this.message + ", type=" + this.type + ", typeIcon=" + this.typeIcon + ", typeColor=" + this.typeColor + ", isRead=" + this.isRead + ", createdAt=" + String.valueOf(this.createdAt) + ", link=" + this.link + ", linkText=" + this.linkText + ")";
            }
        }
    }

    @JsonInclude(Include.NON_NULL)
    public static class RequirementDTO {
        @JsonProperty("id")
        private String id;
        @JsonProperty("requirement_name")
        private String requirementName;
        @JsonProperty("description")
        private String description;
        @JsonProperty("is_completed")
        private boolean isCompleted;
        @JsonProperty("completed_at")
        private LocalDateTime completedAt;
        @JsonProperty("completed_by")
        private String completedBy;
        @JsonProperty("notes")
        private String notes;
        @JsonProperty("is_mandatory")
        private boolean isMandatory = true;
        @JsonProperty("due_date")
        private LocalDateTime dueDate;
        @JsonProperty("status")
        private String status;
        @JsonProperty("status_icon")
        private String statusIcon;

        @Generated
        public static RequirementDTOBuilder builder() {
            return new RequirementDTOBuilder();
        }

        @Generated
        public String getId() {
            return this.id;
        }

        @Generated
        public String getRequirementName() {
            return this.requirementName;
        }

        @Generated
        public String getDescription() {
            return this.description;
        }

        @Generated
        public boolean isCompleted() {
            return this.isCompleted;
        }

        @Generated
        public LocalDateTime getCompletedAt() {
            return this.completedAt;
        }

        @Generated
        public String getCompletedBy() {
            return this.completedBy;
        }

        @Generated
        public String getNotes() {
            return this.notes;
        }

        @Generated
        public boolean isMandatory() {
            return this.isMandatory;
        }

        @Generated
        public LocalDateTime getDueDate() {
            return this.dueDate;
        }

        @Generated
        public String getStatus() {
            return this.status;
        }

        @Generated
        public String getStatusIcon() {
            return this.statusIcon;
        }

        @Generated
        public void setId(final String id) {
            this.id = id;
        }

        @Generated
        public void setRequirementName(final String requirementName) {
            this.requirementName = requirementName;
        }

        @Generated
        public void setDescription(final String description) {
            this.description = description;
        }

        @Generated
        public void setCompleted(final boolean isCompleted) {
            this.isCompleted = isCompleted;
        }

        @Generated
        public void setCompletedAt(final LocalDateTime completedAt) {
            this.completedAt = completedAt;
        }

        @Generated
        public void setCompletedBy(final String completedBy) {
            this.completedBy = completedBy;
        }

        @Generated
        public void setNotes(final String notes) {
            this.notes = notes;
        }

        @Generated
        public void setMandatory(final boolean isMandatory) {
            this.isMandatory = isMandatory;
        }

        @Generated
        public void setDueDate(final LocalDateTime dueDate) {
            this.dueDate = dueDate;
        }

        @Generated
        public void setStatus(final String status) {
            this.status = status;
        }

        @Generated
        public void setStatusIcon(final String statusIcon) {
            this.statusIcon = statusIcon;
        }

        @Generated
        public boolean equals(final Object o) {
            if (o == this) {
                return true;
            } else if (!(o instanceof RequirementDTO)) {
                return false;
            } else {
                RequirementDTO other = (RequirementDTO)o;
                if (!other.canEqual(this)) {
                    return false;
                } else if (this.isCompleted() != other.isCompleted()) {
                    return false;
                } else if (this.isMandatory() != other.isMandatory()) {
                    return false;
                } else {
                    Object this$id = this.getId();
                    Object other$id = other.getId();
                    if (this$id == null) {
                        if (other$id != null) {
                            return false;
                        }
                    } else if (!this$id.equals(other$id)) {
                        return false;
                    }

                    Object this$requirementName = this.getRequirementName();
                    Object other$requirementName = other.getRequirementName();
                    if (this$requirementName == null) {
                        if (other$requirementName != null) {
                            return false;
                        }
                    } else if (!this$requirementName.equals(other$requirementName)) {
                        return false;
                    }

                    Object this$description = this.getDescription();
                    Object other$description = other.getDescription();
                    if (this$description == null) {
                        if (other$description != null) {
                            return false;
                        }
                    } else if (!this$description.equals(other$description)) {
                        return false;
                    }

                    Object this$completedAt = this.getCompletedAt();
                    Object other$completedAt = other.getCompletedAt();
                    if (this$completedAt == null) {
                        if (other$completedAt != null) {
                            return false;
                        }
                    } else if (!this$completedAt.equals(other$completedAt)) {
                        return false;
                    }

                    Object this$completedBy = this.getCompletedBy();
                    Object other$completedBy = other.getCompletedBy();
                    if (this$completedBy == null) {
                        if (other$completedBy != null) {
                            return false;
                        }
                    } else if (!this$completedBy.equals(other$completedBy)) {
                        return false;
                    }

                    Object this$notes = this.getNotes();
                    Object other$notes = other.getNotes();
                    if (this$notes == null) {
                        if (other$notes != null) {
                            return false;
                        }
                    } else if (!this$notes.equals(other$notes)) {
                        return false;
                    }

                    Object this$dueDate = this.getDueDate();
                    Object other$dueDate = other.getDueDate();
                    if (this$dueDate == null) {
                        if (other$dueDate != null) {
                            return false;
                        }
                    } else if (!this$dueDate.equals(other$dueDate)) {
                        return false;
                    }

                    Object this$status = this.getStatus();
                    Object other$status = other.getStatus();
                    if (this$status == null) {
                        if (other$status != null) {
                            return false;
                        }
                    } else if (!this$status.equals(other$status)) {
                        return false;
                    }

                    Object this$statusIcon = this.getStatusIcon();
                    Object other$statusIcon = other.getStatusIcon();
                    if (this$statusIcon == null) {
                        if (other$statusIcon != null) {
                            return false;
                        }
                    } else if (!this$statusIcon.equals(other$statusIcon)) {
                        return false;
                    }

                    return true;
                }
            }
        }

        @Generated
        protected boolean canEqual(final Object other) {
            return other instanceof RequirementDTO;
        }

        @Generated
        public int hashCode() {
            int PRIME = 59;
            int result = 1;
            result = result * 59 + (this.isCompleted() ? 79 : 97);
            result = result * 59 + (this.isMandatory() ? 79 : 97);
            Object $id = this.getId();
            result = result * 59 + ($id == null ? 43 : $id.hashCode());
            Object $requirementName = this.getRequirementName();
            result = result * 59 + ($requirementName == null ? 43 : $requirementName.hashCode());
            Object $description = this.getDescription();
            result = result * 59 + ($description == null ? 43 : $description.hashCode());
            Object $completedAt = this.getCompletedAt();
            result = result * 59 + ($completedAt == null ? 43 : $completedAt.hashCode());
            Object $completedBy = this.getCompletedBy();
            result = result * 59 + ($completedBy == null ? 43 : $completedBy.hashCode());
            Object $notes = this.getNotes();
            result = result * 59 + ($notes == null ? 43 : $notes.hashCode());
            Object $dueDate = this.getDueDate();
            result = result * 59 + ($dueDate == null ? 43 : $dueDate.hashCode());
            Object $status = this.getStatus();
            result = result * 59 + ($status == null ? 43 : $status.hashCode());
            Object $statusIcon = this.getStatusIcon();
            result = result * 59 + ($statusIcon == null ? 43 : $statusIcon.hashCode());
            return result;
        }

        @Generated
        public String toString() {
            String var10000 = this.getId();
            return "ClearanceResponse.RequirementDTO(id=" + var10000 + ", requirementName=" + this.getRequirementName() + ", description=" + this.getDescription() + ", isCompleted=" + this.isCompleted() + ", completedAt=" + String.valueOf(this.getCompletedAt()) + ", completedBy=" + this.getCompletedBy() + ", notes=" + this.getNotes() + ", isMandatory=" + this.isMandatory() + ", dueDate=" + String.valueOf(this.getDueDate()) + ", status=" + this.getStatus() + ", statusIcon=" + this.getStatusIcon() + ")";
        }

        @Generated
        public RequirementDTO() {
        }

        @Generated
        public RequirementDTO(final String id, final String requirementName, final String description, final boolean isCompleted, final LocalDateTime completedAt, final String completedBy, final String notes, final boolean isMandatory, final LocalDateTime dueDate, final String status, final String statusIcon) {
            this.id = id;
            this.requirementName = requirementName;
            this.description = description;
            this.isCompleted = isCompleted;
            this.completedAt = completedAt;
            this.completedBy = completedBy;
            this.notes = notes;
            this.isMandatory = isMandatory;
            this.dueDate = dueDate;
            this.status = status;
            this.statusIcon = statusIcon;
        }

        @Generated
        public static class RequirementDTOBuilder {
            @Generated
            private String id;
            @Generated
            private String requirementName;
            @Generated
            private String description;
            @Generated
            private boolean isCompleted;
            @Generated
            private LocalDateTime completedAt;
            @Generated
            private String completedBy;
            @Generated
            private String notes;
            @Generated
            private boolean isMandatory;
            @Generated
            private LocalDateTime dueDate;
            @Generated
            private String status;
            @Generated
            private String statusIcon;

            @Generated
            RequirementDTOBuilder() {
            }

            @JsonProperty("id")
            @Generated
            public RequirementDTOBuilder id(final String id) {
                this.id = id;
                return this;
            }

            @JsonProperty("requirement_name")
            @Generated
            public RequirementDTOBuilder requirementName(final String requirementName) {
                this.requirementName = requirementName;
                return this;
            }

            @JsonProperty("description")
            @Generated
            public RequirementDTOBuilder description(final String description) {
                this.description = description;
                return this;
            }

            @JsonProperty("is_completed")
            @Generated
            public RequirementDTOBuilder isCompleted(final boolean isCompleted) {
                this.isCompleted = isCompleted;
                return this;
            }

            @JsonProperty("completed_at")
            @Generated
            public RequirementDTOBuilder completedAt(final LocalDateTime completedAt) {
                this.completedAt = completedAt;
                return this;
            }

            @JsonProperty("completed_by")
            @Generated
            public RequirementDTOBuilder completedBy(final String completedBy) {
                this.completedBy = completedBy;
                return this;
            }

            @JsonProperty("notes")
            @Generated
            public RequirementDTOBuilder notes(final String notes) {
                this.notes = notes;
                return this;
            }

            @JsonProperty("is_mandatory")
            @Generated
            public RequirementDTOBuilder isMandatory(final boolean isMandatory) {
                this.isMandatory = isMandatory;
                return this;
            }

            @JsonProperty("due_date")
            @Generated
            public RequirementDTOBuilder dueDate(final LocalDateTime dueDate) {
                this.dueDate = dueDate;
                return this;
            }

            @JsonProperty("status")
            @Generated
            public RequirementDTOBuilder status(final String status) {
                this.status = status;
                return this;
            }

            @JsonProperty("status_icon")
            @Generated
            public RequirementDTOBuilder statusIcon(final String statusIcon) {
                this.statusIcon = statusIcon;
                return this;
            }

            @Generated
            public RequirementDTO build() {
                return new RequirementDTO(this.id, this.requirementName, this.description, this.isCompleted, this.completedAt, this.completedBy, this.notes, this.isMandatory, this.dueDate, this.status, this.statusIcon);
            }

            @Generated
            public String toString() {
                String var10000 = this.id;
                return "ClearanceResponse.RequirementDTO.RequirementDTOBuilder(id=" + var10000 + ", requirementName=" + this.requirementName + ", description=" + this.description + ", isCompleted=" + this.isCompleted + ", completedAt=" + String.valueOf(this.completedAt) + ", completedBy=" + this.completedBy + ", notes=" + this.notes + ", isMandatory=" + this.isMandatory + ", dueDate=" + String.valueOf(this.dueDate) + ", status=" + this.status + ", statusIcon=" + this.statusIcon + ")";
            }
        }
    }

    @JsonInclude(Include.NON_NULL)
    public static class TimelineEventDTO {
        @JsonProperty("date")
        private LocalDateTime date;
        @JsonProperty("title")
        private String title;
        @JsonProperty("description")
        private String description;
        @JsonProperty("type")
        private String type;
        @JsonProperty("icon")
        private String icon;
        @JsonProperty("color")
        private String color;
        @JsonProperty("is_active")
        private boolean isActive;
        @JsonProperty("is_completed")
        private boolean isCompleted;

        @Generated
        public static TimelineEventDTOBuilder builder() {
            return new TimelineEventDTOBuilder();
        }

        @Generated
        public LocalDateTime getDate() {
            return this.date;
        }

        @Generated
        public String getTitle() {
            return this.title;
        }

        @Generated
        public String getDescription() {
            return this.description;
        }

        @Generated
        public String getType() {
            return this.type;
        }

        @Generated
        public String getIcon() {
            return this.icon;
        }

        @Generated
        public String getColor() {
            return this.color;
        }

        @Generated
        public boolean isActive() {
            return this.isActive;
        }

        @Generated
        public boolean isCompleted() {
            return this.isCompleted;
        }

        @Generated
        public void setDate(final LocalDateTime date) {
            this.date = date;
        }

        @Generated
        public void setTitle(final String title) {
            this.title = title;
        }

        @Generated
        public void setDescription(final String description) {
            this.description = description;
        }

        @Generated
        public void setType(final String type) {
            this.type = type;
        }

        @Generated
        public void setIcon(final String icon) {
            this.icon = icon;
        }

        @Generated
        public void setColor(final String color) {
            this.color = color;
        }

        @Generated
        public void setActive(final boolean isActive) {
            this.isActive = isActive;
        }

        @Generated
        public void setCompleted(final boolean isCompleted) {
            this.isCompleted = isCompleted;
        }

        @Generated
        public boolean equals(final Object o) {
            if (o == this) {
                return true;
            } else if (!(o instanceof TimelineEventDTO)) {
                return false;
            } else {
                TimelineEventDTO other = (TimelineEventDTO)o;
                if (!other.canEqual(this)) {
                    return false;
                } else if (this.isActive() != other.isActive()) {
                    return false;
                } else if (this.isCompleted() != other.isCompleted()) {
                    return false;
                } else {
                    Object this$date = this.getDate();
                    Object other$date = other.getDate();
                    if (this$date == null) {
                        if (other$date != null) {
                            return false;
                        }
                    } else if (!this$date.equals(other$date)) {
                        return false;
                    }

                    Object this$title = this.getTitle();
                    Object other$title = other.getTitle();
                    if (this$title == null) {
                        if (other$title != null) {
                            return false;
                        }
                    } else if (!this$title.equals(other$title)) {
                        return false;
                    }

                    Object this$description = this.getDescription();
                    Object other$description = other.getDescription();
                    if (this$description == null) {
                        if (other$description != null) {
                            return false;
                        }
                    } else if (!this$description.equals(other$description)) {
                        return false;
                    }

                    Object this$type = this.getType();
                    Object other$type = other.getType();
                    if (this$type == null) {
                        if (other$type != null) {
                            return false;
                        }
                    } else if (!this$type.equals(other$type)) {
                        return false;
                    }

                    Object this$icon = this.getIcon();
                    Object other$icon = other.getIcon();
                    if (this$icon == null) {
                        if (other$icon != null) {
                            return false;
                        }
                    } else if (!this$icon.equals(other$icon)) {
                        return false;
                    }

                    Object this$color = this.getColor();
                    Object other$color = other.getColor();
                    if (this$color == null) {
                        if (other$color != null) {
                            return false;
                        }
                    } else if (!this$color.equals(other$color)) {
                        return false;
                    }

                    return true;
                }
            }
        }

        @Generated
        protected boolean canEqual(final Object other) {
            return other instanceof TimelineEventDTO;
        }

        @Generated
        public int hashCode() {
            int PRIME = 59;
            int result = 1;
            result = result * 59 + (this.isActive() ? 79 : 97);
            result = result * 59 + (this.isCompleted() ? 79 : 97);
            Object $date = this.getDate();
            result = result * 59 + ($date == null ? 43 : $date.hashCode());
            Object $title = this.getTitle();
            result = result * 59 + ($title == null ? 43 : $title.hashCode());
            Object $description = this.getDescription();
            result = result * 59 + ($description == null ? 43 : $description.hashCode());
            Object $type = this.getType();
            result = result * 59 + ($type == null ? 43 : $type.hashCode());
            Object $icon = this.getIcon();
            result = result * 59 + ($icon == null ? 43 : $icon.hashCode());
            Object $color = this.getColor();
            result = result * 59 + ($color == null ? 43 : $color.hashCode());
            return result;
        }

        @Generated
        public String toString() {
            String var10000 = String.valueOf(this.getDate());
            return "ClearanceResponse.TimelineEventDTO(date=" + var10000 + ", title=" + this.getTitle() + ", description=" + this.getDescription() + ", type=" + this.getType() + ", icon=" + this.getIcon() + ", color=" + this.getColor() + ", isActive=" + this.isActive() + ", isCompleted=" + this.isCompleted() + ")";
        }

        @Generated
        public TimelineEventDTO() {
        }

        @Generated
        public TimelineEventDTO(final LocalDateTime date, final String title, final String description, final String type, final String icon, final String color, final boolean isActive, final boolean isCompleted) {
            this.date = date;
            this.title = title;
            this.description = description;
            this.type = type;
            this.icon = icon;
            this.color = color;
            this.isActive = isActive;
            this.isCompleted = isCompleted;
        }

        @Generated
        public static class TimelineEventDTOBuilder {
            @Generated
            private LocalDateTime date;
            @Generated
            private String title;
            @Generated
            private String description;
            @Generated
            private String type;
            @Generated
            private String icon;
            @Generated
            private String color;
            @Generated
            private boolean isActive;
            @Generated
            private boolean isCompleted;

            @Generated
            TimelineEventDTOBuilder() {
            }

            @JsonProperty("date")
            @Generated
            public TimelineEventDTOBuilder date(final LocalDateTime date) {
                this.date = date;
                return this;
            }

            @JsonProperty("title")
            @Generated
            public TimelineEventDTOBuilder title(final String title) {
                this.title = title;
                return this;
            }

            @JsonProperty("description")
            @Generated
            public TimelineEventDTOBuilder description(final String description) {
                this.description = description;
                return this;
            }

            @JsonProperty("type")
            @Generated
            public TimelineEventDTOBuilder type(final String type) {
                this.type = type;
                return this;
            }

            @JsonProperty("icon")
            @Generated
            public TimelineEventDTOBuilder icon(final String icon) {
                this.icon = icon;
                return this;
            }

            @JsonProperty("color")
            @Generated
            public TimelineEventDTOBuilder color(final String color) {
                this.color = color;
                return this;
            }

            @JsonProperty("is_active")
            @Generated
            public TimelineEventDTOBuilder isActive(final boolean isActive) {
                this.isActive = isActive;
                return this;
            }

            @JsonProperty("is_completed")
            @Generated
            public TimelineEventDTOBuilder isCompleted(final boolean isCompleted) {
                this.isCompleted = isCompleted;
                return this;
            }

            @Generated
            public TimelineEventDTO build() {
                return new TimelineEventDTO(this.date, this.title, this.description, this.type, this.icon, this.color, this.isActive, this.isCompleted);
            }

            @Generated
            public String toString() {
                String var10000 = String.valueOf(this.date);
                return "ClearanceResponse.TimelineEventDTO.TimelineEventDTOBuilder(date=" + var10000 + ", title=" + this.title + ", description=" + this.description + ", type=" + this.type + ", icon=" + this.icon + ", color=" + this.color + ", isActive=" + this.isActive + ", isCompleted=" + this.isCompleted + ")";
            }
        }
    }

    @JsonInclude(Include.NON_NULL)
    public static class ActionButtonDTO {
        @JsonProperty("label")
        private String label;
        @JsonProperty("icon")
        private String icon;
        @JsonProperty("action")
        private String action;
        @JsonProperty("url")
        private String url;
        @JsonProperty("method")
        private String method;
        @JsonProperty("color")
        private String color;
        @JsonProperty("is_primary")
        private boolean isPrimary;
        @JsonProperty("is_disabled")
        private boolean isDisabled;
        @JsonProperty("tooltip")
        private String tooltip;

        @Generated
        public static ActionButtonDTOBuilder builder() {
            return new ActionButtonDTOBuilder();
        }

        @Generated
        public String getLabel() {
            return this.label;
        }

        @Generated
        public String getIcon() {
            return this.icon;
        }

        @Generated
        public String getAction() {
            return this.action;
        }

        @Generated
        public String getUrl() {
            return this.url;
        }

        @Generated
        public String getMethod() {
            return this.method;
        }

        @Generated
        public String getColor() {
            return this.color;
        }

        @Generated
        public boolean isPrimary() {
            return this.isPrimary;
        }

        @Generated
        public boolean isDisabled() {
            return this.isDisabled;
        }

        @Generated
        public String getTooltip() {
            return this.tooltip;
        }

        @Generated
        public void setLabel(final String label) {
            this.label = label;
        }

        @Generated
        public void setIcon(final String icon) {
            this.icon = icon;
        }

        @Generated
        public void setAction(final String action) {
            this.action = action;
        }

        @Generated
        public void setUrl(final String url) {
            this.url = url;
        }

        @Generated
        public void setMethod(final String method) {
            this.method = method;
        }

        @Generated
        public void setColor(final String color) {
            this.color = color;
        }

        @Generated
        public void setPrimary(final boolean isPrimary) {
            this.isPrimary = isPrimary;
        }

        @Generated
        public void setDisabled(final boolean isDisabled) {
            this.isDisabled = isDisabled;
        }

        @Generated
        public void setTooltip(final String tooltip) {
            this.tooltip = tooltip;
        }

        @Generated
        public boolean equals(final Object o) {
            if (o == this) {
                return true;
            } else if (!(o instanceof ActionButtonDTO)) {
                return false;
            } else {
                ActionButtonDTO other = (ActionButtonDTO)o;
                if (!other.canEqual(this)) {
                    return false;
                } else if (this.isPrimary() != other.isPrimary()) {
                    return false;
                } else if (this.isDisabled() != other.isDisabled()) {
                    return false;
                } else {
                    Object this$label = this.getLabel();
                    Object other$label = other.getLabel();
                    if (this$label == null) {
                        if (other$label != null) {
                            return false;
                        }
                    } else if (!this$label.equals(other$label)) {
                        return false;
                    }

                    Object this$icon = this.getIcon();
                    Object other$icon = other.getIcon();
                    if (this$icon == null) {
                        if (other$icon != null) {
                            return false;
                        }
                    } else if (!this$icon.equals(other$icon)) {
                        return false;
                    }

                    Object this$action = this.getAction();
                    Object other$action = other.getAction();
                    if (this$action == null) {
                        if (other$action != null) {
                            return false;
                        }
                    } else if (!this$action.equals(other$action)) {
                        return false;
                    }

                    Object this$url = this.getUrl();
                    Object other$url = other.getUrl();
                    if (this$url == null) {
                        if (other$url != null) {
                            return false;
                        }
                    } else if (!this$url.equals(other$url)) {
                        return false;
                    }

                    Object this$method = this.getMethod();
                    Object other$method = other.getMethod();
                    if (this$method == null) {
                        if (other$method != null) {
                            return false;
                        }
                    } else if (!this$method.equals(other$method)) {
                        return false;
                    }

                    Object this$color = this.getColor();
                    Object other$color = other.getColor();
                    if (this$color == null) {
                        if (other$color != null) {
                            return false;
                        }
                    } else if (!this$color.equals(other$color)) {
                        return false;
                    }

                    Object this$tooltip = this.getTooltip();
                    Object other$tooltip = other.getTooltip();
                    if (this$tooltip == null) {
                        if (other$tooltip != null) {
                            return false;
                        }
                    } else if (!this$tooltip.equals(other$tooltip)) {
                        return false;
                    }

                    return true;
                }
            }
        }

        @Generated
        protected boolean canEqual(final Object other) {
            return other instanceof ActionButtonDTO;
        }

        @Generated
        public int hashCode() {
            int PRIME = 59;
            int result = 1;
            result = result * 59 + (this.isPrimary() ? 79 : 97);
            result = result * 59 + (this.isDisabled() ? 79 : 97);
            Object $label = this.getLabel();
            result = result * 59 + ($label == null ? 43 : $label.hashCode());
            Object $icon = this.getIcon();
            result = result * 59 + ($icon == null ? 43 : $icon.hashCode());
            Object $action = this.getAction();
            result = result * 59 + ($action == null ? 43 : $action.hashCode());
            Object $url = this.getUrl();
            result = result * 59 + ($url == null ? 43 : $url.hashCode());
            Object $method = this.getMethod();
            result = result * 59 + ($method == null ? 43 : $method.hashCode());
            Object $color = this.getColor();
            result = result * 59 + ($color == null ? 43 : $color.hashCode());
            Object $tooltip = this.getTooltip();
            result = result * 59 + ($tooltip == null ? 43 : $tooltip.hashCode());
            return result;
        }

        @Generated
        public String toString() {
            String var10000 = this.getLabel();
            return "ClearanceResponse.ActionButtonDTO(label=" + var10000 + ", icon=" + this.getIcon() + ", action=" + this.getAction() + ", url=" + this.getUrl() + ", method=" + this.getMethod() + ", color=" + this.getColor() + ", isPrimary=" + this.isPrimary() + ", isDisabled=" + this.isDisabled() + ", tooltip=" + this.getTooltip() + ")";
        }

        @Generated
        public ActionButtonDTO() {
        }

        @Generated
        public ActionButtonDTO(final String label, final String icon, final String action, final String url, final String method, final String color, final boolean isPrimary, final boolean isDisabled, final String tooltip) {
            this.label = label;
            this.icon = icon;
            this.action = action;
            this.url = url;
            this.method = method;
            this.color = color;
            this.isPrimary = isPrimary;
            this.isDisabled = isDisabled;
            this.tooltip = tooltip;
        }

        @Generated
        public static class ActionButtonDTOBuilder {
            @Generated
            private String label;
            @Generated
            private String icon;
            @Generated
            private String action;
            @Generated
            private String url;
            @Generated
            private String method;
            @Generated
            private String color;
            @Generated
            private boolean isPrimary;
            @Generated
            private boolean isDisabled;
            @Generated
            private String tooltip;

            @Generated
            ActionButtonDTOBuilder() {
            }

            @JsonProperty("label")
            @Generated
            public ActionButtonDTOBuilder label(final String label) {
                this.label = label;
                return this;
            }

            @JsonProperty("icon")
            @Generated
            public ActionButtonDTOBuilder icon(final String icon) {
                this.icon = icon;
                return this;
            }

            @JsonProperty("action")
            @Generated
            public ActionButtonDTOBuilder action(final String action) {
                this.action = action;
                return this;
            }

            @JsonProperty("url")
            @Generated
            public ActionButtonDTOBuilder url(final String url) {
                this.url = url;
                return this;
            }

            @JsonProperty("method")
            @Generated
            public ActionButtonDTOBuilder method(final String method) {
                this.method = method;
                return this;
            }

            @JsonProperty("color")
            @Generated
            public ActionButtonDTOBuilder color(final String color) {
                this.color = color;
                return this;
            }

            @JsonProperty("is_primary")
            @Generated
            public ActionButtonDTOBuilder isPrimary(final boolean isPrimary) {
                this.isPrimary = isPrimary;
                return this;
            }

            @JsonProperty("is_disabled")
            @Generated
            public ActionButtonDTOBuilder isDisabled(final boolean isDisabled) {
                this.isDisabled = isDisabled;
                return this;
            }

            @JsonProperty("tooltip")
            @Generated
            public ActionButtonDTOBuilder tooltip(final String tooltip) {
                this.tooltip = tooltip;
                return this;
            }

            @Generated
            public ActionButtonDTO build() {
                return new ActionButtonDTO(this.label, this.icon, this.action, this.url, this.method, this.color, this.isPrimary, this.isDisabled, this.tooltip);
            }

            @Generated
            public String toString() {
                return "ClearanceResponse.ActionButtonDTO.ActionButtonDTOBuilder(label=" + this.label + ", icon=" + this.icon + ", action=" + this.action + ", url=" + this.url + ", method=" + this.method + ", color=" + this.color + ", isPrimary=" + this.isPrimary + ", isDisabled=" + this.isDisabled + ", tooltip=" + this.tooltip + ")";
            }
        }
    }

    @JsonInclude(Include.NON_NULL)
    public static class AttachmentDTO {
        @JsonProperty("id")
        private String id;
        @JsonProperty("file_name")
        private String fileName;
        @JsonProperty("file_url")
        private String fileUrl;
        @JsonProperty("file_type")
        private String fileType;
        @JsonProperty("file_size")
        private long fileSize;
        @JsonProperty("uploaded_at")
        private LocalDateTime uploadedAt;
        @JsonProperty("uploaded_by")
        private String uploadedBy;

        @Generated
        public static AttachmentDTOBuilder builder() {
            return new AttachmentDTOBuilder();
        }

        @Generated
        public String getId() {
            return this.id;
        }

        @Generated
        public String getFileName() {
            return this.fileName;
        }

        @Generated
        public String getFileUrl() {
            return this.fileUrl;
        }

        @Generated
        public String getFileType() {
            return this.fileType;
        }

        @Generated
        public long getFileSize() {
            return this.fileSize;
        }

        @Generated
        public LocalDateTime getUploadedAt() {
            return this.uploadedAt;
        }

        @Generated
        public String getUploadedBy() {
            return this.uploadedBy;
        }

        @Generated
        public void setId(final String id) {
            this.id = id;
        }

        @Generated
        public void setFileName(final String fileName) {
            this.fileName = fileName;
        }

        @Generated
        public void setFileUrl(final String fileUrl) {
            this.fileUrl = fileUrl;
        }

        @Generated
        public void setFileType(final String fileType) {
            this.fileType = fileType;
        }

        @Generated
        public void setFileSize(final long fileSize) {
            this.fileSize = fileSize;
        }

        @Generated
        public void setUploadedAt(final LocalDateTime uploadedAt) {
            this.uploadedAt = uploadedAt;
        }

        @Generated
        public void setUploadedBy(final String uploadedBy) {
            this.uploadedBy = uploadedBy;
        }

        @Generated
        public boolean equals(final Object o) {
            if (o == this) {
                return true;
            } else if (!(o instanceof AttachmentDTO)) {
                return false;
            } else {
                AttachmentDTO other = (AttachmentDTO)o;
                if (!other.canEqual(this)) {
                    return false;
                } else if (this.getFileSize() != other.getFileSize()) {
                    return false;
                } else {
                    Object this$id = this.getId();
                    Object other$id = other.getId();
                    if (this$id == null) {
                        if (other$id != null) {
                            return false;
                        }
                    } else if (!this$id.equals(other$id)) {
                        return false;
                    }

                    Object this$fileName = this.getFileName();
                    Object other$fileName = other.getFileName();
                    if (this$fileName == null) {
                        if (other$fileName != null) {
                            return false;
                        }
                    } else if (!this$fileName.equals(other$fileName)) {
                        return false;
                    }

                    Object this$fileUrl = this.getFileUrl();
                    Object other$fileUrl = other.getFileUrl();
                    if (this$fileUrl == null) {
                        if (other$fileUrl != null) {
                            return false;
                        }
                    } else if (!this$fileUrl.equals(other$fileUrl)) {
                        return false;
                    }

                    Object this$fileType = this.getFileType();
                    Object other$fileType = other.getFileType();
                    if (this$fileType == null) {
                        if (other$fileType != null) {
                            return false;
                        }
                    } else if (!this$fileType.equals(other$fileType)) {
                        return false;
                    }

                    Object this$uploadedAt = this.getUploadedAt();
                    Object other$uploadedAt = other.getUploadedAt();
                    if (this$uploadedAt == null) {
                        if (other$uploadedAt != null) {
                            return false;
                        }
                    } else if (!this$uploadedAt.equals(other$uploadedAt)) {
                        return false;
                    }

                    Object this$uploadedBy = this.getUploadedBy();
                    Object other$uploadedBy = other.getUploadedBy();
                    if (this$uploadedBy == null) {
                        if (other$uploadedBy != null) {
                            return false;
                        }
                    } else if (!this$uploadedBy.equals(other$uploadedBy)) {
                        return false;
                    }

                    return true;
                }
            }
        }

        @Generated
        protected boolean canEqual(final Object other) {
            return other instanceof AttachmentDTO;
        }

        @Generated
        public int hashCode() {
            int PRIME = 59;
            int result = 1;
            long $fileSize = this.getFileSize();
            result = result * 59 + (int)($fileSize ^ $fileSize >>> 32);
            Object $id = this.getId();
            result = result * 59 + ($id == null ? 43 : $id.hashCode());
            Object $fileName = this.getFileName();
            result = result * 59 + ($fileName == null ? 43 : $fileName.hashCode());
            Object $fileUrl = this.getFileUrl();
            result = result * 59 + ($fileUrl == null ? 43 : $fileUrl.hashCode());
            Object $fileType = this.getFileType();
            result = result * 59 + ($fileType == null ? 43 : $fileType.hashCode());
            Object $uploadedAt = this.getUploadedAt();
            result = result * 59 + ($uploadedAt == null ? 43 : $uploadedAt.hashCode());
            Object $uploadedBy = this.getUploadedBy();
            result = result * 59 + ($uploadedBy == null ? 43 : $uploadedBy.hashCode());
            return result;
        }

        @Generated
        public String toString() {
            String var10000 = this.getId();
            return "ClearanceResponse.AttachmentDTO(id=" + var10000 + ", fileName=" + this.getFileName() + ", fileUrl=" + this.getFileUrl() + ", fileType=" + this.getFileType() + ", fileSize=" + this.getFileSize() + ", uploadedAt=" + String.valueOf(this.getUploadedAt()) + ", uploadedBy=" + this.getUploadedBy() + ")";
        }

        @Generated
        public AttachmentDTO() {
        }

        @Generated
        public AttachmentDTO(final String id, final String fileName, final String fileUrl, final String fileType, final long fileSize, final LocalDateTime uploadedAt, final String uploadedBy) {
            this.id = id;
            this.fileName = fileName;
            this.fileUrl = fileUrl;
            this.fileType = fileType;
            this.fileSize = fileSize;
            this.uploadedAt = uploadedAt;
            this.uploadedBy = uploadedBy;
        }

        @Generated
        public static class AttachmentDTOBuilder {
            @Generated
            private String id;
            @Generated
            private String fileName;
            @Generated
            private String fileUrl;
            @Generated
            private String fileType;
            @Generated
            private long fileSize;
            @Generated
            private LocalDateTime uploadedAt;
            @Generated
            private String uploadedBy;

            @Generated
            AttachmentDTOBuilder() {
            }

            @JsonProperty("id")
            @Generated
            public AttachmentDTOBuilder id(final String id) {
                this.id = id;
                return this;
            }

            @JsonProperty("file_name")
            @Generated
            public AttachmentDTOBuilder fileName(final String fileName) {
                this.fileName = fileName;
                return this;
            }

            @JsonProperty("file_url")
            @Generated
            public AttachmentDTOBuilder fileUrl(final String fileUrl) {
                this.fileUrl = fileUrl;
                return this;
            }

            @JsonProperty("file_type")
            @Generated
            public AttachmentDTOBuilder fileType(final String fileType) {
                this.fileType = fileType;
                return this;
            }

            @JsonProperty("file_size")
            @Generated
            public AttachmentDTOBuilder fileSize(final long fileSize) {
                this.fileSize = fileSize;
                return this;
            }

            @JsonProperty("uploaded_at")
            @Generated
            public AttachmentDTOBuilder uploadedAt(final LocalDateTime uploadedAt) {
                this.uploadedAt = uploadedAt;
                return this;
            }

            @JsonProperty("uploaded_by")
            @Generated
            public AttachmentDTOBuilder uploadedBy(final String uploadedBy) {
                this.uploadedBy = uploadedBy;
                return this;
            }

            @Generated
            public AttachmentDTO build() {
                return new AttachmentDTO(this.id, this.fileName, this.fileUrl, this.fileType, this.fileSize, this.uploadedAt, this.uploadedBy);
            }

            @Generated
            public String toString() {
                String var10000 = this.id;
                return "ClearanceResponse.AttachmentDTO.AttachmentDTOBuilder(id=" + var10000 + ", fileName=" + this.fileName + ", fileUrl=" + this.fileUrl + ", fileType=" + this.fileType + ", fileSize=" + this.fileSize + ", uploadedAt=" + String.valueOf(this.uploadedAt) + ", uploadedBy=" + this.uploadedBy + ")";
            }
        }
    }

    public static class ClearanceResponseBuilder {
        @Generated
        private String requestId;
        @Generated
        private String studentId;
        @Generated
        private String registrationNumber;
        @Generated
        private String studentName;
        @Generated
        private String email;
        @Generated
        private String phoneNumber;
        @Generated
        private String profilePicture;
        @Generated
        private String programme;
        @Generated
        private String faculty;
        @Generated
        private String department;
        @Generated
        private String departmentCode;
        @Generated
        private String yearOfStudy;
        @Generated
        private String academicYear;
        @Generated
        private String semester;
        @Generated
        private String studentStatus;
        @Generated
        private ClearanceStatus status;
        @Generated
        private String statusMessage;
        @Generated
        private String statusColor;
        @Generated
        private String statusIcon;
        @Generated
        private String statusDescription;
        @Generated
        private boolean isEditable;
        @Generated
        private boolean canReapply;
        @Generated
        private int progressPercentage;
        @Generated
        private int totalDepartments;
        @Generated
        private int approvedCount;
        @Generated
        private int pendingCount;
        @Generated
        private int rejectedCount;
        @Generated
        private int notStartedCount;
        @Generated
        private int completedCount;
        @Generated
        private String progressText;
        @Generated
        private String progressLevel;
        @Generated
        private List<DepartmentApprovalDTO> approvals;
        @Generated
        private Map<String, DepartmentSummaryDTO> departmentSummary;
        @Generated
        private LocalDateTime requestDate;
        @Generated
        private LocalDateTime completedDate;
        @Generated
        private LocalDateTime lastUpdated;
        @Generated
        private String estimatedCompletionDate;
        @Generated
        private int daysSinceRequest;
        @Generated
        private Long daysRemaining;
        @Generated
        private List<TimelineEventDTO> timeline;
        @Generated
        private List<DocumentDTO> documents;
        @Generated
        private boolean hasCertificate;
        @Generated
        private String certificateUrl;
        @Generated
        private LocalDateTime certificateGeneratedDate;
        @Generated
        private LocalDateTime certificateExpiryDate;
        @Generated
        private boolean hasPendingNotifications;
        @Generated
        private int notificationCount;
        @Generated
        private List<NotificationDTO> recentNotifications;
        @Generated
        private NotificationDTO lastNotification;
        @Generated
        private String nextAction;
        @Generated
        private List<String> availableActions;
        @Generated
        private List<ActionButtonDTO> actionButtons;
        @Generated
        private Map<String, Object> metadata;
        @Generated
        private String qrCodeUrl;
        @Generated
        private String clearanceCertificateId;
        @Generated
        private boolean isUrgent;
        @Generated
        private String priorityLevel;
        @Generated
        private String remarks;

        public ClearanceResponseBuilder withStatus(ClearanceStatus status) {
            this.status = status;
            this.statusMessage = this.getStatusMessage(status);
            this.statusColor = this.getStatusColor(status);
            this.statusIcon = this.getStatusIcon(status);
            this.statusDescription = this.getStatusDescription(status);
            this.isEditable = status != ClearanceStatus.COMPLETED && status != ClearanceStatus.CLEARED;
            this.canReapply = status == ClearanceStatus.REJECTED;
            return this;
        }

        private String getStatusMessage(ClearanceStatus status) {
            String var10000;
            switch (status) {
                case PENDING -> var10000 = "Your clearance is pending review";
                case APPROVED -> var10000 = "Your clearance has been approved";
                case REJECTED -> var10000 = "Your clearance has been rejected";
                case CLEARED -> var10000 = "You are fully cleared! \ud83c\udf89";
                case IN_PROGRESS -> var10000 = "Your clearance is in progress";
                case COMPLETED -> var10000 = "Clearance process completed successfully";
                default -> var10000 = "Unknown status";
            }

            return var10000;
        }

        private String getStatusColor(ClearanceStatus status) {
            String var10000;
            switch (status) {
                case PENDING -> var10000 = "#ffc107";
                case APPROVED -> var10000 = "#28a745";
                case REJECTED -> var10000 = "#dc3545";
                case CLEARED -> var10000 = "#28a745";
                case IN_PROGRESS -> var10000 = "#17a2b8";
                case COMPLETED -> var10000 = "#28a745";
                default -> var10000 = "#6c757d";
            }

            return var10000;
        }

        private String getStatusIcon(ClearanceStatus status) {
            String var10000;
            switch (status) {
                case PENDING -> var10000 = "⏳";
                case APPROVED -> var10000 = "✅";
                case REJECTED -> var10000 = "❌";
                case CLEARED -> var10000 = "\ud83c\udf89";
                case IN_PROGRESS -> var10000 = "\ud83d\udd04";
                case COMPLETED -> var10000 = "✅";
                default -> var10000 = "\ud83d\udccb";
            }

            return var10000;
        }

        private String getStatusDescription(ClearanceStatus status) {
            String var10000;
            switch (status) {
                case PENDING -> var10000 = "Your clearance request has been submitted and is waiting for review.";
                case APPROVED -> var10000 = "Your clearance has been approved by all departments.";
                case REJECTED -> var10000 = "Your clearance request has been rejected. Please review the reason.";
                case CLEARED -> var10000 = "Congratulations! You have been fully cleared.";
                case IN_PROGRESS -> var10000 = "Departments are currently reviewing your clearance request.";
                case COMPLETED -> var10000 = "Your clearance process is complete.";
                default -> var10000 = "Status unknown";
            }

            return var10000;
        }

        @Generated
        ClearanceResponseBuilder() {
        }

        @JsonProperty("id")
        @Generated
        public ClearanceResponseBuilder requestId(final String requestId) {
            this.requestId = requestId;
            return this;
        }

        @JsonProperty("student_id")
        @Generated
        public ClearanceResponseBuilder studentId(final String studentId) {
            this.studentId = studentId;
            return this;
        }

        @JsonProperty("registration_number")
        @Generated
        public ClearanceResponseBuilder registrationNumber(final String registrationNumber) {
            this.registrationNumber = registrationNumber;
            return this;
        }

        @JsonProperty("student_name")
        @Generated
        public ClearanceResponseBuilder studentName(final String studentName) {
            this.studentName = studentName;
            return this;
        }

        @JsonProperty("email")
        @Generated
        public ClearanceResponseBuilder email(final String email) {
            this.email = email;
            return this;
        }

        @JsonProperty("phone_number")
        @Generated
        public ClearanceResponseBuilder phoneNumber(final String phoneNumber) {
            this.phoneNumber = phoneNumber;
            return this;
        }

        @JsonProperty("profile_picture")
        @Generated
        public ClearanceResponseBuilder profilePicture(final String profilePicture) {
            this.profilePicture = profilePicture;
            return this;
        }

        @JsonProperty("programme")
        @Generated
        public ClearanceResponseBuilder programme(final String programme) {
            this.programme = programme;
            return this;
        }

        @JsonProperty("faculty")
        @Generated
        public ClearanceResponseBuilder faculty(final String faculty) {
            this.faculty = faculty;
            return this;
        }

        @JsonProperty("department")
        @Generated
        public ClearanceResponseBuilder department(final String department) {
            this.department = department;
            return this;
        }

        @JsonProperty("department_code")
        @Generated
        public ClearanceResponseBuilder departmentCode(final String departmentCode) {
            this.departmentCode = departmentCode;
            return this;
        }

        @JsonProperty("year_of_study")
        @Generated
        public ClearanceResponseBuilder yearOfStudy(final String yearOfStudy) {
            this.yearOfStudy = yearOfStudy;
            return this;
        }

        @JsonProperty("academic_year")
        @Generated
        public ClearanceResponseBuilder academicYear(final String academicYear) {
            this.academicYear = academicYear;
            return this;
        }

        @JsonProperty("semester")
        @Generated
        public ClearanceResponseBuilder semester(final String semester) {
            this.semester = semester;
            return this;
        }

        @JsonProperty("student_status")
        @Generated
        public ClearanceResponseBuilder studentStatus(final String studentStatus) {
            this.studentStatus = studentStatus;
            return this;
        }

        @JsonProperty("status")
        @Generated
        public ClearanceResponseBuilder status(final ClearanceStatus status) {
            this.status = status;
            return this;
        }

        @JsonProperty("status_message")
        @Generated
        public ClearanceResponseBuilder statusMessage(final String statusMessage) {
            this.statusMessage = statusMessage;
            return this;
        }

        @JsonProperty("status_color")
        @Generated
        public ClearanceResponseBuilder statusColor(final String statusColor) {
            this.statusColor = statusColor;
            return this;
        }

        @JsonProperty("status_icon")
        @Generated
        public ClearanceResponseBuilder statusIcon(final String statusIcon) {
            this.statusIcon = statusIcon;
            return this;
        }

        @JsonProperty("status_description")
        @Generated
        public ClearanceResponseBuilder statusDescription(final String statusDescription) {
            this.statusDescription = statusDescription;
            return this;
        }

        @JsonProperty("is_editable")
        @Generated
        public ClearanceResponseBuilder isEditable(final boolean isEditable) {
            this.isEditable = isEditable;
            return this;
        }

        @JsonProperty("can_reapply")
        @Generated
        public ClearanceResponseBuilder canReapply(final boolean canReapply) {
            this.canReapply = canReapply;
            return this;
        }

        @JsonProperty("progress_percentage")
        @Generated
        public ClearanceResponseBuilder progressPercentage(final int progressPercentage) {
            this.progressPercentage = progressPercentage;
            return this;
        }

        @JsonProperty("total_departments")
        @Generated
        public ClearanceResponseBuilder totalDepartments(final int totalDepartments) {
            this.totalDepartments = totalDepartments;
            return this;
        }

        @JsonProperty("approved_count")
        @Generated
        public ClearanceResponseBuilder approvedCount(final int approvedCount) {
            this.approvedCount = approvedCount;
            return this;
        }

        @JsonProperty("pending_count")
        @Generated
        public ClearanceResponseBuilder pendingCount(final int pendingCount) {
            this.pendingCount = pendingCount;
            return this;
        }

        @JsonProperty("rejected_count")
        @Generated
        public ClearanceResponseBuilder rejectedCount(final int rejectedCount) {
            this.rejectedCount = rejectedCount;
            return this;
        }

        @JsonProperty("not_started_count")
        @Generated
        public ClearanceResponseBuilder notStartedCount(final int notStartedCount) {
            this.notStartedCount = notStartedCount;
            return this;
        }

        @JsonProperty("completed_count")
        @Generated
        public ClearanceResponseBuilder completedCount(final int completedCount) {
            this.completedCount = completedCount;
            return this;
        }

        @JsonProperty("progress_text")
        @Generated
        public ClearanceResponseBuilder progressText(final String progressText) {
            this.progressText = progressText;
            return this;
        }

        @JsonProperty("progress_level")
        @Generated
        public ClearanceResponseBuilder progressLevel(final String progressLevel) {
            this.progressLevel = progressLevel;
            return this;
        }

        @JsonProperty("approvals")
        @Generated
        public ClearanceResponseBuilder approvals(final List<DepartmentApprovalDTO> approvals) {
            this.approvals = approvals;
            return this;
        }

        @JsonProperty("department_summary")
        @Generated
        public ClearanceResponseBuilder departmentSummary(final Map<String, DepartmentSummaryDTO> departmentSummary) {
            this.departmentSummary = departmentSummary;
            return this;
        }

        @JsonProperty("request_date")
        @Generated
        public ClearanceResponseBuilder requestDate(final LocalDateTime requestDate) {
            this.requestDate = requestDate;
            return this;
        }

        @JsonProperty("completed_date")
        @Generated
        public ClearanceResponseBuilder completedDate(final LocalDateTime completedDate) {
            this.completedDate = completedDate;
            return this;
        }

        @JsonProperty("last_updated")
        @Generated
        public ClearanceResponseBuilder lastUpdated(final LocalDateTime lastUpdated) {
            this.lastUpdated = lastUpdated;
            return this;
        }

        @JsonProperty("estimated_completion_date")
        @Generated
        public ClearanceResponseBuilder estimatedCompletionDate(final String estimatedCompletionDate) {
            this.estimatedCompletionDate = estimatedCompletionDate;
            return this;
        }

        @JsonProperty("days_since_request")
        @Generated
        public ClearanceResponseBuilder daysSinceRequest(final int daysSinceRequest) {
            this.daysSinceRequest = daysSinceRequest;
            return this;
        }

        @JsonProperty("days_remaining")
        @Generated
        public ClearanceResponseBuilder daysRemaining(final Long daysRemaining) {
            this.daysRemaining = daysRemaining;
            return this;
        }

        @JsonProperty("timeline")
        @Generated
        public ClearanceResponseBuilder timeline(final List<TimelineEventDTO> timeline) {
            this.timeline = timeline;
            return this;
        }

        @JsonProperty("documents")
        @Generated
        public ClearanceResponseBuilder documents(final List<DocumentDTO> documents) {
            this.documents = documents;
            return this;
        }

        @JsonProperty("has_certificate")
        @Generated
        public ClearanceResponseBuilder hasCertificate(final boolean hasCertificate) {
            this.hasCertificate = hasCertificate;
            return this;
        }

        @JsonProperty("certificate_url")
        @Generated
        public ClearanceResponseBuilder certificateUrl(final String certificateUrl) {
            this.certificateUrl = certificateUrl;
            return this;
        }

        @JsonProperty("certificate_generated_date")
        @Generated
        public ClearanceResponseBuilder certificateGeneratedDate(final LocalDateTime certificateGeneratedDate) {
            this.certificateGeneratedDate = certificateGeneratedDate;
            return this;
        }

        @JsonProperty("certificate_expiry_date")
        @Generated
        public ClearanceResponseBuilder certificateExpiryDate(final LocalDateTime certificateExpiryDate) {
            this.certificateExpiryDate = certificateExpiryDate;
            return this;
        }

        @JsonProperty("has_pending_notifications")
        @Generated
        public ClearanceResponseBuilder hasPendingNotifications(final boolean hasPendingNotifications) {
            this.hasPendingNotifications = hasPendingNotifications;
            return this;
        }

        @JsonProperty("notification_count")
        @Generated
        public ClearanceResponseBuilder notificationCount(final int notificationCount) {
            this.notificationCount = notificationCount;
            return this;
        }

        @JsonProperty("recent_notifications")
        @Generated
        public ClearanceResponseBuilder recentNotifications(final List<NotificationDTO> recentNotifications) {
            this.recentNotifications = recentNotifications;
            return this;
        }

        @JsonProperty("last_notification")
        @Generated
        public ClearanceResponseBuilder lastNotification(final NotificationDTO lastNotification) {
            this.lastNotification = lastNotification;
            return this;
        }

        @JsonProperty("next_action")
        @Generated
        public ClearanceResponseBuilder nextAction(final String nextAction) {
            this.nextAction = nextAction;
            return this;
        }

        @JsonProperty("available_actions")
        @Generated
        public ClearanceResponseBuilder availableActions(final List<String> availableActions) {
            this.availableActions = availableActions;
            return this;
        }

        @JsonProperty("action_buttons")
        @Generated
        public ClearanceResponseBuilder actionButtons(final List<ActionButtonDTO> actionButtons) {
            this.actionButtons = actionButtons;
            return this;
        }

        @JsonProperty("metadata")
        @Generated
        public ClearanceResponseBuilder metadata(final Map<String, Object> metadata) {
            this.metadata = metadata;
            return this;
        }

        @JsonProperty("qr_code_url")
        @Generated
        public ClearanceResponseBuilder qrCodeUrl(final String qrCodeUrl) {
            this.qrCodeUrl = qrCodeUrl;
            return this;
        }

        @JsonProperty("clearance_certificate_id")
        @Generated
        public ClearanceResponseBuilder clearanceCertificateId(final String clearanceCertificateId) {
            this.clearanceCertificateId = clearanceCertificateId;
            return this;
        }

        @JsonProperty("is_urgent")
        @Generated
        public ClearanceResponseBuilder isUrgent(final boolean isUrgent) {
            this.isUrgent = isUrgent;
            return this;
        }

        @JsonProperty("priority_level")
        @Generated
        public ClearanceResponseBuilder priorityLevel(final String priorityLevel) {
            this.priorityLevel = priorityLevel;
            return this;
        }

        @JsonProperty("remarks")
        @Generated
        public ClearanceResponseBuilder remarks(final String remarks) {
            this.remarks = remarks;
            return this;
        }

        @Generated
        public ClearanceResponse build() {
            return new ClearanceResponse(this.requestId, this.studentId, this.registrationNumber, this.studentName, this.email, this.phoneNumber, this.profilePicture, this.programme, this.faculty, this.department, this.departmentCode, this.yearOfStudy, this.academicYear, this.semester, this.studentStatus, this.status, this.statusMessage, this.statusColor, this.statusIcon, this.statusDescription, this.isEditable, this.canReapply, this.progressPercentage, this.totalDepartments, this.approvedCount, this.pendingCount, this.rejectedCount, this.notStartedCount, this.completedCount, this.progressText, this.progressLevel, this.approvals, this.departmentSummary, this.requestDate, this.completedDate, this.lastUpdated, this.estimatedCompletionDate, this.daysSinceRequest, this.daysRemaining, this.timeline, this.documents, this.hasCertificate, this.certificateUrl, this.certificateGeneratedDate, this.certificateExpiryDate, this.hasPendingNotifications, this.notificationCount, this.recentNotifications, this.lastNotification, this.nextAction, this.availableActions, this.actionButtons, this.metadata, this.qrCodeUrl, this.clearanceCertificateId, this.isUrgent, this.priorityLevel, this.remarks);
        }

        @Generated
        public String toString() {
            String var10000 = this.requestId;
            return "ClearanceResponse.ClearanceResponseBuilder(requestId=" + var10000 + ", studentId=" + this.studentId + ", registrationNumber=" + this.registrationNumber + ", studentName=" + this.studentName + ", email=" + this.email + ", phoneNumber=" + this.phoneNumber + ", profilePicture=" + this.profilePicture + ", programme=" + this.programme + ", faculty=" + this.faculty + ", department=" + this.department + ", departmentCode=" + this.departmentCode + ", yearOfStudy=" + this.yearOfStudy + ", academicYear=" + this.academicYear + ", semester=" + this.semester + ", studentStatus=" + this.studentStatus + ", status=" + String.valueOf(this.status) + ", statusMessage=" + this.statusMessage + ", statusColor=" + this.statusColor + ", statusIcon=" + this.statusIcon + ", statusDescription=" + this.statusDescription + ", isEditable=" + this.isEditable + ", canReapply=" + this.canReapply + ", progressPercentage=" + this.progressPercentage + ", totalDepartments=" + this.totalDepartments + ", approvedCount=" + this.approvedCount + ", pendingCount=" + this.pendingCount + ", rejectedCount=" + this.rejectedCount + ", notStartedCount=" + this.notStartedCount + ", completedCount=" + this.completedCount + ", progressText=" + this.progressText + ", progressLevel=" + this.progressLevel + ", approvals=" + String.valueOf(this.approvals) + ", departmentSummary=" + String.valueOf(this.departmentSummary) + ", requestDate=" + String.valueOf(this.requestDate) + ", completedDate=" + String.valueOf(this.completedDate) + ", lastUpdated=" + String.valueOf(this.lastUpdated) + ", estimatedCompletionDate=" + this.estimatedCompletionDate + ", daysSinceRequest=" + this.daysSinceRequest + ", daysRemaining=" + String.valueOf(this.daysRemaining) + ", timeline=" + String.valueOf(this.timeline) + ", documents=" + String.valueOf(this.documents) + ", hasCertificate=" + this.hasCertificate + ", certificateUrl=" + this.certificateUrl + ", certificateGeneratedDate=" + String.valueOf(this.certificateGeneratedDate) + ", certificateExpiryDate=" + String.valueOf(this.certificateExpiryDate) + ", hasPendingNotifications=" + this.hasPendingNotifications + ", notificationCount=" + this.notificationCount + ", recentNotifications=" + String.valueOf(this.recentNotifications) + ", lastNotification=" + String.valueOf(this.lastNotification) + ", nextAction=" + this.nextAction + ", availableActions=" + String.valueOf(this.availableActions) + ", actionButtons=" + String.valueOf(this.actionButtons) + ", metadata=" + String.valueOf(this.metadata) + ", qrCodeUrl=" + this.qrCodeUrl + ", clearanceCertificateId=" + this.clearanceCertificateId + ", isUrgent=" + this.isUrgent + ", priorityLevel=" + this.priorityLevel + ", remarks=" + this.remarks + ")";
        }
    }

    public static class ApprovalDTO {
        public ApprovalDTO() {
        }

        public static Object builder() {
            return null;
        }
    }
}
