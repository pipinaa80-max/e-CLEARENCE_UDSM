package com.UDSM.BACKEND.Service;

import com.UDSM.BACKEND.dto.ClearanceResponse;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;

@Component
public class PdfGenerator {

    public byte[] generateClearanceCertificate(ClearanceResponse response) {

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document();

        try {
            PdfWriter.getInstance(document, baos);

            document.open();

            // ==============================
            // TITLE
            // ==============================
            Font titleFont = new Font(
                    Font.HELVETICA,
                    18,
                    Font.BOLD
            );

            Paragraph title = new Paragraph(
                    "UNIVERSITY OF DAR ES SALAAM",
                    titleFont
            );

            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(5);

            document.add(title);

            Font subtitleFont = new Font(
                    Font.HELVETICA,
                    14,
                    Font.BOLD
            );

            Paragraph subtitle = new Paragraph(
                    "STUDENT CLEARANCE CERTIFICATE",
                    subtitleFont
            );

            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(20);

            document.add(subtitle);

            // ==============================
            // STUDENT INFORMATION
            // ==============================

            Font normalFont = new Font(
                    Font.HELVETICA,
                    11,
                    Font.NORMAL
            );

            Font boldFont = new Font(
                    Font.HELVETICA,
                    11,
                    Font.BOLD
            );

            Paragraph name = new Paragraph();
            name.setSpacingAfter(10);

            name.add(new com.lowagie.text.Chunk(
                    "Student Name: ",
                    boldFont
            ));

            name.add(new com.lowagie.text.Chunk(
                    response.getStudentName() != null
                            ? response.getStudentName()
                            : "-",
                    normalFont
            ));

            document.add(name);

            Paragraph reg = new Paragraph();
            reg.setSpacingAfter(10);

            reg.add(new com.lowagie.text.Chunk(
                    "Registration Number: ",
                    boldFont
            ));

            reg.add(new com.lowagie.text.Chunk(
                    response.getRegistrationNumber() != null
                            ? response.getRegistrationNumber()
                            : "-",
                    normalFont
            ));

            document.add(reg);

            Paragraph programme = new Paragraph();
            programme.setSpacingAfter(10);

            programme.add(new com.lowagie.text.Chunk(
                    "Programme: ",
                    boldFont
            ));

            programme.add(new com.lowagie.text.Chunk(
                    response.getProgramme() != null
                            ? response.getProgramme()
                            : "-",
                    normalFont
            ));

            document.add(programme);

            Paragraph faculty = new Paragraph();
            faculty.setSpacingAfter(10);

            faculty.add(new com.lowagie.text.Chunk(
                    "Faculty: ",
                    boldFont
            ));

            faculty.add(new com.lowagie.text.Chunk(
                    response.getFaculty() != null
                            ? response.getFaculty()
                            : "-",
                    normalFont
            ));

            document.add(faculty);

            Paragraph status = new Paragraph();
            status.setSpacingAfter(20);

            status.add(new com.lowagie.text.Chunk(
                    "Clearance Status: ",
                    boldFont
            ));

            status.add(new com.lowagie.text.Chunk(
                    response.getStatus() != null
                            ? response.getStatus().toString()
                            : "-",
                    normalFont
            ));

            document.add(status);

            // ==============================
            // DEPARTMENT APPROVALS
            // ==============================

            if (response.getApprovals() != null
                    && !response.getApprovals().isEmpty()) {

                Paragraph approvalTitle = new Paragraph(
                        "CLEARANCE APPROVALS",
                        boldFont
                );

                approvalTitle.setSpacingAfter(10);

                document.add(approvalTitle);

                PdfPTable table = new PdfPTable(4);

                table.setWidthPercentage(100);

                // Table headers
                table.addCell("Department");
                table.addCell("Status");
                table.addCell("Approved By");
                table.addCell("Approval Date");

                // Table data
                for (ClearanceResponse.DepartmentApprovalDTO approval
                        : response.getApprovals()) {

                    table.addCell(
                            approval.getDepartmentName() != null
                                    ? approval.getDepartmentName()
                                    : "-"
                    );

                    table.addCell(
                            approval.getStatus() != null
                                    ? approval.getStatus().toString()
                                    : "-"
                    );

                    table.addCell(
                            approval.getApprovedBy() != null
                                    ? approval.getApprovedBy()
                                    : "-"
                    );

                    table.addCell(
                            approval.getApprovalDate() != null
                                    ? approval.getApprovalDate().toString()
                                    : "-"
                    );
                }

                document.add(table);
            }

            // ==============================
            // FOOTER
            // ==============================

            Paragraph footer = new Paragraph(
                    "\nThis certificate confirms that the above student "
                            + "has completed the required clearance process.",
                    normalFont
            );

            footer.setSpacingBefore(20);

            document.add(footer);

            document.close();

            return baos.toByteArray();

        } catch (DocumentException e) {

            throw new RuntimeException(
                    "Failed to generate clearance certificate PDF",
                    e
            );

        } finally {

            if (document.isOpen()) {
                document.close();
            }
        }
    }
}