import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { ConvocationReceipt, ConvocationService } from '../../core/services/convocation.service';
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
  private readonly sanitizer = inject(DomSanitizer);

  sidebarOpen = false;
  isLoading = false;
  message = '';
  selectedRequest: ClearanceRequest | null = null;

  backendReceipts: ConvocationReceipt[] = [];

  showReceiptModal = false;
  receiptToView: { name: string, data: string, reg: string } | null = null;

  totalPending = 0;
  totalIssued = 0;
  totalCompleted = 0;

  activeTab: 'dashboard' | 'requests' = 'dashboard';
  filterStatus = 'pending';
  searchTerm = '';
  dateFilter = 'all';
  currentPage = 1;
  pageSize = 10;

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
    if (!request || !request.approvals || !Array.isArray(request.approvals)) {
      return 'Pending';
    }
    return request.approvals.find(a => a && a.office === office)?.status ?? 'Pending';
  }

  get requests(): ClearanceRequest[] {
    let allRequests: ClearanceRequest[] = [];
    try {
      allRequests = this.clearanceService.getRequestsForOffice('Convocation') || [];
      if (!Array.isArray(allRequests)) allRequests = [];
    } catch (e) {
      console.error('Error fetching clearance requests for Convocation:', e);
      allRequests = [];
    }

    this.updateStats(allRequests);

    const search = (this.searchTerm || '').trim().toLowerCase();
    if (search) {
      allRequests = allRequests.filter(request =>
        request && [this.getStudentName(request), this.getStudentRegNumber(request), request.programme, request.department, request.college]
          .some(value => (value || '').toString().toLowerCase().includes(search))
      );
    }
    if (this.dateFilter !== 'all') {
      const days = Number(this.dateFilter);
      if (!isNaN(days)) {
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        allRequests = allRequests.filter(request => request && request.requestDate && new Date(request.requestDate).getTime() >= cutoff);
      }
    }

    if (this.filterStatus === 'pending') {
      allRequests = allRequests.filter(r => r && this.getRequestOfficeStatus(r, 'Convocation') === 'Pending');
    } else if (this.filterStatus === 'approved') {
      allRequests = allRequests.filter(r => r && this.getRequestOfficeStatus(r, 'Convocation') === 'Approved');
    } else if (this.filterStatus === 'rejected') {
      allRequests = allRequests.filter(r => r && this.getRequestOfficeStatus(r, 'Convocation') === 'Rejected');
    }

    return allRequests;
  }

  setTab(tab: 'dashboard' | 'requests'): void {
    this.activeTab = tab;
    this.closeSidebar();
    if (tab === 'requests') {
      this.filterStatus = 'all';
    } else {
      this.filterStatus = 'pending';
    }
    this.onFilterChange();
  }

  ngOnInit(): void {
    if (this.router.url.includes('/convocation/requests')) {
      this.activeTab = 'requests';
      this.filterStatus = 'all';
    } else {
      this.activeTab = 'dashboard';
      this.filterStatus = 'pending';
    }
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;

    // 1. Load from Backend
    this.convocationService.getPendingReceipts().subscribe({
      next: (res) => {
        if (res && Array.isArray(res.receipts)) {
          this.backendReceipts = res.receipts.filter((receipt: ConvocationReceipt) => receipt && receipt.status === 'PENDING');
        } else if (res && Array.isArray(res)) {
          this.backendReceipts = res.filter((receipt: ConvocationReceipt) => receipt && receipt.status === 'PENDING');
        } else {
          this.backendReceipts = [];
        }
        console.log('Backend pending receipts loaded:', this.backendReceipts.length);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading backend receipts:', err);
        this.isLoading = false;
      }
    });

    // 2. Load from Local (for legacy/mock continuity)
    try {
      const requests = this.clearanceService.getRequestsForOffice('Convocation');
      this.updateStats(requests);
    } catch (e) {
      console.error('Error updating stats:', e);
    }
    this.isLoading = false;
  }

  updateStats(requests: ClearanceRequest[]): void {
    if (!requests || !Array.isArray(requests)) {
      this.totalPending = 0;
      this.totalIssued = 0;
      this.totalCompleted = 0;
      return;
    }
    this.totalPending = requests.filter(r =>
        r && r.status === 'Pending' &&
        r.currentStage === 'Convocation' &&
        !r.convocation?.receiptSubmittedAt
    ).length;

    this.totalIssued = requests.filter(r =>
        r && r.convocation?.receiptSubmittedAt &&
        this.getRequestOfficeStatus(r, 'Convocation') === 'Pending'
    ).length;

    this.totalCompleted = requests.filter(r =>
        r && this.getRequestOfficeStatus(r, 'Convocation') === 'Approved'
    ).length;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  private getStudentData(studentId: string): any | null {
    if (!studentId || typeof studentId !== 'string') return null;
    if (this.studentCache.has(studentId)) {
      return this.studentCache.get(studentId);
    }

    try {
      const usersJson = localStorage.getItem('udsm-local-users');
      if (usersJson) {
        const users = JSON.parse(usersJson);
        if (Array.isArray(users)) {
          const user = users.find((u: any) => u && u.id === studentId);
          if (user) {
            this.studentCache.set(studentId, user);
            return user;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    }
    return null;
  }

  getStudentName(request: ClearanceRequest): string {
    if (!request) return 'Student';
    if (request.studentName) return request.studentName;
    if (request.studentId) {
      const user = this.getStudentData(request.studentId);
      if (user) {
        return user.fullName || (user.firstName && user.lastName ? user.firstName + ' ' + user.lastName : '') || user.registrationNumber || 'Student';
      }
    }
    return request.registrationNumber || (request.studentId ? 'Student #' + request.studentId.substring(0, 8) : 'Student');
  }

  getStudentRegNumber(request: ClearanceRequest): string {
    if (!request) return 'Not available';
    if (request.registrationNumber) return request.registrationNumber;
    if (request.studentId) {
      const user = this.getStudentData(request.studentId);
      if (user) {
        return user.registrationNumber || user.studentId || 'Not available';
      }
    }
    return 'Not available';
  }

  getStudentPhoto(request: ClearanceRequest): string | null {
    if (!request) return null;
    let photo = request.photo;
    if (!photo && request.studentId) {
      const user = this.getStudentData(request.studentId);
      if (user) {
        photo = user.photo || user.profilePhoto || user.profileImageUrl;
      }
    }
    if (!photo || typeof photo !== 'string') return null;

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

  getSafeUrl(data: string | undefined): SafeResourceUrl | null {
    if (!data) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(data);
  }

  isImageUrl(data: string | undefined): boolean {
    if (!data) return false;
    if (data.startsWith('data:image')) return true;
    const lower = data.toLowerCase();
    const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    return extensions.some(ext => lower.endsWith(ext) || lower.includes(ext));
  }

  isPdf(data: string | undefined): boolean {
    if (!data) return false;
    if (data.startsWith('data:application/pdf')) return true;
    const lower = data.toLowerCase();
    return lower.endsWith('.pdf') || lower.includes('.pdf') || lower.includes('/pdf');
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

  enlargedPhotoUrl: string | null = null;

  openEnlargedPhoto(photoUrl: string | null): void {
    if (photoUrl) {
      this.enlargedPhotoUrl = photoUrl;
    }
  }

  closeEnlargedPhoto(): void {
    this.enlargedPhotoUrl = null;
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

  async approveRequest(request: ClearanceRequest): Promise<void> {
    this.message = '';
    this.isLoading = true;

    try {
      if (!await this.clearanceService.approveRequest(
          request.id,
          'Convocation',
          this.currentUser?.fullName || 'Convocation Officer'
      )) return;

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
    this.message = 'Refreshing data...';
    this.studentCache.clear();
    this.loadData();
    setTimeout(() => {
      this.message = 'Data refreshed successfully.';
      setTimeout(() => {
        this.message = '';
      }, 3000);
    }, 500);
  }

  exportRequests(): void {
    const rows = this.requests.map(request => [
      this.getStudentName(request),
      this.getStudentRegNumber(request),
      request.programme || '',
      request.college || '',
      this.getRequestOfficeStatus(request, 'Convocation'),
      request.requestDate
    ]);
    const csv = [['Student', 'Registration Number', 'Programme', 'College', 'Status', 'Requested At'], ...rows]
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `convocation-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
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

