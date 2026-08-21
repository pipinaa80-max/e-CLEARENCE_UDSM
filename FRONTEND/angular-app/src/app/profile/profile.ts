import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ClearanceService } from '../core/services/clearance.service';

@Component({ selector: 'app-profile', standalone: true, imports: [CommonModule, RouterLink], templateUrl: './profile.html', styleUrl: './profile.css' })
export class ProfileComponent {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  get user() { return this.authService.getCurrentUser(); }
  get initials(): string { return this.user?.fullName.split(' ').map((part: any[]) => part[0]).slice(0,2).join('').toUpperCase() || 'ST'; }
  get hasAcademicCredentials(): boolean {
    const user = this.user;
    return !!user && [user.college, user.department, user.programme].every((value) => value && value !== 'Not selected');
  }
  get clearanceRequest() {
    return this.user ? this.clearanceService.getStudentRequests(this.user.id).at(-1) ?? null : null;
  }
  get canStartClearance(): boolean {
    return !!this.clearanceRequest && this.clearanceRequest.status === 'Pending';
  }
}
