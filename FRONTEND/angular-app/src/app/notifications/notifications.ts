import { ChangeDetectorRef, Component, HostListener, inject, NgZone, OnInit } from '@angular/core';
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
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);

  sidebarOpen = false;
  userDropdownOpen = false;
  isLoading = true;
  profilePhoto: string | null = null;
  photoLoadFailed = false;
  notificationsList: NotificationItem[] = [];

  get user() { return this.authService.getCurrentUser(); }
  get currentUser() { return this.user; }
  get notifications(): NotificationItem[] { return this.notificationsList; }

  get unreadCount(): number {
    return this.notificationsList.filter(n => !n.read).length;
  }

  toggleUserDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.userDropdownOpen = !this.userDropdownOpen;
  }

  closeUserDropdown(): void {
    this.userDropdownOpen = false;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.userDropdownOpen = false;
  }

  hasPhoto(): boolean {
    return !this.photoLoadFailed && !!this.getPhotoSource();
  }

  getPhotoSource(): string | null {
    return this.profilePhoto || this.authService.getProfilePhotoSource(this.currentUser);
  }

  onImageError(): void {
    this.profilePhoto = null;
    this.photoLoadFailed = true;
  }

  get isStudent(): boolean {
    const role = String(this.currentUser?.role || '').trim().toUpperCase();
    return !this.currentUser || role === 'STUDENT';
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
    if (this.isStudent) return 'STUDENT PORTAL';
    const role = this.currentUser?.role || 'Staff';
    return `${role.toUpperCase()} PORTAL`;
  }

  get portalSubtitle(): string {
    if (this.isStudent) return 'University of Dar es Salaam';
    const role = this.currentUser?.role;
    if (role === 'DUS Secretary') return 'Undergraduate Studies';
    if (role === 'Director of Undergraduate Studies') return 'Directorate Office';
    return `${role} Office`;
  }

  get dashboardLabel(): string {
    const role = this.currentUser?.role;
    if (role === 'DUS Secretary') return 'Collection & Release';
    return 'Dashboard';
  }

  private sanitizeNotifications(items: NotificationItem[]): NotificationItem[] {
    return (items || []).filter(item => {
      const title = (item.title || '').toLowerCase();
      const msg = (item.message || '').toLowerCase();
      // Remove any ready for collection notice after clearance process
      if (title.includes('ready for collection') || msg.includes('ready for physical collection')) {
        return false;
      }
      return true;
    }).map(item => {
      if (item.type === 'CERTIFICATE_READY' as any) {
        return { ...item, type: 'CLEARANCE_UPDATE' as any };
      }
      return item;
    });
  }

  ngOnInit(): void {
    const cached = this.notificationService.getNotifications();
    if (cached && cached.length > 0) {
      this.notificationsList = this.sanitizeNotifications(cached);
      this.isLoading = false;
    } else {
      this.isLoading = true;
    }

    this.notificationService.getStudentNotifications().subscribe({
      next: (items) => {
        this.ngZone.run(() => {
          this.notificationsList = this.sanitizeNotifications(items);
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.warn('Could not fetch server notifications:', err);
        this.ngZone.run(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      }
    });

    this.notificationService.notifications$.subscribe(items => {
      this.ngZone.run(() => {
        if (items && items.length > 0) {
          this.notificationsList = this.sanitizeNotifications(items);
          this.isLoading = false;
        }
        this.cdr.detectChanges();
      });
    });

    // Professional fast disappear fallback (never keep user waiting for spinner)
    setTimeout(() => {
      if (this.isLoading) {
        this.ngZone.run(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      }
    }, 350);
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
    this.notificationService.markAllStudentNotificationsRead().subscribe({
      next: () => {
        this.notificationsList = this.notificationsList.map(n => ({ ...n, read: true }));
        this.cdr.detectChanges();
      }
    });
  }

  markRead(id: string): void {
    this.notificationsList = this.notificationsList.map(n => n.id === id ? { ...n, read: true } : n);
    this.cdr.detectChanges();
    this.notificationService.markStudentNotificationRead(id).subscribe();
  }

  deleteNotification(event: Event, id: string): void {
    event.stopPropagation();
    this.notificationsList = this.notificationsList.filter(n => n.id !== id);
    this.cdr.detectChanges();
    this.notificationService.deleteNotification(id).subscribe();
  }

  clearAll(): void {
    this.notificationsList = [];
    this.cdr.detectChanges();
    this.notificationService.clearAllNotifications().subscribe();
  }

  getTypeLabel(type: string, title?: string): string {
    const t = String(type || '').toUpperCase();
    const ttl = String(title || '').toLowerCase();
    if (t === 'CERTIFICATE_READY' || ttl.includes('clearance complete')) {
      return 'Clearance Complete';
    }
    switch (t) {
      case 'APPROVAL': return 'Approved';
      case 'REJECTION': return 'Action Required';
      case 'CLEARANCE_UPDATE': return 'Clearance Update';
      case 'REMINDER': return 'Reminder';
      case 'SYSTEM': default: return 'Official Notice';
    }
  }

  getTypeClass(type: string, title?: string): string {
    const t = String(type || '').toUpperCase();
    const ttl = String(title || '').toLowerCase();
    if (t === 'CERTIFICATE_READY' || ttl.includes('clearance complete')) {
      return 'badge-approval';
    }
    switch (t) {
      case 'APPROVAL': return 'badge-approval';
      case 'REJECTION': return 'badge-rejection';
      case 'CLEARANCE_UPDATE': return 'badge-update';
      case 'REMINDER': return 'badge-reminder';
      case 'SYSTEM': default: return 'badge-system';
    }
  }
}
