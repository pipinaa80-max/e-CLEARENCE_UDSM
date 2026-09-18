// profile.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../core/services/auth.service';
import { ClearanceService } from '../core/services/clearance.service';
import { DashboardHeaderComponent } from '../shared/components/dashboard-header/dashboard-header';

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
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  sidebarOpen = false;
  profilePhoto: string | null = null;
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
    this.refreshInformation();
  }

  refreshInformation(): void {
    this.isLoading = true;
    this.authService.getProfile().subscribe({
      next: (user) => {
        console.log('Profile - Updated from backend');
        this.loadProfilePhoto();
      },
      error: (err) => {
        console.error('Profile - Failed to refresh profile:', err);
        this.loadProfilePhoto(); // Fallback to local
      }
    });
  }

  loadProfilePhoto(): void {
    this.isLoading = true;
    const user = this.user;

    if (!user) {
      this.isLoading = false;
      return;
    }

    console.log('Loading profile photo for user:', user.id);
    console.log('User data:', {
      profilePhoto: user.profilePhoto ? 'exists' : 'null',
      photo: user.photo ? 'exists' : 'null',
      fullName: user.fullName
    });

    // Method 1: Check if user has a profile photo directly
    if (user.profilePhoto && user.profilePhoto.startsWith('data:image')) {
      this.profilePhoto = user.profilePhoto;
      console.log('Photo loaded from user.profilePhoto');
      this.isLoading = false;
      return;
    }

    // Method 2: Check if user has photo from clearance request
    if (user.photo && user.photo.startsWith('data:image')) {
      this.profilePhoto = user.photo;
      console.log('Photo loaded from user.photo');
      this.isLoading = false;
      return;
    }

    // Method 3: Check the latest clearance request for photo
    const requests = this.clearanceService.getStudentRequests(user.id);
    console.log('Found clearance requests:', requests.length);

    if (requests.length > 0) {
      // Get the latest request
      const latestRequest = requests[requests.length - 1];
      const photoData = latestRequest.photo;

      if (photoData && (photoData.startsWith('data:image') || photoData.length > 100)) {
        this.profilePhoto = photoData.startsWith('data:image') ? photoData : 'data:image/jpeg;base64,' + photoData;
        console.log('Photo loaded from clearance request');

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
        console.log('Photo loaded from older request:', request.id);

        // Update the user object with this photo
        user.photo = request.photo;
        this.authService.updateCurrentUser(user);
        this.isLoading = false;
        return;
      }
    }

    console.log('No photo found for user');
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

  /* =========================
     GET PHOTO SOURCE
  ========================= */

  getPhotoSource(): string | null {
    // Check local component state first (loaded during init)
    if (this.profilePhoto && (this.profilePhoto.startsWith('data:image') || this.profilePhoto.length > 100)) {
      return this.profilePhoto.startsWith('data:image') ? this.profilePhoto : 'data:image/jpeg;base64,' + this.profilePhoto;
    }

    // Check current user object
    const user = this.user;
    if (user) {
      const uPhoto = user.profilePhoto || user.photo || user.profileImageUrl;
      if (uPhoto && (uPhoto.startsWith('data:image') || uPhoto.length > 100)) {
        return uPhoto.startsWith('data:image') ? uPhoto : 'data:image/jpeg;base64,' + uPhoto;
      }
    }

    // Check latest clearance request
    const request = this.clearanceRequest;
    if (request?.photo && (request.photo.startsWith('data:image') || request.photo.length > 100)) {
      return request.photo.startsWith('data:image') ? request.photo : 'data:image/jpeg;base64,' + request.photo;
    }

    return null;
  }

  hasPhoto(): boolean {
    const source = this.getPhotoSource();
    return !!source && (source.startsWith('data:image') || source.length > 100);
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
    console.log('Image failed to load, clearing photo');
    this.profilePhoto = null;
    const user = this.user;
    if (user) {
      user.profilePhoto = '';
      user.photo = '';
      this.authService.updateCurrentUser(user);
    }
  }
}
