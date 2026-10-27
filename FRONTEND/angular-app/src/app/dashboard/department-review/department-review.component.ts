// department-review.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { ToastService } from '../../core/services/toast.service';
import { ClearanceRequest } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

@Component({
    selector: 'app-department-review',
    standalone: true,
    imports: [CommonModule, DashboardHeaderComponent],
    templateUrl: './department-review.html',
    styleUrl: './department-review.css'
})
export class DepartmentReviewComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly clearanceService = inject(ClearanceService);
    private readonly toastService = inject(ToastService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    sidebarOpen = false;
    requestId: string = '';
    request: ClearanceRequest | null = null;
    studentData: any = null;
    isLoading = false;
    selectedTab: 'profile' | 'approvals' = 'profile';

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
            this.toastService.error('Not Found', 'Request not found.');
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
}
