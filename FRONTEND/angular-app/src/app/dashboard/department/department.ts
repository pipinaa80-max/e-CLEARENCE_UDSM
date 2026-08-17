import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({ selector: 'app-department-dashboard', standalone: true, imports: [CommonModule, RouterLink], templateUrl: './department.html', styleUrl: './department.css' })
export class DepartmentDashboard {
  private readonly authService = inject(AuthService); private readonly clearanceService = inject(ClearanceService); private readonly notificationService = inject(NotificationService); private readonly router = inject(Router);
  sidebarOpen = false; notice = '';
  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }
  get currentUser() { return this.authService.getCurrentUser(); }
  get requests() { const staff = this.currentUser; return staff ? this.clearanceService.getPendingRequests().filter((request) => this.matchesCollege(request.college, staff.college) && request.department === staff.department) : []; }
  get pendingCount(): number { return this.requests.length; }
  get departmentGuide(): { title: string; checks: string[]; note: string } {
    const department = (this.currentUser?.department ?? '').toLowerCase();
    const sharedChecks = ['Confirm the student programme and department match the academic record.', 'Check the submitted documents before changing the clearance status.', 'Return incomplete applications with a specific correction message.'];
    if (department.includes('computer') || department.includes('telecommunication')) return { title: 'CoICT department guidance', checks: [sharedChecks[0], 'Confirm project, attachment, or laboratory obligations where applicable.', sharedChecks[2]], note: 'Use this workspace only for students assigned to your selected CoICT department.' };
    if (department.includes('engineering')) return { title: 'Engineering department guidance', checks: [sharedChecks[0], 'Confirm workshop, laboratory, and final-project obligations where applicable.', sharedChecks[2]], note: 'Use this workspace only for students assigned to your selected engineering department.' };
    return { title: `${this.currentUser?.department || 'Department'} guidance`, checks: sharedChecks, note: 'Only applications belonging to your assigned department appear in this review queue.' };
  }
  private matchesCollege(requestCollege?: string, staffCollege?: string): boolean {
    if (!requestCollege || !staffCollege) return false;
    return requestCollege === staffCollege || requestCollege.includes(`(${staffCollege})`);
  }
  approve(id: string, studentId: string): void { this.clearanceService.approveClearance(id, 'department'); this.notificationService.createNotification(studentId, 'Department clearance approved', 'Your department has approved your clearance application.', 'success'); this.notice = 'The student application was approved and the student has been notified.'; }
  returnForCorrection(id: string, studentId: string): void { this.clearanceService.rejectClearance(id, 'department', 'Please contact your department office to correct the required academic record.'); this.notificationService.createNotification(studentId, 'Department action required', 'Your department returned your clearance application for correction. Contact the department office for guidance.', 'warning'); this.notice = 'The application was returned to the student with guidance.'; }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
