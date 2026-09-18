// department-officer.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ClearanceRequest } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

@Component({
    selector: 'app-department-officer',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
    templateUrl: './department-officer.html',
    styleUrl: './department-officer.css'
})
export class DepartmentOfficerComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly clearanceService = inject(ClearanceService);
    private readonly notificationService = inject(NotificationService);
    private readonly router = inject(Router);

    sidebarOpen = false;
    isLoading = false;
    message = '';
    errorMessage = '';
    searchTerm = '';
    filterStatus = 'all';

    pendingRequests: ClearanceRequest[] = [];
    filteredRequests: ClearanceRequest[] = [];

    private studentCache: Map<string, any> = new Map();

    totalPending = 0;
    totalApproved = 0;
    totalRejected = 0;

    get currentUser() {
        return this.authService.getCurrentUser();
    }

    get departmentName(): string {
        return this.currentUser?.department || 'Department';
    }

    ngOnInit(): void {
        this.loadData();
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

        this.updateStats();
        this.applyFilters();

        this.isLoading = false;
        console.log('Department requests loaded:', this.pendingRequests.length);
    }

    updateStats(): void {
        this.totalPending = this.pendingRequests.filter(r =>
            r.currentStage === 'Department' && r.status === 'Pending'
        ).length;

        this.totalApproved = this.pendingRequests.filter(r =>
            r.status === 'Completed'
        ).length;

        this.totalRejected = this.pendingRequests.filter(r =>
            r.status === 'Rejected'
        ).length;
    }

    applyFilters(): void {
        let filtered = [...this.pendingRequests];

        if (this.filterStatus === 'pending') {
            filtered = filtered.filter(r => r.currentStage === 'Department' && r.status === 'Pending');
        } else if (this.filterStatus === 'approved') {
            filtered = filtered.filter(r => r.status === 'Completed');
        } else if (this.filterStatus === 'rejected') {
            filtered = filtered.filter(r => r.status === 'Rejected');
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

    getStudentRegNumber(request: ClearanceRequest): string {
        if (request.registrationNumber) return request.registrationNumber;
        const user = this.getStudentData(request.studentId);
        if (user) {
            return user.registrationNumber || user.studentId || 'Not available';
        }
        return 'Not available';
    }

    getStudentPhoto(request: ClearanceRequest): string | null {
        let photo = request.photo;
        if (!photo) {
            const user = this.getStudentData(request.studentId);
            if (user) {
                photo = user.photo || user.profilePhoto || user.profileImageUrl;
            }
        }
        if (!photo) return null;

        if (photo.startsWith('data:image') || photo.startsWith('http') || photo.startsWith('/') || photo.startsWith('assets/')) {
            return photo;
        }
        if (photo.length > 50) {
            return 'data:image/jpeg;base64,' + photo;
        }
        return photo;
    }

    getStudentInitials(request: ClearanceRequest): string {
        const name = this.getStudentName(request);
        if (!name || name === 'Student') return 'ST';
        const parts = name.split(' ');
        let initials = '';
        for (let i = 0; i < parts.length && i < 2; i++) {
            if (parts[i]) initials += parts[i].charAt(0);
        }
        return initials.toUpperCase();
    }

    hasPhoto(request: ClearanceRequest): boolean {
        const photo = this.getStudentPhoto(request);
        return !!photo;
    }

    getDocumentStatus(request: ClearanceRequest): { total: number; uploaded: number; verified: number } {
        const hasPhoto = this.hasPhoto(request);
        return {
            total: 4,
            uploaded: hasPhoto ? 4 : 3,
            verified: hasPhoto ? 3 : 2
        };
    }

    getOfficeStatus(request: ClearanceRequest, office: string): string {
        const approval = request.approvals.find(a => a.office === office);
        return approval?.status || 'Pending';
    }

    reviewRequest(requestId: string): void {
        this.router.navigate(['/department/review', requestId]);
    }

    refreshData(): void {
        this.message = '🔄 Refreshing data...';
        this.loadData();
        setTimeout(() => {
            this.message = '✅ Data refreshed successfully.';
            setTimeout(() => {
                this.message = '';
            }, 3000);
        }, 500);
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