package com.UDSM.BACKEND.Repository;

import com.UDSM.BACKEND.Model.Document;
import com.UDSM.BACKEND.Model.DocumentCategory;
import com.UDSM.BACKEND.Model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, String> {

    List<Document> findByStudentId(String studentId);

    Page<Document> findByStudentId(String studentId, Pageable pageable);

    List<Document> findByStudentIdAndCategory(String studentId, DocumentCategory category);

    Optional<Document> findByStudentIdAndFileType(String studentId, String fileType);

    @Query("SELECT d FROM Document d WHERE d.student = :student ORDER BY d.uploadDate DESC")
    List<Document> findDocumentsByStudentOrderByDateDesc(@Param("student") Student student);

    @Query("SELECT d FROM Document d WHERE d.student.id = :studentId AND d.verified = false")
    List<Document> findUnverifiedDocumentsByStudentId(@Param("studentId") String studentId);

    boolean existsByStudentIdAndFileType(String studentId, String fileType);

    long countByStudentId(String studentId);
}