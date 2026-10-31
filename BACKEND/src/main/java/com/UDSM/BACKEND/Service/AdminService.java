package com.UDSM.BACKEND.Service;

import com.UDSM.BACKEND.Model.*;
import com.UDSM.BACKEND.Repository.ClearanceRequestRepository;
import com.UDSM.BACKEND.Repository.StudentRepository;
import com.UDSM.BACKEND.Repository.UserRepository;
import com.UDSM.BACKEND.Repository.ProjectLocalStorageRepository;
import com.UDSM.BACKEND.dto.RegisterRequest;
import com.UDSM.BACKEND.exception.ApiException;
import com.UDSM.BACKEND.exception.ResourceNotFoundException;
import com.UDSM.BACKEND.config.ProjectScope;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.util.LinkedHashMap;
import java.util.Map;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.Reader;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;
import java.util.stream.Collectors;

import com.UDSM.BACKEND.Repository.DepartmentApprovalRepository;
import com.UDSM.BACKEND.Repository.DocumentRepository;
import com.UDSM.BACKEND.Repository.NotificationRepository;
import com.UDSM.BACKEND.Repository.ConvocationReceiptRepository;
import com.UDSM.BACKEND.Repository.StudentDebtFlagRepository;

import static java.sql.JDBCType.NUMERIC;
import static javax.management.openmbean.SimpleType.STRING;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final ClearanceRequestRepository clearanceRequestRepository;
    private final DepartmentApprovalRepository departmentApprovalRepository;
    private final DocumentRepository documentRepository;
    private final NotificationRepository notificationRepository;
    private final ConvocationReceiptRepository convocationReceiptRepository;
    private final StudentDebtFlagRepository studentDebtFlagRepository;
    private final AuthService authService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ProjectLocalStorageRepository projectLocalStorageRepository;
    private final DataFormatter dataFormatter = new DataFormatter();

    public List<User> getAllUsers() {
        String projectId = ProjectScope.currentProjectId();
        log.info("Admin: Fetching users for project scope: {}", projectId);
        List<User> users = (projectId == null || projectId.trim().isEmpty()) 
                ? userRepository.findAll() 
                : userRepository.findByProjectIdIncludeGlobal(projectId);
        
        log.info("Admin: Query returned {} users", users.size());
        if (!users.isEmpty()) {
            log.debug("Admin: First user found: {}, project: {}", users.get(0).getEmail(), users.get(0).getProjectId());
        }
        return users;
    }

    public List<String> getAllRoles() {
        return Arrays.stream(ERole.values())
                .map(Enum::name)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        deleteUserEntity(user);
    }

    @Transactional
    public void deleteUsers(List<String> userIds) {
        if (userIds == null || userIds.isEmpty()) return;
        
        log.info("Admin: Bulk deleting {} users", userIds.size());
        for (String id : userIds) {
            userRepository.findById(id).ifPresent(this::deleteUserEntity);
        }
    }

    private void deleteUserEntity(User user) {
        String userId = user.getId();
        if (user.getRole() == ERole.SUPERUSER || "superuser@admin.local".equalsIgnoreCase(user.getEmail())) {
            throw new ApiException("Superuser account cannot be deleted", HttpStatus.FORBIDDEN);
        }
        String projectId = ProjectScope.currentProjectId();
        // Security check: Institutional admins can only delete their own project users or global users
        if (projectId != null && user.getProjectId() != null && !user.getProjectId().equals(projectId)) {
             throw new ApiException("You do not have permission to delete this user", HttpStatus.FORBIDDEN);
        }

        // 1. Delete notifications directly linked to this user
        try {
            notificationRepository.deleteByUser(user);
            notificationRepository.flush();
        } catch (Exception e) {
            log.warn("Could not delete notifications for user {}: {}", userId, e.getMessage());
        }

        // 2. Delete student records and all associated child entities
        studentRepository.findByUserId(userId)
                .or(() -> (user.getRegistrationNumber() != null && !user.getRegistrationNumber().isBlank())
                        ? studentRepository.findByRegistrationNumber(user.getRegistrationNumber())
                        : java.util.Optional.empty())
                .or(() -> (user.getEmail() != null && !user.getEmail().isBlank())
                        ? studentRepository.findByEmail(user.getEmail())
                        : java.util.Optional.empty())
                .ifPresent(student -> {
                    // a. Delete student notifications
                    try {
                        notificationRepository.deleteByStudent(student);
                        notificationRepository.flush();
                    } catch (Exception e) {
                        log.warn("Could not delete notifications for student {}: {}", student.getId(), e.getMessage());
                    }

                    // b. Delete clearance requests and their department approvals
                    List<ClearanceRequest> requests = clearanceRequestRepository.findByStudent(student);
                    if (!requests.isEmpty()) {
                        for (ClearanceRequest req : requests) {
                            departmentApprovalRepository.deleteByClearanceRequest(req);
                        }
                        departmentApprovalRepository.flush();
                        clearanceRequestRepository.deleteAll(requests);
                        clearanceRequestRepository.flush();
                    }

                    // c. Delete student documents
                    List<Document> docs = documentRepository.findDocumentsByStudentOrderByDateDesc(student);
                    if (!docs.isEmpty()) {
                        documentRepository.deleteAll(docs);
                        documentRepository.flush();
                    }

                    // d. Delete convocation receipts
                    try {
                        convocationReceiptRepository.deleteByStudentId(student.getId());
                        convocationReceiptRepository.flush();
                    } catch (Exception e) {
                        log.warn("Could not delete convocation receipts for student {}: {}", student.getId(), e.getMessage());
                    }

                    // e. Delete student debt flags
                    try {
                        studentDebtFlagRepository.deleteByStudentId(student.getId());
                        if (student.getRegistrationNumber() != null && !student.getRegistrationNumber().isBlank()) {
                            studentDebtFlagRepository.deleteByRegistrationNumber(student.getRegistrationNumber());
                        }
                        studentDebtFlagRepository.flush();
                    } catch (Exception e) {
                        log.warn("Could not delete student debt flags for student {}: {}", student.getId(), e.getMessage());
                    }

                    // f. Delete student
                    studentRepository.delete(student);
                    studentRepository.flush();
                    log.info("Admin: Deleted student record, {} clearance requests, and {} documents for user {}",
                            requests.size(), docs.size(), userId);
                });

        // 3. Delete user
        userRepository.delete(user);
        userRepository.flush();
        log.info("Admin: User {} ({}) successfully deleted", user.getEmail(), userId);
    }

    @Transactional
    public User updateUserRole(String userId, String roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        if (user.getRole() == ERole.SUPERUSER || "superuser@admin.local".equalsIgnoreCase(user.getEmail())) {
            throw new ApiException("Superuser role cannot be modified", HttpStatus.FORBIDDEN);
        }

        String projectId = ProjectScope.currentProjectId();
        if (projectId != null && user.getProjectId() != null && !user.getProjectId().equals(projectId)) {
            throw new ApiException("You do not have permission to modify this user", HttpStatus.FORBIDDEN);
        }
        
        ERole role;
        try {
            role = ERole.valueOf(roleName.toUpperCase().replace(" ", "_"));
        } catch (IllegalArgumentException e) {
            // Mapping for human-readable frontend strings to backend enums
            String normalized = roleName.toUpperCase().trim();
            switch(normalized) {
                case "FINANCE":
                case "FINANCE OFFICER":
                case "FINANCE_OFFICER":
                    role = ERole.FINANCE_OFFICER;
                    break;
                case "CONVOCATION":
                case "CONVOCATION OFFICER":
                case "CONVOCATION_OFFICER":
                    role = ERole.CONVOCATION_OFFICER;
                    break;
                case "LIBRARY":
                case "LIBRARY OFFICER":
                case "LIBRARY_OFFICER":
                    role = ERole.LIBRARY_OFFICER;
                    break;
                case "ICT":
                case "ICT OFFICER":
                case "ICT_OFFICER":
                    role = ERole.ICT_OFFICER;
                    break;
                case "DEPARTMENT":
                case "DEPARTMENT OFFICER":
                case "DEPARTMENT_OFFICER":
                    role = ERole.DEPARTMENT_OFFICER;
                    break;
                case "USAB":
                case "USAB OFFICER":
                case "USAB_OFFICER":
                    role = ERole.USAB_OFFICER;
                    break;
                case "DARUSO":
                case "DARUSO OFFICER":
                case "DARUSO_OFFICER":
                    role = ERole.DARUSO_OFFICER;
                    break;
                case "SMART CARD":
                case "SMART_CARD":
                case "SMART CARD OFFICER":
                case "SMART_CARD_OFFICER":
                    role = ERole.SMART_CARD_OFFICER;
                    break;
                case "WORKSHOP":
                case "WORKSHOP OFFICER":
                case "WORKSHOP_OFFICER":
                    role = ERole.WORKSHOP_OFFICER;
                    break;
                case "LABORATORY":
                case "LABORATORY OFFICER":
                case "LABORATORY_OFFICER":
                    role = ERole.LABORATORY_OFFICER;
                    break;
                case "DEAN OF STUDENTS":
                case "DEAN_OF_STUDENTS":
                    role = ERole.DEAN_OF_STUDENTS;
                    break;
                case "GAMES COACH":
                case "GAMES_COACH":
                    role = ERole.GAMES_COACH;
                    break;
                case "HALL WARDEN":
                case "HALL_WARDEN":
                    role = ERole.HALL_WARDEN;
                    break;
                case "LECTURER":
                    role = ERole.LECTURER;
                    break;
                case "DIRECTOR OF UNDERGRADUATE STUDIES":
                case "DIRECTOR OF UNDEGRADUATE STUDIES":
                case "DIRECTOR_OF_UNDERGRADUATE_STUDIES":
                case "DUS":
                    role = ERole.DIRECTOR_OF_UNDERGRADUATE_STUDIES;
                    break;
                case "PRINCIPAL":
                    role = ERole.PRINCIPAL;
                    break;
                case "ACADEMIC STAFF":
                case "ACADEMIC_STAFF":
                    role = ERole.ACADEMIC_STAFF;
                    break;
                case "ADMINISTRATOR": 
                case "ADMIN":
                    role = ERole.ADMINISTRATOR;
                    break;
                case "STUDENT":
                    role = ERole.STUDENT;
                    break;
                default: 
                    log.error("Failed to map role: {}", roleName);
                    throw new ApiException("Invalid role name: " + roleName, HttpStatus.BAD_REQUEST);
            }
        }
        
        user.setRole(role);
        user.setUpdatedAt(LocalDateTime.now());
        log.info("Admin: User {} role updated to {}", userId, role);
        return userRepository.save(user);
    }

    public List<Map<String, Object>> getAllClearanceRequests() {
        String projectId = ProjectScope.currentProjectId();
        List<ClearanceRequest> requests = (projectId == null || projectId.trim().isEmpty())
                ? clearanceRequestRepository.findAll()
                : clearanceRequestRepository.findByProjectId(projectId);

        return requests.stream().map(req -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", req.getId());
            map.put("studentId", req.getStudentId());
            map.put("status", req.getStatus());
            map.put("currentStage", req.getCurrentStage());
            map.put("currentOffice", req.getCurrentOffice());
            map.put("submittedAt", req.getSubmittedAt());
            map.put("updatedAt", req.getUpdatedAt());
            map.put("college", req.getCollege());
            map.put("department", req.getDepartment());
            map.put("programme", req.getProgramme());
            map.put("projectId", req.getProjectId());

            Student s = req.getStudent();
            if (s != null) {
                map.put("studentName", s.getFullName());
                map.put("registrationNumber", s.getRegistrationNumber());
                Map<String, Object> studentMap = new LinkedHashMap<>();
                studentMap.put("id", s.getId());
                studentMap.put("fullName", s.getFullName());
                studentMap.put("registrationNumber", s.getRegistrationNumber());
                studentMap.put("email", s.getEmail());
                studentMap.put("phoneNumber", s.getPhoneNumber());
                studentMap.put("programme", s.getProgramme());
                studentMap.put("college", s.getCollege());
                studentMap.put("department", s.getDepartment());
                map.put("student", studentMap);
            } else {
                map.put("studentName", "Student");
                map.put("registrationNumber", req.getStudentId() != null ? req.getStudentId() : "—");
            }
            return map;
        }).collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> importLocalStorage(JsonNode export) {
        String projectId = ProjectScope.currentProjectId();
        if (projectId == null) {
            throw new ApiException("A project administrator token is required", HttpStatus.FORBIDDEN);
        }
        if (export == null || !export.isObject()) {
            throw new ApiException("Export must be a JSON object", HttpStatus.BAD_REQUEST);
        }
        int imported = 0;
        JsonNode users = export.get("users");
        if (users != null && !users.isArray()) {
            throw new ApiException("users must be an array", HttpStatus.BAD_REQUEST);
        }
        if (users != null) {
            for (JsonNode user : users) {
                RegisterRequest request;
                try {
                    request = objectMapper.treeToValue(user, RegisterRequest.class);
                } catch (JsonProcessingException exception) {
                    throw new ApiException("Each imported user must be a valid registration object", HttpStatus.BAD_REQUEST);
                }
                if (request.getPassword() == null || request.getPassword().isBlank()) {
                    throw new ApiException("Every imported user must include a password", HttpStatus.UNPROCESSABLE_ENTITY);
                }
                authService.register(request);
                imported++;
            }
        }

        int legacyRecords = 0;
        var fields = export.fields();
        while (fields.hasNext()) {
            var entry = fields.next();
            ProjectLocalStorage record = new ProjectLocalStorage();
            record.setProjectId(projectId);
            record.setStorageKey(entry.getKey());
            try {
                record.setStorageValue(objectMapper.writeValueAsString(entry.getValue()));
            } catch (JsonProcessingException exception) {
                throw new ApiException("Unable to serialize imported local-storage data", HttpStatus.BAD_REQUEST);
            }
            projectLocalStorageRepository.save(record);
            legacyRecords++;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("projectId", projectId);
        result.put("usersImported", imported);
        result.put("legacyRecordsImported", legacyRecords);
        result.put("message", "Local-storage data imported into clearance_db. Normalized users are available in users/students; other legacy records are preserved for review.");
        return result;
    }

    @Transactional(readOnly = true)
    public List<ProjectLocalStorage> getImportedLocalStorage() {
        String projectId = ProjectScope.currentProjectId();
        if (projectId == null) {
            throw new ApiException("A project administrator token is required", HttpStatus.FORBIDDEN);
        }
        return projectLocalStorageRepository.findByProjectIdOrderByImportedAtDesc(projectId);
    }

    @Transactional
    public int processBulkUpload(MultipartFile file) throws Exception {
        String filename = file.getOriginalFilename();
        if (filename == null) throw new RuntimeException("Invalid file");

        if (filename.endsWith(".csv")) {
            return processCsv(file);
        } else if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
            return processExcel(file);
        } else {
            throw new RuntimeException("Unsupported file format. Please upload CSV or Excel.");
        }
    }

    private int processCsv(MultipartFile file) throws Exception {
        int count = 0;
        try (Reader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            BufferedReader br = new BufferedReader(reader);
            String headerLine = br.readLine();
            if (headerLine == null) return 0;

            String[] headers = parseCsvLine(headerLine);
            Map<String, Integer> headerMap = mapHeaders(headers);

            String line;
            while ((line = br.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                String[] data = parseCsvLine(line);
                if (data.length < 2) continue;

                RegisterRequest request = buildRequestFromMap(data, headerMap);
                if (request.getFirstName() == null || request.getFirstName().isEmpty()) continue;

                try {
                    saveOrUpdateUserAndStudent(request);
                    count++;
                } catch (Exception e) {
                    log.error("Error saving/updating user from CSV: {} - {}", request.getEmail(), e.getMessage());
                }
            }
        }
        return count;
    }

    private int processExcel(MultipartFile file) throws Exception {
        int count = 0;
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<org.apache.poi.ss.usermodel.Row> rows = sheet.iterator();

            if (!rows.hasNext()) return 0;
            org.apache.poi.ss.usermodel.Row headerRow = rows.next();
            List<String> headerList = new java.util.ArrayList<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                headerList.add(getCellValue(headerRow.getCell(i)));
            }
            Map<String, Integer> headerMap = mapHeaders(headerList.toArray(new String[0]));

            while (rows.hasNext()) {
                org.apache.poi.ss.usermodel.Row row = rows.next();
                List<String> rowList = new java.util.ArrayList<>();
                for (int i = 0; i < Math.max(row.getLastCellNum(), 20); i++) {
                    rowList.add(getCellValue(row.getCell(i)));
                }
                String[] data = rowList.toArray(new String[0]);

                RegisterRequest request = buildRequestFromMap(data, headerMap);
                if (request.getFirstName() == null || request.getFirstName().isEmpty()) continue;

                try {
                    saveOrUpdateUserAndStudent(request);
                    count++;
                } catch (Exception e) {
                    log.error("Error saving/updating user from Excel: {} - {}", request.getEmail(), e.getMessage());
                }
            }
        }
        return count;
    }

    private void saveOrUpdateUserAndStudent(RegisterRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        String regNo = request.getRegistrationNumber() != null ? request.getRegistrationNumber().trim() : "";

        User user = null;
        if (!email.isEmpty()) {
            user = userRepository.findByEmail(email).orElse(null);
        }
        if (user == null && !regNo.isEmpty()) {
            user = userRepository.findByRegistrationNumber(regNo).orElse(null);
        }

        if (user == null) {
            try {
                authService.register(request);
            } catch (Exception ex) {
                log.warn("Registration fallback during bulk upload for {}: {}", email, ex.getMessage());
            }
            if (!email.isEmpty()) {
                user = userRepository.findByEmail(email).orElse(null);
            }
            if (user == null && !regNo.isEmpty()) {
                user = userRepository.findByRegistrationNumber(regNo).orElse(null);
            }
        }

        if (user != null) {
            if (request.getFirstName() != null && !request.getFirstName().isEmpty()) user.setFirstName(request.getFirstName());
            if (request.getMiddleName() != null) user.setMiddleName(request.getMiddleName());
            if (request.getLastName() != null && !request.getLastName().isEmpty()) user.setLastName(request.getLastName());

            String fullName = (user.getFirstName() + " " + (user.getMiddleName() != null ? user.getMiddleName() + " " : "") + user.getLastName()).trim();
            user.setFullName(fullName);

            if (!regNo.isEmpty()) user.setRegistrationNumber(regNo);
            if (request.getCollege() != null && !request.getCollege().isEmpty()) {
                user.setCollege(request.getCollege());
            }
            if (request.getDepartment() != null && !request.getDepartment().isEmpty()) {
                user.setDepartment(request.getDepartment());
            }
            if (request.getProgramme() != null && !request.getProgramme().isEmpty()) {
                user.setProgramme(request.getProgramme());
            }
            if (request.getPhone() != null && !request.getPhone().isEmpty()) {
                user.setPhoneNumber(request.getPhone());
            }
            if (request.getPassword() != null && !request.getPassword().isEmpty()) {
                user.setPassword(passwordEncoder.encode(request.getPassword()));
            }
            user.setActive(true);
            user.setEmailVerified(true);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);

            // Synchronize with Student entity if role is student
            String finalRegNo = user.getRegistrationNumber() != null ? user.getRegistrationNumber() : regNo;
            if (user.getRole() == ERole.STUDENT || (request.getRole() != null && "STUDENT".equalsIgnoreCase(request.getRole()))) {
                Student student = null;
                if (finalRegNo != null && !finalRegNo.isEmpty()) {
                    student = studentRepository.findByRegistrationNumber(finalRegNo).orElse(null);
                }
                if (student == null) {
                    student = studentRepository.findByUserId(user.getId()).orElse(null);
                }
                if (student == null) {
                    student = new Student();
                    student.setCreatedAt(LocalDateTime.now());
                }
                student.setUser(user);
                student.setRegistrationNumber(finalRegNo);
                student.setFullName(user.getFullName());
                student.setEmail(user.getEmail());
                student.setPhoneNumber(user.getPhoneNumber());
                student.setCollege(user.getCollege());
                student.setFaculty(user.getCollege());
                student.setDepartment(user.getDepartment());
                student.setProgramme(user.getProgramme());
                if (student.getClearanceStatus() == null) {
                    student.setClearanceStatus(ClearanceStatus.PENDING);
                }
                student.setUpdatedAt(LocalDateTime.now());
                studentRepository.save(student);
            }
        }
    }

    private String[] parseCsvLine(String line) {
        List<String> tokens = new java.util.ArrayList<>();
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

    private Map<String, Integer> mapHeaders(String[] headers) {
        Map<String, Integer> map = new java.util.HashMap<>();
        for (int i = 0; i < headers.length; i++) {
            if (headers[i] == null) continue;
            String h = headers[i].toLowerCase().replaceAll("[^a-z0-9]", "");

            // 1. Registration Number / Staff ID / PF Number
            if (h.contains("reg") || h.contains("matric") || h.contains("staffid") || h.contains("pfno") ||
                h.contains("pfnumber") || h.equals("id") || h.contains("studentid") || h.contains("employeeid") ||
                h.contains("fileno")) {
                map.putIfAbsent("reg", i);
            }
            // 2. First Name
            else if (h.contains("first") || h.equals("fname") || h.equals("givenname")) {
                map.putIfAbsent("firstName", i);
            }
            // 3. Middle Name / Other Name
            else if (h.contains("other") || h.contains("middle") || h.equals("mname") || h.contains("secondname")) {
                map.putIfAbsent("middleName", i);
            }
            // 4. Last Name / Surname
            else if (h.contains("sur") || h.contains("last") || h.equals("lname") || h.contains("familyname")) {
                map.putIfAbsent("lastName", i);
            }
            // 5. Full Name (if unified in a single column)
            else if (h.contains("fullname") || h.equals("name") || h.equals("names") || h.contains("studentname") || h.contains("staffname")) {
                map.putIfAbsent("fullName", i);
            }
            // 6. Email
            else if (h.contains("email") || h.contains("mail")) {
                map.putIfAbsent("email", i);
            }
            // 7. Role
            else if (h.contains("role") || h.contains("designation") || h.contains("position") || h.contains("usertype")) {
                map.putIfAbsent("role", i);
            }
            // 8. Password
            else if (h.contains("pass") || h.contains("pwd")) {
                map.putIfAbsent("password", i);
            }
            // 9. College / Faculty
            else if (h.contains("colleg") || h.contains("facult") || h.contains("school") || h.contains("institution")) {
                map.putIfAbsent("college", i);
            }
            // 10. Department
            else if (h.contains("dept") || h.contains("department") || h.contains("unit") || h.contains("section")) {
                map.putIfAbsent("department", i);
            }
            // 11. Programme
            else if (h.contains("prog") || h.contains("course") || h.contains("degree") || h.contains("major")) {
                map.putIfAbsent("programme", i);
            }
            // 12. Phone
            else if (h.contains("phone") || h.contains("mobile") || h.contains("tel") || h.contains("contact")) {
                map.putIfAbsent("phone", i);
            }
            // 13. Year
            else if (h.contains("year") || h.contains("cohort")) {
                map.putIfAbsent("year", i);
            }
            // ALL other columns (SN, Gender, GPA, Classification, Qualification, Prefix, Campus, Color,
            // Added By, Reason, DUS COMMENT, Remarks, etc.) are automatically trimmed and ignored.
        }
        return map;
    }

    private RegisterRequest buildRequestFromMap(String[] data, Map<String, Integer> headerMap) {
        RegisterRequest request = new RegisterRequest();

        if (headerMap.containsKey("firstName") || headerMap.containsKey("reg") || headerMap.containsKey("fullName") || headerMap.containsKey("email")) {
            String first = getVal(data, headerMap.get("firstName"));
            String middle = getVal(data, headerMap.get("middleName"));
            String last = getVal(data, headerMap.get("lastName"));

            if (first.isEmpty() && headerMap.containsKey("fullName")) {
                String full = getVal(data, headerMap.get("fullName"));
                if (!full.isEmpty()) {
                    String[] parts = full.split("\\s+");
                    if (parts.length == 1) {
                        first = parts[0];
                        last = parts[0];
                    } else if (parts.length == 2) {
                        first = parts[0];
                        last = parts[1];
                    } else {
                        first = parts[0];
                        middle = parts[1];
                        StringBuilder sb = new StringBuilder();
                        for (int p = 2; p < parts.length; p++) {
                            if (p > 2) sb.append(" ");
                            sb.append(parts[p]);
                        }
                        last = sb.toString();
                    }
                }
            }

            request.setFirstName(first);
            request.setMiddleName(middle);
            request.setLastName(last);
            request.setRegistrationNumber(getVal(data, headerMap.get("reg")));
            request.setEmail(getVal(data, headerMap.get("email")));
            request.setRole(getVal(data, headerMap.get("role")));
            request.setPassword(getVal(data, headerMap.get("password")));
            request.setCollege(getVal(data, headerMap.get("college")));
            request.setFaculty(request.getCollege());
            request.setDepartment(getVal(data, headerMap.get("department")));
            request.setProgramme(getVal(data, headerMap.get("programme")));
            request.setPhone(getVal(data, headerMap.get("phone")));
            request.setYearOfStudy(getVal(data, headerMap.get("year")));
        } else {
            // Positional fallback matching manual registration fields
            request.setFirstName(getVal(data, 0));
            request.setMiddleName(getVal(data, 1));
            request.setLastName(getVal(data, 2));
            request.setEmail(getVal(data, 3));
            request.setRole(getVal(data, 4));
            request.setRegistrationNumber(getVal(data, 5));
            request.setPassword(getVal(data, 6));
            request.setCollege(getVal(data, 7));
            request.setDepartment(getVal(data, 8));
            request.setProgramme(getVal(data, 9));
            if (data.length > 10) request.setPhone(getVal(data, 10));
        }

        // Auto-generate email if missing
        if (request.getEmail() == null || request.getEmail().isEmpty()) {
            String f = request.getFirstName() != null ? request.getFirstName().toLowerCase().replaceAll("[^a-z0-9]", "") : "user";
            String l = request.getLastName() != null ? request.getLastName().toLowerCase().replaceAll("[^a-z0-9]", "") : "udsm";
            request.setEmail(f + "." + l + "@udsm.ac.tz");
        }

        // Determine / normalize role
        String reg = request.getRegistrationNumber() != null ? request.getRegistrationNumber().toUpperCase().trim() : "";
        if (request.getRole() == null || request.getRole().isEmpty()) {
            if (reg.startsWith("STF") || reg.startsWith("PF")) {
                if (reg.contains("LIB")) request.setRole("LIBRARY");
                else if (reg.contains("SPO") || reg.contains("GAMES")) request.setRole("GAMES_COACH");
                else if (reg.contains("WRD") || reg.contains("HALL")) request.setRole("HALL_WARDEN");
                else if (reg.contains("USB") || reg.contains("USAB")) request.setRole("USAB");
                else if (reg.contains("DAR")) request.setRole("DARUSO");
                else if (reg.contains("DOS") || reg.contains("DEAN")) request.setRole("DEAN_OF_STUDENTS");
                else if (reg.contains("SMC") || reg.contains("CARD")) request.setRole("SMART_CARD");
                else if (reg.contains("DPT")) request.setRole("DEPARTMENT");
                else if (reg.contains("PRN") || reg.contains("PRIN")) request.setRole("PRINCIPAL");
                else if (reg.contains("FIN") || reg.contains("BUR")) request.setRole("FINANCE");
                else if (reg.contains("ICT")) request.setRole("ICT");
                else if (reg.contains("LEC")) request.setRole("LECTURER");
                else if (reg.contains("DUS")) request.setRole("DUS");
                else if (reg.contains("ADM")) request.setRole("ADMIN");
                else request.setRole("ACADEMIC_STAFF");
            } else {
                request.setRole("STUDENT");
            }
        }

        // Automatic column trimming for role-specific fields (matching manual registration rules)
        String roleUpper = request.getRole().toUpperCase().trim().replace(" ", "_");
        boolean isStudent = roleUpper.equals("STUDENT");
        boolean isPrincipal = roleUpper.equals("PRINCIPAL");
        boolean isCentralOffice = roleUpper.contains("LIBRARY") || roleUpper.contains("FINANCE") ||
                roleUpper.contains("ICT") || roleUpper.contains("CONVOCATION") || roleUpper.contains("GAMES") ||
                roleUpper.contains("WARDEN") || roleUpper.contains("USAB") || roleUpper.contains("DARUSO") ||
                roleUpper.contains("DEAN") || roleUpper.contains("SMART") || roleUpper.contains("DUS") ||
                roleUpper.contains("ADMIN");

        if (isCentralOffice) {
            request.setCollege("");
            request.setFaculty("");
            request.setProgramme("");
            if (request.getDepartment() == null || request.getDepartment().isEmpty()) {
                request.setDepartment(getDefaultUnitName(roleUpper));
            }
        } else if (isPrincipal) {
            request.setDepartment("");
            request.setProgramme("");
        } else if (!isStudent) {
            // Staff members do not have a study programme
            request.setProgramme("");
        }

        // Default password to Registration Number if missing
        if (request.getPassword() == null || request.getPassword().isEmpty()) {
            if (!reg.isEmpty()) {
                request.setPassword(reg);
            } else {
                request.setPassword("Welcome@UDSM123");
            }
        }

        // Default phone if missing
        if (request.getPhone() == null || request.getPhone().isEmpty()) {
            int seedVal = !reg.isEmpty() ? Math.abs(reg.hashCode()) : 123456;
            request.setPhone("+255712" + String.format("%06d", seedVal % 900000 + 100000));
        }

        // Default staff ID if missing for staff
        if (!isStudent && reg.isEmpty()) {
            String prefix = roleUpper.length() >= 3 ? roleUpper.substring(0, 3) : "STF";
            int rand = (int) (1000 + (Math.random() * 9000));
            request.setRegistrationNumber("STF-" + prefix + "-" + rand);
        }

        if (request.getYearOfStudy() == null || request.getYearOfStudy().isEmpty()) {
            if (reg.matches("^\\d{4}-.*")) {
                request.setYearOfStudy(reg.substring(0, 4));
            } else {
                request.setYearOfStudy("2026");
            }
        }
        return request;
    }

    private String getDefaultUnitName(String role) {
        if (role == null) return "University Administration";
        if (role.contains("LIBRARY")) return "Library Services";
        if (role.contains("FINANCE")) return "Bursar & Treasury";
        if (role.contains("ICT")) return "Centre for Information and Communication Technology";
        if (role.contains("CONVOCATION")) return "Convocation Relations";
        if (role.contains("GAMES") || role.contains("COACH")) return "Sports and Games Department";
        if (role.contains("WARDEN") || role.contains("HALL") || role.contains("USAB")) return "Accommodation Bureau (USAB)";
        if (role.contains("DARUSO")) return "DARUSO Student Union";
        if (role.contains("DEAN")) return "Dean of Students Office";
        if (role.contains("SMART")) return "Smart Card Unit";
        if (role.contains("DUS") || role.contains("UNDERGRADUATE")) return "Directorate of Undergraduate Studies";
        return "University Administration";
    }

    private String getVal(String[] data, Integer index) {
        if (index == null || index < 0 || index >= data.length) return "";
        if (data[index] == null) return "";
        String v = data[index].trim();
        if (v.equalsIgnoreCase("null") || v.equalsIgnoreCase("n/a") || v.equals("-")) return "";
        return v;
    }

    @Transactional
    public int seedUdsmSampleData() {
        int count = 0;
        java.io.File csvFile = new java.io.File("udsm_20_students_and_staff_data.csv");
        if (!csvFile.exists()) {
            csvFile = new java.io.File("/home/mulimila/e-CLEARENCE_UDSM/udsm_20_students_and_staff_data.csv");
        }
        if (csvFile.exists()) {
            try (BufferedReader br = new BufferedReader(new java.io.FileReader(csvFile))) {
                String header = br.readLine();
                String[] headers = parseCsvLine(header);
                Map<String, Integer> headerMap = mapHeaders(headers);
                String line;
                while ((line = br.readLine()) != null) {
                    if (line.trim().isEmpty()) continue;
                    String[] data = parseCsvLine(line);
                    RegisterRequest req = buildRequestFromMap(data, headerMap);
                    try {
                        authService.register(req);
                        userRepository.findByEmail(req.getEmail().trim().toLowerCase()).ifPresent(u -> {
                            u.setActive(true);
                            u.setEmailVerified(true);
                            userRepository.save(u);
                        });
                        count++;
                    } catch (Exception e) {
                        log.warn("Seed skipped/failed for {}: {}", req.getEmail(), e.getMessage());
                    }
                }
            } catch (Exception e) {
                log.error("Failed to seed from CSV file", e);
            }
        }
        return count;
    }

    private String getCellValue(Cell cell) {
        return getCellValue(cell, "");
    }

    private String getCellValue(Cell cell, String defaultValue) {
        if (cell == null) return defaultValue;
        try {
            String val = dataFormatter.formatCellValue(cell);
            return (val != null && !val.trim().isEmpty()) ? val.trim() : defaultValue;
        } catch (Exception e) {
            return defaultValue;
        }
    }

    @Transactional
    public void activateUserByEmail(String email) {
        if (email == null || email.trim().isEmpty()) return;
        userRepository.findByEmail(email.trim().toLowerCase()).ifPresent(user -> {
            user.setActive(true);
            user.setEmailVerified(true);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
            log.info("Activated manually registered user: {}", email);
        });
    }
}
