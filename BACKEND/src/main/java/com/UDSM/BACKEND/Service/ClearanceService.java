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
import com.UDSM.BACKEND.config.ProjectScope;
import com.UDSM.BACKEND.Repository.UserRepository;
import com.UDSM.BACKEND.dto.ApiResponse;
import com.UDSM.BACKEND.dto.ClearanceDecisionRequest;
import com.UDSM.BACKEND.dto.ClearanceRequestDTO;
import com.UDSM.BACKEND.dto.ClearanceResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class ClearanceService {
    private final ClearanceRequestRepository clearanceRequestRepository;
    private final DepartmentApprovalRepository departmentApprovalRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    // =========================================================
    // STUDENT CLEARANCE SUBMISSION
    // =========================================================

    public ApiResponse submitClearanceRequest(ClearanceRequestDTO requestDTO, Authentication authentication) {
        String projectId = ProjectScope.currentProjectId();
        Student student = findRequestedStudent(requestDTO.getRegistrationNumber(), authentication, projectId);

        // Check if student already has a pending request
        Optional<ClearanceRequest> existingRequest = projectId == null
                ? clearanceRequestRepository.findByStudentAndStatus(student, ClearanceStatus.PENDING.name())
                : clearanceRequestRepository.findByStudentAndStatusAndProjectId(student, ClearanceStatus.PENDING.name(), projectId);
        if (existingRequest.isPresent()) {
            return ApiResponse.error("You already have a pending clearance request");
        }

        // Update student record with submitted details
        if (requestDTO.getHall() != null) student.setHall(requestDTO.getHall());
        if (requestDTO.getWing() != null) student.setWing(requestDTO.getWing());
        if (requestDTO.getBlock() != null) student.setBlock(requestDTO.getBlock());
        if (requestDTO.getRoomNumber() != null) student.setRoomNumber(requestDTO.getRoomNumber());
        if (requestDTO.getAddress() != null) student.setAddress(requestDTO.getAddress());
        else if (requestDTO.getPhysicalAddress() != null) student.setAddress(requestDTO.getPhysicalAddress());
        if (requestDTO.getPhoneNumber() != null) student.setPhoneNumber(requestDTO.getPhoneNumber());
        if (requestDTO.getPhoto() != null && !requestDTO.getPhoto().isBlank()) student.setPhoto(requestDTO.getPhoto());
        if (requestDTO.getSponsor() != null) student.setSponsor(requestDTO.getSponsor());
        studentRepository.save(student);

        String effectiveAddress = requestDTO.getAddress() != null ? requestDTO.getAddress() : student.getAddress();
        String effectivePhysicalAddress = requestDTO.getPhysicalAddress() != null ? requestDTO.getPhysicalAddress() : effectiveAddress;

        // Create new clearance request
        ClearanceRequest clearanceRequest = ClearanceRequest.builder()
                .student(student)
                .college(requestDTO.getCollege() != null ? requestDTO.getCollege() : student.getCollege())
                .department(requestDTO.getDepartment() != null ? requestDTO.getDepartment() : student.getDepartment())
                .programme(requestDTO.getProgramme() != null ? requestDTO.getProgramme() : student.getProgramme())
                .wing(requestDTO.getWing() != null ? requestDTO.getWing() : student.getWing())
                .block(requestDTO.getBlock() != null ? requestDTO.getBlock() : student.getBlock())
                .address(effectiveAddress)
                .physicalAddress(effectivePhysicalAddress)
                .projectId(projectId)
                .status(ClearanceStatus.PENDING.name())
                .currentStage("Convocation")
                .currentOffice("Convocation")
                .submittedAt(LocalDateTime.now())
                .build();

        ClearanceRequest savedRequest = clearanceRequestRepository.save(clearanceRequest);

        // Build sequential and parallel approvals
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

        // Workshop for Engineering (CoET), Laboratory for Health/Medical (MCHAS)
        String college = requestDTO.getCollege() != null ? requestDTO.getCollege() : student.getCollege();
        if (college != null) {
            String colLower = college.toLowerCase();
            if (colLower.contains("engineering") || colLower.contains("coet")) {
                approvals.add(DepartmentApproval.builder()
                        .clearanceRequest(savedRequest)
                        .department("Workshop")
                        .status(ClearanceStatus.PENDING)
                        .orderNumber(order++)
                        .build());
            }
            if (colLower.contains("health") || colLower.contains("allied") || colLower.contains("mchas")) {
                approvals.add(DepartmentApproval.builder()
                        .clearanceRequest(savedRequest)
                        .department("Laboratory")
                        .status(ClearanceStatus.PENDING)
                        .orderNumber(order++)
                        .build());
            }
        }

        // 3. Department
        approvals.add(DepartmentApproval.builder()
                .clearanceRequest(savedRequest)
                .department("Department")
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

        departmentApprovalRepository.saveAll(approvals);

        if (student.getUser() != null) {
            notificationService.sendNotification(
                    student.getUser(),
                    "Clearance Request Submitted",
                    "Your clearance request has been submitted successfully. You will be notified as departments review it.",
                    NotificationType.CLEARANCE_UPDATE
            );
        }

        auditLogService.logAction(
                student.getUser() != null ? student.getUser().getId() : student.getId(),
                "SUBMIT_CLEARANCE",
                "Student " + student.getRegistrationNumber() + " submitted clearance request"
        );

        return ApiResponse.success("Clearance request submitted successfully");
    }

    // =========================================================
    // OFFICE REQUEST QUERIES & DECISIONS
    // =========================================================

    public List<ClearanceResponse> getOfficeRequests(String requestedOffice, String statusFilter, Authentication authentication) {
        User user = getCurrentUser(authentication);
        String targetOffice = resolveTargetOffice(user, requestedOffice);
        String projectId = ProjectScope.currentProjectId();

        List<ClearanceRequest> requests = projectId != null
                ? clearanceRequestRepository.findByProjectId(projectId)
                : clearanceRequestRepository.findAll();

        return requests.stream()
                .filter(cr -> {
                    // Check if this request has a department approval matching targetOffice
                    Optional<DepartmentApproval> approvalOpt = departmentApprovalRepository.findByClearanceRequest(cr).stream()
                            .filter(a -> matchesOffice(a.getDepartment(), targetOffice, cr))
                            .findFirst();

                    if (approvalOpt.isEmpty()) {
                        return false;
                    }
                    DepartmentApproval approval = approvalOpt.get();

                    if (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter)) {
                        if (!approval.getStatus().name().equalsIgnoreCase(statusFilter)) {
                            return false;
                        }
                    }

                    // Scope by Department if Department Officer
                    if (user.getRole() == ERole.DEPARTMENT_OFFICER && user.getDepartment() != null && !user.getDepartment().isBlank()) {
                        String userDept = user.getDepartment().trim().toLowerCase();
                        String studentDept = (cr.getDepartment() != null ? cr.getDepartment() : (cr.getStudent() != null ? cr.getStudent().getDepartment() : "")).trim().toLowerCase();
                        if (!studentDept.contains(userDept) && !userDept.contains(studentDept)) {
                            return false;
                        }
                    }

                    // Scope by College if Principal
                    if (user.getRole() == ERole.PRINCIPAL && user.getCollege() != null && !user.getCollege().isBlank()) {
                        String userCol = user.getCollege().trim().toLowerCase();
                        String studentCol = (cr.getCollege() != null ? cr.getCollege() : (cr.getStudent() != null ? cr.getStudent().getCollege() : "")).trim().toLowerCase();
                        if (!studentCol.contains(userCol) && !userCol.contains(studentCol)) {
                            return false;
                        }
                    }

                    return true;
                })
                .sorted((a, b) -> {
                    LocalDateTime t1 = a.getSubmittedAt() != null ? a.getSubmittedAt() : LocalDateTime.MIN;
                    LocalDateTime t2 = b.getSubmittedAt() != null ? b.getSubmittedAt() : LocalDateTime.MIN;
                    return t2.compareTo(t1);
                })
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public ApiResponse approveOfficeClearance(ClearanceDecisionRequest request, Authentication authentication) {
        User user = getCurrentUser(authentication);
        String office = resolveTargetOffice(user, request.getOffice());
        return approveClearance(request.getRequestId(), office, request.getComments(), user);
    }

    public ApiResponse rejectOfficeClearance(ClearanceDecisionRequest request, Authentication authentication) {
        User user = getCurrentUser(authentication);
        String office = resolveTargetOffice(user, request.getOffice());
        return rejectClearance(request.getRequestId(), office, request.getReason(), user);
    }

    public ApiResponse withdrawOfficeClearance(ClearanceDecisionRequest request, Authentication authentication) {
        User user = getCurrentUser(authentication);
        String office = resolveTargetOffice(user, request.getOffice());
        return withdrawClearance(request.getRequestId(), office, user);
    }

    public ApiResponse approveClearance(String requestId, String department, String comments) {
        return approveClearance(requestId, department, comments, getCurrentUser(null));
    }

    public ApiResponse approveClearance(String requestId, String department, String comments, User user) {
        Long id = Long.parseLong(requestId);
        String projectId = ProjectScope.currentProjectId();
        ClearanceRequest request = (projectId == null
                ? clearanceRequestRepository.findById(id)
                : clearanceRequestRepository.findById(id).filter(item -> projectId.equals(item.getProjectId())))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Clearance request not found: " + requestId));

        DepartmentApproval approval = findMatchingApproval(request, department)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department approval not found for: " + department));

        approval.setStatus(ClearanceStatus.APPROVED);
        approval.setApprovedBy(user != null ? user.getFullName() : "Authorized Officer");
        approval.setApprovalDate(LocalDateTime.now());
        approval.setComments(comments != null && !comments.isBlank() ? comments : "Approved");
        departmentApprovalRepository.save(approval);

        // Check overall completion
        long total = departmentApprovalRepository.countByClearanceRequest(request);
        long approved = departmentApprovalRepository.countByClearanceRequestAndStatus(request, ClearanceStatus.APPROVED);
        long rejected = departmentApprovalRepository.countByClearanceRequestAndStatus(request, ClearanceStatus.REJECTED);

        if (rejected > 0) {
            request.setStatus(ClearanceStatus.REJECTED.name());
        } else if (total > 0 && total == approved) {
            request.setStatus(ClearanceStatus.COMPLETED.name());
            request.setCurrentStage("Completed");
            request.setCurrentOffice("Completed");
            clearanceRequestRepository.save(request);

            Student student = request.getStudent();
            if (student != null) {
                student.setClearanceStatus(ClearanceStatus.CLEARED);
                studentRepository.save(student);

                if (student.getUser() != null) {
                    notificationService.sendNotification(
                            student.getUser(),
                            "Clearance Complete!",
                            "Congratulations! Your clearance has been fully completed and approved by all offices.",
                            NotificationType.CERTIFICATE_READY
                    );
                }
            }
        } else {
            updateClearanceStage(request);
            clearanceRequestRepository.save(request);
        }

        if (request.getStudent() != null) {
            notificationService.sendApprovalNotification(
                    request.getStudent().getId(),
                    department,
                    user != null ? user.getFullName() : "Authorized Officer"
            );
        }

        auditLogService.logAction(
                user != null ? user.getId() : "SYSTEM",
                "APPROVE_CLEARANCE",
                "Office " + department + " approved clearance for request #" + id
        );

        return ApiResponse.success("Clearance approved successfully by " + department);
    }

    public ApiResponse rejectClearance(String requestId, String department, String reason) {
        return rejectClearance(requestId, department, reason, getCurrentUser(null));
    }

    public ApiResponse rejectClearance(String requestId, String department, String reason, User user) {
        Long id = Long.parseLong(requestId);
        String projectId = ProjectScope.currentProjectId();
        ClearanceRequest request = (projectId == null
                ? clearanceRequestRepository.findById(id)
                : clearanceRequestRepository.findById(id).filter(item -> projectId.equals(item.getProjectId())))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Clearance request not found: " + requestId));

        DepartmentApproval approval = findMatchingApproval(request, department)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department approval not found for: " + department));

        approval.setStatus(ClearanceStatus.REJECTED);
        approval.setApprovedBy(user != null ? user.getFullName() : "Authorized Officer");
        approval.setApprovalDate(LocalDateTime.now());
        approval.setComments(reason != null && !reason.isBlank() ? reason : "Rejected by " + department);
        departmentApprovalRepository.save(approval);

        request.setStatus(ClearanceStatus.REJECTED.name());
        request.setCurrentOffice(department);
        clearanceRequestRepository.save(request);

        if (request.getStudent() != null) {
            notificationService.sendRejectionNotification(
                    request.getStudent().getId(),
                    department,
                    reason != null ? reason : "No reason provided"
            );
        }

        auditLogService.logAction(
                user != null ? user.getId() : "SYSTEM",
                "REJECT_CLEARANCE",
                "Office " + department + " rejected clearance for request #" + id + ": " + reason
        );

        return ApiResponse.success("Clearance rejected by " + department);
    }

    public ApiResponse withdrawClearance(String requestId, String department, User user) {
        Long id = Long.parseLong(requestId);
        String projectId = ProjectScope.currentProjectId();
        ClearanceRequest request = (projectId == null
                ? clearanceRequestRepository.findById(id)
                : clearanceRequestRepository.findById(id).filter(item -> projectId.equals(item.getProjectId())))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Clearance request not found: " + requestId));

        DepartmentApproval approval = findMatchingApproval(request, department)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department approval not found for: " + department));

        approval.setStatus(ClearanceStatus.PENDING);
        approval.setComments(null);
        approval.setApprovalDate(null);
        approval.setApprovedBy(null);
        departmentApprovalRepository.save(approval);

        long rejected = departmentApprovalRepository.countByClearanceRequestAndStatus(request, ClearanceStatus.REJECTED);
        if (rejected == 0 && ClearanceStatus.REJECTED.name().equals(request.getStatus())) {
            request.setStatus(ClearanceStatus.PENDING.name());
        }

        if (ClearanceStatus.COMPLETED.name().equals(request.getStatus())) {
            request.setStatus(ClearanceStatus.PENDING.name());
            Student student = request.getStudent();
            if (student != null) {
                student.setClearanceStatus(ClearanceStatus.PENDING);
                studentRepository.save(student);
            }
        }

        updateClearanceStage(request);
        clearanceRequestRepository.save(request);

        auditLogService.logAction(
                user != null ? user.getId() : "SYSTEM",
                "WITHDRAW_CLEARANCE",
                "Officer " + (user != null ? user.getFullName() : "Staff") + " withdrew decision for " + department + " on request #" + id
        );

        return ApiResponse.success("Decision withdrawn successfully; request returned to Pending.");
    }

    // =========================================================
    // STUDENT CLEARANCE STATUS
    // =========================================================

    public ClearanceResponse getMyClearanceRequest(Authentication authentication) {
        User user = getCurrentUser(authentication);
        String projectId = ProjectScope.currentProjectId();
        Student student = (projectId == null
                ? studentRepository.findByUserId(user.getId())
                : studentRepository.findByUserIdAndProjectId(user.getId(), projectId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found for user: " + user.getEmail()));

        return getClearanceStatus(student.getId(), authentication);
    }

    public ClearanceResponse getClearanceStatus(String studentId, Authentication authentication) {
        String projectId = ProjectScope.currentProjectId();
        Student student = (projectId == null
                ? studentRepository.findById(studentId)
                : studentRepository.findByIdAndProjectId(studentId, projectId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));
        assertStudentAccess(student, authentication);

        Optional<ClearanceRequest> pendingRequest = projectId == null
                ? clearanceRequestRepository.findByStudentAndStatus(student, ClearanceStatus.PENDING.name())
                : clearanceRequestRepository.findByStudentAndStatusAndProjectId(student, ClearanceStatus.PENDING.name(), projectId);
        ClearanceRequest request;

        if (pendingRequest.isPresent()) {
            request = pendingRequest.get();
        } else {
            List<ClearanceRequest> requests = projectId == null
                    ? clearanceRequestRepository.findByStudent(student)
                    : clearanceRequestRepository.findByStudentIdAndProjectId(student.getId(), projectId);
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

    public ClearanceResponse getClearanceStatusByRegistrationNumber(
            String registrationNumber,
            Authentication authentication) {
        String projectId = ProjectScope.currentProjectId();
        Student student = (projectId == null
                ? studentRepository.findByRegistrationNumber(registrationNumber)
                : studentRepository.findByRegistrationNumberAndProjectId(registrationNumber, projectId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found with registration number: " + registrationNumber));
        assertStudentAccess(student, authentication);
        return getClearanceStatus(student.getId(), authentication);
    }

    public Page<ClearanceResponse> getStudentClearanceHistory(String studentId, Pageable pageable) {
        String projectId = ProjectScope.currentProjectId();
        Student student = (projectId == null
                ? studentRepository.findById(studentId)
                : studentRepository.findByIdAndProjectId(studentId, projectId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));

        Page<ClearanceRequest> requestPage = projectId == null
                ? clearanceRequestRepository.findByStudent(student, pageable)
                : new PageImpl<>(clearanceRequestRepository.findByStudentIdAndProjectId(student.getId(), projectId),
                pageable, clearanceRequestRepository.findByStudentIdAndProjectId(student.getId(), projectId).size());
        List<ClearanceResponse> responses = requestPage.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return new PageImpl<>(responses, pageable, requestPage.getTotalElements());
    }

    public Page<ClearanceResponse> getDepartmentClearanceRequests(String department, String status, Pageable pageable) {
        String projectId = ProjectScope.currentProjectId();
        Page<ClearanceRequest> requestPage;
        if (status != null && !status.isEmpty()) {
            ClearanceStatus clearanceStatus = ClearanceStatus.valueOf(status.toUpperCase());
            requestPage = projectId == null
                    ? clearanceRequestRepository.findByStudentDepartmentAndStatus(department, clearanceStatus, pageable)
                    : clearanceRequestRepository.findByStudentDepartmentAndStatusAndProjectId(department, clearanceStatus, projectId, pageable);
        } else {
            requestPage = projectId == null
                    ? clearanceRequestRepository.findByStudentDepartment(department, pageable)
                    : clearanceRequestRepository.findByStudentDepartmentAndProjectId(department, projectId, pageable);
        }

        List<ClearanceResponse> responses = requestPage.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return new PageImpl<>(responses, pageable, requestPage.getTotalElements());
    }

    // =========================================================
    // HELPER & MAPPING METHODS
    // =========================================================

    private void updateClearanceStage(ClearanceRequest request) {
        List<DepartmentApproval> approvals = departmentApprovalRepository.findByClearanceRequest(request);

        // Convocation stage
        Optional<DepartmentApproval> convocation = approvals.stream()
                .filter(a -> "Convocation".equalsIgnoreCase(a.getDepartment()))
                .findFirst();

        if (convocation.isPresent() && convocation.get().getStatus() != ClearanceStatus.APPROVED) {
            request.setCurrentStage("Convocation");
            request.setCurrentOffice("Convocation");
            return;
        }

        // Parallel stage
        List<DepartmentApproval> parallelApprovals = approvals.stream()
                .filter(a -> !List.of("Convocation", "Department", "Principal", "Finance").contains(a.getDepartment()))
                .toList();

        boolean allParallelApproved = parallelApprovals.stream()
                .allMatch(a -> a.getStatus() == ClearanceStatus.APPROVED);

        if (!allParallelApproved) {
            request.setCurrentStage("Parallel");
            request.setCurrentOffice("Parallel");
            return;
        }

        // Department stage
        Optional<DepartmentApproval> deptApproval = approvals.stream()
                .filter(a -> "Department".equalsIgnoreCase(a.getDepartment()))
                .findFirst();

        if (deptApproval.isPresent() && deptApproval.get().getStatus() != ClearanceStatus.APPROVED) {
            request.setCurrentStage("Department");
            request.setCurrentOffice("Department");
            return;
        }

        // Principal stage
        Optional<DepartmentApproval> principalApproval = approvals.stream()
                .filter(a -> "Principal".equalsIgnoreCase(a.getDepartment()))
                .findFirst();

        if (principalApproval.isPresent() && principalApproval.get().getStatus() != ClearanceStatus.APPROVED) {
            request.setCurrentStage("Principal");
            request.setCurrentOffice("Principal");
            return;
        }

        // Finance stage
        Optional<DepartmentApproval> financeApproval = approvals.stream()
                .filter(a -> "Finance".equalsIgnoreCase(a.getDepartment()))
                .findFirst();

        if (financeApproval.isPresent() && financeApproval.get().getStatus() != ClearanceStatus.APPROVED) {
            request.setCurrentStage("Finance");
            request.setCurrentOffice("Finance");
            return;
        }

        request.setCurrentStage("Completed");
        request.setCurrentOffice("Completed");
    }

    private Optional<DepartmentApproval> findMatchingApproval(ClearanceRequest request, String department) {
        List<DepartmentApproval> approvals = departmentApprovalRepository.findByClearanceRequest(request);
        return approvals.stream()
                .filter(a -> matchesOffice(a.getDepartment(), department, request))
                .findFirst();
    }

    private boolean matchesOffice(String approvalDept, String targetOffice, ClearanceRequest request) {
        if (approvalDept == null || targetOffice == null) return false;
        if (approvalDept.equalsIgnoreCase(targetOffice)) return true;

        // Support both "Department" and specific department names
        if ("Department".equalsIgnoreCase(targetOffice)) {
            return "Department".equalsIgnoreCase(approvalDept)
                    || (request.getDepartment() != null && request.getDepartment().equalsIgnoreCase(approvalDept));
        }
        return false;
    }

    private String resolveTargetOffice(User user, String requestedOffice) {
        if (requestedOffice != null && !requestedOffice.isBlank()) {
            if (user.getRole() == ERole.ADMIN || user.getRole() == ERole.ADMINISTRATOR || user.getRole() == ERole.SUPERUSER) {
                return requestedOffice;
            }
        }
        return switch (user.getRole()) {
            case CONVOCATION_OFFICER -> "Convocation";
            case LIBRARY_OFFICER -> "Library";
            case FINANCE_OFFICER -> "Finance";
            case ICT_OFFICER -> "ICT";
            case GAMES_COACH -> "Games Coach";
            case HALL_WARDEN -> "Hall Warden";
            case USAB_OFFICER -> "USAB";
            case DARUSO_OFFICER -> "DARUSO";
            case DEAN_OF_STUDENTS -> "Dean of Students";
            case SMART_CARD_OFFICER -> "Smart Card";
            case WORKSHOP_OFFICER -> "Workshop";
            case LABORATORY_OFFICER -> "Laboratory";
            case DEPARTMENT_OFFICER -> "Department";
            case PRINCIPAL -> "Principal";
            default -> requestedOffice != null && !requestedOffice.isBlank() ? requestedOffice : "Department";
        };
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

        String college = request.getCollege() != null ? request.getCollege() : (student != null ? student.getCollege() : null);
        String department = request.getDepartment() != null ? request.getDepartment() : (student != null ? student.getDepartment() : null);
        String programme = request.getProgramme() != null ? request.getProgramme() : (student != null ? student.getProgramme() : null);
        String wing = request.getWing() != null ? request.getWing() : (student != null ? student.getWing() : null);
        String block = request.getBlock() != null ? request.getBlock() : (student != null ? student.getBlock() : null);
        String address = request.getAddress() != null ? request.getAddress() : (student != null ? student.getAddress() : null);
        String physicalAddress = request.getPhysicalAddress() != null ? request.getPhysicalAddress() : null;
        String email = student != null ? (student.getEmail() != null ? student.getEmail() : (student.getUser() != null ? student.getUser().getEmail() : null)) : null;
        String phone = student != null ? student.getPhoneNumber() : null;
        String hall = student != null ? student.getHall() : null;
        String roomNumber = student != null ? student.getRoomNumber() : null;
        String photo = student != null ? student.getPhoto() : null;
        String sponsor = student != null ? student.getSponsor() : null;

        return ClearanceResponse.builder()
                .requestId(String.valueOf(request.getId()))
                .studentId(student != null && student.getUser() != null ? student.getUser().getId() : (student != null ? student.getId() : request.getStudentId()))
                .registrationNumber(student != null ? student.getRegistrationNumber() : "")
                .studentName(student != null ? student.getFullName() : "")
                .email(email)
                .phoneNumber(phone)
                .programme(programme)
                .faculty(college)
                .college(college)
                .department(department)
                .address(address)
                .physicalAddress(physicalAddress)
                .hall(hall)
                .wing(wing)
                .block(block)
                .roomNumber(roomNumber)
                .sponsor(sponsor)
                .photo(photo)
                .status(ClearanceStatus.valueOf(request.getStatus()))
                .currentStage(request.getCurrentStage())
                .currentOffice(request.getCurrentOffice())
                .progressPercentage(progressPercentage)
                .totalDepartments((int) totalDepartments)
                .approvedCount((int) approvedDepartments)
                .pendingCount((int) pendingDepartments)
                .rejectedCount((int) rejectedDepartments)
                .completedCount((int) approvedDepartments)
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
        if (status == null) return "Unknown";
        return switch (status) {
            case PENDING -> "Waiting for review";
            case APPROVED -> "Approved";
            case REJECTED -> "Rejected";
            case CLEARED -> "Cleared";
            case COMPLETED -> "Completed";
            default -> "Unknown status";
        };
    }

    private Student findRequestedStudent(String registrationNumber, Authentication authentication, String projectId) {
        if (isStudent(authentication)) {
            User user = (User) authentication.getPrincipal();
            Optional<Student> studentOpt = (projectId == null
                    ? studentRepository.findByUserId(user.getId())
                    : studentRepository.findByUserIdAndProjectId(user.getId(), projectId));
            if (studentOpt.isPresent()) {
                return studentOpt.get();
            }

            // Fallback: search by registration number
            if (registrationNumber != null && !registrationNumber.isBlank()) {
                studentOpt = (projectId == null
                        ? studentRepository.findByRegistrationNumber(registrationNumber)
                        : studentRepository.findByRegistrationNumberAndProjectId(registrationNumber, projectId));
                if (studentOpt.isPresent()) {
                    Student s = studentOpt.get();
                    if (s.getUser() == null) {
                        s.setUser(user);
                        studentRepository.save(s);
                    }
                    return s;
                }
            }

            // Fallback: search by user email
            if (user.getEmail() != null && !user.getEmail().isBlank()) {
                studentOpt = (projectId == null
                        ? studentRepository.findByEmail(user.getEmail())
                        : studentRepository.findByEmailAndProjectId(user.getEmail(), projectId));
                if (studentOpt.isPresent()) {
                    Student s = studentOpt.get();
                    if (s.getUser() == null) {
                        s.setUser(user);
                        studentRepository.save(s);
                    }
                    return s;
                }
            }

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "No student profile found for student account: " + user.getUsername());
        }

        return (projectId == null
                ? studentRepository.findByRegistrationNumber(registrationNumber)
                : studentRepository.findByRegistrationNumberAndProjectId(registrationNumber, projectId))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Student not found with registration number: " + registrationNumber));
    }

    private void assertStudentAccess(Student student, Authentication authentication) {
        if (isStudent(authentication)) {
            User user = (User) authentication.getPrincipal();
            if (student.getUser() == null || !user.getId().equals(student.getUser().getId())) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN, "You may only access your own clearance status");
            }
        }
    }

    private boolean isStudent(Authentication authentication) {
        return authentication != null
                && authentication.getPrincipal() instanceof User user
                && user.getRole() == ERole.STUDENT;
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user) {
            return user;
        }
        if (auth != null && auth.getName() != null) {
            return userRepository.findByEmail(auth.getName())
                    .or(() -> userRepository.findByUsername(auth.getName()))
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.UNAUTHORIZED, "Authenticated user not found: " + auth.getName()));
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No authenticated user in context");
    }

    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getAnalyticsSummary() {
        String projectId = ProjectScope.currentProjectId();
        List<ClearanceRequest> requests = projectId == null
                ? clearanceRequestRepository.findAll()
                : clearanceRequestRepository.findByProjectId(projectId);

        List<java.util.Map<String, Object>> mappedRequests = requests.stream().map(req -> {
            java.util.Map<String, Object> item = new java.util.LinkedHashMap<>();
            item.put("id", String.valueOf(req.getId()));
            Student student = req.getStudent();
            User user = student != null ? student.getUser() : null;
            item.put("studentId", req.getStudentId() != null ? req.getStudentId() : (user != null ? user.getId() : ""));
            item.put("studentName", user != null && user.getFullName() != null ? user.getFullName() : (student != null ? student.getFullName() : "Student"));
            item.put("registrationNumber", student != null && student.getRegistrationNumber() != null ? student.getRegistrationNumber() : (user != null ? user.getRegistrationNumber() : ""));
            item.put("email", user != null ? user.getEmail() : "");
            item.put("college", req.getCollege() != null ? req.getCollege() : (user != null ? user.getCollege() : ""));
            item.put("department", req.getDepartment() != null ? req.getDepartment() : (user != null ? user.getDepartment() : ""));
            item.put("programme", req.getProgramme() != null ? req.getProgramme() : (student != null ? student.getProgramme() : ""));
            item.put("yearOfStudy", student != null && student.getYearOfStudy() != null ? student.getYearOfStudy() : (user != null ? user.getYearOfStudy() : null));
            item.put("status", req.getStatus());
            item.put("currentStage", req.getCurrentStage());
            item.put("currentOffice", req.getCurrentOffice());
            item.put("requestDate", req.getSubmittedAt() != null ? req.getSubmittedAt().toString() : null);
            List<java.util.Map<String, Object>> approvals = departmentApprovalRepository.findByClearanceRequest(req)
                    .stream().map(app -> {
                        java.util.Map<String, Object> a = new java.util.LinkedHashMap<>();
                        a.put("office", app.getDepartment());
                        a.put("status", app.getStatus() != null ? app.getStatus().name() : "PENDING");
                        a.put("comment", app.getComments());
                        a.put("reviewedBy", app.getApprovedBy());
                        a.put("reviewedAt", app.getApprovalDate() != null ? app.getApprovalDate().toString() : null);
                        return a;
                    }).toList();
            item.put("approvals", approvals);
            return item;
        }).toList();

        List<User> students = (projectId == null ? userRepository.findAll() : userRepository.findByProjectIdIncludeGlobal(projectId))
                .stream()
                .filter(u -> u.getRole() == ERole.STUDENT)
                .toList();

        long totalRegisteredStudents = students.size();

        java.util.Map<String, Long> registeredStudentsByYear = new java.util.LinkedHashMap<>();
        for (User u : students) {
            String y = u.getYearOfStudy();
            String label;
            if (y != null && y.matches(".*20\\d{2}.*")) {
                java.util.regex.Matcher m = java.util.regex.Pattern.compile("20\\d{2}").matcher(y);
                label = m.find() ? "Year " + m.group() : "Year 2026";
            } else if (u.getRegistrationNumber() != null && u.getRegistrationNumber().matches(".*20\\d{2}.*")) {
                java.util.regex.Matcher m = java.util.regex.Pattern.compile("20\\d{2}").matcher(u.getRegistrationNumber());
                label = m.find() ? "Year " + m.group() : "Year 2026";
            } else if (y != null && y.trim().matches("\\d+")) {
                int yrNum = Integer.parseInt(y.trim());
                int calYear = 2026 - yrNum + 1;
                label = "Year " + calYear;
            } else {
                label = "Year 2026";
            }
            registeredStudentsByYear.put(label, registeredStudentsByYear.getOrDefault(label, 0L) + 1L);
        }

        java.util.Map<String, Object> summary = new java.util.LinkedHashMap<>();
        summary.put("requests", mappedRequests);
        summary.put("totalRegisteredStudents", totalRegisteredStudents);
        summary.put("registeredStudentsByYear", registeredStudentsByYear);
        return summary;
    }
}
