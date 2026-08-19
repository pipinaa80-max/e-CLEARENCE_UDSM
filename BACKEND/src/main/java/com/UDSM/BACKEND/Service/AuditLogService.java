

package com.UDSM.BACKEND.Service;


import com.UDSM.BACKEND.Model.AuditLog;
import com.UDSM.BACKEND.Repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.Generated;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
@Transactional
public class AuditLogService {
    private final AuditLogRepository auditLogRepository;

    @Async
    public void logAction(String userId, String action, String details) {
        try {
            AuditLog auditLog = AuditLog.builder().userId(userId).username(this.getCurrentUsername()).action(action).details(details).ipAddress(this.getClientIpAddress()).userAgent(this.getUserAgent()).status("SUCCESS").createdAt(LocalDateTime.now()).build();
            this.auditLogRepository.save(auditLog);
        } catch (Exception var5) {
        }

    }

    @Async
    public void logAction(String userId, String action, String details, String status) {
        try {
            AuditLog auditLog = AuditLog.builder().userId(userId).username(this.getCurrentUsername()).action(action).details(details).ipAddress(this.getClientIpAddress()).userAgent(this.getUserAgent()).status(status).createdAt(LocalDateTime.now()).build();
            this.auditLogRepository.save(auditLog);
        } catch (Exception var6) {
        }

    }

    @Async
    public void logAction(String userId, String username, String action, String details, String ipAddress, String userAgent, String status) {
        try {
            AuditLog auditLog = AuditLog.builder().userId(userId).username(username).action(action).details(details).ipAddress(ipAddress).userAgent(userAgent).status(status).createdAt(LocalDateTime.now()).build();
            this.auditLogRepository.save(auditLog);
        } catch (Exception var9) {
        }

    }

    public void logLoginAttempt(String username, boolean success, String ipAddress) {
        String action = "LOGIN_ATTEMPT";
        String details = String.format("Login attempt for user: %s from IP: %s", username, ipAddress);
        String status = success ? "SUCCESS" : "FAILED";
        this.logAction((String)null, username, action, details, ipAddress, this.getUserAgent(), status);
    }

    public void logLogout(String userId, String username) {
        this.logAction(userId, "LOGOUT", "User logged out", "SUCCESS");
    }

    public void logClearanceAction(String userId, String action, String registrationNumber, String department, String status) {
        String details = String.format("Clearance action: %s for student %s by department %s", action, registrationNumber, department);
        this.logAction(userId, action, details, status);
    }

    public void logDataModification(String userId, String entityType, String entityId, String operation, Map<String, Object> changes) {
        String details = String.format("Data modification: %s %s (ID: %s) - Changes: %s", operation, entityType, entityId, changes);
        this.logAction(userId, "DATA_MODIFICATION", details, "SUCCESS");
    }

    public void logSystemEvent(String eventType, String description, String status) {
        this.logAction("SYSTEM", eventType, description, status);
    }

    public void logSecurityEvent(String eventType, String details, String status) {
        this.logAction("SECURITY", eventType, details, status);
    }

    public List<AuditLog> getUserAuditLogs(String userId) {
        return this.auditLogRepository.findByUserId(userId);
    }

    public List<AuditLog> getAuditLogsByAction(String action) {
        return this.auditLogRepository.findByAction(action);
    }

    public Page<AuditLog> getAuditLogs(Pageable pageable) {
        return this.auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    public Page<AuditLog> getAuditLogsByDateRange(LocalDateTime start, LocalDateTime end, Pageable pageable) {
        return this.auditLogRepository.findByCreatedAtBetween(start, end, pageable);
    }

    public Page<AuditLog> getUserAuditLogsByDateRange(String userId, LocalDateTime start, LocalDateTime end, Pageable pageable) {
        return this.auditLogRepository.findByUserIdAndCreatedAtBetween(userId, start, end, pageable);
    }

    public List<AuditLog> getAuditLogsByStatus(String status) {
        return this.auditLogRepository.findByStatus(status);
    }

    public List<AuditLog> getRecentAuditLogs(int limit) {
        return this.auditLogRepository.findTopNByOrderByCreatedAtDesc(limit);
    }

    public Map<String, Object> getAuditStatistics() {
        Map<String, Object> stats = new HashMap();
        long totalLogs = this.auditLogRepository.count();
        long successLogs = this.auditLogRepository.countByStatus("SUCCESS");
        long failedLogs = this.auditLogRepository.countByStatus("FAILED");
        stats.put("totalLogs", totalLogs);
        stats.put("successLogs", successLogs);
        stats.put("failedLogs", failedLogs);
        stats.put("successRate", totalLogs > 0L ? (double)successLogs * (double)100.0F / (double)totalLogs : (double)0.0F);
        List<Object[]> actionCounts = this.auditLogRepository.countByAction();
        Map<String, Long> actionCountMap = new HashMap();

        for(Object[] row : actionCounts) {
            actionCountMap.put((String)row[0], (Long)row[1]);
        }

        stats.put("actionCounts", actionCountMap);
        List<Object[]> userActivityCounts = this.auditLogRepository.countByUser();
        stats.put("userActivityCounts", userActivityCounts);
        return stats;
    }

    public int deleteOldAuditLogs(int daysToKeep) {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays((long)daysToKeep);
        return this.auditLogRepository.deleteByCreatedAtBefore(cutoffDate);
    }

    private String getCurrentUsername() {
        return "SYSTEM";
    }

    private String getClientIpAddress() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes)RequestContextHolder.getRequestAttributes();
            if (attributes == null) {
                return "UNKNOWN";
            } else {
                HttpServletRequest request = attributes.getRequest();
                String ipAddress = request.getHeader("X-Forwarded-For");
                if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
                    ipAddress = request.getHeader("Proxy-Client-IP");
                }

                if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
                    ipAddress = request.getHeader("WL-Proxy-Client-IP");
                }

                if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
                    ipAddress = request.getHeader("HTTP_CLIENT_IP");
                }

                if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
                    ipAddress = request.getHeader("HTTP_X_FORWARDED_FOR");
                }

                if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
                    ipAddress = request.getRemoteAddr();
                }

                if (ipAddress != null && ipAddress.contains(",")) {
                    ipAddress = ipAddress.split(",")[0].trim();
                }

                return ipAddress != null ? ipAddress : "UNKNOWN";
            }
        } catch (Exception var4) {
            return "UNKNOWN";
        }
    }

    private String getUserAgent() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes)RequestContextHolder.getRequestAttributes();
            if (attributes == null) {
                return "UNKNOWN";
            } else {
                HttpServletRequest request = attributes.getRequest();
                return request.getHeader("User-Agent") != null ? request.getHeader("User-Agent") : "UNKNOWN";
            }
        } catch (Exception var3) {
            return "UNKNOWN";
        }
    }

    @Generated
    public AuditLogService(final AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }
}
