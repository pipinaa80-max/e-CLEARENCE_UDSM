// src/app/dashboard/library/library.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { ClearanceRequest, OfficeApproval } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { ParallelOfficeRequestTableComponent } from '../../shared/components/parallel-office-request-table/parallel-office-request-table';

export interface LibrarySectionItem {
  id: string;
  name: string;
  category: string;
  capacity: number;
  location: string;
  deskLead: string;
  deskContact: string;
  collections: string[];
  description: string;
}

export interface LibraryBreakdownStat {
  label: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  clearanceRate: number;
}

const STORAGE_KEY = 'udsm-library-sections';

const DEFAULT_SECTIONS: LibrarySectionItem[] = [
  {
    id: 'general-lending',
    name: 'General Lending & Circulation Desk',
    category: 'Book Lending & Circulation',
    capacity: 120000,
    location: 'Main Library, Ground Floor',
    deskLead: 'Circulation & Lending Desk',
    deskContact: '+255 22 241 0500',
    collections: ['Undergraduate Textbook Lending', 'Reserve Book Room (RBR)', 'Short Loan Collection'],
    description: 'Central circulation hub verifying returned textbooks, short-loan items, and borrowing account closure.'
  },
  {
    id: 'africana-collection',
    name: 'East Africana & Special Collections',
    category: 'Archival & Research',
    capacity: 45000,
    location: 'Main Library, Level 2',
    deskLead: 'Special Collections Desk',
    deskContact: '+255 22 241 0500',
    collections: ['Theses & Dissertations', 'East African Archives', 'Government Publications'],
    description: 'Preserves rare historical manuscripts, institutional theses, and East African research publications.'
  },
  {
    id: 'reference-periodicals',
    name: 'Reference & Periodicals Wing',
    category: 'Periodicals & Journals',
    capacity: 35000,
    location: 'Main Library, Level 1',
    deskLead: 'Reference & Serials Desk',
    deskContact: '+255 22 241 0500',
    collections: ['Bound Academic Journals', 'Reference Encyclopedias', 'Statistical Abstracts'],
    description: 'Houses print academic journals, reference collections, and official gazettes.'
  },
  {
    id: 'law-annex',
    name: 'Law Library & Legal Collection',
    category: 'Legal Studies',
    capacity: 28000,
    location: 'School of Law Annex',
    deskLead: 'Law Library Desk',
    deskContact: '+255 22 241 0500',
    collections: ['Tanzania Law Reports', 'Statutes & Legislation', 'International Treaties'],
    description: 'Specialized legal reference and case law repository serving School of Law students.'
  },
  {
    id: 'ict-digital-lab',
    name: 'E-Library & Institutional Repository Hub',
    category: 'Digital Repositories',
    capacity: 1500,
    location: 'Main Library, Level 3',
    deskLead: 'Digital Library & Repository Desk',
    deskContact: '+255 22 241 0500',
    collections: ['UDSM Institutional Repository', 'Online Academic Databases', 'Thesis Deposit Verification'],
    description: 'Manages digital database access and verifies postgraduate dissertation repository deposits.'
  },
  {
    id: 'science-annex',
    name: 'Science & Engineering Branch Library',
    category: 'STEM Technical Collections',
    capacity: 40000,
    location: 'CoET Complex, Ground Level',
    deskLead: 'Engineering Branch Desk',
    deskContact: '+255 22 241 0500',
    collections: ['Engineering Handbooks', 'Natural Science Manuals', 'Technical Standards'],
    description: 'Branch library supporting engineering, computing, and natural sciences students.'
  }
];

@Component({
  selector: 'app-library-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent, ParallelOfficeRequestTableComponent],
  templateUrl: './library.html',
  styleUrl: './library.css'
})
export class LibraryDashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  sidebarOpen = false;
  viewMode: 'requests' | 'analytics' | 'sections' = 'requests';

  isLoading = false;
  isSubmitting = false;

  selectedRequest: ClearanceRequest | null = null;
  viewingRequest: ClearanceRequest | null = null;
  enlargedPhotoUrl: string | null = null;

  rejectionComment = '';
  message = '';
  messageState: 'success' | 'error' = 'success';

  searchTerm = '';
  filterStatus: 'All' | 'Pending' | 'Approved' | 'Rejected' = 'Pending';
  currentPage = 1;
  pageSize = 15;

  // Local Library Sections Directory
  sections: LibrarySectionItem[] = [];
  sectionSearchTerm = '';
  showSectionModal = false;
  editingSectionId: string | null = null;
  sectionForm = this.createEmptySectionForm();

  private readonly studentCache = new Map<string, any>();

  ngOnInit(): void {
    const initialTab = this.route.snapshot.queryParamMap.get('tab');
    if (initialTab && ['requests', 'analytics', 'sections'].includes(initialTab)) {
      this.viewMode = initialTab as any;
    }
    this.loadSections();
    this.loadRequests();
  }

  loadRequests(showToast = false): void {
    this.isLoading = true;
    this.clearanceService.fetchOfficeRequests('Library').subscribe({
      next: () => {
        this.isLoading = false;
        this.clampPage();
        if (showToast) {
          this.toastService.success('Refreshed', 'Library clearance queue updated.');
        }
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Unable to load Library clearance requests.';
        this.toastService.error('Load Failed', msg);
      }
    });
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get unreadNotifications(): number {
    return this.notificationService.unreadCount;
  }

  get requests(): ClearanceRequest[] {
    return this.clearanceService.getRequestsForOffice('Library');
  }

  get totalRequestCount(): number {
    return this.requests.length;
  }

  get pendingRequestCount(): number {
    return this.requests.filter(r => this.getRequestOfficeStatus(r) === 'Pending').length;
  }

  get approvedRequestCount(): number {
    return this.requests.filter(r => this.getRequestOfficeStatus(r) === 'Approved').length;
  }

  get rejectedRequestCount(): number {
    return this.requests.filter(r => this.getRequestOfficeStatus(r) === 'Rejected').length;
  }

  get clearanceRatePercent(): number {
    if (!this.totalRequestCount) return 0;
    return Math.round((this.approvedRequestCount / this.totalRequestCount) * 100);
  }

  get pendingPercent(): number {
    if (!this.totalRequestCount) return 0;
    return Math.round((this.pendingRequestCount / this.totalRequestCount) * 100);
  }

  get rejectedPercent(): number {
    if (!this.totalRequestCount) return 0;
    return Math.round((this.rejectedRequestCount / this.totalRequestCount) * 100);
  }

  get filteredRequests(): ClearanceRequest[] {
    let list = this.requests;

    if (this.filterStatus !== 'All') {
      list = list.filter(r => this.getRequestOfficeStatus(r) === this.filterStatus);
    }

    const q = this.searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        this.getStudentName(r).toLowerCase().includes(q) ||
        this.getStudentRegNumber(r).toLowerCase().includes(q) ||
        (r.programme || '').toLowerCase().includes(q) ||
        (r.college || '').toLowerCase().includes(q)
      );
    }

    return list;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRequests.length / this.pageSize));
  }

  get paginatedRequests(): ClearanceRequest[] {
    const safePage = Math.min(this.currentPage, this.totalPages);
    const start = (safePage - 1) * this.pageSize;
    return this.filteredRequests.slice(start, start + this.pageSize);
  }

  get collegeBreakdown(): LibraryBreakdownStat[] {
    const map = new Map<string, { total: number; approved: number; pending: number; rejected: number }>();

    for (const req of this.requests) {
      const label = (req.college || '').trim() || 'Unspecified College';
      const entry = map.get(label) || { total: 0, approved: 0, pending: 0, rejected: 0 };
      entry.total += 1;
      const st = this.getRequestOfficeStatus(req);
      if (st === 'Approved') entry.approved += 1;
      else if (st === 'Rejected') entry.rejected += 1;
      else entry.pending += 1;
      map.set(label, entry);
    }

    return Array.from(map.entries())
      .map(([label, stats]) => ({
        label,
        ...stats,
        clearanceRate: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }

  setViewMode(mode: 'requests' | 'analytics' | 'sections'): void {
    this.viewMode = mode;
    this.closeSidebar();
  }

  filterByCard(status: 'All' | 'Pending' | 'Approved' | 'Rejected'): void {
    this.viewMode = 'requests';
    this.filterStatus = status;
    this.currentPage = 1;
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  clampPage(): void {
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    if (this.currentPage < 1) this.currentPage = 1;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  /* =========================
     STUDENT & APPROVAL HELPERS
  ========================= */

  private getStudentData(studentId: string): any | null {
    if (this.studentCache.has(studentId)) {
      return this.studentCache.get(studentId);
    }
    try {
      const raw = localStorage.getItem('udsm-local-users');
      if (raw) {
        const users = JSON.parse(raw);
        if (Array.isArray(users)) {
          const match = users.find((u: any) => u.id === studentId) || null;
          this.studentCache.set(studentId, match);
          return match;
        }
      }
    } catch {
      // Ignore storage access errors
    }
    this.studentCache.set(studentId, null);
    return null;
  }

  getStudentName(request: ClearanceRequest): string {
    if (request.studentName) return request.studentName;
    const u = this.getStudentData(request.studentId);
    return u?.fullName || [u?.firstName, u?.lastName].filter(Boolean).join(' ') || request.registrationNumber || 'Student';
  }

  getStudentRegNumber(request: ClearanceRequest): string {
    return request.registrationNumber || request.studentId;
  }

  getStudentPhoto(request: ClearanceRequest): string | null {
    let photo = request.photo;
    if (!photo) {
      const u = this.getStudentData(request.studentId);
      photo = u?.photo || u?.profilePhoto || u?.profileImageUrl;
    }
    if (!photo) return null;
    if (photo.startsWith('data:image') || photo.startsWith('http') || photo.startsWith('/') || photo.startsWith('assets/')) {
      return photo;
    }
    return photo.length > 50 ? `data:image/jpeg;base64,${photo}` : photo;
  }

  getStudentInitials(name?: string): string {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  getOfficeApproval(request: ClearanceRequest): OfficeApproval | undefined {
    return request.approvals?.find(a => a.office === 'Library');
  }

  getRequestOfficeStatus(request: ClearanceRequest): 'Pending' | 'Approved' | 'Rejected' {
    return this.getOfficeApproval(request)?.status || 'Pending';
  }

  getRequestReviewer(request: ClearanceRequest): string {
    return this.getOfficeApproval(request)?.reviewedBy || 'Not reviewed yet';
  }

  getRequestReviewedAt(request: ClearanceRequest): string | null {
    return this.getOfficeApproval(request)?.reviewedAt || null;
  }

  getRequestComment(request: ClearanceRequest): string {
    return this.getOfficeApproval(request)?.comment || '';
  }

  getStatusSummary(request: ClearanceRequest): string {
    const status = this.getRequestOfficeStatus(request);
    if (status === 'Approved') return 'Cleared by University Library — all book loans and repository checks satisfied';
    if (status === 'Rejected') return 'Action required — library items, fines, or repository deposit flagged';
    return 'Awaiting librarian verification of borrowed books, fines, and repository compliance';
  }

  /* =========================
     MODALS & ACTIONS
  ========================= */

  openStudentDetails(request: ClearanceRequest): void {
    this.viewingRequest = request;
  }

  closeStudentDetails(): void {
    this.viewingRequest = null;
  }

  openPhotoLightbox(url: string | null): void {
    if (url) this.enlargedPhotoUrl = url;
  }

  closePhotoLightbox(): void {
    this.enlargedPhotoUrl = null;
  }

  openRejectModal(request: ClearanceRequest): void {
    this.viewingRequest = null;
    this.selectedRequest = request;
    this.rejectionComment = '';
    this.message = '';
  }

  closeRejectModal(): void {
    if (this.isSubmitting) return;
    this.selectedRequest = null;
    this.rejectionComment = '';
  }

  async approve(request: ClearanceRequest): Promise<void> {
    if (this.isSubmitting) return;
    const staff = this.currentUser;
    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }

    this.isSubmitting = true;
    const studentName = this.getStudentName(request);
    try {
      const ok = await this.clearanceService.approveRequest(request.id, 'Library', staff.fullName || 'Library Officer');
      if (!ok) {
        this.messageState = 'error';
        this.message = 'Library approval could not be completed. Refresh the dashboard and try again.';
        this.toastService.error('Approval Failed', this.message);
        return;
      }

      this.viewingRequest = null;
      this.messageState = 'success';
      this.message = `Library clearance approved for ${studentName} (${this.getStudentRegNumber(request)}).`;
      this.toastService.success('Library Cleared', `${studentName} has been cleared by the Library.`);
      this.clampPage();
    } finally {
      this.isSubmitting = false;
    }
  }

  async reject(): Promise<void> {
    if (!this.selectedRequest || this.isSubmitting) return;
    const staff = this.currentUser;
    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }

    const trimmed = this.rejectionComment.trim();
    if (trimmed.length < 5) {
      this.messageState = 'error';
      this.message = 'Please enter a clear rejection reason (at least 5 characters).';
      return;
    }

    const target = this.selectedRequest;
    const studentName = this.getStudentName(target);
    this.isSubmitting = true;
    try {
      const ok = await this.clearanceService.rejectRequest(target.id, 'Library', staff.fullName || 'Library Officer', trimmed);
      if (!ok) {
        this.messageState = 'error';
        this.message = 'Library return could not be processed. Refresh the dashboard and try again.';
        this.toastService.error('Rejection Failed', this.message);
        return;
      }

      this.selectedRequest = null;
      this.rejectionComment = '';
      this.messageState = 'success';
      this.message = `Library clearance returned for ${studentName}. Student has been notified.`;
      this.toastService.warning('Library Rejected', `${studentName} was flagged for library follow-up.`);
      this.clampPage();
    } finally {
      this.isSubmitting = false;
    }
  }

  onTableMutated(): void {
    this.loadRequests();
  }

  /* =========================
     LOCAL SECTIONS DIRECTORY CRUD
  ========================= */

  private createEmptySectionForm() {
    return {
      name: '',
      category: 'Book Lending & Circulation',
      capacity: null as number | null,
      location: 'Main Library',
      deskLead: '',
      deskContact: '',
      collectionsText: '',
      description: ''
    };
  }

  loadSections(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          this.sections = parsed.map((s: any) => ({
            ...s,
            deskLead: s.deskLead || s.librarianName || 'Library Section Desk',
            deskContact: s.deskContact || s.librarianContact || '+255 22 241 0500',
            collections: Array.isArray(s.collections) ? s.collections : []
          }));
          return;
        }
      }
    } catch {
      // Fall back to defaults
    }
    this.sections = [...DEFAULT_SECTIONS];
  }

  private saveSectionsToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sections));
    } catch {
      // Ignore storage errors
    }
  }

  get filteredSections(): LibrarySectionItem[] {
    const q = this.sectionSearchTerm.trim().toLowerCase();
    if (!q) return this.sections;
    return this.sections.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.location.toLowerCase().includes(q) ||
      s.deskLead.toLowerCase().includes(q) ||
      s.collections.some(c => c.toLowerCase().includes(q))
    );
  }

  openAddSectionModal(): void {
    this.editingSectionId = null;
    this.sectionForm = this.createEmptySectionForm();
    this.showSectionModal = true;
  }

  openEditSectionModal(section: LibrarySectionItem): void {
    this.editingSectionId = section.id;
    this.sectionForm = {
      name: section.name,
      category: section.category,
      capacity: section.capacity,
      location: section.location,
      deskLead: section.deskLead,
      deskContact: section.deskContact,
      collectionsText: (section.collections || []).join(', '),
      description: section.description
    };
    this.showSectionModal = true;
  }

  closeSectionModal(): void {
    this.showSectionModal = false;
    this.editingSectionId = null;
  }

  saveSection(): void {
    const name = this.sectionForm.name.trim();
    if (!name) {
      this.toastService.warning('Validation Error', 'Library section name is required.');
      return;
    }

    const collections = this.sectionForm.collectionsText.split(',').map(c => c.trim()).filter(Boolean);
    const id = this.editingSectionId || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const section: LibrarySectionItem = {
      id,
      name,
      category: this.sectionForm.category.trim() || 'General Section',
      capacity: this.sectionForm.capacity ? Number(this.sectionForm.capacity) : 0,
      location: this.sectionForm.location.trim() || 'Main Library',
      deskLead: this.sectionForm.deskLead.trim() || 'Library Section Desk',
      deskContact: this.sectionForm.deskContact.trim() || '+255 22 241 0500',
      collections: collections.length ? collections : ['General Collection'],
      description: this.sectionForm.description.trim() || 'University library section.'
    };

    const idx = this.sections.findIndex(s => s.id === id);
    if (idx >= 0) this.sections[idx] = section;
    else this.sections.push(section);

    this.saveSectionsToStorage();
    this.closeSectionModal();
    this.toastService.success('Saved', `"${name}" saved to local Library directory.`);
  }

  deleteSection(section: LibrarySectionItem): void {
    if (!confirm(`Remove "${section.name}" from the local Library sections directory?`)) return;
    this.sections = this.sections.filter(s => s.id !== section.id);
    this.saveSectionsToStorage();
    this.toastService.info('Removed', `"${section.name}" removed from local directory.`);
  }

  resetSections(): void {
    if (!confirm('Reset the local Library sections directory to defaults?')) return;
    this.sections = [...DEFAULT_SECTIONS];
    this.saveSectionsToStorage();
    this.toastService.success('Restored', 'Library sections directory restored to defaults.');
  }

  /* =========================
     CSV EXPORT & LOGOUT
  ========================= */

  downloadAnalyticsCsv(): void {
    const rows: string[][] = [
      ['UNIVERSITY OF DAR ES SALAAM - LIBRARY CLEARANCE REPORT'],
      [`Generated On: ${new Date().toLocaleString()}`],
      [],
      ['SUMMARY METRICS'],
      ['Metric', 'Value'],
      ['Total Requests', String(this.totalRequestCount)],
      ['Pending Review', String(this.pendingRequestCount)],
      ['Approved', String(this.approvedRequestCount)],
      ['Rejected', String(this.rejectedRequestCount)],
      ['Clearance Rate', `${this.clearanceRatePercent}%`],
      [],
      ['COLLEGE BREAKDOWN'],
      ['College', 'Total', 'Approved', 'Pending', 'Rejected', 'Clearance Rate %'],
      ...this.collegeBreakdown.map(item => [
        item.label,
        String(item.total),
        String(item.approved),
        String(item.pending),
        String(item.rejected),
        `${item.clearanceRate}%`
      ])
    ];

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `library-clearance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toastService.success('Export Ready', 'Library clearance report downloaded as CSV.');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
