// src/app/dashboard/hall_warden/hall_warden.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { HostelDetail, HostelService } from '../../core/services/hostel.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { ClearanceRequest, OfficeApproval } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { ParallelOfficeRequestTableComponent } from '../../shared/components/parallel-office-request-table/parallel-office-request-table';

export interface HallBreakdownStat {
  residence: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  clearanceRate: number;
}

@Component({
  selector: 'app-hall-warden',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent, ParallelOfficeRequestTableComponent],
  templateUrl: './hall_warden.html',
  styleUrl: './hall_warden.css'
})
export class HallWardenComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly hostelService = inject(HostelService);
  private readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  sidebarOpen = false;
  viewMode: 'requests' | 'analytics' | 'halls' = 'requests';

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
  residenceFilter: 'All' | 'On-Campus' | 'Off-Campus' = 'All';
  currentPage = 1;
  pageSize = 15;

  halls: HostelDetail[] = [];
  hallSearchTerm = '';

  private readonly studentCache = new Map<string, any>();

  ngOnInit(): void {
    const initialTab = this.route.snapshot.queryParamMap.get('tab');
    if (initialTab && ['requests', 'analytics', 'halls'].includes(initialTab)) {
      this.viewMode = initialTab as any;
    }
    this.halls = this.hostelService.getHostelsSnapshot();
    this.loadRequests();
  }

  loadRequests(showToast = false): void {
    this.isLoading = true;
    this.clearanceService.fetchOfficeRequests('Hall Warden').subscribe({
      next: () => {
        this.isLoading = false;
        this.clampPage();
        if (showToast) {
          this.toastService.success('Refreshed', 'Hall Warden clearance queue updated.');
        }
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Unable to load Hall Warden clearance requests.';
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
    return this.clearanceService.getRequestsForOffice('Hall Warden');
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

  get onCampusCount(): number {
    return this.requests.filter(r => !this.isOffCampus(r)).length;
  }

  get offCampusCount(): number {
    return this.requests.filter(r => this.isOffCampus(r)).length;
  }

  get clearanceRatePercent(): number {
    if (!this.totalRequestCount) return 0;
    return Math.round((this.approvedRequestCount / this.totalRequestCount) * 100);
  }

  get filteredRequests(): ClearanceRequest[] {
    let list = this.requests;

    if (this.filterStatus !== 'All') {
      list = list.filter(r => this.getRequestOfficeStatus(r) === this.filterStatus);
    }

    if (this.residenceFilter === 'On-Campus') {
      list = list.filter(r => !this.isOffCampus(r));
    } else if (this.residenceFilter === 'Off-Campus') {
      list = list.filter(r => this.isOffCampus(r));
    }

    const s = this.searchTerm.trim().toLowerCase();
    if (s) {
      list = list.filter(r =>
        this.getStudentName(r).toLowerCase().includes(s) ||
        this.getStudentRegNumber(r).toLowerCase().includes(s) ||
        this.getStudentProgramme(r).toLowerCase().includes(s) ||
        this.getStudentCollege(r).toLowerCase().includes(s) ||
        this.getResidenceLabel(r).toLowerCase().includes(s)
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

  get filteredHalls(): HostelDetail[] {
    const s = this.hallSearchTerm.trim().toLowerCase();
    if (!s) return this.halls;
    return this.halls.filter(h =>
      h.name.toLowerCase().includes(s) ||
      (h.location || '').toLowerCase().includes(s) ||
      (h.blocks || []).some(b => b.toLowerCase().includes(s)) ||
      (h.wings || []).some(w => w.toLowerCase().includes(s))
    );
  }

  get residenceBreakdown(): HallBreakdownStat[] {
    const map = new Map<string, { residence: string; total: number; approved: number; pending: number; rejected: number }>();
    for (const req of this.requests) {
      const label = this.isOffCampus(req)
        ? 'Off-Campus / Non-Hostel'
        : this.getStudentHall(req);
      const rec = map.get(label) || { residence: label, total: 0, approved: 0, pending: 0, rejected: 0 };
      rec.total += 1;
      const st = this.getRequestOfficeStatus(req);
      if (st === 'Approved') rec.approved += 1;
      else if (st === 'Rejected') rec.rejected += 1;
      else rec.pending += 1;
      map.set(label, rec);
    }

    return Array.from(map.values())
      .map(rec => ({
        ...rec,
        clearanceRate: rec.total > 0 ? Math.round((rec.approved / rec.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }

  setViewMode(mode: 'requests' | 'analytics' | 'halls'): void {
    this.viewMode = mode;
    this.closeSidebar();
  }

  selectStatusFilter(status: 'All' | 'Pending' | 'Approved' | 'Rejected'): void {
    this.viewMode = 'requests';
    this.filterStatus = status;
    this.currentPage = 1;
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  onTableMutated(): void {
    this.clampPage();
  }

  private clampPage(): void {
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage -= 1;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage += 1;
  }

  getWardenApproval(request: ClearanceRequest): OfficeApproval | undefined {
    return request.approvals.find(a => a.office === 'Hall Warden');
  }

  getRequestOfficeStatus(request: ClearanceRequest, office: string = 'Hall Warden'): string {
    return request.approvals.find(a => a.office === office)?.status ?? 'Pending';
  }

  isOffCampus(request: ClearanceRequest): boolean {
    const type = (request.residenceType || '').trim().toLowerCase();
    const rawHall = (request.hall || this.getStudentData(request.studentId)?.hall || '').trim().toLowerCase();

    if (type.includes('off') || type.includes('non-hostel')) return true;
    if (rawHall.includes('off campus') || rawHall.includes('non-hostel')) return true;
    if (!rawHall && !type.includes('hostel')) return true;
    return false;
  }

  getResidenceLabel(request: ClearanceRequest): string {
    if (this.isOffCampus(request)) {
      return 'Off-Campus / Non-Hostel';
    }
    return this.getStudentHall(request);
  }

  getStudentHall(request: ClearanceRequest): string {
    if (this.isOffCampus(request)) return 'Off-Campus / Non-Hostel';
    const raw = (request.hall || this.getStudentData(request.studentId)?.hall || '').trim();
    return raw || 'Not specified';
  }

  getStudentWing(request: ClearanceRequest): string {
    if (this.isOffCampus(request)) return '—';
    const raw = (request.wing || this.getStudentData(request.studentId)?.wing || '').trim();
    return raw || '—';
  }

  getStudentBlock(request: ClearanceRequest): string {
    if (this.isOffCampus(request)) return '—';
    const raw = (request.block || this.getStudentData(request.studentId)?.block || '').trim();
    return raw || 'Not specified';
  }

  getStudentRoom(request: ClearanceRequest): string {
    if (this.isOffCampus(request)) return '—';
    const r = request.roomNumber ?? this.getStudentData(request.studentId)?.roomNumber;
    const cleaned = r !== undefined && r !== null ? String(r).trim() : '';
    return cleaned ? `Room ${cleaned}` : 'Not specified';
  }

  getKeyStatusSummary(request: ClearanceRequest): string {
    const status = this.getRequestOfficeStatus(request);
    if (status === 'Approved') {
      return this.isOffCampus(request)
        ? 'Off-Campus Residence Verified & Cleared'
        : 'Room Key Returned & Room Inspection Cleared';
    }
    if (status === 'Rejected') {
      return 'Action Required · Returned to Student';
    }
    return this.isOffCampus(request)
      ? 'Off-Campus Student · No University Room Key Required'
      : 'Awaiting Room Key Handover & Inspection Verification';
  }

  openResidenceEvidence(evidence?: string): void {
    if (!evidence) return;
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (win) {
      if (evidence.startsWith('data:image')) {
        win.document.write(`<img src="${evidence}" style="max-width:100%;height:auto;" alt="Residence proof" />`);
      } else {
        win.location.href = evidence;
      }
    }
  }

  private getStudentData(studentId: string): any | null {
    if (this.studentCache.has(studentId)) {
      return this.studentCache.get(studentId);
    }
    try {
      const usersJson = localStorage.getItem('udsm-local-users');
      if (usersJson) {
        const users = JSON.parse(usersJson);
        const user = Array.isArray(users) ? users.find((u: any) => u.id === studentId) : null;
        this.studentCache.set(studentId, user ?? null);
        return user ?? null;
      }
    } catch {
      // Ignore local storage errors
    }
    this.studentCache.set(studentId, null);
    return null;
  }

  getStudentName(request: ClearanceRequest): string {
    if (request.studentName) return request.studentName;
    const user = this.getStudentData(request.studentId);
    if (user) {
      return user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.registrationNumber || 'Student';
    }
    return request.registrationNumber || 'Student';
  }

  getStudentRegNumber(request: ClearanceRequest): string {
    return request.registrationNumber || request.studentId;
  }

  getStudentPhoto(request: ClearanceRequest): string | null {
    let photo = request.photo;
    if (!photo) {
      const user = this.getStudentData(request.studentId);
      photo = user?.photo || user?.profilePhoto || user?.profileImageUrl;
    }
    if (!photo) return null;
    if (photo.startsWith('data:image') || photo.startsWith('http') || photo.startsWith('/') || photo.startsWith('assets/')) {
      return photo;
    }
    return photo.length > 50 ? `data:image/jpeg;base64,${photo}` : photo;
  }

  getStudentInitials(request: ClearanceRequest): string {
    const name = this.getStudentName(request);
    const parts = name.split(/\s+/).filter(Boolean);
    if (!parts.length) return 'ST';
    return parts.slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('');
  }

  hasPhoto(request: ClearanceRequest): boolean {
    return !!this.getStudentPhoto(request);
  }

  openEnlargedPhoto(photoUrl: string | null): void {
    if (photoUrl) this.enlargedPhotoUrl = photoUrl;
  }

  closeEnlargedPhoto(): void {
    this.enlargedPhotoUrl = null;
  }

  openStudentDetailsModal(request: ClearanceRequest): void {
    this.viewingRequest = request;
  }

  closeStudentDetailsModal(): void {
    this.viewingRequest = null;
  }

  getStudentProgramme(request: ClearanceRequest): string {
    return request.programme || this.getStudentData(request.studentId)?.programme || '—';
  }

  getStudentDepartment(request: ClearanceRequest): string {
    return request.department || this.getStudentData(request.studentId)?.department || '—';
  }

  getStudentCollege(request: ClearanceRequest): string {
    return request.college || this.getStudentData(request.studentId)?.college || '—';
  }

  getStudentSponsor(request: ClearanceRequest): string {
    return request.sponsor || this.getStudentData(request.studentId)?.sponsor || '—';
  }

  getStudentEmail(request: ClearanceRequest): string {
    return request.email || this.getStudentData(request.studentId)?.email || '—';
  }

  getStudentPhone(request: ClearanceRequest): string {
    const u = this.getStudentData(request.studentId);
    return request.phoneNumber || u?.phoneNumber || u?.phone || '—';
  }

  async approve(request: ClearanceRequest): Promise<void> {
    if (this.isSubmitting) return;
    const staff = this.authService.getCurrentUser();
    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }

    this.isSubmitting = true;
    const studentName = this.getStudentName(request);
    try {
      const ok = await this.clearanceService.approveRequest(request.id, 'Hall Warden', staff.fullName);
      if (!ok) {
        this.messageState = 'error';
        this.message = 'Hall Warden approval could not be completed. Refresh the dashboard and try again.';
        this.toastService.error('Approval Failed', this.message);
        return;
      }

      this.notificationService.createNotification(
        request.studentId,
        'Hall Warden clearance approved',
        'The Hall Warden has verified your residence clearance and approved your request.',
        'success'
      );
      this.toastService.success('Approved', `Hall Warden clearance approved for ${studentName}.`);
      this.messageState = 'success';
      this.message = `Hall Warden clearance approved for ${studentName}.`;
      this.viewingRequest = null;
      this.clampPage();
      setTimeout(() => { this.message = ''; }, 4000);
    } finally {
      this.isSubmitting = false;
    }
  }

  openRejectForm(request: ClearanceRequest): void {
    this.selectedRequest = request;
    this.rejectionComment = '';
    this.message = '';
    this.messageState = 'success';
  }

  closeRejectForm(): void {
    this.selectedRequest = null;
    this.rejectionComment = '';
  }

  async reject(): Promise<void> {
    if (this.isSubmitting) return;
    const staff = this.authService.getCurrentUser();
    if (!staff || !this.selectedRequest) return;

    const reason = this.rejectionComment.trim();
    if (reason.length < 5) {
      this.toastService.warning('Comment Required', 'Enter a rejection reason of at least 5 characters.');
      return;
    }

    this.isSubmitting = true;
    const target = this.selectedRequest;
    const studentName = this.getStudentName(target);
    try {
      const ok = await this.clearanceService.rejectRequest(target.id, 'Hall Warden', staff.fullName, reason);
      if (!ok) {
        this.messageState = 'error';
        this.message = 'Hall Warden return could not be processed. Refresh the dashboard and try again.';
        this.toastService.error('Return Failed', this.message);
        return;
      }

      this.notificationService.createNotification(
        target.studentId,
        'Hall Warden action required',
        reason,
        'warning'
      );
      this.toastService.warning('Returned', `Hall Warden clearance returned for ${studentName}.`);
      this.messageState = 'success';
      this.message = `Request returned to ${studentName} with hall/room inspection feedback.`;
      this.closeRejectForm();
      this.viewingRequest = null;
      this.clampPage();
      setTimeout(() => { this.message = ''; }, 4000);
    } finally {
      this.isSubmitting = false;
    }
  }

  getStatusPercent(count: number): number {
    if (!this.totalRequestCount) return 0;
    return Math.round((count / this.totalRequestCount) * 100);
  }

  downloadAnalyticsCsv(): void {
    const rows = [
      ['UNIVERSITY OF DAR ES SALAAM - HALL WARDEN CLEARANCE REPORT'],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['SUMMARY METRICS'],
      ['Total Requests', String(this.totalRequestCount)],
      ['On-Campus Residents', String(this.onCampusCount)],
      ['Off-Campus Students', String(this.offCampusCount)],
      ['Approved', String(this.approvedRequestCount)],
      ['Pending', String(this.pendingRequestCount)],
      ['Rejected', String(this.rejectedRequestCount)],
      ['Clearance Rate', `${this.clearanceRatePercent}%`],
      [],
      ['BREAKDOWN BY RESIDENCE / HALL'],
      ['Residence / Hall', 'Total', 'Approved', 'Pending', 'Rejected', 'Clearance Rate %'],
      ...this.residenceBreakdown.map(r => [
        r.residence,
        String(r.total),
        String(r.approved),
        String(r.pending),
        String(r.rejected),
        `${r.clearanceRate}%`
      ])
    ];

    const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hall-warden-clearance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toastService.success('Exported', 'Hall Warden clearance report downloaded as CSV.');
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset['fallback']) {
      img.dataset['fallback'] = '1';
      img.src = '/udsm-logo.jpg';
    }
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
