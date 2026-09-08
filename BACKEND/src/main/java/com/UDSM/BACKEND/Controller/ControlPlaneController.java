package com.UDSM.BACKEND.Controller;

import com.UDSM.BACKEND.Service.ControlPlaneService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/control-plane")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ControlPlaneController {
    private final ControlPlaneService service;

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> input) {
        return ResponseEntity.ok(service.login(input.get("email"), input.get("password")));
    }

    @GetMapping("/overview")
    @PreAuthorize("hasAnyRole('SUPERUSER', 'ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> overview() {
        return ResponseEntity.ok(service.overview());
    }

    @GetMapping("/sub-admins")
    @PreAuthorize("hasRole('SUPERUSER')")
    public ResponseEntity<List<Map<String, Object>>> admins() {
        return ResponseEntity.ok(service.admins());
    }

    @PostMapping("/sub-admins")
    @PreAuthorize("hasRole('SUPERUSER')")
    public ResponseEntity<Map<String, Object>> createAdmin(@RequestBody Map<String, Object> input) {
        return ResponseEntity.status(201).body(service.createAdmin(input));
    }

    @PutMapping("/sub-admins/{id}")
    @PreAuthorize("hasRole('SUPERUSER')")
    public ResponseEntity<Map<String, Object>> updateAdmin(@PathVariable String id, @RequestBody Map<String, Object> input) {
        return ResponseEntity.ok(service.updateAdmin(id, input));
    }

    @DeleteMapping("/sub-admins/{id}")
    @PreAuthorize("hasRole('SUPERUSER')")
    public ResponseEntity<Void> deleteAdmin(@PathVariable String id) {
        service.deleteAdmin(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/sub-admins/{id}/reset-password")
    @PreAuthorize("hasRole('SUPERUSER')")
    public ResponseEntity<Map<String, Object>> resetPassword(@PathVariable String id) {
        return ResponseEntity.ok(service.resetPassword(id));
    }

    @PutMapping("/branding")
    @PreAuthorize("hasAnyRole('SUPERUSER', 'ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> branding(@RequestBody Map<String, Object> input) {
        return ResponseEntity.ok(service.saveBranding(input));
    }

    @PutMapping("/global-branding")
    @PreAuthorize("hasRole('SUPERUSER')")
    public ResponseEntity<Map<String, Object>> globalBranding(@RequestBody Map<String, Object> input) {
        return ResponseEntity.ok(service.saveBranding(input));
    }

    @PostMapping("/dashboards")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> addDashboard(@RequestBody Map<String, Object> input) {
        return ResponseEntity.status(201).body(service.addDashboard(input));
    }

    @PutMapping("/dashboards/{id}")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> updateDashboard(@PathVariable String id, @RequestBody Map<String, Object> input) {
        return ResponseEntity.ok(service.updateDashboard(id, input));
    }

    @DeleteMapping("/dashboards/{id}")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Void> deleteDashboard(@PathVariable String id) {
        service.deleteDashboard(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/public/branding")
    public ResponseEntity<Map<String, Object>> publicBranding() {
        return ResponseEntity.ok(service.publicBranding());
    }
}
