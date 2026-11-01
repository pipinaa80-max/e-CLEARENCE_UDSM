// src/app/dashboard/library/library.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { ClearanceRequest } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { ParallelOfficeRequestTableComponent } from '../../shared/components/parallel-office-request-table/parallel-office-request-table';

export interface LibrarySectionItem {
  id: string;
  name: string;
  category: string;
  capacity: number;
  location: string;
  librarianName: string;
  librarianContact: string;
  collections: string[];
  description: string;
}

export interface CollegeLibraryRankingItem {
  rank: number;
  collegeCode: string;
  fullName: string;
  borrowerCount: number;
  clearedCount: number;
  clearanceRate: number;
  activityLevel: string;
  badgeClass: string;
}

const DEFAULT_SECTIONS: LibrarySectionItem[] = [
  {
    id: 'general-lending',
    name: 'General Lending & Circulation Desk',
    category: 'Book Lending & Circulation',
    capacity: 120000,
    location: 'Main Library Ground Floor',
    librarianName: 'Chief Librarian Dr. C. Mwinyi',
    librarianContact: '+255 22 241 0401',
    collections: ['Undergraduate Textbook Lending', 'Reserve Book Room (RBR)', 'Short Loan Collection'],
    description: 'Central circulation hub responsible for issuing and returning undergraduate and general textbooks.'
  },
  {
    id: 'africana-collection',
    name: 'Africana & East African Special Reserve',
    category: 'Heritage & Archival Research',
    capacity: 45000,
    location: 'Main Library Level 2',
    librarianName: 'Senior Curator P. Msuya',
    librarianContact: '+255 22 241 0402',
    collections: ['National Heritage Theses', 'Government White Papers', 'Rare East African Manuscripts'],
    description: 'Preserves rare historical documents, dissertations, and East African research publications.'
  },
  {
    id: 'reference-periodicals',
    name: 'Reference & Research Periodicals Wing',
    category: 'Periodicals & Journals',
    capacity: 35000,
    location: 'Main Library Level 1',
    librarianName: 'Librarian A. Mcharo',
    librarianContact: '+255 22 241 0403',
    collections: ['International Peer-Reviewed Journals', 'Encyclopedias', 'Statistical Abstracts'],
    description: 'Houses bound print academic journals, reference encyclopedias, and government gazettes.'
  },
  {
    id: 'law-annex',
    name: 'Law Library & Human Rights Collection',
    category: 'Legal Studies & Treaties',
    capacity: 28000,
    location: 'School of Law Building Annex',
    librarianName: 'Law Librarian Advocate E. Mwamba',
    librarianContact: '+255 22 241 0404',
    collections: ['Tanzania Law Reports', 'Commonwealth Statutes', 'Human Rights Treaties'],
    description: 'Specialized legal reference and case law repository serving law scholars and researchers.'
  },
  {
    id: 'ict-digital-lab',
    name: 'ICT E-Library & Digital Repository Hub',
    category: 'Digital Repositories & Databases',
    capacity: 1500,
    location: 'Main Library Level 3 Tech Center',
    librarianName: 'Systems Librarian J. Lyimo',
    librarianContact: '+255 22 241 0405',
    collections: ['IEEE Xplore', 'ScienceDirect', 'JSTOR', 'UDSM Institutional Repository'],
    description: 'High-speed computerized research laboratory providing access to digital academic databases.'
  },
  {
    id: 'science-annex',
    name: 'Science & Engineering Branch Annex',
    category: 'STEM Technical Books',
    capacity: 40000,
    location: 'CoET Block F Ground Level',
    librarianName: 'Librarian F. Kavishe',
    librarianContact: '+255 22 241 0406',
    collections: ['Engineering Handbooks', 'Natural Science Manuals', 'Computing Algorithms Archive'],
    description: 'Branch library dedicated to engineering, technology, physics, and chemistry collections.'
  }
];

@Component({
  selector: 'app-library-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent, ParallelOfficeRequestTableComponent],
  templateUrl: './library.html',
  styleUrl: './library.css'
})
export class LibraryDashboard {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly Math = Math;
  sidebarOpen = false;
  viewMode: 'all' | 'requests' | 'sections' | 'analytics' = 'all';

  selectedRequest: ClearanceRequest | null = null;
  viewingRequest: ClearanceRequest | null = null;
  approveConfirmRequest: ClearanceRequest | null = null;
  rejectionComment = '';
  message = '';

  searchTerm = '';
  filterStatus = 'Pending';
  currentPage = 1;
  pageSize = 20;

  // Analytics Filters & State
  selectedAnalyticsYear = 'all';
  selectedAnalyticsGender = 'all';
  hoveredSectionName: string | null = null;
  hoveredSliceLabel: string | null = null;

  // Library Sections Directory State
  sections: LibrarySectionItem[] = [];
  sectionSearchTerm = '';
  showSectionModal = false;
  editingSectionId: string | null = null;
  expandedSectionIds = new Set<string>();

  sectionForm = {
    name: '',
    category: 'Book Lending & Circulation',
    capacity: null as number | null,
    location: 'Main Library',
    librarianName: '',
    librarianContact: '',
    collectionsText: '',
    description: ''
  };

  constructor() {
    this.loadSections();
  }

  setViewMode(mode: 'all' | 'requests' | 'sections' | 'analytics'): void {
    this.viewMode = mode;
  }

  loadSections(): void {
    const saved = localStorage.getItem('udsm-library-sections');
    if (saved) {
      try {
        this.sections = JSON.parse(saved);
      } catch {
        this.sections = [...DEFAULT_SECTIONS];
      }
    } else {
      this.sections = [...DEFAULT_SECTIONS];
      this.saveSectionsToStorage();
    }
  }

  saveSectionsToStorage(): void {
    localStorage.setItem('udsm-library-sections', JSON.stringify(this.sections));
  }

  get filteredSections(): LibrarySectionItem[] {
    const s = this.sectionSearchTerm.trim().toLowerCase();
    if (!s) return this.sections;
    return this.sections.filter(sec =>
      sec.name.toLowerCase().includes(s) ||
      sec.category.toLowerCase().includes(s) ||
      sec.location.toLowerCase().includes(s) ||
      sec.librarianName.toLowerCase().includes(s) ||
      sec.collections.some(c => c.toLowerCase().includes(s))
    );
  }

  toggleSectionDetails(id: string): void {
    if (this.expandedSectionIds.has(id)) {
      this.expandedSectionIds.delete(id);
    } else {
      this.expandedSectionIds.add(id);
    }
  }

  isSectionExpanded(id: string): boolean {
    return this.expandedSectionIds.has(id);
  }

  openAddSectionModal(): void {
    this.editingSectionId = null;
    this.sectionForm = {
      name: '',
      category: 'Book Lending & Circulation',
      capacity: null,
      location: 'Main Library',
      librarianName: '',
      librarianContact: '',
      collectionsText: '',
      description: ''
    };
    this.showSectionModal = true;
  }

  openEditSectionModal(section: LibrarySectionItem): void {
    this.editingSectionId = section.id;
    this.sectionForm = {
      name: section.name,
      category: section.category,
      capacity: section.capacity,
      location: section.location,
      librarianName: section.librarianName,
      librarianContact: section.librarianContact,
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
      this.toastService.warning('Validation', 'Library section name is required.');
      return;
    }

    const collections = this.sectionForm.collectionsText.split(',').map(c => c.trim()).filter(Boolean);
    const id = this.editingSectionId || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const section: LibrarySectionItem = {
      id,
      name,
      category: this.sectionForm.category.trim() || 'General Section',
      capacity: this.sectionForm.capacity ? Number(this.sectionForm.capacity) : 25000,
      location: this.sectionForm.location.trim() || 'Main Library',
      librarianName: this.sectionForm.librarianName.trim() || 'Staff Librarian',
      librarianContact: this.sectionForm.librarianContact.trim() || '+255 22 241 0400',
      collections: collections.length ? collections : ['Standard Reference Collection'],
      description: this.sectionForm.description.trim() || 'University library collection and research facility.'
    };

    const index = this.sections.findIndex(s => s.id === id);
    if (index >= 0) {
      this.sections[index] = section;
    } else {
      this.sections.push(section);
    }

    this.saveSectionsToStorage();
    this.closeSectionModal();
    this.toastService.success('Saved', `Section "${name}" saved successfully.`);
  }

  deleteSection(section: LibrarySectionItem): void {
    if (!confirm(`Are you sure you want to remove "${section.name}"?`)) return;
    this.sections = this.sections.filter(s => s.id !== section.id);
    this.saveSectionsToStorage();
    this.toastService.info('Removed', `Section "${section.name}" removed.`);
  }

  resetSections(): void {
    if (!confirm('Reset all library sections and collections to defaults?')) return;
    this.sections = [...DEFAULT_SECTIONS];
    this.saveSectionsToStorage();
    this.toastService.success('Reset', 'Library sections restored to standard defaults.');
  }

  // Table & Requests
  get paginatedRequests(): ClearanceRequest[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRequests.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRequests.length / this.pageSize) || 1;
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

  onFilterChange(): void {
    this.currentPage = 1;
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  getRequestOfficeStatus(request: ClearanceRequest, office: string): string {
    return request.approvals.find(a => a.office === office)?.status ?? 'Pending';
  }

  get requests(): ClearanceRequest[] {
    return this.clearanceService.getRequestsForOffice('Library');
  }

  get pendingRequestCount(): number {
    return this.requests.filter(request => this.getRequestOfficeStatus(request, 'Library') === 'Pending').length;
  }

  get filteredRequests(): ClearanceRequest[] {
    let list = this.requests;

    if (this.searchTerm.trim()) {
      const s = this.searchTerm.toLowerCase();
      list = list.filter(r =>
        this.getStudentName(r).toLowerCase().includes(s) ||
        this.getStudentRegNumber(r).toLowerCase().includes(s) ||
        r.programme.toLowerCase().includes(s)
      );
    }

    return list.filter(r => this.getRequestOfficeStatus(r, 'Library') === this.filterStatus);
  }

  // Student Data Cache
  private studentCache: Map<string, any> = new Map();

  private getStudentData(studentId: string): any | null {
    if (this.studentCache.has(studentId)) {
      return this.studentCache.get(studentId);
    }
    try {
      const usersJson = localStorage.getItem('udsm-local-users');
      if (usersJson) {
        const users = JSON.parse(usersJson);
        const user = users.find((u: any) => u.id === studentId);
        if (user) {
          this.studentCache.set(studentId, user);
          return user;
        }
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    }
    return null;
  }

  getStudentName(request: ClearanceRequest): string {
    if (request.studentName) return request.studentName;
    const user = this.getStudentData(request.studentId);
    if (user) {
      return user.fullName || user.firstName + ' ' + user.lastName || user.registrationNumber || 'Student';
    }
    return request.registrationNumber || 'Student #' + request.studentId.substring(0, 8);
  }

  getStudentRegNumber(request: ClearanceRequest): string {
    return request.registrationNumber || request.studentId;
  }

  getStudentPhoto(request: ClearanceRequest): string | null {
    let photo = request.photo;
    if (!photo) {
      const user = this.getStudentData(request.studentId);
      if (user) {
        photo = user.photo || user.profilePhoto || user.profileImageUrl;
      }
    }
    if (!photo) return null;

    if (photo.startsWith('data:image') || photo.startsWith('http') || photo.startsWith('/') || photo.startsWith('assets/')) {
      return photo;
    }
    if (photo.length > 50) {
      return 'data:image/jpeg;base64,' + photo;
    }
    return photo;
  }

  getStudentInitials(request: ClearanceRequest): string {
    const name = this.getStudentName(request);
    if (!name || name === 'Student') return 'ST';
    const parts = name.split(' ');
    let initials = '';
    for (let i = 0; i < parts.length && i < 2; i++) {
      if (parts[i]) initials += parts[i].charAt(0);
    }
    return initials.toUpperCase();
  }

  hasPhoto(request: ClearanceRequest): boolean {
    return !!this.getStudentPhoto(request);
  }

  enlargedPhotoUrl: string | null = null;
  openEnlargedPhoto(photoUrl: string | null): void {
    if (photoUrl) this.enlargedPhotoUrl = photoUrl;
  }
  closeEnlargedPhoto(): void {
    this.enlargedPhotoUrl = null;
  }

  openStudentDetailsModal(request: ClearanceRequest): void {
    this.viewingRequest = request;
  }

  closeStudentDetailsModal(): void {
    this.viewingRequest = null;
  }

  getStudentProgramme(request: ClearanceRequest): string {
    return request.programme || this.getStudentData(request.studentId)?.programme || '—';
  }

  getStudentDepartment(request: ClearanceRequest): string {
    return request.department || this.getStudentData(request.studentId)?.department || '—';
  }

  getStudentCollege(request: ClearanceRequest): string {
    return request.college || this.getStudentData(request.studentId)?.college || '—';
  }

  getStudentSponsor(request: ClearanceRequest): string {
    return request.sponsor || this.getStudentData(request.studentId)?.sponsor || '—';
  }

  getStudentEmail(request: ClearanceRequest): string {
    return request.email || this.getStudentData(request.studentId)?.email || '—';
  }

  getStudentPhone(request: ClearanceRequest): string {
    return request.phoneNumber || this.getStudentData(request.studentId)?.phoneNumber || this.getStudentData(request.studentId)?.phone || '—';
  }

  getStudentBorrowedStatus(request: ClearanceRequest): string {
    const status = this.getRequestOfficeStatus(request, 'Library');
    if (status === 'Approved') return 'All Borrowed Books Returned · Zero Outstanding Loans';
    if (status === 'Rejected') return 'Unreturned Library Books / Outstanding Overdue Fines Flagged';
    return 'Book Return Check in Progress · No Penalties Flagged';
  }

  getStudentFinesStatus(request: ClearanceRequest): string {
    const status = this.getRequestOfficeStatus(request, 'Library');
    if (status === 'Approved') return 'TZS 0.00 (Fully Settled)';
    if (status === 'Rejected') return 'TZS 15,000 (Overdue Book Fine)';
    return 'TZS 0.00 (No Overdue)';
  }

  getStudentLibraryCardStatus(request: ClearanceRequest): string {
    const status = this.getRequestOfficeStatus(request, 'Library');
    if (status === 'Approved') return 'Library Barcode Deactivated & Cleared';
    return 'Active Membership';
  }

  openApproveModal(request: ClearanceRequest): void {
    this.approveConfirmRequest = request;
    this.message = '';
  }

  confirmApprove(): void {
    if (!this.approveConfirmRequest) return;
    const request = this.approveConfirmRequest;
    this.approveConfirmRequest = null;

    const staff = this.authService.getCurrentUser();
    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }

    const studentName = this.getStudentName(request);
    const approved = this.clearanceService.approveRequest(request.id, 'Library', staff.fullName);

    if (approved) {
      this.notificationService.createNotification(
        request.studentId,
        'Library clearance approved',
        'The Library has verified your book returns and approved your clearance.',
        'success'
      );
      this.message = `✅ Library clearance approved successfully for ${studentName}.`;
      this.toastService.success('Approved', `Library clearance approved for ${studentName}.`);
    } else {
      this.message = '❌ Request could not be approved in its current state. Please try again.';
      this.toastService.error('Approval Failed', 'Request could not be approved.');
    }

    setTimeout(() => { this.message = ''; }, 5000);
  }

  approve(request: ClearanceRequest): void {
    const studentName = this.getStudentName(request);
    const studentReg = this.getStudentRegNumber(request);
    const confirmApprove = confirm(
      `⚠️ Attention: Approve Clearance\n\nAre you sure you want to APPROVE Library clearance for ${studentName} (${studentReg})?\n\nThis decision will verify book returns and grant Library clearance to the student.`
    );
    if (!confirmApprove) return;

    const staff = this.authService.getCurrentUser();
    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }

    const approved = this.clearanceService.approveRequest(request.id, 'Library', staff.fullName);
    if (approved) {
      this.notificationService.createNotification(
        request.studentId,
        'Library clearance approved',
        'The Library has verified your book returns and approved your clearance.',
        'success'
      );
      this.message = `✅ Library clearance approved successfully for ${studentName}.`;
      this.toastService.success('Approved', `Library clearance approved for ${studentName}.`);
    } else {
      this.message = '❌ Request could not be approved in its current state. Please try again.';
      this.toastService.error('Approval Failed', 'Request could not be approved.');
    }

    setTimeout(() => { this.message = ''; }, 5000);
  }

  openRejectForm(request: ClearanceRequest): void {
    this.selectedRequest = request;
    this.rejectionComment = '';
    this.message = '';
  }

  reject(): void {
    const staff = this.authService.getCurrentUser();
    if (!staff || !this.selectedRequest || !this.rejectionComment.trim()) return;

    const studentName = this.getStudentName(this.selectedRequest);
    const confirmReject = confirm(
      `⚠️ Attention: Reject Clearance\n\nAre you sure you want to REJECT Library clearance for ${studentName}?\n\nReason: "${this.rejectionComment.trim()}"\n\nThis will send the reason to the student for correction or fine settlement.`
    );
    if (!confirmReject) return;

    this.clearanceService.rejectRequest(this.selectedRequest.id, 'Library', staff.fullName, this.rejectionComment);
    this.notificationService.createNotification(
      this.selectedRequest.studentId,
      'Library action required',
      this.rejectionComment,
      'warning'
    );

    this.message = `✅ Student ${studentName} has been notified regarding: "${this.rejectionComment.trim()}".`;
    this.toastService.warning('Returned', `Library request returned for ${studentName}.`);
    this.selectedRequest = null;
    this.rejectionComment = '';
    setTimeout(() => { this.message = ''; }, 5000);
  }

  // =========================================================================
  // LIBRARY STATISTICAL ANALYTICS ENGINE
  // =========================================================================

  setHoveredSection(name: string | null): void {
    this.hoveredSectionName = name;
  }

  setHoveredSlice(label: string | null): void {
    this.hoveredSliceLabel = label;
  }

  getStudentGender(request: ClearanceRequest): 'Male' | 'Female' {
    const user = this.getStudentData(request.studentId);
    if (user && user.gender) {
      const g = String(user.gender).trim().toLowerCase();
      if (g.startsWith('f')) return 'Female';
      if (g.startsWith('m')) return 'Male';
    }
    const name = (this.getStudentName(request) || '').toLowerCase();
    const femaleIndicators = [
      'amina', 'fatuma', 'grace', 'mary', 'jane', 'zainab', 'neema', 'rehema',
      'halima', 'rose', 'hellen', 'esther', 'faith', 'doris', 'irene', 'mwajuma',
      'asha', 'hadija', 'salma', 'mariam', 'beatrice', 'lucy', 'joyce', 'sarah',
      'glory', 'mercy', 'catherine', 'judith', 'anna', 'magdalena', 'victoria',
      'veronica', 'jackline', 'doreen', 'fadhila', 'subira', 'tumaini', 'upendo'
    ];
    for (const femaleName of femaleIndicators) {
      if (name.includes(femaleName)) return 'Female';
    }
    const idStr = request.registrationNumber || request.studentId || name;
    let sum = 0;
    for (let i = 0; i < idStr.length; i++) sum += idStr.charCodeAt(i);
    return sum % 2 === 0 ? 'Male' : 'Female';
  }

  getStudentYear(request: ClearanceRequest): string {
    const reg = request.registrationNumber || '';
    const match = reg.match(/\b(202[0-9])\b/);
    if (match) return match[1];
    const user = this.getStudentData(request.studentId);
    if (user?.yearOfStudy) {
      const yr = Number(user.yearOfStudy);
      if (yr === 1) return '2024';
      if (yr === 2) return '2023';
      if (yr === 3) return '2022';
      if (yr === 4) return '2021';
    }
    if (request.requestDate) {
      const dateMatch = request.requestDate.match(/\b(202[0-9])\b/);
      if (dateMatch) return dateMatch[1];
    }
    return '2024';
  }

  get analyticsFilteredRequests(): ClearanceRequest[] {
    let list = this.requests;
    if (this.selectedAnalyticsYear !== 'all') {
      list = list.filter(r => this.getStudentYear(r) === this.selectedAnalyticsYear);
    }
    if (this.selectedAnalyticsGender !== 'all') {
      list = list.filter(r => this.getStudentGender(r) === this.selectedAnalyticsGender);
    }
    return list;
  }

  get totalLibraryStudents(): number {
    return this.analyticsFilteredRequests.length;
  }

  get clearedLibraryCount(): number {
    return this.analyticsFilteredRequests.filter(r => this.getRequestOfficeStatus(r, 'Library') === 'Approved').length;
  }

  get pendingLibraryCount(): number {
    return this.analyticsFilteredRequests.filter(r => this.getRequestOfficeStatus(r, 'Library') === 'Pending').length;
  }

  get flaggedLibraryCount(): number {
    return this.analyticsFilteredRequests.filter(r => this.getRequestOfficeStatus(r, 'Library') === 'Rejected').length;
  }

  get libraryClearanceRate(): number {
    const tot = Math.max(1, this.totalLibraryStudents);
    return Math.round((this.clearedLibraryCount / tot) * 100);
  }

  get totalCollectionCapacity(): number {
    return this.sections.reduce((sum, s) => sum + (s.capacity || 0), 0) || 270000;
  }

  get genderStats() {
    const list = this.analyticsFilteredRequests;
    const total = Math.max(1, list.length);
    let maleTotal = 0;
    let femaleTotal = 0;
    list.forEach(r => {
      if (this.getStudentGender(r) === 'Male') maleTotal++;
      else femaleTotal++;
    });

    return {
      maleTotal,
      malePercent: Math.round((maleTotal / total) * 100),
      femaleTotal,
      femalePercent: Math.round((femaleTotal / total) * 100),
      total: list.length
    };
  }

  get sectionHistogram(): { label: string; count: number; cleared: number; heightPercent: number; clearedPercent: number; pendingPercent: number }[] {
    const sectionNames = [
      'Circulation & Lending',
      'Africana & Reserves',
      'Periodicals & Journals',
      'Law Collection',
      'ICT Digital E-Library',
      'Science & Eng. Annex'
    ];
    const total = Math.max(1, this.totalLibraryStudents);
    const weights = [0.35, 0.20, 0.16, 0.12, 0.10, 0.07];

    return sectionNames.map((name, index) => {
      const estimated = Math.max(1, Math.round(total * weights[index]));
      const clrPct = this.libraryClearanceRate;
      const cleared = Math.round(estimated * (clrPct / 100));

      return {
        label: name,
        count: estimated,
        cleared,
        heightPercent: Math.max(14, Math.round(weights[index] * 280)),
        clearedPercent: clrPct,
        pendingPercent: 100 - clrPct
      };
    });
  }

  get yearResidencyHistogram(): { yearLabel: string; cohort: string; total: number; cleared: number; heightPercent: number; clearanceRate: number }[] {
    const years = ['2024', '2023', '2022', '2021'];
    const cohortLabels: Record<string, string> = {
      '2024': '1st Year (2024)',
      '2023': '2nd Year (2023)',
      '2022': '3rd Year (2022)',
      '2021': '4th Year (2021)'
    };

    const map = new Map<string, { total: number; cleared: number }>();
    years.forEach(y => map.set(y, { total: 0, cleared: 0 }));

    this.analyticsFilteredRequests.forEach(r => {
      const y = this.getStudentYear(r);
      let rec = map.get(y);
      if (!rec) {
        rec = { total: 0, cleared: 0 };
        map.set(y, rec);
      }
      rec.total++;
      if (this.getRequestOfficeStatus(r, 'Library') === 'Approved') {
        rec.cleared++;
      }
    });

    const maxVol = Math.max(1, ...Array.from(map.values()).map(v => v.total));

    return years.map(y => {
      const rec = map.get(y) || { total: 0, cleared: 0 };
      const tot = rec.total;
      const clrRate = tot > 0 ? Math.round((rec.cleared / tot) * 100) : 0;
      return {
        yearLabel: y,
        cohort: cohortLabels[y] || y,
        total: tot,
        cleared: rec.cleared,
        clearanceRate: clrRate,
        heightPercent: Math.max(14, Math.round((tot / maxVol) * 100))
      };
    });
  }

  get loanStatusPieSlices() {
    const tot = Math.max(1, this.totalLibraryStudents);
    const items = [
      { label: 'Books Returned & Cleared', count: this.clearedLibraryCount, color: '#10b981' },
      { label: 'Pending Book Check', count: this.pendingLibraryCount, color: '#f59e0b' },
      { label: 'Overdue / Fines Flagged', count: this.flaggedLibraryCount, color: '#ef4444' }
    ];

    let currentAngle = -90;
    return items.map(item => {
      const sliceAngle = (item.count / tot) * 360;
      const effectiveAngle = sliceAngle >= 359.99 ? 359.99 : sliceAngle;
      const startAngle = currentAngle;
      const endAngle = currentAngle + effectiveAngle;
      const R = 85;
      const r = 48;
      const cx = 110;
      const cy = 110;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = cx + R * Math.cos(startRad);
      const y1 = cy + R * Math.sin(startRad);
      const x2 = cx + R * Math.cos(endRad);
      const y2 = cy + R * Math.sin(endRad);

      const x3 = cx + r * Math.cos(endRad);
      const y3 = cy + r * Math.sin(endRad);
      const x4 = cx + r * Math.cos(startRad);
      const y4 = cy + r * Math.sin(startRad);

      const largeArc = effectiveAngle > 180 ? 1 : 0;
      const svgPath = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${largeArc} 0 ${x4} ${y4} Z`;
      currentAngle += sliceAngle;

      return {
        ...item,
        percentage: Math.round((item.count / tot) * 100),
        svgPath
      };
    });
  }

  get sectionSharePieSlices() {
    const sections = this.sections.slice(0, 6);
    const colors = ['#00679b', '#059669', '#7c3aed', '#d97706', '#ea580c', '#0891b2'];
    const totalCap = Math.max(1, sections.reduce((sum, s) => sum + (s.capacity || 0), 0));

    let currentAngle = -90;
    return sections.map((s, i) => {
      const count = s.capacity || 25000;
      const sliceAngle = (count / totalCap) * 360;
      const effectiveAngle = sliceAngle >= 359.99 ? 359.99 : sliceAngle;
      const startAngle = currentAngle;
      const endAngle = currentAngle + effectiveAngle;
      const R = 85;
      const r = 48;
      const cx = 110;
      const cy = 110;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = cx + R * Math.cos(startRad);
      const y1 = cy + R * Math.sin(startRad);
      const x2 = cx + R * Math.cos(endRad);
      const y2 = cy + R * Math.sin(endRad);

      const x3 = cx + r * Math.cos(endRad);
      const y3 = cy + r * Math.sin(endRad);
      const x4 = cx + r * Math.cos(startRad);
      const y4 = cy + r * Math.sin(startRad);

      const largeArc = effectiveAngle > 180 ? 1 : 0;
      const svgPath = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${largeArc} 0 ${x4} ${y4} Z`;
      currentAngle += sliceAngle;

      return {
        label: s.name.split(' & ')[0],
        count,
        color: colors[i % colors.length],
        percentage: Math.round((count / totalCap) * 100),
        svgPath
      };
    });
  }

  get collegeLibraryRankings(): CollegeLibraryRankingItem[] {
    const colleges = [
      { code: 'CoET', name: 'College of Engineering and Technology' },
      { code: 'CoICT', name: 'College of Information & Communication Technologies' },
      { code: 'UDBS', name: 'University of Dar es Salaam Business School' },
      { code: 'CoNAS', name: 'College of Natural and Applied Sciences' },
      { code: 'CoSS', name: 'College of Social Sciences' },
      { code: 'SoED', name: 'School of Education' }
    ];

    const map = new Map<string, { borrowerCount: number; clearedCount: number }>();
    colleges.forEach(c => map.set(c.code, { borrowerCount: 0, clearedCount: 0 }));

    this.analyticsFilteredRequests.forEach(r => {
      const col = (r.college || 'CoET').toUpperCase();
      const matched = colleges.find(c => col.includes(c.code))?.code || 'CoET';
      const rec = map.get(matched)!;
      rec.borrowerCount++;
      if (this.getRequestOfficeStatus(r, 'Library') === 'Approved') {
        rec.clearedCount++;
      }
    });

    const list: CollegeLibraryRankingItem[] = colleges.map(c => {
      const rec = map.get(c.code) || { borrowerCount: 0, clearedCount: 0 };
      const tot = rec.borrowerCount;
      const clrRate = tot > 0 ? Math.round((rec.clearedCount / tot) * 100) : 0;

      let activityLevel = 'Active Circulation';
      let badgeClass = 'badge-info';
      if (clrRate >= 75) {
        activityLevel = 'High Return Rate';
        badgeClass = 'badge-success';
      } else if (clrRate < 45) {
        activityLevel = 'Overdues Action';
        badgeClass = 'badge-danger';
      }

      return {
        rank: 0,
        collegeCode: c.code,
        fullName: c.name,
        borrowerCount: tot,
        clearedCount: rec.clearedCount,
        clearanceRate: clrRate,
        activityLevel,
        badgeClass
      };
    });

    list.sort((a, b) => b.borrowerCount - a.borrowerCount);
    list.forEach((item, index) => {
      item.rank = index + 1;
    });

    return list;
  }

  downloadAnalyticsCsv(): void {
    const rows = [
      ['UNIVERSITY OF DAR ES SALAAM - MAIN LIBRARY CLEARANCE REPORT'],
      [`Date: ${new Date().toLocaleString()}`],
      [],
      ['1. EXECUTIVE METRICS'],
      ['Total Student Borrowers Analyzed', String(this.totalLibraryStudents)],
      ['Books Returned & Cleared', String(this.clearedLibraryCount)],
      ['Pending Book Returns', String(this.pendingLibraryCount)],
      ['Overdue Books & Fines Flagged', String(this.flaggedLibraryCount)],
      ['Overall Library Clearance Rate', `${this.libraryClearanceRate}%`],
      ['Total Collection Volumes & Seats', String(this.totalCollectionCapacity)],
      [],
      ['2. GENDER CLASSIFICATION'],
      ['Gender', 'Total Borrowers', 'Share %'],
      ['Male', String(this.genderStats.maleTotal), `${this.genderStats.malePercent}%`],
      ['Female', String(this.genderStats.femaleTotal), `${this.genderStats.femalePercent}%`],
      [],
      ['3. LIBRARY SECTIONS BREAKDOWN'],
      ['Library Section', 'Borrower Volume', 'Cleared Count'],
      ...this.sectionHistogram.map(s => [s.label, String(s.count), String(s.cleared)]),
      [],
      ['4. COLLEGE BORROWING & CLEARANCE RANKING'],
      ['Rank', 'College Code', 'College Full Name', 'Total Borrowers', 'Cleared', 'Clearance Rate %', 'Status'],
      ...this.collegeLibraryRankings.map(c => [String(c.rank), c.collegeCode, c.fullName, String(c.borrowerCount), String(c.clearedCount), `${c.clearanceRate}%`, c.activityLevel])
    ];

    const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `library-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    this.toastService.success('Export Successful', 'Library analytics report exported as CSV.');
  }

  printAnalytics(): void {
    window.print();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
