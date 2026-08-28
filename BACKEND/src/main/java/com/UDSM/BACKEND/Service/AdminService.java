package com.UDSM.BACKEND.Service;

import com.UDSM.BACKEND.Model.*;
import com.UDSM.BACKEND.Repository.ClearanceRequestRepository;
import com.UDSM.BACKEND.Repository.StudentRepository;
import com.UDSM.BACKEND.Repository.UserRepository;
import com.UDSM.BACKEND.dto.RegisterRequest;
import com.lowagie.text.Row;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.Reader;
import java.time.LocalDateTime;
import java.util.Iterator;
import java.util.List;

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

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Transactional
    public void deleteUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Deleting student record if it exists
        if (user.getRegistrationNumber() != null) {
            studentRepository.findByRegistrationNumber(user.getRegistrationNumber())
                    .ifPresent(student -> {
                        // Also delete clearance requests
                        List<ClearanceRequest> requests = clearanceRequestRepository.findByStudent(student);
                        clearanceRequestRepository.deleteAll(requests);
                        studentRepository.delete(student);
                    });
        }
        
        userRepository.delete(user);
    }

    @Transactional
    public User updateUserRole(String userId, String roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        try {
            ERole role = ERole.valueOf(roleName.toUpperCase());
            user.setRole(role);
            user.setUpdatedAt(LocalDateTime.now());
            return userRepository.save(user);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid role: " + roleName);
        }
    }

    public List<ClearanceRequest> getAllClearanceRequests() {
        return clearanceRequestRepository.findAll();
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
