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

import static java.sql.JDBCType.NUMERIC;
import static javax.management.openmbean.SimpleType.STRING;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final ClearanceRequestRepository clearanceRequestRepository;
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

        String projectId = ProjectScope.currentProjectId();
        // Security check: Institutional admins can only delete their own project users or global users
        if (projectId != null && user.getProjectId() != null && !user.getProjectId().equals(projectId)) {
             throw new ApiException("You do not have permission to delete this user", HttpStatus.FORBIDDEN);
        }
        
        // Deleting student record if it exists (check by reg number and user id)
        studentRepository.findByUserId(userId)
                .or(() -> (user.getRegistrationNumber() != null && !user.getRegistrationNumber().isBlank()) 
                        ? studentRepository.findByRegistrationNumber(user.getRegistrationNumber()) 
                        : java.util.Optional.empty())
                .ifPresent(student -> {
                    // Also delete clearance requests
                    List<ClearanceRequest> requests = clearanceRequestRepository.findByStudent(student);
                    clearanceRequestRepository.deleteAll(requests);
                    studentRepository.delete(student);
                    log.info("Admin: Deleted student record and {} clearance requests for user {}", requests.size(), userId);
                });
        
        userRepository.delete(user);
        log.info("Admin: User {} successfully deleted", userId);
    }

    @Transactional
    public void deleteUsers(List<String> userIds) {
        if (userIds == null || userIds.isEmpty()) return;
        
        log.info("Admin: Bulk deleting {} users", userIds.size());
        for (String id : userIds) {
            try {
                deleteUser(id);
            } catch (Exception e) {
                log.error("Admin: Failed to delete user {} during bulk operation: {}", id, e.getMessage());
            }
        }
    }

    @Transactional
    public User updateUserRole(String userId, String roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

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

    public List<ClearanceRequest> getAllClearanceRequests() {
        String projectId = ProjectScope.currentProjectId();
        return projectId == null ? clearanceRequestRepository.findAll() : clearanceRequestRepository.findByProjectId(projectId);
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
            String h = headers[i].toLowerCase().replaceAll("[^a-z0-9]", "");
            if (h.contains("reg") || h.contains("matric")) map.putIfAbsent("reg", i);
            else if (h.contains("first") || h.equals("fname")) map.putIfAbsent("firstName", i);
            else if (h.contains("other") || h.contains("middle") || h.equals("mname")) map.putIfAbsent("middleName", i);
            else if (h.contains("sur") || h.contains("last") || h.equals("lname")) map.putIfAbsent("lastName", i);
            else if (h.contains("email") || h.contains("mail")) map.putIfAbsent("email", i);
            else if (h.contains("role") || h.contains("designation")) map.putIfAbsent("role", i);
            else if (h.contains("phone") || h.contains("mobile") || h.contains("tel")) map.putIfAbsent("phone", i);
            else if (h.contains("prog") || h.contains("course")) map.putIfAbsent("programme", i);
            else if (h.contains("colleg") || h.contains("facult") || h.contains("school")) map.putIfAbsent("college", i);
            else if (h.contains("dept") || h.contains("department")) map.putIfAbsent("department", i);
            else if (h.contains("year") || h.contains("cohort")) map.putIfAbsent("year", i);
            else if (h.contains("pass") || h.contains("pwd")) map.putIfAbsent("password", i);
        }
        return map;
    }

    private RegisterRequest buildRequestFromMap(String[] data, Map<String, Integer> headerMap) {
        RegisterRequest request = new RegisterRequest();
        if (headerMap.containsKey("firstName") || headerMap.containsKey("reg")) {
            request.setFirstName(getVal(data, headerMap.get("firstName")));
            request.setMiddleName(getVal(data, headerMap.get("middleName")));
            request.setLastName(getVal(data, headerMap.get("lastName")));
            request.setRegistrationNumber(getVal(data, headerMap.get("reg")));
            request.setEmail(getVal(data, headerMap.get("email")));
            request.setRole(getVal(data, headerMap.get("role")));
            request.setPhone(getVal(data, headerMap.get("phone")));
            request.setProgramme(getVal(data, headerMap.get("programme")));
            request.setCollege(getVal(data, headerMap.get("college")));
            request.setFaculty(request.getCollege());
            request.setDepartment(getVal(data, headerMap.get("department")));
            request.setYearOfStudy(getVal(data, headerMap.get("year")));
            request.setPassword(getVal(data, headerMap.get("password")));
        } else {
            // legacy positional fallback
            request.setFirstName(getVal(data, 0));
            request.setMiddleName(getVal(data, 1));
            request.setLastName(getVal(data, 2));
            request.setEmail(getVal(data, 3));
            request.setRegistrationNumber(getVal(data, 4));
            request.setPassword(getVal(data, 5));
            request.setRole(getVal(data, 6));
            request.setDepartment(getVal(data, 7));
            request.setProgramme(getVal(data, 8));
            request.setFaculty(getVal(data, 9));
            request.setCollege(getVal(data, 9));
            request.setYearOfStudy(getVal(data, 10));
        }

        if (request.getPassword() == null || request.getPassword().isEmpty()) {
            if (request.getRegistrationNumber() != null && !request.getRegistrationNumber().isEmpty()) {
                request.setPassword(request.getRegistrationNumber());
            } else {
                request.setPassword("Welcome@UDSM123");
            }
        }
        if (request.getPhone() == null || request.getPhone().isEmpty()) {
            int seedVal = request.getRegistrationNumber() != null ? Math.abs(request.getRegistrationNumber().hashCode()) : 123456;
            request.setPhone("+255712" + String.format("%06d", seedVal % 900000 + 100000));
        }
        if (request.getEmail() == null || request.getEmail().isEmpty()) {
            String f = request.getFirstName() != null ? request.getFirstName().toLowerCase().replaceAll("[^a-z0-9]", "") : "user";
            String l = request.getLastName() != null ? request.getLastName().toLowerCase().replaceAll("[^a-z0-9]", "") : "udsm";
            request.setEmail(f + "." + l + "@udsm.ac.tz");
        }
        if (request.getRole() == null || request.getRole().isEmpty()) {
            String reg = request.getRegistrationNumber() != null ? request.getRegistrationNumber().toUpperCase() : "";
            if (reg.startsWith("STF")) {
                if (reg.contains("LIB")) request.setRole("LIBRARY");
                else if (reg.contains("SPO")) request.setRole("GAMES_COACH");
                else if (reg.contains("WRD")) request.setRole("WARDEN");
                else if (reg.contains("USB")) request.setRole("USAB");
                else if (reg.contains("DAR")) request.setRole("DARUSO");
                else if (reg.contains("DOS")) request.setRole("DEAN_OF_STUDENTS");
                else if (reg.contains("SMC")) request.setRole("SMART_CARD");
                else if (reg.contains("DPT")) request.setRole("DEPARTMENT");
                else if (reg.contains("PRN")) request.setRole("PRINCIPAL");
                else if (reg.contains("FIN")) request.setRole("FINANCE");
                else if (reg.contains("DUS")) request.setRole("DUS");
                else if (reg.contains("ADM")) request.setRole("ADMIN");
                else request.setRole("STAFF");
            } else {
                request.setRole("STUDENT");
            }
        }
        if (request.getYearOfStudy() == null || request.getYearOfStudy().isEmpty()) {
            String reg = request.getRegistrationNumber() != null ? request.getRegistrationNumber() : "";
            if (reg.matches("^\\d{4}-.*")) {
                request.setYearOfStudy(reg.substring(0, 4));
            } else {
                request.setYearOfStudy("2026");
            }
        }
        return request;
    }

    private String getVal(String[] data, Integer index) {
        if (index == null || index < 0 || index >= data.length) return "";
        return data[index] != null ? data[index].trim() : "";
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
}
