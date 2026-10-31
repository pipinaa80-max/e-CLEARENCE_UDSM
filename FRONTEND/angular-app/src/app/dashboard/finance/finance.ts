import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ClearanceRequest } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './finance.html',
  styleUrl: './finance.css'
})
export class FinanceDashboard {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  viewMode: 'all' | 'requests' | 'analytics' = 'all';
  selectedRequest: ClearanceRequest | null = null;
  detailsRequest: ClearanceRequest | null = null;
  rejectionComment = '';
  message = '';

  readonly Math = Math;
  selectedAnalyticsYear: string = 'all';
  selectedAnalyticsGender: string = 'all';

  setViewMode(mode: 'all' | 'requests' | 'analytics'): void {
    this.viewMode = mode;
  }

  searchTerm = '';
  filterStatus = 'pending';

  // Pagination
  currentPage = 1;
  pageSize = 10;

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get isOfficer(): boolean {
    return this.currentUser?.role === 'Finance';
  }

  get studentRequest(): ClearanceRequest | null {
    const user = this.currentUser;
    if (!user || user.role !== 'Student') return null;
    const requests = this.clearanceService.getStudentRequests(user.id);
    return requests.at(-1) ?? null;
  }

  get requests(): ClearanceRequest[] {
    return this.clearanceService.getRequestsForOffice('Finance');
  }

  get pendingRequestCount(): number {
    return this.requests.filter(request =>
      this.getRequestOfficeStatus(request, 'Finance') === 'Pending'
    ).length;
  }

  get filteredRequests(): ClearanceRequest[] {
    let list = this.requests;

    if (this.searchTerm.trim()) {
      const s = this.searchTerm.toLowerCase();
      list = list.filter(r =>
        (r.studentName || '').toLowerCase().includes(s) ||
        (r.registrationNumber || '').toLowerCase().includes(s) ||
        r.programme.toLowerCase().includes(s)
      );
    }

    if (this.filterStatus === 'pending') {
      list = list.filter(r => this.getRequestOfficeStatus(r, 'Finance') === 'Pending');
    } else if (this.filterStatus === 'approved') {
      list = list.filter(r => this.getRequestOfficeStatus(r, 'Finance') === 'Approved');
    } else if (this.filterStatus === 'rejected') {
      list = list.filter(r => this.getRequestOfficeStatus(r, 'Finance') === 'Rejected');
    }

    return list;
  }

  get paginatedRequests(): ClearanceRequest[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRequests.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRequests.length / this.pageSize) || 1;
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

  getOfficeStatus(office: string): string {
    const request = this.studentRequest;
    if (!request) return 'Pending';
    const approval = request.approvals.find(a => a.office === office);
    return approval?.status ?? 'Pending';
  }

  getRequestOfficeStatus(request: ClearanceRequest, office: string): string {
    return request.approvals.find(approval => approval.office === office)?.status ?? 'Pending';
  }

  getRejectionReason(office: string): string {
    const request = this.studentRequest;
    if (!request) return '';
    const approval = request.approvals.find(a => a.office === office);
    return approval?.comment ?? '';
  }

  approve(request: ClearanceRequest): void {
    const staff = this.currentUser;

    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }

    this.clearanceService.approveRequest(
      request.id,
      'Finance',
      staff.fullName
    );

    this.notificationService.createNotification(
      request.studentId,
      'Clearance completed',
      'Finance has approved your application. Your graduation clearance is now complete.',
      'success'
    );

    this.message = 'Clearance completed successfully.';
  }

  openRejectForm(request: ClearanceRequest): void {
    this.selectedRequest = request;
    this.rejectionComment = '';
    this.message = '';
  }

  reject(): void {
    const staff = this.currentUser;

    if (!staff || !this.selectedRequest || !this.rejectionComment.trim()) {
      return;
    }

    this.clearanceService.rejectRequest(
      this.selectedRequest.id,
      'Finance',
      staff.fullName,
      this.rejectionComment
    );

    this.notificationService.createNotification(
      this.selectedRequest.studentId,
      'Finance action required',
      this.rejectionComment,
      'warning'
    );

    this.message = 'The student has been notified about the required action.';
    this.selectedRequest = null;
    this.rejectionComment = '';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // =====================================================
  // STUDENT DATA UTILS
  // =====================================================

  private studentCache: Map<string, any> = new Map();

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

  getStudentListName(request: ClearanceRequest): string {
    const user = this.getStudentData(request.studentId);
    const firstName = user?.firstName?.trim();
    const middleName = user?.middleName?.trim();
    const lastName = user?.lastName?.trim();
    if (firstName && lastName) return `${lastName}, ${[firstName, middleName].filter(Boolean).join(' ')}`.toUpperCase();
    const fullName = (request.studentName || user?.fullName || '').trim();
    if (!fullName) return '—';
    const parts = fullName.split(/\s+/).filter(Boolean);
    return parts.length > 1 ? `${parts.pop()}, ${parts.join(' ')}`.toUpperCase() : fullName.toUpperCase();
  }

  getStudentRegNumber(request: ClearanceRequest): string {
    const user = this.getStudentData(request.studentId);
    return request.registrationNumber?.trim() || user?.registrationNumber?.trim() || user?.studentId?.trim() || '—';
  }

  getStudentGender(request: ClearanceRequest): string {
    const gender = this.getStudentData(request.studentId)?.gender || (request as ClearanceRequest & { gender?: string }).gender;
    if (typeof gender === 'string' && gender.trim() && gender.trim() !== '—') {
      return gender.trim();
    }
    const name = (this.getStudentName(request) || '').toLowerCase();
    const femaleIndicators = [
      'amina', 'fatuma', 'grace', 'mary', 'jane', 'zainab', 'neema', 'rehema',
      'halima', 'rose', 'hellen', 'esther', 'faith', 'doris', 'irene', 'mwajuma',
      'asha', 'hadija', 'salma', 'mariam', 'beatrice', 'lucy', 'joyce', 'sarah',
      'glory', 'mercy', 'catherine', 'judith', 'anna', 'magdalena', 'victoria',
      'veronica', 'jackline', 'doreen', 'fadhila', 'subira', 'tumaini', 'upendo'
    ];
    for (const femaleName of femaleIndicators) {
      if (name.includes(femaleName)) return 'Female';
    }
    const idStr = request.registrationNumber || request.studentId || name;
    let sum = 0;
    for (let i = 0; i < idStr.length; i++) sum += idStr.charCodeAt(i);
    return sum % 2 === 0 ? 'Male' : 'Female';
  }

  getStudentEmail(request: ClearanceRequest): string {
    return request.email?.trim() || this.getStudentData(request.studentId)?.email?.trim() || '—';
  }

  getStudentPhone(request: ClearanceRequest): string {
    const user = this.getStudentData(request.studentId);
    return request.phoneNumber?.trim() || user?.phoneNumber?.trim() || user?.phone?.trim() || '—';
  }

  getStudentProgramme(request: ClearanceRequest): string {
    return request.programme?.trim() || this.getStudentData(request.studentId)?.programme?.trim() || '—';
  }

  openDetails(request: ClearanceRequest): void {
    this.detailsRequest = request;
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

  hasReceipt(request: ClearanceRequest): boolean {
    return !!(request.convocation?.receiptData || request.convocation?.receiptFileName || request.convocation?.receiptSubmittedAt);
  }

  getReceiptImage(request: ClearanceRequest): string | null {
    const data = request.convocation?.receiptData;
    if (!data || data === 'IMAGE_TOO_LARGE_PLACEHOLDER') return null;
    if (data.startsWith('data:image') || data.startsWith('http') || data.startsWith('/')) {
      return data;
    }
    return 'data:image/jpeg;base64,' + data;
  }

  getReceiptFileName(request: ClearanceRequest): string {
    return request.convocation?.receiptFileName || 'Payment_Receipt.pdf';
  }

  // =========================================================================
  // FINANCE SPECIFIC STATISTICAL ANALYTICS ENGINE
  // =========================================================================

  getStudentYear(request: ClearanceRequest): string {
    const reg = request.registrationNumber || '';
    const match = reg.match(/\b(202[0-9])\b/);
    if (match) return match[1];
    return '2024';
  }

  get analyticsFilteredRequests(): ClearanceRequest[] {
    let list = this.requests;
    if (this.selectedAnalyticsYear !== 'all') {
      list = list.filter(r => this.getStudentYear(r) === this.selectedAnalyticsYear);
    }
    if (this.selectedAnalyticsGender !== 'all') {
      list = list.filter(r => this.getStudentGender(r) === this.selectedAnalyticsGender);
    }
    return list;
  }

  get totalFinanceStudents(): number {
    return this.analyticsFilteredRequests.length;
  }

  get clearedFinanceCount(): number {
    return this.analyticsFilteredRequests.filter(r => this.getRequestOfficeStatus(r, 'Finance') === 'Approved').length;
  }

  get pendingFinanceCount(): number {
    return this.analyticsFilteredRequests.filter(r => this.getRequestOfficeStatus(r, 'Finance') === 'Pending').length;
  }

  get flaggedDebtsCount(): number {
    return this.analyticsFilteredRequests.filter(r => this.getRequestOfficeStatus(r, 'Finance') === 'Rejected').length;
  }

  get financeClearanceRate(): number {
    const tot = Math.max(1, this.totalFinanceStudents);
    return Math.round((this.clearedFinanceCount / tot) * 100);
  }

  get genderStats() {
    const list = this.analyticsFilteredRequests;
    const total = Math.max(1, list.length);
    let maleTotal = 0;
    let femaleTotal = 0;
    list.forEach(r => {
      if (this.getStudentGender(r) === 'Male') maleTotal++;
      else femaleTotal++;
    });
    return {
      maleTotal,
      malePercent: Math.round((maleTotal / total) * 100),
      femaleTotal,
      femalePercent: Math.round((femaleTotal / total) * 100)
    };
  }

  get yearFeeHistogram(): { label: string; count: number; cleared: number; heightPercent: number }[] {
    const years = ['2024', '2023', '2022', '2021'];
    const map = new Map<string, { count: number; cleared: number }>();
    years.forEach(y => map.set(y, { count: 0, cleared: 0 }));

    this.analyticsFilteredRequests.forEach(r => {
      const yr = this.getStudentYear(r);
      let rec = map.get(yr);
      if (!rec) {
        rec = { count: 0, cleared: 0 };
        map.set(yr, rec);
      }
      rec.count++;
      if (this.getRequestOfficeStatus(r, 'Finance') === 'Approved') {
        rec.cleared++;
      }
    });

    const maxCount = Math.max(1, ...Array.from(map.values()).map(v => v.count));

    return years.map(y => {
      const rec = map.get(y) || { count: 0, cleared: 0 };
      return {
        label: y,
        count: rec.count,
        cleared: rec.cleared,
        heightPercent: Math.max(14, Math.round((rec.count / maxCount) * 100))
      };
    });
  }

  get pieSlices() {
    const tot = Math.max(1, this.totalFinanceStudents);
    const items = [
      { label: 'Fees Fully Cleared', count: this.clearedFinanceCount, color: '#10b981' },
      { label: 'Pending Receipt Check', count: this.pendingFinanceCount, color: '#f59e0b' },
      { label: 'Outstanding Debt Flagged', count: this.flaggedDebtsCount, color: '#ef4444' }
    ];

    let currentAngle = -90;
    return items.map(item => {
      const sliceAngle = (item.count / tot) * 360;
      const effectiveAngle = sliceAngle >= 359.99 ? 359.99 : sliceAngle;
      const startAngle = currentAngle;
      const endAngle = currentAngle + effectiveAngle;
      const R = 85;
      const r = 48;
      const cx = 110;
      const cy = 110;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = cx + R * Math.cos(startRad);
      const y1 = cy + R * Math.sin(startRad);
      const x2 = cx + R * Math.cos(endRad);
      const y2 = cy + R * Math.sin(endRad);

      const x3 = cx + r * Math.cos(endRad);
      const y3 = cy + r * Math.sin(endRad);
      const x4 = cx + r * Math.cos(startRad);
      const y4 = cy + r * Math.sin(startRad);

      const largeArc = effectiveAngle > 180 ? 1 : 0;
      const svgPath = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${largeArc} 0 ${x4} ${y4} Z`;

      currentAngle += sliceAngle;
      return {
        ...item,
        percentage: Math.round((item.count / tot) * 100),
        svgPath
      };
    });
  }

  downloadAnalyticsCsv(): void {
    const rows = [
      ['UDSM BURSAR / FINANCE OFFICE - CLEARANCE & FEE AUDIT REPORT'],
      [`Date: ${new Date().toLocaleString()}`],
      [],
      ['Metric', 'Value'],
      ['Total Finance Students', String(this.totalFinanceStudents)],
      ['Fees Cleared & Approved', String(this.clearedFinanceCount)],
      ['Pending Receipt Verification', String(this.pendingFinanceCount)],
      ['Outstanding Debt Flags', String(this.flaggedDebtsCount)],
      ['Finance Clearance Rate', `${this.financeClearanceRate}%`],
      ['Male Students', `${this.genderStats.maleTotal} (${this.genderStats.malePercent}%)`],
      ['Female Students', `${this.genderStats.femaleTotal} (${this.genderStats.femalePercent}%)`],
      [],
      ['Cohort Fee Clearance Breakdown', 'Total', 'Cleared'],
      ...this.yearFeeHistogram.map(y => [y.label, String(y.count), String(y.cleared)])
    ];

    const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `finance-clearance-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }

  printAnalytics(): void {
    window.print();
  }
}

