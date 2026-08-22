// dean-of-students.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ClearanceRequest } from '../../core/models/clearance.model';

@Component({
  selector: 'app-dean-of-students',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dean_of_students.html',
  styleUrl: './dean_of_students.css'
})
export class DeanOfStudentsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  selectedRequest: ClearanceRequest | null = null;
  rejectionComment = '';
  message = '';
  isLoading = false;
  pendingRequests: ClearanceRequest[] = [];

  // Cache for student data to avoid repeated lookups
  private studentCache: Map<string, any> = new Map();

  // =====================================================
  // GET REQUESTS - WITH RELOAD
  // =====================================================

  get requests(): ClearanceRequest[] {
    this.pendingRequests = this.clearanceService.getRequestsForOffice('Dean of Students');
    return this.pendingRequests;
  }

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.pendingRequests = this.clearanceService.getRequestsForOffice('Dean of Students');
    console.log('Dean of Students - Loaded requests:', this.pendingRequests.length);
    this.isLoading = false;
  }

  // =====================================================
  // GET STUDENT DATA FROM LOCAL STORAGE
  // =====================================================

  private getStudentData(studentId: string): any | null {
    // Check cache first
    if (this.studentCache.has(studentId)) {
      return this.studentCache.get(studentId);
    }

    try {
      // Try to get from users list in localStorage
      const usersJson = localStorage.getItem('udsm-local-users');
      if (usersJson) {
        const users = JSON.parse(usersJson);
        const user = users.find((u: any) => u.id === studentId);
        if (user) {
          this.studentCache.set(studentId, user);
          return user;
        }
      }

      // Try to get from current user if it matches
      const currentUser = this.authService.getCurrentUser();
      if (currentUser && currentUser.id === studentId) {
        this.studentCache.set(studentId, currentUser);
        return currentUser;
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    }

    return null;
  }

  // =====================================================
  // GET STUDENT NAME
  // =====================================================

  getStudentName(request: ClearanceRequest): string {
    // Check request first
    if (request.studentName) {
      return request.studentName;
    }

    // Try to get from user data
    const user = this.getStudentData(request.studentId);
    if (user) {
      return user.fullName || user.firstName + ' ' + user.lastName || 'Student';
    }

    return 'Student #' + request.studentId.substring(0, 8);
  }

  // =====================================================
  // GET STUDENT REGISTRATION NUMBER
  // =====================================================

  getStudentRegNumber(request: ClearanceRequest): string {
    if (request.registrationNumber) {
      return request.registrationNumber;
    }

    const user = this.getStudentData(request.studentId);
    if (user) {
      return user.registrationNumber || user.studentId || 'Not available';
    }

    return 'Not available';
  }

  // =====================================================
  // GET STUDENT PHOTO
  // =====================================================

  getStudentPhoto(request: ClearanceRequest): string | null {
    // Check request photo first
    if (request.photo && request.photo.startsWith('data:image')) {
      return request.photo;
    }

    // Check user data
    const user = this.getStudentData(request.studentId);
    if (user) {
      if (user.photo && user.photo.startsWith('data:image')) {
        return user.photo;
      }
      if (user.profilePhoto && user.profilePhoto.startsWith('data:image')) {
        return user.profilePhoto;
      }
    }

    return null;
  }

  // =====================================================
  // GET STUDENT INITIALS
  // =====================================================

  getStudentInitials(request: ClearanceRequest): string {
    const name = this.getStudentName(request);
    if (!name || name === 'Student') {
      return 'ST';
    }

    const parts = name.split(' ');
    let initials = '';
    for (let i = 0; i < parts.length && i < 2; i++) {
      if (parts[i]) {
        initials += parts[i].charAt(0);
      }
    }
    return initials.toUpperCase();
  }

  // =====================================================
  // GET STUDENT EMAIL
  // =====================================================

  getStudentEmail(request: ClearanceRequest): string {
    const user = this.getStudentData(request.studentId);
    if (user) {
      return user.email || 'Not available';
    }
    return 'Not available';
  }

  // =====================================================
  // GET STUDENT PHONE
  // =====================================================

  getStudentPhone(request: ClearanceRequest): string {
    const user = this.getStudentData(request.studentId);
    if (user) {
      return user.phone || user.phoneNumber || 'Not available';
    }
    return 'Not available';
  }

  // =====================================================
  // HAS PHOTO
  // =====================================================

  hasPhoto(request: ClearanceRequest): boolean {
    const photo = this.getStudentPhoto(request);
    return !!photo && photo.startsWith('data:image');
  }

  // =====================================================
  // APPROVE
  // =====================================================

  approve(request: ClearanceRequest): void {
    this.isLoading = true;
    const staff = this.authService.getCurrentUser();

    if (!staff) {
      this.router.navigate(['/login']);
      this.isLoading = false;
      return;
    }

    try {
      this.clearanceService.approveRequest(
          request.id,
          'Dean of Students',
          staff.fullName || 'Dean of Students'
      );

      // Reload data
      this.loadData();

      this.notificationService.createNotification(
          request.studentId,
          'Dean of Students clearance approved',
          `Your clearance request has been approved by the Dean of Students.`,
          'success'
      );

      this.message = `✅ Student ${this.getStudentName(request)} was approved successfully.`;

      setTimeout(() => {
        this.message = '';
      }, 5000);

    } catch (error: any) {
      console.error('Approval error:', error);
      this.message = '❌ Failed to approve request. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  // =====================================================
  // OPEN REJECT FORM
  // =====================================================

  openRejectForm(request: ClearanceRequest): void {
    this.selectedRequest = request;
    this.rejectionComment = '';
    this.message = '';
  }

  // =====================================================
  // REJECT
  // =====================================================

  reject(): void {
    this.isLoading = true;
    const staff = this.authService.getCurrentUser();

    if (!staff || !this.selectedRequest || !this.rejectionComment.trim()) {
      this.isLoading = false;
      return;
    }

    try {
      this.clearanceService.rejectRequest(
          this.selectedRequest.id,
          'Dean of Students',
          staff.fullName || 'Dean of Students',
          this.rejectionComment
      );

      // Reload data
      this.loadData();

      this.notificationService.createNotification(
          this.selectedRequest.studentId,
          'Dean of Students requires action',
          this.rejectionComment,
          'warning'
      );

      this.message = `✅ Student ${this.getStudentName(this.selectedRequest)} has been notified about the required action.`;

      this.selectedRequest = null;
      this.rejectionComment = '';

      setTimeout(() => {
        this.message = '';
      }, 5000);

    } catch (error: any) {
      console.error('Rejection error:', error);
      this.message = '❌ Failed to reject request. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  closeModal(): void {
    this.selectedRequest = null;
    this.rejectionComment = '';
  }

  // =====================================================
  // REFRESH DATA
  // =====================================================

  refreshData(): void {
    this.message = '🔄 Refreshing data...';
    // Clear cache
    this.studentCache.clear();
    this.loadData();
    setTimeout(() => {
      this.message = '✅ Data refreshed successfully.';
      setTimeout(() => {
        this.message = '';
      }, 3000);
    }, 500);
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}