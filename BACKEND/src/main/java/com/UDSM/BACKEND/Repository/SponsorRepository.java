package com.UDSM.BACKEND.Repository;

import com.UDSM.BACKEND.Model.Sponsor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SponsorRepository extends JpaRepository<Sponsor, String> {
    List<Sponsor> findByIsActiveTrueOrderByNameAsc();
    List<Sponsor> findAllByOrderByNameAsc();
    Optional<Sponsor> findByNameIgnoreCase(String name);
}

