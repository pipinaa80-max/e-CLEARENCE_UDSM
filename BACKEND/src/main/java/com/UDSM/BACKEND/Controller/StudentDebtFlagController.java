package com.UDSM.BACKEND.Controller;

import com.UDSM.BACKEND.Model.StudentDebtFlag;
import com.UDSM.BACKEND.Service.StudentDebtFlagService;
import com.UDSM.BACKEND.dto.CreateStudentDebtFlagRequest;
import com.UDSM.BACKEND.dto.ResolveStudentDebtFlagRequest;
import com.UDSM.BACKEND.dto.StudentClearanceLookupResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/student-debts")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class StudentDebtFlagController {
    private final StudentDebtFlagService debtService;

    @GetMapping
    @PreAuthorize("hasRole('LECTURER')")
    public List<StudentDebtFlag> listForLecturer(@AuthenticationPrincipal UserDetails user) {
        return debtService.listForLecturer(user.getUsername());
    }

    @GetMapping("/student-clearance")
    @PreAuthorize("hasRole('LECTURER')")
    public StudentClearanceLookupResponse lookupClearance(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam String registrationNumber) {
        return debtService.lookupClearance(user.getUsername(), registrationNumber);
    }

    @PostMapping
    @PreAuthorize("hasRole('LECTURER')")
    public ResponseEntity<StudentDebtFlag> create(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody CreateStudentDebtFlagRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(debtService.create(user.getUsername(), request));
    }

    @PatchMapping("/{flagId}/resolve")
    @PreAuthorize("hasRole('LECTURER')")
    public StudentDebtFlag resolve(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable String flagId,
            @Valid @RequestBody ResolveStudentDebtFlagRequest request) {
        return debtService.resolve(user.getUsername(), flagId, request);
    }

    @GetMapping("/department/open")
    @PreAuthorize("hasAnyRole('DEPARTMENT_OFFICER', 'FINANCE', 'FINANCE_OFFICER', 'PRINCIPAL', 'DEAN_OF_STUDENTS', 'ADMINISTRATOR', 'ADMIN', 'SUPERUSER', 'ICT', 'USAB', 'DARUSO', 'LIBRARY', 'GAMES_COACH', 'HALL_WARDEN', 'SMART_CARD', 'WORKSHOP', 'LABORATORY', 'CONVOCATION', 'DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'DUS_SECRETARY', 'STATION_SECRETARY', 'ACADEMIC_STAFF', 'LECTURER')")
    public List<StudentDebtFlag> listOpenForDepartment(@AuthenticationPrincipal UserDetails user) {
        return debtService.listOpenForDepartment(user.getUsername());
    }

    @GetMapping("/my-flags")
    @PreAuthorize("hasRole('STUDENT')")
    public List<StudentDebtFlag> listForStudent(@AuthenticationPrincipal UserDetails user) {
        return debtService.listForStudent(user.getUsername());
    }
}
