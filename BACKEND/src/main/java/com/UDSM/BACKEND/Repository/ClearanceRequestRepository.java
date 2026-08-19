
package com.UDSM.BACKEND.Repository;

import java.util.List;
import java.util.Optional;

import com.UDSM.BACKEND.Model.ClearanceRequest;
import com.UDSM.BACKEND.Model.ClearanceStatus;
import com.UDSM.BACKEND.Model.Student;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ClearanceRequestRepository extends JpaRepository<ClearanceRequest, Long> {
    List<ClearanceRequest> findByStudent(Student student);
    
    Page<ClearanceRequest> findByStudent(Student student, Pageable pageable);

    List<ClearanceRequest> findByStatus(ClearanceStatus status);

    Page<ClearanceRequest> findByStatus(ClearanceStatus status, Pageable pageable);

    Optional<ClearanceRequest> findByStudentAndStatus(Student student, ClearanceStatus status);

    @Query("SELECT cr FROM ClearanceRequest cr WHERE cr.student.department = :department")
    Page<ClearanceRequest> findByStudentDepartment(@Param("department") String department, Pageable pageable);

    @Query("SELECT cr FROM ClearanceRequest cr WHERE cr.student.department = :department AND cr.status = :status")
    Page<ClearanceRequest> findByStudentDepartmentAndStatus(@Param("department") String department, @Param("status") ClearanceStatus status, Pageable pageable);

    @Query("SELECT COUNT(cr) FROM ClearanceRequest cr WHERE cr.status = :status")
    long countByStatus(@Param("status") ClearanceStatus status);
}
