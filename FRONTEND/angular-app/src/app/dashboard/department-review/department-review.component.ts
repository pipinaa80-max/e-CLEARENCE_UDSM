import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { ToastService } from '../../core/services/toast.service';
import { NotificationService } from '../../core/services/notification.service';
import { StudentDebtService } from '../../core/services/student-debt.service';
import { ClearanceRequest } from '../../core/models/clearance.model';
import { StudentDebtFlag } from '../../core/models/student-debt.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

@Component({
    selector: 'app-department-review',
    standalone: true,
    imports: [CommonModule, FormsModule, DashboardHeaderComponent],
    templateUrl: './department-review.html',
    styleUrl: './department-review.css'
})
export class DepartmentReviewComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly clearanceService = inject(ClearanceService);
    private readonly toastService = inject(ToastService);
    private readonly notificationService = inject(NotificationService);
    private readonly studentDebtService = inject(StudentDebtService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly cdr = inject(ChangeDetectorRef);

    sidebarOpen = false;
    requestId: string = '';
    request: ClearanceRequest | null = null;
    studentData: any = null;
    isLoading = false;
    isProcessing = false;
    showRejectModal = false;
    rejectionComment = '';
    selectedTab: 'profile' | 'approvals' = 'profile';
    openDebtFlag: StudentDebtFlag | null = null;

    get currentUser() {
        return this.authService.getCurrentUser();
    }

    get departmentName(): string {
        return this.currentUser?.department || this.request?.department || 'Department';
    }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            this.requestId = params['id'];
            if (this.requestId) {
                this.loadRequest();
            } else {
                this.router.navigate(['/department/dashboard']);
            }
        });
    }

    loadRequest(): void {
        this.isLoading = true;
        this.request = this.clearanceService.getRequest(this.requestId) || null;

        if (!this.request) {
            this.toastService.error('Not Found', 'Request not found.');
            this.isLoading = false;
            return;
        }

        this.loadStudentData();
        this.studentDebtService.listOpenForDepartment().subscribe({
            next: (flags) => {
                const regNum = this.getStudentRegNumber().trim().toLowerCase();
                const found = (Array.isArray(flags) ? flags : []).find(f => f && f.status === 'OPEN' && f.registrationNumber && f.registrationNumber.trim().toLowerCase() === regNum);
                this.openDebtFlag = found || null;
                this.cdr.detectChanges();
            },
            error: () => {}
        });
        this.isLoading = false;
    }

    loadStudentData(): void {
        if (!this.request) return;

        try {
            const usersJson = localStorage.getItem('udsm-local-users');
            if (usersJson) {
                const users = JSON.parse(usersJson);
                this.studentData = users.find((u: any) => u.id === this.request?.studentId) || null;
            }
        } catch (error) {
            console.error('Error loading student data:', error);
        }
    }

    getStudentName(): string {
        if (this.request?.studentName) return this.request.studentName;
        if (this.studentData) {
            return this.studentData.fullName || this.studentData.firstName + ' ' + this.studentData.lastName || this.studentData.registrationNumber || 'Student';
        }
        return this.request?.registrationNumber || 'Student';
    }

    getStudentRegNumber(): string {
        if (this.request?.registrationNumber) return this.request.registrationNumber;
        if (this.studentData) {
            return this.studentData.registrationNumber || this.studentData.studentId || 'Not available';
        }
        return 'Not available';
    }

    getStudentPhoto(): string | null {
        let photo = this.request?.photo;
        if (!photo && this.studentData) {
            photo = this.studentData.photo || this.studentData.profilePhoto || this.studentData.profileImageUrl;
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

    getStudentInitials(): string {
        const name = this.getStudentName();
        if (!name || name === 'Student') return 'ST';
        const parts = name.split(' ');
        let initials = '';
        for (let i = 0; i < parts.length && i < 2; i++) {
            if (parts[i]) initials += parts[i].charAt(0);
        }
        return initials.toUpperCase();
    }

    hasPhoto(): boolean {
        const photo = this.getStudentPhoto();
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

    getStudentEmail(): string {
        if (this.studentData) {
            return this.studentData.email || 'Not available';
        }
        return 'Not available';
    }

    getStudentPhone(): string {
        if (this.studentData) {
            return this.studentData.phone || this.studentData.phoneNumber || 'Not available';
        }
        return 'Not available';
    }

    get decisionApprovals() {
        return this.request?.approvals.filter(approval =>
            approval.status === 'Approved' || approval.status === 'Rejected'
        ) ?? [];
    }

    goBack(): void {
        this.router.navigate(['/department/dashboard']);
    }

    selectTab(tab: 'profile' | 'approvals'): void {
        this.selectedTab = tab;
    }

    toggleSidebar(): void {
        this.sidebarOpen = !this.sidebarOpen;
    }

    closeSidebar(): void {
        this.sidebarOpen = false;
    }

    get isPendingDepartment(): boolean {
        return this.request?.approvals?.find(a => a.office === 'Department')?.status === 'Pending' || false;
    }

    async approve(): Promise<void> {
        if (!this.request) return;
        if (this.openDebtFlag) {
            this.toastService.warning('Debt Flag Open', 'Department verification is disabled until the Lecturer resolves the student debt flag.');
            return;
        }

        const staff = this.currentUser;
        if (!staff) {
            this.router.navigate(['/login']);
            return;
        }

        this.isProcessing = true;
        const studentName = this.getStudentName();
        const approved = await this.clearanceService.approveRequest(
            this.request.id,
            'Department',
            staff.fullName || 'Department Officer'
        );

        this.isProcessing = false;
        if (!approved) {
            this.toastService.error('Action Failed', 'This request could not be approved.');
            return;
        }

        this.notificationService.createNotification(
            this.request.studentId,
            'Department clearance approved',
            'Your department has approved your clearance request. It has been forwarded to the Principal.',
            'success'
        );

        this.toastService.success('Approved', `Department clearance approved for ${studentName}.`);
        this.router.navigate(['/department/dashboard']);
    }

    openRejectModal(): void {
        this.showRejectModal = true;
        this.rejectionComment = '';
    }

    closeRejectModal(): void {
        this.showRejectModal = false;
        this.rejectionComment = '';
    }

    async reject(): Promise<void> {
        if (!this.request) return;
        if (!this.rejectionComment.trim()) {
            this.toastService.warning('Comment Required', 'Please provide a reason for returning the request.');
            return;
        }

        const staff = this.currentUser;
        if (!staff) {
            this.router.navigate(['/login']);
            return;
        }

        this.isProcessing = true;
        const studentName = this.getStudentName();
        const rejected = await this.clearanceService.rejectRequest(
            this.request.id,
            'Department',
            staff.fullName || 'Department Officer',
            this.rejectionComment.trim()
        );

        this.isProcessing = false;
        if (!rejected) {
            this.toastService.error('Action Failed', 'This request could not be returned.');
            return;
        }

        this.notificationService.createNotification(
            this.request.studentId,
            'Department action required',
            this.rejectionComment.trim(),
            'warning'
        );

        this.toastService.warning('Returned', `Department clearance returned for ${studentName}.`);
        this.closeRejectModal();
        this.router.navigate(['/department/dashboard']);
    }
}
