import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';

import { StudentClearanceLookup, StudentDebtFlag } from '../../core/models/student-debt.model';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { StudentDebtService } from '../../core/services/student-debt.service';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

export interface BulkUploadRowError {
  row: number;
  registrationNumber: string;
  message: string;
}

@Component({
  selector: 'app-lecturer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, DashboardHeaderComponent],
  templateUrl: './lecturer.html',
  styleUrl: './lecturer.css'
})
export class LecturerDashboard implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly debts = inject(StudentDebtService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  @ViewChild('bulkFileInput') bulkFileInput?: ElementRef<HTMLInputElement>;

  flags: StudentDebtFlag[] = [];
  sidebarOpen = false;
  isLoading = false;
  isSubmitting = false;
  isResolving = false;
  unreadNotifications = 0;

  error = '';
  message = '';

  // Single-flag form state
  registrationNumber = '';
  studentName = '';
  clearanceLookup: StudentClearanceLookup | null = null;
  clearanceLookupLoading = false;
  clearanceLookupError = '';
  private clearanceLookupSequence = 0;
  private lastCheckedRegNo = '';

  amount: number | null = null;
  category = 'Equipment / Item Rental';
  dueDate = '';
  reason = '';
  negotiationNotes = '';

  // Bulk upload state
  flagMode: 'single' | 'bulk' = 'single';
  selectedBulkFile: File | null = null;
  isBulkUploading = false;
  bulkUploadErrors: BulkUploadRowError[] = [];

  // Resolution modal state
  resolvingFlag: StudentDebtFlag | null = null;
  resolutionNote = '';
  resolutionError = '';

  // Register filtering & pagination
  statusFilter: 'OPEN' | 'RESOLVED' | 'ALL' = 'OPEN';
  searchTerm = '';
  currentPage = 1;
  pageSize = 15;

  private unreadSub: Subscription | null = null;

  readonly itemCategories = [
    'Equipment / Item Rental',
    'Library Book / Material',
    'Laboratory Apparatus',
    'Workshop Tool / Device',
    'Hostel / Room Key',
    'Academic Tuition / Fine',
    'Other Liability'
  ];

  get currentUser() {
    return this.auth.getCurrentUser();
  }

  get lecturerUnit(): string {
    return this.currentUser?.department || this.currentUser?.college || 'Student Debt Register';
  }

  get userInitials(): string {
    const name = this.currentUser?.fullName?.trim();
    if (!name) return 'LC';
    const parts = name.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  // KPI Metrics
  get totalCount(): number {
    return this.flags.length;
  }

  get openCount(): number {
    return this.flags.filter(flag => flag.status === 'OPEN').length;
  }

  get resolvedCount(): number {
    return this.flags.filter(flag => flag.status === 'RESOLVED').length;
  }

  get totalOpenAmount(): number {
    return this.flags
      .filter(flag => flag.status === 'OPEN')
      .reduce((sum, flag) => sum + Number(flag.amount || 0), 0);
  }

  // Filtered & paginated flags
  get filteredFlags(): StudentDebtFlag[] {
    let records = this.flags;
    if (this.statusFilter === 'OPEN') {
      records = records.filter(flag => flag.status === 'OPEN');
    } else if (this.statusFilter === 'RESOLVED') {
      records = records.filter(flag => flag.status === 'RESOLVED');
    }

    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return records;

    return records.filter(flag =>
      (flag.registrationNumber || '').toLowerCase().includes(term) ||
      (flag.studentName || '').toLowerCase().includes(term) ||
      (flag.reason || '').toLowerCase().includes(term) ||
      (flag.category || '').toLowerCase().includes(term) ||
      (flag.department || '').toLowerCase().includes(term) ||
      (flag.college || '').toLowerCase().includes(term) ||
      (flag.programme || '').toLowerCase().includes(term)
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
    this.unreadSub = this.notificationService.unreadCount$.subscribe(count => {
      this.unreadNotifications = count;
    });
    this.notificationService.refreshUnreadCount().subscribe();
    this.loadFlags();
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
    this.unreadSub = null;
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

  clearClearanceLookup(): void {
    this.clearanceLookupSequence += 1;
    this.lastCheckedRegNo = '';
    this.clearanceLookup = null;
    this.clearanceLookupError = '';
    this.clearanceLookupLoading = false;
  }

  checkStudentClearance(force = false): void {
    const regNo = this.registrationNumber.trim();
    if (!regNo) {
      this.clearanceLookup = null;
      this.clearanceLookupError = '';
      return;
    }
    if (this.clearanceLookupLoading) return;
    if (!force && this.clearanceLookup && this.lastCheckedRegNo === regNo.toLowerCase()) return;

    this.clearanceLookup = null;
    this.clearanceLookupError = '';
    const requestSequence = ++this.clearanceLookupSequence;
    this.clearanceLookupLoading = true;

    this.debts.lookupClearance(regNo).subscribe({
      next: result => {
        if (requestSequence !== this.clearanceLookupSequence) return;
        this.clearanceLookup = result;
        this.lastCheckedRegNo = regNo.toLowerCase();
        this.clearanceLookupLoading = false;
      },
      error: err => {
        if (requestSequence !== this.clearanceLookupSequence) return;
        this.clearanceLookupError = err?.error?.message || 'Could not verify clearance status for this registration number.';
        this.clearanceLookupLoading = false;
      }
    });
  }

  loadFlags(): void {
    this.isLoading = true;
    this.error = '';
    this.debts.listForLecturer().subscribe({
      next: flags => {
        this.flags = flags || [];
        this.isLoading = false;
        if (this.currentPage > this.totalPages) {
          this.currentPage = 1;
        }
      },
      error: err => {
        this.error = err?.error?.message || 'Could not load your student debt register.';
        this.isLoading = false;
      }
    });
  }

  createFlag(): void {
    if (this.isSubmitting) return;
    this.error = '';
    this.message = '';

    const regNo = this.registrationNumber.trim();
    const reason = this.reason.trim();

    if (!regNo || !this.amount || this.amount <= 0 || reason.length < 3) {
      this.error = 'Enter a registration number, a positive TZS amount, and a clear description of the liability.';
      return;
    }
    if (this.clearanceLookup?.cleared) {
      this.error = 'This student is already cleared. A debt flag cannot be recorded for a cleared student.';
      return;
    }

    this.isSubmitting = true;
    this.debts.create({
      registrationNumber: regNo,
      studentName: this.studentName.trim() || undefined,
      amount: this.amount,
      reason,
      negotiationNotes: this.negotiationNotes.trim() || undefined,
      category: this.category,
      dueDate: this.dueDate || undefined
    }).subscribe({
      next: flag => {
        this.flags = [flag, ...this.flags];
        this.currentPage = 1;
        this.registrationNumber = '';
        this.studentName = '';
        this.clearClearanceLookup();
        this.amount = null;
        this.reason = '';
        this.negotiationNotes = '';
        this.category = 'Equipment / Item Rental';
        this.dueDate = '';
        this.message = `Liability registered for ${flag.studentName} (${flag.registrationNumber}) under ${flag.category || 'Rental'} and routed to ${flag.department || 'the student department'}. Department clearance is now locked until resolved.`;
        this.isSubmitting = false;
      },
      error: err => {
        this.error = err?.error?.message || 'The debt flag could not be recorded. Verify the registration number and try again.';
        this.isSubmitting = false;
      }
    });
  }

  beginResolution(flag: StudentDebtFlag): void {
    this.resolvingFlag = flag;
    this.resolutionNote = '';
    this.resolutionError = '';
  }

  cancelResolution(): void {
    if (this.isResolving) return;
    this.resolvingFlag = null;
    this.resolutionNote = '';
    this.resolutionError = '';
  }

  resolveFlag(): void {
    if (!this.resolvingFlag || this.isResolving) return;
    const note = this.resolutionNote.trim();
    if (note.length < 5) {
      this.resolutionError = 'Please enter a settlement/negotiation outcome note of at least 5 characters.';
      return;
    }

    this.resolutionError = '';
    this.error = '';
    this.message = '';
    this.isResolving = true;

    const flag = this.resolvingFlag;
    this.debts.resolve(flag.id, note).subscribe({
      next: resolved => {
        this.flags = this.flags.map(item => (item.id === resolved.id ? resolved : item));
        this.isResolving = false;
        this.resolvingFlag = null;
        this.resolutionNote = '';
        this.message = `Liability for ${resolved.studentName} (${resolved.registrationNumber}) has been resolved. Department verification is unlocked for this record.`;
      },
      error: err => {
        this.isResolving = false;
        this.resolutionError = err?.error?.message || 'This debt record could not be resolved. Please try again.';
      }
    });
  }

  onBulkFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] || null;
    this.bulkUploadErrors = [];
    if (!file) {
      this.selectedBulkFile = null;
      return;
    }
    this.selectedBulkFile = file;
    this.message = `Selected file "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Ready for bulk processing.`;
    this.error = '';
  }

  clearBulkFile(): void {
    this.selectedBulkFile = null;
    this.bulkUploadErrors = [];
    if (this.bulkFileInput?.nativeElement) {
      this.bulkFileInput.nativeElement.value = '';
    }
  }

  uploadBulkFlags(): void {
    if (!this.selectedBulkFile || this.isBulkUploading) return;
    this.isBulkUploading = true;
    this.error = '';
    this.bulkUploadErrors = [];
    this.message = 'Processing bulk student liability flags…';

    this.debts.bulkUpload(this.selectedBulkFile).subscribe({
      next: res => {
        this.isBulkUploading = false;
        this.bulkUploadErrors = Array.isArray(res.errors) ? res.errors : [];
        if (res.skippedCount && res.skippedCount > 0) {
          this.message = res.message || `Flagged ${res.count ?? 0} student(s); skipped ${res.skippedCount} row(s).`;
        } else {
          this.message = res.message || 'Successfully uploaded and processed student liability flags.';
        }
        this.selectedBulkFile = null;
        if (this.bulkFileInput?.nativeElement) {
          this.bulkFileInput.nativeElement.value = '';
        }
        this.loadFlags();
      },
      error: err => {
        this.isBulkUploading = false;
        this.message = '';
        this.error = 'Bulk flag upload failed: ' + (err?.error?.message || err?.message || 'Unknown error');
      }
    });
  }

  downloadFlagTemplateCsv(): void {
    const headers = 'Registration Number,Student Name,Category,Amount,Reason,Due Date,Negotiation Notes\r\n';
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'student_debt_flag_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  downloadFlagTemplateExcel(): void {
    const link = document.createElement('a');
    link.href = '/student_debt_flag_template.xlsx?t=' + Date.now();
    link.download = 'student_debt_flag_template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportRegisterCsv(): void {
    const rows = this.filteredFlags;
    if (!rows.length) return;

    const escape = (val: string | number | undefined | null) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const headers = [
      'Registration Number',
      'Student Name',
      'College',
      'Department',
      'Programme',
      'Category',
      'Amount (TZS)',
      'Reason',
      'Due Date',
      'Negotiation Notes',
      'Status',
      'Resolution Note',
      'Recorded At',
      'Resolved At'
    ];

    const lines = [
      headers.map(escape).join(','),
      ...rows.map(f =>
        [
          f.registrationNumber,
          f.studentName,
          f.college,
          f.department,
          f.programme || '',
          f.category || '',
          f.amount,
          f.reason,
          f.dueDate ? f.dueDate.slice(0, 10) : '',
          f.negotiationNotes || '',
          f.status,
          f.resolutionNote || '',
          f.createdAt ? f.createdAt.slice(0, 10) : '',
          f.resolvedAt ? f.resolvedAt.slice(0, 10) : ''
        ].map(escape).join(',')
      )
    ];

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lecturer_debt_register_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
