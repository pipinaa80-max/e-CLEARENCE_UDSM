import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { ClearanceRequest } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { StudentSidebarComponent } from '../../shared/components/student-sidebar/student-sidebar';

@Component({
  selector: 'app-clearance-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent, StudentSidebarComponent],
  templateUrl: './history.html',
  styleUrl: './history.css'
})
export class ClearanceHistoryComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly router = inject(Router);

  filter = 'All';
  sidebarOpen = false;
  isLoading = false;

  ngOnInit(): void {
    const user = this.currentUser;
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    this.clearanceService.fetchMyRequest().subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get requests(): ClearanceRequest[] {
    const user = this.currentUser;
    const requests = user ? this.clearanceService.getClearanceHistory(user.id) : [];
    return this.filter === 'All'
      ? requests
      : requests.filter((request: ClearanceRequest) => request.status === this.filter);
  }

  get total(): number {
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
