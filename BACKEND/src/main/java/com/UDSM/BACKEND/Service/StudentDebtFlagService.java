package com.UDSM.BACKEND.Service;

import com.UDSM.BACKEND.Model.ERole;
import com.UDSM.BACKEND.Model.StudentDebtFlag;
import com.UDSM.BACKEND.Model.ClearanceRequest;
import com.UDSM.BACKEND.Model.Student;
import com.UDSM.BACKEND.Repository.ClearanceRequestRepository;
import com.UDSM.BACKEND.Repository.StudentRepository;
import com.UDSM.BACKEND.Model.User;
import com.UDSM.BACKEND.Model.NotificationType;
import com.UDSM.BACKEND.Repository.StudentDebtFlagRepository;
import com.UDSM.BACKEND.Repository.UserRepository;
import com.UDSM.BACKEND.dto.CreateStudentDebtFlagRequest;
import com.UDSM.BACKEND.dto.ResolveStudentDebtFlagRequest;
import com.UDSM.BACKEND.dto.StudentClearanceLookupResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StudentDebtFlagService {
    private final StudentDebtFlagRepository debtRepository;
    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final ClearanceRequestRepository clearanceRequestRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public StudentClearanceLookupResponse lookupClearance(String username, String registrationNumber) {
        User lecturer = requireRole(username, ERole.LECTURER);
        String normalizedRegistrationNumber = registrationNumber == null ? "" : registrationNumber.trim();
        if (normalizedRegistrationNumber.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a student registration number.");
        }

        Student student = (lecturer.getProjectId() == null
                ? studentRepository.findByRegistrationNumberIgnoreCase(normalizedRegistrationNumber)
                : studentRepository.findByRegistrationNumberIgnoreCaseAndProjectId(normalizedRegistrationNumber, lecturer.getProjectId()))
                .orElse(null);
        User studentAccount = student == null
                ? userRepository.findByRegistrationNumberIgnoreCase(normalizedRegistrationNumber).orElse(null)
                : null;
        if (student == null && (studentAccount == null || studentAccount.getRole() != ERole.STUDENT)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "No student record was found with that registration number.");
        }
        String college = student != null ? student.getCollege() : studentAccount.getCollege();
        String department = student != null ? student.getDepartment() : studentAccount.getDepartment();
        if (studentAccount != null && !sameProject(lecturer.getProjectId(), studentAccount.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This student is outside your registered project.");
        }

        ClearanceRequest latestRequest = clearanceRequestRepository
                .findByStudentRegistrationNumber(normalizedRegistrationNumber).stream()
                .filter(request -> sameProject(lecturer.getProjectId(), request.getProjectId()))
                .max(java.util.Comparator.comparing(ClearanceRequest::getSubmittedAt,
                        java.util.Comparator.nullsFirst(java.util.Comparator.naturalOrder())))
                .orElse(null);
        boolean cleared = (student != null && student.getClearanceStatus() != null
                && (student.getClearanceStatus().name().equalsIgnoreCase("CLEARED")
                || student.getClearanceStatus().name().equalsIgnoreCase("COMPLETED")))
                || (latestRequest != null && ("CLEARED".equalsIgnoreCase(latestRequest.getStatus())
                || "COMPLETED".equalsIgnoreCase(latestRequest.getStatus())));
        String status = cleared ? "CLEARED"
                : latestRequest == null ? "NOT_STARTED"
                : latestRequest.getStatus();
        return new StudentClearanceLookupResponse(student != null ? student.getRegistrationNumber() : studentAccount.getRegistrationNumber(),
                student != null ? student.getFullName() : studentAccount.getFullName(),
                college, department, status,
                latestRequest == null ? null : latestRequest.getCurrentStage(), cleared);
    }

    @Transactional(readOnly = true)
    public List<StudentDebtFlag> listForLecturer(String username) {
        User lecturer = requireRole(username, ERole.LECTURER);
        return inProject(debtRepository.findByLecturerIdOrderByCreatedAtDesc(lecturer.getId()), lecturer);
    }

    @Transactional(readOnly = true)
    public List<StudentDebtFlag> listOpenForDepartment(String username) {
        User user = requireDepartmentOrAdminRole(username);
        String deptCol = user.getCollege();
        String deptName = user.getDepartment();
        return inProject(debtRepository.findAll(), user)
                .stream()
                .filter(flag -> "OPEN".equals(flag.getStatus()))
                .filter(flag -> (deptCol == null || deptCol.isBlank() || matchesScope(flag.getCollege(), deptCol))
                        && (deptName == null || deptName.isBlank() || matchesScope(flag.getDepartment(), deptName)))
                .toList();
    }

    @Transactional
    public StudentDebtFlag create(String username, CreateStudentDebtFlagRequest request) {
        User lecturer = requireRole(username, ERole.LECTURER);
        String registrationNumber = request.registrationNumber().trim();
        User studentAccount = userRepository.findByRegistrationNumberIgnoreCase(registrationNumber).orElse(null);
        Student studentProfile = studentRepository.findByRegistrationNumberIgnoreCase(registrationNumber).orElse(null);
        if (studentAccount == null && studentProfile == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No student record was found with that registration number.");
        }
        if (studentAccount != null && studentAccount.getRole() != ERole.STUDENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The registration number does not belong to a student account.");
        }
        String studentCollege = studentAccount != null ? studentAccount.getCollege() : studentProfile.getCollege();
        String studentDepartment = studentAccount != null ? studentAccount.getDepartment() : studentProfile.getDepartment();
        if (studentAccount != null && !sameProject(lecturer.getProjectId(), studentAccount.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "This student is outside your registered project.");
        }
        if (studentProfile != null && !sameProject(lecturer.getProjectId(), studentProfile.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "This student is outside your registered project.");
        }

        StudentDebtFlag flag = debtRepository.save(StudentDebtFlag.builder()
                .studentId(studentAccount != null ? studentAccount.getId() : studentProfile.getId())
                .registrationNumber(studentAccount != null ? studentAccount.getRegistrationNumber() : studentProfile.getRegistrationNumber())
                .studentName(studentAccount != null ? studentAccount.getFullName() : studentProfile.getFullName())
                .college(studentCollege)
                .department(studentDepartment)
                .programme(studentAccount != null ? studentAccount.getProgramme() : studentProfile.getProgramme())
                .amount(request.amount())
                .reason(request.reason().trim())
                .negotiationNotes(trimToNull(request.negotiationNotes()))
                .status("OPEN")
                .lecturerId(lecturer.getId())
                .lecturerName(lecturer.getFullName())
                .projectId(lecturer.getProjectId())
                .build());
        User targetStudent = studentAccount != null ? studentAccount
                : studentProfile == null ? null : studentProfile.getUser();
        if (targetStudent != null) {
            notificationService.sendNotification(targetStudent,
                    "A lecturer flagged an outstanding issue",
                    "A lecturer recorded an issue for your clearance (" + flag.getDepartment() + "). "
                            + "Reason: " + flag.getReason() + ". Amount: " + flag.getAmount()
                            + ". Please contact your lecturer to discuss and resolve it.",
                    NotificationType.CLEARANCE_UPDATE);
        }
        return flag;
    }

    @Transactional
    public StudentDebtFlag resolve(String username, String flagId, ResolveStudentDebtFlagRequest request) {
        User lecturer = requireRole(username, ERole.LECTURER);
        StudentDebtFlag flag = debtRepository.findById(flagId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Debt record not found."));
        boolean isCreator = lecturer.getId() != null && lecturer.getId().equals(flag.getLecturerId());
        boolean isSameDept = sameScope(lecturer.getCollege(), flag.getCollege()) && sameScope(lecturer.getDepartment(), flag.getDepartment());
        if ((!isCreator && !isSameDept) || !sameProject(lecturer, flag)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You can only resolve debt records you recorded or records in your registered college and department.");
        }
        if (!"OPEN".equals(flag.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This debt record is already resolved.");
        }
        flag.setStatus("RESOLVED");
        flag.setResolutionNote(request.resolutionNote().trim());
        flag.setResolvedAt(java.time.LocalDateTime.now());
        StudentDebtFlag resolved = debtRepository.save(flag);
        User student = userRepository.findByRegistrationNumberIgnoreCase(flag.getRegistrationNumber())
                .filter(account -> account.getRole() == ERole.STUDENT)
                .orElseGet(() -> studentRepository.findByRegistrationNumberIgnoreCase(flag.getRegistrationNumber())
                        .map(Student::getUser).orElse(null));
        if (student != null) {
            notificationService.sendNotification(student,
                    "Your lecturer resolved the flagged issue",
                    "The issue recorded for your clearance has been resolved. Note: " + resolved.getResolutionNote(),
                    NotificationType.CLEARANCE_UPDATE);
        }
        return resolved;
    }

    private User requireRole(String username, ERole role) {
        User user = userRepository.findByEmail(username)
                .or(() -> userRepository.findByUsername(username))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User account not found."));
        if (user.getRole() != role) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your account does not have access to this action.");
        }
        return user;
    }

    private User requireDepartmentOrAdminRole(String username) {
        User user = userRepository.findByEmail(username)
                .or(() -> userRepository.findByUsername(username))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User account not found."));
        if (user.getRole() != ERole.DEPARTMENT_OFFICER
                && user.getRole() != ERole.ADMINISTRATOR
                && user.getRole() != ERole.ADMIN
                && user.getRole() != ERole.SUPERUSER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your account does not have access to this action.");
        }
        return user;
    }

    private List<StudentDebtFlag> inProject(List<StudentDebtFlag> flags, User user) {
        return flags.stream().filter(flag -> sameProject(user, flag)).toList();
    }

    private boolean sameProject(User user, StudentDebtFlag flag) {
        return java.util.Objects.equals(user.getProjectId(), flag.getProjectId());
    }

    private boolean sameProject(String projectId, String requestProjectId) {
        return java.util.Objects.equals(projectId, requestProjectId);
    }

    private String requireScope(String value) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your account must have a college and department assigned.");
        }
        return value.trim();
    }

    private boolean sameScope(String left, String right) {
        return matchesScope(left, right);
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
        String a1 = extractAcronym(s1);
        String a2 = extractAcronym(s2);
        if (!a1.isEmpty() && (a1.equals(s2) || s2.contains(a1))) {
            return true;
        }
        if (!a2.isEmpty() && (a2.equals(s1) || s1.contains(a2))) {
            return true;
        }
        return !a1.isEmpty() && !a2.isEmpty() && a1.equals(a2);
    }

    private String extractAcronym(String s) {
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("\\(([^)]+)\\)").matcher(s);
        return matcher.find() ? matcher.group(1).trim().toLowerCase() : "";
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
