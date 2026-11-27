import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import {
  ConvocationReceipt,
  ConvocationService
} from '../../core/services/convocation.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

@Component({
  selector: 'app-convocation-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardHeaderComponent],
  templateUrl: './convocation-dashboard.html',
  styleUrl: './convocation-dashboard.css'
})
export class ConvocationDashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly convocationService = inject(ConvocationService);
  private readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  sidebarOpen = false;
  viewMode: 'all' | 'pending' | 'analytics' = 'all';

  receipts: ConvocationReceipt[] = [];
  isLoading = false;
  isActionSubmitting = false;

  searchTerm = '';
  filterStatus: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' = 'ALL';

  currentPage = 1;
  pageSize = 10;

  detailsReceipt: ConvocationReceipt | null = null;
  rejectTarget: ConvocationReceipt | null = null;
  rejectionReason = '';

  ngOnInit(): void {
    const initialTab = this.route.snapshot.queryParamMap.get('tab');
    if (initialTab && ['all', 'pending', 'analytics'].includes(initialTab)) {
      this.viewMode = initialTab as any;
    }
    this.loadReceipts();
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get unreadNotifications(): number {
    return this.notificationService.unreadCount;
  }

  get totalCount(): number {
    return this.receipts.length;
  }

  get pendingCount(): number {
    return this.receipts.filter(r => r.status === 'PENDING').length;
  }

  get approvedCount(): number {
    return this.receipts.filter(r => r.status === 'APPROVED').length;
  }

  get rejectedCount(): number {
    return this.receipts.filter(r => r.status === 'REJECTED').length;
  }

  get filteredReceipts(): ConvocationReceipt[] {
    const activeFilter = this.viewMode === 'pending' ? 'PENDING' : this.filterStatus;
    const term = this.searchTerm.trim().toLowerCase();

    return this.receipts.filter(item => {
      if (activeFilter !== 'ALL' && item.status !== activeFilter) {
        return false;
      }
      if (!term) return true;
      return (
        (item.studentName || '').toLowerCase().includes(term) ||
        (item.registrationNumber || '').toLowerCase().includes(term) ||
        (item.controlNumber || '').toLowerCase().includes(term) ||
        (item.college || '').toLowerCase().includes(term) ||
        (item.department || '').toLowerCase().includes(term)
      );
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredReceipts.length / this.pageSize));
  }

  get paginatedReceipts(): ConvocationReceipt[] {
    const safePage = Math.min(this.currentPage, this.totalPages);
    const start = (safePage - 1) * this.pageSize;
    return this.filteredReceipts.slice(start, start + this.pageSize);
  }

  get collegeBreakdown(): Array<{ college: string; total: number; approved: number; rejected: number; pending: number }> {
    const map = new Map<string, { college: string; total: number; approved: number; rejected: number; pending: number }>();
    for (const item of this.receipts) {
      const college = item.college?.trim() || 'Unassigned College';
      const entry = map.get(college) || { college, total: 0, approved: 0, rejected: 0, pending: 0 };
      entry.total += 1;
      if (item.status === 'APPROVED') entry.approved += 1;
      else if (item.status === 'REJECTED') entry.rejected += 1;
      else entry.pending += 1;
      map.set(college, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }

  loadReceipts(showToast = false): void {
    this.isLoading = true;
    this.convocationService.getPendingReceipts().subscribe({
      next: (res) => {
        this.receipts = Array.isArray(res?.receipts) ? res.receipts : [];
        this.isLoading = false;
        this.currentPage = 1;
        if (showToast) {
          this.toastService.success('Refreshed', 'Convocation submissions updated.');
        }
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Unable to load convocation submissions.';
        this.toastService.error('Load Failed', msg);
      }
    });
  }

  setViewMode(mode: 'all' | 'pending' | 'analytics'): void {
    this.viewMode = mode;
    if (mode === 'pending') {
      this.filterStatus = 'PENDING';
    } else if (mode === 'all') {
      this.filterStatus = 'ALL';
    }
    this.currentPage = 1;
    this.closeSidebar();
  }

  selectStatusFilter(status: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'): void {
    this.viewMode = status === 'PENDING' ? 'pending' : 'all';
    this.filterStatus = status;
    this.currentPage = 1;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage -= 1;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage += 1;
  }

  openDetails(receipt: ConvocationReceipt): void {
    this.detailsReceipt = receipt;
  }

  closeDetails(): void {
    this.detailsReceipt = null;
  }

  approveReceipt(receipt: ConvocationReceipt): void {
    if (this.isActionSubmitting || receipt.status !== 'PENDING') return;
    this.isActionSubmitting = true;
    this.convocationService.approveReceipt(receipt.id).subscribe({
      next: () => {
        this.isActionSubmitting = false;
        this.toastService.success('Approved', `Control number ${receipt.controlNumber} approved for ${receipt.studentName}.`);
        this.detailsReceipt = null;
        this.loadReceipts();
      },
      error: (err) => {
        this.isActionSubmitting = false;
        this.toastService.error('Approval Failed', err?.error?.message || 'Unable to approve this receipt.');
      }
    });
  }

  openRejectModal(receipt: ConvocationReceipt): void {
    this.rejectTarget = receipt;
    this.rejectionReason = '';
  }

  closeRejectModal(): void {
    this.rejectTarget = null;
    this.rejectionReason = '';
  }

  confirmReject(): void {
    if (!this.rejectTarget || this.isActionSubmitting) return;
    const trimmed = this.rejectionReason.trim();
    if (trimmed.length < 5) {
      this.toastService.warning('Reason Required', 'Enter a rejection reason of at least 5 characters.');
      return;
    }

    this.isActionSubmitting = true;
    const target = this.rejectTarget;
    this.convocationService.rejectReceipt(target.id, trimmed).subscribe({
      next: () => {
        this.isActionSubmitting = false;
        this.toastService.success(
          'Returned to Student',
          `Convocation submission for ${target.studentName} was flagged and returned for resubmission.`
        );
        this.closeRejectModal();
        this.detailsReceipt = null;
        this.loadReceipts();
      },
      error: (err) => {
        this.isActionSubmitting = false;
        this.toastService.error('Rejection Failed', err?.error?.message || 'Unable to reject this submission.');
      }
    });
  }

  getPercent(value: number): number {
    if (!this.totalCount) return 0;
    return Math.round((value / this.totalCount) * 100);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
