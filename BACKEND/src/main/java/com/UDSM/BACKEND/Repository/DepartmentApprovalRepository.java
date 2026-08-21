package com.UDSM.BACKEND.Repository;

import java.util.List;
import java.util.Optional;

import com.UDSM.BACKEND.Model.ClearanceRequest;
import com.UDSM.BACKEND.Model.ClearanceStatus;
import com.UDSM.BACKEND.Model.DepartmentApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DepartmentApprovalRepository extends JpaRepository<DepartmentApproval, Long> {

    List<DepartmentApproval> findByClearanceRequest(ClearanceRequest clearanceRequest);

    Optional<DepartmentApproval> findByClearanceRequestAndDepartment(ClearanceRequest clearanceRequest, String department);

    long countByClearanceRequest(ClearanceRequest clearanceRequest);

    long countByClearanceRequestAndStatus(ClearanceRequest clearanceRequest, ClearanceStatus status);
}