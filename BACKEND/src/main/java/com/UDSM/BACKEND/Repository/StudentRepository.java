package com.UDSM.BACKEND.Repository;
import java.util.List;
import java.util.Optional;

import com.UDSM.BACKEND.Model.ClearanceStatus;
import com.UDSM.BACKEND.Model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface StudentRepository extends JpaRepository<Student, String> {
    Optional<Student> findByRegistrationNumber(String registrationNumber);

    Optional<Student> findByEmail(String email);

    List<Student> findByFaculty(String faculty);

    List<Student> findByDepartment(String department);

    List<Student> findByProgramme(String programme);

    List<Student> findByClearanceStatus(ClearanceStatus status);

    @Query("SELECT s FROM Student s WHERE s.isFinalYear = true")
    List<Student> findAllFinalYearStudents();

    @Query("SELECT s FROM Student s WHERE s.department = :department AND s.isFinalYear = true")
    List<Student> findFinalYearStudentsByDepartment(@Param("department") String department);

    @Query("SELECT COUNT(s) FROM Student s WHERE s.isFinalYear = true")
    long countFinalYearStudents();

    @Query("SELECT s.clearanceStatus, COUNT(s) FROM Student s GROUP BY s.clearanceStatus")
    List<Object[]> countByClearanceStatus();
}
