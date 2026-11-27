import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';
import { DashboardHeaderComponent } from '../shared/components/dashboard-header/dashboard-header';
import { StudentSidebarComponent } from '../shared/components/student-sidebar/student-sidebar';
import {
  StaffSidebarNavItem,
  getStaffDashboardRoute,
  getStaffPortalMeta,
  getStaffSidebarNavItems
} from '../core/utils/staff-sidebar-nav.util';

export interface NotificationBadgeMeta {
  label: string;
  cssClass: string;
  icon: string;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent, StudentSidebarComponent],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class NotificationListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  isLoading = true;
  notificationsList: any[] = [];

  // Filter, Search & Pagination
  activeFilter: 'ALL' | 'UNREAD' | 'READ' = 'ALL';
  searchTerm = '';
  currentPage = 1;
  readonly pageSize = 15;

  get user() { return this.authService.getCurrentUser(); }
  get currentUser() { return this.user; }
  get notifications() { return this.notificationsList; }

  get unreadCount(): number {
    return this.notificationsList.filter(n => !n?.read).length;
  }

  get readCount(): number {
    return this.notificationsList.filter(n => Boolean(n?.read)).length;
  }

  get filteredNotifications(): any[] {
    const q = (this.searchTerm || '').trim().toLowerCase();
    return this.notificationsList.filter(item => {
      if (this.activeFilter === 'UNREAD' && item?.read) return false;
      if (this.activeFilter === 'READ' && !item?.read) return false;
      if (q) {
        const hay = `${item?.title || ''} ${item?.message || ''} ${item?.type || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredNotifications.length / this.pageSize));
  }

  get paginatedNotifications(): any[] {
    const safePage = Math.min(this.currentPage, this.totalPages);
    const start = (safePage - 1) * this.pageSize;
    return this.filteredNotifications.slice(start, start + this.pageSize);
  }

  get isStudent(): boolean {
    return !this.currentUser || this.currentUser.role === 'Student';
  }

  get isStationSecretary(): boolean {
    return this.currentUser?.role === 'Station Secretary';
  }

  get isSecretary(): boolean {
    return this.currentUser?.role === 'DUS Examination Office' || this.currentUser?.role === 'DUS Secretary' || this.isStationSecretary;
  }

  get staffNavItems(): StaffSidebarNavItem[] {
    return getStaffSidebarNavItems(this.currentUser);
  }

  get dashboardRoute(): string {
    return getStaffDashboardRoute(this.currentUser?.role);
  }

  get portalTitle(): string {
    return getStaffPortalMeta(this.currentUser?.role).title;
  }

  get portalSubtitle(): string {
    return getStaffPortalMeta(this.currentUser?.role).subtitle;
  }

  get dashboardLabel(): string {
    return getStaffPortalMeta(this.currentUser?.role).dashboardLabel;
  }

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.isLoading = true;
    const uid = this.user?.id || this.user?.userId;
    if (uid && !this.notificationsList.length) {
      this.notificationsList = this.notificationService.getNotifications(uid);
    }
    this.notificationService.getStudentNotifications().subscribe({
      next: serverItems => {
        const seen = new Set<string>();
        const merged: any[] = [];
        for (const item of serverItems || []) {
          const key = String(item?.id ?? `${item?.title}|${item?.message}|${item?.createdAt}`);
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(item);
          }
        }
        this.notificationsList = merged;
        if (this.currentPage > this.totalPages) {
          this.currentPage = 1;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.warn('Could not fetch server notifications:', err);
        this.isLoading = false;
      }
    });
  }

  setFilter(filter: 'ALL' | 'UNREAD' | 'READ'): void {
    this.activeFilter = filter;
    this.currentPage = 1;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getNotificationBadge(notification: any): NotificationBadgeMeta {
    const raw = `${notification?.type || ''} ${notification?.title || ''}`.toUpperCase();
    if (raw.includes('APPROV') || raw.includes('CLEAR') || raw.includes('ISSUED') || raw.includes('HANDOVER')) {
      return { label: 'Approval', cssClass: 'badge-approval', icon: 'bi-check-circle-fill' };
    }
    if (raw.includes('REJECT') || raw.includes('FLAG') || raw.includes('DEBT') || raw.includes('LIABILIT')) {
      return { label: 'Action Needed', cssClass: 'badge-rejection', icon: 'bi-exclamation-triangle-fill' };
    }
    if (raw.includes('PAYMENT') || raw.includes('RECEIPT') || raw.includes('CONTROL') || raw.includes('CONVOCATION')) {
      return { label: 'Payment', cssClass: 'badge-reminder', icon: 'bi-receipt-cutoff' };
    }
    if (raw.includes('DISPATCH') || raw.includes('STATION') || raw.includes('RELEASE') || raw.includes('CERTIFICATE')) {
      return { label: 'Release', cssClass: 'badge-ready', icon: 'bi-patch-check-fill' };
    }
    return { label: 'System', cssClass: 'badge-system', icon: 'bi-bell-fill' };
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
    const uid = this.user?.id || this.user?.userId;
    if (uid) {
      this.notificationService.markAllAsRead(uid);
    }
    this.notificationsList = this.notificationsList.map(item => ({ ...item, read: true }));
  }

  markRead(id: string): void {
    const target = this.notificationsList.find(item => item.id === id);
    if (!target || target.read) return;
    this.notificationService.markAsRead(id);
    this.notificationsList = this.notificationsList.map(item => item.id === id ? { ...item, read: true } : item);
  }
}
