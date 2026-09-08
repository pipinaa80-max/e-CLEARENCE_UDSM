package com.UDSM.BACKEND.Repository;

import com.UDSM.BACKEND.Model.ProjectLocalStorage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectLocalStorageRepository extends JpaRepository<ProjectLocalStorage, Long> {
    List<ProjectLocalStorage> findByProjectIdOrderByImportedAtDesc(String projectId);
}
