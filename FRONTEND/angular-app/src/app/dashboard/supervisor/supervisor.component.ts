import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';

import { ClearanceOffice, ClearanceRequest, OfficeApproval } from '../../core/models/clearance.model';
import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { isPostgraduateEntity } from '../../core/utils/postgraduate.util';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

export interface ApprovalTrailItem {
  office: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  comment?: string;
}

export interface PostgraduateStudentRow {
  id: string;
  requestId: string;
  registrationNumber: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  programme: string;
  award: string;
  college: string;
  department: string;
  undergraduateCertificateUrl?: string;
  thesisTitle?: string;
  studentRemarks?: string;
  supervisorStatus: 'Pending' | 'Approved' | 'Rejected';
  supervisorReviewedBy?: string;
  supervisorReviewedAt?: string;
  supervisorComments?: string;
  financeStatus: 'Pending' | 'Approved' | 'Rejected';
  departmentStatus: 'Pending' | 'Approved' | 'Rejected';
  principalStatus: 'Pending' | 'Approved' | 'Rejected';
  currentStage: string;
  requestDate: string;
  approvalTrail: ApprovalTrailItem[];
  rawRequest: ClearanceRequest | any;
}

@Component({
  selector: 'app-supervisor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, DashboardHeaderComponent],
  templateUrl: './supervisor.component.html',
  styleUrl: './supervisor.component.css'
})
export class SupervisorDashboardComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly router = inject(Router);

  sidebarOpen = false;
  isLoading = false;
  loadError = '';
  unreadNotifications = 0;

  // Filter & Search state
  searchTerm = '';
  activeTab: 'all' | 'pending' | 'approved' | 'rejected' = 'pending';
  awardFilter = 'ALL';
  departmentFilter = 'ALL';

  // Requests Data
  allRequests: ClearanceRequest[] = [];
  studentRows: PostgraduateStudentRow[] = [];
  selectedIds: Set<string> = new Set();

  // Modals
  selectedStudent: PostgraduateStudentRow | null = null;
  showDetailsModal = false;
  showApproveModal = false;
  showRejectModal = false;
  showWithdrawModal = false;
  showBulkApproveModal = false;
  showCertificatePreviewModal = false;
  certLoadFailed = false;

  // Decision inputs
  approveComments = '';
  rejectReason = '';
  rejectComments = '';
  rejectValidationError = '';
  isProcessing = false;

  // Pagination
  currentPage = 1;
  pageSize = 20;

  private unreadSub: Subscription | null = null;
  private safePdfUrlCache = new Map<string, SafeResourceUrl>();

  readonly rejectReasons = [
    'Undergraduate Certificate missing or unreadable',
    'Thesis / Dissertation corrections pending as requested by examination panel',
    'Final hardbound copies not yet deposited with Department & Library',
    'Required journal publication / manuscript acceptance pending',
    'Other supervisory academic clearance requirement pending'
  ];

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get supervisorDepartment(): string {
    return this.currentUser?.department || 'Postgraduate Research Studies';
  }

  get supervisorCollege(): string {
    return this.currentUser?.college || 'University of Dar es Salaam';
  }

  get userInitials(): string {
    const name = this.currentUser?.fullName?.trim();
    if (!name) return 'SV';
    const parts = name.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  // Honest KPI Metrics
  get totalAssignedCount(): number {
    return this.studentRows.length;
  }

  get pendingReviewCount(): number {
    return this.studentRows.filter(r => r.supervisorStatus === 'Pending').length;
  }

  get readyForFinalCheckCount(): number {
    return this.studentRows.filter(r => r.supervisorStatus === 'Pending' && r.financeStatus === 'Approved').length;
  }

  get approvedCount(): number {
    return this.studentRows.filter(r => r.supervisorStatus === 'Approved').length;
  }

  get rejectedCount(): number {
    return this.studentRows.filter(r => r.supervisorStatus === 'Rejected').length;
  }

  get attachedCertsCount(): number {
    return this.studentRows.filter(r => !!r.undergraduateCertificateUrl).length;
  }

  get availableDepartments(): string[] {
    const set = new Set<string>();
    this.studentRows.forEach(r => {
      if (r.department) set.add(r.department);
    });
    return Array.from(set).sort();
  }

  get filteredStudents(): PostgraduateStudentRow[] {
    let rows = [...this.studentRows];

    if (this.activeTab === 'pending') {
      rows = rows.filter(r => r.supervisorStatus === 'Pending');
    } else if (this.activeTab === 'approved') {
      rows = rows.filter(r => r.supervisorStatus === 'Approved');
    } else if (this.activeTab === 'rejected') {
      rows = rows.filter(r => r.supervisorStatus === 'Rejected');
    }

    if (this.awardFilter !== 'ALL') {
      rows = rows.filter(r => {
        const a = (r.award || '').toLowerCase();
        const p = (r.programme || '').toLowerCase();
        if (this.awardFilter === 'MASTER') {
          return a.includes('master') || p.includes('master') || p.includes('msc') || p.includes('mba') || p.includes('ma ') || p.includes('med');
        }
        if (this.awardFilter === 'PHD') {
          return a.includes('phd') || a.includes('doctor') || p.includes('phd') || p.includes('doctor');
        }
        if (this.awardFilter === 'POSTGRAD_DIPLOMA') {
          return a.includes('postgraduate') || p.includes('postgraduate') || p.includes('pgd');
        }
        return true;
      });
    }

    if (this.departmentFilter !== 'ALL') {
      rows = rows.filter(r => r.department === this.departmentFilter);
    }

    if (this.searchTerm.trim()) {
      const q = this.searchTerm.trim().toLowerCase();
      rows = rows.filter(r =>
        r.fullName.toLowerCase().includes(q) ||
        r.registrationNumber.toLowerCase().includes(q) ||
        r.programme.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.award.toLowerCase().includes(q) ||
        r.college.toLowerCase().includes(q)
      );
    }

    return rows;
  }

  get selectableFilteredStudents(): PostgraduateStudentRow[] {
    return this.filteredStudents.filter(r => r.supervisorStatus !== 'Approved' && r.financeStatus === 'Approved');
  }

  get isAllSelected(): boolean {
    const selectable = this.selectableFilteredStudents;
    return selectable.length > 0 && selectable.every(r => this.selectedIds.has(r.requestId));
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredStudents.length / this.pageSize));
  }

  get paginatedStudents(): PostgraduateStudentRow[] {
    const safePage = Math.min(this.currentPage, this.totalPages);
    const start = (safePage - 1) * this.pageSize;
    return this.filteredStudents.slice(start, start + this.pageSize);
  }

  ngOnInit(): void {
    this.unreadSub = this.notificationService.unreadCount$.subscribe(count => {
      this.unreadNotifications = count;
    });
    this.notificationService.refreshUnreadCount().subscribe();
    this.loadClearanceRequests();
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
    this.unreadSub = null;
  }

  loadClearanceRequests(): void {
    this.isLoading = true;
    this.loadError = '';

    this.clearanceService.getOfficeRequestsBackend('Supervisor' as ClearanceOffice).subscribe({
      next: (requests: ClearanceRequest[]) => {
        this.isLoading = false;
        this.allRequests = requests || [];
        this.mapToPostgraduateRows(this.allRequests);
        this.pruneSelection();
      },
      error: (err: any) => {
        this.isLoading = false;
        this.allRequests = [];
        this.studentRows = [];
        this.selectedIds.clear();
        this.loadError = err?.error?.message || 'Unable to synchronize postgraduate clearance requests from the server. Please try again.';
      }
    });
  }

  private mapToPostgraduateRows(requests: any[]): void {
    const rows: PostgraduateStudentRow[] = [];

    for (const req of requests || []) {
      const award = req.award || req.student?.award || '';
      const prog = req.programme || req.student?.programme || '';
      const isPostgrad = isPostgraduateEntity({
        isPostgraduate: req.isPostgraduate ?? req.is_postgraduate,
        award,
        programme: prog
      });

      const approvals: any[] = Array.isArray(req.approvals) ? req.approvals : [];
      const supervisorApp = approvals.find(a => this.isMatchingOffice(a.department || a.office, 'Supervisor'));
      const financeApp = approvals.find(a => this.isMatchingOffice(a.department || a.office, 'Finance'));
      const deptApp = approvals.find(a => this.isMatchingOffice(a.department || a.office, 'Department'));
      const principalApp = approvals.find(a => this.isMatchingOffice(a.department || a.office, 'Principal'));

      if (!supervisorApp && !isPostgrad) {
        continue;
      }

      const student = req.student || {};
      const regNo = req.registrationNumber || student.registrationNumber || 'N/A';
      const fullName = req.studentName || student.fullName || req.fullName || 'Postgraduate Candidate';
      const email = req.email || student.email || 'Not provided';
      const phone = req.phoneNumber || student.phoneNumber || student.phone || 'Not provided';
      const college = req.college || student.college || student.faculty || 'University of Dar es Salaam';
      const department = req.department || student.department || 'Academic Department';

      const certUrl = (
        req.undergraduateCertificateUrl ||
        req.undergraduate_certificate_url ||
        student.undergraduateCertificateUrl ||
        student.undergraduate_certificate_url ||
        ''
      ).trim();

      const approvalTrail: ApprovalTrailItem[] = approvals.map((a: OfficeApproval | any) => ({
        office: a.office || a.department || 'Office',
        status: this.normalizeStatus(a.status),
        reviewedBy: a.reviewedBy || a.approved_by || undefined,
        reviewedAt: a.reviewedAt || a.approval_date || undefined,
        comment: a.comment || a.comments || undefined
      }));

      rows.push({
        id: String(req.id || req.requestId || regNo),
        requestId: String(req.id || req.requestId || regNo),
        registrationNumber: regNo,
        fullName,
        email,
        phoneNumber: phone,
        programme: prog || 'Postgraduate Programme',
        award: award || this.inferAward(prog),
        college,
        department,
        undergraduateCertificateUrl: certUrl || undefined,
        thesisTitle: (req.thesisTitle || req.thesis_title || '').trim() || undefined,
        studentRemarks: (req.remarks || '').trim() || undefined,
        supervisorStatus: supervisorApp ? this.normalizeStatus(supervisorApp.status) : 'Pending',
        supervisorReviewedBy: supervisorApp?.reviewedBy || supervisorApp?.approved_by || undefined,
        supervisorReviewedAt: supervisorApp?.reviewedAt || supervisorApp?.approval_date || undefined,
        supervisorComments: supervisorApp?.comment || supervisorApp?.comments || '',
        financeStatus: financeApp ? this.normalizeStatus(financeApp.status) : 'Pending',
        departmentStatus: deptApp ? this.normalizeStatus(deptApp.status) : 'Pending',
        principalStatus: principalApp ? this.normalizeStatus(principalApp.status) : 'Pending',
        currentStage: req.currentStage || 'Supervisor',
        requestDate: req.requestDate || req.submittedAt || '',
        approvalTrail,
        rawRequest: req
      });
    }

    this.studentRows = rows;
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  private pruneSelection(): void {
    const validSelectableIds = new Set(
      this.studentRows
        .filter(r => r.supervisorStatus !== 'Approved' && r.financeStatus === 'Approved')
        .map(r => r.requestId)
    );
    for (const id of Array.from(this.selectedIds)) {
      if (!validSelectableIds.has(id)) {
        this.selectedIds.delete(id);
      }
    }
  }

  private normalizeStatus(status: any): 'Pending' | 'Approved' | 'Rejected' {
    if (!status) return 'Pending';
    const s = String(status).toUpperCase();
    if (s.includes('APPROV') || s.includes('CLEAR')) return 'Approved';
    if (s.includes('REJECT')) return 'Rejected';
    return 'Pending';
  }

  private isMatchingOffice(officeName: string, target: string): boolean {
    if (!officeName) return false;
    return officeName.toLowerCase().replace(/[_\s]/g, '') === target.toLowerCase().replace(/[_\s]/g, '');
  }

  private inferAward(programme: string): string {
    const p = (programme || '').toLowerCase();
    if (p.includes('phd') || p.includes('doctor')) return 'PhD Doctoral Degree';
    if (p.includes('postgraduate') || p.includes('pgd')) return 'Postgraduate Diploma';
    return 'Master Degree';
  }

  // Filter & Pagination handlers
  setActiveTab(tab: 'all' | 'pending' | 'approved' | 'rejected'): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.selectedIds.clear();
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
  }

  resetFilters(): void {
    this.activeTab = 'all';
    this.searchTerm = '';
    this.awardFilter = 'ALL';
    this.departmentFilter = 'ALL';
    this.currentPage = 1;
    this.selectedIds.clear();
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

  // Selection
  canSelectRow(row: PostgraduateStudentRow): boolean {
    return row.supervisorStatus !== 'Approved' && row.financeStatus === 'Approved';
  }

  toggleSelectAll(): void {
    if (this.isAllSelected) {
      this.selectedIds.clear();
    } else {
      this.selectableFilteredStudents.forEach(r => this.selectedIds.add(r.requestId));
    }
  }

  toggleRowSelection(row: PostgraduateStudentRow): void {
    if (!this.canSelectRow(row)) return;
    if (this.selectedIds.has(row.requestId)) {
      this.selectedIds.delete(row.requestId);
    } else {
      this.selectedIds.add(row.requestId);
    }
  }

  // Certificate helpers
  isPdfCertificate(url?: string): boolean {
    if (!url) return false;
    const lower = url.trim().toLowerCase();
    return lower.startsWith('data:application/pdf') || /\.pdf(\?.*)?$/.test(lower);
  }

  getSafePdfUrl(url: string): SafeResourceUrl {
    const cached = this.safePdfUrlCache.get(url);
    if (cached) return cached;
    const safe = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.safePdfUrlCache.set(url, safe);
    return safe;
  }

  // Modals & Action Handlers
  openDetails(row: PostgraduateStudentRow): void {
    this.selectedStudent = row;
    this.certLoadFailed = false;
    this.showDetailsModal = true;
  }

  closeDetails(): void {
    this.showDetailsModal = false;
    this.selectedStudent = null;
  }

  openApproveModal(row: PostgraduateStudentRow): void {
    if (row.financeStatus !== 'Approved') {
      this.toastService.warning('Finance Required First', 'Finance clearance must be approved before final supervisory endorsement.');
      return;
    }
    this.selectedStudent = row;
    this.approveComments = 'All prior clearance stages and postgraduate academic requirements verified. Final clearance granted.';
    this.showApproveModal = true;
  }

  closeApproveModal(): void {
    if (this.isProcessing) return;
    this.showApproveModal = false;
  }

  openRejectModal(row: PostgraduateStudentRow): void {
    this.selectedStudent = row;
    this.rejectReason = this.rejectReasons[0];
    this.rejectComments = '';
    this.rejectValidationError = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    if (this.isProcessing) return;
    this.showRejectModal = false;
    this.rejectValidationError = '';
  }

  openWithdrawModal(row: PostgraduateStudentRow): void {
    this.selectedStudent = row;
    this.showWithdrawModal = true;
  }

  closeWithdrawModal(): void {
    if (this.isProcessing) return;
    this.showWithdrawModal = false;
  }

  openBulkApproveModal(): void {
    if (this.selectedIds.size === 0 || this.isProcessing) return;
    this.showBulkApproveModal = true;
  }

  closeBulkApproveModal(): void {
    if (this.isProcessing) return;
    this.showBulkApproveModal = false;
  }

  openCertificatePreview(row: PostgraduateStudentRow): void {
    this.selectedStudent = row;
    this.certLoadFailed = false;
    this.showCertificatePreviewModal = true;
  }

  closeCertificatePreview(): void {
    this.showCertificatePreviewModal = false;
  }

  confirmApproval(): void {
    if (!this.selectedStudent || this.isProcessing) return;
    const student = this.selectedStudent;
    const remarks = this.approveComments.trim() || 'Final postgraduate supervisory clearance granted.';
    this.isProcessing = true;

    this.clearanceService.approveOfficeBackend(student.requestId, 'Supervisor' as ClearanceOffice, remarks).subscribe({
      next: () => {
        this.isProcessing = false;
        this.showApproveModal = false;
        this.showDetailsModal = false;
        this.selectedStudent = null;
        this.selectedIds.delete(student.requestId);
        this.toastService.success(
          'Final Clearance Granted',
          `Postgraduate clearance completed for ${student.fullName} (${student.registrationNumber}).`
        );
        this.loadClearanceRequests();
      },
      error: (err) => {
        this.isProcessing = false;
        const msg = err?.error?.message || 'Could not approve final clearance. Please verify prior stages and try again.';
        this.toastService.error('Approval Failed', msg);
      }
    });
  }

  confirmRejection(): void {
    if (!this.selectedStudent || this.isProcessing) return;
    const isOther = this.rejectReason === this.rejectReasons[this.rejectReasons.length - 1];
    const extra = this.rejectComments.trim();

    if (isOther && extra.length < 5) {
      this.rejectValidationError = 'Please provide detailed instructions (at least 5 characters) when selecting Other.';
      return;
    }

    const fullReason = extra ? `${this.rejectReason}: ${extra}` : this.rejectReason;
    if (fullReason.trim().length < 5) {
      this.rejectValidationError = 'Please enter a rejection reason of at least 5 characters.';
      return;
    }

    this.rejectValidationError = '';
    const student = this.selectedStudent;
    this.isProcessing = true;

    this.clearanceService.rejectOfficeBackend(student.requestId, 'Supervisor' as ClearanceOffice, fullReason).subscribe({
      next: () => {
        this.isProcessing = false;
        this.showRejectModal = false;
        this.showDetailsModal = false;
        this.selectedStudent = null;
        this.selectedIds.delete(student.requestId);
        this.toastService.warning(
          'Clearance Returned',
          `Revision request sent to ${student.fullName} (${student.registrationNumber}).`
        );
        this.loadClearanceRequests();
      },
      error: (err) => {
        this.isProcessing = false;
        const msg = err?.error?.message || 'Could not return clearance application. Please try again.';
        this.toastService.error('Rejection Failed', msg);
      }
    });
  }

  confirmWithdraw(): void {
    if (!this.selectedStudent || this.isProcessing) return;
    const student = this.selectedStudent;
    this.isProcessing = true;

    this.clearanceService.withdrawOfficeBackend(student.requestId, 'Supervisor' as ClearanceOffice).subscribe({
      next: () => {
        this.isProcessing = false;
        this.showWithdrawModal = false;
        this.showDetailsModal = false;
        this.selectedStudent = null;
        this.toastService.info(
          'Decision Withdrawn',
          `Supervisor decision for ${student.fullName} has been returned to Pending.`
        );
        this.loadClearanceRequests();
      },
      error: (err) => {
        this.isProcessing = false;
        const msg = err?.error?.message || 'Could not withdraw decision. Please try again.';
        this.toastService.error('Withdrawal Failed', msg);
      }
    });
  }

  confirmBulkApprove(): void {
    const ids = Array.from(this.selectedIds);
    if (!ids.length || this.isProcessing) return;

    this.isProcessing = true;
    this.clearanceService
      .bulkApproveOfficeBackend(ids, 'Supervisor' as ClearanceOffice, 'Bulk final postgraduate clearance granted by Research Supervisor.')
      .subscribe({
        next: (res) => {
          this.isProcessing = false;
          this.showBulkApproveModal = false;
          this.selectedIds.clear();
          const approved = typeof res?.approvedCount === 'number' ? res.approvedCount : ids.length;
          const skipped = typeof res?.skippedCount === 'number' ? res.skippedCount : 0;
          if (skipped > 0) {
            this.toastService.warning(
              'Bulk Clearance Completed with Skips',
              `Approved ${approved} candidate(s); skipped ${skipped} candidate(s).`
            );
          } else {
            this.toastService.success(
              'Bulk Clearance Complete',
              `Final clearance granted to ${approved} postgraduate candidate(s).`
            );
          }
          this.loadClearanceRequests();
        },
        error: (err) => {
          this.isProcessing = false;
          const msg = err?.error?.message || 'Bulk approval failed. Please retry or approve individually.';
          this.toastService.error('Bulk Approval Failed', msg);
        }
      });
  }

  exportCsv(): void {
    const rows = this.filteredStudents;
    if (!rows.length) {
      this.toastService.info('Nothing to Export', 'No postgraduate candidates match the current filters.');
      return;
    }

    const escape = (val: string | undefined) => {
      const s = String(val ?? '').replace(/"/g, '""');
      return `"${s}"`;
    };

    const headers = [
      'Registration Number',
      'Full Name',
      'Email',
      'Phone',
      'Award',
      'Programme',
      'College',
      'Department',
      'Undergrad Certificate Attached',
      'Finance Status',
      'Supervisor Decision',
      'Reviewed By',
      'Supervisor Comments'
    ];

    const lines = [
      headers.map(escape).join(','),
      ...rows.map(r =>
        [
          r.registrationNumber,
          r.fullName,
          r.email,
          r.phoneNumber,
          r.award,
          r.programme,
          r.college,
          r.department,
          r.undergraduateCertificateUrl ? 'Yes' : 'No',
          r.financeStatus,
          r.supervisorStatus,
          r.supervisorReviewedBy || '',
          r.supervisorComments || ''
        ].map(escape).join(',')
      )
    ];

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `supervisor_postgraduate_clearance_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  exportReport(): void {
    window.print();
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
