package com.UDSM.BACKEND.Repository;

import com.UDSM.BACKEND.Model.College;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CollegeRepository extends JpaRepository<College, String> {
    Optional<College> findByCodeIgnoreCase(String code);
    Optional<College> findByNameIgnoreCase(String name);
    List<College> findByIsActiveTrueOrderByNameAsc();
}
