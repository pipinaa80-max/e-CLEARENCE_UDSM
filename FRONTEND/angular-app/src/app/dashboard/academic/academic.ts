import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { StudentDebtFlag } from '../../core/models/student-debt.model';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { StudentDebtService } from '../../core/services/student-debt.service';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

@Component({
  selector: 'app-academic-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './academic.html',
  styleUrl: './academic.css'
})
export class AcademicDashboard implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly debtService = inject(StudentDebtService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  sidebarOpen = false;
  activeSection: 'liabilities' | 'guidance' = 'liabilities';
  isLoading = false;
  loadError = '';
  unreadNotifications = 0;

  openFlags: StudentDebtFlag[] = [];
  searchTerm = '';
  selectedCategory = 'ALL';
  currentPage = 1;
  pageSize = 15;

  private unreadSub: Subscription | null = null;

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get staffUnit(): string {
    return this.currentUser?.department || this.currentUser?.college || 'Academic Department';
  }

  get userInitials(): string {
    const name = this.currentUser?.fullName?.trim();
    if (!name) return 'AS';
    const parts = name.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  get openFlagsCount(): number {
    return this.openFlags.length;
  }

  get uniqueFlaggedStudentsCount(): number {
    return new Set(this.openFlags.map(f => (f.registrationNumber || f.studentId || '').toLowerCase()).filter(Boolean)).size;
  }

  get totalOpenLiabilityValue(): number {
    return this.openFlags.reduce((sum, f) => sum + Number(f.amount || 0), 0);
  }

  get availableCategories(): string[] {
    return Array.from(new Set(this.openFlags.map(f => f.category).filter((c): c is string => !!c))).sort();
  }

  get filteredFlags(): StudentDebtFlag[] {
    let list = this.openFlags;
    if (this.selectedCategory !== 'ALL') {
      list = list.filter(f => f.category === this.selectedCategory);
    }
    const q = this.searchTerm.trim().toLowerCase();
    if (!q) return list;
    return list.filter(f =>
      (f.registrationNumber || '').toLowerCase().includes(q) ||
      (f.studentName || '').toLowerCase().includes(q) ||
      (f.reason || '').toLowerCase().includes(q) ||
      (f.category || '').toLowerCase().includes(q) ||
      (f.lecturerName || '').toLowerCase().includes(q) ||
      (f.department || '').toLowerCase().includes(q)
    );
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredFlags.length / this.pageSize));
  }

  get paginatedFlags(): StudentDebtFlag[] {
    const safePage = Math.min(this.currentPage, this.totalPages);
    const start = (safePage - 1) * this.pageSize;
    return this.filteredFlags.slice(start, start + this.pageSize);
  }

  ngOnInit(): void {
    const initialTab = this.route.snapshot.queryParamMap.get('tab');
    if (initialTab && ['liabilities', 'guidance'].includes(initialTab)) {
      this.activeSection = initialTab as any;
    }
    this.unreadSub = this.notificationService.unreadCount$.subscribe(count => {
      this.unreadNotifications = count;
    });
    this.notificationService.refreshUnreadCount().subscribe();
    this.loadDepartmentLiabilities();
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
    this.unreadSub = null;
  }

  loadDepartmentLiabilities(): void {
    this.isLoading = true;
    this.loadError = '';
    this.debtService.listOpenForDepartment().subscribe({
      next: flags => {
        this.openFlags = flags || [];
        this.isLoading = false;
        if (this.currentPage > this.totalPages) {
          this.currentPage = 1;
        }
      },
      error: err => {
        this.isLoading = false;
        this.openFlags = [];
        this.loadError = err?.error?.message || 'Unable to load open departmental liability records from the server.';
      }
    });
  }

  setSection(sec: 'liabilities' | 'guidance'): void {
    this.activeSection = sec;
    this.closeSidebar();
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset['fallback']) {
      img.dataset['fallback'] = '1';
      img.src = '/udsm-logo.jpg';
    } else if (img && img.dataset['fallback'] === '1') {
      img.dataset['fallback'] = '2';
      img.src = 'assets/udsm-logo.png';
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
