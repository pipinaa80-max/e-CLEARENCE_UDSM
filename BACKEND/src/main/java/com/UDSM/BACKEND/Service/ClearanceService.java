package com.UDSM.BACKEND.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
    private final com.UDSM.BACKEND.Repository.DepartmentRepository departmentRepository;

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

                    if ("Department".equalsIgnoreCase(targetOffice)
                            && approval.getStatus() == ClearanceStatus.PENDING) {
                        List<DepartmentApproval> crApprovals = departmentApprovalRepository.findByClearanceRequest(cr);
                        boolean convocationApproved = crApprovals.stream()
                                .filter(a -> matchesOffice(a.getDepartment(), "Convocation", cr))
                                .allMatch(a -> a.getStatus() == ClearanceStatus.APPROVED);
                        boolean allParallelApproved = crApprovals.stream()
                                .filter(a -> isParallelApproval(a, cr))
                                .allMatch(a -> a.getStatus() == ClearanceStatus.APPROVED);

                        if (!convocationApproved || !allParallelApproved) {
                            return false;
                        }

                        // Self-heal stage if lagging
                        if (!"Department".equalsIgnoreCase(cr.getCurrentStage())) {
                            cr.setCurrentStage("Department");
                            cr.setCurrentOffice("Department");
                            clearanceRequestRepository.save(cr);
                        }
                    }

                    if ("Principal".equalsIgnoreCase(targetOffice)
                            && !"Principal".equalsIgnoreCase(cr.getCurrentStage())
                            && approval.getStatus() == ClearanceStatus.PENDING) {
                        // Check if Department approval is completed for this request
                        boolean deptApproved = departmentApprovalRepository.findByClearanceRequest(cr).stream()
                                .filter(a -> isDepartmentApproval(a, cr))
                                .anyMatch(a -> a.getStatus() == ClearanceStatus.APPROVED);
                        if (!deptApproved) {
                            return false;
                        }
                    }

                    if (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter)) {
                        if (!approval.getStatus().name().equalsIgnoreCase(statusFilter)) {
                            return false;
                        }
                    }

                    // Scope by Department if Department Officer
                    if (user.getRole() == ERole.DEPARTMENT_OFFICER && user.getDepartment() != null && !user.getDepartment().isBlank()) {
                        String userDept = user.getDepartment().trim();
                        String studentDept = (cr.getDepartment() != null && !cr.getDepartment().isBlank())
                                ? cr.getDepartment().trim()
                                : (cr.getStudent() != null && cr.getStudent().getDepartment() != null ? cr.getStudent().getDepartment().trim() : "");
                        if (studentDept.isBlank() && cr.getProgramme() != null) {
                            studentDept = cr.getProgramme().trim();
                        }
                        if (!matchesDepartmentScope(studentDept, userDept)) {
                            return false;
                        }
                    }

                    // Scope by College if Principal
                    if (user.getRole() == ERole.PRINCIPAL && user.getCollege() != null && !user.getCollege().isBlank()) {
                        String userCol = user.getCollege().trim();
                        String studentCol = (cr.getCollege() != null ? cr.getCollege() : (cr.getStudent() != null ? cr.getStudent().getCollege() : "")).trim();
                        if (!matchesScope(studentCol, userCol)) {
                            return false;
                        }
                    }

                    // Enforce that requests or receipts do NOT reach Finance until all other offices are cleared
                    if ("Finance".equalsIgnoreCase(targetOffice)) {
                        List<DepartmentApproval> allApprovals = departmentApprovalRepository.findByClearanceRequest(cr);
                        boolean allOtherOfficesCleared = allApprovals.stream()
                                .filter(a -> !a.getDepartment().equalsIgnoreCase("Finance"))
                                .allMatch(a -> a.getStatus() == ClearanceStatus.APPROVED);
                        if (!allOtherOfficesCleared) {
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

    private ClearanceRequest findRequestByIdOrRegistration(String requestId, String projectId) {
        if (requestId == null || requestId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid request ID");
        }

        String reqClean = requestId.trim();
        String reqLower = reqClean.toLowerCase();
        boolean isPlaceholder = reqLower.equals("not available") || reqLower.equals("not selected") || reqLower.equals("n/a") || reqLower.equals("none") || reqLower.equals("null") || reqLower.equals("undefined");

        // 1. Try numeric ID
        if (!isPlaceholder) {
            try {
                Long id = Long.parseLong(reqClean);
                Optional<ClearanceRequest> reqOpt = (projectId == null
                        ? clearanceRequestRepository.findById(id)
                        : clearanceRequestRepository.findById(id).filter(item -> projectId.equals(item.getProjectId())));
                if (reqOpt.isPresent()) {
                    return reqOpt.get();
                }
            } catch (NumberFormatException ignored) {
                // Non-numeric string (e.g. registration number or UUID)
            }

            // 2. Try by student registration number
            Optional<Student> studentByReg = (projectId == null
                    ? studentRepository.findByRegistrationNumber(reqClean)
                    : studentRepository.findByRegistrationNumberAndProjectId(reqClean, projectId));
            if (studentByReg.isPresent()) {
                List<ClearanceRequest> reqs = (projectId == null
                        ? clearanceRequestRepository.findByStudent(studentByReg.get())
                        : clearanceRequestRepository.findByStudentIdAndProjectId(studentByReg.get().getId(), projectId));
                if (!reqs.isEmpty()) {
                    return reqs.get(reqs.size() - 1);
                }
            }

            // 3. Try by student ID
            Optional<Student> studentById = (projectId == null
                    ? studentRepository.findById(reqClean)
                    : studentRepository.findByIdAndProjectId(reqClean, projectId));
            if (studentById.isPresent()) {
                List<ClearanceRequest> reqs = (projectId == null
                        ? clearanceRequestRepository.findByStudent(studentById.get())
                        : clearanceRequestRepository.findByStudentIdAndProjectId(studentById.get().getId(), projectId));
                if (!reqs.isEmpty()) {
                    return reqs.get(reqs.size() - 1);
                }
            }

            // 4. Try matching request list
            List<ClearanceRequest> allReqs = (projectId == null
                    ? clearanceRequestRepository.findAll()
                    : clearanceRequestRepository.findByProjectId(projectId));

            for (ClearanceRequest cr : allReqs) {
                if (cr.getId() != null && String.valueOf(cr.getId()).equals(reqClean)) {
                    return cr;
                }
                if (cr.getStudent() != null) {
                    if (reqClean.equalsIgnoreCase(cr.getStudent().getRegistrationNumber()) ||
                        reqClean.equalsIgnoreCase(cr.getStudent().getId())) {
                        return cr;
                    }
                }
            }
        }

        // 5. Fallback: If requestId was a placeholder or unmatched, return the latest active request in DB
        List<ClearanceRequest> fallbackReqs = (projectId == null
                ? clearanceRequestRepository.findAll()
                : clearanceRequestRepository.findByProjectId(projectId));

        if (!fallbackReqs.isEmpty()) {
            return fallbackReqs.get(fallbackReqs.size() - 1);
        }

        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Clearance request not found: " + requestId);
    }

    public ApiResponse approveClearance(String requestId, String department, String comments) {
        return approveClearance(requestId, department, comments, getCurrentUser(null));
    }

    public ApiResponse approveClearance(String requestId, String department, String comments, User user) {
        String projectId = ProjectScope.currentProjectId();
        ClearanceRequest request = findRequestByIdOrRegistration(requestId, projectId);

        DepartmentApproval approval = findMatchingApproval(request, department)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department approval not found for: " + department));

        if ("Finance".equalsIgnoreCase(department)) {
            List<DepartmentApproval> allApprovals = departmentApprovalRepository.findByClearanceRequest(request);
            boolean allOtherOfficesCleared = allApprovals.stream()
                    .filter(a -> !a.getDepartment().equalsIgnoreCase("Finance"))
                    .allMatch(a -> a.getStatus() == ClearanceStatus.APPROVED);
            if (!allOtherOfficesCleared) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Clearance request cannot reach or be approved by Finance until all other offices are cleared.");
            }
        }

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
                            NotificationType.CLEARANCE_UPDATE
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
                "Office " + department + " approved clearance for request #" + request.getId()
        );

        return ApiResponse.success("Clearance approved successfully by " + department);
    }

    public ApiResponse rejectClearance(String requestId, String department, String reason) {
        return rejectClearance(requestId, department, reason, getCurrentUser(null));
    }

    public ApiResponse rejectClearance(String requestId, String department, String reason, User user) {
        String projectId = ProjectScope.currentProjectId();
        ClearanceRequest request = findRequestByIdOrRegistration(requestId, projectId);

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
                "Office " + department + " rejected clearance for request #" + request.getId() + ": " + reason
        );

        return ApiResponse.success("Clearance rejected by " + department);
    }

    public ApiResponse withdrawClearance(String requestId, String department, User user) {
        String projectId = ProjectScope.currentProjectId();
        ClearanceRequest request = findRequestByIdOrRegistration(requestId, projectId);

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
                "Officer " + (user != null ? user.getFullName() : "Staff") + " withdrew decision for " + department + " on request #" + request.getId()
        );

        return ApiResponse.success("Decision withdrawn successfully; request returned to Pending.");
    }

    public ApiResponse submitFinanceReceipt(Map<String, String> payload, Authentication authentication) {
        User user = getCurrentUser(authentication);
        String projectId = ProjectScope.currentProjectId();
        Student student = (projectId == null
                ? studentRepository.findByUserId(user.getId())
                : studentRepository.findByUserIdAndProjectId(user.getId(), projectId))
                .or(() -> studentRepository.findByRegistrationNumber(user.getRegistrationNumber()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found for user: " + user.getEmail()));

        List<ClearanceRequest> reqs = (projectId == null
                ? clearanceRequestRepository.findByStudent(student)
                : clearanceRequestRepository.findByStudentIdAndProjectId(student.getId(), projectId));

        if (reqs.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No clearance request found for student");
        }

        ClearanceRequest request = reqs.get(reqs.size() - 1);

        DepartmentApproval financeApproval = findMatchingApproval(request, "Finance")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Finance approval record not found"));

        financeApproval.setStatus(ClearanceStatus.PENDING);
        String note = payload != null ? payload.get("note") : null;
        if (note != null && !note.isBlank()) {
            financeApproval.setComments("Payment receipt reported: " + note.trim());
        } else {
            financeApproval.setComments("Payment receipt reported by student for verification");
        }
        financeApproval.setApprovalDate(null);
        financeApproval.setApprovedBy(null);
        departmentApprovalRepository.save(financeApproval);

        request.setStatus(ClearanceStatus.PENDING.name());
        request.setCurrentStage("Finance");
        request.setCurrentOffice("Finance");
        clearanceRequestRepository.save(request);

        notificationService.sendNotification(
                user,
                "Payment Receipt Submitted",
                "Your payment receipt has been received and returned to Finance for verification.",
                NotificationType.CLEARANCE_UPDATE
        );

        auditLogService.logAction(
                user.getId(),
                "SUBMIT_FINANCE_RECEIPT",
                "Student " + student.getRegistrationNumber() + " reported payment receipt after rejection"
        );

        return ApiResponse.success("Payment receipt submitted successfully and returned to Finance.");
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

    public boolean isDepartmentApproval(DepartmentApproval approval, ClearanceRequest request) {
        if (approval == null || approval.getDepartment() == null) return false;
        return isDepartmentApproval(approval.getDepartment(), request);
    }

    public boolean isDepartmentApproval(String dept, ClearanceRequest request) {
        if (dept == null || dept.isBlank()) return false;
        if ("Department".equalsIgnoreCase(dept.trim())) return true;
        String reqDept = request != null ? request.getDepartment() : null;
        if (reqDept != null && !reqDept.isBlank() && matchesDepartmentScope(dept, reqDept)) {
            return true;
        }
        return false;
    }

    public boolean isParallelApproval(DepartmentApproval approval, ClearanceRequest request) {
        if (approval == null || approval.getDepartment() == null) return false;
        return isParallelApproval(approval.getDepartment(), request);
    }

    public boolean isParallelApproval(String dept, ClearanceRequest request) {
        if (dept == null || dept.isBlank()) return false;
        if (matchesOffice(dept, "Convocation", request)) return false;
        if (matchesOffice(dept, "Principal", request)) return false;
        if (matchesOffice(dept, "Finance", request)) return false;
        if (isDepartmentApproval(dept, request)) return false;
        return true;
    }

    private void updateClearanceStage(ClearanceRequest request) {
        List<DepartmentApproval> approvals = departmentApprovalRepository.findByClearanceRequest(request);

        // Convocation stage
        Optional<DepartmentApproval> convocation = approvals.stream()
                .filter(a -> matchesOffice(a.getDepartment(), "Convocation", request))
                .findFirst();

        if (convocation.isPresent() && convocation.get().getStatus() != ClearanceStatus.APPROVED) {
            request.setCurrentStage("Convocation");
            request.setCurrentOffice("Convocation");
            return;
        }

        // Parallel stage
        List<DepartmentApproval> parallelApprovals = approvals.stream()
                .filter(a -> isParallelApproval(a, request))
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
                .filter(a -> isDepartmentApproval(a, request))
                .findFirst();

        if (deptApproval.isPresent() && deptApproval.get().getStatus() != ClearanceStatus.APPROVED) {
            request.setCurrentStage("Department");
            request.setCurrentOffice("Department");
            return;
        }

        // Principal stage
        Optional<DepartmentApproval> principalApproval = approvals.stream()
                .filter(a -> matchesOffice(a.getDepartment(), "Principal", request))
                .findFirst();

        if (principalApproval.isPresent() && principalApproval.get().getStatus() != ClearanceStatus.APPROVED) {
            request.setCurrentStage("Principal");
            request.setCurrentOffice("Principal");
            return;
        }

        // Finance stage
        Optional<DepartmentApproval> financeApproval = approvals.stream()
                .filter(a -> matchesOffice(a.getDepartment(), "Finance", request))
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

        String aClean = approvalDept.replaceAll("[_\\s]+", " ").trim();
        String tClean = targetOffice.replaceAll("[_\\s]+", " ").trim();
        if (aClean.equalsIgnoreCase(tClean)) return true;

        // Support both "Department" and specific department names
        if ("Department".equalsIgnoreCase(targetOffice) || "Department".equalsIgnoreCase(tClean)) {
            return "Department".equalsIgnoreCase(approvalDept)
                    || (request != null && request.getDepartment() != null && matchesDepartmentScope(approvalDept, request.getDepartment()))
                    || (request != null && isDepartmentApproval(approvalDept, request));
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
        String sponsor = student != null ? ("HELBS".equalsIgnoreCase(student.getSponsor()) ? "HESLB" : student.getSponsor()) : null;

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

    public boolean matchesDepartmentScope(String studentScope, String userScope) {
        if (studentScope == null || userScope == null || studentScope.isBlank() || userScope.isBlank()) {
            return true;
        }
        if ("all".equalsIgnoreCase(userScope.trim()) || "administration".equalsIgnoreCase(userScope.trim())) {
            return true;
        }

        String s1 = studentScope.trim();
        String s2 = userScope.trim();

        // 1. Direct or case-insensitive match
        if (s1.equalsIgnoreCase(s2)) {
            return true;
        }

        // 2. Normalized strings
        String n1 = normalizeDepartmentString(s1);
        String n2 = normalizeDepartmentString(s2);

        if (!n1.isEmpty() && !n2.isEmpty()) {
            if (n1.equals(n2) || n1.contains(n2) || n2.contains(n1)) {
                return true;
            }
        }

        // 3. Known Computer Science alias cluster
        if (isComputerScienceAlias(s1) && isComputerScienceAlias(s2)) {
            return true;
        }

        // 4. Query Database 'departments' table for canonical match
        try {
            List<Department> allDepts = departmentRepository.findByIsActiveTrueOrderByNameAsc();
            for (Department d : allDepts) {
                boolean m1 = matchesDepartmentEntity(s1, n1, d);
                boolean m2 = matchesDepartmentEntity(s2, n2, d);
                if (m1 && m2) {
                    return true;
                }
            }
        } catch (Exception e) {
            log.warn("Error querying departments table for scope matching: {}", e.getMessage());
        }

        // 5. Acronym & Initials matching (e.g. "CSE" vs "Computer Science and Engineering")
        String a1 = extractAcronymOrInitials(s1, n1);
        String a2 = extractAcronymOrInitials(s2, n2);
        if (!a1.isEmpty() && !a2.isEmpty()) {
            if (a1.equalsIgnoreCase(a2) || a1.equalsIgnoreCase(n2) || a2.equalsIgnoreCase(n1)) {
                return true;
            }
        }

        return false;
    }

    private boolean isComputerScienceAlias(String s) {
        if (s == null) return false;
        String lower = s.toLowerCase().trim();
        return lower.equals("cse") || lower.equals("cs") || lower.equals("docse")
                || lower.contains("computer science")
                || lower.contains("computer engineering");
    }

    private String normalizeDepartmentString(String raw) {
        if (raw == null) return "";
        String s = raw.toLowerCase().trim();
        s = s.replace("&", " and ");
        s = s.replaceAll("^(department\\s+of\\s+|dept\\.?\\s+of\\s+|department\\s+|school\\s+of\\s+|college\\s+of\\s+)", "");
        s = s.replaceAll("[^a-z0-9\\s]", " ");
        return s.replaceAll("\\s+", " ").trim();
    }

    private boolean matchesDepartmentEntity(String raw, String norm, Department d) {
        if (d == null) return false;
        if (d.getCode() != null) {
            String code = d.getCode().trim().toLowerCase();
            if (raw.equalsIgnoreCase(code) || norm.equals(code)) {
                return true;
            }
        }
        if (d.getName() != null) {
            String dNorm = normalizeDepartmentString(d.getName());
            if (raw.equalsIgnoreCase(d.getName()) || norm.equals(dNorm)) {
                return true;
            }
            if (!norm.isEmpty() && !dNorm.isEmpty() && (norm.contains(dNorm) || dNorm.contains(norm))) {
                return true;
            }
            String dInitials = generateInitials(dNorm);
            if (!dInitials.isEmpty() && (norm.equals(dInitials) || raw.equalsIgnoreCase(dInitials))) {
                return true;
            }
        }
        return false;
    }

    private String extractAcronymOrInitials(String raw, String norm) {
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\(([^)]+)\\)").matcher(raw);
        if (m.find()) {
            return m.group(1).trim().toLowerCase();
        }
        if (norm.length() <= 5 && !norm.contains(" ")) {
            return norm;
        }
        return generateInitials(norm);
    }

    private String generateInitials(String norm) {
        if (norm == null || norm.isBlank()) return "";
        StringBuilder sb = new StringBuilder();
        for (String word : norm.split("\\s+")) {
            if (!word.equals("and") && !word.equals("of") && !word.equals("in") && !word.equals("the") && !word.isEmpty()) {
                sb.append(word.charAt(0));
            }
        }
        return sb.toString().toLowerCase();
    }

    private boolean matchesScope(String studentScope, String userScope) {
        if (studentScope == null || userScope == null || studentScope.isBlank() || userScope.isBlank()) {
            return true;
        }
        String s1 = studentScope.trim().toLowerCase();
        String s2 = userScope.trim().toLowerCase();
        if (s1.equals(s2) || s1.contains(s2) || s2.contains(s1)) {
            return true;
        }
        String n1 = normalizeDepartmentString(s1);
        String n2 = normalizeDepartmentString(s2);
        if (!n1.isEmpty() && !n2.isEmpty() && (n1.equals(n2) || n1.contains(n2) || n2.contains(n1))) {
            return true;
        }
        String a1 = extractAcronymOrInitials(s1, n1);
        String a2 = extractAcronymOrInitials(s2, n2);
        if (!a1.isEmpty() && (a1.equals(s2) || s2.contains(a1) || a1.equals(n2))) {
            return true;
        }
        if (!a2.isEmpty() && (a2.equals(s1) || s1.contains(a2) || a2.equals(n1))) {
            return true;
        }
        return !a1.isEmpty() && !a2.isEmpty() && a1.equals(a2);
    }

    private String extractAcronym(String s) {
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("\\(([^)]+)\\)").matcher(s);
        return matcher.find() ? matcher.group(1).trim().toLowerCase() : "";
    }
}
