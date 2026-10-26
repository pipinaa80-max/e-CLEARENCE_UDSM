// profile.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../core/services/auth.service';
import { ClearanceService } from '../core/services/clearance.service';
import { DashboardHeaderComponent } from '../shared/components/dashboard-header/dashboard-header';
import { TranscriptPaymentService } from '../core/services/transcript-payment.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ReactiveFormsModule, DashboardHeaderComponent],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly transcriptService = inject(TranscriptPaymentService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  sidebarOpen = false;
  profilePhoto: string | null = null;
  photoLoadFailed = false;
  isLoading = true;

  get currentUser() {
    return this.user;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    console.log('Sidebar toggled. Current state:', this.sidebarOpen);
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  /* =========================
     LOGGED-IN STUDENT
  ========================= */

  get user() {
    return this.authService.getCurrentUser();
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

  /* =========================
     INIT - LOAD PROFILE PHOTO
  ========================= */

  ngOnInit(): void {
    this.loadProfilePhoto();
  }

  refreshInformation(): void {
    this.loadProfilePhoto();
    this.authService.getProfile().subscribe({
      next: () => {
        this.loadProfilePhoto();
      },
      error: (err) => {
        console.error('Profile - Failed to refresh profile:', err);
        this.loadProfilePhoto();
      }
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

    this.profilePhoto = null;
    this.isLoading = false;
  }

  /* =========================
     STUDENT INITIALS
  ========================= */

  get initials(): string {
    const name = this.user?.fullName;

    if (!name) {
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

  /* =========================
     LATEST CLEARANCE REQUEST
  ========================= */

  get clearanceRequest() {
    const user = this.user;

    if (!user) {
      return null;
    }

    const requests = this.clearanceService.getStudentRequests(user.id);
    return requests.length > 0 ? requests[requests.length - 1] : null;
  }

  /* =========================
     REQUEST COMPLETED?
  ========================= */

  get hasClearanceRequest(): boolean {
    return !!this.clearanceRequest;
  }

  /* =========================
     CAN START CLEARANCE?
  ========================= */

  get canStartClearance(): boolean {
    const request = this.clearanceRequest;
    return !!request && request.status === 'Pending';
  }

  /* =========================
     SHOULD COMPLETE REQUEST?
  ========================= */

  get needsClearanceRequest(): boolean {
    return !this.hasClearanceRequest;
  }

  /* =========================
     CLEARANCE STATUS
  ========================= */

  get clearanceStatus(): string {
    const request = this.clearanceRequest;

    if (!request) {
      return 'Not Started';
    }

    if (request.status === 'Completed') {
      return 'Completed';
    }

    if (request.status === 'Rejected') {
      return 'Action Required';
    }

    return 'In Progress';
  }

  get isTranscriptPaid(): boolean {
    const user = this.user;
    if (!user) return false;
    const requests = this.transcriptService.getStudentRequests(user.id);
    return requests.some(r => r.attemptNumber === 1 && r.status === 'Paid');
  }

  /* =========================
     GET PHOTO SOURCE
  ========================= */

  getPhotoSource(): string | null {
    const userPhoto = this.authService.getProfilePhotoSource(this.user);
    if (userPhoto) return userPhoto;
    if (this.profilePhoto) return this.profilePhoto;

    const request = this.clearanceRequest;
    return this.authService.getProfilePhotoSource({ photo: request?.photo });
  }

  hasPhoto(): boolean {
    return !this.photoLoadFailed && !!this.getPhotoSource();
  }

  /* =========================
     FORCE REFRESH PHOTO
  ========================= */

  refreshPhoto(): void {
    console.log('Refreshing all information...');
    this.profilePhoto = null;
    this.refreshInformation();
  }

  /* =========================
     HANDLE IMAGE ERROR
  ========================= */

  onImageError(): void {
    this.profilePhoto = null;
    this.photoLoadFailed = true;
  }
}
