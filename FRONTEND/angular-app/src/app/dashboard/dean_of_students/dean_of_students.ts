// src/app/dashboard/dean_of_students/dean_of_students.ts
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
import { ParallelOfficeRequestTableComponent } from '../../shared/components/parallel-office-request-table/parallel-office-request-table';

export interface DeanBreakdownStat {
  label: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  clearanceRate: number;
}

@Component({
  selector: 'app-dean-of-students',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent, ParallelOfficeRequestTableComponent],
  templateUrl: './dean_of_students.html',
  styleUrl: './dean_of_students.css'
})
export class DeanOfStudentsComponent implements OnInit {
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

  selectedRequest: ClearanceRequest | null = null;
  viewingRequest: ClearanceRequest | null = null;
  enlargedPhotoUrl: string | null = null;

  rejectionComment = '';
  message = '';
  messageState: 'success' | 'error' = 'success';

  searchTerm = '';
  filterStatus: 'All' | 'Pending' | 'Approved' | 'Rejected' = 'Pending';
  currentPage = 1;
  pageSize = 15;

  private readonly studentCache = new Map<string, any>();

  ngOnInit(): void {
    const initialTab = this.route.snapshot.queryParamMap.get('tab');
    if (initialTab && ['requests', 'analytics'].includes(initialTab)) {
      this.viewMode = initialTab as any;
    }
    this.loadRequests();
  }

  loadRequests(showToast = false): void {
    this.isLoading = true;
    this.clearanceService.fetchOfficeRequests('Dean of Students').subscribe({
      next: () => {
        this.isLoading = false;
        this.clampPage();
        if (showToast) {
          this.toastService.success('Refreshed', 'Dean of Students clearance queue updated.');
        }
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Unable to load Dean of Students clearance requests.';
        this.toastService.error('Load Failed', msg);
      }
    });
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get unreadNotifications(): number {
    return this.notificationService.unreadCount;
  }

  get requests(): ClearanceRequest[] {
    return this.clearanceService.getRequestsForOffice('Dean of Students');
  }

  get totalRequestCount(): number {
    return this.requests.length;
  }

  get pendingRequestCount(): number {
    return this.requests.filter(r => this.getRequestOfficeStatus(r) === 'Pending').length;
  }

  get approvedRequestCount(): number {
    return this.requests.filter(r => this.getRequestOfficeStatus(r) === 'Approved').length;
  }

  get rejectedRequestCount(): number {
    return this.requests.filter(r => this.getRequestOfficeStatus(r) === 'Rejected').length;
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

    if (this.filterStatus !== 'All') {
      list = list.filter(r => this.getRequestOfficeStatus(r) === this.filterStatus);
    }

    const q = this.searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        this.getStudentName(r).toLowerCase().includes(q) ||
        this.getStudentRegNumber(r).toLowerCase().includes(q) ||
        (r.programme || '').toLowerCase().includes(q) ||
        (r.college || '').toLowerCase().includes(q) ||
        (r.department || '').toLowerCase().includes(q)
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

  get collegeBreakdown(): DeanBreakdownStat[] {
    const map = new Map<string, { total: number; approved: number; pending: number; rejected: number }>();

    for (const req of this.requests) {
      const label = (req.college || '').trim() || 'Unspecified College';
      const entry = map.get(label) || { total: 0, approved: 0, pending: 0, rejected: 0 };
      entry.total += 1;
      const st = this.getRequestOfficeStatus(req);
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

  get programmeBreakdown(): DeanBreakdownStat[] {
    const map = new Map<string, { total: number; approved: number; pending: number; rejected: number }>();

    for (const req of this.requests) {
      const label = (req.programme || '').trim() || 'Unspecified Programme';
      const entry = map.get(label) || { total: 0, approved: 0, pending: 0, rejected: 0 };
      entry.total += 1;
      const st = this.getRequestOfficeStatus(req);
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

  filterByCard(status: 'All' | 'Pending' | 'Approved' | 'Rejected'): void {
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
     STUDENT & APPROVAL HELPERS
  ========================= */

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

  getStudentRegNumber(request: ClearanceRequest): string {
    return request.registrationNumber || request.studentId;
  }

  getStudentGender(request: ClearanceRequest): string {
    const gender = this.getStudentData(request.studentId)?.gender || (request as any).gender;
    return typeof gender === 'string' && gender.trim() ? gender.trim() : 'Not recorded';
  }

  getStudentPhone(request: ClearanceRequest): string {
    if (request.phoneNumber?.trim()) return request.phoneNumber.trim();
    const u = this.getStudentData(request.studentId);
    return u?.phone || u?.phoneNumber || 'Not provided';
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

  getOfficeApproval(request: ClearanceRequest, office: string = 'Dean of Students'): OfficeApproval | undefined {
    return Array.isArray(request?.approvals)
      ? request.approvals.find(a => a?.office === office)
      : undefined;
  }

  getRequestOfficeStatus(request: ClearanceRequest, office: string = 'Dean of Students'): 'Pending' | 'Approved' | 'Rejected' {
    return this.getOfficeApproval(request, office)?.status || 'Pending';
  }

  getRequestReviewer(request: ClearanceRequest): string {
    return this.getOfficeApproval(request)?.reviewedBy || 'Not reviewed yet';
  }

  getRequestReviewedAt(request: ClearanceRequest): string | null {
    return this.getOfficeApproval(request)?.reviewedAt || null;
  }

  getRequestComment(request: ClearanceRequest): string {
    return this.getOfficeApproval(request)?.comment || '';
  }

  getStatusSummary(request: ClearanceRequest): string {
    const status = this.getRequestOfficeStatus(request);
    if (status === 'Approved') return 'Cleared by Dean of Students — student welfare & discipline verified';
    if (status === 'Rejected') return 'Action required — welfare, disciplinary, or loan board issue flagged';
    return 'Awaiting Dean of Students welfare and disciplinary clearance verification';
  }

  /* =========================
     MODALS & ACTIONS
  ========================= */

  openStudentDetails(request: ClearanceRequest): void {
    this.viewingRequest = request;
  }

  closeStudentDetails(): void {
    this.viewingRequest = null;
  }

  openPhotoLightbox(url: string | null): void {
    if (url) this.enlargedPhotoUrl = url;
  }

  closePhotoLightbox(): void {
    this.enlargedPhotoUrl = null;
  }

  openRejectModal(request: ClearanceRequest): void {
    this.viewingRequest = null;
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
      const ok = await this.clearanceService.approveRequest(
        request.id,
        'Dean of Students',
        staff.fullName || 'Dean of Students'
      );
      if (!ok) {
        this.messageState = 'error';
        this.message = 'Dean of Students approval could not be completed. Refresh the dashboard and try again.';
        this.toastService.error('Approval Failed', this.message);
        return;
      }

      this.viewingRequest = null;
      this.messageState = 'success';
      this.message = `Dean of Students clearance approved for ${studentName} (${this.getStudentRegNumber(request)}).`;
      this.toastService.success('Approved', `${studentName} has been cleared by the Dean of Students.`);
      this.clampPage();
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
      this.messageState = 'error';
      this.message = 'Please enter a clear rejection reason (at least 5 characters).';
      return;
    }

    const target = this.selectedRequest;
    const studentName = this.getStudentName(target);
    this.isSubmitting = true;
    try {
      const ok = await this.clearanceService.rejectRequest(
        target.id,
        'Dean of Students',
        staff.fullName || 'Dean of Students',
        trimmed
      );
      if (!ok) {
        this.messageState = 'error';
        this.message = 'Dean of Students return could not be processed. Refresh the dashboard and try again.';
        this.toastService.error('Rejection Failed', this.message);
        return;
      }

      this.selectedRequest = null;
      this.rejectionComment = '';
      this.messageState = 'success';
      this.message = `Dean of Students clearance returned for ${studentName}. Student has been notified.`;
      this.toastService.warning('Rejected', `${studentName} was flagged for Dean of Students follow-up.`);
      this.clampPage();
    } finally {
      this.isSubmitting = false;
    }
  }

  onTableMutated(): void {
    this.studentCache.clear();
    this.loadRequests();
  }

  downloadAnalyticsCsv(): void {
    const rows: string[][] = [
      ['UNIVERSITY OF DAR ES SALAAM - DEAN OF STUDENTS CLEARANCE REPORT'],
      [`Generated On: ${new Date().toLocaleString()}`],
      [],
      ['SUMMARY METRICS'],
      ['Metric', 'Value'],
      ['Total Requests', String(this.totalRequestCount)],
      ['Pending Review', String(this.pendingRequestCount)],
      ['Approved', String(this.approvedRequestCount)],
      ['Rejected', String(this.rejectedRequestCount)],
      ['Clearance Rate', `${this.clearanceRatePercent}%`],
      [],
      ['COLLEGE BREAKDOWN'],
      ['College', 'Total', 'Approved', 'Pending', 'Rejected', 'Clearance Rate %'],
      ...this.collegeBreakdown.map(item => [
        item.label,
        String(item.total),
        String(item.approved),
        String(item.pending),
        String(item.rejected),
        `${item.clearanceRate}%`
      ]),
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
    link.download = `dean-of-students-clearance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toastService.success('Export Ready', 'Dean of Students clearance report downloaded as CSV.');
  }

  printAnalyticsReport(): void {
    window.print();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
