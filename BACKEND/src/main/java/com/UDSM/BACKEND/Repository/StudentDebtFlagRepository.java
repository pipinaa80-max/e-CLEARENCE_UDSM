package com.UDSM.BACKEND.Repository;

import com.UDSM.BACKEND.Model.StudentDebtFlag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StudentDebtFlagRepository extends JpaRepository<StudentDebtFlag, String> {
    List<StudentDebtFlag> findByCollegeIgnoreCaseAndDepartmentIgnoreCaseOrderByCreatedAtDesc(String college, String department);
}
