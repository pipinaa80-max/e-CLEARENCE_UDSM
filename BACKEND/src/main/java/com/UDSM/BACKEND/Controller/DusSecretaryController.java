package com.UDSM.BACKEND.Controller;

import com.UDSM.BACKEND.Model.NotificationType;
import com.UDSM.BACKEND.Model.Student;
import com.UDSM.BACKEND.Model.User;
import com.UDSM.BACKEND.Repository.StudentRepository;
import com.UDSM.BACKEND.Repository.UserRepository;
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

    // =========================================================================
    // MAIN CAMPUS DUS SECRETARY ENDPOINTS
    // =========================================================================

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

        List<Map<String, Object>> result = students.stream().map(this::mapStudentToConsignmentResponse).toList();
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

        Student student = findStudentByIdentifier(studentId);

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
        log.info("DUS Secretary: Certificate verification saved for student {} -> verified: {}", student.getRegistrationNumber(), verified);

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
        String stationCode = (String) body.get("stationCode");
        String stationName = (String) body.get("stationName");

        if (studentId == null || studentId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student ID is required.");
        }

        Student student = findStudentByIdentifier(studentId);

        student.setDispatchStatus(dispatchStatus != null ? dispatchStatus : "Pending Dispatch");
        if ("Dispatched".equalsIgnoreCase(dispatchStatus) || "Collected".equalsIgnoreCase(dispatchStatus)) {
            student.setDispatchedAt(LocalDateTime.now());
        }
        if (stationCode != null && !stationCode.isBlank()) {
            student.setStationCode(stationCode);
        }
        if (stationName != null && !stationName.isBlank()) {
            student.setStationName(stationName);
        }

        studentRepository.save(student);
        log.info("DUS Secretary: Dispatch status saved for student {} -> {}", student.getRegistrationNumber(), dispatchStatus);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("registrationNumber", student.getRegistrationNumber());
        response.put("dispatchStatus", student.getDispatchStatus());
        response.put("stationCode", student.getStationCode());
        response.put("stationName", student.getStationName());
        response.put("message", "Dispatch status saved to database.");

        return ResponseEntity.ok(response);
    }

    @PostMapping("/notify-release")
    @PreAuthorize("hasAnyRole('DUS_SECRETARY', 'DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'ADMINISTRATOR', 'SUPERUSER')")
    public ResponseEntity<Map<String, Object>> notifyCertificateRelease(@RequestBody CertificateReleaseNotificationRequest request) {
        if (request.getStudentId() == null || request.getStudentId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student registration number or ID is required.");
        }

        Student student = findStudentByIdentifier(request.getStudentId());

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

    // =========================================================================
    // SPECIFIC STATION RECEIVING DUS SECRETARY ENDPOINTS
    // =========================================================================

    /**
     * Get consignments arriving from Main Campus DUS to a specific regional/campus station
     */
    @GetMapping("/station/consignments")
    @PreAuthorize("hasAnyRole('DUS_SECRETARY', 'DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'ADMINISTRATOR', 'SUPERUSER')")
    public ResponseEntity<List<Map<String, Object>>> getStationConsignments(
            @RequestParam(value = "stationCode", required = false) String stationCode,
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "status", required = false) String status) {

        List<Student> students = studentRepository.findAll().stream()
                .filter(s -> {
                    // Filter by station code if specified
                    if (stationCode != null && !stationCode.isBlank() && !"ALL".equalsIgnoreCase(stationCode)) {
                        boolean matchStation = stationCode.equalsIgnoreCase(s.getStationCode())
                                || (s.getCollege() != null && s.getCollege().toLowerCase().contains(stationCode.toLowerCase()));
                        if (!matchStation) return false;
                    }
                    // Filter by status if specified
                    if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                        if ("IN_TRANSIT".equalsIgnoreCase(status) && (!"Dispatched".equalsIgnoreCase(s.getDispatchStatus()) || "Received at Station".equalsIgnoreCase(s.getIntakeStatus()) || "Collected by Student".equalsIgnoreCase(s.getIntakeStatus()))) {
                            return false;
                        }
                        if ("IN_VAULT".equalsIgnoreCase(status) && !"Received at Station".equalsIgnoreCase(s.getIntakeStatus())) {
                            return false;
                        }
                        if ("COLLECTED".equalsIgnoreCase(status) && !"Collected".equalsIgnoreCase(s.getDispatchStatus()) && !"Collected by Student".equalsIgnoreCase(s.getIntakeStatus())) {
                            return false;
                        }
                    }
                    // Search query
                    if (query != null && !query.isBlank()) {
                        String q = query.trim().toLowerCase();
                        boolean match = (s.getRegistrationNumber() != null && s.getRegistrationNumber().toLowerCase().contains(q))
                                || (s.getFullName() != null && s.getFullName().toLowerCase().contains(q))
                                || (s.getEmail() != null && s.getEmail().toLowerCase().contains(q))
                                || (s.getStationName() != null && s.getStationName().toLowerCase().contains(q))
                                || (s.getVaultLockerNumber() != null && s.getVaultLockerNumber().toLowerCase().contains(q))
                                || (s.getDigitalSignatureHash() != null && s.getDigitalSignatureHash().toLowerCase().contains(q));
                        if (!match) return false;
                    }
                    return true;
                })
                .limit(100)
                .toList();

        List<Map<String, Object>> result = students.stream().map(this::mapStudentToConsignmentResponse).toList();
        return ResponseEntity.ok(result);
    }

    /**
     * Station Secretary acknowledges physical package receipt into station vault/custody
     */
    @PostMapping("/station/intake")
    @PreAuthorize("hasAnyRole('DUS_SECRETARY', 'DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'ADMINISTRATOR', 'SUPERUSER')")
    public ResponseEntity<Map<String, Object>> receiveStationIntake(@RequestBody Map<String, Object> body) {
        String studentId = (String) body.get("studentId");
        String stationCode = (String) body.get("stationCode");
        String stationName = (String) body.get("stationName");
        String vaultLocker = (String) body.get("vaultLockerNumber");
        String receivedBy = (String) body.get("receivedBy");
        String packageCondition = (String) body.get("packageCondition");

        if (studentId == null || studentId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student registration number or ID is required.");
        }

        Student student = findStudentByIdentifier(studentId);

        student.setIntakeStatus("Received at Station");
        if (stationCode != null && !stationCode.isBlank()) student.setStationCode(stationCode);
        if (stationName != null && !stationName.isBlank()) student.setStationName(stationName);
        student.setVaultLockerNumber(vaultLocker != null && !vaultLocker.isBlank() ? vaultLocker : "VAULT-" + (int)(Math.random() * 900 + 100));
        student.setStationReceivedBy(receivedBy != null && !receivedBy.isBlank() ? receivedBy : "Station Intake Secretary");
        student.setStationReceivedAt(LocalDateTime.now());

        studentRepository.save(student);
        log.info("Station Secretary Intake: Certificate logged into station vault for {} at {}", student.getRegistrationNumber(), student.getStationName());

        // Notify student of arrival at pickup station
        User targetUser = student.getUser();
        if (targetUser == null && student.getEmail() != null) {
            targetUser = userRepository.findByEmail(student.getEmail().toLowerCase()).orElse(null);
        }
        String arrivalTitle = "📦 Certificate Arrived at Collection Station: " + (student.getStationName() != null ? student.getStationName() : "Local Hub");
        String arrivalMsg = "Dear " + student.getFullName() + ",\n\n"
                + "Your Certificate & Transcript consignment from UDSM Main Campus has safely arrived at your collection station: "
                + (student.getStationName() != null ? student.getStationName() : "Campus Collection Desk") + ".\n"
                + "Vault / Shelf Bin: " + student.getVaultLockerNumber() + "\n"
                + "Package Condition: " + (packageCondition != null ? packageCondition : "Intact & Sealed") + "\n\n"
                + "You may now present your valid Student ID or National NIDA ID at the station counter for verification and collection.";

        if (targetUser != null) {
            notificationService.sendNotification(targetUser, arrivalTitle, arrivalMsg, NotificationType.SYSTEM);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("registrationNumber", student.getRegistrationNumber());
        response.put("intakeStatus", student.getIntakeStatus());
        response.put("vaultLockerNumber", student.getVaultLockerNumber());
        response.put("stationReceivedAt", student.getStationReceivedAt().toString());
        response.put("message", "Consignment acknowledged and placed in station vault.");

        return ResponseEntity.ok(response);
    }

    /**
     * Bulk intake all incoming dispatched consignments arriving in a batch
     */
    @PostMapping("/station/bulk-intake")
    @PreAuthorize("hasAnyRole('DUS_SECRETARY', 'DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'ADMINISTRATOR', 'SUPERUSER')")
    public ResponseEntity<Map<String, Object>> bulkStationIntake(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<String> studentIds = (List<String>) body.get("studentIds");
        String stationCode = (String) body.get("stationCode");
        String stationName = (String) body.get("stationName");
        String receivedBy = (String) body.get("receivedBy");

        if (studentIds == null || studentIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student IDs list cannot be empty for bulk intake.");
        }

        int count = 0;
        for (String id : studentIds) {
            try {
                Student student = findStudentByIdentifier(id);
                student.setIntakeStatus("Received at Station");
                if (stationCode != null && !stationCode.isBlank()) student.setStationCode(stationCode);
                if (stationName != null && !stationName.isBlank()) student.setStationName(stationName);
                if (student.getVaultLockerNumber() == null || student.getVaultLockerNumber().isBlank()) {
                    student.setVaultLockerNumber("VAULT-BIN-" + (100 + (count % 50)));
                }
                student.setStationReceivedBy(receivedBy != null ? receivedBy : "Station Intake Secretary");
                student.setStationReceivedAt(LocalDateTime.now());
                studentRepository.save(student);
                count++;
            } catch (Exception e) {
                log.warn("Bulk intake error for ID {}: {}", id, e.getMessage());
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("processedCount", count);
        response.put("message", "Bulk intake successfully processed " + count + " consignments into station vault.");

        return ResponseEntity.ok(response);
    }

    /**
     * Station Secretary approves student certificate/transcript handover
     */
    @PostMapping("/station/approve-handover")
    @PreAuthorize("hasAnyRole('DUS_SECRETARY', 'DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'ADMINISTRATOR', 'SUPERUSER')")
    public ResponseEntity<Map<String, Object>> approveStationHandover(@RequestBody Map<String, Object> body) {
        String studentId = (String) body.get("studentId");
        String collectorType = (String) body.get("collectorType"); // "Student in Person" or "Authorized Legal Representative"
        String collectorName = (String) body.get("collectorName");
        String collectorIdNumber = (String) body.get("collectorIdNumber");
        String collectorPhone = (String) body.get("collectorPhone");
        String secretaryName = (String) body.get("secretaryName");
        String handoverNotes = (String) body.get("handoverNotes");

        if (studentId == null || studentId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student ID or Registration Number is required.");
        }

        Student student = findStudentByIdentifier(studentId);

        String releaseToken = "UDSM-RCV-PASS-" + (100000000L + (long)(Math.random() * 900000000L));

        student.setDispatchStatus("Collected");
        student.setIntakeStatus("Collected by Student");
        student.setHandoverApprovedAt(LocalDateTime.now());
        student.setHandoverSecretary(secretaryName != null ? secretaryName : "Station DUS Secretary");
        student.setHandoverCollectorType(collectorType != null ? collectorType : "Student in Person");
        student.setHandoverCollectorName(collectorName != null ? collectorName : student.getFullName());
        student.setHandoverCollectorId(collectorIdNumber != null ? collectorIdNumber : student.getRegistrationNumber());
        student.setHandoverCollectorPhone(collectorPhone != null ? collectorPhone : student.getPhoneNumber());
        student.setHandoverReceiptToken(releaseToken);

        studentRepository.save(student);
        log.info("Station Secretary Handover Approved: Student {} collected certificate via token {}", student.getRegistrationNumber(), releaseToken);

        // Notify student of physical handover confirmation
        User targetUser = student.getUser();
        if (targetUser == null && student.getEmail() != null) {
            targetUser = userRepository.findByEmail(student.getEmail().toLowerCase()).orElse(null);
        }

        String confirmTitle = "📜 Certificate Handover Confirmation - " + student.getRegistrationNumber();
        String confirmMsg = "Dear " + student.getFullName() + ",\n\n"
                + "This confirms that your official University of Dar es Salaam Degree Certificate and Academic Transcript have been handed over.\n\n"
                + "Collection Station: " + (student.getStationName() != null ? student.getStationName() : "UDSM Campus Center") + "\n"
                + "Collector Name: " + student.getHandoverCollectorName() + " (" + student.getHandoverCollectorType() + ")\n"
                + "Collector ID: " + student.getHandoverCollectorId() + "\n"
                + "Handover Official: " + student.getHandoverSecretary() + "\n"
                + "Official Clearance Pass Token: " + releaseToken + "\n"
                + "Timestamp: " + student.getHandoverApprovedAt().toString() + "\n\n"
                + "Thank you for completing your clearance with the University of Dar es Salaam.";

        if (targetUser != null) {
            notificationService.sendNotification(targetUser, confirmTitle, confirmMsg, NotificationType.SYSTEM);
        }

        if (student.getEmail() != null && !student.getEmail().isBlank()) {
            try {
                emailService.sendClearanceUpdateEmail(student, "CERTIFICATE_COLLECTION_COMPLETE", "Station DUS Secretary Office", confirmMsg);
            } catch (Exception e) {
                log.warn("Failed to dispatch email confirmation for handover: {}", e.getMessage());
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("registrationNumber", student.getRegistrationNumber());
        response.put("studentName", student.getFullName());
        response.put("handoverReceiptToken", releaseToken);
        response.put("handoverApprovedAt", student.getHandoverApprovedAt().toString());
        response.put("message", "Certificate & transcript handover officially approved and recorded.");

        return ResponseEntity.ok(response);
    }

    /**
     * Report transit discrepancy or damaged parcel back to Main Campus DUS Secretary
     */
    @PostMapping("/station/report-discrepancy")
    @PreAuthorize("hasAnyRole('DUS_SECRETARY', 'DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'ADMINISTRATOR', 'SUPERUSER')")
    public ResponseEntity<Map<String, Object>> reportStationDiscrepancy(@RequestBody Map<String, Object> body) {
        String studentId = (String) body.get("studentId");
        String issueType = (String) body.get("issueType");
        String description = (String) body.get("description");
        String reportedBy = (String) body.get("reportedBy");

        if (studentId == null || studentId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student ID is required.");
        }

        Student student = findStudentByIdentifier(studentId);
        String note = "[" + LocalDateTime.now() + "] Issue (" + issueType + "): " + description + " reported by " + reportedBy;
        student.setTransitIssueNotes(note);
        studentRepository.save(student);

        log.warn("Station Secretary Discrepancy reported for {}: {}", student.getRegistrationNumber(), note);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("registrationNumber", student.getRegistrationNumber());
        response.put("transitIssueNotes", note);
        response.put("message", "Transit issue noted and flagged for Main Campus DUS review.");

        return ResponseEntity.ok(response);
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private Student findStudentByIdentifier(String identifier) {
        String search = identifier.trim();
        return studentRepository.findByRegistrationNumber(search)
                .or(() -> studentRepository.findById(search))
                .or(() -> studentRepository.findByUserId(search))
                .or(() -> studentRepository.findByEmail(search.toLowerCase()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student record not found for: " + search));
    }

    private Map<String, Object> mapStudentToConsignmentResponse(Student s) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", s.getId());
        map.put("registrationNumber", s.getRegistrationNumber());
        map.put("fullName", s.getFullName());
        map.put("email", s.getEmail());
        map.put("phoneNumber", s.getPhoneNumber());
        map.put("programme", s.getProgramme());
        map.put("college", s.getCollege());
        map.put("department", s.getDepartment());
        map.put("graduationYear", s.getGraduationYear());
        map.put("clearanceStatus", s.getClearanceStatus() != null ? s.getClearanceStatus().name() : "PENDING");
        map.put("certificateVerified", Boolean.TRUE.equals(s.getCertificateVerified()));
        map.put("certificateVerifiedAt", s.getCertificateVerifiedAt() != null ? s.getCertificateVerifiedAt().toString() : null);
        map.put("digitalSignatureHash", s.getDigitalSignatureHash());
        map.put("signedBy", s.getSignedBy());
        map.put("signedAt", s.getSignedAt() != null ? s.getSignedAt().toString() : null);
        map.put("dispatchStatus", s.getDispatchStatus() != null ? s.getDispatchStatus() : "Pending Dispatch");
        map.put("dispatchedAt", s.getDispatchedAt() != null ? s.getDispatchedAt().toString() : null);

        // Station specific fields
        map.put("stationCode", s.getStationCode());
        map.put("stationName", s.getStationName());
        map.put("intakeStatus", s.getIntakeStatus() != null ? s.getIntakeStatus() : "Awaiting Intake");
        map.put("stationReceivedAt", s.getStationReceivedAt() != null ? s.getStationReceivedAt().toString() : null);
        map.put("stationReceivedBy", s.getStationReceivedBy());
        map.put("vaultLockerNumber", s.getVaultLockerNumber());
        map.put("handoverCollectorType", s.getHandoverCollectorType());
        map.put("handoverCollectorName", s.getHandoverCollectorName());
        map.put("handoverCollectorId", s.getHandoverCollectorId());
        map.put("handoverCollectorPhone", s.getHandoverCollectorPhone());
        map.put("handoverApprovedAt", s.getHandoverApprovedAt() != null ? s.getHandoverApprovedAt().toString() : null);
        map.put("handoverSecretary", s.getHandoverSecretary());
        map.put("handoverReceiptToken", s.getHandoverReceiptToken());
        map.put("transitIssueNotes", s.getTransitIssueNotes());

        return map;
    }

    @Data
    public static class CertificateReleaseNotificationRequest {
        private String studentId;
        private String releaseType;
        private String releaseDate;
        private String instructions;
        private String trackingNumber;
        private String customNote;
    }
}
