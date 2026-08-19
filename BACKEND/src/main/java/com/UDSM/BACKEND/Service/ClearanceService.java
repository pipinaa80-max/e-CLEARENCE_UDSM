

package com.UDSM.BACKEND.Service;
import java.time.LocalDateTime;
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
import lombok.Generated;
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
public class ClearanceService {
    private final ClearanceRequestRepository clearanceRequestRepository;
    private final DepartmentApprovalRepository departmentApprovalRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final PdfGenerator pdfGenerator;
    private final AuditLogService auditLogService;

    public ApiResponse submitClearanceRequest(ClearanceRequestDTO requestDTO) {
        Student student = (Student)this.studentRepository.findByRegistrationNumber(requestDTO.getRegistrationNumber()).orElseThrow(() -> new RuntimeException("Student not found"));
        if (this.clearanceRequestRepository.findByStudentAndStatus(student, ClearanceStatus.PENDING).isPresent()) {
            return ApiResponse.error("You already have a pending clearance request");
        } else {


            for(String dept : this.getDepartmentsForClearance(student.getProgramme())) {
                DepartmentApproval approval = DepartmentApproval.builder().clearanceRequest().department(dept).status(ClearanceStatus.PENDING).build();
                this.departmentApprovalRepository.save(approval);
            }

            this.notificationService.sendNotification(student.getUser(), "Clearance Request Submitted", "Your clearance request has been submitted successfully. You will be notified when departments review it.", NotificationType.CLEARANCE_UPDATE);
            this.auditLogService.logAction(student.getUser().getId(), "SUBMIT_CLEARANCE", "Student " + student.getRegistrationNumber() + " submitted clearance request");
            return ApiResponse.success("Clearance request submitted successfully");
        }
    }

    public ClearanceResponse getClearanceStatus(String studentId) {
        Student student = (Student)this.studentRepository.findById(studentId).orElseThrow(() -> new RuntimeException("Student not found"));
        Optional<ClearanceRequest> pendingRequest = this.clearanceRequestRepository.findByStudentAndStatus(student, ClearanceStatus.PENDING);
        ClearanceRequest request;
        if (pendingRequest.isPresent()) {
            request = (ClearanceRequest)pendingRequest.get();
        } else {
            List<ClearanceRequest> requests = this.clearanceRequestRepository.findByStudent(student);
            if (requests.isEmpty()) {
                return ClearanceResponse.builder().studentName(student.getFullName()).registrationNumber(student.getRegistrationNumber()).status(ClearanceStatus.PENDING).build();
            }

            request = (ClearanceRequest)requests.get(requests.size() - 1);
        }

        long totalDepartments = this.departmentApprovalRepository.countByClearanceRequest(request);
        long approvedDepartments = this.departmentApprovalRepository.countByClearanceRequestAndStatus(request, ClearanceStatus.APPROVED);
        long rejectedDepartments = this.departmentApprovalRepository.countByClearanceRequestAndStatus(request, ClearanceStatus.REJECTED);
        return this.mapToResponse(request);
    }

    public Page<ClearanceResponse> getStudentClearanceHistory(String studentId, Pageable pageable) {
        Student student = (Student)this.studentRepository.findById(studentId).orElseThrow(() -> new RuntimeException("Student not found"));
        Page<ClearanceRequest> requestPage = this.clearanceRequestRepository.findByStudent(student, pageable);
        List<ClearanceResponse> responses = (List)requestPage.getContent().stream().map(this::mapToResponse).collect(Collectors.toList());
        return new PageImpl(responses, pageable, requestPage.getTotalElements());
    }

    public Page<ClearanceResponse> getDepartmentClearanceRequests(String department, String status, Pageable pageable) {
        Page<ClearanceRequest> requestPage;
        if (status != null && !status.isEmpty()) {
            ClearanceStatus clearanceStatus = ClearanceStatus.valueOf(status);
            requestPage = this.clearanceRequestRepository.findByStudentDepartmentAndStatus(department, clearanceStatus, pageable);
        } else {
            requestPage = this.clearanceRequestRepository.findByStudentDepartment(department, pageable);
        }

        List<ClearanceResponse> responses = (List)requestPage.getContent().stream().map(this::mapToResponse).collect(Collectors.toList());
        return new PageImpl(responses, pageable, requestPage.getTotalElements());
    }

    public ApiResponse approveClearance(String requestId, String department, String comments) {
        Long id = Long.parseLong(requestId);
        ClearanceRequest request = (ClearanceRequest)this.clearanceRequestRepository.findById(id).orElseThrow(() -> new RuntimeException("Clearance request not found"));
        DepartmentApproval approval = (DepartmentApproval)this.departmentApprovalRepository.findByClearanceRequestAndDepartment(request, department);
        approval.setStatus(ClearanceStatus.APPROVED);
        approval.setApprovedBy(this.getCurrentUser().getFullName());
        approval.setApprovalDate(LocalDateTime.now());
        approval.setComments(comments);
        this.departmentApprovalRepository.save(approval);
        long total = this.departmentApprovalRepository.countByClearanceRequest(request);
        long approved = this.departmentApprovalRepository.countByClearanceRequestAndStatus(request, ClearanceStatus.APPROVED);
        if (total == approved) {
            request.setStatus(String.valueOf(ClearanceStatus.COMPLETED));
            this.clearanceRequestRepository.save(request);
            Student student = request.getStudent();
            student.setClearanceStatus(ClearanceStatus.CLEARED);
            this.studentRepository.save(student);
            this.notificationService.sendNotification(student.getUser(), "Clearance Complete!", "Congratulations! Your clearance has been completed. You can now download your certificate.", NotificationType.CERTIFICATE_READY);
        }

        this.notificationService.sendNotification(request.getStudent().getUser(), "Clearance Update", "Your clearance has been approved by " + department, NotificationType.APPROVAL);
        this.auditLogService.logAction(this.getCurrentUser().getId(), "APPROVE_CLEARANCE", "Department " + department + " approved clearance for " + request.getStudent().getRegistrationNumber());
        return ApiResponse.success("Clearance approved successfully");
    }

    public ApiResponse rejectClearance(String requestId, String department, String reason) {
        Long id = Long.parseLong(requestId);
        ClearanceRequest request = (ClearanceRequest)this.clearanceRequestRepository.findById(id).orElseThrow(() -> new RuntimeException("Clearance request not found"));
        DepartmentApproval approval = (DepartmentApproval)this.departmentApprovalRepository.findByClearanceRequestAndDepartment(request, department);
        approval.setStatus(ClearanceStatus.REJECTED);
        approval.setApprovedBy(this.getCurrentUser().getFullName());
        approval.setApprovalDate(LocalDateTime.now());
        approval.setComments(reason);
        this.departmentApprovalRepository.save(approval);
        this.clearanceRequestRepository.save(request);
        this.notificationService.sendNotification(request.getStudent().getUser(), "Clearance Update", "Your clearance has been rejected by " + department + ". Reason: " + reason, NotificationType.REJECTION);
        this.auditLogService.logAction(this.getCurrentUser().getId(), "REJECT_CLEARANCE", "Department " + department + " rejected clearance for " + request.getStudent().getRegistrationNumber());
        return ApiResponse.error("Clearance rejected: " + reason);
    }

    public ResponseEntity<byte[]> generateClearanceCertificate(String studentId) {
        ClearanceResponse response = this.getClearanceStatus(studentId);
        if (response.getStatus() != ClearanceStatus.CLEARED && response.getStatus() != ClearanceStatus.COMPLETED) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Clearance not completed".getBytes());
        } else {
            byte[] pdfBytes = this.pdfGenerator.generateClearanceCertificate(response);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "clearance_certificate_" + response.getRegistrationNumber() + ".pdf");
            return ((ResponseEntity.BodyBuilder)ResponseEntity.ok().headers(headers)).body(pdfBytes);
        }
    }

    private ClearanceResponse mapToResponse(ClearanceRequest request) {
        Student student = request.getStudent();
        List<DepartmentApproval> approvals = this.departmentApprovalRepository.findByClearanceRequest(request);
        List<ClearanceResponse.DepartmentApprovalDTO> approvalDTOs = approvals.stream()
                .map(this::mapApproval)
                .collect(Collectors.toList());

        return ClearanceResponse.builder()
                .studentName(student.getFullName())
                .registrationNumber(student.getRegistrationNumber())
                .status(ClearanceStatus.valueOf(request.getStatus()))
                .build();
    }

    private ClearanceResponse.DepartmentApprovalDTO mapApproval(DepartmentApproval approval) {
        return ClearanceResponse.DepartmentApprovalDTO.builder().departmentName(approval.getDepartment()).status(approval.getStatus()).approvedBy(approval.getApprovedBy()).approvalDate(approval.getApprovalDate()).comments(approval.getComments()).build();
    }

    private List<String> getDepartmentsForClearance(String programme) {
        return List.of("Finance", "Library", "Academic Affairs", "ICT Division", programme + " Department");
    }

    private User getCurrentUser() {
        return (User)this.userRepository.findByEmail("admin@udsm.ac.tz").orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Generated
    public ClearanceService(final ClearanceRequestRepository clearanceRequestRepository, final DepartmentApprovalRepository departmentApprovalRepository, final StudentRepository studentRepository, final UserRepository userRepository, final NotificationService notificationService, final PdfGenerator pdfGenerator, final AuditLogService auditLogService) {
        this.clearanceRequestRepository = clearanceRequestRepository;
        this.departmentApprovalRepository = departmentApprovalRepository;
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.pdfGenerator = pdfGenerator;
        this.auditLogService = auditLogService;
    }
}
