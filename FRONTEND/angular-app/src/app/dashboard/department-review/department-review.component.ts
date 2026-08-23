// department-review.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ClearanceRequest } from '../../core/models/clearance.model';

@Component({
    selector: 'app-department-review',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './department-review.html',
    styleUrl: './department-review.css'
})
export class DepartmentReviewComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly clearanceService = inject(ClearanceService);
    private readonly notificationService = inject(NotificationService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    requestId: string = '';
    request: ClearanceRequest | null = null;
    studentData: any = null;
    isLoading = false;
    isSubmitting = false;
    comment = '';
    errorMessage = '';
    successMessage = '';
    selectedTab: 'profile' | 'documents' | 'approvals' = 'profile';

    readonly documentCategories = ['Transcript', 'O-Level Certificate', 'A-Level Certificate', 'Identity Document'];

    get currentUser() {
        return this.authService.getCurrentUser();
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
            this.errorMessage = 'Request not found.';
            this.isLoading = false;
            return;
        }

        this.loadStudentData();
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
            return this.studentData.fullName || this.studentData.firstName + ' ' + this.studentData.lastName || 'Student';
        }
        return 'Student';
    }

    getStudentRegNumber(): string {
        if (this.request?.registrationNumber) return this.request.registrationNumber;
        if (this.studentData) {
            return this.studentData.registrationNumber || this.studentData.studentId || 'Not available';
        }
        return 'Not available';
    }

    getStudentPhoto(): string | null {
        if (this.request?.photo && this.request.photo.startsWith('data:image')) {
            return this.request.photo;
        }
        if (this.studentData) {
            if (this.studentData.photo && this.studentData.photo.startsWith('data:image')) return this.studentData.photo;
            if (this.studentData.profilePhoto && this.studentData.profilePhoto.startsWith('data:image')) return this.studentData.profilePhoto;
        }
        return null;
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
        return !!photo && photo.startsWith('data:image');
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

    getOfficeStatus(office: string): string {
        if (!this.request) return 'Pending';
        const approval = this.request.approvals.find(a => a.office === office);
        return approval?.status || 'Pending';
    }

    getApprovalComment(office: string): string {
        if (!this.request) return '';
        const approval = this.request.approvals.find(a => a.office === office);
        return approval?.comment || '';
    }

    getApprovalReviewer(office: string): string {
        if (!this.request) return '';
        const approval = this.request.approvals.find(a => a.office === office);
        return approval?.reviewedBy || '';
    }

    getApprovalDate(office: string): string {
        if (!this.request) return '';
        const approval = this.request.approvals.find(a => a.office === office);
        return approval?.reviewedAt || '';
    }

    getDocumentStatus(docType: string): 'uploaded' | 'missing' | 'verified' {
        const hasPhoto = this.hasPhoto();
        if (docType === 'Identity Document' && hasPhoto) {
            return 'verified';
        }
        return hasPhoto ? 'uploaded' : 'missing';
    }

    approveRequest(): void {
        this.isSubmitting = true;
        this.errorMessage = '';
        this.successMessage = '';

        const staff = this.currentUser;
        if (!staff || !this.request) {
            this.errorMessage = 'Unable to approve request.';
            this.isSubmitting = false;
            return;
        }

        try {
            this.clearanceService.approveRequest(
                this.request.id,
                'Department',
                staff.fullName || staff.firstName + ' ' + staff.lastName
            );

            this.loadRequest();

            this.notificationService.createNotification(
                this.request.studentId,
                'Department Clearance Approved',
                `Your clearance request has been approved by the Department.`,
                'success'
            );

            this.successMessage = '✅ Request approved successfully!';

            setTimeout(() => {
                this.router.navigate(['/department/dashboard']);
            }, 2000);

        } catch (error: any) {
            this.errorMessage = error.message || 'Failed to approve request.';
        } finally {
            this.isSubmitting = false;
        }
    }

    rejectRequest(): void {
        this.isSubmitting = true;
        this.errorMessage = '';
        this.successMessage = '';

        if (!this.comment.trim()) {
            this.errorMessage = 'Please provide a reason for rejection.';
            this.isSubmitting = false;
            return;
        }

        const staff = this.currentUser;
        if (!staff || !this.request) {
            this.errorMessage = 'Unable to reject request.';
            this.isSubmitting = false;
            return;
        }

        try {
            this.clearanceService.rejectRequest(
                this.request.id,
                'Department',
                staff.fullName || staff.firstName + ' ' + staff.lastName,
                this.comment.trim()
            );

            this.loadRequest();

            this.notificationService.createNotification(
                this.request.studentId,
                'Department Clearance Rejected',
                this.comment.trim(),
                'warning'
            );

            this.successMessage = '✅ Request rejected successfully.';

            setTimeout(() => {
                this.router.navigate(['/department/dashboard']);
            }, 2000);

        } catch (error: any) {
            this.errorMessage = error.message || 'Failed to reject request.';
        } finally {
            this.isSubmitting = false;
        }
    }

    goBack(): void {
        this.router.navigate(['/department/dashboard']);
    }

    selectTab(tab: 'profile' | 'documents' | 'approvals'): void {
        this.selectedTab = tab;
    }
}