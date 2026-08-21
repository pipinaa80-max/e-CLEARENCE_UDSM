import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';

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

  // Cache the current user to avoid repeated calls
  private _currentUser: any = null;

  ngOnInit(): void {
    // Fetch fresh user data on component initialization
    this.refreshUserData();
  }

  refreshUserData(): void {
    // Get user from storage first
    this._currentUser = this.authService.getCurrentUser();

    // Optionally fetch fresh profile from backend
    if (this._currentUser) {
      this.authService.getProfile().subscribe({
        next: (user) => {
          this._currentUser = user;
        },
        error: (error) => {
          console.error('Failed to refresh user profile:', error);
          // Still use cached user data
        }
      });
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  // Get offices with proper data handling
  get offices() {
    const request = this.currentRequest;
    if (!request) return [];
    return request.approvals.map((approval) => ({
      name: approval.office,
      note: this.getOfficeNote(approval.office),
      status: approval.status || 'Pending'
    }));
  }

  private getOfficeNote(office: string): string {
    const notes: Record<string, string> = {
      'Convocation': 'Payment and receipt verification',
      'Department': 'Department approval',
      'Principal': 'Principal approval',
      'Finance': 'Final financial clearance approval',
      'Library': 'Library clearance',
      'Hall Warden': 'Hostel clearance',
      'Dean of Students': 'Students affairs clearance',
      'Games Coach': 'Sports clearance',
      'USAB': 'USAB clearance',
      'DARUSO': 'DARUSO clearance',
      'Smart Card': 'Smart card clearance'
    };
    return notes[office] || 'Pending approval';
  }

  // Main currentUser getter - this is what's used in the template
  get currentUser() {
    return this._currentUser || this.authService.getCurrentUser();
  }

  // Get clearance status from the current request
  get clearanceStatus(): string {
    const request = this.currentRequest;
    if (!request) {
      return 'Not Requested';
    }

    // Check if all offices are approved
    const allApproved = request.approvals.every((a: any) => a.status === 'Approved');
    if (allApproved) {
      return 'Completed';
    }

    // Check if any are rejected
    const hasRejected = request.approvals.some((a: any) => a.status === 'Rejected');
    if (hasRejected) {
      return 'Rejected';
    }

    // Check if any are pending
    const hasPending = request.approvals.some((a: any) => a.status === 'Pending');
    if (hasPending) {
      return 'In Progress';
    }

    return 'In Progress';
  }

  get currentRequest() {
    const user = this.currentUser;
    if (!user) return null;
    return this.clearanceService.getStudentRequests(user.id).at(-1) ?? null;
  }

  get unreadNotifications(): number {
    const user = this.currentUser;
    if (!user) return 0;
    return this.notificationService.getNotifications(user.id)
        .filter((item) => !item.read).length;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get completedOffices(): number {
    return this.offices.filter((office) => office.status === 'Approved').length;
  }

  get pendingOffices(): number {
    return this.offices.filter((office) => office.status === 'Pending').length;
  }

  get rejectedOffices(): number {
    return this.offices.filter((office) => office.status === 'Rejected').length;
  }
}