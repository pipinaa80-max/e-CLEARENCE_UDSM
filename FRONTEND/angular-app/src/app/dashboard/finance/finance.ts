// src/app/dashboard/finance/finance.ts
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { TranscriptPaymentService } from '../../core/services/transcript-payment.service';
import { ToastService } from '../../core/services/toast.service';
import { ClearanceRequest, OfficeApproval } from '../../core/models/clearance.model';
import { TranscriptPaymentRequest } from '../../transcript/transcript-payment.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

export interface FinanceCollegeStat {
  label: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  clearanceRate: number;
}

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './finance.html',
  styleUrl: './finance.css'
})
export class FinanceDashboard implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly transcriptPaymentService = inject(TranscriptPaymentService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  sidebarOpen = false;
  viewMode: 'requests' | 'transcript-payments' | 'analytics' = 'requests';

  isLoadingRequests = false;
  isTranscriptPaymentsLoading = false;
  isSubmitting = false;

  message = '';
  messageState: 'success' | 'error' = 'success';

  // Clearance requests filter & pagination
  searchTerm = '';
  filterStatus: 'all' | 'pending' | 'approved' | 'rejected' = 'pending';
  currentPage = 1;
  pageSize = 15;

  // Isolated Transcript Payments filters
  transcriptSearchTerm = '';
  transcriptFilterStatus: 'all' | 'pending' | 'approved' | 'rejected' = 'pending';

  // Modals
  selectedRequest: ClearanceRequest | null = null;
  selectedTranscriptForReject: TranscriptPaymentRequest | null = null;
  detailsRequest: ClearanceRequest | null = null;
  enlargedPhotoUrl: string | null = null;
  rejectionComment = '';

  private isRefreshingTranscriptPayments = false;
  private transcriptRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private readonly studentCache = new Map<string, any>();

  ngOnInit(): void {
    if (!this.isOfficer) return;
    const initialTab = this.route.snapshot.queryParamMap.get('tab');
    if (initialTab && ['requests', 'transcript-payments', 'analytics'].includes(initialTab)) {
      this.viewMode = initialTab as any;
    }
    this.loadAllData(false);

    this.transcriptRefreshTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void this.refreshTranscriptPayments(false);
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.transcriptRefreshTimer) {
      clearInterval(this.transcriptRefreshTimer);
      this.transcriptRefreshTimer = null;
    }
  }

  loadAllData(showToast = false): void {
    this.isLoadingRequests = true;
    this.clearanceService.fetchOfficeRequests('Finance').subscribe({
      next: () => {
        this.isLoadingRequests = false;
        this.clampPage();
        if (showToast) {
          this.toastService.success('Refreshed', 'Finance clearance and transcript payment queues updated.');
        }
      },
      error: (err) => {
        this.isLoadingRequests = false;
        const msg = err?.error?.message || 'Unable to load Finance clearance requests.';
        this.toastService.error('Load Failed', msg);
      }
    });

    this.isTranscriptPaymentsLoading = true;
    void this.refreshTranscriptPayments(showToast).finally(() => {
      this.isTranscriptPaymentsLoading = false;
    });
  }

  private async refreshTranscriptPayments(showError: boolean): Promise<void> {
    if (this.isRefreshingTranscriptPayments) return;
    this.isRefreshingTranscriptPayments = true;
    try {
      await this.transcriptPaymentService.refreshFinanceControlNumberRequests();
    } catch {
      if (showError) {
        this.toastService.error(
          'Transcript Payments Unavailable',
          'Could not securely load transcript payment requests from the server.'
        );
      }
    } finally {
      this.isRefreshingTranscriptPayments = false;
    }
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get isOfficer(): boolean {
    return this.currentUser?.role === 'Finance';
  }

  get unreadNotifications(): number {
    return this.notificationService.unreadCount;
  }

  /* =========================
     CLEARANCE QUEUE GETTERS
  ========================= */

  get requests(): ClearanceRequest[] {
    return this.clearanceService.getRequestsForOffice('Finance').filter(request => {
      const financeStatus = this.getRequestOfficeStatus(request, 'Finance');
      return (
        request.currentStage === 'Finance' ||
        request.currentStage === 'Supervisor' ||
        request.status === 'Completed' ||
        financeStatus !== 'Pending'
      );
    });
  }

  get totalRequestCount(): number {
    return this.requests.length;
  }

  get pendingRequestCount(): number {
    return this.requests.filter(r => this.getRequestOfficeStatus(r, 'Finance') === 'Pending').length;
  }

  get approvedRequestCount(): number {
    return this.requests.filter(r => this.getRequestOfficeStatus(r, 'Finance') === 'Approved').length;
  }

  get rejectedRequestCount(): number {
    return this.requests.filter(r => this.getRequestOfficeStatus(r, 'Finance') === 'Rejected').length;
  }

  get resubmittedPendingCount(): number {
    return this.requests.filter(
      r => this.getRequestOfficeStatus(r, 'Finance') === 'Pending' && this.hasFinanceReceipt(r)
    ).length;
  }

  get clearanceRatePercent(): number {
    if (!this.totalRequestCount) return 0;
    return Math.round((this.approvedRequestCount / this.totalRequestCount) * 100);
  }

  get pendingPercent(): number {
    if (!this.totalRequestCount) return 0;
    return Math.round((this.pendingRequestCount / this.totalRequestCount) * 100);
  }

  get rejectedPercent(): number {
    if (!this.totalRequestCount) return 0;
    return Math.round((this.rejectedRequestCount / this.totalRequestCount) * 100);
  }

  get filteredRequests(): ClearanceRequest[] {
    let list = this.requests;

    if (this.filterStatus === 'pending') {
      list = list.filter(r => this.getRequestOfficeStatus(r, 'Finance') === 'Pending');
    } else if (this.filterStatus === 'approved') {
      list = list.filter(r => this.getRequestOfficeStatus(r, 'Finance') === 'Approved');
    } else if (this.filterStatus === 'rejected') {
      list = list.filter(r => this.getRequestOfficeStatus(r, 'Finance') === 'Rejected');
    }

    const q = this.searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        this.getStudentName(r).toLowerCase().includes(q) ||
        this.getStudentRegNumber(r).toLowerCase().includes(q) ||
        (r.programme || '').toLowerCase().includes(q) ||
        this.getSubmittedControlNumber(r).toLowerCase().includes(q)
      );
    }

    return list;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRequests.length / this.pageSize));
  }

  get paginatedRequests(): ClearanceRequest[] {
    const safePage = Math.min(this.currentPage, this.totalPages);
    const start = (safePage - 1) * this.pageSize;
    return this.filteredRequests.slice(start, start + this.pageSize);
  }

  get collegeBreakdown(): FinanceCollegeStat[] {
    const map = new Map<string, { total: number; approved: number; pending: number; rejected: number }>();

    for (const req of this.requests) {
      const label = (req.college || '').trim() || 'Unspecified College';
      const entry = map.get(label) || { total: 0, approved: 0, pending: 0, rejected: 0 };
      entry.total += 1;
      const st = this.getRequestOfficeStatus(req, 'Finance');
      if (st === 'Approved') entry.approved += 1;
      else if (st === 'Rejected') entry.rejected += 1;
      else entry.pending += 1;
      map.set(label, entry);
    }

    return Array.from(map.entries())
      .map(([label, stats]) => ({
        label,
        ...stats,
        clearanceRate: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }

  /* =========================
     TRANSCRIPT PAYMENTS GETTERS
  ========================= */

  private get deduplicatedTranscriptRequests(): TranscriptPaymentRequest[] {
    const raw = this.transcriptPaymentService.getAllRequests().filter(
      r => r.serverManaged && (r.status === 'Receipt Submitted' || r.status === 'Paid' || r.status === 'Receipt Rejected')
    );
    const batches = new Map<string, TranscriptPaymentRequest>();
    for (const req of raw) {
      const batchKey = req.paymentBatchId || `${req.studentId}:${req.submittedControlNumber || req.controlNumber || req.id}`;
      if (!batches.has(batchKey)) batches.set(batchKey, req);
    }
    return Array.from(batches.values());
  }

  get totalTranscriptPaymentCount(): number {
    return this.deduplicatedTranscriptRequests.length;
  }

  get pendingTranscriptPaymentCount(): number {
    return this.deduplicatedTranscriptRequests.filter(r => r.status === 'Receipt Submitted').length;
  }

  get approvedTranscriptPaymentCount(): number {
    return this.deduplicatedTranscriptRequests.filter(r => r.status === 'Paid').length;
  }

  get rejectedTranscriptPaymentCount(): number {
    return this.deduplicatedTranscriptRequests.filter(r => r.status === 'Receipt Rejected').length;
  }

  get filteredTranscriptPaymentRequests(): TranscriptPaymentRequest[] {
    let list = this.deduplicatedTranscriptRequests;

    if (this.transcriptFilterStatus === 'pending') {
      list = list.filter(r => r.status === 'Receipt Submitted');
    } else if (this.transcriptFilterStatus === 'approved') {
      list = list.filter(r => r.status === 'Paid');
    } else if (this.transcriptFilterStatus === 'rejected') {
      list = list.filter(r => r.status === 'Receipt Rejected');
    }

    const q = this.transcriptSearchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        (r.registrationNumber || '').toLowerCase().includes(q) ||
        (r.studentName || '').toLowerCase().includes(q) ||
        (r.submittedControlNumber || r.controlNumber || '').toLowerCase().includes(q) ||
        (r.award || '').toLowerCase().includes(q)
      );
    }

    return list;
  }

  getTranscriptStatusLabel(status: string): string {
    if (status === 'Paid') return 'Approved';
    if (status === 'Receipt Rejected') return 'Rejected';
    return 'Pending';
  }

  /* =========================
     NAVIGATION & FILTERS
  ========================= */

  setViewMode(mode: 'requests' | 'transcript-payments' | 'analytics'): void {
    this.viewMode = mode;
    this.closeSidebar();
  }

  filterByCard(status: 'all' | 'pending' | 'approved' | 'rejected'): void {
    this.viewMode = 'requests';
    this.filterStatus = status;
    this.currentPage = 1;
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  clampPage(): void {
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    if (this.currentPage < 1) this.currentPage = 1;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  /* =========================
     STUDENT & RECEIPT HELPERS
  ========================= */

  getOfficeApproval(request: ClearanceRequest, office: string = 'Finance'): OfficeApproval | undefined {
    return request.approvals?.find(a => a.office === office);
  }

  getRequestOfficeStatus(request: ClearanceRequest, office: string = 'Finance'): 'Pending' | 'Approved' | 'Rejected' {
    return this.getOfficeApproval(request, office)?.status ?? 'Pending';
  }

  getRequestReviewer(request: ClearanceRequest): string {
    return this.getOfficeApproval(request, 'Finance')?.reviewedBy || 'Not reviewed yet';
  }

  getRequestReviewedAt(request: ClearanceRequest): string | null {
    return this.getOfficeApproval(request, 'Finance')?.reviewedAt || null;
  }

  getRequestComment(request: ClearanceRequest): string {
    return this.getOfficeApproval(request, 'Finance')?.comment || '';
  }

  getRejectionHistory(request: ClearanceRequest) {
    return request.rejectionHistory ?? [];
  }

  getStatusSummary(request: ClearanceRequest): string {
    const status = this.getRequestOfficeStatus(request, 'Finance');
    if (status === 'Approved') {
      return request.isPostgraduate
        ? 'Finance cleared — forwarded to Postgraduate Supervisor (Stage 6)'
        : 'Finance cleared — student graduation clearance completed';
    }
    if (status === 'Rejected') return 'Action required — student flagged for fee balance or receipt proof';
    if (this.hasFinanceReceipt(request)) return 'Student resubmitted Finance payment receipt — awaiting re-verification';
    return 'Awaiting Finance verification of tuition fees and payment records';
  }

  hasFinanceReceipt(request: ClearanceRequest): boolean {
    return !!(
      request.resubmittedWithReceipt ||
      request.financeReceipt?.controlNumber ||
      request.financeReceipt?.receiptData ||
      request.financeReceipt?.receiptFileName ||
      request.financeReceipt?.receiptSubmittedAt
    );
  }

  hasReceipt(request: ClearanceRequest): boolean {
    return !!(
      this.hasFinanceReceipt(request) ||
      this.getSubmittedControlNumber(request) ||
      request.convocation?.receiptData ||
      request.convocation?.receiptFileName ||
      request.convocation?.receiptSubmittedAt
    );
  }

  getSubmittedControlNumber(request: ClearanceRequest): string {
    return (
      request.financeReceipt?.controlNumber ||
      request.convocation?.submittedControlNumber ||
      request.convocation?.controlNumber ||
      ''
    );
  }

  getReceiptImage(request: ClearanceRequest): string | null {
    const data = request.financeReceipt?.receiptData || request.convocation?.receiptData;
    if (!data || data === 'IMAGE_TOO_LARGE_PLACEHOLDER') return null;
    if (data.startsWith('data:image') || data.startsWith('http') || data.startsWith('/')) {
      return data;
    }
    return 'data:image/jpeg;base64,' + data;
  }

  getReceiptFileName(request: ClearanceRequest): string {
    return request.financeReceipt?.receiptFileName || request.convocation?.receiptFileName || '';
  }

  getReceiptSubmittedAt(request: ClearanceRequest): string | null {
    return request.financeReceipt?.receiptSubmittedAt || request.convocation?.receiptSubmittedAt || null;
  }

  getReceiptNote(request: ClearanceRequest): string {
    return request.financeReceipt?.receiptNote || '';
  }

  private getStudentData(studentId: string): any | null {
    if (this.studentCache.has(studentId)) {
      return this.studentCache.get(studentId);
    }
    try {
      const raw = localStorage.getItem('udsm-local-users');
      if (raw) {
        const users = JSON.parse(raw);
        if (Array.isArray(users)) {
          const match = users.find((u: any) => u.id === studentId) || null;
          this.studentCache.set(studentId, match);
          return match;
        }
      }
    } catch {
      // Ignore storage access errors
    }
    this.studentCache.set(studentId, null);
    return null;
  }

  getStudentName(request: ClearanceRequest): string {
    if (request.studentName) return request.studentName;
    const u = this.getStudentData(request.studentId);
    return u?.fullName || [u?.firstName, u?.lastName].filter(Boolean).join(' ') || request.registrationNumber || 'Student';
  }

  getStudentListName(request: ClearanceRequest): string {
    const u = this.getStudentData(request.studentId);
    const first = u?.firstName?.trim();
    const middle = u?.middleName?.trim();
    const last = u?.lastName?.trim();
    if (first && last) return `${last}, ${[first, middle].filter(Boolean).join(' ')}`.toUpperCase();
    const fullName = (request.studentName || u?.fullName || '').trim();
    if (!fullName) return '—';
    const parts = fullName.split(/\s+/).filter(Boolean);
    return parts.length > 1 ? `${parts.pop()}, ${parts.join(' ')}`.toUpperCase() : fullName.toUpperCase();
  }

  getStudentRegNumber(request: ClearanceRequest): string {
    const u = this.getStudentData(request.studentId);
    return request.registrationNumber?.trim() || u?.registrationNumber?.trim() || u?.studentId?.trim() || '—';
  }

  getStudentGender(request: ClearanceRequest): string {
    const g = this.getStudentData(request.studentId)?.gender || (request as any).gender;
    return typeof g === 'string' && g.trim() && g.trim() !== '—' ? g.trim() : 'Not recorded';
  }

  getStudentEmail(request: ClearanceRequest): string {
    return request.email?.trim() || this.getStudentData(request.studentId)?.email?.trim() || '—';
  }

  getStudentPhone(request: ClearanceRequest): string {
    const u = this.getStudentData(request.studentId);
    return request.phoneNumber?.trim() || u?.phoneNumber?.trim() || u?.phone?.trim() || '—';
  }

  getStudentProgramme(request: ClearanceRequest): string {
    return request.programme?.trim() || this.getStudentData(request.studentId)?.programme?.trim() || '—';
  }

  getStudentPhoto(request: ClearanceRequest): string | null {
    let photo = request.photo;
    if (!photo) {
      const u = this.getStudentData(request.studentId);
      photo = u?.photo || u?.profilePhoto || u?.profileImageUrl;
    }
    if (!photo) return null;
    if (photo.startsWith('data:image') || photo.startsWith('http') || photo.startsWith('/') || photo.startsWith('assets/')) {
      return photo;
    }
    return photo.length > 50 ? `data:image/jpeg;base64,${photo}` : photo;
  }

  getStudentInitials(name?: string): string {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  /* =========================
     MODALS & ACTIONS
  ========================= */

  openDetails(request: ClearanceRequest): void {
    this.detailsRequest = request;
  }

  closeDetails(): void {
    this.detailsRequest = null;
  }

  openPhotoLightbox(url: string | null): void {
    if (url) this.enlargedPhotoUrl = url;
  }

  closePhotoLightbox(): void {
    this.enlargedPhotoUrl = null;
  }

  openRejectForm(request: ClearanceRequest): void {
    if (!this.isOfficer) return;
    this.detailsRequest = null;
    this.selectedTranscriptForReject = null;
    this.selectedRequest = request;
    this.rejectionComment = '';
    this.message = '';
  }

  openTranscriptRejectForm(request: TranscriptPaymentRequest): void {
    if (!this.isOfficer) return;
    this.selectedRequest = null;
    this.selectedTranscriptForReject = request;
    this.rejectionComment = '';
    this.message = '';
  }

  closeRejectModal(): void {
    if (this.isSubmitting) return;
    this.selectedRequest = null;
    this.selectedTranscriptForReject = null;
    this.rejectionComment = '';
  }

  async approveClearance(request: ClearanceRequest): Promise<void> {
    if (this.isSubmitting) return;
    const staff = this.currentUser;
    if (!staff || !this.isOfficer) {
      this.router.navigate(['/login']);
      return;
    }

    this.isSubmitting = true;
    const studentName = this.getStudentName(request);
    try {
      const approved = await this.clearanceService.approveRequest(request.id, 'Finance', staff.fullName || 'Finance Officer');
      if (!approved) {
        this.messageState = 'error';
        this.message = 'Cannot approve: student has not yet been cleared by all preceding offices (Parallel, Department, and Principal).';
        this.toastService.warning('Clearance Incomplete', this.message);
        return;
      }

      this.detailsRequest = null;
      this.messageState = 'success';
      if (request.isPostgraduate) {
        this.message = `Finance cleared ${studentName}. Request forwarded to Postgraduate Supervisor (Stage 6).`;
        this.toastService.success('Finance Approved', `${studentName} forwarded to Supervisor.`);
      } else {
        this.message = `Finance cleared ${studentName}. Graduation clearance is now complete.`;
        this.toastService.success('Clearance Completed', `${studentName} cleared by Finance.`);
      }
      this.clampPage();
    } finally {
      this.isSubmitting = false;
    }
  }

  async approveTranscriptPayment(request: TranscriptPaymentRequest): Promise<void> {
    if (this.isSubmitting) return;
    if (!request.serverManaged) {
      this.toastService.error('Payment Not Verified', 'This request is not linked to a server-verified transcript payment.');
      return;
    }

    this.isSubmitting = true;
    try {
      await this.transcriptPaymentService.approveControlNumberRequest(request.id);
      this.messageState = 'success';
      this.message = `Transcript payment control number approved for ${request.studentName} (${request.registrationNumber}).`;
      this.toastService.success('Payment Approved', `Transcript payment verified for ${request.registrationNumber}.`);
    } catch {
      this.toastService.error('Approval Failed', 'Finance could not approve this transcript payment. Refresh and try again.');
    } finally {
      this.isSubmitting = false;
    }
  }

  async confirmReject(): Promise<void> {
    if (this.isSubmitting) return;
    const staff = this.currentUser;
    if (!staff || !this.isOfficer) return;

    const trimmed = this.rejectionComment.trim();
    if (trimmed.length < 5) {
      this.toastService.warning('Comment Too Short', 'Please enter at least 5 characters explaining what must be resolved.');
      return;
    }

    // Branch A: Transcript Payment Rejection
    if (this.selectedTranscriptForReject) {
      const target = this.selectedTranscriptForReject;
      if (!target.serverManaged) {
        this.toastService.error('Payment Not Verified', 'This request is not linked to a server-verified transcript payment.');
        this.selectedTranscriptForReject = null;
        return;
      }

      this.isSubmitting = true;
      try {
        await this.transcriptPaymentService.rejectControlNumberRequest(target.id, trimmed);
        this.messageState = 'success';
        this.message = `Transcript payment control number returned to ${target.studentName} (${target.registrationNumber}).`;
        this.toastService.warning('Payment Returned', `Transcript control number rejected for ${target.registrationNumber}.`);
        this.selectedTranscriptForReject = null;
        this.rejectionComment = '';
      } catch {
        this.toastService.error('Rejection Failed', 'Finance could not reject this transcript payment. Refresh and try again.');
      } finally {
        this.isSubmitting = false;
      }
      return;
    }

    // Branch B: Graduation Clearance Finance Rejection
    if (!this.selectedRequest) return;
    const target = this.selectedRequest;
    const studentName = this.getStudentName(target);

    this.isSubmitting = true;
    try {
      const ok = await this.clearanceService.rejectRequest(
        target.id,
        'Finance',
        staff.fullName || 'Finance Officer',
        trimmed
      );
      if (!ok) {
        this.toastService.error('Rejection Failed', 'Finance could not return this clearance request. Refresh and try again.');
        return;
      }

      this.messageState = 'success';
      this.message = `Finance clearance returned for ${studentName}. Student can now upload a receipt to resubmit.`;
      this.toastService.warning('Returned', `${studentName} was notified of the Finance requirement.`);
      this.selectedRequest = null;
      this.rejectionComment = '';
      this.clampPage();
    } finally {
      this.isSubmitting = false;
    }
  }

  async withdrawDecision(request: ClearanceRequest): Promise<void> {
    if (this.isSubmitting) return;
    if (!confirm(`Withdraw Finance decision for ${this.getStudentName(request)}? The request will return to Pending.`)) {
      return;
    }

    this.isSubmitting = true;
    try {
      const ok = await this.clearanceService.withdrawOfficeDecision(request.id, 'Finance');
      if (!ok) {
        this.toastService.error('Withdraw Failed', 'This Finance decision could not be withdrawn.');
        return;
      }

      this.messageState = 'success';
      this.message = `Finance decision withdrawn for ${this.getStudentName(request)}.`;
      this.toastService.info('Decision Withdrawn', 'The request is pending Finance review again.');
      this.loadAllData(false);
    } finally {
      this.isSubmitting = false;
    }
  }

  /* =========================
     CSV EXPORT, PRINT & LOGOUT
  ========================= */

  downloadAnalyticsCsv(): void {
    const rows: string[][] = [
      ['UNIVERSITY OF DAR ES SALAAM - FINANCE OFFICE CLEARANCE & TRANSCRIPT PAYMENT REPORT'],
      [`Generated On: ${new Date().toLocaleString()}`],
      [],
      ['1. GRADUATION CLEARANCE SUMMARY'],
      ['Metric', 'Value'],
      ['Total Finance Requests', String(this.totalRequestCount)],
      ['Pending Review', String(this.pendingRequestCount)],
      ['Pending With Resubmitted Receipt', String(this.resubmittedPendingCount)],
      ['Approved', String(this.approvedRequestCount)],
      ['Rejected', String(this.rejectedRequestCount)],
      ['Clearance Rate', `${this.clearanceRatePercent}%`],
      [],
      ['2. TRANSCRIPT PAYMENT VERIFICATION SUMMARY'],
      ['Total Transcript Payment Submissions', String(this.totalTranscriptPaymentCount)],
      ['Pending Verification', String(this.pendingTranscriptPaymentCount)],
      ['Approved (Paid)', String(this.approvedTranscriptPaymentCount)],
      ['Rejected', String(this.rejectedTranscriptPaymentCount)],
      [],
      ['3. COLLEGE BREAKDOWN (GRADUATION CLEARANCE)'],
      ['College', 'Total', 'Approved', 'Pending', 'Rejected', 'Clearance Rate %'],
      ...this.collegeBreakdown.map(c => [
        c.label, String(c.total), String(c.approved), String(c.pending), String(c.rejected), `${c.clearanceRate}%`
      ])
    ];

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finance-clearance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toastService.success('Export Ready', 'Finance clearance report downloaded as CSV.');
  }

  printAnalytics(): void {
    window.print();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
