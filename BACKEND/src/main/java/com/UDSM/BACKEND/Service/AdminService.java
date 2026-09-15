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
import com.lowagie.text.Row;
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
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ProjectLocalStorageRepository projectLocalStorageRepository;

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
                case "CONVOCATION": role = ERole.CONVOCATION_OFFICER; break;
                case "LIBRARY": role = ERole.LIBRARY_OFFICER; break;
                case "ICT": role = ERole.ICT_OFFICER; break;
                case "DEPARTMENT": role = ERole.DEPARTMENT_OFFICER; break;
                case "USAB": role = ERole.USAB_OFFICER; break;
                case "DARUSO": role = ERole.DARUSO_OFFICER; break;
                case "SMART CARD": role = ERole.SMART_CARD_OFFICER; break;
                case "WORKSHOP": role = ERole.WORKSHOP_OFFICER; break;
                case "LABORATORY": role = ERole.LABORATORY_OFFICER; break;
                case "DEAN OF STUDENTS": role = ERole.DEAN_OF_STUDENTS; break;
                case "GAMES COACH": role = ERole.GAMES_COACH; break;
                case "HALL WARDEN": role = ERole.HALL_WARDEN; break;
                case "ACADEMIC STAFF": role = ERole.PRINCIPAL; break; // Fallback or specific mapping
                case "ADMINISTRATOR": 
                case "ADMIN": role = ERole.ADMINISTRATOR; break;
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
            String line;
            br.readLine(); // skip header
            
            while ((line = br.readLine()) != null) {
                String[] data = line.split(",");
                if (data.length < 5) continue; 
                
                RegisterRequest request = new RegisterRequest();
                request.setFirstName(data[0].trim());
                request.setMiddleName(data.length > 1 ? data[1].trim() : "");
                request.setLastName(data.length > 2 ? data[2].trim() : "");
                request.setEmail(data.length > 3 ? data[3].trim() : "");
                request.setRegistrationNumber(data.length > 4 ? data[4].trim() : "");
                request.setPassword(data.length > 5 ? data[5].trim() : "Welcome@UDSM123");
                request.setRole(data.length > 6 ? data[6].trim() : "STUDENT");
                request.setDepartment(data.length > 7 ? data[7].trim() : "");
                request.setProgramme(data.length > 8 ? data[8].trim() : "");
                request.setFaculty(data.length > 9 ? data[9].trim() : "");
                request.setYearOfStudy(data.length > 10 ? data[10].trim() : "");
                
                try {
                    authService.register(request);
                    count++;
                } catch (Exception e) {
                    log.error("Error registering user from CSV: {} - {}", request.getEmail(), e.getMessage());
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
            
            if (rows.hasNext()) rows.next(); // Skip header
            
            while (rows.hasNext()) {
                Row row = (Row) rows.next();
                
                RegisterRequest request = new RegisterRequest();
                request.setFirstName(getCellValue((Cell) row.getCell(0)));
                request.setMiddleName(getCellValue((Cell) row.getCell(1)));
                request.setLastName(getCellValue((Cell) row.getCell(2)));
                request.setEmail(getCellValue((Cell) row.getCell(3)));
                request.setRegistrationNumber(getCellValue((Cell) row.getCell(4)));
                request.setPassword(getCellValue((Cell) row.getCell(5), "Welcome@UDSM123"));
                request.setRole(getCellValue((Cell) row.getCell(6), "STUDENT"));
                request.setDepartment(getCellValue((Cell) row.getCell(7)));
                request.setProgramme(getCellValue((Cell) row.getCell(8)));
                request.setFaculty(getCellValue((Cell) row.getCell(9)));
                request.setYearOfStudy(getCellValue((Cell) row.getCell(10)));
                
                if (request.getEmail().isEmpty() || request.getFirstName().isEmpty()) continue;

                try {
                    authService.register(request);
                    count++;
                } catch (Exception e) {
                    log.error("Error registering user from Excel: {} - {}", request.getEmail(), e.getMessage());
                }
            }
        }
        return count;
    }

    private String getCellValue(Cell cell) {
        return getCellValue(cell, "");
    }

    private String getCellValue(Cell cell, String defaultValue) {
        if (cell == null) return defaultValue;
        switch (cell.getCellType()) {
            case STRING: return cell.getStringCellValue().trim();
            case NUMERIC: return String.valueOf((long)cell.getNumericCellValue());
            default: return defaultValue;
        }
    }
}
