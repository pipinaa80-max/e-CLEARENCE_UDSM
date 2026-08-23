// convocation-dashboard.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ClearanceRequest } from '../../core/models/clearance.model';

@Component({
  selector: 'app-convocation-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive], // Added RouterLinkActive
  templateUrl: './convocation-dashboard.html',
  styleUrl: './convocation-dashboard.css'
})
export class ConvocationDashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  isLoading = false;
  message = '';
  errorMessage = '';
  selectedRequest: ClearanceRequest | null = null;

  totalPending = 0;
  totalIssued = 0;
  totalCompleted = 0;

  private studentCache: Map<string, any> = new Map();

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get requests(): ClearanceRequest[] {
    const allRequests = this.clearanceService.getRequestsForOffice('Convocation');
    this.updateStats(allRequests);
    return allRequests;
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    const requests = this.clearanceService.getRequestsForOffice('Convocation');
    this.updateStats(requests);
    this.isLoading = false;
  }

  updateStats(requests: ClearanceRequest[]): void {
    this.totalPending = requests.filter(r =>
        r.status === 'Pending' &&
        r.currentStage === 'Convocation' &&
        !r.convocation?.controlNumber
    ).length;

    this.totalIssued = requests.filter(r =>
        r.convocation?.controlNumber &&
        !r.convocation?.receiptSubmittedAt
    ).length;

    this.totalCompleted = requests.filter(r =>
        r.convocation?.receiptSubmittedAt &&
        r.status === 'Pending'
    ).length;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
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
      return user.fullName || user.firstName + ' ' + user.lastName || 'Student';
    }
    return 'Student #' + request.studentId.substring(0, 8);
  }

  getStudentRegNumber(request: ClearanceRequest): string {
    if (request.registrationNumber) return request.registrationNumber;
    const user = this.getStudentData(request.studentId);
    if (user) {
      return user.registrationNumber || user.studentId || 'Not available';
    }
    return 'Not available';
  }

  getStudentPhoto(request: ClearanceRequest): string | null {
    if (request.photo && request.photo.startsWith('data:image')) {
      return request.photo;
    }
    const user = this.getStudentData(request.studentId);
    if (user) {
      if (user.photo && user.photo.startsWith('data:image')) return user.photo;
      if (user.profilePhoto && user.profilePhoto.startsWith('data:image')) return user.profilePhoto;
    }
    return null;
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
    return !!photo && photo.startsWith('data:image');
  }

  issueControlNumber(request: ClearanceRequest): void {
    this.errorMessage = '';
    this.message = '';

    if (request.convocation?.controlNumber) {
      this.message = 'This request already has a control number.';
      return;
    }

    const controlNumber = window.prompt(
        'Enter the control number for this student:\n\nFormat: UDSM-XXXXXXXX (8 digits)',
        'UDSM-' + Date.now().toString().slice(-8)
    );

    if (controlNumber === null) return;

    if (!controlNumber.trim()) {
      this.errorMessage = 'Please enter a valid control number.';
      return;
    }

    this.isLoading = true;

    try {
      this.clearanceService.issueControlNumber(
          request.id,
          controlNumber.trim()
      );

      this.loadData();

      this.notificationService.createNotification(
          request.studentId,
          'Control Number Issued',
          `Convocation has issued your control number: ${controlNumber.trim()}. Use this to make your payment.`,
          'success'
      );

      this.message = `✅ Control number ${controlNumber.trim()} issued successfully to ${this.getStudentName(request)}.`;

      setTimeout(() => {
        this.message = '';
      }, 5000);

    } catch (error: any) {
      console.error('Issue error:', error);
      this.errorMessage = '❌ Failed to issue control number. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  markReceiptReceived(request: ClearanceRequest): void {
    this.errorMessage = '';
    this.message = '';

    if (!request.convocation?.controlNumber) {
      this.errorMessage = 'Control number must be issued first.';
      return;
    }

    const confirmMark = confirm(
        `Confirm receipt submission for ${this.getStudentName(request)}?\n\nMake sure the student has uploaded their payment receipt.`
    );

    if (!confirmMark) return;

    this.isLoading = true;

    try {
      this.clearanceService.submitConvocationReceipt(
          request.id,
          'Receipt received and verified'
      );

      this.loadData();

      this.notificationService.createNotification(
          request.studentId,
          'Payment Receipt Received',
          'Convocation has received and verified your payment receipt.',
          'success'
      );

      this.message = `✅ Receipt marked as received for ${this.getStudentName(request)}.`;

      setTimeout(() => {
        this.message = '';
      }, 5000);

    } catch (error: any) {
      console.error('Mark receipt error:', error);
      this.errorMessage = '❌ Failed to mark receipt. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  approveRequest(request: ClearanceRequest): void {
    this.errorMessage = '';
    this.message = '';

    if (!request.convocation?.receiptSubmittedAt) {
      this.errorMessage = 'Student must submit a receipt first.';
      return;
    }

    const confirmApprove = confirm(
        `Final Approval: Are you sure you want to approve Convocation clearance for ${this.getStudentName(request)}?`
    );

    if (!confirmApprove) return;

    this.isLoading = true;

    try {
      this.clearanceService.approveRequest(
          request.id,
          'Convocation',
          this.currentUser?.fullName || 'Convocation Officer'
      );

      this.loadData();

      this.notificationService.createNotification(
          request.studentId,
          'Convocation Approved',
          'Congratulations! Convocation has approved your clearance. You can now proceed to Step 2.',
          'success'
      );

      this.message = `✅ Convocation clearance approved for ${this.getStudentName(request)}.`;

      setTimeout(() => {
        this.message = '';
      }, 5000);

    } catch (error: any) {
      console.error('Approve error:', error);
      this.errorMessage = '❌ Failed to approve request. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  refreshData(): void {
    this.message = '🔄 Refreshing data...';
    this.studentCache.clear();
    this.loadData();
    setTimeout(() => {
      this.message = '✅ Data refreshed successfully.';
      setTimeout(() => {
        this.message = '';
      }, 3000);
    }, 500);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}