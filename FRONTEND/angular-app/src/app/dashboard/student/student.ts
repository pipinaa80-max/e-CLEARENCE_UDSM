// student-dashboard.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationItem } from '../../core/models/notification.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { TranscriptPaymentService } from '../../core/services/transcript-payment.service';
import { TranscriptPaymentRequest } from '../../transcript/transcript-payment.model';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, DashboardHeaderComponent],
  templateUrl: './student.html',
  styleUrl: './student.css'
})
export class StudentDashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly transcriptService = inject(TranscriptPaymentService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  profilePhoto: string | null = null;
  isLoading = true;

  ngOnInit(): void {
    this.refreshInformation();
  }

  refreshInformation(): void {
    this.isLoading = true;
    this.authService.getProfile().subscribe({
      next: (user) => {
        console.log('Dashboard - Profile updated from backend');
        this.loadProfilePhoto();
      },
      error: (err) => {
        console.error('Dashboard - Failed to refresh profile:', err);
        this.loadProfilePhoto(); // Fallback to local
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  // =====================================================
  // LOAD PROFILE PHOTO
  // =====================================================

  loadProfilePhoto(): void {
    this.isLoading = true;
    const user = this.currentUser;

    if (!user) {
      this.isLoading = false;
      return;
    }

    console.log('Dashboard - Loading profile photo for user:', user.id);

    // Method 1: Check if user has a profile photo directly
    if (user.profilePhoto && user.profilePhoto.startsWith('data:image')) {
      this.profilePhoto = user.profilePhoto;
      console.log('Dashboard - Photo loaded from user.profilePhoto');
      this.isLoading = false;
      return;
    }

    // Method 2: Check if user has photo from clearance request
    if (user.photo && user.photo.startsWith('data:image')) {
      this.profilePhoto = user.photo;
      console.log('Dashboard - Photo loaded from user.photo');
      this.isLoading = false;
      return;
    }

    // Method 3: Check the latest clearance request for photo
    const requests = this.clearanceService.getStudentRequests(user.id);
    console.log('Dashboard - Found clearance requests:', requests.length);

    if (requests.length > 0) {
      // Get the latest request
      const latestRequest = requests[requests.length - 1];
      const photoData = latestRequest.photo;

      if (photoData && (photoData.startsWith('data:image') || photoData.length > 100)) {
        this.profilePhoto = photoData.startsWith('data:image') ? photoData : 'data:image/jpeg;base64,' + photoData;
        console.log('Dashboard - Photo loaded from clearance request');

        // Update the user object with this photo for future use
        user.photo = this.profilePhoto;
        this.authService.updateCurrentUser(user);
        this.isLoading = false;
        return;
      }
    }

    // Method 4: Check all requests for any photo
    for (const request of requests) {
      if (request.photo && request.photo.startsWith('data:image')) {
        this.profilePhoto = request.photo;
        console.log('Dashboard - Photo loaded from older request:', request.id);

        // Update the user object with this photo
        user.photo = request.photo;
        this.authService.updateCurrentUser(user);
        this.isLoading = false;
        return;
      }
    }

    console.log('Dashboard - No photo found for user');
    this.isLoading = false;
  }

  // =====================================================
  // GET PHOTO SOURCE
  // =====================================================

  getPhotoSource(): string | null {
    if (this.profilePhoto && (this.profilePhoto.startsWith('data:image') || this.profilePhoto.length > 100)) {
      return this.profilePhoto.startsWith('data:image') ? this.profilePhoto : 'data:image/jpeg;base64,' + this.profilePhoto;
    }

    const user = this.currentUser;
    if (user) {
      const uPhoto = user.profilePhoto || user.photo || user.profileImageUrl;
      if (uPhoto && (uPhoto.startsWith('data:image') || uPhoto.length > 100)) {
        return uPhoto.startsWith('data:image') ? uPhoto : 'data:image/jpeg;base64,' + uPhoto;
      }
    }

    const request = this.currentRequest;
    if (request?.photo && (request.photo.startsWith('data:image') || request.photo.length > 100)) {
      return request.photo.startsWith('data:image') ? request.photo : 'data:image/jpeg;base64,' + request.photo;
    }

    return null;
  }

  hasPhoto(): boolean {
    const source = this.getPhotoSource();
    return !!source && (source.startsWith('data:image') || source.length > 100);
  }

  // =====================================================
  // GET OFFICES
  // =====================================================

  get offices() {
    const request = this.currentRequest;

    if (!request) {
      return [];
    }

    return request.approvals.map((approval) => {
      let note = 'Awaiting review';

      switch (approval.office) {
        case 'Convocation':
          note = 'Convocation clearance';
          break;
        case 'Library':
          note = 'Library clearance';
          break;
        case 'Hall Warden':
          note = 'Hall clearance';
          break;
        case 'Games Coach':
          note = 'Sports clearance';
          break;
        case 'USAB':
          note = 'USAB clearance';
          break;
        case 'DARUSO':
          note = 'DARUSO clearance';
          break;
        case 'Dean of Students':
          note = 'Dean of Students clearance';
          break;
        case 'Smart Card':
          note = 'Smart Card clearance';
          break;
        case 'Workshop':
          note = 'Workshop clearance';
          break;
        case 'Laboratory':
          note = 'Laboratory clearance';
          break;
        case 'Department':
          note = 'Department approval';
          break;
        case 'Principal':
          note = 'Principal approval';
          break;
        case 'Finance':
          note = 'Final financial clearance';
          break;
      }

      return {
        name: approval.office,
        note,
        status: approval.status
      };
    });
  }

  // =====================================================
  // PROGRESS PERCENT
  // =====================================================

  get progressPercent(): number {
    const request = this.currentRequest;

    if (!request) {
      return 0;
    }

    const approvals = request.approvals || [];

    if (!approvals.length) {
      return 0;
    }

    const approved = approvals.filter(
        approval => approval.status === 'Approved'
    ).length;

    return Math.round((approved / approvals.length) * 100);
  }

  // =====================================================
  // CURRENT USER
  // =====================================================

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get studentAward(): string {
    return this.currentUser?.award || 'Bachelor Degree';
  }

  get awardType(): 'degree' | 'diploma' | 'certificate' | 'postgraduate' | 'masters' | 'phd' {
    const award = this.studentAward.toLowerCase();
    if (award.includes('phd') || award.includes('doctor')) return 'phd';
    if (award.includes('master')) return 'masters';
    if (award.includes('postgraduate')) return 'postgraduate';
    if (award.includes('diploma')) return 'diploma';
    if (award.includes('certificate')) return 'certificate';
    return 'degree';
  }

  get dashboardEyebrow(): string {
    switch (this.awardType) {
      case 'diploma': return 'Diploma Student Dashboard';
      case 'certificate': return 'Certificate Student Dashboard';
      case 'postgraduate': return 'Postgraduate Diploma Student Dashboard';
      case 'masters': return 'Master Degree Student Dashboard';
      case 'phd': return 'PhD Doctoral Student Dashboard';
      default: return 'Degree Student Dashboard';
    }
  }

  get dashboardSubtitle(): string {
    return `Manage your ${this.studentAward} student information and clearance process.`;
  }

  get programme(): string | undefined {
    const p = this.currentUser?.programme;
    if (p && p !== 'Not selected' && p !== 'Not available' && p.trim().length > 0) return p;
    return this.currentRequest?.programme;
  }

  get college(): string | undefined {
    const c = this.currentUser?.college;
    if (c && c !== 'Not selected' && c !== 'Not available' && c.trim().length > 0) return c;
    return this.currentRequest?.college;
  }

  // =====================================================
  // CLEARANCE STATUS
  // =====================================================

  get clearanceStatus(): string {
    if (!this.currentUser) {
      return 'Not Requested';
    }

    return this.clearanceService.getClearanceStatus(this.currentUser.id);
  }

  // =====================================================
  // CURRENT REQUEST
  // =====================================================

  get currentRequest() {
    const user = this.currentUser;
    if (!user) return null;

    const requests = this.clearanceService.getStudentRequests(user.id);
    return requests.length > 0 ? requests[requests.length - 1] : null;
  }

  // =====================================================
  // UNREAD NOTIFICATIONS
  // =====================================================

  get unreadNotifications(): number {
    const user = this.currentUser;
    if (!user) return 0;

    return this.notificationService
        .getNotifications(user.id)
        .filter((item) => !item.read).length;
  }

  // =====================================================
  // LATEST NOTIFICATIONS
  // =====================================================

  get latestNotifications(): NotificationItem[] {
    const user = this.currentUser;
    if (!user) return [];

    return this.notificationService
      .getNotifications(user.id)
      .filter(n => !n.read)
      .slice(0, 2); // Show only top 2 unread notifications
  }

  markAsRead(id: string): void {
    this.notificationService.markAsRead(id);
  }

  // =====================================================
  // COMPLETED OFFICES
  // =====================================================

  get completedOffices(): number {
    return this.offices.filter((office) => office.status === 'Approved').length;
  }

  // =====================================================
  // PENDING OFFICES
  // =====================================================

  get pendingOffices(): number {
    return this.offices.filter((office) => office.status === 'Pending').length;
  }

  // =====================================================
  // REJECTED OFFICES
  // =====================================================

  get rejectedOffices(): number {
    return this.offices.filter((office) => office.status === 'Rejected').length;
  }

  // =====================================================
  // TRANSCRIPT LOGIC
  // =====================================================

  get currentTranscriptRequest(): TranscriptPaymentRequest | null {
    const user = this.currentUser;
    if (!user) return null;
    const requests = this.transcriptService.getStudentRequests(user.id);
    return requests.length > 0 ? requests[requests.length - 1] : null;
  }

  get transcriptStatus(): string {
    const req = this.currentTranscriptRequest;
    return req ? req.status : 'Not Started';
  }

  get isTranscriptPaid(): boolean {
    const user = this.currentUser;
    if (!user) return false;
    const requests = this.transcriptService.getStudentRequests(user.id);
    return requests.some(r => r.attemptNumber === 1 && r.status === 'Paid');
  }

  get transcriptProgressSteps(): number {
    const req = this.currentTranscriptRequest;
    if (!req) return 0;

    // Steps: 1. Requested, 2. Control Number Issued, 3. Receipt Submitted, 4. Paid
    if (req.status === 'Paid') return 4;
    if (req.status === 'Receipt Submitted') return 3;
    if (req.status === 'Awaiting Payment') return 2;
    return 1;
  }

  get transcriptProgressPercent(): number {
    return (this.transcriptProgressSteps / 4) * 100;
  }

  get transcriptSteps() {
    const req = this.currentTranscriptRequest;
    const steps = [
      { name: 'Application', note: 'Request submitted', status: 'Pending' },
      { name: 'Control Number', note: 'Finance issues code', status: 'Pending' },
      { name: 'Payment', note: 'Upload your receipt', status: 'Pending' },
      { name: 'Verification', note: 'Final approval', status: 'Pending' }
    ];

    if (!req) return steps;

    // Map statuses
    steps[0].status = 'Approved'; // Always true if req exists

    if (req.controlNumber || req.status !== 'Pending Control Number') {
      steps[1].status = 'Approved';
    }

    if (req.receiptSubmittedAt || req.status === 'Receipt Submitted' || req.status === 'Paid') {
      steps[2].status = 'Approved';
    }

    if (req.status === 'Paid') {
      steps[3].status = 'Approved';
    }

    return steps;
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // =====================================================
  // REFRESH PHOTO
  // =====================================================

  refreshPhoto(): void {
    console.log('Dashboard - Refreshing all information...');
    this.profilePhoto = null;
    this.refreshInformation();
  }

  // =====================================================
  // HANDLE IMAGE ERROR
  // =====================================================

  onImageError(): void {
    console.log('Dashboard - Image failed to load, clearing photo');
    this.profilePhoto = null;
    const user = this.currentUser;
    if (user) {
      user.profilePhoto = '';
      user.photo = '';
      this.authService.updateCurrentUser(user);
    }
  }
}
