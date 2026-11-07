package com.UDSM.BACKEND.Controller;

import com.UDSM.BACKEND.Model.College;
import com.UDSM.BACKEND.Model.Department;
import com.UDSM.BACKEND.Repository.CollegeRepository;
import com.UDSM.BACKEND.Repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/colleges")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200", "http://127.0.0.1:4200"}, allowCredentials = "true")
public class CollegeDepartmentController {

    private final CollegeRepository collegeRepository;
    private final DepartmentRepository departmentRepository;

    // GET /api/v1/colleges - List all active colleges with their departments (Cached for high throughput)
    @GetMapping
    @Cacheable(value = "colleges")
    public ResponseEntity<List<College>> getAllColleges() {
        return ResponseEntity.ok(collegeRepository.findByIsActiveTrueOrderByNameAsc());
    }

    // GET /api/v1/colleges/{id} - Get college by ID
    @GetMapping("/{id}")
    public ResponseEntity<College> getCollegeById(@PathVariable String id) {
        return collegeRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST /api/v1/colleges - Create independent college
    @PostMapping
    @CacheEvict(value = {"colleges", "departments"}, allEntries = true)
    public ResponseEntity<College> createCollege(@RequestBody College college) {
        College saved = collegeRepository.save(college);
        return ResponseEntity.ok(saved);
    }

    // PUT /api/v1/colleges/{id} - Update college
    @PutMapping("/{id}")
    @CacheEvict(value = {"colleges", "departments"}, allEntries = true)
    public ResponseEntity<College> updateCollege(@PathVariable String id, @RequestBody College updated) {
        return collegeRepository.findById(id).map(existing -> {
            if (updated.getName() != null) existing.setName(updated.getName());
            if (updated.getCode() != null) existing.setCode(updated.getCode());
            if (updated.getDescription() != null) existing.setDescription(updated.getDescription());
            if (updated.getIsActive() != null) existing.setIsActive(updated.getIsActive());
            return ResponseEntity.ok(collegeRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    // DELETE /api/v1/colleges/{id} - Soft delete college
    @DeleteMapping("/{id}")
    @CacheEvict(value = {"colleges", "departments"}, allEntries = true)
    public ResponseEntity<Void> deleteCollege(@PathVariable String id) {
        return collegeRepository.findById(id).map(c -> {
            c.setIsActive(false);
            collegeRepository.save(c);
            return ResponseEntity.noContent().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // GET /api/v1/colleges/departments - List all active departments (Cached)
    @GetMapping("/departments")
    @Cacheable(value = "departments")
    public ResponseEntity<List<Department>> getAllDepartments() {
        return ResponseEntity.ok(departmentRepository.findByIsActiveTrueOrderByNameAsc());
    }

    // GET /api/v1/colleges/{collegeId}/departments - List departments for a specific college
    @GetMapping("/{collegeId}/departments")
    public ResponseEntity<List<Department>> getDepartmentsByCollege(@PathVariable String collegeId) {
        return ResponseEntity.ok(departmentRepository.findByCollegeIdAndIsActiveTrueOrderByNameAsc(collegeId));
    }

    // POST /api/v1/colleges/{collegeId}/departments - Create department under college
    @PostMapping("/{collegeId}/departments")
    @CacheEvict(value = {"colleges", "departments"}, allEntries = true)
    public ResponseEntity<Department> createDepartment(@PathVariable String collegeId, @RequestBody Department dept) {
        return collegeRepository.findById(collegeId).map(college -> {
            dept.setCollege(college);
            Department saved = departmentRepository.save(dept);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    // PUT /api/v1/colleges/departments/{deptId} - Update department
    @PutMapping("/departments/{deptId}")
    @CacheEvict(value = {"colleges", "departments"}, allEntries = true)
    public ResponseEntity<Department> updateDepartment(@PathVariable String deptId, @RequestBody Department updated) {
        return departmentRepository.findById(deptId).map(existing -> {
            if (updated.getName() != null) existing.setName(updated.getName());
            if (updated.getCode() != null) existing.setCode(updated.getCode());
            if (updated.getDescription() != null) existing.setDescription(updated.getDescription());
            if (updated.getIsActive() != null) existing.setIsActive(updated.getIsActive());
            return ResponseEntity.ok(departmentRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }
}
