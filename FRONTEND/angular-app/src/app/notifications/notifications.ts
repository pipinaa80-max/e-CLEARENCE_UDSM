import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';
import { DashboardHeaderComponent } from '../shared/components/dashboard-header/dashboard-header';

@Component({ selector: 'app-notifications', standalone: true, imports: [CommonModule, RouterLink, DashboardHeaderComponent], templateUrl: './notifications.html', styleUrl: './notifications.css' })
export class NotificationListComponent {
  private readonly authService = inject(AuthService); private readonly notificationService = inject(NotificationService);
  sidebarOpen = false;
  get user() { return this.authService.getCurrentUser(); }
  get currentUser() { return this.user; }
  get notifications() { return this.user ? this.notificationService.getNotifications(this.user.id) : []; }

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
  markAllRead(): void { if (this.user) this.notificationService.markAllAsRead(this.user.id); }
  markRead(id: string): void { this.notificationService.markAsRead(id); }
}
