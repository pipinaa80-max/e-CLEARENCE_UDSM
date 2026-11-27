// profile.component.ts
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../core/services/auth.service';
import { ClearanceService } from '../core/services/clearance.service';
import { NotificationService } from '../core/services/notification.service';
import { DashboardHeaderComponent } from '../shared/components/dashboard-header/dashboard-header';
import { StudentSidebarComponent } from '../shared/components/student-sidebar/student-sidebar';
import {
  StaffSidebarNavItem,
  getStaffDashboardRoute,
  getStaffPortalMeta,
  getStaffSidebarNavItems
} from '../core/utils/staff-sidebar-nav.util';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, DashboardHeaderComponent, StudentSidebarComponent],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  profilePhoto: string | null = null;
  photoLoadFailed = false;
  isLoading = true;
  unreadNotifications = 0;

  private unreadSub: Subscription | null = null;

  get user() {
    return this.authService.getCurrentUser();
  }

  get currentUser() {
    return this.user;
  }

  get isStudent(): boolean {
    return !this.currentUser || this.currentUser.role === 'Student';
  }

  get isStationSecretary(): boolean {
    return this.currentUser?.role === 'Station Secretary';
  }

  get isSecretary(): boolean {
    return (
      this.currentUser?.role === 'DUS Examination Office' ||
      this.currentUser?.role === 'DUS Secretary' ||
      this.isStationSecretary
    );
  }

  get staffNavItems(): StaffSidebarNavItem[] {
    return getStaffSidebarNavItems(this.currentUser);
  }

  get dashboardRoute(): string {
    return getStaffDashboardRoute(this.currentUser?.role);
  }

  get portalTitle(): string {
    return getStaffPortalMeta(this.currentUser?.role).title;
  }

  get portalSubtitle(): string {
    return getStaffPortalMeta(this.currentUser?.role).subtitle;
  }

  get dashboardLabel(): string {
    return getStaffPortalMeta(this.currentUser?.role).dashboardLabel;
  }

  get roleLabel(): string {
    return this.currentUser?.role || 'Account';
  }

  get headerEyebrow(): string {
    return this.isStudent ? 'Student Account' : `${this.roleLabel} Account`;
  }

  get headerSubtitle(): string {
    return this.isStudent
      ? 'View your student information and clearance account details.'
      : 'View your staff profile, office assignment, and account information.';
  }

  get programme(): string | undefined {
    const p = this.user?.programme;
    if (p && p !== 'Not selected' && p !== 'Not available') return p;
    return this.clearanceRequest?.programme;
  }

  get college(): string | undefined {
    const c = this.user?.college;
    if (c && c !== 'Not selected' && c !== 'Not available') return c;
    return this.clearanceRequest?.college;
  }

  get department(): string | undefined {
    const d = this.user?.department;
    if (d && d !== 'Not selected' && d !== 'Not available') return d;
    return this.clearanceRequest?.department;
  }

  get hall(): string | undefined {
    const h = this.user?.hall;
    if (h && h !== 'Off Campus') return h;
    return this.clearanceRequest?.hall;
  }

  get wing(): string | undefined {
    return this.user?.wing || this.clearanceRequest?.wing;
  }

  get block(): string | undefined {
    return this.user?.block || this.clearanceRequest?.block;
  }

  get roomNumber(): string | undefined {
    return this.user?.roomNumber || this.clearanceRequest?.roomNumber;
  }

  get sponsor(): string | undefined {
    return this.user?.sponsor || this.clearanceRequest?.sponsor;
  }

  get award(): string | undefined {
    return this.user?.award || (this.clearanceRequest as any)?.award || undefined;
  }

  get hasResidenceOrSponsor(): boolean {
    return Boolean(this.hall || this.wing || this.block || this.roomNumber || this.sponsor);
  }

  get primaryIdentifier(): string {
    if (this.isStudent) {
      return this.user?.registrationNumber || this.email || '';
    }
    return this.email || this.staffId || '';
  }

  get email(): string | undefined {
    return this.user?.email;
  }

  get staffId(): string | undefined {
    return (this.user as any)?.staffId || undefined;
  }

  get phone(): string | undefined {
    return this.user?.phone || (this.user as any)?.phoneNumber || undefined;
  }

  get pickupStation(): string | undefined {
    return (
      this.user?.pickupStation ||
      (this.user as any)?.stationName ||
      (this.user as any)?.stationCode ||
      undefined
    );
  }

  get clearanceRequest() {
    if (!this.isStudent || !this.user) return null;
    const requests = this.clearanceService.getStudentRequests(this.user.id);
    return requests.length > 0 ? requests[requests.length - 1] : null;
  }

  ngOnInit(): void {
    this.unreadSub = this.notificationService.unreadCount$.subscribe((count) => {
      this.unreadNotifications = count;
    });
    this.loadProfilePhoto();
    this.notificationService.refreshUnreadCount().subscribe();
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
    this.unreadSub = null;
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

  refreshInformation(): void {
    this.loadProfilePhoto();
    this.authService.getProfile().subscribe({
      next: () => this.loadProfilePhoto(),
      error: () => this.loadProfilePhoto()
    });
  }

  loadProfilePhoto(): void {
    this.isLoading = true;
    this.photoLoadFailed = false;
    const user = this.user;

    if (!user) {
      this.isLoading = false;
      return;
    }

    const savedPhoto = this.authService.getProfilePhotoSource(user);
    if (savedPhoto) {
      this.profilePhoto = savedPhoto;
      this.isLoading = false;
      return;
    }

    if (this.isStudent) {
      const requests = this.clearanceService.getStudentRequests(user.id);
      for (const request of [...requests].reverse()) {
        const requestPhoto = this.authService.getProfilePhotoSource({ photo: request.photo });
        if (requestPhoto) {
          this.profilePhoto = requestPhoto;
          user.photo = requestPhoto;
          this.authService.updateCurrentUser(user);
          this.isLoading = false;
          return;
        }
      }
    }

    this.profilePhoto = null;
    this.isLoading = false;
  }

  get initials(): string {
    const name = this.user?.fullName;
    if (!name) return this.isStudent ? 'ST' : 'UD';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  getPhotoSource(): string | null {
    const userPhoto = this.authService.getProfilePhotoSource(this.user);
    if (userPhoto) return userPhoto;
    if (this.profilePhoto) return this.profilePhoto;
    if (this.isStudent) {
      const request = this.clearanceRequest;
      return this.authService.getProfilePhotoSource({ photo: request?.photo });
    }
    return null;
  }

  hasPhoto(): boolean {
    return !this.photoLoadFailed && !!this.getPhotoSource();
  }

  refreshPhoto(): void {
    this.profilePhoto = null;
    this.refreshInformation();
  }

  onImageError(): void {
    this.profilePhoto = null;
    this.photoLoadFailed = true;
  }
}
