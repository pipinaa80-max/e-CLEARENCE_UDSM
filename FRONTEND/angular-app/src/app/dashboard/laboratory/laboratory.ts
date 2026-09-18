import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ClearanceRequest } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

@Component({
  selector: 'app-laboratory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './laboratory.html',
  styleUrl: './laboratory.css'
})
export class LaboratoryComponent {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  selectedRequest: ClearanceRequest | null = null;
  rejectionComment = '';
  message = '';

  searchTerm = '';
  filterStatus = 'all';

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  get laboratoryName(): string {
    return this.currentUser?.laboratory || 'Laboratory';
  }

  get requests(): ClearanceRequest[] {
    return this.clearanceService.getRequestsForOffice('Laboratory');
  }

  get filteredRequests(): ClearanceRequest[] {
    let list = this.requests;

    if (this.searchTerm.trim()) {
      const s = this.searchTerm.toLowerCase();
      list = list.filter(r =>
        this.getStudentName(r).toLowerCase().includes(s) ||
        this.getStudentRegNumber(r).toLowerCase().includes(s) ||
        r.programme.toLowerCase().includes(s)
      );
    }

    if (this.filterStatus !== 'all') {
      if (this.filterStatus === 'pending') {
        list = list.filter(r => r.status === 'Pending');
      } else if (this.filterStatus === 'approved') {
        list = list.filter(r => r.status === 'Completed');
      } else if (this.filterStatus === 'rejected') {
        list = list.filter(r => r.status === 'Rejected');
      }
    }

    return list;
  }

  // Cache for student data to avoid repeated lookups
  private studentCache: Map<string, any> = new Map();

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
    return request.registrationNumber || request.studentId;
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

  approve(request: ClearanceRequest): void {
    const staff = this.currentUser;

    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }

    this.clearanceService.approveRequest(
      request.id,
      'Laboratory',
      staff.fullName
    );

    this.notificationService.createNotification(
      request.studentId,
      `${this.laboratoryName} clearance approved`,
      `Your clearance has been approved by ${this.laboratoryName}.`,
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
    const staff = this.currentUser;

    if (
      !staff ||
      !this.selectedRequest ||
      !this.rejectionComment.trim()
    ) {
      return;
    }

    this.clearanceService.rejectRequest(
      this.selectedRequest.id,
      'Laboratory',
      staff.fullName,
      this.rejectionComment.trim()
    );

    this.notificationService.createNotification(
      this.selectedRequest.studentId,
      `${this.laboratoryName} action required`,
      this.rejectionComment.trim(),
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