

package com.UDSM.BACKEND.Repository;

import java.time.LocalDateTime;
import java.util.List;

import com.UDSM.BACKEND.Model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, String> {
    List<AuditLog> findByUserId(String userId);

    List<AuditLog> findByAction(String action);

    List<AuditLog> findByStatus(String status);

    List<AuditLog> findByUsername(String username);

    Page<AuditLog> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);

    Page<AuditLog> findByUserIdAndCreatedAtBetween(String userId, LocalDateTime start, LocalDateTime end, Pageable pageable);

    List<AuditLog> findByActionAndStatus(String action, String status);

    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT a FROM AuditLog a ORDER BY a.createdAt DESC")
    List<AuditLog> findTopNByOrderByCreatedAtDesc(@Param("limit") int limit);

    long countByStatus(String status);

    @Query("SELECT a.action, COUNT(a) FROM AuditLog a GROUP BY a.action")
    List<Object[]> countByAction();

    @Query("SELECT a.userId, COUNT(a) FROM AuditLog a GROUP BY a.userId")
    List<Object[]> countByUser();

    @Query("DELETE FROM AuditLog a WHERE a.createdAt < :cutoffDate")
    int deleteByCreatedAtBefore(@Param("cutoffDate") LocalDateTime cutoffDate);

    List<AuditLog> findByIpAddress(String ipAddress);

    List<AuditLog> findByActionAndCreatedAtBetween(String action, LocalDateTime start, LocalDateTime end);

    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}
