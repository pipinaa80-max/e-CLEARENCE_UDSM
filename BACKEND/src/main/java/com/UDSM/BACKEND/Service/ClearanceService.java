package com.UDSM.BACKEND.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import com.UDSM.BACKEND.Model.*;
import com.UDSM.BACKEND.Repository.ClearanceRequestRepository;
import com.UDSM.BACKEND.Repository.DepartmentApprovalRepository;
import com.UDSM.BACKEND.Repository.StudentRepository;
import com.UDSM.BACKEND.Repository.UserRepository;
import com.UDSM.BACKEND.dto.ApiResponse;
import com.UDSM.BACKEND.dto.ClearanceRequestDTO;
import com.UDSM.BACKEND.dto.ClearanceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class ClearanceService {
    private final ClearanceRequestRepository clearanceRequestRepository;
    private final DepartmentApprovalRepository departmentApprovalRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final PdfGenerator pdfGenerator;
    private final AuditLogService auditLogService;

    public ApiResponse submitClearanceRequest(ClearanceRequestDTO requestDTO) {
        // Find student by registration number
        Student student = studentRepository.findByRegistrationNumber(requestDTO.getRegistrationNumber())
                .orElseThrow(() -> new RuntimeException("Student not found with registration number: " + requestDTO.getRegistrationNumber()));

        // Check if student already has a pending request
        Optional<ClearanceRequest> existingRequest = clearanceRequestRepository.findByStudentAndStatus(student, ClearanceStatus.PENDING);
        if (existingRequest.isPresent()) {
            return ApiResponse.error("You already have a pending clearance request");
        }

        // Create new clearance request
        ClearanceRequest clearanceRequest = ClearanceRequest.builder()
                .student(student)
                .status(ClearanceStatus.PENDING.name())
                .submittedAt(LocalDateTime.now())
                .build();

        // Save the request
        ClearanceRequest savedRequest = clearanceRequestRepository.save(clearanceRequest);

        // Create department approvals
        List<String> departments = getDepartmentsForClearance(requestDTO.getProgramme());

        // Add departments from DTO
        departments.add(requestDTO.getDepartment());

        // Create sequential approvals (Convocation -> Parallel Offices -> Department -> Principal -> Finance)
        List<DepartmentApproval> approvals = new ArrayList<>();

        // 1. Convocation (first)
        approvals.add(DepartmentApproval.builder()
                .clearanceRequest(savedRequest)
                .department("Convocation")
                .status(ClearanceStatus.PENDING)
                .orderNumber(1)
                .build());

        // 2. Parallel offices (Games Coach, Hall Warden, USAB, DARUSO, Library, Dean of Students, Smart Card)
        String[] parallelOffices = {"Games Coach", "Hall Warden", "USAB", "DARUSO", "Library", "Dean of Students", "Smart Card"};
        int order = 2;
        for (String office : parallelOffices) {
            approvals.add(DepartmentApproval.builder()
                    .clearanceRequest(savedRequest)
                    .department(office)
                    .status(ClearanceStatus.PENDING)
                    .orderNumber(order++)
                    .build());
        }

        // 3. Department
        approvals.add(DepartmentApproval.builder()
                .clearanceRequest(savedRequest)
                .department(requestDTO.getDepartment())
                .status(ClearanceStatus.PENDING)
                .orderNumber(order++)
                .build());

        // 4. Principal
        approvals.add(DepartmentApproval.builder()
                .clearanceRequest(savedRequest)
                .department("Principal")
                .status(ClearanceStatus.PENDING)
                .orderNumber(order++)
                .build());

        // 5. Finance (last)
        approvals.add(DepartmentApproval.builder()
                .clearanceRequest(savedRequest)
                .department("Finance")
                .status(ClearanceStatus.PENDING)
                .orderNumber(order)
                .build());

        // Save all approvals
        departmentApprovalRepository.saveAll(approvals);

        // Send notification
        notificationService.sendNotification(
                student.getUser(),
                "Clearance Request Submitted",
                "Your clearance request has been submitted successfully. You will be notified when departments review it.",
                NotificationType.CLEARANCE_UPDATE
        );

        // Log action
        auditLogService.logAction(
                student.getUser().getId(),
                "SUBMIT_CLEARANCE",
                "Student " + student.getRegistrationNumber() + " submitted clearance request"
        );

        return ApiResponse.success("Clearance request submitted successfully");
    }

    public ClearanceResponse getClearanceStatus(String studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        // Check for pending request first
        Optional<ClearanceRequest> pendingRequest = clearanceRequestRepository.findByStudentAndStatus(student, ClearanceStatus.PENDING);
        ClearanceRequest request;

        if (pendingRequest.isPresent()) {
            request = pendingRequest.get();
        } else {
            List<ClearanceRequest> requests = clearanceRequestRepository.findByStudent(student);
            if (requests.isEmpty()) {
                return ClearanceResponse.builder()
                        .studentName(student.getFullName())
                        .registrationNumber(student.getRegistrationNumber())
                        .studentId(student.getId())
                        .status(ClearanceStatus.PENDING)
                        .statusMessage("No clearance request found")
                        .build();
            }
            request = requests.get(requests.size() - 1);
        }

        return mapToResponse(request);
    }

    public ClearanceResponse getClearanceStatusByRegistrationNumber(String registrationNumber) {
        Student student = studentRepository.findByRegistrationNumber(registrationNumber)
                .orElseThrow(() -> new RuntimeException("Student not found with registration number: " + registrationNumber));
        return getClearanceStatus(student.getId());
    }

    public Page<ClearanceResponse> getStudentClearanceHistory(String studentId, Pageable pageable) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        Page<ClearanceRequest> requestPage = clearanceRequestRepository.findByStudent(student, pageable);
        List<ClearanceResponse> responses = requestPage.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return new PageImpl<>(responses, pageable, requestPage.getTotalElements());
    }

    public Page<ClearanceResponse> getDepartmentClearanceRequests(String department, String status, Pageable pageable) {
        Page<ClearanceRequest> requestPage;
        if (status != null && !status.isEmpty()) {
            ClearanceStatus clearanceStatus = ClearanceStatus.valueOf(status.toUpperCase());
            requestPage = clearanceRequestRepository.findByStudentDepartmentAndStatus(department, clearanceStatus, pageable);
        } else {
            requestPage = clearanceRequestRepository.findByStudentDepartment(department, pageable);
        }

        List<ClearanceResponse> responses = requestPage.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return new PageImpl<>(responses, pageable, requestPage.getTotalElements());
    }

    public ApiResponse approveClearance(String requestId, String department, String comments) {
        Long id = Long.parseLong(requestId);
        ClearanceRequest request = clearanceRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Clearance request not found"));

        DepartmentApproval approval = departmentApprovalRepository
                .findByClearanceRequestAndDepartment(request, department)
                .orElseThrow(() -> new RuntimeException("Department approval not found"));

        approval.setStatus(ClearanceStatus.APPROVED);
        approval.setApprovedBy(getCurrentUser().getFullName());
        approval.setApprovalDate(LocalDateTime.now());
        approval.setComments(comments);
        departmentApprovalRepository.save(approval);

        // Check if all departments are approved
        long total = departmentApprovalRepository.countByClearanceRequest(request);
        long approved = departmentApprovalRepository.countByClearanceRequestAndStatus(request, ClearanceStatus.APPROVED);
        long rejected = departmentApprovalRepository.countByClearanceRequestAndStatus(request, ClearanceStatus.REJECTED);

        if (rejected > 0) {
            request.setStatus(ClearanceStatus.REJECTED.name());
        } else if (total == approved) {
            request.setStatus(ClearanceStatus.COMPLETED.name());
            clearanceRequestRepository.save(request);

            Student student = request.getStudent();
            student.setClearanceStatus(ClearanceStatus.CLEARED);
            studentRepository.save(student);

            notificationService.sendNotification(
                    student.getUser(),
                    "Clearance Complete!",
                    "Congratulations! Your clearance has been completed. You can now download your certificate.",
                    NotificationType.CERTIFICATE_READY
            );
        }

        clearanceRequestRepository.save(request);

        notificationService.sendApprovalNotification(
                request.getStudent().getId(),
                department,
                getCurrentUser().getFullName()
        );

        auditLogService.logAction(
                getCurrentUser().getId(),
                "APPROVE_CLEARANCE",
                "Department " + department + " approved clearance for " + request.getStudent().getRegistrationNumber()
        );

        return ApiResponse.success("Clearance approved successfully");
    }

    public ApiResponse rejectClearance(String requestId, String department, String reason) {
        Long id = Long.parseLong(requestId);
        ClearanceRequest request = clearanceRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Clearance request not found"));

        DepartmentApproval approval = departmentApprovalRepository
                .findByClearanceRequestAndDepartment(request, department)
                .orElseThrow(() -> new RuntimeException("Department approval not found"));

        approval.setStatus(ClearanceStatus.REJECTED);
        approval.setApprovedBy(getCurrentUser().getFullName());
        approval.setApprovalDate(LocalDateTime.now());
        approval.setComments(reason);
        departmentApprovalRepository.save(approval);

        request.setStatus(ClearanceStatus.REJECTED.name());
        clearanceRequestRepository.save(request);

        notificationService.sendRejectionNotification(
                request.getStudent().getId(),
                department,
                reason
        );

        auditLogService.logAction(
                getCurrentUser().getId(),
                "REJECT_CLEARANCE",
                "Department " + department + " rejected clearance for " + request.getStudent().getRegistrationNumber()
        );

        return ApiResponse.error("Clearance rejected: " + reason);
    }

    private ClearanceResponse mapToResponse(ClearanceRequest request) {
        Student student = request.getStudent();
        List<DepartmentApproval> approvals = departmentApprovalRepository.findByClearanceRequest(request);

        long totalDepartments = approvals.size();
        long approvedDepartments = approvals.stream()
                .filter(a -> a.getStatus() == ClearanceStatus.APPROVED)
                .count();
        long pendingDepartments = approvals.stream()
                .filter(a -> a.getStatus() == ClearanceStatus.PENDING)
                .count();
        long rejectedDepartments = approvals.stream()
                .filter(a -> a.getStatus() == ClearanceStatus.REJECTED)
                .count();

        int progressPercentage = totalDepartments > 0
                ? (int) ((approvedDepartments * 100) / totalDepartments)
                : 0;

        List<ClearanceResponse.DepartmentApprovalDTO> approvalDTOs = approvals.stream()
                .map(this::mapApproval)
                .collect(Collectors.toList());

        return ClearanceResponse.builder()
                .requestId(String.valueOf(request.getId()))
                .studentId(student.getId())
                .registrationNumber(student.getRegistrationNumber())
                .studentName(student.getFullName())
                .email(student.getUser() != null ? student.getUser().getEmail() : null)
                .programme(student.getProgramme())
                .faculty(student.getCollege())
                .department(student.getDepartment())
                .status(ClearanceStatus.valueOf(request.getStatus()))
                .progressPercentage(progressPercentage)
                .totalDepartments((int) totalDepartments)
                .approvedCount((int) approvedDepartments)
                .pendingCount((int) pendingDepartments)
                .rejectedCount((int) rejectedDepartments)
                .completedCount((int) (approvedDepartments))
                .requestDate(request.getSubmittedAt())
                .approvals(approvalDTOs)
                .statusMessage(getStatusMessage(ClearanceStatus.valueOf(request.getStatus())))
                .build();
    }

    private ClearanceResponse.DepartmentApprovalDTO mapApproval(DepartmentApproval approval) {
        return ClearanceResponse.DepartmentApprovalDTO.builder()
                .id(String.valueOf(approval.getId()))
                .departmentName(approval.getDepartment())
                .status(approval.getStatus())
                .statusMessage(getStatusMessage(approval.getStatus()))
                .approvedBy(approval.getApprovedBy())
                .approvalDate(approval.getApprovalDate())
                .comments(approval.getComments())
                .order(approval.getOrderNumber())
                .build();
    }

    private String getStatusMessage(ClearanceStatus status) {
        switch (status) {
            case PENDING:
                return "Waiting for review";
            case APPROVED:
                return "Approved";
            case REJECTED:
                return "Rejected";
            case CLEARED:
                return "Cleared";
            case COMPLETED:
                return "Completed";
            default:
                return "Unknown status";
        }
    }

    private List<String> getDepartmentsForClearance(String programme) {
        List<String> departments = new ArrayList<>();
        departments.add("Convocation");
        departments.add("Games Coach");
        departments.add("Hall Warden");
        departments.add("USAB");
        departments.add("DARUSO");
        departments.add("Library");
        departments.add("Dean of Students");
        departments.add("Smart Card");
        return departments;
    }

    private User getCurrentUser() {
        // This should get the current authenticated user from SecurityContext
        return userRepository.findByEmail("admin@udsm.ac.tz")
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}