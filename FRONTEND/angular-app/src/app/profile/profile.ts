// profile.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AuthService } from '../core/services/auth.service';
import { ClearanceService } from '../core/services/clearance.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);

  profilePhoto: string | null = null;

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
    const user = this.user;

    if (!user) {
      return;
    }

    // First check if user has a profile photo
    if (user.profilePhoto) {
      this.profilePhoto = user.profilePhoto;
      return;
    }

    // Then check if user has a photo from clearance request
    if (user.photo) {
      this.profilePhoto = user.photo;
      return;
    }

    // Finally check the latest clearance request for photo
    const requests = this.clearanceService.getStudentRequests(user.id);
    const latestRequest = requests.at(-1);

    if (latestRequest && latestRequest.photo) {
      this.profilePhoto = latestRequest.photo;
      // Optionally update the user object with this photo
      user.photo = latestRequest.photo;
      this.authService.updateCurrentUser(user);
    }
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
     ACADEMIC INFORMATION
  ========================= */

  get hasAcademicCredentials(): boolean {
    const user = this.user;

    if (!user) {
      return false;
    }

    return [
      user.college,
      user.department,
      user.programme
    ].every(value => value && value !== 'Not selected');
  }

  /* =========================
     LATEST CLEARANCE REQUEST
  ========================= */

  get clearanceRequest() {
    const user = this.user;

    if (!user) {
      return null;
    }

    return this.clearanceService.getStudentRequests(user.id).at(-1) ?? null;
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
    // Priority order: profilePhoto (user uploaded), photo (from clearance), null
    if (this.user?.profilePhoto) {
      return this.user.profilePhoto;
    }

    if (this.profilePhoto) {
      return this.profilePhoto;
    }

    if (this.user?.photo) {
      return this.user.photo;
    }

    const request = this.clearanceRequest;
    if (request?.photo) {
      return request.photo;
    }

    return null;
  }

  /* =========================
     HAS PHOTO
  ========================= */

  hasPhoto(): boolean {
    return !!this.getPhotoSource();
  }
}