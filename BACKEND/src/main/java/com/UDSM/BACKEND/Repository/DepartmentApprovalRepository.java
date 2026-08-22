package com.UDSM.BACKEND.Repository;

import java.util.List;
import java.util.Optional;

import com.UDSM.BACKEND.Model.ClearanceRequest;
import com.UDSM.BACKEND.Model.ClearanceStatus;
import com.UDSM.BACKEND.Model.DepartmentApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DepartmentApprovalRepository extends JpaRepository<DepartmentApproval, Long> {

    // =========================================================
    // BASIC CRUD QUERIES
    // =========================================================

    /**
     * Find all department approvals for a specific clearance request
     */
    List<DepartmentApproval> findByClearanceRequest(ClearanceRequest clearanceRequest);

    /**
     * Find all department approvals by clearance request ID
     */
    List<DepartmentApproval> findByClearanceRequestId(Long clearanceRequestId);

    /**
     * Find a specific department approval for a clearance request
     */
    Optional<DepartmentApproval> findByClearanceRequestAndDepartment(ClearanceRequest clearanceRequest, String department);

    /**
     * Find a specific department approval by clearance request ID and department name
     */
    Optional<DepartmentApproval> findByClearanceRequestIdAndDepartment(Long clearanceRequestId, String department);

    // =========================================================
    // COUNT QUERIES
    // =========================================================

    /**
     * Count total departments for a clearance request
     */
    long countByClearanceRequest(ClearanceRequest clearanceRequest);

    /**
     * Count departments with specific status for a clearance request
     */
    long countByClearanceRequestAndStatus(ClearanceRequest clearanceRequest, ClearanceStatus status);

    /**
     * Count departments with specific status by clearance request ID
     */
    @Query("SELECT COUNT(da) FROM DepartmentApproval da WHERE da.clearanceRequest.id = :requestId AND da.status = :status")
    long countByClearanceRequestIdAndStatus(@Param("requestId") Long requestId, @Param("status") ClearanceStatus status);

    // =========================================================
    // STATUS QUERIES
    // =========================================================

    /**
     * Find all approvals with a specific status for a clearance request
     */
    List<DepartmentApproval> findByClearanceRequestAndStatus(ClearanceRequest clearanceRequest, ClearanceStatus status);

    /**
     * Find all approvals with a specific status by clearance request ID
     */
    @Query("SELECT da FROM DepartmentApproval da WHERE da.clearanceRequest.id = :requestId AND da.status = :status")
    List<DepartmentApproval> findByClearanceRequestIdAndStatus(@Param("requestId") Long requestId, @Param("status") ClearanceStatus status);

    /**
     * Find all approvals for a specific department across all requests
     */
    List<DepartmentApproval> findByDepartment(String department);

    /**
     * Find all approvals for a specific department with a specific status
     */
    List<DepartmentApproval> findByDepartmentAndStatus(String department, ClearanceStatus status);

    // =========================================================
    // CONVOCATION SPECIFIC QUERIES
    // =========================================================

    /**
     * Find Convocation approval for a clearance request
     */
    @Query("SELECT da FROM DepartmentApproval da WHERE da.clearanceRequest.id = :requestId AND da.department = 'Convocation'")
    Optional<DepartmentApproval> findConvocationApprovalByRequestId(@Param("requestId") Long requestId);

    /**
     * Find all pending Convocation approvals
     */
    @Query("SELECT da FROM DepartmentApproval da WHERE da.department = 'Convocation' AND da.status = 'PENDING'")
    List<DepartmentApproval> findPendingConvocationApprovals();

    /**
     * Find Convocation approval for a student
     */
    @Query("SELECT da FROM DepartmentApproval da WHERE da.clearanceRequest.student.id = :studentId AND da.department = 'Convocation'")
    Optional<DepartmentApproval> findConvocationApprovalByStudentId(@Param("studentId") String studentId);

    // =========================================================
    // ORDER/SEQUENCE QUERIES
    // =========================================================

    /**
     * Find approvals for a clearance request ordered by sequence
     */
    @Query("SELECT da FROM DepartmentApproval da WHERE da.clearanceRequest.id = :requestId ORDER BY da.orderNumber ASC")
    List<DepartmentApproval> findByClearanceRequestIdOrderByOrderNumber(@Param("requestId") Long requestId);

    /**
     * Find the next pending approval in sequence for a clearance request
     */
    @Query("SELECT da FROM DepartmentApproval da WHERE da.clearanceRequest.id = :requestId AND da.status = 'PENDING' ORDER BY da.orderNumber ASC")
    List<DepartmentApproval> findNextPendingApproval(@Param("requestId") Long requestId);

    // =========================================================
    // CHECK EXISTENCE QUERIES
    // =========================================================

    /**
     * Check if a department approval exists
     */
    boolean existsByClearanceRequestIdAndDepartment(Long clearanceRequestId, String department);

    /**
     * Check if a department approval exists with a specific status
     */
    boolean existsByClearanceRequestIdAndDepartmentAndStatus(Long clearanceRequestId, String department, ClearanceStatus status);

    // =========================================================
    // DELETE QUERIES
    // =========================================================

    /**
     * Delete all approvals for a clearance request
     */
    void deleteByClearanceRequest(ClearanceRequest clearanceRequest);

    /**
     * Delete all approvals for a clearance request ID
     */
    void deleteByClearanceRequestId(Long clearanceRequestId);
}