import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';
import { DashboardHeaderComponent } from '../shared/components/dashboard-header/dashboard-header';
import { UserRole } from '../core/models/user.model';
import { NotificationItem } from '../core/models/notification.model';

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
  isLoading = true;
  notificationsList: NotificationItem[] = [];

  get user() { return this.authService.getCurrentUser(); }
  get currentUser() { return this.user; }
  get notifications(): NotificationItem[] { return this.notificationsList; }

  get isStudent(): boolean {
    return !this.currentUser || this.currentUser.role === 'Student';
  }

  get hasUnread(): boolean {
    return this.notificationsList.some(n => !n.read);
  }

  get dashboardRoute(): string {
    const role: UserRole | undefined = this.currentUser?.role;
    switch (role) {
      case 'DUS Secretary':
        return '/dashboard/dus-secretary';
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
    return `${role.toUpperCase()} PORTAL`;
  }

  get portalSubtitle(): string {
    const role = this.currentUser?.role;
    if (role === 'DUS Secretary') return 'Undergraduate Studies';
    if (role === 'Director of Undergraduate Studies') return 'Directorate Office';
    if (!role || role === 'Student') return 'University of Dar es Salaam';
    return `${role} Office`;
  }

  get dashboardLabel(): string {
    const role = this.currentUser?.role;
    if (role === 'DUS Secretary') return 'Collection & Release';
    return 'Dashboard';
  }

  ngOnInit(): void {
    this.isLoading = true;
    this.notificationService.getStudentNotifications().subscribe({
      next: (items) => {
        this.notificationsList = items || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.warn('Could not fetch server notifications:', err);
        this.isLoading = false;
      }
    });

    this.notificationService.notifications$.subscribe(items => {
      this.notificationsList = items || [];
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
    this.notificationService.markAllStudentNotificationsRead().subscribe();
  }

  markRead(id: string): void {
    this.notificationService.markStudentNotificationRead(id).subscribe();
  }

  deleteNotification(event: Event, id: string): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(id).subscribe();
  }

  clearAll(): void {
    this.notificationService.clearAllNotifications().subscribe();
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'APPROVAL': return 'Approved';
      case 'REJECTION': return 'Action Required';
      case 'CLEARANCE_UPDATE': return 'Clearance Update';
      case 'CERTIFICATE_READY': return 'Ready for Collection';
      case 'REMINDER': return 'Reminder';
      case 'SYSTEM': default: return 'Official Notice';
    }
  }

  getTypeClass(type: string): string {
    switch (type) {
      case 'APPROVAL': return 'badge-approval';
      case 'REJECTION': return 'badge-rejection';
      case 'CLEARANCE_UPDATE': return 'badge-update';
      case 'CERTIFICATE_READY': return 'badge-ready';
      case 'REMINDER': return 'badge-reminder';
      case 'SYSTEM': default: return 'badge-system';
    }
  }
}
