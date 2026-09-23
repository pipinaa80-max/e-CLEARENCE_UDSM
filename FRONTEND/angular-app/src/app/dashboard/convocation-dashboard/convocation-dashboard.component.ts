// convocation-dashboard.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { ConvocationService } from '../../core/services/convocation.service';
import { ClearanceRequest } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

@Component({
  selector: 'app-convocation-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, DashboardHeaderComponent],
  templateUrl: './convocation-dashboard.html',
  styleUrl: './convocation-dashboard.css'
})
export class ConvocationDashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly convocationService = inject(ConvocationService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  isLoading = false;
  message = '';
  selectedRequest: ClearanceRequest | null = null;

  backendReceipts: any[] = [];

  showReceiptModal = false;
  receiptToView: { name: string, data: string, reg: string } | null = null;

  totalPending = 0;
  totalIssued = 0;
  totalCompleted = 0;

  filterStatus = 'all';
  currentPage = 1;
  pageSize = 3;

  get paginatedRequests(): ClearanceRequest[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.requests.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.requests.length / this.pageSize) || 1;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  private studentCache: Map<string, any> = new Map();

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  getRequestOfficeStatus(request: ClearanceRequest, office: string): string {
    return request.approvals.find(a => a.office === office)?.status ?? 'Pending';
  }

  get requests(): ClearanceRequest[] {
    let allRequests = this.clearanceService.getRequestsForOffice('Convocation');
    this.updateStats(allRequests);

    if (this.filterStatus === 'all' || this.filterStatus === 'pending') {
      allRequests = allRequests.filter(r => this.getRequestOfficeStatus(r, 'Convocation') === 'Pending');
    } else if (this.filterStatus === 'approved') {
      allRequests = allRequests.filter(r => this.getRequestOfficeStatus(r, 'Convocation') === 'Approved');
    } else if (this.filterStatus === 'rejected') {
      allRequests = allRequests.filter(r => this.getRequestOfficeStatus(r, 'Convocation') === 'Rejected');
    }

    return allRequests;
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;

    // 1. Load from Backend
    this.convocationService.getPendingReceipts().subscribe({
      next: (res) => {
        this.backendReceipts = res.receipts || [];
        console.log('Backend pending receipts loaded:', this.backendReceipts.length);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading backend receipts:', err);
        this.isLoading = false;
      }
    });

    // 2. Load from Local (for legacy/mock continuity)
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
      return user.fullName || user.firstName + ' ' + user.lastName || user.registrationNumber || 'Student';
    }
    return request.registrationNumber || 'Student #' + request.studentId.substring(0, 8);
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

  getReceiptFile(request: ClearanceRequest): string | null {
    // Check if receipt data exists in the convocation object
    return (request.convocation as any)?.receiptData || null;
  }

  viewReceipt(request: ClearanceRequest): void {
    const data = this.getReceiptFile(request);

    // Fallback: If it's a legacy request marked as received but no data, show a verification message
    if (!data && request.convocation?.receiptSubmittedAt) {
        this.receiptToView = {
            name: this.getStudentName(request),
            reg: this.getStudentRegNumber(request),
            data: 'Manual Verification: Student has been manually verified by an officer. No digital file was uploaded.'
        };
        this.showReceiptModal = true;
        return;
    }

    if (data) {
      this.receiptToView = {
        name: this.getStudentName(request),
        reg: this.getStudentRegNumber(request),
        data: data
      };
      this.showReceiptModal = true;
    } else {
      alert('This student has not submitted a digital receipt for viewing.');
    }
  }

  viewBackendReceipt(receipt: any): void {
    const url = receipt.fileUrl || receipt.receiptData;

    if (!url) {
      alert('Digital evidence is missing for this submission.');
      return;
    }

    this.receiptToView = {
      name: receipt.studentName || 'Student',
      reg: receipt.registrationNumber || 'N/A',
      data: url
    };
    this.showReceiptModal = true;
  }

  closeReceiptModal(): void {
    this.showReceiptModal = false;
    this.receiptToView = null;
  }

  isImageUrl(data: string | undefined): boolean {
    if (!data) return false;
    if (data.startsWith('data:image')) return true;
    const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    return extensions.some(ext => data.toLowerCase().endsWith(ext)) || data.toLowerCase().includes('image');
  }

  isPdf(data: string | undefined): boolean {
    if (!data) return false;
    return data.startsWith('data:application/pdf') || data.toLowerCase().endsWith('.pdf');
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

  onImageError(request: ClearanceRequest): void {
    console.error('Image failed to load for request:', request.id);
    // Suppress loops by fallback flag or custom initials indicator rather than deleting full cache object
  }

  issueControlNumber(request: ClearanceRequest): void {
    this.message = '';

    if (request.convocation?.controlNumber) {
      this.toastService.info('Already Issued', 'This request already has a control number.');
      return;
    }

    const controlNumber = 'UDSM-' + Date.now().toString().slice(-8);

    this.isLoading = true;

    try {
      this.clearanceService.issueControlNumber(
          request.id,
          controlNumber
      );

      this.loadData();

      this.notificationService.createNotification(
          request.studentId,
          'Control Number Issued',
            `Convocation has issued your control number: ${controlNumber}. Use this to make your payment.`,
          'success'
      );

          this.toastService.success('Success', `Control number ${controlNumber} issued successfully to ${this.getStudentName(request)}.`);

      setTimeout(() => {
        this.message = '';
      }, 5000);

    } catch (error: any) {
      console.error('Issue error:', error);
      this.toastService.error('Issue Failed', 'Failed to issue control number. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  markReceiptReceived(request: ClearanceRequest): void {
    this.message = '';

    if (!request.convocation?.controlNumber) {
      this.toastService.warning('Action Required', 'Control number must be issued first.');
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

      this.toastService.success('Success', `Receipt marked as received for ${this.getStudentName(request)}.`);

      setTimeout(() => {
        this.message = '';
      }, 5000);

    } catch (error: any) {
      console.error('Mark receipt error:', error);
      this.toastService.error('Action Failed', 'Failed to mark receipt. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  approveRequest(request: ClearanceRequest): void {
    this.message = '';

    if (!request.convocation?.receiptSubmittedAt) {
      this.toastService.warning('Student Receipt Missing', 'Student must submit a receipt first.');
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

      this.toastService.success('Approved', `Convocation clearance approved for ${this.getStudentName(request)}.`);

      setTimeout(() => {
        this.message = '';
      }, 5000);

    } catch (error: any) {
      console.error('Approve error:', error);
      this.toastService.error('Approve Failed', 'Failed to approve request. Please try again.');
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

  approveBackendReceipt(receiptId: string): void {
    if (!confirm('Are you sure you want to approve this receipt?')) return;
    this.isLoading = true;
    this.convocationService.approveReceipt(receiptId).subscribe({
      next: (res) => {
        this.toastService.success('Success', 'Receipt approved and clearance advanced.');
        this.loadData();
      },
      error: (err) => {
        this.toastService.error('Approval Failed', (err.error?.message || err.message));
        this.isLoading = false;
      }
    });
  }

  rejectBackendReceipt(receiptId: string): void {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;

    this.isLoading = true;
    this.convocationService.rejectReceipt(receiptId, reason).subscribe({
      next: (res) => {
        this.toastService.success('Rejected', 'Receipt rejected and student notified.');
        this.loadData();
      },
      error: (err) => {
        this.toastService.error('Rejection Failed', (err.error?.message || err.message));
        this.isLoading = false;
      }
    });
  }
}
