import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

@Component({
  selector: 'app-clearance-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, DashboardHeaderComponent],
  templateUrl: './confirmation.html',
  styleUrl: './confirmation.css'
})
export class ClearanceConfirmationComponent {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly router = inject(Router);

  sidebarOpen = false;

  get request() { const user = this.authService.getCurrentUser(); return user ? this.clearanceService.getStudentRequests(user.id).at(-1) ?? null : null; }
  get registrationNumber(): string { return this.authService.getCurrentUser()?.registrationNumber ?? ''; }

  get currentUser() {
    return this.authService.getCurrentUser();
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
