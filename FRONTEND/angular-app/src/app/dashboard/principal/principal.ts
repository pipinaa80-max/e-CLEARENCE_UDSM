// src/app/dashboard/principal/principal.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { ClearanceRequest, OfficeApproval } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

export interface PrincipalBreakdownStat {
  label: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  clearanceRate: number;
}

@Component({
  selector: 'app-principal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './principal.html',
  styleUrl: './principal.css'
})
export class PrincipalComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  sidebarOpen = false;
  viewMode: 'requests' | 'analytics' = 'requests';

  isLoading = false;
  isSubmitting = false;
  isProcessingBulk = false;

  message = '';
  messageState: 'success' | 'error' = 'success';

  searchTerm = '';
  filterStatus: 'all' | 'pending' | 'approved' | 'rejected' = 'pending';
  currentPage = 1;
  pageSize = 15;

  collegeQueue: ClearanceRequest[] = [];
  filteredRequests: ClearanceRequest[] = [];
  selectedRequestIds = new Set<string>();

  detailsRequest: ClearanceRequest | null = null;
  selectedRequest: ClearanceRequest | null = null;
  enlargedPhotoUrl: string | null = null;
  rejectionComment = '';

  private readonly studentCache = new Map<string, any>();

  ngOnInit(): void {
    const initialTab = this.route.snapshot.queryParamMap.get('tab');
    if (initialTab && ['requests', 'analytics'].includes(initialTab)) {
      this.viewMode = initialTab as any;
    }
    this.syncLocalRequests();
    this.loadRequests(false);
  }

  loadRequests(showToast = false): void {
    this.isLoading = true;
    this.clearanceService.fetchOfficeRequests('Principal').subscribe({
      next: () => {
        this.isLoading = false;
        this.syncLocalRequests();
        if (showToast) {
          this.toastService.success('Refreshed', 'Principal clearance queue updated.');
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.syncLocalRequests();
        const msg = err?.error?.message || 'Unable to load Principal clearance requests.';
        this.toastService.error('Load Failed', msg);
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

    const allRequests = this.clearanceService.getAllRequests();
    this.collegeQueue = allRequests.filter(request => {
      const studentCollege = this.getStudentCollege(request);
      if (user.college && !this.matchCollege(studentCollege, user.college)) {
        return false;
      }
      const deptStatus = this.getRequestOfficeStatus(request, 'Department');
      return (
        request.currentStage === 'Principal' ||
        request.currentStage === 'Finance' ||
        request.currentStage === 'Supervisor' ||
        request.status === 'Completed' ||
        deptStatus === 'Approved'
      );
    });

    this.applyFilters();
    this.clampPage();
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get collegeName(): string {
    return this.currentUser?.college || 'College Office';
  }

  get unreadNotifications(): number {
    return this.notificationService.unreadCount;
  }

  get totalRequestCount(): number {
    return this.collegeQueue.length;
  }

  get pendingRequestCount(): number {
    return this.collegeQueue.filter(r => this.getRequestOfficeStatus(r, 'Principal') === 'Pending').length;
  }

  get approvedRequestCount(): number {
    return this.collegeQueue.filter(r => this.getRequestOfficeStatus(r, 'Principal') === 'Approved').length;
  }

  get rejectedRequestCount(): number {
    return this.collegeQueue.filter(r => this.getRequestOfficeStatus(r, 'Principal') === 'Rejected').length;
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

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRequests.length / this.pageSize));
  }

  get paginatedRequests(): ClearanceRequest[] {
    const safePage = Math.min(this.currentPage, this.totalPages);
    const start = (safePage - 1) * this.pageSize;
    return this.filteredRequests.slice(start, start + this.pageSize);
  }

  get departmentBreakdown(): PrincipalBreakdownStat[] {
    const map = new Map<string, { total: number; approved: number; pending: number; rejected: number }>();

    for (const req of this.collegeQueue) {
      const label = (req.department || '').trim() || 'Unspecified Department';
      const entry = map.get(label) || { total: 0, approved: 0, pending: 0, rejected: 0 };
      entry.total += 1;
      const st = this.getRequestOfficeStatus(req, 'Principal');
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

  get programmeBreakdown(): PrincipalBreakdownStat[] {
    const map = new Map<string, { total: number; approved: number; pending: number; rejected: number }>();

    for (const req of this.collegeQueue) {
      const label = (req.programme || '').trim() || 'Unspecified Programme';
      const entry = map.get(label) || { total: 0, approved: 0, pending: 0, rejected: 0 };
      entry.total += 1;
      const st = this.getRequestOfficeStatus(req, 'Principal');
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
    let list = [...this.collegeQueue];

    if (this.filterStatus === 'pending') {
      list = list.filter(r => this.getRequestOfficeStatus(r, 'Principal') === 'Pending');
    } else if (this.filterStatus === 'approved') {
      list = list.filter(r => this.getRequestOfficeStatus(r, 'Principal') === 'Approved');
    } else if (this.filterStatus === 'rejected') {
      list = list.filter(r => this.getRequestOfficeStatus(r, 'Principal') === 'Rejected');
    }

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(r =>
        this.getStudentName(r).toLowerCase().includes(term) ||
        this.getStudentRegNumber(r).toLowerCase().includes(term) ||
        (r.programme || '').toLowerCase().includes(term) ||
        (r.department || '').toLowerCase().includes(term)
      );
    }

    this.filteredRequests = list;
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
     STUDENT & APPROVAL HELPERS
  ========================= */

  getOfficeApproval(request: ClearanceRequest, office: string = 'Principal'): OfficeApproval | undefined {
    return request.approvals?.find(a => a.office === office);
  }

  getRequestOfficeStatus(request: ClearanceRequest, office: string = 'Principal'): 'Pending' | 'Approved' | 'Rejected' {
    return this.getOfficeApproval(request, office)?.status ?? 'Pending';
  }

  getRequestReviewer(request: ClearanceRequest): string {
    return this.getOfficeApproval(request, 'Principal')?.reviewedBy || 'Not reviewed yet';
  }

  getRequestReviewedAt(request: ClearanceRequest): string | null {
    return this.getOfficeApproval(request, 'Principal')?.reviewedAt || null;
  }

  getRequestComment(request: ClearanceRequest): string {
    return this.getOfficeApproval(request, 'Principal')?.comment || '';
  }

  getRejectionHistory(request: ClearanceRequest) {
    return request.rejectionHistory ?? [];
  }

  getStatusSummary(request: ClearanceRequest): string {
    const status = this.getRequestOfficeStatus(request, 'Principal');
    if (status === 'Approved') return `Endorsed by Principal (${this.collegeName}) — forwarded to Finance`;
    if (status === 'Rejected') return `Action required — returned by Principal for college follow-up`;
    return `Awaiting Principal collegiate endorsement (${this.collegeName})`;
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

  getStudentGender(request: ClearanceRequest): string {
    const gender = this.getStudentData(request.studentId)?.gender || (request as any).gender;
    return typeof gender === 'string' && gender.trim() ? gender.trim() : 'Not recorded';
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

  getStudentCollege(request: ClearanceRequest): string {
    if (request.college && request.college.trim()) return request.college.trim();
    const u = this.getStudentData(request.studentId);
    return u?.college?.trim() || u?.faculty?.trim() || '';
  }

  matchCollege(studentCollege: string, userCollege: string): boolean {
    if (!userCollege || !userCollege.trim()) return true;
    if (!studentCollege || !studentCollege.trim()) return true;

    const c1 = studentCollege.trim().toLowerCase();
    const c2 = userCollege.trim().toLowerCase();
    if (c1 === c2 || c1.includes(c2) || c2.includes(c1)) return true;

    const getAcronym = (s: string) => {
      const m = s.match(/\(([^)]+)\)/);
      return m ? m[1].trim().toLowerCase() : '';
    };

    const a1 = getAcronym(c1);
    const a2 = getAcronym(c2);
    if (a1 && (a1 === c2 || c2.includes(a1))) return true;
    if (a2 && (a2 === c1 || c1.includes(a2))) return true;
    if (a1 && a2 && a1 === a2) return true;

    return false;
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
     BULK SELECTION & ACTIONS
  ========================= */

  isSelectable(request: ClearanceRequest): boolean {
    return this.getRequestOfficeStatus(request, 'Principal') === 'Pending';
  }

  get selectableRequests(): ClearanceRequest[] {
    return this.paginatedRequests.filter(r => this.isSelectable(r));
  }

  get isAllSelected(): boolean {
    return this.selectableRequests.length > 0 && this.selectableRequests.every(r => this.selectedRequestIds.has(r.id));
  }

  toggleSelectAll(): void {
    if (this.isAllSelected) {
      this.selectableRequests.forEach(r => this.selectedRequestIds.delete(r.id));
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
    const eligibleIds = new Set(this.filteredRequests.filter(r => this.isSelectable(r)).map(r => r.id));
    const requestIds = [...this.selectedRequestIds].filter(id => eligibleIds.has(id));
    if (!requestIds.length || this.isProcessingBulk) return;

    if (!confirm(`Endorse Principal clearance for ${requestIds.length} selected student(s) and forward them to Finance?`)) {
      return;
    }

    this.isProcessingBulk = true;
    this.clearanceService.bulkApproveOfficeBackend(requestIds, 'Principal', 'Bulk approved by Principal').subscribe({
      next: (res) => {
        this.isProcessingBulk = false;
        this.selectedRequestIds.clear();
        this.toastService.success('Bulk Approved', res?.message || `Approved ${requestIds.length} student(s).`);
        this.loadRequests(false);
      },
      error: (err) => {
        this.isProcessingBulk = false;
        this.toastService.error('Bulk Approval Failed', err?.error?.message || err?.message || 'Unable to approve selected requests.');
      }
    });
  }

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
    this.detailsRequest = null;
    this.selectedRequest = request;
    this.rejectionComment = '';
    this.message = '';
  }

  closeRejectModal(): void {
    if (this.isSubmitting) return;
    this.selectedRequest = null;
    this.rejectionComment = '';
  }

  async approve(request: ClearanceRequest): Promise<void> {
    if (this.isSubmitting) return;
    const staff = this.currentUser;
    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }

    this.isSubmitting = true;
    const studentName = this.getStudentName(request);
    try {
      const ok = await this.clearanceService.approveRequest(request.id, 'Principal', staff.fullName || 'Principal');
      if (!ok) {
        this.messageState = 'error';
        this.message = 'Principal approval could not be completed. Refresh the dashboard and try again.';
        this.toastService.error('Approval Failed', this.message);
        return;
      }

      this.detailsRequest = null;
      this.selectedRequestIds.delete(request.id);
      this.messageState = 'success';
      this.message = `Principal clearance approved for ${studentName}. Forwarded to Finance.`;
      this.toastService.success('Approved', `${studentName} endorsed and forwarded to Finance.`);
      this.syncLocalRequests();
    } finally {
      this.isSubmitting = false;
    }
  }

  async reject(): Promise<void> {
    if (!this.selectedRequest || this.isSubmitting) return;
    const staff = this.currentUser;
    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }

    const trimmed = this.rejectionComment.trim();
    if (trimmed.length < 5) {
      this.toastService.warning('Comment Too Short', 'Please provide a clear rejection reason (at least 5 characters).');
      return;
    }

    const target = this.selectedRequest;
    const studentName = this.getStudentName(target);
    this.isSubmitting = true;
    try {
      const ok = await this.clearanceService.rejectRequest(
        target.id,
        'Principal',
        staff.fullName || 'Principal',
        trimmed
      );
      if (!ok) {
        this.toastService.error('Reject Failed', 'Failed to return clearance request.');
        return;
      }

      this.selectedRequestIds.delete(target.id);
      this.selectedRequest = null;
      this.rejectionComment = '';
      this.messageState = 'success';
      this.message = `Principal clearance returned for ${studentName}. Student has been notified.`;
      this.toastService.warning('Returned', `${studentName} was notified of the required college action.`);
      this.syncLocalRequests();
    } finally {
      this.isSubmitting = false;
    }
  }

  async withdrawDecision(request: ClearanceRequest): Promise<void> {
    if (this.isSubmitting) return;
    if (!confirm(`Withdraw Principal decision for ${this.getStudentName(request)}? The request will return to Pending.`)) {
      return;
    }

    this.isSubmitting = true;
    try {
      const ok = await this.clearanceService.withdrawOfficeDecision(request.id, 'Principal');
      if (!ok) {
        this.toastService.error('Withdraw Failed', 'This Principal decision could not be withdrawn (Finance may have already acted).');
        return;
      }

      this.selectedRequestIds.delete(request.id);
      this.messageState = 'success';
      this.message = `Principal decision withdrawn for ${this.getStudentName(request)}.`;
      this.toastService.info('Decision Withdrawn', 'The request is pending Principal review again.');
      this.loadRequests(false);
    } finally {
      this.isSubmitting = false;
    }
  }

  downloadAnalyticsCsv(): void {
    const rows: string[][] = [
      ['UDSM COLLEGE PRINCIPAL CLEARANCE ANALYTICS REPORT'],
      ['College / School', this.collegeName],
      ['Generated On', new Date().toLocaleString()],
      [],
      ['EXECUTIVE SUMMARY'],
      ['Metric', 'Value'],
      ['Total Requests', String(this.totalRequestCount)],
      ['Pending Review', String(this.pendingRequestCount)],
      ['Approved', String(this.approvedRequestCount)],
      ['Rejected', String(this.rejectedRequestCount)],
      ['Clearance Rate', `${this.clearanceRatePercent}%`],
      [],
      ['DEPARTMENTAL BREAKDOWN'],
      ['Department', 'Total', 'Approved', 'Pending', 'Rejected', 'Clearance Rate %'],
      ...this.departmentBreakdown.map(d => [
        d.label, String(d.total), String(d.approved), String(d.pending), String(d.rejected), `${d.clearanceRate}%`
      ]),
      [],
      ['PROGRAMME BREAKDOWN'],
      ['Programme', 'Total', 'Approved', 'Pending', 'Rejected', 'Clearance Rate %'],
      ...this.programmeBreakdown.map(p => [
        p.label, String(p.total), String(p.approved), String(p.pending), String(p.rejected), `${p.clearanceRate}%`
      ])
    ];

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `principal-${this.collegeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toastService.success('Export Ready', 'College clearance report downloaded as CSV.');
  }

  printAnalyticsReport(): void {
    window.print();
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
