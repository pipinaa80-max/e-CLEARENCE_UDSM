import { Component, inject } from '@angular/core';
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
export class StudentDashboard {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  sidebarOpen = false;

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

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

  return Math.round(
    (approved / approvals.length) * 100
  );
}


  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get clearanceStatus(): string {
    if (!this.currentUser) {
      return 'Not Requested';
    }

    return this.clearanceService.getClearanceStatus(this.currentUser.id);
  }

  get currentRequest() {
    return this.currentUser ? this.clearanceService.getStudentRequests(this.currentUser.id).at(-1) ?? null : null;
  }

  get unreadNotifications(): number {
    return this.currentUser ? this.notificationService.getNotifications(this.currentUser.id).filter((item) => !item.read).length : 0;
  }

  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }

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
