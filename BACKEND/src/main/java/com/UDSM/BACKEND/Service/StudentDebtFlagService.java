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
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
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

        String studentName = student != null ? student.getFullName()
                : studentAccount != null ? studentAccount.getFullName()
                : "Pre-registered Student (" + normalizedRegistrationNumber + ")";
        String college = student != null ? student.getCollege()
                : studentAccount != null ? studentAccount.getCollege()
                : lecturer.getCollege() != null ? lecturer.getCollege() : "College of Information and Communication Technologies (CoICT)";
        String department = student != null ? student.getDepartment()
                : studentAccount != null ? studentAccount.getDepartment()
                : lecturer.getDepartment() != null ? lecturer.getDepartment() : "Department of Computer Science & Engineering";

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
        return new StudentClearanceLookupResponse(normalizedRegistrationNumber,
                studentName,
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
        User user = requireStaffOrAdminRole(username);
        if (user.getRole() == ERole.DEPARTMENT_OFFICER) {
            String deptCol = user.getCollege();
            String deptName = user.getDepartment();
            return inProject(debtRepository.findAll(), user)
                    .stream()
                    .filter(flag -> "OPEN".equals(flag.getStatus()))
                    .filter(flag -> (deptCol == null || deptCol.isBlank() || matchesScope(flag.getCollege(), deptCol))
                            && (deptName == null || deptName.isBlank() || matchesScope(flag.getDepartment(), deptName)))
                    .toList();
        }
        return inProject(debtRepository.findAll(), user)
                .stream()
                .filter(flag -> "OPEN".equals(flag.getStatus()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StudentDebtFlag> listForStudent(String username) {
        User student = userRepository.findByEmail(username)
                .or(() -> userRepository.findByUsername(username))
                .orElse(null);
        if (student == null || student.getRegistrationNumber() == null) {
            return List.of();
        }
        String regNo = student.getRegistrationNumber().trim().toLowerCase();
        return debtRepository.findAll().stream()
                .filter(flag -> "OPEN".equals(flag.getStatus()))
                .filter(flag -> flag.getRegistrationNumber() != null && regNo.equalsIgnoreCase(flag.getRegistrationNumber().trim()))
                .toList();
    }

    @Transactional
    public StudentDebtFlag create(String username, CreateStudentDebtFlagRequest request) {
        User lecturer = requireRole(username, ERole.LECTURER);
        String registrationNumber = request.registrationNumber().trim();
        User studentAccount = userRepository.findByRegistrationNumberIgnoreCase(registrationNumber).orElse(null);
        Student studentProfile = studentRepository.findByRegistrationNumberIgnoreCase(registrationNumber).orElse(null);

        if (studentAccount != null && studentAccount.getRole() != ERole.STUDENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The registration number does not belong to a student account.");
        }

        String studentCollege = studentAccount != null ? studentAccount.getCollege()
                : studentProfile != null ? studentProfile.getCollege()
                : lecturer.getCollege() != null ? lecturer.getCollege() : "College of Information and Communication Technologies (CoICT)";

        String studentDepartment = studentAccount != null ? studentAccount.getDepartment()
                : studentProfile != null ? studentProfile.getDepartment()
                : lecturer.getDepartment() != null ? lecturer.getDepartment() : "Department of Computer Science & Engineering";

        String studentName = request.studentName() != null && !request.studentName().isBlank() ? request.studentName().trim()
                : studentAccount != null ? studentAccount.getFullName()
                : studentProfile != null ? studentProfile.getFullName()
                : "Pre-registered Student (" + registrationNumber + ")";

        String studentId = studentAccount != null ? studentAccount.getId()
                : studentProfile != null ? studentProfile.getId()
                : "prereg-" + registrationNumber.toLowerCase();

        String programme = studentAccount != null ? studentAccount.getProgramme()
                : studentProfile != null ? studentProfile.getProgramme() : "External / Pre-registered";

        if (studentAccount != null && !sameProject(lecturer.getProjectId(), studentAccount.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "This student is outside your registered project.");
        }
        if (studentProfile != null && !sameProject(lecturer.getProjectId(), studentProfile.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "This student is outside your registered project.");
        }

        StudentDebtFlag flag = debtRepository.save(StudentDebtFlag.builder()
                .studentId(studentId)
                .registrationNumber(registrationNumber)
                .studentName(studentName)
                .college(studentCollege)
                .department(studentDepartment)
                .programme(programme)
                .amount(request.amount())
                .category(request.category() != null && !request.category().isBlank() ? request.category().trim() : "Equipment / Item Rental")
                .dueDate(request.dueDate() != null && !request.dueDate().isBlank() ? java.time.LocalDate.parse(request.dueDate().trim()) : null)
                .reason(request.reason().trim())
                .negotiationNotes(trimToNull(request.negotiationNotes()))
                .status("OPEN")
                .lecturerId(lecturer.getId())
                .lecturerName(lecturer.getFullName())
                .lecturerEmail(lecturer.getEmail())
                .lecturerPhone(lecturer.getPhoneNumber())
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

    @Transactional
    public int bulkUpload(String username, MultipartFile file) {
        String filename = file.getOriginalFilename();
        if (filename == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file");

        try {
            if (filename.endsWith(".csv")) {
                return processBulkCsv(username, file);
            } else if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
                return processBulkExcel(username, file);
            } else {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported file format. Please upload CSV or Excel.");
            }
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (Exception e) {
            log.error("Failed to process bulk student debt flags: ", e);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bulk flag upload failed: " + e.getMessage());
        }
    }

    private int processBulkCsv(String username, MultipartFile file) throws Exception {
        int count = 0;
        try (BufferedReader br = new BufferedReader(new InputStreamReader(file.getInputStream(), java.nio.charset.StandardCharsets.UTF_8))) {
            String headerLine = br.readLine();
            if (headerLine == null) return 0;

            String[] headers = parseCsvLine(headerLine);
            Map<String, Integer> headerMap = mapFlagHeaders(headers);

            String line;
            while ((line = br.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                String[] data = parseCsvLine(line);
                if (data.length == 0) continue;

                String regNo = getVal(data, headerMap.get("reg"));
                if (regNo.isEmpty()) continue;

                String name = getVal(data, headerMap.get("name"));
                String cat = getVal(data, headerMap.get("category"));
                if (cat.isEmpty()) cat = "Equipment / Item Rental";

                String amountStr = getVal(data, headerMap.get("amount")).replaceAll("[^0-9.]", "");
                BigDecimal amount = BigDecimal.valueOf(10000.00);
                if (!amountStr.isEmpty()) {
                    try {
                        BigDecimal parsed = new BigDecimal(amountStr);
                        if (parsed.compareTo(BigDecimal.ZERO) > 0) {
                            amount = parsed;
                        }
                    } catch (Exception ignored) {}
                }

                String reason = getVal(data, headerMap.get("reason"));
                if (reason.isEmpty()) reason = "Outstanding liability / rented course item";

                String dueDate = getVal(data, headerMap.get("dueDate"));
                String notes = getVal(data, headerMap.get("notes"));

                try {
                    create(username, new CreateStudentDebtFlagRequest(
                            regNo,
                            name.isEmpty() ? null : name,
                            reason,
                            amount,
                            notes.isEmpty() ? null : notes,
                            cat,
                            dueDate.isEmpty() ? null : dueDate
                    ));
                    count++;
                } catch (Exception e) {
                    log.warn("Failed to create flag for student {}: {}", regNo, e.getMessage());
                }
            }
        }
        return count;
    }

    private int processBulkExcel(String username, MultipartFile file) throws Exception {
        int count = 0;
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            if (!rows.hasNext()) return 0;
            Row headerRow = rows.next();
            List<String> headerList = new ArrayList<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                headerList.add(getCellValue(headerRow.getCell(i)));
            }
            Map<String, Integer> headerMap = mapFlagHeaders(headerList.toArray(new String[0]));

            while (rows.hasNext()) {
                Row row = rows.next();
                if (row == null) continue;

                int lastCellNum = row.getLastCellNum();
                if (lastCellNum <= 0) continue;

                List<String> rowList = new ArrayList<>();
                for (int i = 0; i < Math.min(lastCellNum, 20); i++) {
                    rowList.add(getCellValue(row.getCell(i)));
                }
                String[] data = rowList.toArray(new String[0]);

                String regNo = getVal(data, headerMap.get("reg"));
                if (regNo.isEmpty()) continue;

                String name = getVal(data, headerMap.get("name"));
                String cat = getVal(data, headerMap.get("category"));
                if (cat.isEmpty()) cat = "Equipment / Item Rental";

                String amountStr = getVal(data, headerMap.get("amount")).replaceAll("[^0-9.]", "");
                BigDecimal amount = BigDecimal.valueOf(10000.00);
                if (!amountStr.isEmpty()) {
                    try {
                        BigDecimal parsed = new BigDecimal(amountStr);
                        if (parsed.compareTo(BigDecimal.ZERO) > 0) {
                            amount = parsed;
                        }
                    } catch (Exception ignored) {}
                }

                String reason = getVal(data, headerMap.get("reason"));
                if (reason.isEmpty()) reason = "Outstanding liability / rented course item";

                String dueDate = getVal(data, headerMap.get("dueDate"));
                String notes = getVal(data, headerMap.get("notes"));

                try {
                    create(username, new CreateStudentDebtFlagRequest(
                            regNo,
                            name.isEmpty() ? null : name,
                            reason,
                            amount,
                            notes.isEmpty() ? null : notes,
                            cat,
                            dueDate.isEmpty() ? null : dueDate
                    ));
                    count++;
                } catch (Exception e) {
                    log.warn("Failed to create flag for student {}: {}", regNo, e.getMessage());
                }
            }
        }
        return count;
    }

    private String getVal(String[] data, Integer idx) {
        if (idx == null || idx < 0 || idx >= data.length || data[idx] == null) return "";
        return data[idx].trim();
    }

    private String getCellValue(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield cell.getLocalDateTimeCellValue().toLocalDate().toString();
                }
                double d = cell.getNumericCellValue();
                if (d == (long) d) {
                    yield String.valueOf((long) d);
                } else {
                    yield String.valueOf(d);
                }
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield cell.getStringCellValue().trim();
                } catch (Exception e) {
                    try {
                        yield String.valueOf(cell.getNumericCellValue());
                    } catch (Exception ex) {
                        yield "";
                    }
                }
            }
            default -> "";
        };
    }

    private String[] parseCsvLine(String line) {
        List<String> tokens = new ArrayList<>();
        StringBuilder sb = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                tokens.add(sb.toString().trim());
                sb.setLength(0);
            } else {
                sb.append(c);
            }
        }
        tokens.add(sb.toString().trim());
        return tokens.toArray(new String[0]);
    }

    private Map<String, Integer> mapFlagHeaders(String[] headers) {
        Map<String, Integer> map = new HashMap<>();
        for (int i = 0; i < headers.length; i++) {
            if (headers[i] == null) continue;
            String h = headers[i].toLowerCase().replaceAll("[^a-z0-9]", "");
            if (h.contains("reg") || h.contains("matric") || h.contains("studentnumber") || h.equals("id") || h.contains("studentid")) {
                map.putIfAbsent("reg", i);
            } else if (h.contains("name") || h.contains("student")) {
                map.putIfAbsent("name", i);
            } else if (h.contains("cat") || h.contains("item") || h.contains("type")) {
                map.putIfAbsent("category", i);
            } else if (h.contains("amount") || h.contains("value") || h.contains("debt") || h.contains("cost") || h.contains("tzs") || h.contains("fee")) {
                map.putIfAbsent("amount", i);
            } else if (h.contains("reason") || h.contains("desc") || h.contains("liability") || h.contains("issue") || h.contains("remark")) {
                map.putIfAbsent("reason", i);
            } else if (h.contains("due") || h.contains("date") || h.contains("target")) {
                map.putIfAbsent("dueDate", i);
            } else if (h.contains("note") || h.contains("negotiat") || h.contains("comment")) {
                map.putIfAbsent("notes", i);
            }
        }
        if (!map.containsKey("reg") && headers.length > 0) map.put("reg", 0);
        if (!map.containsKey("name") && headers.length > 1) map.put("name", 1);
        if (!map.containsKey("category") && headers.length > 2) map.put("category", 2);
        if (!map.containsKey("amount") && headers.length > 3) map.put("amount", 3);
        if (!map.containsKey("reason") && headers.length > 4) map.put("reason", 4);
        if (!map.containsKey("dueDate") && headers.length > 5) map.put("dueDate", 5);
        if (!map.containsKey("notes") && headers.length > 6) map.put("notes", 6);
        return map;
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

    private User requireStaffOrAdminRole(String username) {
        User user = userRepository.findByEmail(username)
                .or(() -> userRepository.findByUsername(username))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User account not found."));
        if (user.getRole() == ERole.STUDENT) {
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
        String clean1 = cleanPrefixes(studentScope);
        String clean2 = cleanPrefixes(userScope);
        if (clean1.equals(clean2) || clean1.contains(clean2) || clean2.contains(clean1)) {
            return true;
        }
        String a1 = extractAcronym(studentScope);
        String a2 = extractAcronym(userScope);
        if (!a1.isEmpty() && (a1.equals(clean2) || clean2.contains(a1))) {
            return true;
        }
        if (!a2.isEmpty() && (a2.equals(clean1) || clean1.contains(a2))) {
            return true;
        }
        return !a1.isEmpty() && !a2.isEmpty() && a1.equals(a2);
    }

    private String cleanPrefixes(String s) {
        return s.trim().toLowerCase()
                .replaceAll("^(department|dept|college)\\s*(of)?\\s*", "")
                .trim();
    }

    private String extractAcronym(String s) {
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("\\(([^)]+)\\)").matcher(s);
        if (matcher.find()) {
            return matcher.group(1).trim().toLowerCase();
        }
        String[] words = s.replaceAll("[^a-zA-Z0-9\\s]", " ").trim().toLowerCase().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (w.length() > 2 && !w.equals("and") && !w.equals("for") && !w.equals("the") && !w.equals("dept") && !w.equals("department") && !w.equals("college")) {
                sb.append(w.charAt(0));
            }
        }
        return sb.length() > 1 ? sb.toString() : "";
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
