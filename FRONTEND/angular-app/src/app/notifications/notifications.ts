import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';
import { DashboardHeaderComponent } from '../shared/components/dashboard-header/dashboard-header';

@Component({ selector: 'app-notifications', standalone: true, imports: [CommonModule, RouterLink, RouterLinkActive, DashboardHeaderComponent], templateUrl: './notifications.html', styleUrl: './notifications.css' })
export class NotificationListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  sidebarOpen = false;
  notificationsList: any[] = [];
  get user() { return this.authService.getCurrentUser(); }
  get currentUser() { return this.user; }
  get notifications() { return this.notificationsList; }

  ngOnInit(): void {
    this.notificationsList = this.user ? this.notificationService.getNotifications(this.user.id) : [];
    this.notificationService.getStudentNotifications().subscribe({
      next: serverItems => {
        const localItems = this.user ? this.notificationService.getNotifications(this.user.id) : [];
        this.notificationsList = [...serverItems, ...localItems];
      }
    });
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
  markAllRead(): void {
    if (this.user) this.notificationService.markAllAsRead(this.user.id);
    this.notificationService.markAllStudentNotificationsRead();
    this.notificationsList = this.notificationsList.map(item => ({ ...item, read: true }));
  }
  markRead(id: string): void {
    this.notificationService.markAsRead(id);
    if (!this.notificationService.getNotifications(this.user?.id ?? '').some(item => item.id === id)) {
      this.notificationService.markStudentNotificationRead(id);
    }
    this.notificationsList = this.notificationsList.map(item => item.id === id ? { ...item, read: true } : item);
  }
}
