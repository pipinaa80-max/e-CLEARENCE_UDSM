// src/app/dashboard/usab/usab.ts
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

export interface UsabBreakdownStat {
  label: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  clearanceRate: number;
}

@Component({
  selector: 'app-usab',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent, ParallelOfficeRequestTableComponent],
  templateUrl: './usab.html',
  styleUrl: './usab-dashboard.css'
})
export class UsabComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly hostelService = inject(HostelService);
  private readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  sidebarOpen = false;
  viewMode: 'requests' | 'analytics' | 'hostels' = 'requests';

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

  // Hostel Directory Management (shared HostelService)
  hostels: HostelDetail[] = [];
  hostelSearchTerm = '';
  showHostelModal = false;
  isEditingHostel = false;
  hostelForm: HostelDetail = this.createEmptyHostel();
  hostelBlocksInput = '';
  hostelWingsInput = '';

  private readonly studentCache = new Map<string, any>();

  ngOnInit(): void {
    const initialTab = this.route.snapshot.queryParamMap.get('tab');
    if (initialTab && ['requests', 'analytics', 'hostels'].includes(initialTab)) {
      this.viewMode = initialTab as any;
    }
    this.loadHostels();
    this.loadRequests();
  }

  loadRequests(showToast = false): void {
    this.isLoading = true;
    this.clearanceService.fetchOfficeRequests('USAB').subscribe({
      next: () => {
        this.isLoading = false;
        this.clampPage();
        if (showToast) {
          this.toastService.success('Refreshed', 'USAB clearance queue updated.');
        }
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Unable to load USAB clearance requests.';
        this.toastService.error('Load Failed', msg);
      }
    });
  }

  loadHostels(): void {
    this.hostels = this.hostelService.getHostelsSnapshot();
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get unreadNotifications(): number {
    return this.notificationService.unreadCount;
  }

  get requests(): ClearanceRequest[] {
    return this.clearanceService.getRequestsForOffice('USAB');
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

  get pendingPercent(): number {
    if (!this.totalRequestCount) return 0;
    return Math.round((this.pendingRequestCount / this.totalRequestCount) * 100);
  }

  get rejectedPercent(): number {
    if (!this.totalRequestCount) return 0;
    return Math.round((this.rejectedRequestCount / this.totalRequestCount) * 100);
  }

  get filteredRequests(): ClearanceRequest[] {
    let result = this.requests;

    if (this.filterStatus !== 'All') {
      result = result.filter(r => this.getRequestOfficeStatus(r) === this.filterStatus);
    }

    if (this.residenceFilter === 'On-Campus') {
      result = result.filter(r => !this.isOffCampus(r));
    } else if (this.residenceFilter === 'Off-Campus') {
      result = result.filter(r => this.isOffCampus(r));
    }

    const q = this.searchTerm.trim().toLowerCase();
    if (q) {
      result = result.filter(r =>
        (r.studentName || '').toLowerCase().includes(q) ||
        (r.registrationNumber || '').toLowerCase().includes(q) ||
        (r.programme || '').toLowerCase().includes(q) ||
        (r.college || '').toLowerCase().includes(q) ||
        this.getStudentHall(r).toLowerCase().includes(q) ||
        this.getStudentRoom(r).toLowerCase().includes(q)
      );
    }

    return result;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRequests.length / this.pageSize));
  }

  get paginatedRequests(): ClearanceRequest[] {
    const safePage = Math.min(this.currentPage, this.totalPages);
    const start = (safePage - 1) * this.pageSize;
    return this.filteredRequests.slice(start, start + this.pageSize);
  }

  get residenceBreakdown(): UsabBreakdownStat[] {
    const map = new Map<string, { total: number; approved: number; pending: number; rejected: number }>();

    for (const req of this.requests) {
      const label = this.isOffCampus(req)
        ? 'Off-Campus / Private Residence'
        : this.getStudentHall(req);

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

  get collegeBreakdown(): UsabBreakdownStat[] {
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

  get filteredHostels(): HostelDetail[] {
    const q = this.hostelSearchTerm.trim().toLowerCase();
    if (!q) return this.hostels;
    return this.hostels.filter(h =>
      (h.name || '').toLowerCase().includes(q) ||
      (h.location || '').toLowerCase().includes(q) ||
      (h.wardenName || '').toLowerCase().includes(q) ||
      (h.description || '').toLowerCase().includes(q)
    );
  }

  get totalHostelCapacity(): number {
    return this.hostels.reduce((sum, h) => sum + (Number(h.capacity) || 0), 0);
  }

  setViewMode(mode: 'requests' | 'analytics' | 'hostels'): void {
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
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
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
     STUDENT & RESIDENCE HELPERS
  ========================= */

  private getStudentProfile(request: ClearanceRequest): any {
    const key = request.studentId || request.registrationNumber || request.id;
    if (this.studentCache.has(key)) {
      return this.studentCache.get(key);
    }

    try {
      const raw = localStorage.getItem('udsm-local-users');
      if (raw) {
        const users = JSON.parse(raw);
        if (Array.isArray(users)) {
          const match = users.find((u: any) =>
            (request.studentId && u.id === request.studentId) ||
            (request.registrationNumber && u.registrationNumber === request.registrationNumber)
          ) || null;
          this.studentCache.set(key, match);
          return match;
        }
      }
    } catch {
      // Ignore storage access errors
    }

    this.studentCache.set(key, null);
    return null;
  }

  isOffCampus(request: ClearanceRequest): boolean {
    const type = (request.residenceType || '').trim().toLowerCase();
    if (type.includes('off') || type.includes('private') || type.includes('non')) {
      return true;
    }
    if (type.includes('hostel') || type.includes('hall') || type.includes('campus')) {
      return false;
    }
    const rawHall = (request.hall || this.getStudentProfile(request)?.hall || '').trim().toLowerCase();
    if (!rawHall || rawHall.includes('off campus') || rawHall === 'off-campus' || rawHall === 'none') {
      return true;
    }
    return false;
  }

  getResidenceLabel(request: ClearanceRequest): string {
    return this.isOffCampus(request) ? 'Off-Campus / Private Residence' : 'On-Campus Hostel Resident';
  }

  getStudentHall(request: ClearanceRequest): string {
    if (this.isOffCampus(request)) return 'Off-Campus (No University Hostel)';
    return request.hall || this.getStudentProfile(request)?.hall || 'On-Campus (Hall Not Specified)';
  }

  getStudentWing(request: ClearanceRequest): string {
    if (this.isOffCampus(request)) return 'N/A';
    return request.wing || this.getStudentProfile(request)?.wing || 'Not specified';
  }

  getStudentBlock(request: ClearanceRequest): string {
    if (this.isOffCampus(request)) return 'N/A';
    return request.block || this.getStudentProfile(request)?.block || 'Not specified';
  }

  getStudentRoom(request: ClearanceRequest): string {
    if (this.isOffCampus(request)) return 'N/A';
    return request.roomNumber || this.getStudentProfile(request)?.roomNumber || 'Not specified';
  }

  getResidenceEvidenceUrl(request: ClearanceRequest): string | null {
    const raw = (request.residenceEvidence || '').trim();
    if (!raw) return null;
    if (raw.startsWith('data:') || raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) {
      return raw;
    }
    return null;
  }

  viewResidenceEvidence(request: ClearanceRequest): void {
    const url = this.getResidenceEvidenceUrl(request);
    if (!url) {
      this.toastService.info('No Proof Attached', 'No residence evidence document was uploaded for this student.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  getStudentPhoto(request: ClearanceRequest): string | null {
    if (request.photo) {
      return this.authService.getProfilePhotoSource({ photo: request.photo });
    }
    const student = this.getStudentProfile(request);
    return student ? this.authService.getProfilePhotoSource(student) : null;
  }

  getStudentInitials(name?: string): string {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  getOfficeApproval(request: ClearanceRequest): OfficeApproval | undefined {
    return request.approvals?.find(a => a.office === 'USAB');
  }

  getRequestOfficeStatus(request: ClearanceRequest): 'Pending' | 'Approved' | 'Rejected' {
    return this.getOfficeApproval(request)?.status || 'Pending';
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

  /* =========================
     MODALS & CLEARANCE ACTIONS
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
    try {
      const ok = await this.clearanceService.approveRequest(request.id, 'USAB', staff.fullName || 'USAB Officer');
      if (!ok) {
        this.messageState = 'error';
        this.message = 'USAB approval could not be completed. Refresh the dashboard and try again.';
        this.toastService.error('Approval Failed', this.message);
        return;
      }

      this.viewingRequest = null;
      this.messageState = 'success';
      this.message = `USAB clearance approved for ${request.studentName} (${request.registrationNumber}).`;
      this.toastService.success('USAB Cleared', `${request.studentName} has been cleared by USAB.`);
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
    this.isSubmitting = true;
    try {
      const ok = await this.clearanceService.rejectRequest(target.id, 'USAB', staff.fullName || 'USAB Officer', trimmed);
      if (!ok) {
        this.messageState = 'error';
        this.message = 'USAB rejection could not be processed. Refresh the dashboard and try again.';
        this.toastService.error('Rejection Failed', this.message);
        return;
      }

      this.selectedRequest = null;
      this.rejectionComment = '';
      this.messageState = 'success';
      this.message = `USAB clearance rejected for ${target.studentName}. Student has been notified.`;
      this.toastService.warning('USAB Rejected', `${target.studentName} was flagged for accommodation follow-up.`);
      this.clampPage();
    } finally {
      this.isSubmitting = false;
    }
  }

  onBulkApproved(): void {
    this.loadRequests();
  }

  onWithdrawn(): void {
    this.loadRequests();
  }

  /* =========================
     HOSTEL DIRECTORY CRUD
  ========================= */

  private createEmptyHostel(): HostelDetail {
    return {
      id: '',
      name: '',
      location: 'Main Campus (Mlimani)',
      capacity: 0,
      hasBlocks: false,
      blocks: [],
      hasWings: false,
      wings: [],
      wardenName: '',
      wardenContact: '',
      description: ''
    };
  }

  openAddHostelModal(): void {
    this.isEditingHostel = false;
    this.hostelForm = this.createEmptyHostel();
    this.hostelBlocksInput = '';
    this.hostelWingsInput = '';
    this.showHostelModal = true;
  }

  openEditHostelModal(hostel: HostelDetail): void {
    this.isEditingHostel = true;
    this.hostelForm = {
      ...hostel,
      blocks: [...(hostel.blocks || [])],
      wings: [...(hostel.wings || [])]
    };
    this.hostelBlocksInput = (hostel.blocks || []).join(', ');
    this.hostelWingsInput = (hostel.wings || []).join(', ');
    this.showHostelModal = true;
  }

  closeHostelModal(): void {
    this.showHostelModal = false;
  }

  saveHostel(): void {
    if (!this.hostelForm.name.trim()) {
      this.toastService.warning('Validation Error', 'Hostel name is required.');
      return;
    }
    const blocks = this.hostelBlocksInput.split(',').map(s => s.trim()).filter(Boolean);
    const wings = this.hostelWingsInput.split(',').map(s => s.trim()).filter(Boolean);
    const payload: HostelDetail = {
      ...this.hostelForm,
      blocks,
      hasBlocks: blocks.length > 0,
      wings,
      hasWings: wings.length > 0
    };
    this.hostelService.saveHostel(payload);
    this.loadHostels();
    this.toastService.success(
      this.isEditingHostel ? 'Hostel Updated' : 'Hostel Added',
      `${payload.name} saved to the local USAB hostel directory.`
    );
    this.closeHostelModal();
  }

  deleteHostel(hostel: HostelDetail): void {
    if (confirm(`Remove "${hostel.name}" from the local USAB hostel directory?`)) {
      this.hostelService.deleteHostel(hostel.id);
      this.loadHostels();
      this.toastService.info('Hostel Removed', `${hostel.name} was removed from the directory.`);
    }
  }

  /* =========================
     CSV EXPORT & LOGOUT
  ========================= */

  downloadAnalyticsCsv(): void {
    const rows: string[][] = [
      ['UNIVERSITY OF DAR ES SALAAM - USAB CLEARANCE REPORT'],
      [`Generated On: ${new Date().toLocaleString()}`],
      [],
      ['SUMMARY METRICS'],
      ['Metric', 'Value'],
      ['Total Requests', String(this.totalRequestCount)],
      ['Pending Review', String(this.pendingRequestCount)],
      ['Approved', String(this.approvedRequestCount)],
      ['Rejected', String(this.rejectedRequestCount)],
      ['On-Campus Residents', String(this.onCampusCount)],
      ['Off-Campus Students', String(this.offCampusCount)],
      ['Clearance Rate', `${this.clearanceRatePercent}%`],
      [],
      ['RESIDENCE / HALL BREAKDOWN'],
      ['Residence / Hall', 'Total', 'Approved', 'Pending', 'Rejected', 'Clearance Rate %'],
      ...this.residenceBreakdown.map(item => [
        item.label,
        String(item.total),
        String(item.approved),
        String(item.pending),
        String(item.rejected),
        `${item.clearanceRate}%`
      ]),
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
      ])
    ];

    const csv = rows
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usab-clearance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toastService.success('Export Ready', 'USAB clearance report downloaded as CSV.');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
