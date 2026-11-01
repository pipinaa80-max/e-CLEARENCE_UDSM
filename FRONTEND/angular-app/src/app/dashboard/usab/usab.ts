import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ClearanceRequest } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { ParallelOfficeRequestTableComponent } from '../../shared/components/parallel-office-request-table/parallel-office-request-table';
import { HostelService, HostelDetail } from '../../core/services/hostel.service';
import { ToastService } from '../../core/services/toast.service';

export interface HostelAnalyticsItem {
  id: string;
  name: string;
  location: string;
  capacity: number;
  bookedCount: number;
  occupancyPercent: number;
  clearedCount: number;
  pendingCount: number;
  rejectedCount: number;
  clearanceRate: number;
  rank: number;
  statusBadge: string;
  badgeClass: string;
}

export interface YearResidencyItem {
  yearLabel: string;
  cohort: string;
  total: number;
  onCampus: number;
  offCampus: number;
  nonHostel: number;
  onCampusPercent: number;
  offCampusPercent: number;
  clearanceRate: number;
  barHeightPercent: number;
}

export interface PieSliceItem {
  label: string;
  count: number;
  percentage: number;
  color: string;
  svgPath: string;
}

export interface GenderResidencyStats {
  maleTotal: number;
  maleOnCampus: number;
  maleOffCampus: number;
  malePercent: number;
  femaleTotal: number;
  femaleOnCampus: number;
  femaleOffCampus: number;
  femalePercent: number;
  total: number;
}

@Component({
  selector: 'app-usab',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent, ParallelOfficeRequestTableComponent],
  templateUrl: './usab.html',
  styleUrl: './usab.css'
})
export class UsabComponent {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly hostelService = inject(HostelService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  viewMode: 'all' | 'requests' | 'hostels' | 'analytics' = 'all';
  selectedRequest: ClearanceRequest | null = null;
  rejectionComment = '';
  message = '';

  // Analytics Filters & Interaction State
  readonly Math = Math;
  selectedAnalyticsYear: string = 'all';
  selectedAnalyticsGender: string = 'all';
  hoveredHostelName: string | null = null;
  hoveredSliceLabel: string | null = null;

  setViewMode(mode: 'all' | 'requests' | 'hostels' | 'analytics'): void {
    this.viewMode = mode;
  }

  searchTerm = '';
  filterStatus = 'Pending';
  currentPage = 1;
  pageSize = 20;

  // Hostel Management State
  hostels: HostelDetail[] = [];
  hostelSearchTerm = '';
  showHostelModal = false;
  editingHostelId: string | null = null;
  expandedHostelIds = new Set<string>();

  toggleHostelDetails(id: string): void {
    if (this.expandedHostelIds.has(id)) {
      this.expandedHostelIds.delete(id);
    } else {
      this.expandedHostelIds.add(id);
    }
  }

  isHostelExpanded(id: string): boolean {
    return this.expandedHostelIds.has(id);
  }

  hostelForm: {
    name: string;
    location: string;
    capacity: number | null;
    wardenName: string;
    wardenContact: string;
    hasWings: boolean;
    wingsText: string;
    hasBlocks: boolean;
    blocksText: string;
    description: string;
  } = {
    name: '',
    location: '',
    capacity: null,
    wardenName: '',
    wardenContact: '',
    hasWings: false,
    wingsText: '',
    hasBlocks: false,
    blocksText: '',
    description: ''
  };

  constructor() {
    this.loadHostels();
  }

  loadHostels(): void {
    this.hostels = this.hostelService.getHostelsSnapshot();
  }

  get filteredHostels(): HostelDetail[] {
    const s = this.hostelSearchTerm.trim().toLowerCase();
    if (!s) return this.hostels;
    return this.hostels.filter(h =>
      h.name.toLowerCase().includes(s) ||
      (h.location && h.location.toLowerCase().includes(s)) ||
      (h.wardenName && h.wardenName.toLowerCase().includes(s)) ||
      (h.description && h.description.toLowerCase().includes(s))
    );
  }

  openAddHostelModal(): void {
    this.editingHostelId = null;
    this.hostelForm = {
      name: '',
      location: '',
      capacity: null,
      wardenName: '',
      wardenContact: '',
      hasWings: false,
      wingsText: '',
      hasBlocks: false,
      blocksText: '',
      description: ''
    };
    this.showHostelModal = true;
  }

  openEditHostelModal(hostel: HostelDetail): void {
    this.editingHostelId = hostel.id;
    this.hostelForm = {
      name: hostel.name,
      location: hostel.location || '',
      capacity: hostel.capacity ?? null,
      wardenName: hostel.wardenName || '',
      wardenContact: hostel.wardenContact || '',
      hasWings: !!hostel.hasWings || (hostel.wings && hostel.wings.length > 0) || false,
      wingsText: (hostel.wings || []).join(', '),
      hasBlocks: !!hostel.hasBlocks || (hostel.blocks && hostel.blocks.length > 0) || false,
      blocksText: (hostel.blocks || []).join(', '),
      description: hostel.description || ''
    };
    this.showHostelModal = true;
  }

  closeHostelModal(): void {
    this.showHostelModal = false;
    this.editingHostelId = null;
  }

  saveHostel(): void {
    const name = this.hostelForm.name.trim();
    if (!name) {
      this.toastService.warning('Validation', 'Hostel name is required.');
      return;
    }

    const wings = this.hostelForm.hasWings
      ? this.hostelForm.wingsText.split(',').map(w => w.trim()).filter(Boolean)
      : [];

    const blocks = this.hostelForm.hasBlocks
      ? this.hostelForm.blocksText.split(',').map(b => b.trim()).filter(Boolean)
      : [];

    const id = this.editingHostelId || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const hostel: HostelDetail = {
      id,
      name,
      location: this.hostelForm.location.trim() || undefined,
      capacity: this.hostelForm.capacity ? Number(this.hostelForm.capacity) : undefined,
      wardenName: this.hostelForm.wardenName.trim() || undefined,
      wardenContact: this.hostelForm.wardenContact.trim() || undefined,
      hasWings: wings.length > 0,
      wings,
      hasBlocks: blocks.length > 0,
      blocks,
      description: this.hostelForm.description.trim() || undefined
    };

    this.hostelService.saveHostel(hostel);
    this.loadHostels();
    this.closeHostelModal();
    this.toastService.success('Success', `Hostel "${name}" details saved and updated throughout the system.`);
    this.message = `Hostel details for "${name}" updated successfully.`;
    setTimeout(() => { this.message = ''; }, 4000);
  }

  deleteHostel(hostel: HostelDetail): void {
    if (!confirm(`Are you sure you want to remove "${hostel.name}"?`)) {
      return;
    }
    this.hostelService.deleteHostel(hostel.id);
    this.loadHostels();
    this.toastService.info('Removed', `Hostel "${hostel.name}" was removed.`);
  }

  resetHostels(): void {
    if (!confirm('Reset all hostels to standard university defaults?')) {
      return;
    }
    this.hostelService.resetToDefaults();
    this.loadHostels();
    this.toastService.success('Reset', 'Hostels restored to university defaults.');
  }

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
    return this.clearanceService.getRequestsForOffice('USAB');
  }

  get pendingRequestCount(): number {
    return this.requests.filter(request => this.getRequestOfficeStatus(request, 'USAB') === 'Pending').length;
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

    return list.filter(r => this.getRequestOfficeStatus(r, 'USAB') === this.filterStatus);
  }

  // Cache for student data to avoid repeated lookups
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
    const photo = this.getStudentPhoto(request);
    return !!photo;
  }

  enlargedPhotoUrl: string | null = null;

  openEnlargedPhoto(photoUrl: string | null): void {
    if (photoUrl) {
      this.enlargedPhotoUrl = photoUrl;
    }
  }

  closeEnlargedPhoto(): void {
    this.enlargedPhotoUrl = null;
  }

  approve(request: ClearanceRequest): void {
    const staff = this.authService.getCurrentUser();

    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }

    const studentName = this.getStudentName(request);
    const regNumber = this.getStudentRegNumber(request);
    const confirmApprove = confirm(
      `⚠️ Attention: Approve Clearance\n\nAre you sure you want to APPROVE Accommodation Bureau (USAB) clearance for ${studentName} (${regNumber})?`
    );
    if (!confirmApprove) return;

    this.clearanceService.approveRequest(
      request.id,
      'USAB',
      staff.fullName
    );

    this.notificationService.createNotification(
      request.studentId,
      'USAB clearance approved',
      'USAB has approved your clearance request.',
      'success'
    );

    this.toastService.success('Approved', `USAB clearance approved for ${studentName}.`);
    this.message = 'Student clearance was approved successfully.';
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
    const regNumber = this.getStudentRegNumber(this.selectedRequest);

    const confirmReject = confirm(
      `⚠️ Attention: Reject Clearance\n\nAre you sure you want to REJECT Accommodation Bureau (USAB) clearance for ${studentName} (${regNumber})?\n\nReason: "${this.rejectionComment.trim()}"\n\nThis will notify the student regarding hostel fee or clearance inspection.`
    );
    if (!confirmReject) return;

    this.clearanceService.rejectRequest(
      this.selectedRequest.id,
      'USAB',
      staff.fullName,
      this.rejectionComment.trim()
    );

    this.notificationService.createNotification(
      this.selectedRequest.studentId,
      'USAB action required',
      this.rejectionComment.trim(),
      'warning'
    );

    this.toastService.warning('Returned', `USAB clearance request returned for ${studentName}.`);
    this.message = 'The student has been notified about the required action.';
    this.selectedRequest = null;
    this.rejectionComment = '';
    setTimeout(() => { this.message = ''; }, 4000);
  }

  // =====================================================
  // STUDENT DETAILS MODAL FOR USAB ACCOMMODATION
  // =====================================================
  viewingRequest: ClearanceRequest | null = null;

  openStudentDetailsModal(request: ClearanceRequest): void {
    this.viewingRequest = request;
  }

  closeStudentDetailsModal(): void {
    this.viewingRequest = null;
  }

  getStudentResidenceType(request: ClearanceRequest): string {
    if (request.residenceType) return request.residenceType;
    const user = this.getStudentData(request.studentId);
    if (user?.hall) {
      return (user.hall === 'Non-Hostel Dwellers' || user.hall === 'Off Campus')
        ? 'Non-Hostel Dwellers'
        : 'Hostel Dwellers';
    }
    return request.hall ? 'Hostel Dwellers' : 'Non-Hostel Dwellers';
  }

  getStudentHall(request: ClearanceRequest): string {
    if (request.hall && request.hall !== 'Non-Hostel Dwellers' && request.hall !== 'Off Campus') {
      return request.hall;
    }
    const user = this.getStudentData(request.studentId);
    if (user?.hall && user.hall !== 'Non-Hostel Dwellers' && user.hall !== 'Off Campus') {
      return user.hall;
    }
    return '—';
  }

  getStudentWing(request: ClearanceRequest): string {
    return request.wing || this.getStudentData(request.studentId)?.wing || '—';
  }

  getStudentBlock(request: ClearanceRequest): string {
    return request.block || this.getStudentData(request.studentId)?.block || '—';
  }

  getStudentRoom(request: ClearanceRequest): string {
    const room = request.roomNumber ?? this.getStudentData(request.studentId)?.roomNumber;
    return room !== undefined && room !== null && room !== '' ? String(room) : '—';
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

  // =========================================================================
  // ACCOMMODATION & HOSTEL ANALYTICS ENGINE
  // =========================================================================

  setHoveredHostel(name: string | null): void {
    this.hoveredHostelName = name;
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
    for (let i = 0; i < idStr.length; i++) {
      sum += idStr.charCodeAt(i);
    }
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

  getStudentResidenceCategory(request: ClearanceRequest): 'Hostel Dwellers' | 'Off Campus' | 'Non-Hostel Dwellers' {
    if (request.residenceType === 'Off Campus' || request.hall === 'Off Campus') {
      return 'Off Campus';
    }
    if (request.residenceType === 'Non-Hostel Dwellers' || request.hall === 'Non-Hostel Dwellers') {
      return 'Non-Hostel Dwellers';
    }
    if (request.residenceType === 'Hostel Dwellers' || (request.hall && request.hall !== '—' && request.hall.trim().length > 0)) {
      return 'Hostel Dwellers';
    }
    const user = this.getStudentData(request.studentId);
    if (user?.hall) {
      if (user.hall === 'Off Campus') return 'Off Campus';
      if (user.hall === 'Non-Hostel Dwellers') return 'Non-Hostel Dwellers';
      return 'Hostel Dwellers';
    }
    return 'Off Campus';
  }

  getAssignedHostelName(request: ClearanceRequest): string {
    const hall = this.getStudentHall(request);
    if (hall && hall !== '—' && hall !== 'Off Campus' && hall !== 'Non-Hostel Dwellers') {
      return hall;
    }
    if (this.getStudentResidenceCategory(request) === 'Hostel Dwellers') {
      const names = this.hostels.map(h => h.name);
      if (names.length) {
        const idStr = request.registrationNumber || request.studentId;
        let sum = 0;
        for (let i = 0; i < idStr.length; i++) sum += idStr.charCodeAt(i);
        return names[sum % names.length];
      }
    }
    return 'Off Campus';
  }

  get analyticsFilteredRequests(): ClearanceRequest[] {
    let list = this.clearanceService.getAllRequests();
    if (!list.length) {
      list = this.requests;
    }
    if (this.selectedAnalyticsYear !== 'all') {
      list = list.filter(r => this.getStudentYear(r) === this.selectedAnalyticsYear);
    }
    if (this.selectedAnalyticsGender !== 'all') {
      list = list.filter(r => this.getStudentGender(r) === this.selectedAnalyticsGender);
    }
    return list;
  }

  get totalStudentsAnalyzed(): number {
    return this.analyticsFilteredRequests.length;
  }

  get totalHostelDwellers(): number {
    return this.analyticsFilteredRequests.filter(r => this.getStudentResidenceCategory(r) === 'Hostel Dwellers').length;
  }

  get totalOffCampus(): number {
    return this.analyticsFilteredRequests.filter(r => this.getStudentResidenceCategory(r) === 'Off Campus').length;
  }

  get totalNonHostel(): number {
    return this.analyticsFilteredRequests.filter(r => this.getStudentResidenceCategory(r) === 'Non-Hostel Dwellers').length;
  }

  get totalHostelCapacity(): number {
    return this.hostels.reduce((sum, h) => sum + (h.capacity || 0), 0) || 9340;
  }

  get totalHostelOccupancyPercent(): number {
    const total = Math.max(1, this.totalStudentsAnalyzed);
    return Math.round((this.totalHostelDwellers / total) * 100);
  }

  get usabClearanceRate(): number {
    const list = this.analyticsFilteredRequests;
    if (!list.length) return 0;
    const approved = list.filter(r => this.getRequestOfficeStatus(r, 'USAB') === 'Approved').length;
    return Math.round((approved / list.length) * 100);
  }

  get mostlyBookedHostels(): HostelAnalyticsItem[] {
    const list = this.analyticsFilteredRequests;
    const hostelMap = new Map<string, { booked: number; cleared: number; pending: number; rejected: number }>();

    this.hostels.forEach(h => {
      hostelMap.set(h.name.toLowerCase(), { booked: 0, cleared: 0, pending: 0, rejected: 0 });
    });

    list.forEach(r => {
      const cat = this.getStudentResidenceCategory(r);
      if (cat === 'Hostel Dwellers') {
        const hName = this.getAssignedHostelName(r).toLowerCase();
        let record = hostelMap.get(hName);
        if (!record) {
          record = { booked: 0, cleared: 0, pending: 0, rejected: 0 };
          hostelMap.set(hName, record);
        }
        record.booked++;
        const st = this.getRequestOfficeStatus(r, 'USAB');
        if (st === 'Approved') record.cleared++;
        else if (st === 'Rejected') record.rejected++;
        else record.pending++;
      }
    });

    const items: HostelAnalyticsItem[] = this.hostels.map(h => {
      const stats = hostelMap.get(h.name.toLowerCase()) || { booked: 0, cleared: 0, pending: 0, rejected: 0 };
      const cap = h.capacity || 500;
      const booked = stats.booked;
      const occupancy = Math.min(100, Math.round((booked / cap) * 100));
      const totalDecisions = stats.cleared + stats.pending + stats.rejected;
      const clrRate = totalDecisions > 0 ? Math.round((stats.cleared / totalDecisions) * 100) : 0;

      let statusBadge = 'Available Spaces';
      let badgeClass = 'badge-success';
      if (occupancy >= 85 || booked >= 8) {
        statusBadge = 'Highest Demand';
        badgeClass = 'badge-danger';
      } else if (occupancy >= 50 || booked >= 4) {
        statusBadge = 'Nearly Full';
        badgeClass = 'badge-warning';
      } else if (booked > 0) {
        statusBadge = 'Active Bookings';
        badgeClass = 'badge-info';
      }

      return {
        id: h.id,
        name: h.name,
        location: h.location || 'University Campus',
        capacity: cap,
        bookedCount: booked,
        occupancyPercent: occupancy,
        clearedCount: stats.cleared,
        pendingCount: stats.pending,
        rejectedCount: stats.rejected,
        clearanceRate: clrRate,
        rank: 0,
        statusBadge,
        badgeClass
      };
    });

    // Sort descending by bookedCount, then capacity
    items.sort((a, b) => b.bookedCount - a.bookedCount || b.capacity - a.capacity);
    items.forEach((item, index) => {
      item.rank = index + 1;
    });

    return items;
  }

  get topBookedHostel(): HostelAnalyticsItem | null {
    const list = this.mostlyBookedHostels;
    return list.length ? list[0] : null;
  }

  get genderStats(): GenderResidencyStats {
    const list = this.analyticsFilteredRequests;
    const total = Math.max(1, list.length);

    let maleTotal = 0;
    let maleOnCampus = 0;
    let maleOffCampus = 0;

    let femaleTotal = 0;
    let femaleOnCampus = 0;
    let femaleOffCampus = 0;

    list.forEach(r => {
      const gender = this.getStudentGender(r);
      const isCampus = this.getStudentResidenceCategory(r) === 'Hostel Dwellers';
      if (gender === 'Male') {
        maleTotal++;
        if (isCampus) maleOnCampus++;
        else maleOffCampus++;
      } else {
        femaleTotal++;
        if (isCampus) femaleOnCampus++;
        else femaleOffCampus++;
      }
    });

    return {
      maleTotal,
      maleOnCampus,
      maleOffCampus,
      malePercent: Math.round((maleTotal / total) * 100),
      femaleTotal,
      femaleOnCampus,
      femaleOffCampus,
      femalePercent: Math.round((femaleTotal / total) * 100),
      total: list.length
    };
  }

  get yearResidencyHistogram(): YearResidencyItem[] {
    const list = this.analyticsFilteredRequests;
    const years = ['2024', '2023', '2022', '2021'];
    const cohortLabels: Record<string, string> = {
      '2024': '1st Year (2024)',
      '2023': '2nd Year (2023)',
      '2022': '3rd Year (2022)',
      '2021': '4th Year (2021)'
    };

    const map = new Map<string, { onCampus: number; offCampus: number; nonHostel: number; cleared: number; total: number }>();
    years.forEach(y => map.set(y, { onCampus: 0, offCampus: 0, nonHostel: 0, cleared: 0, total: 0 }));

    list.forEach(r => {
      const yr = this.getStudentYear(r);
      let record = map.get(yr);
      if (!record) {
        record = { onCampus: 0, offCampus: 0, nonHostel: 0, cleared: 0, total: 0 };
        map.set(yr, record);
      }
      record.total++;
      const res = this.getStudentResidenceCategory(r);
      if (res === 'Hostel Dwellers') record.onCampus++;
      else if (res === 'Off Campus') record.offCampus++;
      else record.nonHostel++;

      if (this.getRequestOfficeStatus(r, 'USAB') === 'Approved') {
        record.cleared++;
      }
    });

    let maxVolume = 1;
    years.forEach(y => {
      const rec = map.get(y);
      if (rec && rec.total > maxVolume) maxVolume = rec.total;
    });

    return years.map(y => {
      const rec = map.get(y) || { onCampus: 0, offCampus: 0, nonHostel: 0, cleared: 0, total: 0 };
      const tot = rec.total;
      const onCampusPct = tot > 0 ? Math.round((rec.onCampus / tot) * 100) : 0;
      const offCampusPct = tot > 0 ? Math.round((rec.offCampus / tot) * 100) : 0;
      const clrRate = tot > 0 ? Math.round((rec.cleared / tot) * 100) : 0;
      const barHeight = Math.max(12, Math.round((tot / maxVolume) * 100));

      return {
        yearLabel: y,
        cohort: cohortLabels[y] || y,
        total: tot,
        onCampus: rec.onCampus,
        offCampus: rec.offCampus,
        nonHostel: rec.nonHostel,
        onCampusPercent: onCampusPct,
        offCampusPercent: offCampusPct,
        clearanceRate: clrRate,
        barHeightPercent: barHeight
      };
    });
  }

  get histogramYAxisTicks(): string[] {
    const list = this.yearResidencyHistogram;
    const max = Math.max(10, ...list.map(i => i.total));
    const step = Math.ceil(max / 3);
    return [`${step * 3}`, `${step * 2}`, `${step}`, '0'];
  }

  get hostelOccupancyHistogram(): {
    name: string;
    booked: number;
    capacity: number;
    cleared: number;
    pending: number;
    heightPercent: number;
    clearedPercent: number;
    pendingPercent: number;
  }[] {
    const hostels = this.mostlyBookedHostels;
    const maxBooked = Math.max(1, ...hostels.map(h => h.bookedCount));

    return hostels.map(h => {
      const height = Math.max(10, Math.round((h.bookedCount / maxBooked) * 100));
      const tot = Math.max(1, h.bookedCount);
      const clrPct = Math.round((h.clearedCount / tot) * 100);
      const pndPct = 100 - clrPct;

      return {
        name: h.name.replace(' Hostels', ''),
        booked: h.bookedCount,
        capacity: h.capacity,
        cleared: h.clearedCount,
        pending: h.pendingCount,
        heightPercent: height,
        clearedPercent: clrPct,
        pendingPercent: pndPct
      };
    });
  }

  get accommodationPieSlices(): PieSliceItem[] {
    const total = Math.max(1, this.totalStudentsAnalyzed);
    const items = [
      { label: 'On-Campus (Hostels)', count: this.totalHostelDwellers, color: '#00679b' },
      { label: 'Off-Campus (Private)', count: this.totalOffCampus, color: '#0d9488' },
      { label: 'Non-Hostel (Day Scholars)', count: this.totalNonHostel, color: '#f59e0b' }
    ];
    return this.buildPieSlices(items);
  }

  get genderPieSlices(): PieSliceItem[] {
    const gs = this.genderStats;
    const items = [
      { label: 'Male Students', count: gs.maleTotal, color: '#2563eb' },
      { label: 'Female Students', count: gs.femaleTotal, color: '#ec4899' }
    ];
    return this.buildPieSlices(items);
  }

  get hostelSharePieSlices(): PieSliceItem[] {
    const hostels = this.mostlyBookedHostels;
    const colors = ['#00679b', '#059669', '#7c3aed', '#d97706', '#ea580c', '#0891b2', '#4338ca'];
    const items = hostels.map((h, i) => ({
      label: h.name,
      count: h.bookedCount > 0 ? h.bookedCount : 1, // sample weighting if zero
      color: colors[i % colors.length]
    }));
    return this.buildPieSlices(items);
  }

  private buildPieSlices(items: { label: string; count: number; color: string }[], cx = 120, cy = 120, R = 90, r = 52): PieSliceItem[] {
    const total = items.reduce((sum, item) => sum + item.count, 0);
    if (total <= 0) return [];

    let currentAngle = -90;
    const slices: PieSliceItem[] = [];

    items.forEach(item => {
      if (item.count <= 0) return;
      const sliceAngle = (item.count / total) * 360;
      const effectiveAngle = sliceAngle >= 359.99 ? 359.99 : sliceAngle;
      const startAngle = currentAngle;
      const endAngle = currentAngle + effectiveAngle;

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

      const largeArcFlag = effectiveAngle > 180 ? 1 : 0;

      const svgPath = `M ${x1} ${y1} ` +
        `A ${R} ${R} 0 ${largeArcFlag} 1 ${x2} ${y2} ` +
        `L ${x3} ${y3} ` +
        `A ${r} ${r} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;

      const pct = Math.round((item.count / total) * 100);

      slices.push({
        label: item.label,
        count: item.count,
        percentage: pct,
        color: item.color,
        svgPath
      });

      currentAngle += sliceAngle;
    });

    return slices;
  }

  downloadAnalyticsCsv(): void {
    const rows: string[][] = [
      ['UNIVERSITY OF DAR ES SALAAM - USAB ACCOMMODATION & HOSTEL STATISTICAL REPORT'],
      [`Generated On: ${new Date().toLocaleString()}`],
      [`Filter Year: ${this.selectedAnalyticsYear.toUpperCase()} | Filter Gender: ${this.selectedAnalyticsGender.toUpperCase()}`],
      [],
      ['1. EXECUTIVE KEY PERFORMANCE METRICS'],
      ['Metric', 'Value'],
      ['Total Students Analyzed', String(this.totalStudentsAnalyzed)],
      ['Total On-Campus Hostel Residents', String(this.totalHostelDwellers)],
      ['Total Off-Campus Students', String(this.totalOffCampus)],
      ['Total Non-Hostel Day Scholars', String(this.totalNonHostel)],
      ['Total University Bed Capacity', String(this.totalHostelCapacity)],
      ['Campus Hostel Occupancy Proportion', `${this.totalHostelOccupancyPercent}%`],
      ['USAB Clearance Approval Rate', `${this.usabClearanceRate}%`],
      ['Most Booked University Hostel', this.topBookedHostel?.name || 'N/A'],
      [],
      ['2. HOSTEL BOOKINGS & CLEARANCE LEADERBOARD'],
      ['Rank', 'Hostel Name', 'Campus Location', 'Bed Capacity', 'Booked Students', 'Occupancy %', 'Cleared', 'Pending', 'Clearance Rate %', 'Demand Status'],
      ...this.mostlyBookedHostels.map(h => [
        String(h.rank),
        h.name,
        h.location,
        String(h.capacity),
        String(h.bookedCount),
        `${h.occupancyPercent}%`,
        String(h.clearedCount),
        String(h.pendingCount),
        `${h.clearanceRate}%`,
        h.statusBadge
      ]),
      [],
      ['3. GENDER CLASSIFICATION IN ACCOMMODATION'],
      ['Gender', 'Total Students', 'Share %', 'On-Campus (Hostels)', 'Off-Campus (Private)'],
      ['Male', String(this.genderStats.maleTotal), `${this.genderStats.malePercent}%`, String(this.genderStats.maleOnCampus), String(this.genderStats.maleOffCampus)],
      ['Female', String(this.genderStats.femaleTotal), `${this.genderStats.femalePercent}%`, String(this.genderStats.femaleOnCampus), String(this.genderStats.femaleOffCampus)],
      [],
      ['4. ACADEMIC COHORT / YEAR RESIDENCY BREAKDOWN'],
      ['Academic Year / Cohort', 'Total Students', 'On-Campus Hostels', 'Off-Campus Private', 'Non-Hostel', 'Clearance Rate %'],
      ...this.yearResidencyHistogram.map(y => [
        y.cohort,
        String(y.total),
        String(y.onCampus),
        String(y.offCampus),
        String(y.nonHostel),
        `${y.clearanceRate}%`
      ])
    ];

    const csvContent = rows
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `usab-accommodation-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    this.toastService.success('Export Successful', 'USAB accommodation analytics report downloaded as CSV.');
  }

  printAnalytics(): void {
    window.print();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

