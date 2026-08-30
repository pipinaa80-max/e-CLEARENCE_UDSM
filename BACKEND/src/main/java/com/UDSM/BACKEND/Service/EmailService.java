package com.UDSM.BACKEND.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

import com.UDSM.BACKEND.Model.Student;
import com.UDSM.BACKEND.Model.User;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

@Slf4j
@Service
public class EmailService {
    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;

    @Value("${spring.mail.username}")
    private String fromEmail;
    @Value("${app.frontend-url}")
    private String frontendUrl;
    @Value("${app.base-url}")
    private String baseUrl;
    @Value("${app.name}")
    private String appName;

    private static final int BATCH_SIZE = 50; // Adjust based on your SMTP limits

    public EmailService(final JavaMailSender mailSender, final SpringTemplateEngine templateEngine) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
    }

    // ============ EXISTING METHODS (FIXED) ============

    @Async
    public CompletableFuture<Boolean> sendHtmlEmail(String to, String subject, String htmlContent) {
        try {
            MimeMessage message = this.mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(this.fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            this.mailSender.send(message);
            log.info("Email sent successfully to: {}", to);
            return CompletableFuture.completedFuture(true);
        } catch (MessagingException e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
            return CompletableFuture.completedFuture(false);
        }
    }

    @Async
    public CompletableFuture<Boolean> sendEmailWithAttachment(String to, String subject,
                                                              String htmlContent,
                                                              byte[] attachmentData,
                                                              String attachmentType,
                                                              String attachmentName) {
        try {
            MimeMessage message = this.mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(this.fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            if (attachmentData != null && attachmentData.length > 0) {
                ByteArrayResource resource = new ByteArrayResource(attachmentData);
                helper.addAttachment(attachmentName != null ? attachmentName : "attachment.pdf", resource);
            }

            this.mailSender.send(message);
            log.info("Email with attachment sent successfully to: {}", to);
            return CompletableFuture.completedFuture(true);
        } catch (MessagingException e) {
            log.error("Failed to send email with attachment to {}: {}", to, e.getMessage());
            return CompletableFuture.completedFuture(false);
        }
    }

    @Async
    public CompletableFuture<Boolean> sendTemplatedEmail(String to, String subject,
                                                         String templateName,
                                                         Map<String, Object> variables) {
        try {
            // Fix: Create proper Context with variables
            Context context = new Context();
            if (variables != null) {
                context.setVariables(variables);
            }

            // Process the template
            String htmlContent = templateEngine.process(templateName, context);

            // Send using HTML email
            return sendHtmlEmail(to, subject, htmlContent);
        } catch (Exception e) {
            log.error("Failed to send templated email to {}: {}", to, e.getMessage());
            return CompletableFuture.completedFuture(false);
        }
    }

    // ============ NEW METHODS FOR MULTIPLE RECIPIENTS ============

    /**
     * Send email to multiple recipients (visible to all)
     */
    @Async
    public CompletableFuture<Boolean> sendEmailToMultipleRecipients(List<String> toEmails,
                                                                    String subject,
                                                                    String htmlContent) {
        try {
            if (toEmails == null || toEmails.isEmpty()) {
                log.warn("No recipients provided");
                return CompletableFuture.completedFuture(false);
            }

            MimeMessage message = this.mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(this.fromEmail);
            helper.setTo(toEmails.toArray(new String[0])); // All recipients visible
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            this.mailSender.send(message);
            log.info("Email sent to {} recipients", toEmails.size());
            return CompletableFuture.completedFuture(true);
        } catch (MessagingException e) {
            log.error("Failed to send email to multiple recipients: {}", e.getMessage());
            return CompletableFuture.completedFuture(false);
        }
    }

    /**
     * Send email with CC and BCC options
     */
    @Async
    public CompletableFuture<Boolean> sendEmailWithCCAndBCC(List<String> toEmails,
                                                            List<String> ccEmails,
                                                            List<String> bccEmails,
                                                            String subject,
                                                            String htmlContent) {
        try {
            MimeMessage message = this.mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(this.fromEmail);

            if (toEmails != null && !toEmails.isEmpty()) {
                helper.setTo(toEmails.toArray(new String[0]));
            }
            if (ccEmails != null && !ccEmails.isEmpty()) {
                helper.setCc(ccEmails.toArray(new String[0]));
            }
            if (bccEmails != null && !bccEmails.isEmpty()) {
                helper.setBcc(bccEmails.toArray(new String[0]));
            }

            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            this.mailSender.send(message);
            log.info("Email sent to {} recipients with CC: {} and BCC: {}",
                    toEmails != null ? toEmails.size() : 0,
                    ccEmails != null ? ccEmails.size() : 0,
                    bccEmails != null ? bccEmails.size() : 0);
            return CompletableFuture.completedFuture(true);
        } catch (MessagingException e) {
            log.error("Failed to send email with CC/BCC: {}", e.getMessage());
            return CompletableFuture.completedFuture(false);
        }
    }

    /**
     * Send batch emails (one email per recipient for personalization)
     */
    @Async
    public CompletableFuture<Map<String, Boolean>> sendBatchEmails(List<String> recipients,
                                                                   String subject,
                                                                   String templateName,
                                                                   Map<String, Object> baseVariables) {
        Map<String, Boolean> results = new HashMap<>();

        // Process in batches
        List<List<String>> batches = partition(recipients, BATCH_SIZE);

        for (List<String> batch : batches) {
            try {
                MimeMessage[] messages = new MimeMessage[batch.size()];

                for (int i = 0; i < batch.size(); i++) {
                    String recipient = batch.get(i);

                    // Create personalized context for each recipient
                    Context context = new Context();
                    Map<String, Object> personalVariables = new HashMap<>(baseVariables);
                    personalVariables.put("recipientEmail", recipient);
                    context.setVariables(personalVariables);

                    String htmlContent = templateEngine.process(templateName, context);

                    MimeMessage message = this.mailSender.createMimeMessage();
                    MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
                    helper.setFrom(this.fromEmail);
                    helper.setTo(recipient);
                    helper.setSubject(subject);
                    helper.setText(htmlContent, true);

                    messages[i] = message;
                    results.put(recipient, true);
                }

                // Send batch
                this.mailSender.send(messages);
                log.info("Batch of {} emails sent successfully", batch.size());

                // Add delay between batches to avoid rate limiting
                Thread.sleep(1000);

            } catch (MessagingException | InterruptedException e) {
                log.error("Error sending batch: {}", e.getMessage());
                // Mark failed recipients in this batch
                for (String recipient : batch) {
                    results.put(recipient, false);
                }
                Thread.currentThread().interrupt();
            }
        }

        return CompletableFuture.completedFuture(results);
    }

    /**
     * Send templated email to multiple recipients with personalization
     */
    @Async
    public CompletableFuture<Map<String, Boolean>> sendTemplatedEmailToMultipleRecipients(
            List<String> recipients,
            String subject,
            String templateName,
            Map<String, Object> baseVariables) {

        Map<String, Boolean> results = new HashMap<>();

        for (String recipient : recipients) {
            try {
                // Create personalized context
                Context context = new Context();
                Map<String, Object> personalVariables = new HashMap<>(baseVariables);
                personalVariables.put("recipientEmail", recipient);
                context.setVariables(personalVariables);

                String htmlContent = templateEngine.process(templateName, context);

                CompletableFuture<Boolean> future = sendHtmlEmail(recipient, subject, htmlContent);
                results.put(recipient, future.join());

            } catch (Exception e) {
                log.error("Failed to send templated email to {}: {}", recipient, e.getMessage());
                results.put(recipient, false);
            }
        }

        return CompletableFuture.completedFuture(results);
    }

    // ============ EXISTING BUSINESS METHODS (FIXED) ============

    @Async
    public void sendWelcomeEmail(String to, String name, String smartClearanceUdsm) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("name", name);
        variables.put("appName", this.appName);
        variables.put("frontendUrl", this.frontendUrl);
        variables.put("currentYear", LocalDateTime.now().getYear());
        sendTemplatedEmail(to, "Welcome to " + this.appName + " 🎉", "email/welcome", variables);
    }

    @Async
    public void sendRegistrationConfirmation(User user) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("name", user.getFullName());
        variables.put("email", user.getEmail());
        variables.put("registrationNumber", user.getRegistrationNumber());
        variables.put("frontendUrl", this.frontendUrl);
        variables.put("appName", this.appName);
        variables.put("currentYear", LocalDateTime.now().getYear());
        sendTemplatedEmail(user.getEmail(), "Registration Confirmation - " + this.appName,
                "email/registration-confirmation", variables);
    }

    @Async
    public void sendPasswordResetEmail(String to, String resetLink) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("resetLink", resetLink);
        variables.put("frontendUrl", this.frontendUrl);
        variables.put("appName", this.appName);
        variables.put("currentYear", LocalDateTime.now().getYear());
        sendTemplatedEmail(to, "Password Reset Request - " + this.appName,
                "email/password-reset", variables);
    }

    @Async
    public void sendClearanceUpdateEmail(Student student, String status, String department, String comments) {
        String recipientEmail = student.getEmail();
        if (recipientEmail == null || recipientEmail.isEmpty()) {
            if (student.getUser() != null) {
                recipientEmail = student.getUser().getEmail();
            }
        }

        if (recipientEmail == null || recipientEmail.isEmpty()) {
            log.warn("⚠️ No email found for student: {}", student.getRegistrationNumber());
            return;
        }

        Map<String, Object> variables = new HashMap<>();
        variables.put("name", student.getFullName());
        variables.put("registrationNumber", student.getRegistrationNumber());
        variables.put("status", status);
        variables.put("department", department);
        variables.put("comments", comments);
        variables.put("updateDate", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm:ss")));
        variables.put("programme", student.getProgramme());
        variables.put("faculty", student.getFaculty());
        variables.put("frontendUrl", this.frontendUrl);
        variables.put("appName", this.appName);
        variables.put("currentYear", LocalDateTime.now().getYear());
        
        sendTemplatedEmail(recipientEmail, "Clearance Update - " + this.appName,
                "email/clearance-update", variables);
    }

    @Async
    public void sendClearanceCertificateEmail(Student student, byte[] certificateData, String certificateName) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("name", student.getFullName());
        variables.put("registrationNumber", student.getRegistrationNumber());
        variables.put("programme", student.getProgramme());
        variables.put("faculty", student.getFaculty());
        variables.put("certificateDate", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy")));
        variables.put("frontendUrl", this.frontendUrl);
        variables.put("appName", this.appName);
        variables.put("currentYear", LocalDateTime.now().getYear());

        // Fix: Need to process template first, then send with attachment
        Context context = new Context();
        context.setVariables(variables);
        String htmlContent = templateEngine.process("email/clearance-certificate", context);

        String attachmentName = certificateName != null ? certificateName : "clearance-certificate.pdf";
        sendEmailWithAttachment(student.getEmail(),
                "Your Clearance Certificate is Ready - " + this.appName + " 🎓",
                htmlContent,
                certificateData,
                "application/pdf",
                attachmentName);
    }

    // ============ NEW BUSINESS METHODS FOR MULTIPLE STUDENTS ============

    /**
     * Send clearance update to multiple students
     */
    @Async
    public void sendClearanceUpdateToMultipleStudents(List<Student> students,
                                                      String status,
                                                      String department,
                                                      String comments) {
        Map<String, Object> baseVariables = new HashMap<>();
        baseVariables.put("status", status);
        baseVariables.put("department", department);
        baseVariables.put("comments", comments);
        baseVariables.put("updateDate", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm:ss")));
        baseVariables.put("frontendUrl", this.frontendUrl);
        baseVariables.put("appName", this.appName);
        baseVariables.put("currentYear", LocalDateTime.now().getYear());

        List<String> recipientEmails = students.stream()
                .map(Student::getEmail)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        // Send to all in one email (if you want them to see each other)
        // Or send individual personalized emails
        for (Student student : students) {
            Map<String, Object> personalVariables = new HashMap<>(baseVariables);
            personalVariables.put("name", student.getFullName());
            personalVariables.put("registrationNumber", student.getRegistrationNumber());
            personalVariables.put("programme", student.getProgramme());
            personalVariables.put("faculty", student.getFaculty());

            sendTemplatedEmail(student.getEmail(),
                    "Clearance Update - " + this.appName,
                    "email/clearance-update",
                    personalVariables);
        }
    }

    /**
     * Send bulk clearance certificate emails
     */
    @Async
    public void sendBulkClearanceCertificates(List<Student> students,
                                              Map<String, byte[]> certificateDataMap) {
        for (Student student : students) {
            byte[] certificateData = certificateDataMap.get(student.getRegistrationNumber());
            if (certificateData != null) {
                String certificateName = "clearance-" + student.getRegistrationNumber() + ".pdf";
                sendClearanceCertificateEmail(student, certificateData, certificateName);
            }
        }
    }

    // ============ UTILITY METHODS ============

    /**
     * Partition a list into smaller batches
     */
    private <T> List<List<T>> partition(List<T> list, int size) {
        List<List<T>> partitions = new ArrayList<>();
        if (list == null || list.isEmpty()) {
            return partitions;
        }

        for (int i = 0; i < list.size(); i += size) {
            partitions.add(list.subList(i, Math.min(i + size, list.size())));
        }
        return partitions;
    }

    public boolean sendTestEmail(String to) {
        try {
            Map<String, Object> variables = new HashMap<>();
            variables.put("name", "Test User");
            variables.put("testTime", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm:ss")));
            variables.put("appName", this.appName);
            variables.put("currentYear", LocalDateTime.now().getYear());

            Context context = new Context();
            context.setVariables(variables);
            String htmlContent = templateEngine.process("email/test", context);

            sendHtmlEmail(to, "Test Email from " + this.appName, htmlContent);
            return true;
        } catch (Exception e) {
            log.error("Test email failed: {}", e.getMessage());
            return false;
        }
    }
}