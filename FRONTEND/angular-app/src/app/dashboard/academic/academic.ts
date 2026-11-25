import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

@Component({
  selector: 'app-academic-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './academic.html',
  styleUrl: './academic.css'
})
export class AcademicDashboard {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly router = inject(Router);
  sidebarOpen = false;

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get requests() {
    return this.clearanceService.getRequestsForOffice('Academic Staff' as any);
  }

  get pendingCount(): number {
    return this.requests.filter(r => r.approvals.find(a => (a.office as string) === 'Academic Staff')?.status === 'Pending').length;
  }

  get approvedCount(): number {
    return this.requests.filter(r => r.approvals.find(a => (a.office as string) === 'Academic Staff')?.status === 'Approved').length;
  }

  get rejectedCount(): number {
    return this.requests.filter(r => r.approvals.find(a => (a.office as string) === 'Academic Staff')?.status === 'Rejected').length;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset['fallback']) {
      img.dataset['fallback'] = '1';
      img.src = '/udsm-logo.jpg';
    } else if (img && img.dataset['fallback'] === '1') {
      img.dataset['fallback'] = '2';
      img.src = 'assets/udsm-logo.png';
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
