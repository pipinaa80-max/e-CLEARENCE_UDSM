// department-officer.component.ts
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { ClearanceRequest } from '../../core/models/clearance.model';
import { StudentDebtService } from '../../core/services/student-debt.service';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { timeout } from 'rxjs';

@Component({
    selector: 'app-department-officer',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
    templateUrl: './department-officer.html',
    styleUrl: './department-officer.css'
})
export class DepartmentOfficerComponent implements OnInit, OnDestroy {
    private readonly authService = inject(AuthService);
    private readonly clearanceService = inject(ClearanceService);
    private readonly notificationService = inject(NotificationService);
    private readonly toastService = inject(ToastService);
    private readonly studentDebtService = inject(StudentDebtService);
    private readonly router = inject(Router);

    sidebarOpen = false;
    isLoading = false;
    message = '';
    searchTerm = '';
    filterStatus = 'pending';
    currentPage = 1;
    pageSize = 10;

    get paginatedRequests(): ClearanceRequest[] {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.filteredRequests.slice(start, start + this.pageSize);
    }

    get totalPages(): number {
        return Math.ceil(this.filteredRequests.length / this.pageSize) || 1;
    }

    nextPage(): void {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    prevPage(): void {
        if (this.currentPage > 1) {
            this.currentPage--;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    onFilterChange(): void {
        this.currentPage = 1;
        this.applyFilters();
    }

    pendingRequests: ClearanceRequest[] = [];
    filteredRequests: ClearanceRequest[] = [];
    selectedRequest: ClearanceRequest | null = null;
    rejectionComment = '';
    openDebtRegistrations = new Set<string>();
    debtFlagsLoaded = false;
    debtFlagsLoading = false;
    debtFlagCheckError = '';
    private debtFlagRefreshTimer: ReturnType<typeof setInterval> | null = null;

    private studentCache: Map<string, any> = new Map();

    get currentUser() {
        return this.authService.getCurrentUser();
    }

    get departmentName(): string {
        return this.currentUser?.department || 'Department';
    }

    get pendingRequestCount(): number {
        return this.pendingRequests.filter(request =>
            this.getRequestOfficeStatus(request, 'Department') === 'Pending'
        ).length;
    }

    ngOnInit(): void {
        this.loadData();
        this.debtFlagRefreshTimer = setInterval(() => this.loadOpenDebtFlags(), 30000);
    }

    ngOnDestroy(): void {
        if (this.debtFlagRefreshTimer) clearInterval(this.debtFlagRefreshTimer);
    }

    loadData(): void {
        this.isLoading = true;
        this.studentCache.clear();

        const user = this.currentUser;
        if (!user) {
            this.router.navigate(['/login']);
            this.isLoading = false;
            return;
        }

        this.loadOpenDebtFlags();

        const departmentRequests = this.clearanceService.getRequestsForOffice(
            'Department',
            user.college,
            user.department
        );

        this.pendingRequests = this.clearanceService.getAllRequests().filter(request => {
            if (departmentRequests.some(departmentRequest => departmentRequest.id === request.id)) {
                return true;
            }

            if (request.department !== user.department) return false;
            return request.currentStage === 'Principal' ||
                request.currentStage === 'Finance' ||
                request.status === 'Completed';
        });

        this.applyFilters();
        this.currentPage = Math.min(this.currentPage, this.totalPages);

        this.isLoading = false;
        console.log('Department requests loaded:', this.pendingRequests.length);
    }

    loadOpenDebtFlags(): void {
        if (this.debtFlagsLoading) return;
        this.debtFlagsLoading = true;
        this.debtFlagCheckError = '';
        this.studentDebtService.listOpenForDepartment().pipe(timeout({ first: 8000 })).subscribe({
            next: flags => {
                const safeFlags = Array.isArray(flags) ? flags : [];
                this.openDebtRegistrations = new Set(safeFlags
                    .map(flag => this.normalizeRegistrationNumber(flag?.registrationNumber ?? ''))
                    .filter(Boolean));
                this.debtFlagsLoaded = true;
                this.debtFlagsLoading = false;
            },
            error: error => {
                this.debtFlagsLoaded = false;
                this.debtFlagsLoading = false;
                this.debtFlagCheckError = 'Could not check the lecturer debt register. Retry the check before approving.';
                console.error('Could not load departmental debt flags:', error);
            }
        });
    }

    getRequestOfficeStatus(request: ClearanceRequest, office: string): string {
        return request.approvals.find(approval => approval.office === office)?.status ?? 'Pending';
    }

    hasOpenDebtFlag(request: ClearanceRequest): boolean {
        return this.openDebtRegistrations.has(this.normalizeRegistrationNumber(this.getStudentRegNumber(request)));
    }

    private normalizeRegistrationNumber(value: string): string {
        return (value || '').trim().toUpperCase();
    }

    applyFilters(): void {
        let filtered = [...this.pendingRequests];

        if (this.filterStatus === 'pending') {
            filtered = filtered.filter(r => this.getRequestOfficeStatus(r, 'Department') === 'Pending');
        } else if (this.filterStatus === 'approved') {
            filtered = filtered.filter(r => this.getRequestOfficeStatus(r, 'Department') === 'Approved');
        } else if (this.filterStatus === 'rejected') {
            filtered = filtered.filter(r => this.getRequestOfficeStatus(r, 'Department') === 'Rejected');
        }

        if (this.searchTerm.trim()) {
            const term = this.searchTerm.trim().toLowerCase();
            filtered = filtered.filter(r => {
                const name = this.getStudentName(r).toLowerCase();
                const reg = this.getStudentRegNumber(r).toLowerCase();
                const prog = (r.programme || '').toLowerCase();
                return name.includes(term) || reg.includes(term) || prog.includes(term);
            });
        }

        this.filteredRequests = filtered;
    }

    private getStudentData(studentId: string): any | null {
        if (this.studentCache.has(studentId)) {
            return this.studentCache.get(studentId);
        }

        try {
            const usersJson = localStorage.getItem('udsm-local-users');
            if (usersJson) {
                const users = JSON.parse(usersJson);
                const user = users.find((u: any) => u.id === studentId);
                if (user) {
                    this.studentCache.set(studentId, user);
                    return user;
                }
            }
        } catch (error) {
            console.error('Error fetching student data:', error);
        }
        return null;
    }

    getStudentName(request: ClearanceRequest): string {
        if (request.studentName) return request.studentName;
        const user = this.getStudentData(request.studentId);
        if (user) {
            return user.fullName || user.firstName + ' ' + user.lastName || user.registrationNumber || 'Student';
        }
        return request.registrationNumber || 'Student #' + request.studentId.substring(0, 8);
    }

    getStudentListName(request: ClearanceRequest): string {
        const user = this.getStudentData(request.studentId);
        const firstName = user?.firstName?.trim();
        const middleName = user?.middleName?.trim();
        const lastName = user?.lastName?.trim();
        if (firstName && lastName) return `${lastName}, ${[firstName, middleName].filter(Boolean).join(' ')}`.toUpperCase();
        const fullName = (request.studentName || user?.fullName || '').trim();
        if (!fullName) return '—';
        const parts = fullName.split(/\s+/).filter(Boolean);
        return parts.length > 1 ? `${parts.pop()}, ${parts.join(' ')}`.toUpperCase() : fullName.toUpperCase();
    }

    getStudentRegNumber(request: ClearanceRequest): string {
        if (request.registrationNumber) return request.registrationNumber;
        const user = this.getStudentData(request.studentId);
        if (user) {
            return user.registrationNumber || user.studentId || 'Not available';
        }
        return 'Not available';
    }

    getStudentGender(request: ClearanceRequest): string {
        const gender = this.getStudentData(request.studentId)?.gender || (request as ClearanceRequest & { gender?: string }).gender;
        return typeof gender === 'string' && gender.trim() ? gender.trim() : '—';
    }

    getStudentEmail(request: ClearanceRequest): string {
        return request.email?.trim() || this.getStudentData(request.studentId)?.email?.trim() || '—';
    }

    getStudentPhone(request: ClearanceRequest): string {
        const user = this.getStudentData(request.studentId);
        return request.phoneNumber?.trim() || user?.phoneNumber?.trim() || user?.phone?.trim() || '—';
    }

    getStudentProgramme(request: ClearanceRequest): string {
        return request.programme?.trim() || this.getStudentData(request.studentId)?.programme?.trim() || '—';
    }

    readonly processingRequests = new Set<string>();

    approveRequest(request: ClearanceRequest): void {
        if (!this.debtFlagsLoaded) {
            this.toastService.warning('Debt Flags Unavailable', 'Verification is disabled until the student debt register can be checked.');
            return;
        }
        if (this.hasOpenDebtFlag(request)) {
            this.toastService.warning('Debt Flag Open', 'Department verification is disabled until the Lecturer resolves the student debt flag.');
            return;
        }
        if (this.processingRequests.has(request.id) || this.getRequestOfficeStatus(request, 'Department') !== 'Pending') return;
        const staff = this.currentUser;
        if (!staff) {
            this.router.navigate(['/login']);
            return;
        }

        this.processingRequests.add(request.id);
        try {
            const approved = this.clearanceService.approveRequest(
                request.id,
                'Department',
                staff.fullName || staff.firstName + ' ' + staff.lastName
            );
            if (!approved) {
                this.toastService.error('Approve Failed', 'This request is no longer pending Department approval.');
                return;
            }
            this.notificationService.createNotification(
                request.studentId,
                'Department Clearance Approved',
                'Your clearance request has been approved by the Department.',
                'success'
            );
            this.toastService.success('Success', 'Request approved successfully!');
            this.loadData();
        } catch (error: any) {
            this.toastService.error('Approve Failed', error?.message || 'Failed to approve request.');
        } finally {
            this.processingRequests.delete(request.id);
        }
    }

    openRejectForm(request: ClearanceRequest): void {
        this.selectedRequest = request;
        this.rejectionComment = '';
    }

    rejectRequest(): void {
        const request = this.selectedRequest;
        if (!request || this.processingRequests.has(request.id)) return;
        if (!this.rejectionComment.trim()) {
            this.toastService.warning('Comment Required', 'Please provide a reason for rejection.');
            return;
        }
        const staff = this.currentUser;
        if (!staff) {
            this.router.navigate(['/login']);
            return;
        }

        this.processingRequests.add(request.id);
        try {
            const rejected = this.clearanceService.rejectRequest(
                request.id,
                'Department',
                staff.fullName || staff.firstName + ' ' + staff.lastName,
                this.rejectionComment.trim()
            );
            if (!rejected) {
                this.toastService.error('Reject Failed', 'This request is no longer pending Department approval.');
                return;
            }
            this.notificationService.createNotification(
                request.studentId,
                'Department Clearance Rejected',
                this.rejectionComment.trim(),
                'warning'
            );
            this.toastService.success('Success', 'Request rejected successfully.');
            this.selectedRequest = null;
            this.rejectionComment = '';
            this.loadData();
        } catch (error: any) {
            this.toastService.error('Reject Failed', error?.message || 'Failed to reject request.');
        } finally {
            this.processingRequests.delete(request.id);
        }
    }

    reviewRequest(requestId: string): void {
        this.router.navigate(['/department/review', requestId]);
    }

    toggleSidebar(): void {
        this.sidebarOpen = !this.sidebarOpen;
    }

    closeSidebar(): void {
        this.sidebarOpen = false;
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}
