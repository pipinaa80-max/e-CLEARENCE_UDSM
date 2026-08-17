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
    const department = this.currentUser?.department || 'Department';
    const programme = this.currentUser?.programme || 'your programme';
    return [
    { name: 'Library', note: 'Books and records review', status: 'Pending' },
    { name: department, note: `Department clearance for ${programme}`, status: 'Pending' },
    { name: 'Finance', note: 'Fee clearance review', status: 'Pending' },
    { name: 'ICT', note: 'System and account check', status: 'Rejected' },
    { name: 'Academic', note: 'Programme and records audit', status: 'Pending' }
    ];
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
