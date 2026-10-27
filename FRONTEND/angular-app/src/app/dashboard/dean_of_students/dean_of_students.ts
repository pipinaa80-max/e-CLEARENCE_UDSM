// dean-of-students.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ClearanceRequest } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

interface AnalyticsBar {
  label: string;
  count: number;
  width: number;
}

@Component({
  selector: 'app-dean-of-students',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './dean_of_students.html',
  styleUrl: './dean_of_students.css'
})
export class DeanOfStudentsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  selectedRequest: ClearanceRequest | null = null;
  detailsRequest: ClearanceRequest | null = null;
  rejectionComment = '';
  message = '';
  isLoading = false;
  pendingRequests: ClearanceRequest[] = [];
  allRequests: ClearanceRequest[] = [];

  searchTerm = '';
  filterStatus = 'Pending';
  currentPage = 1;
  pageSize = 20;

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

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  // Cache for student data to avoid repeated lookups
  private studentCache: Map<string, any> = new Map();

  // =====================================================
  // GET REQUESTS - WITH RELOAD
  // =====================================================

  get requests(): ClearanceRequest[] {
    this.pendingRequests = this.clearanceService.getRequestsForOffice('Dean of Students');
    return this.pendingRequests;
  }

  getRequestOfficeStatus(request: ClearanceRequest, office: string): string {
    return (Array.isArray(request?.approvals)
      ? request.approvals.find(approval => approval?.office === office)?.status
      : undefined) ?? 'Pending';
  }

  get pendingRequestCount(): number {
    return this.requests.filter(request => this.getRequestOfficeStatus(request, 'Dean of Students') === 'Pending').length;
  }

  get completedRequestCount(): number {
    return this.allRequests.filter(request => this.isCompleted(request)).length;
  }

  get rejectedRequestCount(): number {
    return this.allRequests.filter(request => request.status === 'Rejected').length;
  }

  get inProgressRequestCount(): number {
    return Math.max(0, this.allRequests.length - this.completedRequestCount - this.rejectedRequestCount);
  }

  get clearanceRate(): number {
    return this.allRequests.length ? Math.round(this.completedRequestCount / this.allRequests.length * 100) : 0;
  }

  get programmeClearanceBars(): AnalyticsBar[] {
    return this.buildBars(this.groupCompleted(request => request.programme || 'Not recorded'));
  }

  get yearClearanceBars(): AnalyticsBar[] {
    return this.buildBars(this.groupCompleted(request => this.getAnalyticsYear(request)));
  }

  get collegeClearanceBars(): AnalyticsBar[] {
    return this.buildBars(this.groupCompleted(request => request.college || 'Not recorded'));
  }

  get filteredRequests(): ClearanceRequest[] {
    let list = this.requests;

    if (this.searchTerm.trim()) {
      const s = this.searchTerm.toLowerCase();
      list = list.filter(r =>
        this.getStudentName(r).toLowerCase().includes(s) ||
        this.getStudentRegNumber(r).toLowerCase().includes(s) ||
        (r.programme || '').toLowerCase().includes(s)
      );
    }

    return list.filter(r => this.getRequestOfficeStatus(r, 'Dean of Students') === this.filterStatus);
  }

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.allRequests = this.clearanceService.getAllRequests();
    this.pendingRequests = this.clearanceService.getRequestsForOffice('Dean of Students');
    this.isLoading = false;
  }

  private isCompleted(request: ClearanceRequest): boolean {
    return request.status === 'Completed' || request.currentStage === 'Completed';
  }

  private groupCompleted(labelFor: (request: ClearanceRequest) => string): Map<string, number> {
    const counts = new Map<string, number>();
    this.allRequests.filter(request => this.isCompleted(request)).forEach(request => {
      const label = labelFor(request).trim() || 'Not recorded';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    return counts;
  }

  private buildBars(counts: Map<string, number>): AnalyticsBar[] {
    const sorted = [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 6);
    const maximum = Math.max(1, ...sorted.map(([, count]) => count));
    return sorted.map(([label, count]) => ({
      label,
      count,
      width: Math.max(6, Math.round(count / maximum * 100))
    }));
  }

  private getAnalyticsYear(request: ClearanceRequest): string {
    const student = this.getStudentData(request.studentId);
    const academicYear = student?.academicYear;
    if (academicYear !== undefined && academicYear !== null && String(academicYear).trim()) {
      return String(academicYear).trim();
    }
    const graduationYear = student?.graduationYear;
    if (graduationYear !== undefined && graduationYear !== null && String(graduationYear).trim()) {
      return `Graduation ${String(graduationYear).trim()}`;
    }
    const yearOfStudy = student?.yearOfStudy;
    if (yearOfStudy !== undefined && yearOfStudy !== null && String(yearOfStudy).trim()) {
      return `Year ${String(yearOfStudy).trim()}`;
    }
    const submittedYear = new Date(request.requestDate).getFullYear();
    return Number.isNaN(submittedYear) ? 'Not recorded' : `Request ${submittedYear}`;
  }

  downloadAnalyticsReport(): void {
    const rows: string[][] = [
      ['UDSM Clearance MIS - Dean of Students Analytics'],
      ['Generated', new Date().toLocaleString()],
      ['Total requests', String(this.allRequests.length)],
      ['Completed clearances', String(this.completedRequestCount)],
      ['In progress', String(this.inProgressRequestCount)],
      ['Rejected', String(this.rejectedRequestCount)],
      ['Clearance rate', `${this.clearanceRate}%`],
      [],
      ['Completed clearances by programme', 'Count'],
      ...this.programmeClearanceBars.map(bar => [bar.label, String(bar.count)]),
      [],
      ['Completed clearances by academic/graduation year', 'Count'],
      ...this.yearClearanceBars.map(bar => [bar.label, String(bar.count)]),
      [],
      ['Completed clearances by college', 'Count'],
      ...this.collegeClearanceBars.map(bar => [bar.label, String(bar.count)]),
      [],
      ['Registration number', 'Student', 'Programme', 'College', 'Department', 'Status', 'Request date', 'Clearance year'],
      ...this.allRequests.map(request => [
        this.getStudentRegNumber(request), this.getStudentName(request), request.programme || '',
        request.college || '', request.department || '', request.status,
        request.requestDate || '', this.getAnalyticsYear(request)
      ])
    ];
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `dean-clearance-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  printAnalyticsReport(): void {
    window.print();
  }

  // =====================================================
  // GET STUDENT DATA FROM LOCAL STORAGE
  // =====================================================

  private getStudentData(studentId: string): any | null {
    // Check cache first
    if (this.studentCache.has(studentId)) {
      return this.studentCache.get(studentId);
    }

    try {
      // Try to get from users list in localStorage
      const usersJson = localStorage.getItem('udsm-local-users');
      if (usersJson) {
        const users = JSON.parse(usersJson);
        const user = users.find((u: any) => u.id === studentId);
        if (user) {
          this.studentCache.set(studentId, user);
          return user;
        }
      }

      // Try to get from current user if it matches
      const currentUser = this.authService.getCurrentUser();
      if (currentUser && currentUser.id === studentId) {
        this.studentCache.set(studentId, currentUser);
        return currentUser;
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    }

    return null;
  }

  // =====================================================
  // GET STUDENT NAME
  // =====================================================

  getStudentName(request: ClearanceRequest): string {
    // Check request first
    if (request.studentName) {
      return request.studentName;
    }

    // Try to get from user data
    const user = this.getStudentData(request.studentId);
    if (user) {
      return user.fullName || user.firstName + ' ' + user.lastName || user.registrationNumber || 'Student';
    }

    const studentId = request.studentId || '';
    return request.registrationNumber || (studentId ? 'Student #' + studentId.substring(0, 8) : 'Student');
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

  // =====================================================
  // GET STUDENT REGISTRATION NUMBER
  // =====================================================

  getStudentRegNumber(request: ClearanceRequest): string {
    if (request.registrationNumber) {
      return request.registrationNumber;
    }

    const user = this.getStudentData(request.studentId);
    if (user) {
      return user.registrationNumber || user.studentId || 'Not available';
    }

    return 'Not available';
  }

  getStudentGender(request: ClearanceRequest): string {
    const gender = this.getStudentData(request.studentId)?.gender
      || (request as ClearanceRequest & { gender?: string }).gender;
    return typeof gender === 'string' && gender.trim() ? gender.trim() : '—';
  }

  // =====================================================
  // GET STUDENT PHOTO
  // =====================================================

  getStudentPhoto(request: ClearanceRequest): string | null {
    let photo = request.photo;

    // Check user data if request doesn't have it
    if (!photo) {
      const user = this.getStudentData(request.studentId);
      if (user) {
        photo = user.photo || user.profilePhoto || user.profileImageUrl;
      }
    }

    if (typeof photo !== 'string' || !photo) {
      return null;
    }

    if (photo.startsWith('data:image') || photo.startsWith('http') || photo.startsWith('/') || photo.startsWith('assets/')) {
      return photo;
    }

    if (photo.length > 50) {
      return 'data:image/jpeg;base64,' + photo;
    }

    return photo;
  }

  // =====================================================
  // GET STUDENT INITIALS
  // =====================================================

  getStudentInitials(request: ClearanceRequest): string {
    const name = this.getStudentName(request);
    if (!name || name === 'Student') {
      return 'ST';
    }

    const parts = name.split(' ');
    let initials = '';
    for (let i = 0; i < parts.length && i < 2; i++) {
      if (parts[i]) {
        initials += parts[i].charAt(0);
      }
    }
    return initials.toUpperCase();
  }

  // =====================================================
  // GET STUDENT EMAIL
  // =====================================================

  getStudentEmail(request: ClearanceRequest): string {
    if (request.email?.trim()) return request.email.trim();
    const user = this.getStudentData(request.studentId);
    if (user) {
      return user.email || 'Not available';
    }
    return 'Not available';
  }

  // =====================================================
  // GET STUDENT PHONE
  // =====================================================

  getStudentPhone(request: ClearanceRequest): string {
    if (request.phoneNumber?.trim()) return request.phoneNumber.trim();
    const user = this.getStudentData(request.studentId);
    if (user) {
      return user.phone || user.phoneNumber || 'Not available';
    }
    return 'Not available';
  }

  // =====================================================
  // HAS PHOTO
  // =====================================================

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

  // =====================================================
  // APPROVE
  // =====================================================

  approve(request: ClearanceRequest): void {
    this.isLoading = true;
    const staff = this.authService.getCurrentUser();

    if (!staff) {
      this.router.navigate(['/login']);
      this.isLoading = false;
      return;
    }

    try {
      const approved = this.clearanceService.approveRequest(
          request.id,
          'Dean of Students',
          staff.fullName || 'Dean of Students'
      );

      if (!approved) {
        this.message = 'This request could not be approved in its current state. Refresh the dashboard and try again.';
        return;
      }

      // Reload data
      this.loadData();

      this.notificationService.createNotification(
          request.studentId,
          'Dean of Students clearance approved',
          `Your clearance request has been approved by the Dean of Students.`,
          'success'
      );

      this.message = `✅ Student ${this.getStudentName(request)} was approved successfully.`;

      setTimeout(() => {
        this.message = '';
      }, 5000);

    } catch (error: any) {
      console.error('Approval error:', error);
      this.message = '❌ Failed to approve request. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  // =====================================================
  // OPEN REJECT FORM
  // =====================================================

  openRejectForm(request: ClearanceRequest): void {
    this.selectedRequest = request;
    this.rejectionComment = '';
    this.message = '';
  }

  // =====================================================
  // REJECT
  // =====================================================

  reject(): void {
    this.isLoading = true;
    const staff = this.authService.getCurrentUser();

    if (!staff || !this.selectedRequest || !this.rejectionComment.trim()) {
      this.isLoading = false;
      return;
    }

    try {
      this.clearanceService.rejectRequest(
          this.selectedRequest.id,
          'Dean of Students',
          staff.fullName || 'Dean of Students',
          this.rejectionComment
      );

      // Reload data
      this.loadData();

      this.notificationService.createNotification(
          this.selectedRequest.studentId,
          'Dean of Students requires action',
          this.rejectionComment,
          'warning'
      );

      this.message = `✅ Student ${this.getStudentName(this.selectedRequest)} has been notified about the required action.`;

      this.selectedRequest = null;
      this.rejectionComment = '';

      setTimeout(() => {
        this.message = '';
      }, 5000);

    } catch (error: any) {
      console.error('Rejection error:', error);
      this.message = '❌ Failed to reject request. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  closeModal(): void {
    this.selectedRequest = null;
    this.rejectionComment = '';
  }

  // =====================================================
  // REFRESH DATA
  // =====================================================

  refreshData(): void {
    this.message = '🔄 Refreshing data...';
    // Clear cache
    this.studentCache.clear();
    this.loadData();
    setTimeout(() => {
      this.message = '✅ Data refreshed successfully.';
      setTimeout(() => {
        this.message = '';
      }, 3000);
    }, 500);
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
