
package com.UDSM.BACKEND.Repository;
import java.util.List;

import com.UDSM.BACKEND.Model.ClearanceRequest;
import com.UDSM.BACKEND.Model.ClearanceStatus;
import com.UDSM.BACKEND.Model.DepartmentApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DepartmentApprovalRepository extends JpaRepository<DepartmentApproval, String> {
    List<DepartmentApproval> findByClearanceRequest(ClearanceRequest clearanceRequest);

    List<DepartmentApproval> findByClearanceRequestAndDepartment(ClearanceRequest clearanceRequest, String department);

    List<DepartmentApproval> findByDepartmentAndStatus(String department, ClearanceStatus status);

    long countByDepartmentAndStatus(String department, ClearanceStatus status);

    long countByClearanceRequestAndStatus(ClearanceRequest clearanceRequest, ClearanceStatus status);

    long countByClearanceRequest(ClearanceRequest request);
}
