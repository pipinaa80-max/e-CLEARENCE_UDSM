// profile.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../core/services/auth.service';
import { ClearanceService } from '../core/services/clearance.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly fb = inject(FormBuilder);

  profilePhoto: string | null = null;
  isLoading = true;

  showChangePassword = false;
  passwordMessage = '';
  passwordError = '';
  isPasswordLoading = false;

  changePasswordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  });

  /* =========================
     LOGGED-IN STUDENT
  ========================= */

  get user() {
    return this.authService.getCurrentUser();
  }

  /* =========================
     INIT - LOAD PROFILE PHOTO
  ========================= */

  ngOnInit(): void {
    this.loadProfilePhoto();
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
      console.log('Latest request:', {
        id: latestRequest.id,
        hasPhoto: !!latestRequest.photo,
        photoLength: latestRequest.photo ? latestRequest.photo.length : 0,
        status: latestRequest.status
      });

      if (latestRequest.photo && latestRequest.photo.startsWith('data:image')) {
        this.profilePhoto = latestRequest.photo;
        console.log('Photo loaded from clearance request');

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
    // Debug logging
    console.log('getPhotoSource called');
    console.log('profilePhoto:', this.profilePhoto ? 'exists' : 'null');
    console.log('user.photo:', this.user?.photo ? 'exists' : 'null');
    console.log('user.profilePhoto:', this.user?.profilePhoto ? 'exists' : 'null');
    console.log('clearanceRequest.photo:', this.clearanceRequest?.photo ? 'exists' : 'null');

    // Check all sources in priority order
    if (this.profilePhoto && this.profilePhoto.startsWith('data:image')) {
      console.log('Returning profilePhoto');
      return this.profilePhoto;
    }

    if (this.user?.profilePhoto && this.user.profilePhoto.startsWith('data:image')) {
      console.log('Returning user.profilePhoto');
      return this.user.profilePhoto;
    }

    if (this.user?.photo && this.user.photo.startsWith('data:image')) {
      console.log('Returning user.photo');
      return this.user.photo;
    }

    const request = this.clearanceRequest;
    if (request?.photo && request.photo.startsWith('data:image')) {
      console.log('Returning request.photo');
      return request.photo;
    }

    console.log('No valid photo source found');
    return null;
  }

  /* =========================
     HAS PHOTO
  ========================= */

  hasPhoto(): boolean {
    const source = this.getPhotoSource();
    return !!source && source.startsWith('data:image');
  }

  /* =========================
     FORCE REFRESH PHOTO
  ========================= */

  refreshPhoto(): void {
    console.log('Refreshing photo...');
    // Clear cached photo
    this.profilePhoto = null;
    // Reload
    this.loadProfilePhoto();
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

  submitChangePassword(): void {
    this.passwordMessage = '';
    this.passwordError = '';

    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.changePasswordForm.getRawValue();

    if (newPassword !== confirmPassword) {
      this.passwordError = 'Passwords do not match.';
      return;
    }

    this.isPasswordLoading = true;
    this.authService.changePassword({ currentPassword, newPassword }).subscribe({
      next: (res) => {
        this.isPasswordLoading = false;
        this.passwordMessage = res.message || 'Password changed successfully. A confirmation email has been sent.';
        this.changePasswordForm.reset();
        setTimeout(() => this.showChangePassword = false, 3000);
      },
      error: (err) => {
        this.isPasswordLoading = false;
        this.passwordError = err.error?.message || 'Failed to change password. Please check your current password.';
      }
    });
  }
}
