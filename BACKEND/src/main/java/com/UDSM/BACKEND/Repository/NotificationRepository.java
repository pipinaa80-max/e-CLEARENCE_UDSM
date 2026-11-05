package com.UDSM.BACKEND.Repository;

import java.util.List;

import com.UDSM.BACKEND.Model.Notification;
import com.UDSM.BACKEND.Model.Student;
import com.UDSM.BACKEND.Model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByUserOrderByCreatedAtDesc(User user);

    Page<Notification> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    List<Notification> findByUserAndIsReadFalseOrderByCreatedAtDesc(User user);

    long countByUserAndIsReadFalse(User user);

    void deleteByUser(User user);

    void deleteByStudent(Student student);

    Page<Notification> findByUser(User user, Pageable pageable);

    List<Notification> findByUserAndIsReadFalse(User user);

    @Query("SELECT n FROM Notification n WHERE n.user = :user OR (n.student IS NOT NULL AND (n.student.user = :user OR (cast(:email as string) <> '' AND n.student.email = :email) OR (cast(:regNum as string) <> '' AND (n.student.registrationNumber = :regNum OR n.student.registrationNumber = UPPER(:regNum))))) ORDER BY n.createdAt DESC")
    List<Notification> findAllForStudent(@Param("user") User user, @Param("email") String email, @Param("regNum") String regNum);

    @Query("SELECT COUNT(n) FROM Notification n WHERE (n.user = :user OR (n.student IS NOT NULL AND (n.student.user = :user OR (cast(:email as string) <> '' AND n.student.email = :email) OR (cast(:regNum as string) <> '' AND (n.student.registrationNumber = :regNum OR n.student.registrationNumber = UPPER(:regNum)))))) AND (n.isRead = false OR n.isRead IS NULL)")
    long countUnreadForStudent(@Param("user") User user, @Param("email") String email, @Param("regNum") String regNum);

    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP WHERE (n.user = :user OR (n.student IS NOT NULL AND (n.student.user = :user OR (cast(:email as string) <> '' AND n.student.email = :email) OR (cast(:regNum as string) <> '' AND (n.student.registrationNumber = :regNum OR n.student.registrationNumber = UPPER(:regNum)))))) AND (n.isRead = false OR n.isRead IS NULL)")
    int markAllAsReadForStudent(@Param("user") User user, @Param("email") String email, @Param("regNum") String regNum);

    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP WHERE n.id = :id AND (n.user = :user OR (n.student IS NOT NULL AND (n.student.user = :user OR (cast(:email as string) <> '' AND n.student.email = :email) OR (cast(:regNum as string) <> '' AND (n.student.registrationNumber = :regNum OR n.student.registrationNumber = UPPER(:regNum))))))")
    int markSingleAsReadForStudent(@Param("id") String id, @Param("user") User user, @Param("email") String email, @Param("regNum") String regNum);

    @Query("SELECT n FROM Notification n WHERE n.user = :user OR (n.student IS NOT NULL AND n.student.user = :user) ORDER BY n.createdAt DESC")
    List<Notification> findAllByUserOrStudentUser(@Param("user") User user);
}
