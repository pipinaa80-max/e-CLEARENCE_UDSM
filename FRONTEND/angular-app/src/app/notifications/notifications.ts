import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';
import { DashboardHeaderComponent } from '../shared/components/dashboard-header/dashboard-header';
import { UserRole } from '../core/models/user.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, DashboardHeaderComponent],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class NotificationListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  notificationsList: any[] = [];

  get user() { return this.authService.getCurrentUser(); }
  get currentUser() { return this.user; }
  get notifications() { return this.notificationsList; }

  get isStudent(): boolean {
    return !this.currentUser || this.currentUser.role === 'Student';
  }

  get isStationSecretary(): boolean {
    return this.currentUser?.role === 'Station Secretary';
  }

  get isSecretary(): boolean {
    return this.currentUser?.role === 'DUS Secretary' || this.isStationSecretary;
  }

  get dashboardRoute(): string {
    const role: UserRole | undefined = this.currentUser?.role;
    switch (role) {
      case 'DUS Secretary':
        return '/dashboard/dus-secretary';
      case 'Station Secretary':
        return '/dashboard/station-secretary';
      case 'Director of Undergraduate Studies':
        return '/dashboard/director-undergraduate-studies';
      case 'Administrator':
        return '/dashboard/admin';
      case 'Finance':
        return '/dashboard/finance';
      case 'ICT':
        return '/dashboard/ict';
      case 'Library':
        return '/dashboard/library';
      case 'Department':
        return '/department/dashboard';
      case 'Principal':
        return '/dashboard/principal';
      case 'Academic Staff':
        return '/dashboard/academic';
      case 'Lecturer':
        return '/dashboard/lecturer';
      case 'Convocation':
        return '/convocation/dashboard';
      case 'Games Coach':
        return '/dashboard/games-coach';
      case 'Hall Warden':
        return '/dashboard/hall-warden';
      case 'USAB':
        return '/dashboard/usab';
      case 'DARUSO':
        return '/dashboard/daruso';
      case 'Dean of Students':
        return '/dashboard/dean-of-students';
      case 'Smart Card':
        return '/dashboard/smart-card';
      case 'Workshop':
        return '/dashboard/workshop';
      case 'Laboratory':
        return '/dashboard/laboratory';
      case 'Student':
      default:
        return '/dashboard';
    }
  }

  get portalTitle(): string {
    const role = this.currentUser?.role;
    if (!role || role === 'Student') return 'STUDENT PORTAL';
    if (role === 'Station Secretary') return 'STATION DUS PORTAL';
    return `${role.toUpperCase()} PORTAL`;
  }

  get portalSubtitle(): string {
    const role = this.currentUser?.role;
    if (role === 'DUS Secretary') return 'Undergraduate Studies';
    if (role === 'Station Secretary') return 'Receiving & Handover Hub';
    if (role === 'Director of Undergraduate Studies') return 'Directorate Office';
    if (!role || role === 'Student') return 'University of Dar es Salaam';
    return `${role} Office`;
  }

  get dashboardLabel(): string {
    const role = this.currentUser?.role;
    if (role === 'DUS Secretary') return 'Main Campus Dispatch';
    if (role === 'Station Secretary') return 'Station Vault & Intake';
    return 'Dashboard';
  }

  ngOnInit(): void {
    this.notificationsList = this.user ? this.notificationService.getNotifications(this.user.id) : [];
    this.notificationService.getStudentNotifications().subscribe({
      next: serverItems => {
        const localItems = this.user ? this.notificationService.getNotifications(this.user.id) : [];
        this.notificationsList = [...serverItems, ...localItems];
      },
      error: (err) => {
        console.warn('Could not fetch server notifications:', err);
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
