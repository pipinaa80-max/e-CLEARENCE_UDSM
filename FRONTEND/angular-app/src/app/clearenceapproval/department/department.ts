// src/app/dashboard/department/department.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ClearanceRequest } from '../../core/models/clearance.model';

@Component({
  selector: 'app-department-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './department.html',
  styleUrl: './department.css'
})
export class DepartmentDashboard {
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

  get requests(): ClearanceRequest[] {
    const staff = this.currentUser;

    if (!staff) {
      return [];
    }

    return this.clearanceService.getRequestsForOffice(
      'Department',
      staff.college,
      staff.department
    );
  }

  approve(request: ClearanceRequest): void {
    const staff = this.currentUser;

    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }

    this.clearanceService.approveRequest(
      request.id,
      'Department',
      staff.fullName
    );

    this.notificationService.createNotification(
      request.studentId,
      'Department clearance approved',
      'Your department has approved your clearance request. It has been forwarded to the Principal.',
      'success'
    );

    this.message = 'The application was approved and sent to the Principal.';
  }

  openRejectForm(request: ClearanceRequest): void {
    this.selectedRequest = request;
    this.rejectionComment = '';
    this.message = '';
  }

  reject(): void {
    const staff = this.currentUser;

    if (!staff || !this.selectedRequest || !this.rejectionComment.trim()) {
      return;
    }

    this.clearanceService.rejectRequest(
      this.selectedRequest.id,
      'Department',
      staff.fullName,
      this.rejectionComment
    );

    this.notificationService.createNotification(
      this.selectedRequest.studentId,
      'Department action required',
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