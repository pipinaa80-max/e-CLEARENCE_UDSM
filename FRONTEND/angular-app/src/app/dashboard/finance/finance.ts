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
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './finance.html',
  styleUrl: './finance.css'
})
export class FinanceDashboard {
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

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get isOfficer(): boolean {
    return this.currentUser?.role === 'Finance';
  }

  get studentRequest(): ClearanceRequest | null {
    const user = this.currentUser;
    if (!user || user.role !== 'Student') return null;
    const requests = this.clearanceService.getStudentRequests(user.id);
    return requests.at(-1) ?? null;
  }

  get requests(): ClearanceRequest[] {
    return this.clearanceService.getRequestsForOffice('Finance');
  }

  get filteredRequests(): ClearanceRequest[] {
    let list = this.requests;

    if (this.searchTerm.trim()) {
      const s = this.searchTerm.toLowerCase();
      list = list.filter(r =>
        (r.studentName || '').toLowerCase().includes(s) ||
        (r.registrationNumber || '').toLowerCase().includes(s) ||
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

  getOfficeStatus(office: string): string {
    const request = this.studentRequest;
    if (!request) return 'Pending';
    const approval = request.approvals.find(a => a.office === office);
    return approval?.status ?? 'Pending';
  }

  getRequestOfficeStatus(request: ClearanceRequest, office: string): string {
    return request.approvals.find(approval => approval.office === office)?.status ?? 'Pending';
  }

  getRejectionReason(office: string): string {
    const request = this.studentRequest;
    if (!request) return '';
    const approval = request.approvals.find(a => a.office === office);
    return approval?.comment ?? '';
  }

  approve(request: ClearanceRequest): void {
    const staff = this.currentUser;

    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }

    this.clearanceService.approveRequest(
      request.id,
      'Finance',
      staff.fullName
    );

    this.notificationService.createNotification(
      request.studentId,
      'Clearance completed',
      'Finance has approved your application. Your graduation clearance is now complete.',
      'success'
    );

    this.message = 'Clearance completed successfully.';
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
      'Finance',
      staff.fullName,
      this.rejectionComment
    );

    this.notificationService.createNotification(
      this.selectedRequest.studentId,
      'Finance action required',
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

  // =====================================================
  // STUDENT DATA UTILS
  // =====================================================

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
}
