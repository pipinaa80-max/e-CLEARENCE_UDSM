import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

@Component({
  selector: 'app-ict-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './ict.html',
  styleUrl: './ict.css'
})
export class IctDashboard {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly router = inject(Router);
  sidebarOpen = false;

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get requests() {
    return this.clearanceService.getRequestsForOffice('ICT' as any);
  }

  get pendingCount(): number {
    return this.requests.filter(r => r.approvals.find(a => (a.office as string) === 'ICT')?.status === 'Pending').length;
  }

  get clearedCount(): number {
    return this.requests.filter(r => r.approvals.find(a => (a.office as string) === 'ICT')?.status === 'Approved').length;
  }

  get rejectedCount(): number {
    return this.requests.filter(r => r.approvals.find(a => (a.office as string) === 'ICT')?.status === 'Rejected').length;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
