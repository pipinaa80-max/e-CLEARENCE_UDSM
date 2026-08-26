import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ClearanceRequest } from '../../core/models/clearance.model';

@Component({
  selector: 'app-library-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './library.html',
  styleUrl: './library.css'
})
export class LibraryDashboard {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  selectedRequest: ClearanceRequest | null = null;
  rejectionComment = '';
  message = '';

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get isOfficer(): boolean {
    return this.currentUser?.role === 'Library';
  }

  get studentRequest(): ClearanceRequest | null {
    const user = this.currentUser;
    if (!user || user.role !== 'Student') return null;
    const requests = this.clearanceService.getStudentRequests(user.id);
    return requests.at(-1) ?? null;
  }

  get requests(): ClearanceRequest[] {
    return this.clearanceService.getRequestsForOffice('Library');
  }

  getOfficeStatus(office: string): string {
    const request = this.studentRequest;
    if (!request) return 'Pending';
    const approval = request.approvals.find(a => a.office === office);
    return approval?.status ?? 'Pending';
  }

  getRejectionReason(office: string): string {
    const request = this.studentRequest;
    if (!request) return '';
    const approval = request.approvals.find(a => a.office === office);
    return approval?.comment ?? '';
  }

  approve(request: ClearanceRequest): void {
    const staff = this.authService.getCurrentUser();

    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }

    this.clearanceService.approveRequest(
      request.id,
      'Library',
      staff.fullName
    );

    this.notificationService.createNotification(
      request.studentId,
      'Library clearance approved',
      'The Library has approved your clearance request.',
      'success'
    );

    this.message = 'Student clearance was approved successfully.';
  }

  openRejectForm(request: ClearanceRequest): void {
    this.selectedRequest = request;
    this.rejectionComment = '';
    this.message = '';
  }

  reject(): void {
    const staff = this.authService.getCurrentUser();

    if (!staff || !this.selectedRequest || !this.rejectionComment.trim()) {
      return;
    }

    this.clearanceService.rejectRequest(
      this.selectedRequest.id,
      'Library',
      staff.fullName,
      this.rejectionComment
    );

    this.notificationService.createNotification(
      this.selectedRequest.studentId,
      'Library action required',
      this.rejectionComment,
      'warning'
    );

    this.message = 'The student has been notified about the required action.';
    this.selectedRequest = null;
    this.rejectionComment = '';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
