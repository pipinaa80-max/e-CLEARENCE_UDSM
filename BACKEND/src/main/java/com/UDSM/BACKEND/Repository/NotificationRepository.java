
package com.UDSM.BACKEND.Repository;
import java.util.List;

import com.UDSM.BACKEND.Model.Notification;
import com.UDSM.BACKEND.Model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByUserOrderByCreatedAtDesc(User user);

    Page<Notification> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    List<Notification> findByUserAndIsReadFalseOrderByCreatedAtDesc(User user);

    long countByUserAndIsReadFalse(User user);

    void deleteByUser(User user);

    Page<Notification> findByUser(User user, Pageable pageable);

    List<Notification> findByUserAndIsReadFalse(User user);
}
