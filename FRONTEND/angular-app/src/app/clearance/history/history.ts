import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { ClearanceRequest } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

@Component({ selector: 'app-clearance-history', standalone: true, imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent], templateUrl: './history.html', styleUrl: './history.css' })
export class ClearanceHistoryComponent {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  filter = 'All';
  sidebarOpen = false;

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get requests(): ClearanceRequest[] {
    const user = this.currentUser;
    const requests = user ? this.clearanceService.getClearanceHistory(user.id) : [];
    return this.filter === 'All' ? requests : requests.filter((request: ClearanceRequest) => request.status === this.filter);
  }

  get total() {
    const user = this.currentUser;
    return user ? this.clearanceService.getClearanceHistory(user.id).length : 0;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
