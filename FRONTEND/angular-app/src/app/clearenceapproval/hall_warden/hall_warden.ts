import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ClearanceRequest } from '../../core/models/clearance.model';

@Component({
  selector: 'app-hall-warden',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './hall_warden.html',
  styleUrl: './hall_warden.css'
})
export class HallWardenComponent {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  selectedRequest: ClearanceRequest | null = null;
  rejectionComment = '';
  message = '';

  get requests(): ClearanceRequest[] {
    return this.clearanceService.getRequestsForOffice('Hall Warden');
  }

  approve(request: ClearanceRequest): void {
    const staff = this.authService.getCurrentUser();

    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }

    this.clearanceService.approveRequest(
      request.id,
      'Hall Warden',
      staff.fullName
    );

    this.notificationService.createNotification(
      request.studentId,
      'Hall Warden clearance approved',
      'The Hall Warden has approved your clearance request.',
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
      'Hall Warden',
      staff.fullName,
      this.rejectionComment
    );

    this.notificationService.createNotification(
      this.selectedRequest.studentId,
      'Hall Warden action required',
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
