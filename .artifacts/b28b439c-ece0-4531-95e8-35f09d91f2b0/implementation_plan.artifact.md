# Implementation Plan - Admin Dashboard Enhancements

This plan outlines the steps to create a comprehensive Admin Dashboard that allows manual data entry, CSV/Excel bulk uploads, and full user management (add, delete, permit). It also includes a monitoring view for all clearance requests.

## User Review Required

> [!IMPORTANT]
> The admin dashboard will allow permanent deletion of users. We should ensure that deleting a user also handles related records (like Students and ClearanceRequests) or prevents deletion if active records exist.

## Proposed Changes

### Backend (Spring Boot)

#### [MODIFY] [pom.xml](file:///home/kali/e-CLEARENCE_UDSM/BACKEND/pom.xml)
- Add dependencies for CSV and Excel processing:
  - `org.apache.poi:poi-ooxml` (Excel)
  - `com.opencsv:opencsv` (CSV)

#### [NEW] [AdminController.java](file:///home/kali/e-CLEARENCE_UDSM/BACKEND/src/main/java/com/UDSM/BACKEND/Controller/AdminController.java)
- Create REST endpoints for:
  - `GET /api/admin/users`: List all users with pagination and filtering.
  - `POST /api/admin/users`: Manual user creation (calls AuthService.register).
  - `DELETE /api/admin/users/{userId}`: Delete a user.
  - `PUT /api/admin/users/{userId}/role`: Update user role.
  - `POST /api/admin/users/bulk-upload`: Handle CSV/Excel file uploads for bulk user/student creation.
  - `GET /api/admin/clearance-requests`: Overview of all clearance requests.

#### [NEW] [AdminService.java](file:///home/kali/e-CLEARENCE_UDSM/BACKEND/src/main/java/com/UDSM/BACKEND/Service/AdminService.java)
- Implement logic for:
  - Fetching and managing users.
  - Parsing CSV and Excel files.
  - Bulk saving users and student records.
  - Aggregating clearance request data for the dashboard.

---

### Frontend (Angular)

#### [MODIFY] [admin.ts](file:///home/kali/e-CLEARENCE_UDSM/FRONTEND/angular-app/src/app/dashboard/admin/admin.ts)
- Update the component logic to handle navigation between different admin sections (Users, Clearance, Data Upload).
- Integrate the new `AdminService`.

#### [MODIFY] [admin.html](file:///home/kali/e-CLEARENCE_UDSM/FRONTEND/angular-app/src/app/dashboard/admin/admin.html)
- Redesign the layout to include:
  - Sidebar for navigation.
  - Main area with dynamic views based on selected tab.
  - User management table with Add/Edit/Delete/Permit actions.
  - Data population form (Manual).
  - File upload component (CSV/Excel).
  - Clearance requests monitoring table.

#### [MODIFY] [admin.css](file:///home/kali/e-CLEARENCE_UDSM/FRONTEND/angular-app/src/app/dashboard/admin/admin.css)
- Add styles for the new dashboard components, tables, and forms.

#### [NEW] [admin.service.ts](file:///home/kali/e-CLEARENCE_UDSM/FRONTEND/angular-app/src/app/core/services/admin.service.ts)
- Create an Angular service to interact with the backend `AdminController`.

---

## Verification Plan

### Automated Tests
- **Backend**: Unit tests for `AdminService` to verify CSV/Excel parsing logic.
- **Frontend**: Component tests for `AdminDashboard` to ensure tab navigation and data display work correctly.

### Manual Verification
- Log in as an admin user.
- Add a user manually and verify they can log in.
- Upload a sample CSV file and verify students are created.
- Delete a test user and verify they are removed from the database.
- Change a user's role and verify the change is reflected.
- View the clearance requests table and verify it shows all submitted requests.
