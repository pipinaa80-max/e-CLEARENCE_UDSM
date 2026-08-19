

package com.UDSM.BACKEND.dto;
import com.UDSM.BACKEND.Model.ClearanceStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.Generated;

@JsonInclude(Include.NON_NULL)
public class ApprovalDTO {
    @JsonProperty("id")
    private String id;
    @JsonProperty("clearance_request_id")
    private String clearanceRequestId;
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
    @JsonProperty("department_type")
    private String departmentType;
    @JsonProperty("order")
    private int order;
    @JsonProperty("is_mandatory")
    private boolean isMandatory = true;
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
    @JsonProperty("is_completed")
    private boolean isCompleted;
    @JsonProperty("is_pending")
    private boolean isPending;
    @JsonProperty("is_rejected")
    private boolean isRejected;
    @JsonProperty("is_approved")
    private boolean isApproved;
    @JsonProperty("approved_by")
    private String approvedBy;
    @JsonProperty("approver_id")
    private String approverId;
    @JsonProperty("approver_email")
    private String approverEmail;
    @JsonProperty("approver_phone")
    private String approverPhone;
    @JsonProperty("approver_title")
    private String approverTitle;
    @JsonProperty("approver_department")
    private String approverDepartment;
    @JsonProperty("approver_signature")
    private String approverSignature;
    @JsonProperty("approval_date")
    private LocalDateTime approvalDate;
    @JsonProperty("formatted_approval_date")
    private String formattedApprovalDate;
    @JsonProperty("rejection_reason")
    private String rejectionReason;
    @JsonProperty("rejection_details")
    private String rejectionDetails;
    @JsonProperty("rejection_category")
    private String rejectionCategory;
    @JsonProperty("rejected_by")
    private String rejectedBy;
    @JsonProperty("rejection_date")
    private LocalDateTime rejectionDate;
    @JsonProperty("can_contest_rejection")
    private boolean canContestRejection;
    @JsonProperty("contest_deadline")
    private LocalDateTime contestDeadline;
    @JsonProperty("comments")
    private String comments;
    @JsonProperty("internal_notes")
    private String internalNotes;
    @JsonProperty("student_notes")
    private String studentNotes;
    @JsonProperty("additional_notes")
    private String additionalNotes;
    @JsonProperty("requirements")
    private List<RequirementDTO> requirements = new ArrayList();
    @JsonProperty("total_requirements")
    private int totalRequirements;
    @JsonProperty("completed_requirements")
    private int completedRequirements;
    @JsonProperty("requirements_progress")
    private int requirementsProgress;
    @JsonProperty("pending_requirements")
    private List<String> pendingRequirementNames = new ArrayList();
    @JsonProperty("missing_requirements")
    private List<String> missingRequirements = new ArrayList();
    @JsonProperty("attachments")
    private List<AttachmentDTO> attachments = new ArrayList();
    @JsonProperty("supporting_documents")
    private List<DocumentDTO> supportingDocuments = new ArrayList();
    @JsonProperty("has_attachments")
    private boolean hasAttachments;
    @JsonProperty("attachment_count")
    private int attachmentCount;
    @JsonProperty("contact_person")
    private String contactPerson;
    @JsonProperty("contact_phone")
    private String contactPhone;
    @JsonProperty("contact_email")
    private String contactEmail;
    @JsonProperty("office_location")
    private String officeLocation;
    @JsonProperty("office_room")
    private String officeRoom;
    @JsonProperty("working_hours")
    private String workingHours;
    @JsonProperty("office_extension")
    private String officeExtension;
    @JsonProperty("submitted_date")
    private LocalDateTime submittedDate;
    @JsonProperty("review_started_date")
    private LocalDateTime reviewStartedDate;
    @JsonProperty("decision_date")
    private LocalDateTime decisionDate;
    @JsonProperty("days_pending")
    private Long daysPending;
    @JsonProperty("processing_time")
    private String processingTime;
    @JsonProperty("estimated_processing_time")
    private String estimatedProcessingTime;
    @JsonProperty("deadline")
    private LocalDateTime deadline;
    @JsonProperty("is_overdue")
    private boolean isOverdue;
    @JsonProperty("days_overdue")
    private Long daysOverdue;
    @JsonProperty("available_actions")
    private List<String> availableActions = new ArrayList();
    @JsonProperty("action_buttons")
    private List<ActionButtonDTO> actionButtons = new ArrayList();
    @JsonProperty("next_action")
    private String nextAction;
    @JsonProperty("action_required")
    private boolean actionRequired;
    @JsonProperty("metadata")
    private Map<String, Object> metadata;
    @JsonProperty("is_urgent")
    private boolean isUrgent;
    @JsonProperty("priority")
    private String priority;
    @JsonProperty("tags")
    private List<String> tags = new ArrayList();
    @JsonProperty("history")
    private List<ApprovalHistoryDTO> history = new ArrayList();
    @JsonProperty("can_approve")
    private boolean canApprove;
    @JsonProperty("can_reject")
    private boolean canReject;
    @JsonProperty("can_edit")
    private boolean canEdit;
    @JsonProperty("can_comment")
    private boolean canComment;
    @JsonProperty("can_upload")
    private boolean canUpload;
    @JsonProperty("can_delete")
    private boolean canDelete;

    @JsonProperty("is_finalized")
    public boolean isFinalized() {
        return this.status == ClearanceStatus.APPROVED || this.status == ClearanceStatus.REJECTED;
    }

    @JsonProperty("is_pending")
    public boolean isPending() {
        return this.status == ClearanceStatus.PENDING;
    }

    @JsonProperty("formatted_approval_date")
    public String getFormattedApprovalDate() {
        return this.approvalDate == null ? null : this.approvalDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));
    }

    @JsonProperty("days_pending")
    public Long getDaysPending() {
        return this.submittedDate == null ? null : Duration.between(this.submittedDate, LocalDateTime.now()).toDays();
    }

    @JsonProperty("is_overdue")
    public boolean isOverdue() {
        return this.deadline == null ? false : LocalDateTime.now().isAfter(this.deadline);
    }

    @JsonProperty("days_overdue")
    public Long getDaysOverdue() {
        if (this.deadline == null) {
            return null;
        } else {
            return !this.isOverdue() ? 0L : Duration.between(this.deadline, LocalDateTime.now()).toDays();
        }
    }

    @JsonProperty("requirements_progress")
    public int getRequirementsProgress() {
        return this.totalRequirements == 0 ? 0 : this.completedRequirements * 100 / this.totalRequirements;
    }

    @JsonProperty("available_actions")
    public List<String> getAvailableActions() {
        List<String> actions = new ArrayList();
        if (this.status == ClearanceStatus.PENDING) {
            if (this.canApprove) {
                actions.add("APPROVE");
            }

            if (this.canReject) {
                actions.add("REJECT");
            }

            if (this.canComment) {
                actions.add("ADD_COMMENT");
            }

            if (this.canUpload) {
                actions.add("UPLOAD_DOCUMENT");
            }
        }

        if (this.status == ClearanceStatus.REJECTED && this.canContestRejection) {
            actions.add("CONTEST");
        }

        if (this.canEdit) {
            actions.add("EDIT");
        }

        if (this.canDelete) {
            actions.add("DELETE");
        }

        actions.add("VIEW_HISTORY");
        return actions;
    }

    @JsonProperty("status_color")
    public String getStatusColor() {
        String var10000;
        switch (this.status) {
            case PENDING:
                var10000 = "#ffc107";
                break;
            case APPROVED:
                var10000 = "#28a745";
                break;
            case REJECTED:
                var10000 = "#dc3545";
                break;
            case CLEARED:
            default:
                var10000 = "#6c757d";
                break;
            case IN_PROGRESS:
                var10000 = "#17a2b8";
        }

        return var10000;
    }

    @JsonProperty("status_icon")
    public String getStatusIcon() {
        String var10000;
        switch (this.status) {
            case PENDING:
                var10000 = "⏳";
                break;
            case APPROVED:
                var10000 = "✅";
                break;
            case REJECTED:
                var10000 = "❌";
                break;
            case CLEARED:
            default:
                var10000 = "\ud83d\udccb";
                break;
            case IN_PROGRESS:
                var10000 = "\ud83d\udd04";
        }

        return var10000;
    }

    @JsonProperty("status_message")
    public String getStatusMessage() {
        String var10000;
        switch (this.status) {
            case PENDING:
                var10000 = "Waiting for review";
                break;
            case APPROVED:
                var10000 = "Approved";
                break;
            case REJECTED:
                var10000 = "Rejected";
                break;
            case CLEARED:
            default:
                var10000 = "Unknown";
                break;
            case IN_PROGRESS:
                var10000 = "Under review";
        }

        return var10000;
    }

    @Generated
    public static ApprovalDTOBuilder builder() {
        return new ApprovalDTOBuilder();
    }

    @Generated
    public String getId() {
        return this.id;
    }

    @Generated
    public String getClearanceRequestId() {
        return this.clearanceRequestId;
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
    public String getDepartmentType() {
        return this.departmentType;
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
    public ClearanceStatus getStatus() {
        return this.status;
    }

    @Generated
    public String getStatusDescription() {
        return this.statusDescription;
    }

    @Generated
    public boolean isCompleted() {
        return this.isCompleted;
    }

    @Generated
    public boolean isRejected() {
        return this.isRejected;
    }

    @Generated
    public boolean isApproved() {
        return this.isApproved;
    }

    @Generated
    public String getApprovedBy() {
        return this.approvedBy;
    }

    @Generated
    public String getApproverId() {
        return this.approverId;
    }

    @Generated
    public String getApproverEmail() {
        return this.approverEmail;
    }

    @Generated
    public String getApproverPhone() {
        return this.approverPhone;
    }

    @Generated
    public String getApproverTitle() {
        return this.approverTitle;
    }

    @Generated
    public String getApproverDepartment() {
        return this.approverDepartment;
    }

    @Generated
    public String getApproverSignature() {
        return this.approverSignature;
    }

    @Generated
    public LocalDateTime getApprovalDate() {
        return this.approvalDate;
    }

    @Generated
    public String getRejectionReason() {
        return this.rejectionReason;
    }

    @Generated
    public String getRejectionDetails() {
        return this.rejectionDetails;
    }

    @Generated
    public String getRejectionCategory() {
        return this.rejectionCategory;
    }

    @Generated
    public String getRejectedBy() {
        return this.rejectedBy;
    }

    @Generated
    public LocalDateTime getRejectionDate() {
        return this.rejectionDate;
    }

    @Generated
    public boolean isCanContestRejection() {
        return this.canContestRejection;
    }

    @Generated
    public LocalDateTime getContestDeadline() {
        return this.contestDeadline;
    }

    @Generated
    public String getComments() {
        return this.comments;
    }

    @Generated
    public String getInternalNotes() {
        return this.internalNotes;
    }

    @Generated
    public String getStudentNotes() {
        return this.studentNotes;
    }

    @Generated
    public String getAdditionalNotes() {
        return this.additionalNotes;
    }

    @Generated
    public List<RequirementDTO> getRequirements() {
        return this.requirements;
    }

    @Generated
    public int getTotalRequirements() {
        return this.totalRequirements;
    }

    @Generated
    public int getCompletedRequirements() {
        return this.completedRequirements;
    }

    @Generated
    public List<String> getPendingRequirementNames() {
        return this.pendingRequirementNames;
    }

    @Generated
    public List<String> getMissingRequirements() {
        return this.missingRequirements;
    }

    @Generated
    public List<AttachmentDTO> getAttachments() {
        return this.attachments;
    }

    @Generated
    public List<DocumentDTO> getSupportingDocuments() {
        return this.supportingDocuments;
    }

    @Generated
    public boolean isHasAttachments() {
        return this.hasAttachments;
    }

    @Generated
    public int getAttachmentCount() {
        return this.attachmentCount;
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
    public String getOfficeRoom() {
        return this.officeRoom;
    }

    @Generated
    public String getWorkingHours() {
        return this.workingHours;
    }

    @Generated
    public String getOfficeExtension() {
        return this.officeExtension;
    }

    @Generated
    public LocalDateTime getSubmittedDate() {
        return this.submittedDate;
    }

    @Generated
    public LocalDateTime getReviewStartedDate() {
        return this.reviewStartedDate;
    }

    @Generated
    public LocalDateTime getDecisionDate() {
        return this.decisionDate;
    }

    @Generated
    public String getProcessingTime() {
        return this.processingTime;
    }

    @Generated
    public String getEstimatedProcessingTime() {
        return this.estimatedProcessingTime;
    }

    @Generated
    public LocalDateTime getDeadline() {
        return this.deadline;
    }

    @Generated
    public List<ActionButtonDTO> getActionButtons() {
        return this.actionButtons;
    }

    @Generated
    public String getNextAction() {
        return this.nextAction;
    }

    @Generated
    public boolean isActionRequired() {
        return this.actionRequired;
    }

    @Generated
    public Map<String, Object> getMetadata() {
        return this.metadata;
    }

    @Generated
    public boolean isUrgent() {
        return this.isUrgent;
    }

    @Generated
    public String getPriority() {
        return this.priority;
    }

    @Generated
    public List<String> getTags() {
        return this.tags;
    }

    @Generated
    public List<ApprovalHistoryDTO> getHistory() {
        return this.history;
    }

    @Generated
    public boolean isCanApprove() {
        return this.canApprove;
    }

    @Generated
    public boolean isCanReject() {
        return this.canReject;
    }

    @Generated
    public boolean isCanEdit() {
        return this.canEdit;
    }

    @Generated
    public boolean isCanComment() {
        return this.canComment;
    }

    @Generated
    public boolean isCanUpload() {
        return this.canUpload;
    }

    @Generated
    public boolean isCanDelete() {
        return this.canDelete;
    }

    @Generated
    public void setId(final String id) {
        this.id = id;
    }

    @Generated
    public void setClearanceRequestId(final String clearanceRequestId) {
        this.clearanceRequestId = clearanceRequestId;
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
    public void setDepartmentType(final String departmentType) {
        this.departmentType = departmentType;
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
    public void setCompleted(final boolean isCompleted) {
        this.isCompleted = isCompleted;
    }

    @Generated
    public void setPending(final boolean isPending) {
        this.isPending = isPending;
    }

    @Generated
    public void setRejected(final boolean isRejected) {
        this.isRejected = isRejected;
    }

    @Generated
    public void setApproved(final boolean isApproved) {
        this.isApproved = isApproved;
    }

    @Generated
    public void setApprovedBy(final String approvedBy) {
        this.approvedBy = approvedBy;
    }

    @Generated
    public void setApproverId(final String approverId) {
        this.approverId = approverId;
    }

    @Generated
    public void setApproverEmail(final String approverEmail) {
        this.approverEmail = approverEmail;
    }

    @Generated
    public void setApproverPhone(final String approverPhone) {
        this.approverPhone = approverPhone;
    }

    @Generated
    public void setApproverTitle(final String approverTitle) {
        this.approverTitle = approverTitle;
    }

    @Generated
    public void setApproverDepartment(final String approverDepartment) {
        this.approverDepartment = approverDepartment;
    }

    @Generated
    public void setApproverSignature(final String approverSignature) {
        this.approverSignature = approverSignature;
    }

    @Generated
    public void setApprovalDate(final LocalDateTime approvalDate) {
        this.approvalDate = approvalDate;
    }

    @Generated
    public void setFormattedApprovalDate(final String formattedApprovalDate) {
        this.formattedApprovalDate = formattedApprovalDate;
    }

    @Generated
    public void setRejectionReason(final String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    @Generated
    public void setRejectionDetails(final String rejectionDetails) {
        this.rejectionDetails = rejectionDetails;
    }

    @Generated
    public void setRejectionCategory(final String rejectionCategory) {
        this.rejectionCategory = rejectionCategory;
    }

    @Generated
    public void setRejectedBy(final String rejectedBy) {
        this.rejectedBy = rejectedBy;
    }

    @Generated
    public void setRejectionDate(final LocalDateTime rejectionDate) {
        this.rejectionDate = rejectionDate;
    }

    @Generated
    public void setCanContestRejection(final boolean canContestRejection) {
        this.canContestRejection = canContestRejection;
    }

    @Generated
    public void setContestDeadline(final LocalDateTime contestDeadline) {
        this.contestDeadline = contestDeadline;
    }

    @Generated
    public void setComments(final String comments) {
        this.comments = comments;
    }

    @Generated
    public void setInternalNotes(final String internalNotes) {
        this.internalNotes = internalNotes;
    }

    @Generated
    public void setStudentNotes(final String studentNotes) {
        this.studentNotes = studentNotes;
    }

    @Generated
    public void setAdditionalNotes(final String additionalNotes) {
        this.additionalNotes = additionalNotes;
    }

    @Generated
    public void setRequirements(final List<RequirementDTO> requirements) {
        this.requirements = requirements;
    }

    @Generated
    public void setTotalRequirements(final int totalRequirements) {
        this.totalRequirements = totalRequirements;
    }

    @Generated
    public void setCompletedRequirements(final int completedRequirements) {
        this.completedRequirements = completedRequirements;
    }

    @Generated
    public void setRequirementsProgress(final int requirementsProgress) {
        this.requirementsProgress = requirementsProgress;
    }

    @Generated
    public void setPendingRequirementNames(final List<String> pendingRequirementNames) {
        this.pendingRequirementNames = pendingRequirementNames;
    }

    @Generated
    public void setMissingRequirements(final List<String> missingRequirements) {
        this.missingRequirements = missingRequirements;
    }

    @Generated
    public void setAttachments(final List<AttachmentDTO> attachments) {
        this.attachments = attachments;
    }

    @Generated
    public void setSupportingDocuments(final List<DocumentDTO> supportingDocuments) {
        this.supportingDocuments = supportingDocuments;
    }

    @Generated
    public void setHasAttachments(final boolean hasAttachments) {
        this.hasAttachments = hasAttachments;
    }

    @Generated
    public void setAttachmentCount(final int attachmentCount) {
        this.attachmentCount = attachmentCount;
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
    public void setOfficeRoom(final String officeRoom) {
        this.officeRoom = officeRoom;
    }

    @Generated
    public void setWorkingHours(final String workingHours) {
        this.workingHours = workingHours;
    }

    @Generated
    public void setOfficeExtension(final String officeExtension) {
        this.officeExtension = officeExtension;
    }

    @Generated
    public void setSubmittedDate(final LocalDateTime submittedDate) {
        this.submittedDate = submittedDate;
    }

    @Generated
    public void setReviewStartedDate(final LocalDateTime reviewStartedDate) {
        this.reviewStartedDate = reviewStartedDate;
    }

    @Generated
    public void setDecisionDate(final LocalDateTime decisionDate) {
        this.decisionDate = decisionDate;
    }

    @Generated
    public void setDaysPending(final Long daysPending) {
        this.daysPending = daysPending;
    }

    @Generated
    public void setProcessingTime(final String processingTime) {
        this.processingTime = processingTime;
    }

    @Generated
    public void setEstimatedProcessingTime(final String estimatedProcessingTime) {
        this.estimatedProcessingTime = estimatedProcessingTime;
    }

    @Generated
    public void setDeadline(final LocalDateTime deadline) {
        this.deadline = deadline;
    }

    @Generated
    public void setOverdue(final boolean isOverdue) {
        this.isOverdue = isOverdue;
    }

    @Generated
    public void setDaysOverdue(final Long daysOverdue) {
        this.daysOverdue = daysOverdue;
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
    public void setNextAction(final String nextAction) {
        this.nextAction = nextAction;
    }

    @Generated
    public void setActionRequired(final boolean actionRequired) {
        this.actionRequired = actionRequired;
    }

    @Generated
    public void setMetadata(final Map<String, Object> metadata) {
        this.metadata = metadata;
    }

    @Generated
    public void setUrgent(final boolean isUrgent) {
        this.isUrgent = isUrgent;
    }

    @Generated
    public void setPriority(final String priority) {
        this.priority = priority;
    }

    @Generated
    public void setTags(final List<String> tags) {
        this.tags = tags;
    }

    @Generated
    public void setHistory(final List<ApprovalHistoryDTO> history) {
        this.history = history;
    }

    @Generated
    public void setCanApprove(final boolean canApprove) {
        this.canApprove = canApprove;
    }

    @Generated
    public void setCanReject(final boolean canReject) {
        this.canReject = canReject;
    }

    @Generated
    public void setCanEdit(final boolean canEdit) {
        this.canEdit = canEdit;
    }

    @Generated
    public void setCanComment(final boolean canComment) {
        this.canComment = canComment;
    }

    @Generated
    public void setCanUpload(final boolean canUpload) {
        this.canUpload = canUpload;
    }

    @Generated
    public void setCanDelete(final boolean canDelete) {
        this.canDelete = canDelete;
    }

    @Generated
    public boolean equals(final Object o) {
        if (o == this) {
            return true;
        } else if (!(o instanceof ApprovalDTO)) {
            return false;
        } else {
            ApprovalDTO other = (ApprovalDTO)o;
            if (!other.canEqual(this)) {
                return false;
            } else if (this.getOrder() != other.getOrder()) {
                return false;
            } else if (this.isMandatory() != other.isMandatory()) {
                return false;
            } else if (this.isCompleted() != other.isCompleted()) {
                return false;
            } else if (this.isPending() != other.isPending()) {
                return false;
            } else if (this.isRejected() != other.isRejected()) {
                return false;
            } else if (this.isApproved() != other.isApproved()) {
                return false;
            } else if (this.isCanContestRejection() != other.isCanContestRejection()) {
                return false;
            } else if (this.getTotalRequirements() != other.getTotalRequirements()) {
                return false;
            } else if (this.getCompletedRequirements() != other.getCompletedRequirements()) {
                return false;
            } else if (this.getRequirementsProgress() != other.getRequirementsProgress()) {
                return false;
            } else if (this.isHasAttachments() != other.isHasAttachments()) {
                return false;
            } else if (this.getAttachmentCount() != other.getAttachmentCount()) {
                return false;
            } else if (this.isOverdue() != other.isOverdue()) {
                return false;
            } else if (this.isActionRequired() != other.isActionRequired()) {
                return false;
            } else if (this.isUrgent() != other.isUrgent()) {
                return false;
            } else if (this.isCanApprove() != other.isCanApprove()) {
                return false;
            } else if (this.isCanReject() != other.isCanReject()) {
                return false;
            } else if (this.isCanEdit() != other.isCanEdit()) {
                return false;
            } else if (this.isCanComment() != other.isCanComment()) {
                return false;
            } else if (this.isCanUpload() != other.isCanUpload()) {
                return false;
            } else if (this.isCanDelete() != other.isCanDelete()) {
                return false;
            } else {
                Object this$daysPending = this.getDaysPending();
                Object other$daysPending = other.getDaysPending();
                if (this$daysPending == null) {
                    if (other$daysPending != null) {
                        return false;
                    }
                } else if (!this$daysPending.equals(other$daysPending)) {
                    return false;
                }

                Object this$daysOverdue = this.getDaysOverdue();
                Object other$daysOverdue = other.getDaysOverdue();
                if (this$daysOverdue == null) {
                    if (other$daysOverdue != null) {
                        return false;
                    }
                } else if (!this$daysOverdue.equals(other$daysOverdue)) {
                    return false;
                }

                Object this$id = this.getId();
                Object other$id = other.getId();
                if (this$id == null) {
                    if (other$id != null) {
                        return false;
                    }
                } else if (!this$id.equals(other$id)) {
                    return false;
                }

                Object this$clearanceRequestId = this.getClearanceRequestId();
                Object other$clearanceRequestId = other.getClearanceRequestId();
                if (this$clearanceRequestId == null) {
                    if (other$clearanceRequestId != null) {
                        return false;
                    }
                } else if (!this$clearanceRequestId.equals(other$clearanceRequestId)) {
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

                Object this$departmentType = this.getDepartmentType();
                Object other$departmentType = other.getDepartmentType();
                if (this$departmentType == null) {
                    if (other$departmentType != null) {
                        return false;
                    }
                } else if (!this$departmentType.equals(other$departmentType)) {
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

                Object this$approvedBy = this.getApprovedBy();
                Object other$approvedBy = other.getApprovedBy();
                if (this$approvedBy == null) {
                    if (other$approvedBy != null) {
                        return false;
                    }
                } else if (!this$approvedBy.equals(other$approvedBy)) {
                    return false;
                }

                Object this$approverId = this.getApproverId();
                Object other$approverId = other.getApproverId();
                if (this$approverId == null) {
                    if (other$approverId != null) {
                        return false;
                    }
                } else if (!this$approverId.equals(other$approverId)) {
                    return false;
                }

                Object this$approverEmail = this.getApproverEmail();
                Object other$approverEmail = other.getApproverEmail();
                if (this$approverEmail == null) {
                    if (other$approverEmail != null) {
                        return false;
                    }
                } else if (!this$approverEmail.equals(other$approverEmail)) {
                    return false;
                }

                Object this$approverPhone = this.getApproverPhone();
                Object other$approverPhone = other.getApproverPhone();
                if (this$approverPhone == null) {
                    if (other$approverPhone != null) {
                        return false;
                    }
                } else if (!this$approverPhone.equals(other$approverPhone)) {
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

                Object this$approverDepartment = this.getApproverDepartment();
                Object other$approverDepartment = other.getApproverDepartment();
                if (this$approverDepartment == null) {
                    if (other$approverDepartment != null) {
                        return false;
                    }
                } else if (!this$approverDepartment.equals(other$approverDepartment)) {
                    return false;
                }

                Object this$approverSignature = this.getApproverSignature();
                Object other$approverSignature = other.getApproverSignature();
                if (this$approverSignature == null) {
                    if (other$approverSignature != null) {
                        return false;
                    }
                } else if (!this$approverSignature.equals(other$approverSignature)) {
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

                Object this$formattedApprovalDate = this.getFormattedApprovalDate();
                Object other$formattedApprovalDate = other.getFormattedApprovalDate();
                if (this$formattedApprovalDate == null) {
                    if (other$formattedApprovalDate != null) {
                        return false;
                    }
                } else if (!this$formattedApprovalDate.equals(other$formattedApprovalDate)) {
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

                Object this$rejectionDetails = this.getRejectionDetails();
                Object other$rejectionDetails = other.getRejectionDetails();
                if (this$rejectionDetails == null) {
                    if (other$rejectionDetails != null) {
                        return false;
                    }
                } else if (!this$rejectionDetails.equals(other$rejectionDetails)) {
                    return false;
                }

                Object this$rejectionCategory = this.getRejectionCategory();
                Object other$rejectionCategory = other.getRejectionCategory();
                if (this$rejectionCategory == null) {
                    if (other$rejectionCategory != null) {
                        return false;
                    }
                } else if (!this$rejectionCategory.equals(other$rejectionCategory)) {
                    return false;
                }

                Object this$rejectedBy = this.getRejectedBy();
                Object other$rejectedBy = other.getRejectedBy();
                if (this$rejectedBy == null) {
                    if (other$rejectedBy != null) {
                        return false;
                    }
                } else if (!this$rejectedBy.equals(other$rejectedBy)) {
                    return false;
                }

                Object this$rejectionDate = this.getRejectionDate();
                Object other$rejectionDate = other.getRejectionDate();
                if (this$rejectionDate == null) {
                    if (other$rejectionDate != null) {
                        return false;
                    }
                } else if (!this$rejectionDate.equals(other$rejectionDate)) {
                    return false;
                }

                Object this$contestDeadline = this.getContestDeadline();
                Object other$contestDeadline = other.getContestDeadline();
                if (this$contestDeadline == null) {
                    if (other$contestDeadline != null) {
                        return false;
                    }
                } else if (!this$contestDeadline.equals(other$contestDeadline)) {
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

                Object this$internalNotes = this.getInternalNotes();
                Object other$internalNotes = other.getInternalNotes();
                if (this$internalNotes == null) {
                    if (other$internalNotes != null) {
                        return false;
                    }
                } else if (!this$internalNotes.equals(other$internalNotes)) {
                    return false;
                }

                Object this$studentNotes = this.getStudentNotes();
                Object other$studentNotes = other.getStudentNotes();
                if (this$studentNotes == null) {
                    if (other$studentNotes != null) {
                        return false;
                    }
                } else if (!this$studentNotes.equals(other$studentNotes)) {
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

                Object this$requirements = this.getRequirements();
                Object other$requirements = other.getRequirements();
                if (this$requirements == null) {
                    if (other$requirements != null) {
                        return false;
                    }
                } else if (!this$requirements.equals(other$requirements)) {
                    return false;
                }

                Object this$pendingRequirementNames = this.getPendingRequirementNames();
                Object other$pendingRequirementNames = other.getPendingRequirementNames();
                if (this$pendingRequirementNames == null) {
                    if (other$pendingRequirementNames != null) {
                        return false;
                    }
                } else if (!this$pendingRequirementNames.equals(other$pendingRequirementNames)) {
                    return false;
                }

                Object this$missingRequirements = this.getMissingRequirements();
                Object other$missingRequirements = other.getMissingRequirements();
                if (this$missingRequirements == null) {
                    if (other$missingRequirements != null) {
                        return false;
                    }
                } else if (!this$missingRequirements.equals(other$missingRequirements)) {
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

                Object this$supportingDocuments = this.getSupportingDocuments();
                Object other$supportingDocuments = other.getSupportingDocuments();
                if (this$supportingDocuments == null) {
                    if (other$supportingDocuments != null) {
                        return false;
                    }
                } else if (!this$supportingDocuments.equals(other$supportingDocuments)) {
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

                Object this$officeRoom = this.getOfficeRoom();
                Object other$officeRoom = other.getOfficeRoom();
                if (this$officeRoom == null) {
                    if (other$officeRoom != null) {
                        return false;
                    }
                } else if (!this$officeRoom.equals(other$officeRoom)) {
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

                Object this$officeExtension = this.getOfficeExtension();
                Object other$officeExtension = other.getOfficeExtension();
                if (this$officeExtension == null) {
                    if (other$officeExtension != null) {
                        return false;
                    }
                } else if (!this$officeExtension.equals(other$officeExtension)) {
                    return false;
                }

                Object this$submittedDate = this.getSubmittedDate();
                Object other$submittedDate = other.getSubmittedDate();
                if (this$submittedDate == null) {
                    if (other$submittedDate != null) {
                        return false;
                    }
                } else if (!this$submittedDate.equals(other$submittedDate)) {
                    return false;
                }

                Object this$reviewStartedDate = this.getReviewStartedDate();
                Object other$reviewStartedDate = other.getReviewStartedDate();
                if (this$reviewStartedDate == null) {
                    if (other$reviewStartedDate != null) {
                        return false;
                    }
                } else if (!this$reviewStartedDate.equals(other$reviewStartedDate)) {
                    return false;
                }

                Object this$decisionDate = this.getDecisionDate();
                Object other$decisionDate = other.getDecisionDate();
                if (this$decisionDate == null) {
                    if (other$decisionDate != null) {
                        return false;
                    }
                } else if (!this$decisionDate.equals(other$decisionDate)) {
                    return false;
                }

                Object this$processingTime = this.getProcessingTime();
                Object other$processingTime = other.getProcessingTime();
                if (this$processingTime == null) {
                    if (other$processingTime != null) {
                        return false;
                    }
                } else if (!this$processingTime.equals(other$processingTime)) {
                    return false;
                }

                Object this$estimatedProcessingTime = this.getEstimatedProcessingTime();
                Object other$estimatedProcessingTime = other.getEstimatedProcessingTime();
                if (this$estimatedProcessingTime == null) {
                    if (other$estimatedProcessingTime != null) {
                        return false;
                    }
                } else if (!this$estimatedProcessingTime.equals(other$estimatedProcessingTime)) {
                    return false;
                }

                Object this$deadline = this.getDeadline();
                Object other$deadline = other.getDeadline();
                if (this$deadline == null) {
                    if (other$deadline != null) {
                        return false;
                    }
                } else if (!this$deadline.equals(other$deadline)) {
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

                Object this$nextAction = this.getNextAction();
                Object other$nextAction = other.getNextAction();
                if (this$nextAction == null) {
                    if (other$nextAction != null) {
                        return false;
                    }
                } else if (!this$nextAction.equals(other$nextAction)) {
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

                Object this$priority = this.getPriority();
                Object other$priority = other.getPriority();
                if (this$priority == null) {
                    if (other$priority != null) {
                        return false;
                    }
                } else if (!this$priority.equals(other$priority)) {
                    return false;
                }

                Object this$tags = this.getTags();
                Object other$tags = other.getTags();
                if (this$tags == null) {
                    if (other$tags != null) {
                        return false;
                    }
                } else if (!this$tags.equals(other$tags)) {
                    return false;
                }

                Object this$history = this.getHistory();
                Object other$history = other.getHistory();
                if (this$history == null) {
                    if (other$history != null) {
                        return false;
                    }
                } else if (!this$history.equals(other$history)) {
                    return false;
                }

                return true;
            }
        }
    }

    @Generated
    protected boolean canEqual(final Object other) {
        return other instanceof ApprovalDTO;
    }

    @Generated
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getOrder();
        result = result * 59 + (this.isMandatory() ? 79 : 97);
        result = result * 59 + (this.isCompleted() ? 79 : 97);
        result = result * 59 + (this.isPending() ? 79 : 97);
        result = result * 59 + (this.isRejected() ? 79 : 97);
        result = result * 59 + (this.isApproved() ? 79 : 97);
        result = result * 59 + (this.isCanContestRejection() ? 79 : 97);
        result = result * 59 + this.getTotalRequirements();
        result = result * 59 + this.getCompletedRequirements();
        result = result * 59 + this.getRequirementsProgress();
        result = result * 59 + (this.isHasAttachments() ? 79 : 97);
        result = result * 59 + this.getAttachmentCount();
        result = result * 59 + (this.isOverdue() ? 79 : 97);
        result = result * 59 + (this.isActionRequired() ? 79 : 97);
        result = result * 59 + (this.isUrgent() ? 79 : 97);
        result = result * 59 + (this.isCanApprove() ? 79 : 97);
        result = result * 59 + (this.isCanReject() ? 79 : 97);
        result = result * 59 + (this.isCanEdit() ? 79 : 97);
        result = result * 59 + (this.isCanComment() ? 79 : 97);
        result = result * 59 + (this.isCanUpload() ? 79 : 97);
        result = result * 59 + (this.isCanDelete() ? 79 : 97);
        Object $daysPending = this.getDaysPending();
        result = result * 59 + ($daysPending == null ? 43 : $daysPending.hashCode());
        Object $daysOverdue = this.getDaysOverdue();
        result = result * 59 + ($daysOverdue == null ? 43 : $daysOverdue.hashCode());
        Object $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        Object $clearanceRequestId = this.getClearanceRequestId();
        result = result * 59 + ($clearanceRequestId == null ? 43 : $clearanceRequestId.hashCode());
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
        Object $departmentType = this.getDepartmentType();
        result = result * 59 + ($departmentType == null ? 43 : $departmentType.hashCode());
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
        Object $approvedBy = this.getApprovedBy();
        result = result * 59 + ($approvedBy == null ? 43 : $approvedBy.hashCode());
        Object $approverId = this.getApproverId();
        result = result * 59 + ($approverId == null ? 43 : $approverId.hashCode());
        Object $approverEmail = this.getApproverEmail();
        result = result * 59 + ($approverEmail == null ? 43 : $approverEmail.hashCode());
        Object $approverPhone = this.getApproverPhone();
        result = result * 59 + ($approverPhone == null ? 43 : $approverPhone.hashCode());
        Object $approverTitle = this.getApproverTitle();
        result = result * 59 + ($approverTitle == null ? 43 : $approverTitle.hashCode());
        Object $approverDepartment = this.getApproverDepartment();
        result = result * 59 + ($approverDepartment == null ? 43 : $approverDepartment.hashCode());
        Object $approverSignature = this.getApproverSignature();
        result = result * 59 + ($approverSignature == null ? 43 : $approverSignature.hashCode());
        Object $approvalDate = this.getApprovalDate();
        result = result * 59 + ($approvalDate == null ? 43 : $approvalDate.hashCode());
        Object $formattedApprovalDate = this.getFormattedApprovalDate();
        result = result * 59 + ($formattedApprovalDate == null ? 43 : $formattedApprovalDate.hashCode());
        Object $rejectionReason = this.getRejectionReason();
        result = result * 59 + ($rejectionReason == null ? 43 : $rejectionReason.hashCode());
        Object $rejectionDetails = this.getRejectionDetails();
        result = result * 59 + ($rejectionDetails == null ? 43 : $rejectionDetails.hashCode());
        Object $rejectionCategory = this.getRejectionCategory();
        result = result * 59 + ($rejectionCategory == null ? 43 : $rejectionCategory.hashCode());
        Object $rejectedBy = this.getRejectedBy();
        result = result * 59 + ($rejectedBy == null ? 43 : $rejectedBy.hashCode());
        Object $rejectionDate = this.getRejectionDate();
        result = result * 59 + ($rejectionDate == null ? 43 : $rejectionDate.hashCode());
        Object $contestDeadline = this.getContestDeadline();
        result = result * 59 + ($contestDeadline == null ? 43 : $contestDeadline.hashCode());
        Object $comments = this.getComments();
        result = result * 59 + ($comments == null ? 43 : $comments.hashCode());
        Object $internalNotes = this.getInternalNotes();
        result = result * 59 + ($internalNotes == null ? 43 : $internalNotes.hashCode());
        Object $studentNotes = this.getStudentNotes();
        result = result * 59 + ($studentNotes == null ? 43 : $studentNotes.hashCode());
        Object $additionalNotes = this.getAdditionalNotes();
        result = result * 59 + ($additionalNotes == null ? 43 : $additionalNotes.hashCode());
        Object $requirements = this.getRequirements();
        result = result * 59 + ($requirements == null ? 43 : $requirements.hashCode());
        Object $pendingRequirementNames = this.getPendingRequirementNames();
        result = result * 59 + ($pendingRequirementNames == null ? 43 : $pendingRequirementNames.hashCode());
        Object $missingRequirements = this.getMissingRequirements();
        result = result * 59 + ($missingRequirements == null ? 43 : $missingRequirements.hashCode());
        Object $attachments = this.getAttachments();
        result = result * 59 + ($attachments == null ? 43 : $attachments.hashCode());
        Object $supportingDocuments = this.getSupportingDocuments();
        result = result * 59 + ($supportingDocuments == null ? 43 : $supportingDocuments.hashCode());
        Object $contactPerson = this.getContactPerson();
        result = result * 59 + ($contactPerson == null ? 43 : $contactPerson.hashCode());
        Object $contactPhone = this.getContactPhone();
        result = result * 59 + ($contactPhone == null ? 43 : $contactPhone.hashCode());
        Object $contactEmail = this.getContactEmail();
        result = result * 59 + ($contactEmail == null ? 43 : $contactEmail.hashCode());
        Object $officeLocation = this.getOfficeLocation();
        result = result * 59 + ($officeLocation == null ? 43 : $officeLocation.hashCode());
        Object $officeRoom = this.getOfficeRoom();
        result = result * 59 + ($officeRoom == null ? 43 : $officeRoom.hashCode());
        Object $workingHours = this.getWorkingHours();
        result = result * 59 + ($workingHours == null ? 43 : $workingHours.hashCode());
        Object $officeExtension = this.getOfficeExtension();
        result = result * 59 + ($officeExtension == null ? 43 : $officeExtension.hashCode());
        Object $submittedDate = this.getSubmittedDate();
        result = result * 59 + ($submittedDate == null ? 43 : $submittedDate.hashCode());
        Object $reviewStartedDate = this.getReviewStartedDate();
        result = result * 59 + ($reviewStartedDate == null ? 43 : $reviewStartedDate.hashCode());
        Object $decisionDate = this.getDecisionDate();
        result = result * 59 + ($decisionDate == null ? 43 : $decisionDate.hashCode());
        Object $processingTime = this.getProcessingTime();
        result = result * 59 + ($processingTime == null ? 43 : $processingTime.hashCode());
        Object $estimatedProcessingTime = this.getEstimatedProcessingTime();
        result = result * 59 + ($estimatedProcessingTime == null ? 43 : $estimatedProcessingTime.hashCode());
        Object $deadline = this.getDeadline();
        result = result * 59 + ($deadline == null ? 43 : $deadline.hashCode());
        Object $availableActions = this.getAvailableActions();
        result = result * 59 + ($availableActions == null ? 43 : $availableActions.hashCode());
        Object $actionButtons = this.getActionButtons();
        result = result * 59 + ($actionButtons == null ? 43 : $actionButtons.hashCode());
        Object $nextAction = this.getNextAction();
        result = result * 59 + ($nextAction == null ? 43 : $nextAction.hashCode());
        Object $metadata = this.getMetadata();
        result = result * 59 + ($metadata == null ? 43 : $metadata.hashCode());
        Object $priority = this.getPriority();
        result = result * 59 + ($priority == null ? 43 : $priority.hashCode());
        Object $tags = this.getTags();
        result = result * 59 + ($tags == null ? 43 : $tags.hashCode());
        Object $history = this.getHistory();
        result = result * 59 + ($history == null ? 43 : $history.hashCode());
        return result;
    }

    @Generated
    public String toString() {
        String var10000 = this.getId();
        return "ApprovalDTO(id=" + var10000 + ", clearanceRequestId=" + this.getClearanceRequestId() + ", departmentId=" + this.getDepartmentId() + ", departmentName=" + this.getDepartmentName() + ", departmentCode=" + this.getDepartmentCode() + ", departmentIcon=" + this.getDepartmentIcon() + ", departmentColor=" + this.getDepartmentColor() + ", departmentType=" + this.getDepartmentType() + ", order=" + this.getOrder() + ", isMandatory=" + this.isMandatory() + ", status=" + String.valueOf(this.getStatus()) + ", statusMessage=" + this.getStatusMessage() + ", statusColor=" + this.getStatusColor() + ", statusIcon=" + this.getStatusIcon() + ", statusDescription=" + this.getStatusDescription() + ", isCompleted=" + this.isCompleted() + ", isPending=" + this.isPending() + ", isRejected=" + this.isRejected() + ", isApproved=" + this.isApproved() + ", approvedBy=" + this.getApprovedBy() + ", approverId=" + this.getApproverId() + ", approverEmail=" + this.getApproverEmail() + ", approverPhone=" + this.getApproverPhone() + ", approverTitle=" + this.getApproverTitle() + ", approverDepartment=" + this.getApproverDepartment() + ", approverSignature=" + this.getApproverSignature() + ", approvalDate=" + String.valueOf(this.getApprovalDate()) + ", formattedApprovalDate=" + this.getFormattedApprovalDate() + ", rejectionReason=" + this.getRejectionReason() + ", rejectionDetails=" + this.getRejectionDetails() + ", rejectionCategory=" + this.getRejectionCategory() + ", rejectedBy=" + this.getRejectedBy() + ", rejectionDate=" + String.valueOf(this.getRejectionDate()) + ", canContestRejection=" + this.isCanContestRejection() + ", contestDeadline=" + String.valueOf(this.getContestDeadline()) + ", comments=" + this.getComments() + ", internalNotes=" + this.getInternalNotes() + ", studentNotes=" + this.getStudentNotes() + ", additionalNotes=" + this.getAdditionalNotes() + ", requirements=" + String.valueOf(this.getRequirements()) + ", totalRequirements=" + this.getTotalRequirements() + ", completedRequirements=" + this.getCompletedRequirements() + ", requirementsProgress=" + this.getRequirementsProgress() + ", pendingRequirementNames=" + String.valueOf(this.getPendingRequirementNames()) + ", missingRequirements=" + String.valueOf(this.getMissingRequirements()) + ", attachments=" + String.valueOf(this.getAttachments()) + ", supportingDocuments=" + String.valueOf(this.getSupportingDocuments()) + ", hasAttachments=" + this.isHasAttachments() + ", attachmentCount=" + this.getAttachmentCount() + ", contactPerson=" + this.getContactPerson() + ", contactPhone=" + this.getContactPhone() + ", contactEmail=" + this.getContactEmail() + ", officeLocation=" + this.getOfficeLocation() + ", officeRoom=" + this.getOfficeRoom() + ", workingHours=" + this.getWorkingHours() + ", officeExtension=" + this.getOfficeExtension() + ", submittedDate=" + String.valueOf(this.getSubmittedDate()) + ", reviewStartedDate=" + String.valueOf(this.getReviewStartedDate()) + ", decisionDate=" + String.valueOf(this.getDecisionDate()) + ", daysPending=" + String.valueOf(this.getDaysPending()) + ", processingTime=" + this.getProcessingTime() + ", estimatedProcessingTime=" + this.getEstimatedProcessingTime() + ", deadline=" + String.valueOf(this.getDeadline()) + ", isOverdue=" + this.isOverdue() + ", daysOverdue=" + String.valueOf(this.getDaysOverdue()) + ", availableActions=" + String.valueOf(this.getAvailableActions()) + ", actionButtons=" + String.valueOf(this.getActionButtons()) + ", nextAction=" + this.getNextAction() + ", actionRequired=" + this.isActionRequired() + ", metadata=" + String.valueOf(this.getMetadata()) + ", isUrgent=" + this.isUrgent() + ", priority=" + this.getPriority() + ", tags=" + String.valueOf(this.getTags()) + ", history=" + String.valueOf(this.getHistory()) + ", canApprove=" + this.isCanApprove() + ", canReject=" + this.isCanReject() + ", canEdit=" + this.isCanEdit() + ", canComment=" + this.isCanComment() + ", canUpload=" + this.isCanUpload() + ", canDelete=" + this.isCanDelete() + ")";
    }

    @Generated
    public ApprovalDTO() {
    }

    @Generated
    public ApprovalDTO(final String id, final String clearanceRequestId, final String departmentId, final String departmentName, final String departmentCode, final String departmentIcon, final String departmentColor, final String departmentType, final int order, final boolean isMandatory, final ClearanceStatus status, final String statusMessage, final String statusColor, final String statusIcon, final String statusDescription, final boolean isCompleted, final boolean isPending, final boolean isRejected, final boolean isApproved, final String approvedBy, final String approverId, final String approverEmail, final String approverPhone, final String approverTitle, final String approverDepartment, final String approverSignature, final LocalDateTime approvalDate, final String formattedApprovalDate, final String rejectionReason, final String rejectionDetails, final String rejectionCategory, final String rejectedBy, final LocalDateTime rejectionDate, final boolean canContestRejection, final LocalDateTime contestDeadline, final String comments, final String internalNotes, final String studentNotes, final String additionalNotes, final List<RequirementDTO> requirements, final int totalRequirements, final int completedRequirements, final int requirementsProgress, final List<String> pendingRequirementNames, final List<String> missingRequirements, final List<AttachmentDTO> attachments, final List<DocumentDTO> supportingDocuments, final boolean hasAttachments, final int attachmentCount, final String contactPerson, final String contactPhone, final String contactEmail, final String officeLocation, final String officeRoom, final String workingHours, final String officeExtension, final LocalDateTime submittedDate, final LocalDateTime reviewStartedDate, final LocalDateTime decisionDate, final Long daysPending, final String processingTime, final String estimatedProcessingTime, final LocalDateTime deadline, final boolean isOverdue, final Long daysOverdue, final List<String> availableActions, final List<ActionButtonDTO> actionButtons, final String nextAction, final boolean actionRequired, final Map<String, Object> metadata, final boolean isUrgent, final String priority, final List<String> tags, final List<ApprovalHistoryDTO> history, final boolean canApprove, final boolean canReject, final boolean canEdit, final boolean canComment, final boolean canUpload, final boolean canDelete) {
        this.id = id;
        this.clearanceRequestId = clearanceRequestId;
        this.departmentId = departmentId;
        this.departmentName = departmentName;
        this.departmentCode = departmentCode;
        this.departmentIcon = departmentIcon;
        this.departmentColor = departmentColor;
        this.departmentType = departmentType;
        this.order = order;
        this.isMandatory = isMandatory;
        this.status = status;
        this.statusMessage = statusMessage;
        this.statusColor = statusColor;
        this.statusIcon = statusIcon;
        this.statusDescription = statusDescription;
        this.isCompleted = isCompleted;
        this.isPending = isPending;
        this.isRejected = isRejected;
        this.isApproved = isApproved;
        this.approvedBy = approvedBy;
        this.approverId = approverId;
        this.approverEmail = approverEmail;
        this.approverPhone = approverPhone;
        this.approverTitle = approverTitle;
        this.approverDepartment = approverDepartment;
        this.approverSignature = approverSignature;
        this.approvalDate = approvalDate;
        this.formattedApprovalDate = formattedApprovalDate;
        this.rejectionReason = rejectionReason;
        this.rejectionDetails = rejectionDetails;
        this.rejectionCategory = rejectionCategory;
        this.rejectedBy = rejectedBy;
        this.rejectionDate = rejectionDate;
        this.canContestRejection = canContestRejection;
        this.contestDeadline = contestDeadline;
        this.comments = comments;
        this.internalNotes = internalNotes;
        this.studentNotes = studentNotes;
        this.additionalNotes = additionalNotes;
        this.requirements = requirements;
        this.totalRequirements = totalRequirements;
        this.completedRequirements = completedRequirements;
        this.requirementsProgress = requirementsProgress;
        this.pendingRequirementNames = pendingRequirementNames;
        this.missingRequirements = missingRequirements;
        this.attachments = attachments;
        this.supportingDocuments = supportingDocuments;
        this.hasAttachments = hasAttachments;
        this.attachmentCount = attachmentCount;
        this.contactPerson = contactPerson;
        this.contactPhone = contactPhone;
        this.contactEmail = contactEmail;
        this.officeLocation = officeLocation;
        this.officeRoom = officeRoom;
        this.workingHours = workingHours;
        this.officeExtension = officeExtension;
        this.submittedDate = submittedDate;
        this.reviewStartedDate = reviewStartedDate;
        this.decisionDate = decisionDate;
        this.daysPending = daysPending;
        this.processingTime = processingTime;
        this.estimatedProcessingTime = estimatedProcessingTime;
        this.deadline = deadline;
        this.isOverdue = isOverdue;
        this.daysOverdue = daysOverdue;
        this.availableActions = availableActions;
        this.actionButtons = actionButtons;
        this.nextAction = nextAction;
        this.actionRequired = actionRequired;
        this.metadata = metadata;
        this.isUrgent = isUrgent;
        this.priority = priority;
        this.tags = tags;
        this.history = history;
        this.canApprove = canApprove;
        this.canReject = canReject;
        this.canEdit = canEdit;
        this.canComment = canComment;
        this.canUpload = canUpload;
        this.canDelete = canDelete;
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
        @JsonProperty("status_color")
        private String statusColor;

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
        public String getStatusColor() {
            return this.statusColor;
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
        public void setStatusColor(final String statusColor) {
            this.statusColor = statusColor;
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

                    Object this$statusColor = this.getStatusColor();
                    Object other$statusColor = other.getStatusColor();
                    if (this$statusColor == null) {
                        if (other$statusColor != null) {
                            return false;
                        }
                    } else if (!this$statusColor.equals(other$statusColor)) {
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
            Object $statusColor = this.getStatusColor();
            result = result * 59 + ($statusColor == null ? 43 : $statusColor.hashCode());
            return result;
        }

        @Generated
        public String toString() {
            String var10000 = this.getId();
            return "ApprovalDTO.RequirementDTO(id=" + var10000 + ", requirementName=" + this.getRequirementName() + ", description=" + this.getDescription() + ", isCompleted=" + this.isCompleted() + ", completedAt=" + String.valueOf(this.getCompletedAt()) + ", completedBy=" + this.getCompletedBy() + ", notes=" + this.getNotes() + ", isMandatory=" + this.isMandatory() + ", dueDate=" + String.valueOf(this.getDueDate()) + ", status=" + this.getStatus() + ", statusIcon=" + this.getStatusIcon() + ", statusColor=" + this.getStatusColor() + ")";
        }

        @Generated
        public RequirementDTO() {
        }

        @Generated
        public RequirementDTO(final String id, final String requirementName, final String description, final boolean isCompleted, final LocalDateTime completedAt, final String completedBy, final String notes, final boolean isMandatory, final LocalDateTime dueDate, final String status, final String statusIcon, final String statusColor) {
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
            this.statusColor = statusColor;
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
            private String statusColor;

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

            @JsonProperty("status_color")
            @Generated
            public RequirementDTOBuilder statusColor(final String statusColor) {
                this.statusColor = statusColor;
                return this;
            }

            @Generated
            public RequirementDTO build() {
                return new RequirementDTO(this.id, this.requirementName, this.description, this.isCompleted, this.completedAt, this.completedBy, this.notes, this.isMandatory, this.dueDate, this.status, this.statusIcon, this.statusColor);
            }

            @Generated
            public String toString() {
                String var10000 = this.id;
                return "ApprovalDTO.RequirementDTO.RequirementDTOBuilder(id=" + var10000 + ", requirementName=" + this.requirementName + ", description=" + this.description + ", isCompleted=" + this.isCompleted + ", completedAt=" + String.valueOf(this.completedAt) + ", completedBy=" + this.completedBy + ", notes=" + this.notes + ", isMandatory=" + this.isMandatory + ", dueDate=" + String.valueOf(this.dueDate) + ", status=" + this.status + ", statusIcon=" + this.statusIcon + ", statusColor=" + this.statusColor + ")";
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
            return "ApprovalDTO.DocumentDTO(id=" + var10000 + ", documentName=" + this.getDocumentName() + ", documentType=" + this.getDocumentType() + ", documentUrl=" + this.getDocumentUrl() + ", uploadedBy=" + this.getUploadedBy() + ", uploadedAt=" + String.valueOf(this.getUploadedAt()) + ", status=" + this.getStatus() + ", description=" + this.getDescription() + ", fileSize=" + this.getFileSize() + ", fileExtension=" + this.getFileExtension() + ", isVerified=" + this.isVerified() + ", verifiedBy=" + this.getVerifiedBy() + ", verifiedAt=" + String.valueOf(this.getVerifiedAt()) + ")";
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
                return "ApprovalDTO.DocumentDTO.DocumentDTOBuilder(id=" + var10000 + ", documentName=" + this.documentName + ", documentType=" + this.documentType + ", documentUrl=" + this.documentUrl + ", uploadedBy=" + this.uploadedBy + ", uploadedAt=" + String.valueOf(this.uploadedAt) + ", status=" + this.status + ", description=" + this.description + ", fileSize=" + this.fileSize + ", fileExtension=" + this.fileExtension + ", isVerified=" + this.isVerified + ", verifiedBy=" + this.verifiedBy + ", verifiedAt=" + String.valueOf(this.verifiedAt) + ")";
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
            return "ApprovalDTO.AttachmentDTO(id=" + var10000 + ", fileName=" + this.getFileName() + ", fileUrl=" + this.getFileUrl() + ", fileType=" + this.getFileType() + ", fileSize=" + this.getFileSize() + ", uploadedAt=" + String.valueOf(this.getUploadedAt()) + ", uploadedBy=" + this.getUploadedBy() + ")";
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
                return "ApprovalDTO.AttachmentDTO.AttachmentDTOBuilder(id=" + var10000 + ", fileName=" + this.fileName + ", fileUrl=" + this.fileUrl + ", fileType=" + this.fileType + ", fileSize=" + this.fileSize + ", uploadedAt=" + String.valueOf(this.uploadedAt) + ", uploadedBy=" + this.uploadedBy + ")";
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
            return "ApprovalDTO.ActionButtonDTO(label=" + var10000 + ", icon=" + this.getIcon() + ", action=" + this.getAction() + ", url=" + this.getUrl() + ", method=" + this.getMethod() + ", color=" + this.getColor() + ", isPrimary=" + this.isPrimary() + ", isDisabled=" + this.isDisabled() + ", tooltip=" + this.getTooltip() + ")";
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
                return "ApprovalDTO.ActionButtonDTO.ActionButtonDTOBuilder(label=" + this.label + ", icon=" + this.icon + ", action=" + this.action + ", url=" + this.url + ", method=" + this.method + ", color=" + this.color + ", isPrimary=" + this.isPrimary + ", isDisabled=" + this.isDisabled + ", tooltip=" + this.tooltip + ")";
            }
        }
    }

    @JsonInclude(Include.NON_NULL)
    public static class ApprovalHistoryDTO {
        @JsonProperty("timestamp")
        private LocalDateTime timestamp;
        @JsonProperty("action")
        private String action;
        @JsonProperty("user")
        private String user;
        @JsonProperty("user_id")
        private String userId;
        @JsonProperty("details")
        private String details;
        @JsonProperty("status")
        private String status;
        @JsonProperty("ip_address")
        private String ipAddress;

        @Generated
        public static ApprovalHistoryDTOBuilder builder() {
            return new ApprovalHistoryDTOBuilder();
        }

        @Generated
        public LocalDateTime getTimestamp() {
            return this.timestamp;
        }

        @Generated
        public String getAction() {
            return this.action;
        }

        @Generated
        public String getUser() {
            return this.user;
        }

        @Generated
        public String getUserId() {
            return this.userId;
        }

        @Generated
        public String getDetails() {
            return this.details;
        }

        @Generated
        public String getStatus() {
            return this.status;
        }

        @Generated
        public String getIpAddress() {
            return this.ipAddress;
        }

        @Generated
        public void setTimestamp(final LocalDateTime timestamp) {
            this.timestamp = timestamp;
        }

        @Generated
        public void setAction(final String action) {
            this.action = action;
        }

        @Generated
        public void setUser(final String user) {
            this.user = user;
        }

        @Generated
        public void setUserId(final String userId) {
            this.userId = userId;
        }

        @Generated
        public void setDetails(final String details) {
            this.details = details;
        }

        @Generated
        public void setStatus(final String status) {
            this.status = status;
        }

        @Generated
        public void setIpAddress(final String ipAddress) {
            this.ipAddress = ipAddress;
        }

        @Generated
        public boolean equals(final Object o) {
            if (o == this) {
                return true;
            } else if (!(o instanceof ApprovalHistoryDTO)) {
                return false;
            } else {
                ApprovalHistoryDTO other = (ApprovalHistoryDTO)o;
                if (!other.canEqual(this)) {
                    return false;
                } else {
                    Object this$timestamp = this.getTimestamp();
                    Object other$timestamp = other.getTimestamp();
                    if (this$timestamp == null) {
                        if (other$timestamp != null) {
                            return false;
                        }
                    } else if (!this$timestamp.equals(other$timestamp)) {
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

                    Object this$user = this.getUser();
                    Object other$user = other.getUser();
                    if (this$user == null) {
                        if (other$user != null) {
                            return false;
                        }
                    } else if (!this$user.equals(other$user)) {
                        return false;
                    }

                    Object this$userId = this.getUserId();
                    Object other$userId = other.getUserId();
                    if (this$userId == null) {
                        if (other$userId != null) {
                            return false;
                        }
                    } else if (!this$userId.equals(other$userId)) {
                        return false;
                    }

                    Object this$details = this.getDetails();
                    Object other$details = other.getDetails();
                    if (this$details == null) {
                        if (other$details != null) {
                            return false;
                        }
                    } else if (!this$details.equals(other$details)) {
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

                    Object this$ipAddress = this.getIpAddress();
                    Object other$ipAddress = other.getIpAddress();
                    if (this$ipAddress == null) {
                        if (other$ipAddress != null) {
                            return false;
                        }
                    } else if (!this$ipAddress.equals(other$ipAddress)) {
                        return false;
                    }

                    return true;
                }
            }
        }

        @Generated
        protected boolean canEqual(final Object other) {
            return other instanceof ApprovalHistoryDTO;
        }

        @Generated
        public int hashCode() {
            int PRIME = 59;
            int result = 1;
            Object $timestamp = this.getTimestamp();
            result = result * 59 + ($timestamp == null ? 43 : $timestamp.hashCode());
            Object $action = this.getAction();
            result = result * 59 + ($action == null ? 43 : $action.hashCode());
            Object $user = this.getUser();
            result = result * 59 + ($user == null ? 43 : $user.hashCode());
            Object $userId = this.getUserId();
            result = result * 59 + ($userId == null ? 43 : $userId.hashCode());
            Object $details = this.getDetails();
            result = result * 59 + ($details == null ? 43 : $details.hashCode());
            Object $status = this.getStatus();
            result = result * 59 + ($status == null ? 43 : $status.hashCode());
            Object $ipAddress = this.getIpAddress();
            result = result * 59 + ($ipAddress == null ? 43 : $ipAddress.hashCode());
            return result;
        }

        @Generated
        public String toString() {
            String var10000 = String.valueOf(this.getTimestamp());
            return "ApprovalDTO.ApprovalHistoryDTO(timestamp=" + var10000 + ", action=" + this.getAction() + ", user=" + this.getUser() + ", userId=" + this.getUserId() + ", details=" + this.getDetails() + ", status=" + this.getStatus() + ", ipAddress=" + this.getIpAddress() + ")";
        }

        @Generated
        public ApprovalHistoryDTO() {
        }

        @Generated
        public ApprovalHistoryDTO(final LocalDateTime timestamp, final String action, final String user, final String userId, final String details, final String status, final String ipAddress) {
            this.timestamp = timestamp;
            this.action = action;
            this.user = user;
            this.userId = userId;
            this.details = details;
            this.status = status;
            this.ipAddress = ipAddress;
        }

        @Generated
        public static class ApprovalHistoryDTOBuilder {
            @Generated
            private LocalDateTime timestamp;
            @Generated
            private String action;
            @Generated
            private String user;
            @Generated
            private String userId;
            @Generated
            private String details;
            @Generated
            private String status;
            @Generated
            private String ipAddress;

            @Generated
            ApprovalHistoryDTOBuilder() {
            }

            @JsonProperty("timestamp")
            @Generated
            public ApprovalHistoryDTOBuilder timestamp(final LocalDateTime timestamp) {
                this.timestamp = timestamp;
                return this;
            }

            @JsonProperty("action")
            @Generated
            public ApprovalHistoryDTOBuilder action(final String action) {
                this.action = action;
                return this;
            }

            @JsonProperty("user")
            @Generated
            public ApprovalHistoryDTOBuilder user(final String user) {
                this.user = user;
                return this;
            }

            @JsonProperty("user_id")
            @Generated
            public ApprovalHistoryDTOBuilder userId(final String userId) {
                this.userId = userId;
                return this;
            }

            @JsonProperty("details")
            @Generated
            public ApprovalHistoryDTOBuilder details(final String details) {
                this.details = details;
                return this;
            }

            @JsonProperty("status")
            @Generated
            public ApprovalHistoryDTOBuilder status(final String status) {
                this.status = status;
                return this;
            }

            @JsonProperty("ip_address")
            @Generated
            public ApprovalHistoryDTOBuilder ipAddress(final String ipAddress) {
                this.ipAddress = ipAddress;
                return this;
            }

            @Generated
            public ApprovalHistoryDTO build() {
                return new ApprovalHistoryDTO(this.timestamp, this.action, this.user, this.userId, this.details, this.status, this.ipAddress);
            }

            @Generated
            public String toString() {
                String var10000 = String.valueOf(this.timestamp);
                return "ApprovalDTO.ApprovalHistoryDTO.ApprovalHistoryDTOBuilder(timestamp=" + var10000 + ", action=" + this.action + ", user=" + this.user + ", userId=" + this.userId + ", details=" + this.details + ", status=" + this.status + ", ipAddress=" + this.ipAddress + ")";
            }
        }
    }

    public static class ApprovalDTOBuilder {
        @Generated
        private String id;
        @Generated
        private String clearanceRequestId;
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
        private String departmentType;
        @Generated
        private int order;
        @Generated
        private boolean isMandatory;
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
        private boolean isCompleted;
        @Generated
        private boolean isPending;
        @Generated
        private boolean isRejected;
        @Generated
        private boolean isApproved;
        @Generated
        private String approvedBy;
        @Generated
        private String approverId;
        @Generated
        private String approverEmail;
        @Generated
        private String approverPhone;
        @Generated
        private String approverTitle;
        @Generated
        private String approverDepartment;
        @Generated
        private String approverSignature;
        @Generated
        private LocalDateTime approvalDate;
        @Generated
        private String formattedApprovalDate;
        @Generated
        private String rejectionReason;
        @Generated
        private String rejectionDetails;
        @Generated
        private String rejectionCategory;
        @Generated
        private String rejectedBy;
        @Generated
        private LocalDateTime rejectionDate;
        @Generated
        private boolean canContestRejection;
        @Generated
        private LocalDateTime contestDeadline;
        @Generated
        private String comments;
        @Generated
        private String internalNotes;
        @Generated
        private String studentNotes;
        @Generated
        private String additionalNotes;
        @Generated
        private List<RequirementDTO> requirements;
        @Generated
        private int totalRequirements;
        @Generated
        private int completedRequirements;
        @Generated
        private int requirementsProgress;
        @Generated
        private List<String> pendingRequirementNames;
        @Generated
        private List<String> missingRequirements;
        @Generated
        private List<AttachmentDTO> attachments;
        @Generated
        private List<DocumentDTO> supportingDocuments;
        @Generated
        private boolean hasAttachments;
        @Generated
        private int attachmentCount;
        @Generated
        private String contactPerson;
        @Generated
        private String contactPhone;
        @Generated
        private String contactEmail;
        @Generated
        private String officeLocation;
        @Generated
        private String officeRoom;
        @Generated
        private String workingHours;
        @Generated
        private String officeExtension;
        @Generated
        private LocalDateTime submittedDate;
        @Generated
        private LocalDateTime reviewStartedDate;
        @Generated
        private LocalDateTime decisionDate;
        @Generated
        private Long daysPending;
        @Generated
        private String processingTime;
        @Generated
        private String estimatedProcessingTime;
        @Generated
        private LocalDateTime deadline;
        @Generated
        private boolean isOverdue;
        @Generated
        private Long daysOverdue;
        @Generated
        private List<String> availableActions;
        @Generated
        private List<ActionButtonDTO> actionButtons;
        @Generated
        private String nextAction;
        @Generated
        private boolean actionRequired;
        @Generated
        private Map<String, Object> metadata;
        @Generated
        private boolean isUrgent;
        @Generated
        private String priority;
        @Generated
        private List<String> tags;
        @Generated
        private List<ApprovalHistoryDTO> history;
        @Generated
        private boolean canApprove;
        @Generated
        private boolean canReject;
        @Generated
        private boolean canEdit;
        @Generated
        private boolean canComment;
        @Generated
        private boolean canUpload;
        @Generated
        private boolean canDelete;

        public ApprovalDTOBuilder withStatus(ClearanceStatus status) {
            this.status = status;
            this.statusMessage = this.getStatusMessage(status);
            this.statusColor = this.getStatusColor(status);
            this.statusIcon = this.getStatusIcon(status);
            this.isCompleted = status == ClearanceStatus.APPROVED || status == ClearanceStatus.REJECTED;
            this.isPending = status == ClearanceStatus.PENDING;
            this.isRejected = status == ClearanceStatus.REJECTED;
            this.isApproved = status == ClearanceStatus.APPROVED;
            return this;
        }

        private String getStatusMessage(ClearanceStatus status) {
            String var10000;
            switch (status) {
                case PENDING:
                    var10000 = "Waiting for review";
                    break;
                case APPROVED:
                    var10000 = "Approved";
                    break;
                case REJECTED:
                    var10000 = "Rejected";
                    break;
                case CLEARED:
                default:
                    var10000 = "Unknown";
                    break;
                case IN_PROGRESS:
                    var10000 = "Under review";
            }

            return var10000;
        }

        private String getStatusColor(ClearanceStatus status) {
            String var10000;
            switch (status) {
                case PENDING:
                    var10000 = "#ffc107";
                    break;
                case APPROVED:
                    var10000 = "#28a745";
                    break;
                case REJECTED:
                    var10000 = "#dc3545";
                    break;
                case CLEARED:
                default:
                    var10000 = "#6c757d";
                    break;
                case IN_PROGRESS:
                    var10000 = "#17a2b8";
            }

            return var10000;
        }

        private String getStatusIcon(ClearanceStatus status) {
            String var10000;
            switch (status) {
                case PENDING:
                    var10000 = "⏳";
                    break;
                case APPROVED:
                    var10000 = "✅";
                    break;
                case REJECTED:
                    var10000 = "❌";
                    break;
                case CLEARED:
                default:
                    var10000 = "\ud83d\udccb";
                    break;
                case IN_PROGRESS:
                    var10000 = "\ud83d\udd04";
            }

            return var10000;
        }

        @Generated
        ApprovalDTOBuilder() {
        }

        @JsonProperty("id")
        @Generated
        public ApprovalDTOBuilder id(final String id) {
            this.id = id;
            return this;
        }

        @JsonProperty("clearance_request_id")
        @Generated
        public ApprovalDTOBuilder clearanceRequestId(final String clearanceRequestId) {
            this.clearanceRequestId = clearanceRequestId;
            return this;
        }

        @JsonProperty("department_id")
        @Generated
        public ApprovalDTOBuilder departmentId(final String departmentId) {
            this.departmentId = departmentId;
            return this;
        }

        @JsonProperty("department_name")
        @Generated
        public ApprovalDTOBuilder departmentName(final String departmentName) {
            this.departmentName = departmentName;
            return this;
        }

        @JsonProperty("department_code")
        @Generated
        public ApprovalDTOBuilder departmentCode(final String departmentCode) {
            this.departmentCode = departmentCode;
            return this;
        }

        @JsonProperty("department_icon")
        @Generated
        public ApprovalDTOBuilder departmentIcon(final String departmentIcon) {
            this.departmentIcon = departmentIcon;
            return this;
        }

        @JsonProperty("department_color")
        @Generated
        public ApprovalDTOBuilder departmentColor(final String departmentColor) {
            this.departmentColor = departmentColor;
            return this;
        }

        @JsonProperty("department_type")
        @Generated
        public ApprovalDTOBuilder departmentType(final String departmentType) {
            this.departmentType = departmentType;
            return this;
        }

        @JsonProperty("order")
        @Generated
        public ApprovalDTOBuilder order(final int order) {
            this.order = order;
            return this;
        }

        @JsonProperty("is_mandatory")
        @Generated
        public ApprovalDTOBuilder isMandatory(final boolean isMandatory) {
            this.isMandatory = isMandatory;
            return this;
        }

        @JsonProperty("status")
        @Generated
        public ApprovalDTOBuilder status(final ClearanceStatus status) {
            this.status = status;
            return this;
        }

        @JsonProperty("status_message")
        @Generated
        public ApprovalDTOBuilder statusMessage(final String statusMessage) {
            this.statusMessage = statusMessage;
            return this;
        }

        @JsonProperty("status_color")
        @Generated
        public ApprovalDTOBuilder statusColor(final String statusColor) {
            this.statusColor = statusColor;
            return this;
        }

        @JsonProperty("status_icon")
        @Generated
        public ApprovalDTOBuilder statusIcon(final String statusIcon) {
            this.statusIcon = statusIcon;
            return this;
        }

        @JsonProperty("status_description")
        @Generated
        public ApprovalDTOBuilder statusDescription(final String statusDescription) {
            this.statusDescription = statusDescription;
            return this;
        }

        @JsonProperty("is_completed")
        @Generated
        public ApprovalDTOBuilder isCompleted(final boolean isCompleted) {
            this.isCompleted = isCompleted;
            return this;
        }

        @JsonProperty("is_pending")
        @Generated
        public ApprovalDTOBuilder isPending(final boolean isPending) {
            this.isPending = isPending;
            return this;
        }

        @JsonProperty("is_rejected")
        @Generated
        public ApprovalDTOBuilder isRejected(final boolean isRejected) {
            this.isRejected = isRejected;
            return this;
        }

        @JsonProperty("is_approved")
        @Generated
        public ApprovalDTOBuilder isApproved(final boolean isApproved) {
            this.isApproved = isApproved;
            return this;
        }

        @JsonProperty("approved_by")
        @Generated
        public ApprovalDTOBuilder approvedBy(final String approvedBy) {
            this.approvedBy = approvedBy;
            return this;
        }

        @JsonProperty("approver_id")
        @Generated
        public ApprovalDTOBuilder approverId(final String approverId) {
            this.approverId = approverId;
            return this;
        }

        @JsonProperty("approver_email")
        @Generated
        public ApprovalDTOBuilder approverEmail(final String approverEmail) {
            this.approverEmail = approverEmail;
            return this;
        }

        @JsonProperty("approver_phone")
        @Generated
        public ApprovalDTOBuilder approverPhone(final String approverPhone) {
            this.approverPhone = approverPhone;
            return this;
        }

        @JsonProperty("approver_title")
        @Generated
        public ApprovalDTOBuilder approverTitle(final String approverTitle) {
            this.approverTitle = approverTitle;
            return this;
        }

        @JsonProperty("approver_department")
        @Generated
        public ApprovalDTOBuilder approverDepartment(final String approverDepartment) {
            this.approverDepartment = approverDepartment;
            return this;
        }

        @JsonProperty("approver_signature")
        @Generated
        public ApprovalDTOBuilder approverSignature(final String approverSignature) {
            this.approverSignature = approverSignature;
            return this;
        }

        @JsonProperty("approval_date")
        @Generated
        public ApprovalDTOBuilder approvalDate(final LocalDateTime approvalDate) {
            this.approvalDate = approvalDate;
            return this;
        }

        @JsonProperty("formatted_approval_date")
        @Generated
        public ApprovalDTOBuilder formattedApprovalDate(final String formattedApprovalDate) {
            this.formattedApprovalDate = formattedApprovalDate;
            return this;
        }

        @JsonProperty("rejection_reason")
        @Generated
        public ApprovalDTOBuilder rejectionReason(final String rejectionReason) {
            this.rejectionReason = rejectionReason;
            return this;
        }

        @JsonProperty("rejection_details")
        @Generated
        public ApprovalDTOBuilder rejectionDetails(final String rejectionDetails) {
            this.rejectionDetails = rejectionDetails;
            return this;
        }

        @JsonProperty("rejection_category")
        @Generated
        public ApprovalDTOBuilder rejectionCategory(final String rejectionCategory) {
            this.rejectionCategory = rejectionCategory;
            return this;
        }

        @JsonProperty("rejected_by")
        @Generated
        public ApprovalDTOBuilder rejectedBy(final String rejectedBy) {
            this.rejectedBy = rejectedBy;
            return this;
        }

        @JsonProperty("rejection_date")
        @Generated
        public ApprovalDTOBuilder rejectionDate(final LocalDateTime rejectionDate) {
            this.rejectionDate = rejectionDate;
            return this;
        }

        @JsonProperty("can_contest_rejection")
        @Generated
        public ApprovalDTOBuilder canContestRejection(final boolean canContestRejection) {
            this.canContestRejection = canContestRejection;
            return this;
        }

        @JsonProperty("contest_deadline")
        @Generated
        public ApprovalDTOBuilder contestDeadline(final LocalDateTime contestDeadline) {
            this.contestDeadline = contestDeadline;
            return this;
        }

        @JsonProperty("comments")
        @Generated
        public ApprovalDTOBuilder comments(final String comments) {
            this.comments = comments;
            return this;
        }

        @JsonProperty("internal_notes")
        @Generated
        public ApprovalDTOBuilder internalNotes(final String internalNotes) {
            this.internalNotes = internalNotes;
            return this;
        }

        @JsonProperty("student_notes")
        @Generated
        public ApprovalDTOBuilder studentNotes(final String studentNotes) {
            this.studentNotes = studentNotes;
            return this;
        }

        @JsonProperty("additional_notes")
        @Generated
        public ApprovalDTOBuilder additionalNotes(final String additionalNotes) {
            this.additionalNotes = additionalNotes;
            return this;
        }

        @JsonProperty("requirements")
        @Generated
        public ApprovalDTOBuilder requirements(final List<RequirementDTO> requirements) {
            this.requirements = requirements;
            return this;
        }

        @JsonProperty("total_requirements")
        @Generated
        public ApprovalDTOBuilder totalRequirements(final int totalRequirements) {
            this.totalRequirements = totalRequirements;
            return this;
        }

        @JsonProperty("completed_requirements")
        @Generated
        public ApprovalDTOBuilder completedRequirements(final int completedRequirements) {
            this.completedRequirements = completedRequirements;
            return this;
        }

        @JsonProperty("requirements_progress")
        @Generated
        public ApprovalDTOBuilder requirementsProgress(final int requirementsProgress) {
            this.requirementsProgress = requirementsProgress;
            return this;
        }

        @JsonProperty("pending_requirements")
        @Generated
        public ApprovalDTOBuilder pendingRequirementNames(final List<String> pendingRequirementNames) {
            this.pendingRequirementNames = pendingRequirementNames;
            return this;
        }

        @JsonProperty("missing_requirements")
        @Generated
        public ApprovalDTOBuilder missingRequirements(final List<String> missingRequirements) {
            this.missingRequirements = missingRequirements;
            return this;
        }

        @JsonProperty("attachments")
        @Generated
        public ApprovalDTOBuilder attachments(final List<AttachmentDTO> attachments) {
            this.attachments = attachments;
            return this;
        }

        @JsonProperty("supporting_documents")
        @Generated
        public ApprovalDTOBuilder supportingDocuments(final List<DocumentDTO> supportingDocuments) {
            this.supportingDocuments = supportingDocuments;
            return this;
        }

        @JsonProperty("has_attachments")
        @Generated
        public ApprovalDTOBuilder hasAttachments(final boolean hasAttachments) {
            this.hasAttachments = hasAttachments;
            return this;
        }

        @JsonProperty("attachment_count")
        @Generated
        public ApprovalDTOBuilder attachmentCount(final int attachmentCount) {
            this.attachmentCount = attachmentCount;
            return this;
        }

        @JsonProperty("contact_person")
        @Generated
        public ApprovalDTOBuilder contactPerson(final String contactPerson) {
            this.contactPerson = contactPerson;
            return this;
        }

        @JsonProperty("contact_phone")
        @Generated
        public ApprovalDTOBuilder contactPhone(final String contactPhone) {
            this.contactPhone = contactPhone;
            return this;
        }

        @JsonProperty("contact_email")
        @Generated
        public ApprovalDTOBuilder contactEmail(final String contactEmail) {
            this.contactEmail = contactEmail;
            return this;
        }

        @JsonProperty("office_location")
        @Generated
        public ApprovalDTOBuilder officeLocation(final String officeLocation) {
            this.officeLocation = officeLocation;
            return this;
        }

        @JsonProperty("office_room")
        @Generated
        public ApprovalDTOBuilder officeRoom(final String officeRoom) {
            this.officeRoom = officeRoom;
            return this;
        }

        @JsonProperty("working_hours")
        @Generated
        public ApprovalDTOBuilder workingHours(final String workingHours) {
            this.workingHours = workingHours;
            return this;
        }

        @JsonProperty("office_extension")
        @Generated
        public ApprovalDTOBuilder officeExtension(final String officeExtension) {
            this.officeExtension = officeExtension;
            return this;
        }

        @JsonProperty("submitted_date")
        @Generated
        public ApprovalDTOBuilder submittedDate(final LocalDateTime submittedDate) {
            this.submittedDate = submittedDate;
            return this;
        }

        @JsonProperty("review_started_date")
        @Generated
        public ApprovalDTOBuilder reviewStartedDate(final LocalDateTime reviewStartedDate) {
            this.reviewStartedDate = reviewStartedDate;
            return this;
        }

        @JsonProperty("decision_date")
        @Generated
        public ApprovalDTOBuilder decisionDate(final LocalDateTime decisionDate) {
            this.decisionDate = decisionDate;
            return this;
        }

        @JsonProperty("days_pending")
        @Generated
        public ApprovalDTOBuilder daysPending(final Long daysPending) {
            this.daysPending = daysPending;
            return this;
        }

        @JsonProperty("processing_time")
        @Generated
        public ApprovalDTOBuilder processingTime(final String processingTime) {
            this.processingTime = processingTime;
            return this;
        }

        @JsonProperty("estimated_processing_time")
        @Generated
        public ApprovalDTOBuilder estimatedProcessingTime(final String estimatedProcessingTime) {
            this.estimatedProcessingTime = estimatedProcessingTime;
            return this;
        }

        @JsonProperty("deadline")
        @Generated
        public ApprovalDTOBuilder deadline(final LocalDateTime deadline) {
            this.deadline = deadline;
            return this;
        }

        @JsonProperty("is_overdue")
        @Generated
        public ApprovalDTOBuilder isOverdue(final boolean isOverdue) {
            this.isOverdue = isOverdue;
            return this;
        }

        @JsonProperty("days_overdue")
        @Generated
        public ApprovalDTOBuilder daysOverdue(final Long daysOverdue) {
            this.daysOverdue = daysOverdue;
            return this;
        }

        @JsonProperty("available_actions")
        @Generated
        public ApprovalDTOBuilder availableActions(final List<String> availableActions) {
            this.availableActions = availableActions;
            return this;
        }

        @JsonProperty("action_buttons")
        @Generated
        public ApprovalDTOBuilder actionButtons(final List<ActionButtonDTO> actionButtons) {
            this.actionButtons = actionButtons;
            return this;
        }

        @JsonProperty("next_action")
        @Generated
        public ApprovalDTOBuilder nextAction(final String nextAction) {
            this.nextAction = nextAction;
            return this;
        }

        @JsonProperty("action_required")
        @Generated
        public ApprovalDTOBuilder actionRequired(final boolean actionRequired) {
            this.actionRequired = actionRequired;
            return this;
        }

        @JsonProperty("metadata")
        @Generated
        public ApprovalDTOBuilder metadata(final Map<String, Object> metadata) {
            this.metadata = metadata;
            return this;
        }

        @JsonProperty("is_urgent")
        @Generated
        public ApprovalDTOBuilder isUrgent(final boolean isUrgent) {
            this.isUrgent = isUrgent;
            return this;
        }

        @JsonProperty("priority")
        @Generated
        public ApprovalDTOBuilder priority(final String priority) {
            this.priority = priority;
            return this;
        }

        @JsonProperty("tags")
        @Generated
        public ApprovalDTOBuilder tags(final List<String> tags) {
            this.tags = tags;
            return this;
        }

        @JsonProperty("history")
        @Generated
        public ApprovalDTOBuilder history(final List<ApprovalHistoryDTO> history) {
            this.history = history;
            return this;
        }

        @JsonProperty("can_approve")
        @Generated
        public ApprovalDTOBuilder canApprove(final boolean canApprove) {
            this.canApprove = canApprove;
            return this;
        }

        @JsonProperty("can_reject")
        @Generated
        public ApprovalDTOBuilder canReject(final boolean canReject) {
            this.canReject = canReject;
            return this;
        }

        @JsonProperty("can_edit")
        @Generated
        public ApprovalDTOBuilder canEdit(final boolean canEdit) {
            this.canEdit = canEdit;
            return this;
        }

        @JsonProperty("can_comment")
        @Generated
        public ApprovalDTOBuilder canComment(final boolean canComment) {
            this.canComment = canComment;
            return this;
        }

        @JsonProperty("can_upload")
        @Generated
        public ApprovalDTOBuilder canUpload(final boolean canUpload) {
            this.canUpload = canUpload;
            return this;
        }

        @JsonProperty("can_delete")
        @Generated
        public ApprovalDTOBuilder canDelete(final boolean canDelete) {
            this.canDelete = canDelete;
            return this;
        }

        @Generated
        public ApprovalDTO build() {
            return new ApprovalDTO(this.id, this.clearanceRequestId, this.departmentId, this.departmentName, this.departmentCode, this.departmentIcon, this.departmentColor, this.departmentType, this.order, this.isMandatory, this.status, this.statusMessage, this.statusColor, this.statusIcon, this.statusDescription, this.isCompleted, this.isPending, this.isRejected, this.isApproved, this.approvedBy, this.approverId, this.approverEmail, this.approverPhone, this.approverTitle, this.approverDepartment, this.approverSignature, this.approvalDate, this.formattedApprovalDate, this.rejectionReason, this.rejectionDetails, this.rejectionCategory, this.rejectedBy, this.rejectionDate, this.canContestRejection, this.contestDeadline, this.comments, this.internalNotes, this.studentNotes, this.additionalNotes, this.requirements, this.totalRequirements, this.completedRequirements, this.requirementsProgress, this.pendingRequirementNames, this.missingRequirements, this.attachments, this.supportingDocuments, this.hasAttachments, this.attachmentCount, this.contactPerson, this.contactPhone, this.contactEmail, this.officeLocation, this.officeRoom, this.workingHours, this.officeExtension, this.submittedDate, this.reviewStartedDate, this.decisionDate, this.daysPending, this.processingTime, this.estimatedProcessingTime, this.deadline, this.isOverdue, this.daysOverdue, this.availableActions, this.actionButtons, this.nextAction, this.actionRequired, this.metadata, this.isUrgent, this.priority, this.tags, this.history, this.canApprove, this.canReject, this.canEdit, this.canComment, this.canUpload, this.canDelete);
        }

        @Generated
        public String toString() {
            String var10000 = this.id;
            return "ApprovalDTO.ApprovalDTOBuilder(id=" + var10000 + ", clearanceRequestId=" + this.clearanceRequestId + ", departmentId=" + this.departmentId + ", departmentName=" + this.departmentName + ", departmentCode=" + this.departmentCode + ", departmentIcon=" + this.departmentIcon + ", departmentColor=" + this.departmentColor + ", departmentType=" + this.departmentType + ", order=" + this.order + ", isMandatory=" + this.isMandatory + ", status=" + String.valueOf(this.status) + ", statusMessage=" + this.statusMessage + ", statusColor=" + this.statusColor + ", statusIcon=" + this.statusIcon + ", statusDescription=" + this.statusDescription + ", isCompleted=" + this.isCompleted + ", isPending=" + this.isPending + ", isRejected=" + this.isRejected + ", isApproved=" + this.isApproved + ", approvedBy=" + this.approvedBy + ", approverId=" + this.approverId + ", approverEmail=" + this.approverEmail + ", approverPhone=" + this.approverPhone + ", approverTitle=" + this.approverTitle + ", approverDepartment=" + this.approverDepartment + ", approverSignature=" + this.approverSignature + ", approvalDate=" + String.valueOf(this.approvalDate) + ", formattedApprovalDate=" + this.formattedApprovalDate + ", rejectionReason=" + this.rejectionReason + ", rejectionDetails=" + this.rejectionDetails + ", rejectionCategory=" + this.rejectionCategory + ", rejectedBy=" + this.rejectedBy + ", rejectionDate=" + String.valueOf(this.rejectionDate) + ", canContestRejection=" + this.canContestRejection + ", contestDeadline=" + String.valueOf(this.contestDeadline) + ", comments=" + this.comments + ", internalNotes=" + this.internalNotes + ", studentNotes=" + this.studentNotes + ", additionalNotes=" + this.additionalNotes + ", requirements=" + String.valueOf(this.requirements) + ", totalRequirements=" + this.totalRequirements + ", completedRequirements=" + this.completedRequirements + ", requirementsProgress=" + this.requirementsProgress + ", pendingRequirementNames=" + String.valueOf(this.pendingRequirementNames) + ", missingRequirements=" + String.valueOf(this.missingRequirements) + ", attachments=" + String.valueOf(this.attachments) + ", supportingDocuments=" + String.valueOf(this.supportingDocuments) + ", hasAttachments=" + this.hasAttachments + ", attachmentCount=" + this.attachmentCount + ", contactPerson=" + this.contactPerson + ", contactPhone=" + this.contactPhone + ", contactEmail=" + this.contactEmail + ", officeLocation=" + this.officeLocation + ", officeRoom=" + this.officeRoom + ", workingHours=" + this.workingHours + ", officeExtension=" + this.officeExtension + ", submittedDate=" + String.valueOf(this.submittedDate) + ", reviewStartedDate=" + String.valueOf(this.reviewStartedDate) + ", decisionDate=" + String.valueOf(this.decisionDate) + ", daysPending=" + String.valueOf(this.daysPending) + ", processingTime=" + this.processingTime + ", estimatedProcessingTime=" + this.estimatedProcessingTime + ", deadline=" + String.valueOf(this.deadline) + ", isOverdue=" + this.isOverdue + ", daysOverdue=" + String.valueOf(this.daysOverdue) + ", availableActions=" + String.valueOf(this.availableActions) + ", actionButtons=" + String.valueOf(this.actionButtons) + ", nextAction=" + this.nextAction + ", actionRequired=" + this.actionRequired + ", metadata=" + String.valueOf(this.metadata) + ", isUrgent=" + this.isUrgent + ", priority=" + this.priority + ", tags=" + String.valueOf(this.tags) + ", history=" + String.valueOf(this.history) + ", canApprove=" + this.canApprove + ", canReject=" + this.canReject + ", canEdit=" + this.canEdit + ", canComment=" + this.canComment + ", canUpload=" + this.canUpload + ", canDelete=" + this.canDelete + ")";
        }
    }
}
