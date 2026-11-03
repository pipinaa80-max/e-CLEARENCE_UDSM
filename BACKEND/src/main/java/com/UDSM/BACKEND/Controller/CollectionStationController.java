package com.UDSM.BACKEND.Controller;

import com.UDSM.BACKEND.Model.CollectionStation;
import com.UDSM.BACKEND.Repository.CollectionStationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/collection-stations")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*", maxAge = 3600)
public class CollectionStationController {

    private final CollectionStationRepository stationRepository;

    // GET /api/v1/collection-stations - Public / Student endpoint for active pickup stations
    @GetMapping
    public ResponseEntity<List<CollectionStation>> getActiveStations() {
        return ResponseEntity.ok(stationRepository.findByIsActiveTrueOrderByRegionAscNameAsc());
    }

    // GET /api/v1/collection-stations/all - Director / Admin endpoint for all stations
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'DUS_SECRETARY', 'ADMINISTRATOR', 'SUPERUSER')")
    public ResponseEntity<List<CollectionStation>> getAllStations() {
        return ResponseEntity.ok(stationRepository.findAllByOrderByRegionAscNameAsc());
    }

    // POST /api/v1/collection-stations - Create new station
    @PostMapping
    @PreAuthorize("hasAnyRole('DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'ADMINISTRATOR', 'SUPERUSER')")
    public ResponseEntity<CollectionStation> createStation(@RequestBody CollectionStation station) {
        log.info("Creating new collection station: {} ({})", station.getName(), station.getRegion());
        CollectionStation saved = stationRepository.save(station);
        return ResponseEntity.ok(saved);
    }

    // PUT /api/v1/collection-stations/{id} - Update station
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'ADMINISTRATOR', 'SUPERUSER')")
    public ResponseEntity<CollectionStation> updateStation(@PathVariable String id, @RequestBody CollectionStation updated) {
        return stationRepository.findById(id).map(existing -> {
            if (updated.getName() != null) existing.setName(updated.getName());
            if (updated.getCode() != null) existing.setCode(updated.getCode());
            if (updated.getRegion() != null) existing.setRegion(updated.getRegion());
            if (updated.getDistrict() != null) existing.setDistrict(updated.getDistrict());
            if (updated.getAddress() != null) existing.setAddress(updated.getAddress());
            if (updated.getOperatingHours() != null) existing.setOperatingHours(updated.getOperatingHours());
            if (updated.getContactPhone() != null) existing.setContactPhone(updated.getContactPhone());
            if (updated.getContactEmail() != null) existing.setContactEmail(updated.getContactEmail());
            if (updated.getIsActive() != null) existing.setIsActive(updated.getIsActive());
            return ResponseEntity.ok(stationRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    // DELETE /api/v1/collection-stations/{id} - Soft delete / deactivate station
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'ADMINISTRATOR', 'SUPERUSER')")
    public ResponseEntity<Void> deleteStation(@PathVariable String id) {
        return stationRepository.findById(id).map(st -> {
            st.setIsActive(false);
            stationRepository.save(st);
            return ResponseEntity.noContent().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
