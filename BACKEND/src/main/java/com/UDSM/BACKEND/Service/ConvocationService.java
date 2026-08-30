package com.UDSM.BACKEND.Service;

import com.UDSM.BACKEND.Model.*;
import com.UDSM.BACKEND.Repository.*;
import com.UDSM.BACKEND.dto.ApiResponse;
import com.UDSM.BACKEND.dto.ConvocationReceiptRequest;
import com.UDSM.BACKEND.dto.ConvocationReceiptResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConvocationService {

    private final ConvocationReceiptRepository receiptRepository;
    private final ClearanceRequestRepository clearanceRequestRepository;
    private final DepartmentApprovalRepository departmentApprovalRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    private final StudentRepository studentRepository;

    private static final String UPLOAD_DIR = "uploads/convocation/";

    @Transactional
    public ApiResponse submitReceipt(ConvocationReceiptRequest request, MultipartFile file, String officerUsername) {
        log.info("📝 Submitting receipt for student: {}", request.getStudentId());

        // Check if student exists
        User student = userRepository.findById(request.getStudentId())
                .orElseThrow(() -> new RuntimeException("Student not found"));

        // Check if receipt already exists
        if (receiptRepository.findByStudentIdAndStatus(request.getStudentId(), ClearanceStatus.PENDING).isPresent()) {
            return ApiResponse.error("You already have a pending receipt submission");
        }

        // Save file
        String fileUrl = saveFile(file, request.getStudentId());

        // Create receipt record
        ConvocationReceipt receipt = ConvocationReceipt.builder()
                .studentId(request.getStudentId())
                .controlNumber(request.getControlNumber())
                .receiptNumber(request.getReceiptNumber())
                .paymentDate(request.getPaymentDate())
                .fileName(file.getOriginalFilename())
                .fileUrl(fileUrl)
                .fileType(file.getContentType())
                .fileSize(file.getSize())
                .status(ClearanceStatus.PENDING)
                .submittedAt(LocalDateTime.now())
                .build();

        receiptRepository.save(receipt);

        // Send notification to student
        notificationService.sendNotification(
                student,
                "Receipt Submitted",
                "Your Convocation payment receipt has been submitted and is pending verification.",
                NotificationType.CLEARANCE_UPDATE
        );

        // Audit log
        auditLogService.logAction(
                request.getStudentId(),
                "SUBMIT_CONVOCATION_RECEIPT",
                "Student submitted convocation receipt",
                "SUCCESS"
        );

        return ApiResponse.success("Receipt submitted successfully. Waiting for verification.");
    }

    public ConvocationReceiptResponse getPendingReceipts() {
        log.info("📋 Getting all pending convocation receipts");

        List<ConvocationReceipt> receipts = receiptRepository.findByStatus(ClearanceStatus.PENDING);

        List<ConvocationReceiptResponse.ReceiptDTO> receiptDTOs = receipts.stream()
                .map(this::mapToReceiptDTO)
                .collect(Collectors.toList());

        long pendingCount = receipts.stream().filter(r -> r.getStatus() == ClearanceStatus.PENDING).count();
        long approvedCount = receipts.stream().filter(r -> r.getStatus() == ClearanceStatus.APPROVED).count();
        long rejectedCount = receipts.stream().filter(r -> r.getStatus() == ClearanceStatus.REJECTED).count();

        return ConvocationReceiptResponse.builder()
                .receipts(receiptDTOs)
                .pendingCount((int) pendingCount)
                .approvedCount((int) approvedCount)
                .rejectedCount((int) rejectedCount)
                .build();
    }

    @Transactional
    public ApiResponse approveReceipt(String receiptId, String officerUsername) {
        log.info("✅ Approving receipt: {}", receiptId);

        ConvocationReceipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new RuntimeException("Receipt not found"));

        if (receipt.getStatus() != ClearanceStatus.PENDING) {
            return ApiResponse.error("Receipt is already processed");
        }

        // Update receipt status
        receipt.setStatus(ClearanceStatus.APPROVED);
        receipt.setApprovedBy(officerUsername);
        receipt.setApprovedAt(LocalDateTime.now());
        receiptRepository.save(receipt);

        // Map User ID to Student ID for Clearance Request lookup
        String studentEntityId = receipt.getStudentId(); // Default if already student id
        Student studentEntity = studentRepository.findByUserId(receipt.getStudentId()).orElse(null);
        if (studentEntity != null) {
            studentEntityId = studentEntity.getId();
        }

        // Update clearance request using real Student ID
        List<ClearanceRequest> requests = clearanceRequestRepository.findByStudentId(studentEntityId);
        if (!requests.isEmpty()) {
            ClearanceRequest clearanceRequest = requests.get(requests.size() - 1);

            // Update Convocation approval
            DepartmentApproval convocationApproval = departmentApprovalRepository
                    .findByClearanceRequestIdAndDepartment(clearanceRequest.getId(), "Convocation")
                    .orElse(null);

            if (convocationApproval != null) {
                convocationApproval.setStatus(ClearanceStatus.APPROVED);
                convocationApproval.setApprovedBy(officerUsername);
                convocationApproval.setApprovalDate(LocalDateTime.now());
                convocationApproval.setComments("Receipt verified successfully");
                departmentApprovalRepository.save(convocationApproval);
            }

            // Move to next stage (Parallel offices)
            clearanceRequest.setCurrentStage("Parallel");
            clearanceRequest.setStatus(ClearanceStatus.PENDING.name()); // Ensure status is not REJECTED
            clearanceRequestRepository.save(clearanceRequest);
        }

        // Send notification to student
        notificationService.sendApprovalNotification(
                studentEntityId,
                "Convocation",
                officerUsername
        );

        // Audit log
        auditLogService.logAction(
                receipt.getStudentId(),
                "APPROVE_CONVOCATION_RECEIPT",
                "Convocation receipt approved by: " + officerUsername,
                "SUCCESS"
        );

        return ApiResponse.success("Receipt approved successfully");
    }

    @Transactional
    public ApiResponse rejectReceipt(String receiptId, String reason, String officerUsername) {
        log.info(" Rejecting receipt: {} with reason: {}", receiptId, reason);

        ConvocationReceipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new RuntimeException("Receipt not found"));

        if (receipt.getStatus() != ClearanceStatus.PENDING) {
            return ApiResponse.error("Receipt is already processed");
        }

        // Update receipt status
        receipt.setStatus(ClearanceStatus.REJECTED);
        receipt.setApprovedBy(officerUsername);
        receipt.setApprovedAt(LocalDateTime.now());
        receipt.setComments(reason);
        receiptRepository.save(receipt);

        // Map User ID to Student ID
        String studentEntityId = receipt.getStudentId();
        Student studentEntity = studentRepository.findByUserId(receipt.getStudentId()).orElse(null);
        if (studentEntity != null) {
            studentEntityId = studentEntity.getId();
        }

        // Update clearance request
        List<ClearanceRequest> requests = clearanceRequestRepository.findByStudentId(studentEntityId);
        if (!requests.isEmpty()) {
            ClearanceRequest clearanceRequest = requests.get(requests.size() - 1);

            // Update Convocation approval
            DepartmentApproval convocationApproval = departmentApprovalRepository
                    .findByClearanceRequestIdAndDepartment(clearanceRequest.getId(), "Convocation")
                    .orElse(null);

            if (convocationApproval != null) {
                convocationApproval.setStatus(ClearanceStatus.REJECTED);
                convocationApproval.setApprovedBy(officerUsername);
                convocationApproval.setApprovalDate(LocalDateTime.now());
                convocationApproval.setComments(reason);
                departmentApprovalRepository.save(convocationApproval);
            }

            // Update request status to rejected
            clearanceRequest.setStatus(ClearanceStatus.REJECTED.name());
            clearanceRequestRepository.save(clearanceRequest);
        }

        // Send notification to student
        notificationService.sendRejectionNotification(
                studentEntityId,
                "Convocation",
                reason
        );

        // Audit log
        auditLogService.logAction(
                receipt.getStudentId(),
                "REJECT_CONVOCATION_RECEIPT",
                "Convocation receipt rejected by: " + officerUsername + ". Reason: " + reason,
                "FAILED"
        );

        return ApiResponse.success("Receipt rejected successfully. Student notified.");
    }

    public ApiResponse getReceiptStatus(String studentId) {
        log.info(" Getting receipt status for student: {}", studentId);

        ConvocationReceipt receipt = receiptRepository.findByStudentIdOrderBySubmittedAtDesc(studentId)
                .stream()
                .findFirst()
                .orElse(null);

        if (receipt == null) {
            return ApiResponse.success("No receipt found");
        }

        return ApiResponse.success("Receipt status: " + receipt.getStatus());
    }

    private String saveFile(MultipartFile file, String studentId) {
        try {
            // Create upload directory if it doesn't exist
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate unique filename
            String fileName = studentId + "_" + UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Path filePath = uploadPath.resolve(fileName);

            // Save file
            Files.copy(file.getInputStream(), filePath);

            return filePath.toString();

        } catch (IOException e) {
            log.error("Failed to save file: {}", e.getMessage());
            throw new RuntimeException("Failed to save file");
        }
    }

    private ConvocationReceiptResponse.ReceiptDTO mapToReceiptDTO(ConvocationReceipt receipt) {
        // Get student info
        User student = userRepository.findById(receipt.getStudentId()).orElse(null);

        // Get student details from student repository
        // This would need a StudentRepository to get full student details

        return ConvocationReceiptResponse.ReceiptDTO.builder()
                .id(receipt.getId())
                .studentId(receipt.getStudentId())
                .studentName(student != null ? student.getFullName() : "Unknown")
                .registrationNumber(student != null ? student.getRegistrationNumber() : "N/A")
                .programme(student != null ? student.getProgramme() : "N/A")
                .department(student != null ? student.getDepartment() : "N/A")
                .college(student != null ? student.getCollege() : "N/A")
                .controlNumber(receipt.getControlNumber())
                .receiptNumber(receipt.getReceiptNumber())
                .paymentDate(receipt.getPaymentDate())
                .fileUrl(receipt.getFileUrl())
                .status(receipt.getStatus())
                .approvedBy(receipt.getApprovedBy())
                .approvedAt(receipt.getApprovedAt())
                .comments(receipt.getComments())
                .submittedAt(receipt.getSubmittedAt())
                .build();
    }
}