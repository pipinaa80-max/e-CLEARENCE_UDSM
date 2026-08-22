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

    // =========================================================
    // STUDENT QUERIES
    // =========================================================

    List<ClearanceRequest> findByStudent(Student student);

    Page<ClearanceRequest> findByStudent(Student student, Pageable pageable);

    List<ClearanceRequest> findByStudentId(String studentId);

    // Add: Find by student ID with pagination
    Page<ClearanceRequest> findByStudentId(String studentId, Pageable pageable);

    Optional<ClearanceRequest> findByStudentAndStatus(Student student, ClearanceStatus status);

    //  Add: Find by student ID and status
    Optional<ClearanceRequest> findByStudentIdAndStatus(String studentId, ClearanceStatus status);

    // =========================================================
    // STATUS QUERIES
    // =========================================================

    List<ClearanceRequest> findByStatus(ClearanceStatus status);

    Page<ClearanceRequest> findByStatus(ClearanceStatus status, Pageable pageable);

    //  Add: Find by status as String (for when stored as String)
    List<ClearanceRequest> findByStatus(String status);

    //  Add: Find by status and current stage
    List<ClearanceRequest> findByStatusAndCurrentStage(ClearanceStatus status, String currentStage);

    // =========================================================
    // DEPARTMENT QUERIES
    // =========================================================

    @Query("SELECT cr FROM ClearanceRequest cr WHERE cr.student.department = :department")
    Page<ClearanceRequest> findByStudentDepartment(@Param("department") String department, Pageable pageable);

    @Query("SELECT cr FROM ClearanceRequest cr WHERE cr.student.department = :department AND cr.status = :status")
    Page<ClearanceRequest> findByStudentDepartmentAndStatus(@Param("department") String department, @Param("status") ClearanceStatus status, Pageable pageable);

    //  Add: Find by student college
    @Query("SELECT cr FROM ClearanceRequest cr WHERE cr.student.college = :college")
    List<ClearanceRequest> findByStudentCollege(@Param("college") String college);

    // Add: Find by student college and status
    @Query("SELECT cr FROM ClearanceRequest cr WHERE cr.student.college = :college AND cr.status = :status")
    List<ClearanceRequest> findByStudentCollegeAndStatus(@Param("college") String college, @Param("status") ClearanceStatus status);

    // Add: Find by department and current stage
    @Query("SELECT cr FROM ClearanceRequest cr WHERE cr.student.department = :department AND cr.currentStage = :stage")
    List<ClearanceRequest> findByStudentDepartmentAndCurrentStage(@Param("department") String department, @Param("stage") String stage);

    // =========================================================
    // CURRENT STAGE QUERIES
    // =========================================================

    //  Add: Find by current stage
    List<ClearanceRequest> findByCurrentStage(String currentStage);

    //  Add: Find by current stage and status
    List<ClearanceRequest> findByCurrentStageAndStatus(String currentStage, ClearanceStatus status);

    //  Add: Find by current stage and status as String
    List<ClearanceRequest> findByCurrentStageAndStatus(String currentStage, String status);

    //  Add: Find by current office
    List<ClearanceRequest> findByCurrentOffice(String currentOffice);

    //  Add: Find by current office and status
    List<ClearanceRequest> findByCurrentOfficeAndStatus(String currentOffice, ClearanceStatus status);

    // =========================================================
    // CONVOCATION SPECIFIC QUERIES
    // =========================================================

    //  Add: Find pending requests for Convocation
    @Query("SELECT cr FROM ClearanceRequest cr WHERE cr.currentStage = 'Convocation' AND cr.status = 'PENDING'")
    List<ClearanceRequest> findPendingConvocationRequests();

    //  Add: Find requests by current stage ordered by submission date
    @Query("SELECT cr FROM ClearanceRequest cr WHERE cr.currentStage = :stage ORDER BY cr.submittedAt DESC")
    List<ClearanceRequest> findByCurrentStageOrderBySubmittedAtDesc(@Param("stage") String stage);

    // =========================================================
    // COUNT QUERIES
    // =========================================================

    @Query("SELECT COUNT(cr) FROM ClearanceRequest cr WHERE cr.status = :status")
    long countByStatus(@Param("status") ClearanceStatus status);

    //  Add: Count by current stage
    @Query("SELECT COUNT(cr) FROM ClearanceRequest cr WHERE cr.currentStage = :stage")
    long countByCurrentStage(@Param("stage") String stage);

    //  Add: Count by status and current stage
    @Query("SELECT COUNT(cr) FROM ClearanceRequest cr WHERE cr.status = :status AND cr.currentStage = :stage")
    long countByStatusAndCurrentStage(@Param("status") ClearanceStatus status, @Param("stage") String stage);

    //  Add: Count by current office
    @Query("SELECT COUNT(cr) FROM ClearanceRequest cr WHERE cr.currentOffice = :office")
    long countByCurrentOffice(@Param("office") String office);

    // =========================================================
    // DATE/ORDER QUERIES
    // =========================================================

    // Add: Find latest request by student ID
    @Query("SELECT cr FROM ClearanceRequest cr WHERE cr.studentId = :studentId ORDER BY cr.submittedAt DESC")
    List<ClearanceRequest> findLatestByStudentId(@Param("studentId") String studentId);

    // Add: Find requests after a certain date
    @Query("SELECT cr FROM ClearanceRequest cr WHERE cr.submittedAt >= :date")
    List<ClearanceRequest> findBySubmittedAtAfter(@Param("date") java.time.LocalDateTime date);

    // Add: Find requests between dates
    @Query("SELECT cr FROM ClearanceRequest cr WHERE cr.submittedAt BETWEEN :startDate AND :endDate")
    List<ClearanceRequest> findBySubmittedAtBetween(@Param("startDate") java.time.LocalDateTime startDate, @Param("endDate") java.time.LocalDateTime endDate);

    // =========================================================
    // COMPLEX QUERIES
    // =========================================================

    // Add: Find pending requests by college
    @Query("SELECT cr FROM ClearanceRequest cr WHERE cr.student.college = :college AND cr.status = 'PENDING'")
    List<ClearanceRequest> findPendingByCollege(@Param("college") String college);

    //  Add: Find pending requests by department
    @Query("SELECT cr FROM ClearanceRequest cr WHERE cr.student.department = :department AND cr.status = 'PENDING'")
    List<ClearanceRequest> findPendingByDepartment(@Param("department") String department);

    // Add: Find requests by student registration number
    @Query("SELECT cr FROM ClearanceRequest cr WHERE cr.student.registrationNumber = :registrationNumber")
    List<ClearanceRequest> findByStudentRegistrationNumber(@Param("registrationNumber") String registrationNumber);

    // Add: Find active requests (not completed or rejected)
    @Query("SELECT cr FROM ClearanceRequest cr WHERE cr.status NOT IN ('COMPLETED', 'REJECTED')")
    List<ClearanceRequest> findActiveRequests();

    // Add: Find requests with pending parallel offices
    @Query("SELECT cr FROM ClearanceRequest cr WHERE cr.currentStage = 'Parallel' AND cr.status = 'PENDING'")
    List<ClearanceRequest> findPendingParallelRequests();
}