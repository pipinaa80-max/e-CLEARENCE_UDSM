// src/app/dashboard/games_coach/games_coach.ts
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

export interface SportsFacilityGuide {
  id: string;
  name: string;
  category: string;
  location: string;
  sports: string[];
  description: string;
}

export interface CollegeGamesStat {
  college: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  clearanceRate: number;
}

const UDSM_SPORTS_FACILITIES: SportsFacilityGuide[] = [
  {
    id: 'main-stadium',
    name: 'University Sports Complex & Stadium',
    category: 'Outdoor Stadium',
    location: 'Main Campus East Wing',
    sports: ['Football', 'Track & Field', 'Rugby', 'Athletics'],
    description: 'Primary university outdoor stadium for inter-college tournaments, athletics equipment issue, and kit returns.'
  },
  {
    id: 'indoor-arena',
    name: 'Indoor Basketball & Volleyball Arena',
    category: 'Indoor Courts',
    location: 'Sports Zone Block C',
    sports: ['Basketball', 'Volleyball', 'Netball'],
    description: 'Indoor multi-court venue managing team jerseys, match balls, and training gear check-in.'
  },
  {
    id: 'fitness-centre',
    name: 'Mlimani Fitness Centre & Gymnasium',
    category: 'Fitness & Gym',
    location: 'Near Student Center',
    sports: ['Weightlifting', 'Aerobics', 'Table Tennis'],
    description: 'University fitness and strength facility verifying locker key returns and borrowed training accessories.'
  },
  {
    id: 'tennis-courts',
    name: 'University Tennis & Racket Courts',
    category: 'Racket Sports',
    location: 'Lower Campus Grounds',
    sports: ['Lawn Tennis', 'Badminton', 'Squash'],
    description: 'All-weather racket courts handling borrowed rackets, nets, and match equipment clearance.'
  },
  {
    id: 'aquatic-centre',
    name: 'Swimming & Aquatic Sports Centre',
    category: 'Aquatics',
    location: 'North Sports Precinct',
    sports: ['Swimming', 'Lifesaving', 'Water Polo'],
    description: 'University aquatic complex verifying swimming access passes and lifesaving equipment returns.'
  }
];

@Component({
  selector: 'app-games-coach',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent, ParallelOfficeRequestTableComponent],
  templateUrl: './games_coach.html',
  styleUrl: './games_coach.css'
})
export class GamesCoachComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  sidebarOpen = false;
  viewMode: 'requests' | 'analytics' | 'facilities' = 'requests';

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

  readonly facilities: SportsFacilityGuide[] = UDSM_SPORTS_FACILITIES;
  facilitySearchTerm = '';

  private readonly studentCache = new Map<string, any>();

  ngOnInit(): void {
    const initialTab = this.route.snapshot.queryParamMap.get('tab');
    if (initialTab && ['requests', 'analytics', 'facilities'].includes(initialTab)) {
      this.viewMode = initialTab as any;
    }
    this.loadRequests();
  }

  loadRequests(showToast = false): void {
    this.isLoading = true;
    this.clearanceService.fetchOfficeRequests('Games Coach').subscribe({
      next: () => {
        this.isLoading = false;
        this.clampPage();
        if (showToast) {
          this.toastService.success('Refreshed', 'Games Coach clearance queue updated.');
        }
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Unable to load Games Coach clearance requests.';
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
    return this.clearanceService.getRequestsForOffice('Games Coach');
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

  get filteredRequests(): ClearanceRequest[] {
    let list = this.requests;

    if (this.filterStatus !== 'All') {
      list = list.filter(r => this.getRequestOfficeStatus(r) === this.filterStatus);
    }

    const s = this.searchTerm.trim().toLowerCase();
    if (s) {
      list = list.filter(r =>
        this.getStudentName(r).toLowerCase().includes(s) ||
        this.getStudentRegNumber(r).toLowerCase().includes(s) ||
        this.getStudentProgramme(r).toLowerCase().includes(s) ||
        this.getStudentCollege(r).toLowerCase().includes(s) ||
        this.getStudentDepartment(r).toLowerCase().includes(s)
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

  get filteredFacilities(): SportsFacilityGuide[] {
    const s = this.facilitySearchTerm.trim().toLowerCase();
    if (!s) return this.facilities;
    return this.facilities.filter(f =>
      f.name.toLowerCase().includes(s) ||
      f.category.toLowerCase().includes(s) ||
      f.location.toLowerCase().includes(s) ||
      f.sports.some(sp => sp.toLowerCase().includes(s))
    );
  }

  get collegeBreakdown(): CollegeGamesStat[] {
    const map = new Map<string, { college: string; total: number; approved: number; pending: number; rejected: number }>();
    for (const req of this.requests) {
      const college = this.getStudentCollege(req) !== '—' ? this.getStudentCollege(req) : 'Unassigned College';
      const rec = map.get(college) || { college, total: 0, approved: 0, pending: 0, rejected: 0 };
      rec.total += 1;
      const st = this.getRequestOfficeStatus(req);
      if (st === 'Approved') rec.approved += 1;
      else if (st === 'Rejected') rec.rejected += 1;
      else rec.pending += 1;
      map.set(college, rec);
    }

    return Array.from(map.values())
      .map(rec => ({
        ...rec,
        clearanceRate: rec.total > 0 ? Math.round((rec.approved / rec.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }

  setViewMode(mode: 'requests' | 'analytics' | 'facilities'): void {
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
    if (this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
    }
  }

  getGamesApproval(request: ClearanceRequest): OfficeApproval | undefined {
    return request.approvals.find(a => a.office === 'Games Coach');
  }

  getRequestOfficeStatus(request: ClearanceRequest, office: string = 'Games Coach'): string {
    return request.approvals.find(a => a.office === office)?.status ?? 'Pending';
  }

  getKitStatusSummary(request: ClearanceRequest): string {
    const status = this.getRequestOfficeStatus(request);
    if (status === 'Approved') return 'Sports Equipment & Kits Cleared';
    if (status === 'Rejected') return 'Action Required · Returned to Student';
    return 'Awaiting Sports Equipment & Kit Verification';
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
      const ok = await this.clearanceService.approveRequest(request.id, 'Games Coach', staff.fullName);
      if (!ok) {
        this.messageState = 'error';
        this.message = 'Games Coach approval could not be completed. Refresh the dashboard and try again.';
        this.toastService.error('Approval Failed', this.message);
        return;
      }

      this.notificationService.createNotification(
        request.studentId,
        'Games Coach clearance approved',
        'The Games Coach has verified sports equipment returns and approved your clearance.',
        'success'
      );
      this.toastService.success('Approved', `Games Coach clearance approved for ${studentName}.`);
      this.messageState = 'success';
      this.message = `Games Coach clearance approved for ${studentName}.`;
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
      const ok = await this.clearanceService.rejectRequest(target.id, 'Games Coach', staff.fullName, reason);
      if (!ok) {
        this.messageState = 'error';
        this.message = 'Games Coach return could not be processed. Refresh the dashboard and try again.';
        this.toastService.error('Return Failed', this.message);
        return;
      }

      this.notificationService.createNotification(
        target.studentId,
        'Games Coach action required',
        reason,
        'warning'
      );
      this.toastService.warning('Returned', `Games Coach clearance returned for ${studentName}.`);
      this.messageState = 'success';
      this.message = `Request returned to ${studentName} with sports kit feedback.`;
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
      ['UNIVERSITY OF DAR ES SALAAM - GAMES COACH CLEARANCE REPORT'],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['SUMMARY METRICS'],
      ['Total Requests', String(this.totalRequestCount)],
      ['Approved', String(this.approvedRequestCount)],
      ['Pending', String(this.pendingRequestCount)],
      ['Rejected', String(this.rejectedRequestCount)],
      ['Clearance Rate', `${this.clearanceRatePercent}%`],
      [],
      ['BREAKDOWN BY COLLEGE'],
      ['College', 'Total', 'Approved', 'Pending', 'Rejected', 'Clearance Rate %'],
      ...this.collegeBreakdown.map(c => [
        c.college,
        String(c.total),
        String(c.approved),
        String(c.pending),
        String(c.rejected),
        `${c.clearanceRate}%`
      ])
    ];

    const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `games-coach-clearance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toastService.success('Exported', 'Games Coach clearance report downloaded as CSV.');
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
