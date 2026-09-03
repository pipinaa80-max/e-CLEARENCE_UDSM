// student-dashboard.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationItem } from '../../core/models/notification.model';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './student.html',
  styleUrl: './student.css'
})
export class StudentDashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  profilePhoto: string | null = null;
  isLoading = true;

  ngOnInit(): void {
    this.loadProfilePhoto();
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
      console.log('Dashboard - Latest request:', {
        id: latestRequest.id,
        hasPhoto: !!latestRequest.photo,
        photoLength: latestRequest.photo ? latestRequest.photo.length : 0,
        status: latestRequest.status
      });

      if (latestRequest.photo && latestRequest.photo.startsWith('data:image')) {
        this.profilePhoto = latestRequest.photo;
        console.log('Dashboard - Photo loaded from clearance request');

        // Update the user object with this photo for future use
        user.photo = latestRequest.photo;
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
    if (this.profilePhoto && this.profilePhoto.startsWith('data:image')) {
      return this.profilePhoto;
    }

    const user = this.currentUser;
    if (user?.profilePhoto && user.profilePhoto.startsWith('data:image')) {
      return user.profilePhoto;
    }

    if (user?.photo && user.photo.startsWith('data:image')) {
      return user.photo;
    }

    return null;
  }

  // =====================================================
  // HAS PHOTO
  // =====================================================

  hasPhoto(): boolean {
    const source = this.getPhotoSource();
    return !!source && source.startsWith('data:image');
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

  get programme(): string | undefined {
    return this.currentUser?.programme || this.currentRequest?.programme;
  }

  get college(): string | undefined {
    return this.currentUser?.college || this.currentRequest?.college;
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
    console.log('Dashboard - Refreshing photo...');
    this.profilePhoto = null;
    this.loadProfilePhoto();
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
