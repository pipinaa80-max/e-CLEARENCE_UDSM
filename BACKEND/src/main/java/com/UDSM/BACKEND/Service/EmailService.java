

package com.UDSM.BACKEND.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import javax.naming.Binding;
import javax.naming.Context;
import javax.naming.Name;
import javax.naming.NameClassPair;
import javax.naming.NameParser;
import javax.naming.NamingEnumeration;
import javax.naming.NamingException;

import com.UDSM.BACKEND.Model.Student;
import com.UDSM.BACKEND.Model.User;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.Generated;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.spring6.SpringTemplateEngine;

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

    @Async
    public CompletableFuture<Boolean> sendHtmlEmail(String to, String subject) {
        try {
            MimeMessage message = this.mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, 3, StandardCharsets.UTF_8.name());
            helper.setFrom(this.fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            this.mailSender.send(message);
            return CompletableFuture.completedFuture(true);
        } catch (MessagingException var5) {
            return CompletableFuture.completedFuture(false);
        }
    }

    @Async
    public CompletableFuture<Boolean> sendEmailWithAttachment(String to, String subject, String htmlContent, byte[] attachmentData, String attachmentType) {
        try {
            MimeMessage message = this.mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, 3, StandardCharsets.UTF_8.name());
            helper.setFrom(this.fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            new ByteArrayResource(attachmentData);
            this.mailSender.send(message);
            return CompletableFuture.completedFuture(true);
        } catch (MessagingException var9) {
            return CompletableFuture.completedFuture(false);
        }
    }

    @Async
    public CompletableFuture<Boolean> sendTemplatedEmail(String to, String subject, String templateName, Map<String, Object> variables) {
        try {
            Context var10000 = new Context() {
                public Object lookup(Name name) throws NamingException {
                    return null;
                }

                public Object lookup(String s) throws NamingException {
                    return null;
                }

                public void bind(Name name, Object o) throws NamingException {
                }

                public void bind(String s, Object o) throws NamingException {
                }

                public void rebind(Name name, Object o) throws NamingException {
                }

                public void rebind(String s, Object o) throws NamingException {
                }

                public void unbind(Name name) throws NamingException {
                }

                public void unbind(String s) throws NamingException {
                }

                public void rename(Name name, Name name1) throws NamingException {
                }

                public void rename(String s, String s1) throws NamingException {
                }

                public NamingEnumeration<NameClassPair> list(Name name) throws NamingException {
                    return null;
                }

                public NamingEnumeration<NameClassPair> list(String s) throws NamingException {
                    return null;
                }

                public NamingEnumeration<Binding> listBindings(Name name) throws NamingException {
                    return null;
                }

                public NamingEnumeration<Binding> listBindings(String s) throws NamingException {
                    return null;
                }

                public void destroySubcontext(Name name) throws NamingException {
                }

                public void destroySubcontext(String s) throws NamingException {
                }

                public Context createSubcontext(Name name) throws NamingException {
                    return null;
                }

                public Context createSubcontext(String s) throws NamingException {
                    return null;
                }

                public Object lookupLink(Name name) throws NamingException {
                    return null;
                }

                public Object lookupLink(String s) throws NamingException {
                    return null;
                }

                public NameParser getNameParser(Name name) throws NamingException {
                    return null;
                }

                public NameParser getNameParser(String s) throws NamingException {
                    return null;
                }

                public Name composeName(Name name, Name name1) throws NamingException {
                    return null;
                }

                public String composeName(String s, String s1) throws NamingException {
                    return "";
                }

                public Object addToEnvironment(String s, Object o) throws NamingException {
                    return null;
                }

                public Object removeFromEnvironment(String s) throws NamingException {
                    return null;
                }

                public Hashtable<?, ?> getEnvironment() throws NamingException {
                    return null;
                }

                public void close() throws NamingException {
                }

                public String getNameInNamespace() throws NamingException {
                    return "";
                }
            };
            return this.sendHtmlEmail(to, subject);
        } catch (Exception var6) {
            return CompletableFuture.completedFuture(false);
        }
    }

    @Async
    public void sendWelcomeEmail(String to, String name, String smartClearanceUdsm) {
        Map<String, Object> variables = new HashMap();
        variables.put("name", name);
        variables.put("appName", this.appName);
        variables.put("frontendUrl", this.frontendUrl);
        variables.put("currentYear", LocalDateTime.now().getYear());
        this.sendTemplatedEmail(to, "Welcome to " + this.appName + " \ud83c\udf89", "email/welcome", variables);
    }

    @Async
    public void sendRegistrationConfirmation(User user) {
        Map<String, Object> variables = new HashMap();
        variables.put("name", user.getFullName());
        variables.put("email", user.getEmail());
        variables.put("registrationNumber", user.getRegistrationNumber());
        variables.put("frontendUrl", this.frontendUrl);
        variables.put("appName", this.appName);
        variables.put("currentYear", LocalDateTime.now().getYear());
        this.sendTemplatedEmail(user.getEmail(), "Registration Confirmation - " + this.appName, "email/registration-confirmation", variables);
    }

    @Async
    public void sendPasswordResetEmail(String to, String resetLink) {
        Map<String, Object> variables = new HashMap();
        variables.put("resetLink", resetLink);
        variables.put("frontendUrl", this.frontendUrl);
        variables.put("appName", this.appName);
        variables.put("currentYear", LocalDateTime.now().getYear());
        this.sendTemplatedEmail(to, "Password Reset Request - " + this.appName, "email/password-reset", variables);
    }

    @Async
    public void sendClearanceUpdateEmail(Student student, String status, String department, String comments) {
        Map<String, Object> variables = new HashMap();
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
        this.sendTemplatedEmail(student.getEmail(), "Clearance Update - " + this.appName, "email/clearance-update", variables);
    }

    @Async
    public void sendClearanceCertificateEmail(Student student, byte[] certificateData, String certificateName) {
        Map<String, Object> variables = new HashMap();
        variables.put("name", student.getFullName());
        variables.put("registrationNumber", student.getRegistrationNumber());
        variables.put("programme", student.getProgramme());
        variables.put("faculty", student.getFaculty());
        variables.put("certificateDate", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy")));
        variables.put("frontendUrl", this.frontendUrl);
        variables.put("appName", this.appName);
        variables.put("currentYear", LocalDateTime.now().getYear());
        Context var10000 = new Context() {
            public Object lookup(Name name) throws NamingException {
                return null;
            }

            public Object lookup(String s) throws NamingException {
                return null;
            }

            public void bind(Name name, Object o) throws NamingException {
            }

            public void bind(String s, Object o) throws NamingException {
            }

            public void rebind(Name name, Object o) throws NamingException {
            }

            public void rebind(String s, Object o) throws NamingException {
            }

            public void unbind(Name name) throws NamingException {
            }

            public void unbind(String s) throws NamingException {
            }

            public void rename(Name name, Name name1) throws NamingException {
            }

            public void rename(String s, String s1) throws NamingException {
            }

            public NamingEnumeration<NameClassPair> list(Name name) throws NamingException {
                return null;
            }

            public NamingEnumeration<NameClassPair> list(String s) throws NamingException {
                return null;
            }

            public NamingEnumeration<Binding> listBindings(Name name) throws NamingException {
                return null;
            }

            public NamingEnumeration<Binding> listBindings(String s) throws NamingException {
                return null;
            }

            public void destroySubcontext(Name name) throws NamingException {
            }

            public void destroySubcontext(String s) throws NamingException {
            }

            public Context createSubcontext(Name name) throws NamingException {
                return null;
            }

            public Context createSubcontext(String s) throws NamingException {
                return null;
            }

            public Object lookupLink(Name name) throws NamingException {
                return null;
            }

            public Object lookupLink(String s) throws NamingException {
                return null;
            }

            public NameParser getNameParser(Name name) throws NamingException {
                return null;
            }

            public NameParser getNameParser(String s) throws NamingException {
                return null;
            }

            public Name composeName(Name name, Name name1) throws NamingException {
                return null;
            }

            public String composeName(String s, String s1) throws NamingException {
                return "";
            }

            public Object addToEnvironment(String s, Object o) throws NamingException {
                return null;
            }

            public Object removeFromEnvironment(String s) throws NamingException {
                return null;
            }

            public Hashtable<?, ?> getEnvironment() throws NamingException {
                return null;
            }

            public void close() throws NamingException {
            }

            public String getNameInNamespace() throws NamingException {
                return "";
            }
        };
        this.sendEmailWithAttachment(student.getEmail(), "Your Clearance Certificate is Ready - " + this.appName + " \ud83c\udf93", certificateName, certificateData, "application/pdf");
    }

    public boolean sendTestEmail(String to) {
        try {
            Map<String, Object> variables = new HashMap();
            variables.put("name", "Test User");
            variables.put("testTime", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm:ss")));
            variables.put("appName", this.appName);
            variables.put("currentYear", LocalDateTime.now().getYear());
            Context var10000 = new Context() {
                public Object lookup(Name name) throws NamingException {
                    return null;
                }

                public Object lookup(String s) throws NamingException {
                    return null;
                }

                public void bind(Name name, Object o) throws NamingException {
                }

                public void bind(String s, Object o) throws NamingException {
                }

                public void rebind(Name name, Object o) throws NamingException {
                }

                public void rebind(String s, Object o) throws NamingException {
                }

                public void unbind(Name name) throws NamingException {
                }

                public void unbind(String s) throws NamingException {
                }

                public void rename(Name name, Name name1) throws NamingException {
                }

                public void rename(String s, String s1) throws NamingException {
                }

                public NamingEnumeration<NameClassPair> list(Name name) throws NamingException {
                    return null;
                }

                public NamingEnumeration<NameClassPair> list(String s) throws NamingException {
                    return null;
                }

                public NamingEnumeration<Binding> listBindings(Name name) throws NamingException {
                    return null;
                }

                public NamingEnumeration<Binding> listBindings(String s) throws NamingException {
                    return null;
                }

                public void destroySubcontext(Name name) throws NamingException {
                }

                public void destroySubcontext(String s) throws NamingException {
                }

                public Context createSubcontext(Name name) throws NamingException {
                    return null;
                }

                public Context createSubcontext(String s) throws NamingException {
                    return null;
                }

                public Object lookupLink(Name name) throws NamingException {
                    return null;
                }

                public Object lookupLink(String s) throws NamingException {
                    return null;
                }

                public NameParser getNameParser(Name name) throws NamingException {
                    return null;
                }

                public NameParser getNameParser(String s) throws NamingException {
                    return null;
                }

                public Name composeName(Name name, Name name1) throws NamingException {
                    return null;
                }

                public String composeName(String s, String s1) throws NamingException {
                    return "";
                }

                public Object addToEnvironment(String s, Object o) throws NamingException {
                    return null;
                }

                public Object removeFromEnvironment(String s) throws NamingException {
                    return null;
                }

                public Hashtable<?, ?> getEnvironment() throws NamingException {
                    return null;
                }

                public void close() throws NamingException {
                }

                public String getNameInNamespace() throws NamingException {
                    return "";
                }
            };
            return true;
        } catch (Exception var4) {
            return false;
        }
    }

    @Generated
    public EmailService(final JavaMailSender mailSender, final SpringTemplateEngine templateEngine) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
    }
}
