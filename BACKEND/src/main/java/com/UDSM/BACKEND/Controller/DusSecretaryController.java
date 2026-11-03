package com.UDSM.BACKEND.Controller;

import com.UDSM.BACKEND.Model.NotificationType;
import com.UDSM.BACKEND.Model.Student;
import com.UDSM.BACKEND.Model.User;
import com.UDSM.BACKEND.Repository.StudentRepository;
import com.UDSM/BACKEND/Repository/UserRepository;
import com.UDSM.BACKEND.Service.EmailService;
import com.UDSM.BACKEND.Service.NotificationService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/dus-secretary")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class DusSecretaryController {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    @GetMapping("/students")
    @PreAuthorize("hasAnyRole('DUS_SECRETARY', 'DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'ADMINISTRATOR', 'SUPERUSER')")
    public ResponseEntity<List<Map<String, Object>>> getStudents(@RequestParam(value = "query", required = false) String query) {
        List<Student> students;
        if (query != null && !query.isBlank()) {
            String q = query.trim().toLowerCase();
            students = studentRepository.findAll().stream()
                    .filter(s -> (s.getRegistrationNumber() != null && s.getRegistrationNumber().toLowerCase().contains(q))
                            || (s.getFullName() != null && s.getFullName().toLowerCase().contains(q))
                            || (s.getEmail() != null && s.getEmail().toLowerCase().contains(q)))
                    .limit(50)
                    .toList();
        } else {
            students = studentRepository.findAll().stream().limit(50).toList();
        }

        List<Map<String, Object>> result = students.stream().map(s -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", s.getId());
            map.put("registrationNumber", s.getRegistrationNumber());
            map.put("fullName", s.getFullName());
            map.put("email", s.getEmail());
            map.put("programme", s.getProgramme());
            map.put("college", s.getCollege());
            map.put("department", s.getDepartment());
            map.put("clearanceStatus", s.getClearanceStatus());
            map.put("certificateVerified", Boolean.TRUE.equals(s.getCertificateVerified()));
            map.put("certificateVerifiedAt", s.getCertificateVerifiedAt() != null ? s.getCertificateVerifiedAt().toString() : null);
            map.put("digitalSignatureHash", s.getDigitalSignatureHash());
            map.put("signedBy", s.getSignedBy());
            map.put("signedAt", s.getSignedAt() != null ? s.getSignedAt().toString() : null);
            map.put("dispatchStatus", s.getDispatchStatus() != null ? s.getDispatchStatus() : "Pending Dispatch");
            map.put("dispatchedAt", s.getDispatchedAt() != null ? s.getDispatchedAt().toString() : null);
            return map;
        }).toList();

        return ResponseEntity.ok(result);
    }

    @PostMapping("/verify-certificate")
    @PreAuthorize("hasAnyRole('DUS_SECRETARY', 'DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'ADMINISTRATOR', 'SUPERUSER')")
    public ResponseEntity<Map<String, Object>> verifyCertificate(@RequestBody Map<String, Object> body) {
        String studentId = (String) body.get("studentId");
        Boolean verified = (Boolean) body.get("verified");
        String signatureHash = (String) body.get("digitalSignatureHash");
        String signedBy = (String) body.get("signedBy");

        if (studentId == null || studentId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student ID or Registration Number is required.");
        }

        Student student = studentRepository.findByRegistrationNumber(studentId.trim())
                .or(() -> studentRepository.findById(studentId.trim()))
                .or(() -> studentRepository.findByUserId(studentId.trim()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student record not found for ID: " + studentId));

        student.setCertificateVerified(Boolean.TRUE.equals(verified));
        student.setCertificateVerifiedAt(Boolean.TRUE.equals(verified) ? LocalDateTime.now() : null);

        if (signatureHash != null && !signatureHash.isBlank()) {
            student.setDigitalSignatureHash(signatureHash);
            student.setSignedBy(signedBy != null ? signedBy : "DUS Directorate Secretary");
            student.setSignedAt(LocalDateTime.now());
        } else if (Boolean.TRUE.equals(verified) && (student.getDigitalSignatureHash() == null || student.getDigitalSignatureHash().isBlank())) {
            student.setDigitalSignatureHash("UDSM-DUS-SIG-" + (100000000L + (long)(Math.random() * 900000000L)));
            student.setSignedBy(signedBy != null ? signedBy : "DUS Directorate Secretary");
            student.setSignedAt(LocalDateTime.now());
        }

        studentRepository.save(student);
        log.info("DUS Secretary: Certificate verification saved to PostgreSQL for student {} -> verified: {}", student.getRegistrationNumber(), verified);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("studentId", student.getId());
        response.put("registrationNumber", student.getRegistrationNumber());
        response.put("certificateVerified", student.getCertificateVerified());
        response.put("digitalSignatureHash", student.getDigitalSignatureHash());
        response.put("signedBy", student.getSignedBy());
        response.put("message", "Database successfully updated for student " + student.getRegistrationNumber());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/update-dispatch")
    @PreAuthorize("hasAnyRole('DUS_SECRETARY', 'DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'ADMINISTRATOR', 'SUPERUSER')")
    public ResponseEntity<Map<String, Object>> updateDispatchState(@RequestBody Map<String, Object> body) {
        String studentId = (String) body.get("studentId");
        String dispatchStatus = (String) body.get("dispatchStatus");

        if (studentId == null || studentId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student ID is required.");
        }

        Student student = studentRepository.findByRegistrationNumber(studentId.trim())
                .or(() -> studentRepository.findById(studentId.trim()))
                .or(() -> studentRepository.findByUserId(studentId.trim()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student record not found for ID: " + studentId));

        student.setDispatchStatus(dispatchStatus != null ? dispatchStatus : "Pending Dispatch");
        if ("Dispatched".equalsIgnoreCase(dispatchStatus) || "Collected".equalsIgnoreCase(dispatchStatus)) {
            student.setDispatchedAt(LocalDateTime.now());
        }

        studentRepository.save(student);
        log.info("DUS Secretary: Dispatch status saved to PostgreSQL for student {} -> {}", student.getRegistrationNumber(), dispatchStatus);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("registrationNumber", student.getRegistrationNumber());
        response.put("dispatchStatus", student.getDispatchStatus());
        response.put("message", "Dispatch status saved to database.");

        return ResponseEntity.ok(response);
    }

    @PostMapping("/notify-release")
    @PreAuthorize("hasAnyRole('DUS_SECRETARY', 'DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'ADMINISTRATOR', 'SUPERUSER')")
    public ResponseEntity<Map<String, Object>> notifyCertificateRelease(@RequestBody CertificateReleaseNotificationRequest request) {
        if (request.getStudentId() == null || request.getStudentId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student registration number or ID is required.");
        }

        String search = request.getStudentId().trim();
        Student student = studentRepository.findByRegistrationNumber(search)
                .or(() -> studentRepository.findById(search))
                .or(() -> studentRepository.findByUserId(search))
                .or(() -> studentRepository.findByEmail(search.toLowerCase()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student record not found for: " + search));

        User targetUser = student.getUser();
        if (targetUser == null && student.getEmail() != null) {
            targetUser = userRepository.findByEmail(student.getEmail().toLowerCase()).orElse(null);
        }

        String releaseType = request.getReleaseType() != null ? request.getReleaseType() : "Academic Transcript & Degree Certificate";
        String instructions = request.getInstructions() != null && !request.getInstructions().isBlank()
                ? request.getInstructions()
                : "Please visit the Directorate of Undergraduate Studies (DUS) Secretary Office with your original Student ID / National ID.";

        String title = "🎓 Certificate & Transcript Ready for Release (" + releaseType + ")";
        StringBuilder msg = new StringBuilder();
        msg.append("Dear ").append(student.getFullName()).append(",\n\n");
        msg.append("Your ").append(releaseType).append(" has been processed and is ready for release.\n\n");
        msg.append("Release Date: ").append(request.getReleaseDate() != null ? request.getReleaseDate() : "Immediate").append("\n");
        msg.append("Instructions: ").append(instructions).append("\n");
        if (request.getTrackingNumber() != null && !request.getTrackingNumber().isBlank()) {
            msg.append("DHL Tracking Code: ").append(request.getTrackingNumber()).append("\n");
        }
        if (request.getCustomNote() != null && !request.getCustomNote().isBlank()) {
            msg.append("Note: ").append(request.getCustomNote()).append("\n");
        }

        if (targetUser != null) {
            notificationService.sendNotification(targetUser, title, msg.toString(), NotificationType.SYSTEM);
        }

        // Attempt Email Dispatch
        boolean emailSent = false;
        if (student.getEmail() != null && !student.getEmail().isBlank()) {
            try {
                emailService.sendClearanceUpdateEmail(student, "CERTIFICATE_RELEASE", "DUS Secretary Office", msg.toString());
                emailSent = true;
            } catch (Exception e) {
                log.error("❌ Failed to dispatch certificate release email: {}", e.getMessage());
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("studentName", student.getFullName());
        response.put("registrationNumber", student.getRegistrationNumber());
        response.put("message", "Certificate release notification successfully dispatched.");
        response.put("emailSent", emailSent);
        response.put("timestamp", LocalDateTime.now().toString());

        return ResponseEntity.ok(response);
    }

    @Data
    public static class CertificateReleaseNotificationRequest {
        private String studentId;
        private String releaseType; // 'Academic Transcript', 'Degree Certificate', 'Both'
        private String releaseDate;
        private String instructions;
        private String trackingNumber;
        private String customNote;
    }
}
