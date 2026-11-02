// src/app/dashboard/hall_warden/hall_warden.ts

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

export interface HallDirectoryItem {
  id: string;
  name: string;
  category: string;
  capacity: number;
  location: string;
  wardenName: string;
  wardenContact: string;
  blocks: string[];
  description: string;
}

export interface HallRankingItem {
  rank: number;
  name: string;
  location: string;
  residentCount: number;
  clearedCount: number;
  clearanceRate: number;
  statusBadge: string;
  badgeClass: string;
}

const DEFAULT_HALLS: HallDirectoryItem[] = [
  {
    id: 'hall-1',
    name: 'Hall 1 (Nyerere Hall)',
    category: 'Male Undergraduate',
    capacity: 350,
    location: 'Main Campus Central Precinct',
    wardenName: 'Dr. K. Mvungi',
    wardenContact: '+255 22 241 0501',
    blocks: ['Block 1A', 'Block 1B', 'Block 1C'],
    description: 'Historic residential hall accommodating male undergraduate continuing students.'
  },
  {
    id: 'hall-2',
    name: 'Hall 2 (Kawawa Hall)',
    category: 'Male Undergraduate',
    capacity: 380,
    location: 'Main Campus Academic Quad',
    wardenName: 'Dr. E. Luoga',
    wardenContact: '+255 22 241 0502',
    blocks: ['Block 2A', 'Block 2B'],
    description: 'Male undergraduate residence situated adjacent to the College of Humanities.'
  },
  {
    id: 'hall-3',
    name: 'Hall 3 (Karume Hall)',
    category: 'Female Undergraduate',
    capacity: 420,
    location: 'Main Campus East Wing',
    wardenName: 'Dr. R. Mwakyusa',
    wardenContact: '+255 22 241 0503',
    blocks: ['Wing A', 'Wing B', 'Wing C'],
    description: 'Premier female residence hall with dedicated common rooms and self-study spaces.'
  },
  {
    id: 'hall-4',
    name: 'Hall 4 (Sokoine Hall)',
    category: 'Female Undergraduate',
    capacity: 360,
    location: 'Main Campus South Area',
    wardenName: 'Dr. P. Lyimo',
    wardenContact: '+255 22 241 0504',
    blocks: ['Block 4A', 'Block 4B'],
    description: 'Undergraduate hall for female scholars with 24/7 security reception and warden desk.'
  },
  {
    id: 'hall-5',
    name: 'Hall 5 (Shein Hall)',
    category: 'Male Undergraduate',
    capacity: 400,
    location: 'Main Campus North Zone',
    wardenName: 'Dr. M. Kitula',
    wardenContact: '+255 22 241 0505',
    blocks: ['Block 5A', 'Block 5B', 'Block 5C'],
    description: 'Residential building housing second and third-year male degree candidates.'
  },
  {
    id: 'hall-6',
    name: 'Hall 6 (Postgraduate & Senior)',
    category: 'Mixed / Postgraduate',
    capacity: 520,
    location: 'Main Campus Hilltop',
    wardenName: 'Dr. A. Ndaki',
    wardenContact: '+255 22 241 0506',
    blocks: ['Block 6 North', 'Block 6 South'],
    description: 'Self-contained residential quarters for senior finalists and master candidates.'
  },
  {
    id: 'hall-7',
    name: 'Hall 7 (Magufuli Hostels)',
    category: 'Mixed Undergraduate',
    capacity: 650,
    location: 'Lower Campus Grounds',
    wardenName: 'Dr. F. Silayo',
    wardenContact: '+255 22 241 0507',
    blocks: ['Block A', 'Block B', 'Block C', 'Block D'],
    description: 'Modern high-capacity halls with state-of-the-art water supply and recreational grounds.'
  },
  {
    id: 'mabibo-complex',
    name: 'Mabibo Hostels Complex',
    category: 'Mixed Undergraduate',
    capacity: 4500,
    location: 'Mabibo External Campus',
    wardenName: 'Chief Warden Dr. H. Mtemi',
    wardenContact: '+255 22 241 0508',
    blocks: ['Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F'],
    description: 'Largest university residential complex with comprehensive warden and inspection teams.'
  }
];

@Component({
  selector: 'app-hall-warden',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent, ParallelOfficeRequestTableComponent],
  templateUrl: './hall_warden.html',
  styleUrl: './hall_warden.css'
})
export class HallWardenComponent {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly Math = Math;
  sidebarOpen = false;
  viewMode: 'overview' | 'requests' | 'halls' | 'analytics' = 'requests';

  selectedRequest: ClearanceRequest | null = null;
  viewingRequest: ClearanceRequest | null = null;
  rejectionComment = '';
  message = '';

  searchTerm = '';
  filterStatus = 'Pending';
  currentPage = 1;
  pageSize = 20;

  // Analytics Filters & State
  selectedAnalyticsYear = 'all';
  selectedAnalyticsGender = 'all';
  hoveredHallName: string | null = null;
  hoveredSliceLabel: string | null = null;

  // Halls Directory Management
  halls: HallDirectoryItem[] = [];
  hallSearchTerm = '';
  showHallModal = false;
  editingHallId: string | null = null;
  expandedHallIds = new Set<string>();

  hallForm = {
    name: '',
    category: 'Mixed Undergraduate',
    capacity: null as number | null,
    location: '',
    wardenName: '',
    wardenContact: '',
    blocksText: '',
    description: ''
  };

  constructor() {
    this.loadHalls();
  }

  setViewMode(mode: 'overview' | 'requests' | 'halls' | 'analytics'): void {
    this.viewMode = mode;
    this.sidebarOpen = false;
  }

  loadHalls(): void {
    const saved = localStorage.getItem('udsm-hall-warden-halls');
    if (saved) {
      try {
        this.halls = JSON.parse(saved);
      } catch {
        this.halls = [...DEFAULT_HALLS];
      }
    } else {
      this.halls = [...DEFAULT_HALLS];
      this.saveHallsToStorage();
    }
  }

  saveHallsToStorage(): void {
    localStorage.setItem('udsm-hall-warden-halls', JSON.stringify(this.halls));
  }

  get filteredHalls(): HallDirectoryItem[] {
    const s = this.hallSearchTerm.trim().toLowerCase();
    if (!s) return this.halls;
    return this.halls.filter(h =>
      h.name.toLowerCase().includes(s) ||
      h.category.toLowerCase().includes(s) ||
      h.location.toLowerCase().includes(s) ||
      h.wardenName.toLowerCase().includes(s) ||
      h.blocks.some(b => b.toLowerCase().includes(s))
    );
  }

  toggleHallDetails(id: string): void {
    if (this.expandedHallIds.has(id)) {
      this.expandedHallIds.delete(id);
    } else {
      this.expandedHallIds.add(id);
    }
  }

  isHallExpanded(id: string): boolean {
    return this.expandedHallIds.has(id);
  }

  openAddHallModal(): void {
    this.editingHallId = null;
    this.hallForm = {
      name: '',
      category: 'Mixed Undergraduate',
      capacity: null,
      location: 'Main Campus',
      wardenName: '',
      wardenContact: '',
      blocksText: '',
      description: ''
    };
    this.showHallModal = true;
  }

  openEditHallModal(hall: HallDirectoryItem): void {
    this.editingHallId = hall.id;
    this.hallForm = {
      name: hall.name,
      category: hall.category,
      capacity: hall.capacity,
      location: hall.location,
      wardenName: hall.wardenName,
      wardenContact: hall.wardenContact,
      blocksText: (hall.blocks || []).join(', '),
      description: hall.description
    };
    this.showHallModal = true;
  }

  closeHallModal(): void {
    this.showHallModal = false;
    this.editingHallId = null;
  }

  saveHall(): void {
    const name = this.hallForm.name.trim();
    if (!name) {
      this.toastService.warning('Validation', 'Hall name is required.');
      return;
    }

    const blocks = this.hallForm.blocksText.split(',').map(b => b.trim()).filter(Boolean);
    const id = this.editingHallId || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const hall: HallDirectoryItem = {
      id,
      name,
      category: this.hallForm.category.trim() || 'Residential Hall',
      capacity: this.hallForm.capacity ? Number(this.hallForm.capacity) : 350,
      location: this.hallForm.location.trim() || 'Main Campus',
      wardenName: this.hallForm.wardenName.trim() || 'Hall Warden',
      wardenContact: this.hallForm.wardenContact.trim() || '+255 22 241 0500',
      blocks: blocks.length ? blocks : ['Block A', 'Block B'],
      description: this.hallForm.description.trim() || 'University student residence hall.'
    };

    const index = this.halls.findIndex(h => h.id === id);
    if (index >= 0) {
      this.halls[index] = hall;
    } else {
      this.halls.push(hall);
    }

    this.saveHallsToStorage();
    this.closeHallModal();
    this.toastService.success('Saved', `Hall "${name}" saved successfully.`);
  }

  deleteHall(hall: HallDirectoryItem): void {
    if (!confirm(`Are you sure you want to delete "${hall.name}"?`)) return;
    this.halls = this.halls.filter(h => h.id !== hall.id);
    this.saveHallsToStorage();
    this.toastService.info('Removed', `Hall "${hall.name}" removed.`);
  }

  resetHalls(): void {
    if (!confirm('Reset all halls of residence to official defaults?')) return;
    this.halls = [...DEFAULT_HALLS];
    this.saveHallsToStorage();
    this.toastService.success('Reset', 'Halls of residence restored to standard defaults.');
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
    return this.clearanceService.getRequestsForOffice('Hall Warden');
  }

  get pendingRequestCount(): number {
    return this.requests.filter(request => this.getRequestOfficeStatus(request, 'Hall Warden') === 'Pending').length;
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

    return list.filter(r => this.getRequestOfficeStatus(r, 'Hall Warden') === this.filterStatus);
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

  getStudentHall(request: ClearanceRequest): string {
    if (request.hall && request.hall !== 'Non-Hostel Dwellers' && request.hall !== 'Off Campus') {
      return request.hall;
    }
    const user = this.getStudentData(request.studentId);
    if (user?.hall && user.hall !== 'Non-Hostel Dwellers' && user.hall !== 'Off Campus') {
      return user.hall;
    }
    return 'Hall 1';
  }

  getStudentBlock(request: ClearanceRequest): string {
    return request.block || this.getStudentData(request.studentId)?.block || 'Block A';
  }

  getStudentRoom(request: ClearanceRequest): string {
    const r = request.roomNumber ?? this.getStudentData(request.studentId)?.roomNumber;
    return r !== undefined && r !== null && r !== '' ? String(r) : '104';
  }

  getStudentKeyStatus(request: ClearanceRequest): string {
    const status = this.getRequestOfficeStatus(request, 'Hall Warden');
    if (status === 'Approved') return 'Room Key Returned & Inventory Inspected Clean';
    if (status === 'Rejected') return 'Room Key Not Returned / Property Damage Flagged';
    return 'Room Key Inspection Pending · No Outstanding Dues';
  }

  approve(request: ClearanceRequest): void {
    const staff = this.authService.getCurrentUser();
    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }

    const studentName = this.getStudentName(request);
    const registrationNumber = this.getStudentRegNumber(request);
    const confirmApprove = confirm(
      `⚠️ Attention: Approve Clearance\n\nAre you sure you want to APPROVE Hall Warden clearance for ${studentName} (${registrationNumber})?`
    );
    if (!confirmApprove) return;

    this.clearanceService.approveRequest(request.id, 'Hall Warden', staff.fullName);
    this.notificationService.createNotification(
      request.studentId,
      'Hall Warden clearance approved',
      'The Hall Warden has verified your room inspection and approved your clearance.',
      'success'
    );
    this.toastService.success('Approved', `Hall Warden clearance approved for ${studentName}.`);
    this.message = 'Hall Warden clearance was approved successfully.';
    setTimeout(() => { this.message = ''; }, 4000);
  }

  openRejectForm(request: ClearanceRequest): void {
    this.selectedRequest = request;
    this.rejectionComment = '';
    this.message = '';
  }

  reject(): void {
    const staff = this.authService.getCurrentUser();
    if (!staff || !this.selectedRequest) return;

    if (!this.rejectionComment.trim()) {
      this.toastService.warning('Comment Required', 'Please provide a reason for rejection.');
      return;
    }

    const studentName = this.getStudentName(this.selectedRequest);
    const registrationNumber = this.getStudentRegNumber(this.selectedRequest);

    const confirmReject = confirm(
      `⚠️ Attention: Reject Clearance\n\nAre you sure you want to REJECT Hall Warden clearance for ${studentName} (${registrationNumber})?\n\nReason: "${this.rejectionComment.trim()}"\n\nThis will notify the student regarding room key surrender or room inspection.`
    );
    if (!confirmReject) return;

    this.clearanceService.rejectRequest(this.selectedRequest.id, 'Hall Warden', staff.fullName, this.rejectionComment.trim());
    this.notificationService.createNotification(
      this.selectedRequest.studentId,
      'Hall Warden action required',
      this.rejectionComment.trim(),
      'warning'
    );

    this.toastService.warning('Returned', `Hall Warden clearance request returned for ${studentName}.`);
    this.message = 'The student has been notified regarding room inspection or key surrender.';
    this.selectedRequest = null;
    this.rejectionComment = '';
    setTimeout(() => { this.message = ''; }, 4000);
  }

  // =========================================================================
  // HALL WARDEN STATISTICAL ANALYTICS ENGINE
  // =========================================================================

  setHoveredHall(name: string | null): void {
    this.hoveredHallName = name;
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

  get totalHallStudents(): number {
    return this.analyticsFilteredRequests.length;
  }

  get keysReturnedCount(): number {
    return this.analyticsFilteredRequests.filter(r => this.getRequestOfficeStatus(r, 'Hall Warden') === 'Approved').length;
  }

  get pendingInspectionsCount(): number {
    return this.analyticsFilteredRequests.filter(r => this.getRequestOfficeStatus(r, 'Hall Warden') === 'Pending').length;
  }

  get returnedDamagesCount(): number {
    return this.analyticsFilteredRequests.filter(r => this.getRequestOfficeStatus(r, 'Hall Warden') === 'Rejected').length;
  }

  get hallClearanceRate(): number {
    const tot = Math.max(1, this.totalHallStudents);
    return Math.round((this.keysReturnedCount / tot) * 100);
  }

  get totalBedCapacity(): number {
    return this.halls.reduce((sum, h) => sum + (h.capacity || 0), 0) || 7180;
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

  get blockHistogram(): { label: string; count: number; cleared: number; heightPercent: number; clearedPercent: number; pendingPercent: number }[] {
    const blocks = ['Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F'];
    const map = new Map<string, { count: number; cleared: number }>();
    blocks.forEach(b => map.set(b, { count: 0, cleared: 0 }));

    this.analyticsFilteredRequests.forEach(r => {
      const blk = r.block || 'Block A';
      const matched = blocks.find(b => blk.toLowerCase().includes(b.toLowerCase())) || 'Block A';
      const rec = map.get(matched)!;
      rec.count++;
      if (this.getRequestOfficeStatus(r, 'Hall Warden') === 'Approved') {
        rec.cleared++;
      }
    });

    const maxCount = Math.max(1, ...Array.from(map.values()).map(v => v.count));

    return blocks.map(b => {
      const rec = map.get(b) || { count: 0, cleared: 0 };
      const tot = Math.max(1, rec.count);
      const clrPct = Math.round((rec.cleared / tot) * 100);
      return {
        label: b,
        count: rec.count,
        cleared: rec.cleared,
        heightPercent: Math.max(14, Math.round((rec.count / maxCount) * 100)),
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
      if (this.getRequestOfficeStatus(r, 'Hall Warden') === 'Approved') {
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

  get keyStatusPieSlices() {
    const tot = Math.max(1, this.totalHallStudents);
    const items = [
      { label: 'Keys Cleared & Returned', count: this.keysReturnedCount, color: '#10b981' },
      { label: 'Pending Inspection', count: this.pendingInspectionsCount, color: '#f59e0b' },
      { label: 'Damages / Dues Flagged', count: this.returnedDamagesCount, color: '#ef4444' }
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

  get hallSharePieSlices() {
    const halls = this.halls.slice(0, 6);
    const colors = ['#00679b', '#059669', '#7c3aed', '#d97706', '#ea580c', '#0891b2'];
    const totalCap = Math.max(1, halls.reduce((sum, h) => sum + (h.capacity || 0), 0));

    let currentAngle = -90;
    return halls.map((h, i) => {
      const count = h.capacity || 350;
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
        label: h.name.split(' (')[0],
        count,
        color: colors[i % colors.length],
        percentage: Math.round((count / totalCap) * 100),
        svgPath
      };
    });
  }

  get hallRankings(): HallRankingItem[] {
    const list: HallRankingItem[] = this.halls.map((h, i) => {
      const estimatedResidents = Math.max(1, Math.round((h.capacity / this.totalBedCapacity) * this.totalHallStudents));
      const cleared = Math.round(estimatedResidents * (this.hallClearanceRate / 100));
      const clrRate = this.hallClearanceRate;

      let statusBadge = 'Normal';
      let badgeClass = 'badge-info';
      if (clrRate >= 80) {
        statusBadge = 'High Clearance';
        badgeClass = 'badge-success';
      } else if (clrRate < 50) {
        statusBadge = 'Action Required';
        badgeClass = 'badge-danger';
      }

      return {
        rank: i + 1,
        name: h.name,
        location: h.location,
        residentCount: estimatedResidents,
        clearedCount: cleared,
        clearanceRate: clrRate,
        statusBadge,
        badgeClass
      };
    });

    list.sort((a, b) => b.residentCount - a.residentCount);
    list.forEach((item, index) => {
      item.rank = index + 1;
    });

    return list;
  }

  downloadAnalyticsCsv(): void {
    const rows = [
      ['UNIVERSITY OF DAR ES SALAAM - HALL WARDEN CLEARANCE REPORT'],
      [`Date: ${new Date().toLocaleString()}`],
      [],
      ['1. EXECUTIVE METRICS'],
      ['Total Hall Residents Analyzed', String(this.totalHallStudents)],
      ['Room Keys Cleared & Returned', String(this.keysReturnedCount)],
      ['Pending Room Inspections', String(this.pendingInspectionsCount)],
      ['Damages or Dues Flagged', String(this.returnedDamagesCount)],
      ['Total Bed Capacity', String(this.totalBedCapacity)],
      ['Hall Clearance Rate', `${this.hallClearanceRate}%`],
      [],
      ['2. GENDER CLASSIFICATION'],
      ['Gender', 'Total Residents', 'Share %'],
      ['Male', String(this.genderStats.maleTotal), `${this.genderStats.malePercent}%`],
      ['Female', String(this.genderStats.femaleTotal), `${this.genderStats.femalePercent}%`],
      [],
      ['3. BLOCK INSPECTION BREAKDOWN'],
      ['Block Name', 'Total Residents', 'Cleared Keys'],
      ...this.blockHistogram.map(b => [b.label, String(b.count), String(b.cleared)]),
      [],
      ['4. HALL RESIDENCY & CLEARANCE RANKING'],
      ['Rank', 'Hall Name', 'Location', 'Residents', 'Cleared Keys', 'Clearance Rate %', 'Status'],
      ...this.hallRankings.map(h => [String(h.rank), h.name, h.location, String(h.residentCount), String(h.clearedCount), `${h.clearanceRate}%`, h.statusBadge])
    ];

    const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hall-warden-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    this.toastService.success('Export Successful', 'Hall Warden analytics exported as CSV.');
  }

  printAnalytics(): void {
    window.print();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
