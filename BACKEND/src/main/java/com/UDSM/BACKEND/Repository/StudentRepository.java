package com.UDSM.BACKEND.Repository;
import java.util.List;
import java.util.Optional;

import com.UDSM.BACKEND.Model.ClearanceStatus;
import com.UDSM.BACKEND.Model.Student;
import com.UDSM.BACKEND.Model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface StudentRepository extends JpaRepository<Student, String> {
    Optional<Student> findByRegistrationNumber(String registrationNumber);

    Optional<Student> findByRegistrationNumberIgnoreCase(String registrationNumber);

    Optional<Student> findByRegistrationNumberAndProjectId(String registrationNumber, String projectId);

    Optional<Student> findByRegistrationNumberIgnoreCaseAndProjectId(String registrationNumber, String projectId);

    Optional<Student> findByUser(User user);

    Optional<Student> findByUserId(String userId);

    Optional<Student> findByUserIdAndProjectId(String userId, String projectId);

    Optional<Student> findByEmail(String email);

    Optional<Student> findByEmailAndProjectId(String email, String projectId);
    List<Student> findByProjectId(String projectId);

    Optional<Student> findByIdAndProjectId(String id, String projectId);

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

    @Query("SELECT s FROM Student s WHERE " +
           "LOWER(s.registrationNumber) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(s.fullName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(s.email) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Student> searchStudents(@Param("q") String query, org.springframework.data.domain.Pageable pageable);
}
