// principal.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { ClearanceRequest } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

@Component({
    selector: 'app-principal',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
    templateUrl: './principal.html',
    styleUrl: './principal.css'
})
export class PrincipalComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly clearanceService = inject(ClearanceService);
    private readonly notificationService = inject(NotificationService);
    private readonly toastService = inject(ToastService);
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
    detailsRequest: ClearanceRequest | null = null;

    private studentCache: Map<string, any> = new Map();


    get currentUser() {
        return this.authService.getCurrentUser();
    }

    get collegeName(): string {
        return this.currentUser?.college || 'College';
    }

    get pendingRequestCount(): number {
        return this.pendingRequests.filter(request =>
            this.getRequestOfficeStatus(request, 'Principal') === 'Pending'
        ).length;
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

        const allRequests = this.clearanceService.getAllRequests();

        // Principal reviews requests for their college
        this.pendingRequests = allRequests.filter(request => {
            if (request.college !== user.college) return false;

            // Principal sees requests that are at Principal stage or further along
            return request.currentStage === 'Principal' ||
                request.currentStage === 'Finance' ||
                request.status === 'Completed';
        });

        this.applyFilters();

        this.isLoading = false;
        console.log('Principal requests loaded:', this.pendingRequests.length);
    }

    getRequestOfficeStatus(request: ClearanceRequest, office: string): string {
        return request.approvals.find(a => a.office === office)?.status ?? 'Pending';
    }

    applyFilters(): void {
        let filtered = [...this.pendingRequests];

        if (this.filterStatus === 'pending') {
            filtered = filtered.filter(r => this.getRequestOfficeStatus(r, 'Principal') === 'Pending');
        } else if (this.filterStatus === 'approved') {
            filtered = filtered.filter(r => this.getRequestOfficeStatus(r, 'Principal') === 'Approved');
        } else if (this.filterStatus === 'rejected') {
            filtered = filtered.filter(r => this.getRequestOfficeStatus(r, 'Principal') === 'Rejected');
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

    openDetails(request: ClearanceRequest): void {
        this.detailsRequest = request;
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

    enlargedPhotoUrl: string | null = null;

    openEnlargedPhoto(photoUrl: string | null): void {
        if (photoUrl) {
            this.enlargedPhotoUrl = photoUrl;
        }
    }

    closeEnlargedPhoto(): void {
        this.enlargedPhotoUrl = null;
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

    async withdrawDecision(request: ClearanceRequest): Promise<void> {
        if (!await this.clearanceService.withdrawOfficeDecision(request.id, 'Principal')) return;
        this.message = 'Principal decision withdrawn. The request is pending again.';
        this.loadData();
    }

    getRejectionReason(request: ClearanceRequest): string {
        return request.approvals.find(approval => approval.office === 'Principal')?.comment || 'No reason was recorded.';
    }

    getRejectionHistory(request: ClearanceRequest) {
        return request.rejectionHistory ?? [];
    }

    async approve(request: ClearanceRequest): Promise<void> {
        const staff = this.currentUser;
        if (!staff || !await this.clearanceService.approveRequest(request.id, 'Principal', staff.fullName)) {
            this.toastService.error('Error', 'Failed to approve request. Please try again.');
            return;
        }

        this.loadData();
        this.notificationService.createNotification(
            request.studentId,
            'Principal clearance approved',
            'The Principal has approved your clearance request.',
            'success'
        );
        this.message = `Student ${this.getStudentName(request)} was approved successfully.`;
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
