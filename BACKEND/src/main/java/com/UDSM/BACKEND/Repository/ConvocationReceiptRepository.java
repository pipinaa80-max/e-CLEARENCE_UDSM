package com.UDSM.BACKEND.Repository;


import com.UDSM.BACKEND.Model.ClearanceStatus;
import com.UDSM.BACKEND.Model.ConvocationReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConvocationReceiptRepository extends JpaRepository<ConvocationReceipt, String> {

    Optional<ConvocationReceipt> findByStudentIdAndStatus(String studentId, ClearanceStatus status);

    List<ConvocationReceipt> findByStatus(ClearanceStatus status);

    List<ConvocationReceipt> findByStudentIdOrderBySubmittedAtDesc(String studentId);

    List<ConvocationReceipt> findByStudentId(String studentId);
}
