package com.UDSM.BACKEND.util;

import com.UDSM.BACKEND.BackendApplication;
import com.UDSM.BACKEND.Model.ERole;
import com.UDSM.BACKEND.Model.Student;
import com.UDSM.BACKEND.Model.User;
import com.UDSM.BACKEND.Repository.StudentRepository;
import com.UDSM.BACKEND.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Excel and CSV Data Generator and Exporter for UDSM Clearance MIS.
 * Strictly fetches data dynamically from the backend database (UserRepository & StudentRepository).
 * NEVER hardcodes names, programmes, staff roles, or dummy student records.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ExcelDataGenerator {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;

    public static final String[] HEADERS = {
        "SN", "Registration", "Password", "First Name", "Other Name", "Surname", "Gender",
        "Programme", "GPA", "Classification", "Qualification", "Prefix", "Campus",
        "Color", "College", "Department", "Role", "Email", "Phone", "Added By", "Reason", "DUS COMMENT"
    };

    /**
     * CLI entry point that boots the Spring context and exports live backend database records.
     */
    public static void main(String[] args) {
        try {
            ApplicationContext context = SpringApplication.run(BackendApplication.class, args);
            ExcelDataGenerator generator = context.getBean(ExcelDataGenerator.class);
            generator.exportDatabaseToSpreadsheets();
            System.exit(0);
        } catch (Exception e) {
            System.err.println("Failed to export backend database to spreadsheets: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }

    /**
     * Fetches all live users and students from the database and saves Excel & CSV files
     * to project root and frontend public directories.
     */
    public void exportDatabaseToSpreadsheets() {
        List<User> users = userRepository.findAll();
        List<Student> students = studentRepository.findAll();
        log.info("Fetching from backend: {} users and {} students found in database.", users.size(), students.size());

        String[][] data = mapEntitiesToTableRows(users, students);
        saveSpreadsheets(data);
    }

    /**
     * Streams live database records as an Excel (.xlsx) byte array for HTTP REST downloads.
     */
    public byte[] exportDatabaseToExcelBytes() throws Exception {
        List<User> users = userRepository.findAll();
        List<Student> students = studentRepository.findAll();
        String[][] data = mapEntitiesToTableRows(users, students);
        return generateExcelBytes(data);
    }

    /**
     * Streams live database records as a CSV byte array for HTTP REST downloads.
     */
    public byte[] exportDatabaseToCsvBytes() {
        List<User> users = userRepository.findAll();
        List<Student> students = studentRepository.findAll();
        String[][] data = mapEntitiesToTableRows(users, students);
        return generateCsvBytes(data);
    }

    /**
     * Generates a clean, blank template with headers only (no hardcoded data rows).
     */
    public static byte[] generateBlankTemplateExcelBytes() throws Exception {
        return generateExcelBytes(new String[0][HEADERS.length]);
    }

    /**
     * Maps real backend User and Student entities into spreadsheet rows.
     * Contains ZERO hardcoded dummy entries.
     */
    public static String[][] mapEntitiesToTableRows(List<User> users, List<Student> students) {
        if (users == null || users.isEmpty()) {
            return new String[0][HEADERS.length];
        }

        Map<String, Student> studentMap = new HashMap<>();
        if (students != null) {
            for (Student s : students) {
                if (s.getRegistrationNumber() != null && !s.getRegistrationNumber().isBlank()) {
                    studentMap.put(s.getRegistrationNumber().trim().toLowerCase(), s);
                }
                if (s.getUser() != null && s.getUser().getId() != null) {
                    studentMap.put(s.getUser().getId(), s);
                }
            }
        }

        String[][] data = new String[users.size()][HEADERS.length];
        for (int i = 0; i < users.size(); i++) {
            User u = users.get(i);
            int sn = i + 1;

            String reg = u.getRegistrationNumber() != null && !u.getRegistrationNumber().isBlank()
                    ? u.getRegistrationNumber()
                    : (u.getUsername() != null ? u.getUsername() : "");

            Student matchedStudent = studentMap.get(reg.toLowerCase());
            if (matchedStudent == null && u.getId() != null) {
                matchedStudent = studentMap.get(u.getId());
            }

            String firstName = u.getFirstName() != null ? u.getFirstName() : "";
            String middleName = u.getMiddleName() != null ? u.getMiddleName() : "";
            String lastName = u.getLastName() != null ? u.getLastName() : "";
            String programme = u.getProgramme() != null ? u.getProgramme() : (matchedStudent != null ? matchedStudent.getProgramme() : "");
            String college = u.getCollege() != null ? u.getCollege() : (matchedStudent != null ? matchedStudent.getCollege() : "");
            String dept = u.getDepartment() != null ? u.getDepartment() : (matchedStudent != null ? matchedStudent.getDepartment() : "");
            String role = u.getRole() != null ? u.getRole().name() : "STUDENT";
            String email = u.getEmail() != null ? u.getEmail() : "";
            String phone = u.getPhoneNumber() != null ? u.getPhoneNumber() : "";

            String qualification = (u.getRole() == ERole.STUDENT) ? "Bachelor" : "Staff";
            String reason = u.isActive() ? "Active Clearance Account" : "Pending Verification";
            String dusComment = (matchedStudent != null && Boolean.TRUE.equals(matchedStudent.getCertificateVerified()))
                    ? "Verified & Sealed"
                    : "Pending Verification";

            data[i] = new String[] {
                String.valueOf(sn),
                reg,
                "", // Password left blank for privacy & security
                firstName,
                middleName,
                lastName,
                "", // Gender
                programme != null ? programme : "",
                "", // GPA
                "", // Classification
                qualification,
                "", // Prefix
                "MAIN CAMPUS",
                "", // Color
                college != null ? college : "",
                dept != null ? dept : "",
                role,
                email,
                phone,
                "Backend Database",
                reason,
                dusComment
            };
        }

        return data;
    }

    /**
     * Builds and saves Excel and CSV files to dynamically resolved system locations.
     */
    public static void saveSpreadsheets(String[][] data) {
        try {
            File projectRoot = resolveProjectRoot();
            byte[] excelBytes = generateExcelBytes(data);
            byte[] csvBytes = generateCsvBytes(data);

            List<File> targetExcelFiles = Arrays.asList(
                new File(projectRoot, "udsm_clearance_50_students_and_staff.xlsx"),
                new File(projectRoot, "udsm_20_students_and_staff_data.xlsx"),
                new File(projectRoot, "FRONTEND/angular-app/public/udsm_clearance_50_students_and_staff.xlsx"),
                new File(projectRoot, "FRONTEND/angular-app/public/udsm_20_students_and_staff_data.xlsx"),
                new File(projectRoot, "FRONTEND/angular-app/public/clearance_registration_template.xlsx")
            );

            List<File> targetCsvFiles = Arrays.asList(
                new File(projectRoot, "udsm_clearance_50_students_and_staff.csv"),
                new File(projectRoot, "udsm_20_students_and_staff_data.csv"),
                new File(projectRoot, "FRONTEND/angular-app/public/udsm_clearance_50_students_and_staff.csv"),
                new File(projectRoot, "FRONTEND/angular-app/public/udsm_20_students_and_staff_data.csv"),
                new File(projectRoot, "FRONTEND/angular-app/public/clearance_registration_template.csv")
            );

            for (File file : targetExcelFiles) {
                if (file.getParentFile() != null) file.getParentFile().mkdirs();
                try (FileOutputStream fos = new FileOutputStream(file)) {
                    fos.write(excelBytes);
                }
            }

            for (File file : targetCsvFiles) {
                if (file.getParentFile() != null) file.getParentFile().mkdirs();
                try (FileOutputStream fos = new FileOutputStream(file)) {
                    fos.write(csvBytes);
                }
            }
            log.info("Successfully exported {} backend records to Excel and CSV files.", data.length);
        } catch (Exception e) {
            log.error("Error saving spreadsheets from backend: {}", e.getMessage());
        }
    }

    /**
     * Generates an in-memory XSSFWorkbook byte array.
     */
    public static byte[] generateExcelBytes(String[][] data) throws Exception {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("UDSM_Clearance_Data");

            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setFontHeightInPoints((short) 11);

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            CellStyle dataCellStyle = workbook.createCellStyle();
            dataCellStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            CellStyle staffCellStyle = workbook.createCellStyle();
            staffCellStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            staffCellStyle.setFillForegroundColor(IndexedColors.LIGHT_TURQUOISE.getIndex());
            staffCellStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Create Header Row
            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(26);
            for (int col = 0; col < HEADERS.length; col++) {
                Cell cell = headerRow.createCell(col);
                cell.setCellValue(HEADERS[col]);
                cell.setCellStyle(headerStyle);
            }

            // Create Data Rows
            int rowIdx = 1;
            for (String[] rowData : data) {
                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(20);
                boolean isStaff = (rowData.length > 16 && !"STUDENT".equalsIgnoreCase(rowData[16]));
                for (int col = 0; col < rowData.length; col++) {
                    Cell cell = row.createCell(col);
                    cell.setCellValue(rowData[col] != null ? rowData[col] : "");
                    cell.setCellStyle(isStaff ? staffCellStyle : dataCellStyle);
                }
            }

            for (int col = 0; col < HEADERS.length; col++) {
                sheet.autoSizeColumn(col);
            }

            workbook.write(bos);
            return bos.toByteArray();
        }
    }

    /**
     * Generates an in-memory UTF-8 CSV byte array.
     */
    public static byte[] generateCsvBytes(String[][] data) {
        StringBuilder sb = new StringBuilder();
        sb.append(String.join(",", HEADERS)).append("\n");

        for (String[] rowData : data) {
            for (int i = 0; i < rowData.length; i++) {
                String val = rowData[i] != null ? rowData[i] : "";
                if (val.contains(",") || val.contains("\"") || val.contains("\n")) {
                    val = "\"" + val.replace("\"", "\"\"") + "\"";
                }
                sb.append(val);
                if (i < rowData.length - 1) {
                    sb.append(",");
                }
            }
            sb.append("\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Automatically resolves the project root dynamically without hardcoded machine paths.
     */
    public static File resolveProjectRoot() {
        String userDir = System.getProperty("user.dir");
        File dir = new File(userDir);

        if (dir.getName().equalsIgnoreCase("BACKEND")) {
            return dir.getParentFile();
        }

        if (new File(dir, "FRONTEND").exists()) {
            return dir;
        }

        if (dir.getParentFile() != null && new File(dir.getParentFile(), "FRONTEND").exists()) {
            return dir.getParentFile();
        }

        return dir;
    }
}
