package com.UDSM.BACKEND.util;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.File;
import java.io.FileOutputStream;

public class ExcelDataGenerator {

    public static void main(String[] args) {
        generateExcelFiles();
    }

    public static void generateExcelFiles() {
        String[] headers = {
            "SN", "Registration", "Password", "First Name", "Other Name", "Surname", "Gender",
            "Programme", "GPA", "Classification", "Qualification", "Prefix", "Campus",
            "Color", "College", "Department", "Role", "Email", "Phone", "Added By", "Reason", "DUS COMMENT"
        };

        String[][] data = {
            // 35 Students across different colleges, departments and programmes
            {"1", "2020-04-02302", "2020-04-02302", "Fatuma", "Abedi", "Hemedi", "F", "Bachelor of Arts in Literature and Study", "2.5", "PASS", "Bachelor", "BALS", "MAIN CAMPUS", "", "CoHU", "Literature", "STUDENT", "fatuma.hemedi@udsm.ac.tz", "+255712000001", "System", "Automatically added on Sat, 20 Sep 2025 20:56:00", "OK"},
            {"2", "2017-04-05478", "2017-04-05478", "Oswald", "Jairos", "Mwansele", "M", "Bachelor of Arts in Economics", "3.4", "Second Class, Lower Division", "Bachelor", "B.A. Econ.", "MAIN CAMPUS", "", "UDSE", "Economics", "STUDENT", "oswald.mwansele@udsm.ac.tz", "+255712000002", "System", "Automatically added on Sat, 20 Sep 2025 20:56:00", "OK"},
            {"3", "2018-04-00125", "2018-04-00125", "Ntuli", "Obeid", "Mwakalinga", "F", "Bachelor of Arts in Economics", "3.2", "Second Class, Lower Division", "Bachelor", "B.A. Econ.", "MAIN CAMPUS", "", "UDSE", "Economics", "STUDENT", "ntuli.mwakalinga@udsm.ac.tz", "+255712000003", "System", "Automatically added on Sat, 20 Sep 2025 20:56:00", "OK"},
            {"4", "2020-04-00724", "2020-04-00724", "Nshillahe", "Thomas", "Bigage", "F", "Bachelor of Arts in Economics", "2.9", "Second Class, Lower Division", "Bachelor", "B.A. Econ.", "MAIN CAMPUS", "", "UDSE", "Economics", "STUDENT", "nshillahe.bigage@udsm.ac.tz", "+255712000004", "System", "Automatically added on Sat, 20 Sep 2025 20:56:00", "OK"},
            {"5", "2020-04-12253", "2020-04-12253", "Sarah", "Emmanuel", "Ulomi", "F", "Bachelor of Arts in Economics", "2.6", "PASS", "Bachelor", "B.A. Econ.", "MAIN CAMPUS", "", "UDSE", "Economics", "STUDENT", "sarah.ulomi@udsm.ac.tz", "+255712000005", "System", "Results release as approved 30.06.2025", "OK"},
            {"6", "2021-04-03112", "2021-04-03112", "Baraka", "Joseph", "Mrema", "M", "Bachelor of Science in Computer Science", "4.1", "First Class", "Bachelor", "BSc. CS", "MAIN CAMPUS", "", "CoICT", "Computer Science & Engineering", "STUDENT", "baraka.mrema@udsm.ac.tz", "+255712000006", "System", "Graduation clearance list approved", "OK"},
            {"7", "2021-04-08945", "2021-04-08945", "Diana", "Charles", "Kimaro", "F", "Bachelor of Science in Business Information Technology", "3.8", "Second Class, Upper Division", "Bachelor", "BSc. BIT", "MAIN CAMPUS", "", "CoICT", "Computer Science & Engineering", "STUDENT", "diana.kimaro@udsm.ac.tz", "+255712000007", "System", "Graduation clearance list approved", "OK"},
            {"8", "2022-04-01589", "2022-04-01589", "Kelvin", "Peter", "Shirima", "M", "Bachelor of Science in Civil Engineering", "3.6", "Second Class, Upper Division", "Bachelor", "BSc. CE", "MAIN CAMPUS", "", "CoET", "Civil Engineering", "STUDENT", "kelvin.shirima@udsm.ac.tz", "+255712000008", "System", "Graduation clearance list approved", "OK"},
            {"9", "2022-04-04781", "2022-04-04781", "Aneth", "Lucas", "Massawe", "F", "Bachelor of Science in Mechanical Engineering", "3.5", "Second Class, Upper Division", "Bachelor", "BSc. ME", "MAIN CAMPUS", "", "CoET", "Mechanical Engineering", "STUDENT", "aneth.massawe@udsm.ac.tz", "+255712000009", "System", "Graduation clearance list approved", "OK"},
            {"10", "2023-04-05512", "2023-04-05512", "Joshua", "David", "Mushi", "M", "Bachelor of Commerce in Accounting", "3.9", "Second Class, Upper Division", "Bachelor", "B.Com. Acc", "MAIN CAMPUS", "", "UDBS", "Accounting", "STUDENT", "joshua.mushi@udsm.ac.tz", "+255712000010", "System", "Graduation clearance list approved", "OK"},
            {"11", "2023-04-09923", "2023-04-09923", "Mary", "Godfrey", "Temu", "F", "Bachelor of Commerce in Finance", "4.2", "First Class", "Bachelor", "B.Com. Fin", "MAIN CAMPUS", "", "UDBS", "Finance", "STUDENT", "mary.temu@udsm.ac.tz", "+255712000011", "System", "Graduation clearance list approved", "OK"},
            {"12", "2024-04-01290", "2024-04-01290", "Erick", "Raymond", "Moshi", "M", "Bachelor of Science in Molecular Biology and Biotechnology", "3.7", "Second Class, Upper Division", "Bachelor", "BSc. MBB", "MAIN CAMPUS", "", "CoNAS", "Molecular Biology", "STUDENT", "erick.moshi@udsm.ac.tz", "+255712000012", "System", "Graduation clearance list approved", "OK"},
            {"13", "2024-04-06734", "2024-04-06734", "Neema", "Zakaria", "Mallya", "F", "Bachelor of Science in Chemistry", "3.1", "Second Class, Lower Division", "Bachelor", "BSc. Chem", "MAIN CAMPUS", "", "CoNAS", "Chemistry", "STUDENT", "neema.mallya@udsm.ac.tz", "+255712000013", "System", "Graduation clearance list approved", "OK"},
            {"14", "2025-04-00341", "2025-04-00341", "Godfrey", "Aloyce", "Mwamba", "M", "Bachelor of Science in Computer Engineering", "3.9", "Second Class, Upper Division", "Bachelor", "BSc. CE", "MAIN CAMPUS", "", "CoICT", "Computer Science & Engineering", "STUDENT", "godfrey.mwamba@udsm.ac.tz", "+255712000014", "System", "Graduation clearance list approved", "OK"},
            {"15", "2025-04-08872", "2025-04-08872", "Irene", "Simon", "Lyimo", "F", "Bachelor of Arts with Education", "3.5", "Second Class, Upper Division", "Bachelor", "B.A. Ed.", "MAIN CAMPUS", "", "SoED", "Educational Psychology", "STUDENT", "irene.lyimo@udsm.ac.tz", "+255712000015", "System", "Graduation clearance list approved", "OK"},
            {"16", "2025-04-10023", "2025-04-10023", "Dennis", "Francis", "Ndunguru", "M", "Bachelor of Laws", "3.6", "Second Class, Upper Division", "Bachelor", "LL.B", "MAIN CAMPUS", "", "UDSoL", "Public Law", "STUDENT", "dennis.ndunguru@udsm.ac.tz", "+255712000016", "System", "Graduation clearance list approved", "OK"},
            {"17", "2026-04-00109", "2026-04-00109", "Asha", "Salum", "Bakari", "F", "Bachelor of Science in Electrical Engineering", "4.0", "First Class", "Bachelor", "BSc. EE", "MAIN CAMPUS", "", "CoET", "Electrical Engineering", "STUDENT", "asha.bakari@udsm.ac.tz", "+255712000017", "System", "Graduation clearance list approved", "OK"},
            {"18", "2026-04-02315", "2026-04-02315", "Michael", "Leonard", "Makundi", "M", "Bachelor of Science in Telecommunications Engineering", "3.3", "Second Class, Lower Division", "Bachelor", "BSc. TE", "MAIN CAMPUS", "", "CoICT", "Telecommunications", "STUDENT", "michael.makundi@udsm.ac.tz", "+255712000018", "System", "Graduation clearance list approved", "OK"},
            {"19", "2026-04-07741", "2026-04-07741", "Zainab", "Rashid", "Juma", "F", "Bachelor of Arts in Political Science and Public Administration", "3.4", "Second Class, Lower Division", "Bachelor", "B.A. PSPA", "MAIN CAMPUS", "", "CoSS", "Political Science", "STUDENT", "zainab.juma@udsm.ac.tz", "+255712000019", "System", "Graduation clearance list approved", "OK"},
            {"20", "2026-04-11984", "2026-04-11984", "Brian", "Christopher", "Tarimo", "M", "Bachelor of Science in Computer Science", "4.3", "First Class", "Bachelor", "BSc. CS", "MAIN CAMPUS", "", "CoICT", "Computer Science & Engineering", "STUDENT", "brian.tarimo@udsm.ac.tz", "+255712000020", "System", "Graduation clearance list approved", "OK"},
            {"21", "2021-04-04421", "2021-04-04421", "Hassan", "Ally", "Mwinyi", "M", "Bachelor of Arts in History", "3.1", "Second Class, Lower Division", "Bachelor", "B.A. Hist.", "MAIN CAMPUS", "", "CoHU", "History", "STUDENT", "hassan.mwinyi@udsm.ac.tz", "+255712000036", "System", "Graduation clearance list approved", "OK"},
            {"22", "2021-04-06109", "2021-04-06109", "Faraja", "Eliud", "Mdegella", "F", "Bachelor of Arts in Philosophy", "3.6", "Second Class, Upper Division", "Bachelor", "B.A. Phil.", "MAIN CAMPUS", "", "CoHU", "Philosophy", "STUDENT", "faraja.mdegella@udsm.ac.tz", "+255712000037", "System", "Graduation clearance list approved", "OK"},
            {"23", "2022-04-02231", "2022-04-02231", "Emmanuel", "Daudi", "Kitila", "M", "Bachelor of Science in Chemical Engineering", "3.7", "Second Class, Upper Division", "Bachelor", "BSc. ChE", "MAIN CAMPUS", "", "CoET", "Chemical Engineering", "STUDENT", "emmanuel.kitila@udsm.ac.tz", "+255712000038", "System", "Graduation clearance list approved", "OK"},
            {"24", "2022-04-08842", "2022-04-08842", "Pendo", "Jackson", "Shayo", "F", "Bachelor of Science in Mining Engineering", "3.4", "Second Class, Lower Division", "Bachelor", "BSc. Min", "MAIN CAMPUS", "", "CoET", "Mining Engineering", "STUDENT", "pendo.shayo@udsm.ac.tz", "+255712000039", "System", "Graduation clearance list approved", "OK"},
            {"25", "2023-04-01190", "2023-04-01190", "Frank", "Richard", "Mgonja", "M", "Bachelor of Business Administration", "3.8", "Second Class, Upper Division", "Bachelor", "BBA", "MAIN CAMPUS", "", "UDBS", "General Business", "STUDENT", "frank.mgonja@udsm.ac.tz", "+255712000040", "System", "Graduation clearance list approved", "OK"},
            {"26", "2023-04-07712", "2023-04-07712", "Halima", "Ramadhani", "Saidi", "F", "Bachelor of Commerce in Marketing", "3.5", "Second Class, Upper Division", "Bachelor", "B.Com. Mkt", "MAIN CAMPUS", "", "UDBS", "Marketing", "STUDENT", "halima.saidi@udsm.ac.tz", "+255712000041", "System", "Graduation clearance list approved", "OK"},
            {"27", "2024-04-03319", "2024-04-03319", "Daudi", "Lazaro", "Mlay", "M", "Bachelor of Science in Applied Mathematics", "4.1", "First Class", "Bachelor", "BSc. Math", "MAIN CAMPUS", "", "CoNAS", "Mathematics", "STUDENT", "daudi.mlay@udsm.ac.tz", "+255712000042", "System", "Graduation clearance list approved", "OK"},
            {"28", "2024-04-09941", "2024-04-09941", "Rehema", "Moses", "Kweka", "F", "Bachelor of Science in Physics", "3.2", "Second Class, Lower Division", "Bachelor", "BSc. Phys", "MAIN CAMPUS", "", "CoNAS", "Physics", "STUDENT", "rehema.kweka@udsm.ac.tz", "+255712000043", "System", "Graduation clearance list approved", "OK"},
            {"29", "2024-04-12005", "2024-04-12005", "James", "Robert", "Mrosso", "M", "Bachelor of Science in Geology", "3.6", "Second Class, Upper Division", "Bachelor", "BSc. Geo", "MAIN CAMPUS", "", "CoNAS", "Geology", "STUDENT", "james.mrosso@udsm.ac.tz", "+255712000044", "System", "Graduation clearance list approved", "OK"},
            {"30", "2025-04-01102", "2025-04-01102", "Witness", "Prosper", "Lyatuu", "F", "Bachelor of Education in Science", "3.8", "Second Class, Upper Division", "Bachelor", "B.Ed. Sc", "MAIN CAMPUS", "", "SoED", "Curriculum Studies", "STUDENT", "witness.lyatuu@udsm.ac.tz", "+255712000045", "System", "Graduation clearance list approved", "OK"},
            {"31", "2025-04-05567", "2025-04-05567", "Said", "Bakari", "Msangi", "M", "Bachelor of Education in Arts", "3.3", "Second Class, Lower Division", "Bachelor", "B.Ed. Arts", "MAIN CAMPUS", "", "SoED", "Educational Foundations", "STUDENT", "said.msangi@udsm.ac.tz", "+255712000046", "System", "Graduation clearance list approved", "OK"},
            {"32", "2025-04-09914", "2025-04-09914", "Gloria", "Festo", "Masanja", "F", "Bachelor of Laws", "3.9", "Second Class, Upper Division", "Bachelor", "LL.B", "MAIN CAMPUS", "", "UDSoL", "Private Law", "STUDENT", "gloria.masanja@udsm.ac.tz", "+255712000047", "System", "Graduation clearance list approved", "OK"},
            {"33", "2026-04-03388", "2026-04-03388", "Victor", "Gabriel", "Temba", "M", "Bachelor of Arts in Sociology", "3.5", "Second Class, Upper Division", "Bachelor", "B.A. Soc", "MAIN CAMPUS", "", "CoSS", "Sociology", "STUDENT", "victor.temba@udsm.ac.tz", "+255712000048", "System", "Graduation clearance list approved", "OK"},
            {"34", "2026-04-08120", "2026-04-08120", "Amina", "Omari", "Kipingu", "F", "Bachelor of Arts in Journalism", "3.7", "Second Class, Upper Division", "Bachelor", "B.A. Journ", "MAIN CAMPUS", "", "SJMC", "Journalism", "STUDENT", "amina.kipingu@udsm.ac.tz", "+255712000049", "System", "Graduation clearance list approved", "OK"},
            {"35", "2026-04-12345", "2026-04-12345", "Festo", "Yohana", "Mrema", "M", "Bachelor of Science in Aquatic Sciences", "3.6", "Second Class, Upper Division", "Bachelor", "BSc. Aquat", "MAIN CAMPUS", "", "IMS", "Aquatic Sciences", "STUDENT", "festo.mrema@udsm.ac.tz", "+255712000050", "System", "Graduation clearance list approved", "OK"},

            // 15 Staff from different offices and departments
            {"36", "STF-LIB-001", "STF-LIB-001", "Grace", "Martha", "Mlay", "F", "University Library", "4.0", "Head Librarian", "Staff", "LIB", "MAIN CAMPUS", "", "LIBRARY", "Library Services", "LIBRARY", "library.officer@udsm.ac.tz", "+255712000021", "System", "Staff clearance registration", "OK"},
            {"37", "STF-SPO-002", "STF-SPO-002", "Baraka", "Julius", "Mwambene", "M", "Sports and Games Department", "3.8", "Sports Officer", "Staff", "SPO", "MAIN CAMPUS", "", "GAMES", "Sports & Recreation", "GAMES_COACH", "sports.officer@udsm.ac.tz", "+255712000022", "System", "Staff clearance registration", "OK"},
            {"38", "STF-WRD-003", "STF-WRD-003", "Rehema", "Said", "Kessy", "F", "Accommodation & Halls of Residence", "3.9", "Chief Hall Warden", "Staff", "WRD", "MAIN CAMPUS", "", "HALL_WARDEN", "Student Accommodation", "WARDEN", "warden.officer@udsm.ac.tz", "+255712000023", "System", "Staff clearance registration", "OK"},
            {"39", "STF-USB-004", "STF-USB-004", "Juma", "Kassim", "Mfaume", "M", "University Students Auxiliary Board", "3.7", "USAB Officer", "Staff", "USB", "MAIN CAMPUS", "", "USAB", "Student Services", "USAB", "usab.officer@udsm.ac.tz", "+255712000024", "System", "Staff clearance registration", "OK"},
            {"40", "STF-DAR-005", "STF-DAR-005", "Joseph", "Elias", "Mrope", "M", "Dar es Salaam University Students Org", "3.8", "DARUSO Officer", "Staff", "DAR", "MAIN CAMPUS", "", "DARUSO", "Student Government", "DARUSO", "daruso.officer@udsm.ac.tz", "+255712000025", "System", "Staff clearance registration", "OK"},
            {"41", "STF-DOS-006", "STF-DOS-006", "Paul", "Lucas", "Makonda", "M", "Dean of Students Office", "4.2", "Dean of Students", "Staff", "DOS", "MAIN CAMPUS", "", "DEAN_OF_STUDENTS", "Dean of Students", "DEAN_OF_STUDENTS", "dos.officer@udsm.ac.tz", "+255712000026", "System", "Staff clearance registration", "OK"},
            {"42", "STF-SMC-007", "STF-SMC-007", "Aisha", "Ramadhani", "Salum", "F", "Smart Card & Identification Bureau", "3.9", "Smart Card Officer", "Staff", "SMC", "MAIN CAMPUS", "", "SMART_CARD", "Student Identification", "SMART_CARD", "smartcard.officer@udsm.ac.tz", "+255712000027", "System", "Staff clearance registration", "OK"},
            {"43", "STF-DPT-CSE", "STF-DPT-CSE", "Joseph", "Modestus", "Mushi", "M", "Department of Computer Science & Engineering", "4.5", "Head of Department", "Staff", "DPT", "MAIN CAMPUS", "", "CoICT", "Computer Science & Engineering", "DEPARTMENT", "cs.department@udsm.ac.tz", "+255712000028", "System", "Staff clearance registration", "OK"},
            {"44", "STF-DPT-CIV", "STF-DPT-CIV", "Emmanuel", "John", "Mchome", "M", "Department of Civil Engineering", "4.4", "Head of Department", "Staff", "DPT", "MAIN CAMPUS", "", "CoET", "Civil Engineering", "DEPARTMENT", "civil.department@udsm.ac.tz", "+255712000029", "System", "Staff clearance registration", "OK"},
            {"45", "STF-DPT-ECO", "STF-DPT-ECO", "Farida", "Said", "Mkude", "F", "Department of Economics", "4.3", "Head of Department", "Staff", "DPT", "MAIN CAMPUS", "", "UDSE", "Economics", "DEPARTMENT", "econ.department@udsm.ac.tz", "+255712000030", "System", "Staff clearance registration", "OK"},
            {"46", "STF-PRN-ICT", "STF-PRN-ICT", "Aloys", "Nicholaus", "Mvuma", "M", "Office of the Principal CoICT", "4.8", "College Principal", "Staff", "PRN", "MAIN CAMPUS", "", "CoICT", "Principal Office", "PRINCIPAL", "principal.coict@udsm.ac.tz", "+255712000031", "System", "Staff clearance registration", "OK"},
            {"47", "STF-PRN-ENG", "STF-PRN-ENG", "Bakari", "Mohamed", "Mwinyi", "M", "Office of the Principal CoET", "4.7", "College Principal", "Staff", "PRN", "MAIN CAMPUS", "", "CoET", "Principal Office", "PRINCIPAL", "principal.coet@udsm.ac.tz", "+255712000032", "System", "Staff clearance registration", "OK"},
            {"48", "STF-FIN-010", "STF-FIN-010", "Charles", "Edward", "Mmbando", "M", "Bursar / Directorate of Finance", "4.4", "Finance Officer", "Staff", "FIN", "MAIN CAMPUS", "", "FINANCE", "Bursar & Treasury", "FINANCE", "finance.officer@udsm.ac.tz", "+255712000033", "System", "Staff clearance registration", "OK"},
            {"49", "STF-DUS-011", "STF-DUS-011", "Beatrice", "Agnes", "Lyimo", "F", "Directorate of Undergraduate Studies", "4.7", "Director DUS", "Staff", "DUS", "MAIN CAMPUS", "", "DUS", "Undergraduate Studies", "DUS", "dus.director@udsm.ac.tz", "+255712000034", "System", "Staff clearance registration", "OK"},
            {"50", "STF-ADM-012", "STF-ADM-012", "Godfrey", "Kelvin", "Mulimila", "M", "Centre for Virtual Learning / DIT", "4.9", "System Administrator", "Staff", "ADM", "MAIN CAMPUS", "", "DIT", "Information Technology", "ADMIN", "admin.dit@udsm.ac.tz", "+255712000035", "System", "Staff clearance registration", "OK"}
        };

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("UDSM_Clearance_Data");

            // Header styling
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setFontHeightInPoints((short) 11);

            CellStyle headerCellStyle = workbook.createCellStyle();
            headerCellStyle.setFont(headerFont);
            headerCellStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerCellStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerCellStyle.setAlignment(HorizontalAlignment.CENTER);
            headerCellStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            // Password highlight header
            CellStyle passwordHeaderStyle = workbook.createCellStyle();
            passwordHeaderStyle.setFont(headerFont);
            passwordHeaderStyle.setFillForegroundColor(IndexedColors.DARK_RED.getIndex());
            passwordHeaderStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            passwordHeaderStyle.setAlignment(HorizontalAlignment.CENTER);
            passwordHeaderStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            // Data styling
            CellStyle dataCellStyle = workbook.createCellStyle();
            dataCellStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            // Staff highlight style
            CellStyle staffCellStyle = workbook.createCellStyle();
            staffCellStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            staffCellStyle.setFillForegroundColor(IndexedColors.LIGHT_TURQUOISE.getIndex());
            staffCellStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Create Header Row
            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(26);
            for (int col = 0; col < headers.length; col++) {
                Cell cell = headerRow.createCell(col);
                cell.setCellValue(headers[col]);
                cell.setCellStyle("Password".equals(headers[col]) ? passwordHeaderStyle : headerCellStyle);
            }

            // Create Data Rows
            int rowIdx = 1;
            for (String[] rowData : data) {
                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(20);
                boolean isStaff = "Staff".equalsIgnoreCase(rowData[10]) || !"STUDENT".equalsIgnoreCase(rowData[16]);
                for (int col = 0; col < rowData.length; col++) {
                    Cell cell = row.createCell(col);
                    cell.setCellValue(rowData[col]);
                    cell.setCellStyle(isStaff ? staffCellStyle : dataCellStyle);
                }
            }

            // Autosize columns
            for (int col = 0; col < headers.length; col++) {
                sheet.autoSizeColumn(col);
            }

            // Output files
            String[] targetPaths = {
                "/home/mulimila/e-CLEARENCE_UDSM/udsm_clearance_50_students_and_staff.xlsx",
                "/home/mulimila/e-CLEARENCE_UDSM/FRONTEND/angular-app/public/udsm_clearance_50_students_and_staff.xlsx",
                "/home/mulimila/e-CLEARENCE_UDSM/udsm_20_students_and_staff_data.xlsx",
                "/home/mulimila/e-CLEARENCE_UDSM/FRONTEND/angular-app/public/udsm_20_students_and_staff_data.xlsx"
            };

            for (String path : targetPaths) {
                File file = new File(path);
                file.getParentFile().mkdirs();
                try (FileOutputStream fos = new FileOutputStream(file)) {
                    workbook.write(fos);
                }
                System.out.println("Successfully generated Excel file: " + file.getAbsolutePath());
            }

            // Also output CSV files
            String[] csvTargetPaths = {
                "/home/mulimila/e-CLEARENCE_UDSM/udsm_clearance_50_students_and_staff.csv",
                "/home/mulimila/e-CLEARENCE_UDSM/FRONTEND/angular-app/public/udsm_clearance_50_students_and_staff.csv",
                "/home/mulimila/e-CLEARENCE_UDSM/udsm_20_students_and_staff_data.csv",
                "/home/mulimila/e-CLEARENCE_UDSM/FRONTEND/angular-app/public/udsm_20_students_and_staff_data.csv"
            };

            StringBuilder sb = new StringBuilder();
            sb.append(String.join(",", headers)).append("\n");
            for (String[] rowData : data) {
                for (int i = 0; i < rowData.length; i++) {
                    String val = rowData[i];
                    if (val.contains(",") || val.contains("\"")) {
                        val = "\"" + val.replace("\"", "\"\"") + "\"";
                    }
                    sb.append(val);
                    if (i < rowData.length - 1) {
                        sb.append(",");
                    }
                }
                sb.append("\n");
            }

            for (String path : csvTargetPaths) {
                File file = new File(path);
                file.getParentFile().mkdirs();
                try (FileOutputStream fos = new FileOutputStream(file)) {
                    fos.write(sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
                }
                System.out.println("Successfully generated CSV file: " + file.getAbsolutePath());
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
