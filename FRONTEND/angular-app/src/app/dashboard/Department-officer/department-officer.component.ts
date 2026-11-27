// src/app/dashboard/Department-officer/department-officer.component.ts
import { ChangeDetectorRef, Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of, timeout } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { StudentDebtService } from '../../core/services/student-debt.service';
import { ClearanceRequest, OfficeApproval } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

export interface DepartmentProgrammeStat {
  label: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  clearanceRate: number;
}

@Component({
  selector: 'app-department-officer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './department-officer.html',
  styleUrl: './department-officer.css'
})
export class DepartmentOfficerComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  private readonly studentDebtService = inject(StudentDebtService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  sidebarOpen = false;
  viewMode: 'requests' | 'analytics' = 'requests';
  isLoading = false;
  isProcessingBulk = false;
  message = '';
  messageState: 'success' | 'error' = 'success';

  searchTerm = '';
  filterStatus: 'all' | 'pending' | 'approved' | 'rejected' = 'pending';
  currentPage = 1;
  pageSize = 15;

  pendingRequests: ClearanceRequest[] = [];
  filteredRequests: ClearanceRequest[] = [];
  selectedRequest: ClearanceRequest | null = null;
  rejectionComment = '';

  // Lecturer debt flag state
  openDebtRegistrations = new Set<string>();
  debtFlagsLoaded = false;
  debtFlagsLoading = false;
  debtFlagCheckError = '';

  // Bulk select & per-row submission locks
  selectedRequestIds = new Set<string>();
  readonly processingRequests = new Set<string>();

  private debtFlagRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private isRefreshingQueue = false;
  private readonly studentCache = new Map<string, any>();

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get departmentName(): string {
    return this.currentUser?.department || 'Academic Department';
  }

  get unreadNotifications(): number {
    return this.notificationService.unreadCount;
  }

  get totalRequestCount(): number {
    return this.pendingRequests.length;
  }

  get pendingRequestCount(): number {
    return this.pendingRequests.filter(r => this.getRequestOfficeStatus(r, 'Department') === 'Pending').length;
  }

  get approvedRequestCount(): number {
    return this.pendingRequests.filter(r => this.getRequestOfficeStatus(r, 'Department') === 'Approved').length;
  }

  get rejectedRequestCount(): number {
    return this.pendingRequests.filter(r => this.getRequestOfficeStatus(r, 'Department') === 'Rejected').length;
  }

  get flaggedPendingCount(): number {
    return this.pendingRequests.filter(
      r => this.getRequestOfficeStatus(r, 'Department') === 'Pending' && this.hasOpenDebtFlag(r)
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

  get programmeBreakdown(): DepartmentProgrammeStat[] {
    const map = new Map<string, { total: number; approved: number; pending: number; rejected: number }>();

    for (const req of this.pendingRequests) {
      const label = (req.programme || '').trim() || 'Unspecified Programme';
      const entry = map.get(label) || { total: 0, approved: 0, pending: 0, rejected: 0 };
      entry.total += 1;
      const st = this.getRequestOfficeStatus(req, 'Department');
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

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRequests.length / this.pageSize));
  }

  get paginatedRequests(): ClearanceRequest[] {
    const safePage = Math.min(this.currentPage, this.totalPages);
    const start = (safePage - 1) * this.pageSize;
    return this.filteredRequests.slice(start, start + this.pageSize);
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      this.refreshQueue(false);
    }
  }

  ngOnInit(): void {
    const initialTab = this.route.snapshot.queryParamMap.get('tab');
    if (initialTab && ['requests', 'analytics'].includes(initialTab)) {
      this.viewMode = initialTab as any;
    }
    this.syncLocalRequests();
    this.refreshQueue(false);

    this.debtFlagRefreshTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (this.isRefreshingQueue) return;
      this.refreshQueue(false);
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.debtFlagRefreshTimer) {
      clearInterval(this.debtFlagRefreshTimer);
      this.debtFlagRefreshTimer = null;
    }
  }

  refreshQueue(showToast = false): void {
    this.isRefreshingQueue = true;
    this.isLoading = true;
    this.loadOpenDebtFlags();

    this.clearanceService.fetchOfficeRequests('Department').subscribe({
      next: () => {
        this.isRefreshingQueue = false;
        this.isLoading = false;
        this.syncLocalRequests();
        if (showToast) {
          this.toastService.success('Refreshed', 'Department clearance queue and lecturer debt flags updated.');
        }
      },
      error: (err) => {
        this.isRefreshingQueue = false;
        this.isLoading = false;
        this.syncLocalRequests();
        if (showToast) {
          this.toastService.error('Load Failed', err?.error?.message || 'Unable to load Department clearance requests.');
        }
      }
    });
  }

  private syncLocalRequests(): void {
    this.studentCache.clear();
    const user = this.currentUser;
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    const departmentRequests = this.clearanceService.getRequestsForOffice(
      'Department',
      user.college,
      user.department
    );

    this.pendingRequests = this.clearanceService.getAllRequests().filter(request => {
      if (departmentRequests.some(dr => dr.id === request.id)) {
        return true;
      }
      if (!this.clearanceService.matchDepartmentName(request.department, user.department)) {
        return false;
      }
      return (
        request.currentStage === 'Principal' ||
        request.currentStage === 'Finance' ||
        request.currentStage === 'Supervisor' ||
        request.status === 'Completed'
      );
    });

    this.applyFilters();
    this.clampPage();
  }

  loadOpenDebtFlags(): void {
    if (this.debtFlagsLoading) return;
    this.debtFlagsLoading = true;
    this.debtFlagCheckError = '';

    this.studentDebtService.listOpenForDepartment().pipe(
      timeout({ first: 5000 }),
      catchError(err => {
        console.warn('Could not load departmental debt flags:', err);
        this.debtFlagCheckError = 'Could not verify lecturer debt flags right now. Refresh before approving.';
        return of([]);
      })
    ).subscribe({
      next: flags => {
        const safeFlags = Array.isArray(flags) ? flags : [];
        this.openDebtRegistrations = new Set(
          safeFlags
            .map(flag => this.normalizeRegistrationNumber(flag?.registrationNumber ?? ''))
            .filter(Boolean)
        );
        this.debtFlagsLoaded = true;
        this.debtFlagsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.debtFlagsLoaded = true;
        this.debtFlagsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  setViewMode(mode: 'requests' | 'analytics'): void {
    this.viewMode = mode;
    this.closeSidebar();
  }

  filterByCard(status: 'all' | 'pending' | 'approved' | 'rejected'): void {
    this.viewMode = 'requests';
    this.filterStatus = status;
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.selectedRequestIds.clear();
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.pendingRequests];

    if (this.filterStatus === 'pending') {
      filtered = filtered.filter(r => this.getRequestOfficeStatus(r, 'Department') === 'Pending');
    } else if (this.filterStatus === 'approved') {
      filtered = filtered.filter(r => this.getRequestOfficeStatus(r, 'Department') === 'Approved');
    } else if (this.filterStatus === 'rejected') {
      filtered = filtered.filter(r => this.getRequestOfficeStatus(r, 'Department') === 'Rejected');
    }

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(r =>
        this.getStudentName(r).toLowerCase().includes(term) ||
        this.getStudentRegNumber(r).toLowerCase().includes(term) ||
        (r.programme || '').toLowerCase().includes(term) ||
        this.getStudentEmail(r).toLowerCase().includes(term)
      );
    }

    this.filteredRequests = filtered;
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

  /* =========================
     STUDENT & DEBT HELPERS
  ========================= */

  getOfficeApproval(request: ClearanceRequest, office: string = 'Department'): OfficeApproval | undefined {
    return request.approvals?.find(a => a.office === office);
  }

  getRequestOfficeStatus(request: ClearanceRequest, office: string = 'Department'): 'Pending' | 'Approved' | 'Rejected' {
    return this.getOfficeApproval(request, office)?.status ?? 'Pending';
  }

  hasOpenDebtFlag(request: ClearanceRequest): boolean {
    return this.openDebtRegistrations.has(this.normalizeRegistrationNumber(this.getStudentRegNumber(request)));
  }

  private normalizeRegistrationNumber(value: string): string {
    return (value || '').trim().toUpperCase();
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
    if (request.registrationNumber) return request.registrationNumber;
    const u = this.getStudentData(request.studentId);
    return u?.registrationNumber || u?.studentId || 'Not available';
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

  /* =========================
     BULK SELECTION & ACTIONS
  ========================= */

  isSelectable(request: ClearanceRequest): boolean {
    return this.getRequestOfficeStatus(request, 'Department') === 'Pending' && !this.hasOpenDebtFlag(request);
  }

  get selectableRequests(): ClearanceRequest[] {
    return this.filteredRequests.filter(r => this.isSelectable(r));
  }

  get isAllSelected(): boolean {
    const eligible = this.selectableRequests;
    return eligible.length > 0 && eligible.every(r => this.selectedRequestIds.has(r.id));
  }

  toggleSelectAll(): void {
    if (this.isAllSelected) {
      this.selectedRequestIds.clear();
    } else {
      this.selectableRequests.forEach(r => this.selectedRequestIds.add(r.id));
    }
  }

  toggleSelect(request: ClearanceRequest): void {
    if (!this.isSelectable(request)) return;
    if (this.selectedRequestIds.has(request.id)) this.selectedRequestIds.delete(request.id);
    else this.selectedRequestIds.add(request.id);
  }

  approveSelected(): void {
    const eligibleSet = new Set(this.selectableRequests.map(r => r.id));
    const ids = Array.from(this.selectedRequestIds).filter(id => eligibleSet.has(id));
    if (!ids.length) {
      this.toastService.warning('No Students Selected', 'Select eligible unflagged students to approve.');
      return;
    }

    if (!confirm(`Approve Department clearance for ${ids.length} selected student(s)? Students with active Lecturer debt flags are excluded.`)) {
      return;
    }

    this.isProcessingBulk = true;
    this.clearanceService.bulkApproveOfficeBackend(ids, 'Department', 'Bulk approved by Department Officer').subscribe({
      next: (res) => {
        this.isProcessingBulk = false;
        this.selectedRequestIds.clear();
        this.toastService.success('Bulk Approved', res?.message || `Approved ${ids.length} student(s).`);
        this.refreshQueue(false);
      },
      error: (err) => {
        this.isProcessingBulk = false;
        this.toastService.error('Bulk Approve Failed', err?.error?.message || err?.message || 'Unable to process bulk approval.');
      }
    });
  }

  async approveRequest(request: ClearanceRequest): Promise<void> {
    if (!this.debtFlagsLoaded) {
      this.toastService.warning('Debt Flags Unavailable', 'Verification is disabled until the lecturer debt register finishes loading.');
      return;
    }
    if (this.hasOpenDebtFlag(request)) {
      this.toastService.warning('Debt Flag Open', 'Department approval is blocked until the Lecturer resolves this student debt flag.');
      return;
    }
    if (this.processingRequests.has(request.id) || this.getRequestOfficeStatus(request, 'Department') !== 'Pending') {
      return;
    }

    const staff = this.currentUser;
    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }

    this.processingRequests.add(request.id);
    const studentName = this.getStudentName(request);
    try {
      const ok = await this.clearanceService.approveRequest(
        request.id,
        'Department',
        staff.fullName || 'Department Officer'
      );
      if (!ok) {
        this.messageState = 'error';
        this.message = 'This request could not be approved in its current state.';
        this.toastService.error('Approve Failed', this.message);
        return;
      }

      this.selectedRequestIds.delete(request.id);
      this.messageState = 'success';
      this.message = `Department clearance approved for ${studentName}. Forwarded to Principal.`;
      this.toastService.success('Approved', `${studentName} approved and forwarded to Principal.`);
      this.syncLocalRequests();
    } catch (error: any) {
      this.toastService.error('Approve Failed', error?.message || 'Failed to approve request.');
    } finally {
      this.processingRequests.delete(request.id);
    }
  }

  openRejectForm(request: ClearanceRequest): void {
    this.selectedRequest = request;
    this.rejectionComment = '';
    this.message = '';
  }

  closeRejectModal(): void {
    if (this.selectedRequest && this.processingRequests.has(this.selectedRequest.id)) return;
    this.selectedRequest = null;
    this.rejectionComment = '';
  }

  async rejectRequest(): Promise<void> {
    const request = this.selectedRequest;
    if (!request || this.processingRequests.has(request.id)) return;

    const trimmed = this.rejectionComment.trim();
    if (trimmed.length < 5) {
      this.toastService.warning('Comment Too Short', 'Please provide a clear rejection reason (at least 5 characters).');
      return;
    }

    const staff = this.currentUser;
    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }

    this.processingRequests.add(request.id);
    const studentName = this.getStudentName(request);
    try {
      const ok = await this.clearanceService.rejectRequest(
        request.id,
        'Department',
        staff.fullName || 'Department Officer',
        trimmed
      );
      if (!ok) {
        this.toastService.error('Reject Failed', 'This request is no longer pending Department approval.');
        return;
      }

      this.selectedRequest = null;
      this.rejectionComment = '';
      this.messageState = 'success';
      this.message = `Department clearance returned for ${studentName}. Student has been notified.`;
      this.toastService.warning('Returned', `${studentName} was notified of the required departmental action.`);
      this.syncLocalRequests();
    } catch (error: any) {
      this.toastService.error('Reject Failed', error?.message || 'Failed to reject request.');
    } finally {
      this.processingRequests.delete(request.id);
    }
  }

  async withdrawDecision(request: ClearanceRequest): Promise<void> {
    if (this.processingRequests.has(request.id)) return;
    if (!confirm(`Withdraw Department decision for ${this.getStudentName(request)}? The request will return to Pending.`)) {
      return;
    }

    this.processingRequests.add(request.id);
    try {
      const ok = await this.clearanceService.withdrawOfficeDecision(request.id, 'Department');
      if (!ok) {
        this.toastService.error('Withdraw Failed', 'This Department decision could not be withdrawn (Principal may have already acted).');
        return;
      }

      this.messageState = 'success';
      this.message = `Department decision withdrawn for ${this.getStudentName(request)}.`;
      this.toastService.info('Decision Withdrawn', 'The request is pending Department review again.');
      this.refreshQueue(false);
    } finally {
      this.processingRequests.delete(request.id);
    }
  }

  reviewRequest(requestId: string): void {
    this.router.navigate(['/department/review', requestId]);
  }

  downloadAnalyticsCsv(): void {
    const rows: string[][] = [
      ['UNIVERSITY OF DAR ES SALAAM - DEPARTMENT CLEARANCE REPORT'],
      [`Department: ${this.departmentName}`],
      [`Generated On: ${new Date().toLocaleString()}`],
      [],
      ['SUMMARY METRICS'],
      ['Metric', 'Value'],
      ['Total Requests', String(this.totalRequestCount)],
      ['Pending Review', String(this.pendingRequestCount)],
      ['Pending With Open Debt Flag', String(this.flaggedPendingCount)],
      ['Approved', String(this.approvedRequestCount)],
      ['Rejected', String(this.rejectedRequestCount)],
      ['Clearance Rate', `${this.clearanceRatePercent}%`],
      [],
      ['PROGRAMME BREAKDOWN'],
      ['Programme', 'Total', 'Approved', 'Pending', 'Rejected', 'Clearance Rate %'],
      ...this.programmeBreakdown.map(item => [
        item.label,
        String(item.total),
        String(item.approved),
        String(item.pending),
        String(item.rejected),
        `${item.clearanceRate}%`
      ])
    ];

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `department-clearance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toastService.success('Export Ready', 'Department clearance report downloaded as CSV.');
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
