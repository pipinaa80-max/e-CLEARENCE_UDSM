package com.UDSM.BACKEND.Repository;

import com.UDSM.BACKEND.Model.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, String> {
    Optional<Department> findByCodeIgnoreCase(String code);
    Optional<Department> findByNameIgnoreCase(String name);
    List<Department> findByCollegeIdAndIsActiveTrueOrderByNameAsc(String collegeId);
    List<Department> findByIsActiveTrueOrderByNameAsc();
}
