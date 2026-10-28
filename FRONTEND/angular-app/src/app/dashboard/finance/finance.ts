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
  selectedRequest: ClearanceRequest | null = null;
  detailsRequest: ClearanceRequest | null = null;
  rejectionComment = '';
  message = '';

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

  async withdrawDecision(request: ClearanceRequest): Promise<void> {
    if (!await this.clearanceService.withdrawOfficeDecision(request.id, 'Finance')) return;
    this.message = 'Finance decision withdrawn. The request is pending again.';
    this.detailsRequest = request;
  }

  getFinanceRejectionReason(request: ClearanceRequest): string {
    return request.approvals.find(approval => approval.office === 'Finance')?.comment || 'No reason was recorded.';
  }

  getRejectionHistory(request: ClearanceRequest) {
    return request.rejectionHistory ?? [];
  }

  getRejectionReason(office: string): string {
    const request = this.studentRequest;
    if (!request) return '';
    const approval = request.approvals.find(a => a.office === office);
    return approval?.comment ?? '';
  }

  async approve(request: ClearanceRequest): Promise<void> {
    const staff = this.currentUser;

    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }
      if (!await this.clearanceService.approveRequest(
      request.id,
      'Finance',
      staff.fullName
    )) return;

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

  async reject(): Promise<void> {
    const staff = this.currentUser;

    if (!staff || !this.selectedRequest || !this.rejectionComment.trim()) {
      return;
    }
      if (!await this.clearanceService.rejectRequest(
      this.selectedRequest.id,
      'Finance',
      staff.fullName,
      this.rejectionComment
    )) return;

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
    return typeof gender === 'string' && gender.trim() ? gender.trim() : '—';
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
}
