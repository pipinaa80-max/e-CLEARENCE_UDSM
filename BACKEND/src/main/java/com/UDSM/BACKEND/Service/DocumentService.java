
package com.UDSM.BACKEND.Service;

import com.UDSM.BACKEND.Model.Document;
import com.UDSM.BACKEND.Model.DocumentCategory;
import com.UDSM.BACKEND.Model.Student;
import com.UDSM.BACKEND.Repository.DocumentRepository;
import com.UDSM.BACKEND.Repository.StudentRepository;
import com.UDSM.BACKEND.dto.ApiResponse;
import com.UDSM.BACKEND.dto.DocumentDTO;
import com.UDSM.BACKEND.dto.DocumentResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final StudentRepository studentRepository;
    private final FileStorageService fileStorageService;

    private static final List<String> REQUIRED_CLEARANCE_DOCUMENTS = Arrays.asList(
            "Transcript", "O-Level Certificate", "A-Level Certificate", "Identity Document"
    );

    @Transactional
    public ApiResponse uploadDocument(DocumentDTO documentDTO, MultipartFile file) {
        try {
            Student student = studentRepository.findById(documentDTO.getStudentId())
                .or(() -> studentRepository.findByUserId(documentDTO.getStudentId()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));
            String studentId = student.getId();

            // Check if document already exists
            if (documentRepository.existsByStudentIdAndFileType(studentId, documentDTO.getFileType())) {
                return ApiResponse.error(documentDTO.getFileType() + " has already been uploaded.");
            }

            // Save file and get URL
            String fileUrl = fileStorageService.storeFile(file, student.getRegistrationNumber());

            DocumentCategory category = DocumentCategory.fromDisplayName(documentDTO.getFileType());

            Document document = Document.builder()
                    .fileName(file.getOriginalFilename())
                    .fileType(documentDTO.getFileType())
                    .fileSize(file.getSize())
                    .fileUrl(fileUrl)
                    .category(category)
                    .student(student)
                    .verified(false)
                    .description(documentDTO.getDescription())
                    .uploadDate(LocalDateTime.now())
                    .build();

            Document savedDocument = documentRepository.save(document);

            // Check if all required documents are uploaded
            boolean hasAllDocuments = hasRequiredClearanceDocuments(studentId);

            DocumentResponse response = DocumentResponse.fromDocument(savedDocument);
            response.setHasAllRequiredDocuments(hasAllDocuments);
            response.setMissingDocuments(getMissingDocuments(studentId));

            return ApiResponse.success("Document uploaded successfully", response);

        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to upload document");
        }
    }

    public List<Document> getStudentDocuments(String studentId) {
        return documentRepository.findByStudentId(studentId);
    }

    public Page<DocumentResponse> getStudentDocumentsWithPagination(String studentId, Pageable pageable) {
        Student student = findStudent(studentId);

        Page<Document> documents = documentRepository.findByStudentId(student.getId(), pageable);

        List<DocumentResponse> responses = documents.getContent().stream()
                .map(DocumentResponse::fromDocument)
                .collect(Collectors.toList());

        return new PageImpl<>(responses, pageable, documents.getTotalElements());
    }

    private Student findStudent(String studentId) {
        return studentRepository.findById(studentId)
                .or(() -> studentRepository.findByUserId(studentId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));
    }

    public boolean hasRequiredClearanceDocuments(String studentId) {
        List<String> uploadedCategories = documentRepository.findByStudentId(studentId)
                .stream()
                .map(Document::getFileType)
                .collect(Collectors.toList());

        return uploadedCategories.containsAll(REQUIRED_CLEARANCE_DOCUMENTS);
    }

    public List<String> getMissingDocuments(String studentId) {
        List<String> uploadedCategories = documentRepository.findByStudentId(studentId)
                .stream()
                .map(Document::getFileType)
                .collect(Collectors.toList());

        List<String> missing = new ArrayList<>();
        for (String required : REQUIRED_CLEARANCE_DOCUMENTS) {
            if (!uploadedCategories.contains(required)) {
                missing.add(required);
            }
        }
        return missing;
    }

    public List<String> getUploadedDocumentCategories(String studentId) {
        return documentRepository.findByStudentId(findStudent(studentId).getId())
                .stream()
                .map(Document::getFileType)
                .collect(Collectors.toList());
    }

    @Transactional
    public ApiResponse verifyDocument(String documentId, String officerId, boolean verified, String comment) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        document.setVerified(verified);
        document.setVerifiedBy(officerId);
        document.setVerifiedDate(LocalDateTime.now());
        document.setVerificationComment(comment);

        documentRepository.save(document);

        return ApiResponse.success("Document " + (verified ? "verified" : "rejected") + " successfully");
    }

    public ApiResponse getDocumentVerificationStatus(String studentId) {
        List<Document> documents = documentRepository.findByStudentId(studentId);

        boolean allVerified = documents.stream()
                .filter(doc -> REQUIRED_CLEARANCE_DOCUMENTS.contains(doc.getFileType()))
                .allMatch(Document::isVerified);

        return ApiResponse.success("Document verification status retrieved",
                new DocumentVerificationStatus(studentId, documents, allVerified));
    }

    @Transactional
    public ApiResponse deleteDocument(String documentId, String studentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        if (!document.getStudent().getId().equals(studentId)) {
            return ApiResponse.error("You can only delete your own documents");
        }

        // Delete file from storage
        fileStorageService.deleteFile(document.getFileUrl());

        documentRepository.delete(document);
        return ApiResponse.success("Document deleted successfully");
    }

    // Inner class for document verification status
    @lombok.Data
    @lombok.AllArgsConstructor
    public static class DocumentVerificationStatus {
        private String studentId;
        private List<Document> documents;
        private boolean allRequiredDocumentsVerified;
    }

    // You'll need to create this service for file storage
    @Service
    public static class FileStorageService {
        public String storeFile(MultipartFile file, String studentRegNumber) throws IOException {
            // Implementation for file storage (e.g., AWS S3, local file system, etc.)
            // Return the file URL
            return "/uploads/" + studentRegNumber + "/" + file.getOriginalFilename();
        }

        public void deleteFile(String fileUrl) {
            // Implementation for file deletion
        }
    }
}