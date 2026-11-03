package com.UDSM.BACKEND.Repository;

import com.UDSM.BACKEND.Model.CollectionStation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CollectionStationRepository extends JpaRepository<CollectionStation, String> {
    Optional<CollectionStation> findByCodeIgnoreCase(String code);
    List<CollectionStation> findByIsActiveTrueOrderByRegionAscNameAsc();
    List<CollectionStation> findAllByOrderByRegionAscNameAsc();
    List<CollectionStation> findByRegionIgnoreCaseAndIsActiveTrue(String region);
}
