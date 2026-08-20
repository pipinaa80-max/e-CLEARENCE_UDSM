package com.UDSM.BACKEND.Service;
import com.UDSM.BACKEND.dto.ClearanceResponse;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Component;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Component
public class PdfGenerator {

    public byte[] generateClearanceCertificate(ClearanceResponse response) {

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document();

        String certificateId =
                "UDSM-CLR-"
                        + LocalDateTime.now().getYear()
                        + "-"
                        + UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        .substring(0, 16)
                        .toUpperCase();

        /*
         * ==========================================================
         * QR VERIFICATION URL
         * ==========================================================
         *
         * During development we use localhost.
         *
         * Later change this to your real verification URL, for
         * example:
         *
         * https://clearance.jmsolution.co.tz/verify/
         *
         */
        String verificationUrl =
                "http://localhost:4200/verify/"
                        + certificateId;

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

            // =====================================================
            // UNIQUE CERTIFICATE INFORMATION
            // =====================================================

            Paragraph certificateIdParagraph =
                    new Paragraph();

            certificateIdParagraph.setSpacingBefore(15);
            certificateIdParagraph.setSpacingAfter(5);

            certificateIdParagraph.add(
                    new com.lowagie.text.Chunk(
                            "Certificate ID: ",
                            boldFont
                    )
            );

            certificateIdParagraph.add(
                    new com.lowagie.text.Chunk(
                            certificateId,
                            normalFont
                    )
            );

            document.add(certificateIdParagraph);

            Paragraph generatedDate =
                    new Paragraph();

            generatedDate.setSpacingAfter(10);

            generatedDate.add(
                    new com.lowagie.text.Chunk(
                            "Generated: ",
                            boldFont
                    )
            );

            generatedDate.add(
                    new com.lowagie.text.Chunk(
                            LocalDateTime.now().format(
                                    DateTimeFormatter.ofPattern(
                                            "dd MMMM yyyy HH:mm:ss"
                                    )
                            ),
                            normalFont
                    )
            );

            document.add(generatedDate);

            // =====================================================
            // QR CODE
            // =====================================================

            try {

                QRCodeWriter qrCodeWriter =
                        new QRCodeWriter();

                BitMatrix bitMatrix =
                        qrCodeWriter.encode(
                                verificationUrl,
                                BarcodeFormat.QR_CODE,
                                250,
                                250
                        );

                ByteArrayOutputStream qrOutputStream =
                        new ByteArrayOutputStream();

                MatrixToImageWriter.writeToStream(
                        bitMatrix,
                        "PNG",
                        qrOutputStream
                );

                byte[] qrBytes =
                        qrOutputStream.toByteArray();

                Image qrImage =
                        Image.getInstance(qrBytes);

                qrImage.scaleToFit(130, 130);

                qrImage.setAlignment(
                        Element.ALIGN_CENTER
                );

                document.add(qrImage);

                Paragraph qrText =
                        new Paragraph(
                                "Scan to verify this certificate",
                                normalFont
                        );

                qrText.setAlignment(
                        Element.ALIGN_CENTER
                );

                qrText.setSpacingBefore(5);
                qrText.setSpacingAfter(10);

                document.add(qrText);

            } catch (WriterException | IOException e) {

                throw new RuntimeException(
                        "Failed to generate QR code",
                        e
                );
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