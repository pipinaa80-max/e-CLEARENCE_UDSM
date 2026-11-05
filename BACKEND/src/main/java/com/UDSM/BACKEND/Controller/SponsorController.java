package com.UDSM.BACKEND.Controller;

import com.UDSM.BACKEND.Model.Sponsor;
import com.UDSM.BACKEND.Repository.SponsorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/sponsors")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200", "http://127.0.0.1:4200"}, allowCredentials = "true")
@Slf4j
public class SponsorController {

    private final SponsorRepository sponsorRepository;

    // GET /api/v1/sponsors - List active sponsors (for students dropdown & all users)
    @GetMapping
    public ResponseEntity<List<Sponsor>> getActiveSponsors() {
        return ResponseEntity.ok(sponsorRepository.findByIsActiveTrueOrderByNameAsc());
    }

    // GET /api/v1/sponsors/all - List all sponsors (including inactive for admin)
    @GetMapping("/all")
    public ResponseEntity<List<Sponsor>> getAllSponsors() {
        return ResponseEntity.ok(sponsorRepository.findAllByOrderByNameAsc());
    }

    // POST /api/v1/sponsors - Admin creates new sponsor
    @PostMapping
    public ResponseEntity<Sponsor> createSponsor(@RequestBody Sponsor sponsor) {
        if (sponsor.getName() == null || sponsor.getName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sponsor name is required.");
        }
        String trimmedName = sponsor.getName().trim();
        if (sponsorRepository.findByNameIgnoreCase(trimmedName).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A sponsor with name '" + trimmedName + "' already exists.");
        }
        sponsor.setName(trimmedName);
        if (sponsor.getCode() == null || sponsor.getCode().trim().isEmpty()) {
            sponsor.setCode(trimmedName.toUpperCase().replaceAll("[^A-Z0-9]", "_"));
        } else {
            sponsor.setCode(sponsor.getCode().trim().toUpperCase());
        }
        Sponsor saved = sponsorRepository.save(sponsor);
        log.info("🏛️ Created new sponsor: {} ({})", saved.getName(), saved.getCode());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // PUT /api/v1/sponsors/{id} - Admin updates sponsor
    @PutMapping("/{id}")
    public ResponseEntity<Sponsor> updateSponsor(@PathVariable String id, @RequestBody Sponsor updated) {
        return sponsorRepository.findById(id).map(existing -> {
            if (updated.getName() != null && !updated.getName().trim().isEmpty()) {
                existing.setName(updated.getName().trim());
            }
            if (updated.getCode() != null) {
                existing.setCode(updated.getCode().trim().toUpperCase());
            }
            if (updated.getDescription() != null) {
                existing.setDescription(updated.getDescription().trim());
            }
            if (updated.getIsActive() != null) {
                existing.setIsActive(updated.getIsActive());
            }
            Sponsor saved = sponsorRepository.save(existing);
            return ResponseEntity.ok(saved);
        }).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sponsor not found."));
    }

    // DELETE /api/v1/sponsors/{id} - Admin deletes sponsor
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSponsor(@PathVariable String id) {
        return sponsorRepository.findById(id).map(existing -> {
            sponsorRepository.delete(existing);
            log.info("🗑️ Deleted sponsor: {}", existing.getName());
            return ResponseEntity.noContent().<Void>build();
        }).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sponsor not found."));
    }
}

