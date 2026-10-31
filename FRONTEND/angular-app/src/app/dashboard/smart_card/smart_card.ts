// src/app/dashboard/smart_card/smart_card.ts

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

export interface CardStationItem {
  id: string;
  name: string;
  category: string;
  capacity: number;
  location: string;
  officerName: string;
  officerContact: string;
  services: string[];
  description: string;
}

export interface CollegeCardRankingItem {
  rank: number;
  collegeCode: string;
  fullName: string;
  studentCount: number;
  clearedCount: number;
  clearanceRate: number;
  activityLevel: string;
  badgeClass: string;
}

const DEFAULT_STATIONS: CardStationItem[] = [
  {
    id: 'central-admin-dus',
    name: 'Central Admin Smart Card Center (DUS Desk)',
    category: 'Central Issuance & Deactivation',
    capacity: 28000,
    location: 'Main Administration Block Ground Floor Room 12',
    officerName: 'Chief Registrar Officer J. Mtei',
    officerContact: '+255 22 241 0801',
    services: ['Undergraduate Smart ID Surrender', 'Biometric Record Archival', 'Lost Card Penalty Verification'],
    description: 'Central Directorate of Undergraduate Studies smart card clearance, surrender desk, and electronic profile closure.'
  },
  {
    id: 'coict-card-unit',
    name: 'CoICT Biometric & Smart ID Station',
    category: 'Collegiate Biometric Center',
    capacity: 4500,
    location: 'Kijitonyama Campus Block A Room 104',
    officerName: 'Officer F. Mtambo',
    officerContact: '+255 22 241 0802',
    services: ['RFID Chip Deactivation', 'Lab Access Revocation', 'Final Clearance Endorsement'],
    description: 'Handles smart cards, lab door RFID access tokens, and computing facilities access deactivation.'
  },
  {
    id: 'coet-card-desk',
    name: 'CoET Engineering Student Card Unit',
    category: 'Collegiate Issuance Center',
    capacity: 5500,
    location: 'Engineering Complex Block B Room 16',
    officerName: 'Officer R. Lyimo',
    officerContact: '+255 22 241 0803',
    services: ['Student ID Handover', 'Workshop Access Deactivation', 'Fee Penalty Clearance'],
    description: 'Coordinates smart ID card recovery for engineering candidates and specialized workshop badges.'
  },
  {
    id: 'mabibo-card-desk',
    name: 'Mabibo Complex Smart Card Service Desk',
    category: 'Residential Satellite Desk',
    capacity: 5000,
    location: 'Mabibo Administration Block Ground Floor',
    officerName: 'Officer E. Mgaya',
    officerContact: '+255 22 241 0804',
    services: ['Hostel Turnstile Access Revocation', 'Meal Wallet Verification', 'Off-Campus Surrender'],
    description: 'Manages student ID card surrender for residential scholars and turnstile gate clearance at Mabibo.'
  },
  {
    id: 'udbs-card-desk',
    name: 'UDBS Business School Smart ID Desk',
    category: 'Business Campus Unit',
    capacity: 4200,
    location: 'Business School Tower Level 1',
    officerName: 'Officer S. Masanja',
    officerContact: '+255 22 241 0805',
    services: ['ID Card Return', 'Library RFID Verification', 'E-Wallet Settlement'],
    description: 'Business school dedicated smart identity clearance desk verifying zero balance on card electronic wallets.'
  },
  {
    id: 'library-turnstile-unit',
    name: 'Library Turnstiles & Access Verification Desk',
    category: 'Campus Access Integration',
    capacity: 35000,
    location: 'Main Library Foyer Reception',
    officerName: 'Officer P. Mndeme',
    officerContact: '+255 22 241 0806',
    services: ['Turnstile Barcode Scanning', 'Security Barrier De-registration', 'Lost Card Police Verification'],
    description: 'Verifies physical turnstile security passes and confirms identity card surrender before graduation.'
  }
];

@Component({
  selector: 'app-smart-card',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent, ParallelOfficeRequestTableComponent],
  templateUrl: './smart_card.html',
  styleUrl: './smart_card.css'
})
export class SmartCardComponent {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly Math = Math;
  sidebarOpen = false;
  viewMode: 'all' | 'requests' | 'stations' | 'analytics' = 'all';

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
  hoveredStationName: string | null = null;
  hoveredSliceLabel: string | null = null;

  // Stations Directory State
  stations: CardStationItem[] = [];
  stationSearchTerm = '';
  showStationModal = false;
  editingStationId: string | null = null;
  expandedStationIds = new Set<string>();

  stationForm = {
    name: '',
    category: 'Central Issuance & Deactivation',
    capacity: null as number | null,
    location: 'Main Campus',
    officerName: '',
    officerContact: '',
    servicesText: '',
    description: ''
  };

  constructor() {
    this.loadStations();
  }

  setViewMode(mode: 'all' | 'requests' | 'stations' | 'analytics'): void {
    this.viewMode = mode;
  }

  loadStations(): void {
    const saved = localStorage.getItem('udsm-smartcard-stations');
    if (saved) {
      try {
        this.stations = JSON.parse(saved);
      } catch {
        this.stations = [...DEFAULT_STATIONS];
      }
    } else {
      this.stations = [...DEFAULT_STATIONS];
      this.saveStationsToStorage();
    }
  }

  saveStationsToStorage(): void {
    localStorage.setItem('udsm-smartcard-stations', JSON.stringify(this.stations));
  }

  get filteredStations(): CardStationItem[] {
    const s = this.stationSearchTerm.trim().toLowerCase();
    if (!s) return this.stations;
    return this.stations.filter(st =>
      st.name.toLowerCase().includes(s) ||
      st.category.toLowerCase().includes(s) ||
      st.location.toLowerCase().includes(s) ||
      st.officerName.toLowerCase().includes(s) ||
      st.services.some(srv => srv.toLowerCase().includes(s))
    );
  }

  toggleStationDetails(id: string): void {
    if (this.expandedStationIds.has(id)) {
      this.expandedStationIds.delete(id);
    } else {
      this.expandedStationIds.add(id);
    }
  }

  isStationExpanded(id: string): boolean {
    return this.expandedStationIds.has(id);
  }

  openAddStationModal(): void {
    this.editingStationId = null;
    this.stationForm = {
      name: '',
      category: 'Central Issuance & Deactivation',
      capacity: null,
      location: 'Main Campus',
      officerName: '',
      officerContact: '',
      servicesText: '',
      description: ''
    };
    this.showStationModal = true;
  }

  openEditStationModal(station: CardStationItem): void {
    this.editingStationId = station.id;
    this.stationForm = {
      name: station.name,
      category: station.category,
      capacity: station.capacity,
      location: station.location,
      officerName: station.officerName,
      officerContact: station.officerContact,
      servicesText: (station.services || []).join(', '),
      description: station.description
    };
    this.showStationModal = true;
  }

  closeStationModal(): void {
    this.showStationModal = false;
    this.editingStationId = null;
  }

  saveStation(): void {
    const name = this.stationForm.name.trim();
    if (!name) {
      this.toastService.warning('Validation', 'Station name is required.');
      return;
    }

    const services = this.stationForm.servicesText.split(',').map(s => s.trim()).filter(Boolean);
    const id = this.editingStationId || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const station: CardStationItem = {
      id,
      name,
      category: this.stationForm.category.trim() || 'Smart ID Station',
      capacity: this.stationForm.capacity ? Number(this.stationForm.capacity) : 5000,
      location: this.stationForm.location.trim() || 'Main Campus',
      officerName: this.stationForm.officerName.trim() || 'Card Officer',
      officerContact: this.stationForm.officerContact.trim() || '+255 22 241 0800',
      services: services.length ? services : ['Smart Card Deactivation'],
      description: this.stationForm.description.trim() || 'Smart card and electronic identity processing station.'
    };

    const index = this.stations.findIndex(s => s.id === id);
    if (index >= 0) {
      this.stations[index] = station;
    } else {
      this.stations.push(station);
    }

    this.saveStationsToStorage();
    this.closeStationModal();
    this.toastService.success('Saved', `Station "${name}" saved successfully.`);
  }

  deleteStation(station: CardStationItem): void {
    if (!confirm(`Are you sure you want to remove "${station.name}"?`)) return;
    this.stations = this.stations.filter(s => s.id !== station.id);
    this.saveStationsToStorage();
    this.toastService.info('Removed', `Station "${station.name}" removed.`);
  }

  resetStations(): void {
    if (!confirm('Reset all smart card stations to standard defaults?')) return;
    this.stations = [...DEFAULT_STATIONS];
    this.saveStationsToStorage();
    this.toastService.success('Reset', 'Smart card stations restored to standard defaults.');
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
    return this.clearanceService.getRequestsForOffice('Smart Card');
  }

  get pendingRequestCount(): number {
    return this.requests.filter(request => this.getRequestOfficeStatus(request, 'Smart Card') === 'Pending').length;
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

    return list.filter(r => this.getRequestOfficeStatus(r, 'Smart Card') === this.filterStatus);
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

  getStudentCardNumber(request: ClearanceRequest): string {
    const reg = request.registrationNumber || request.studentId;
    let hash = 0;
    for (let i = 0; i < reg.length; i++) hash = (hash * 31 + reg.charCodeAt(i)) & 0xffffffff;
    const num = Math.abs(hash) % 9000000 + 1000000;
    return `UDSM-SC-${num}`;
  }

  getStudentCardStatus(request: ClearanceRequest): string {
    const status = this.getRequestOfficeStatus(request, 'Smart Card');
    if (status === 'Approved') return 'Physical Card Surrendered & RFID Chip Deactivated';
    if (status === 'Rejected') return 'Card Not Returned / Lost Card Replacement Fee Pending';
    return 'Physical Card Surrender Awaiting Verification';
  }

  getStudentReplacementFee(request: ClearanceRequest): string {
    const status = this.getRequestOfficeStatus(request, 'Smart Card');
    if (status === 'Rejected') return 'TZS 20,000 (Lost Card Replacement Penalty)';
    return 'TZS 0.00 (Standard Surrender)';
  }

  approve(request: ClearanceRequest): void {
    const staff = this.authService.getCurrentUser();
    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }

    this.clearanceService.approveRequest(request.id, 'Smart Card', staff.fullName);
    this.notificationService.createNotification(
      request.studentId,
      'Smart Card clearance approved',
      'The Smart Card office has received your student ID card and approved clearance.',
      'success'
    );
    this.message = 'Smart Card clearance was approved successfully.';
    setTimeout(() => { this.message = ''; }, 4000);
  }

  openRejectForm(request: ClearanceRequest): void {
    this.selectedRequest = request;
    this.rejectionComment = '';
    this.message = '';
  }

  reject(): void {
    const staff = this.authService.getCurrentUser();
    if (!staff || !this.selectedRequest || !this.rejectionComment.trim()) return;

    this.clearanceService.rejectRequest(this.selectedRequest.id, 'Smart Card', staff.fullName, this.rejectionComment);
    this.notificationService.createNotification(
      this.selectedRequest.studentId,
      'Smart Card action required',
      this.rejectionComment,
      'warning'
    );

    this.message = 'The student has been notified regarding physical ID surrender or loss fee payment.';
    this.selectedRequest = null;
    this.rejectionComment = '';
    setTimeout(() => { this.message = ''; }, 4000);
  }

  // =========================================================================
  // SMART CARD STATISTICAL ANALYTICS ENGINE
  // =========================================================================

  setHoveredStation(name: string | null): void {
    this.hoveredStationName = name;
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

  get totalCardStudents(): number {
    return this.analyticsFilteredRequests.length;
  }

  get clearedCardsCount(): number {
    return this.analyticsFilteredRequests.filter(r => this.getRequestOfficeStatus(r, 'Smart Card') === 'Approved').length;
  }

  get pendingCardsCount(): number {
    return this.analyticsFilteredRequests.filter(r => this.getRequestOfficeStatus(r, 'Smart Card') === 'Pending').length;
  }

  get flaggedCardsCount(): number {
    return this.analyticsFilteredRequests.filter(r => this.getRequestOfficeStatus(r, 'Smart Card') === 'Rejected').length;
  }

  get smartCardClearanceRate(): number {
    const tot = Math.max(1, this.totalCardStudents);
    return Math.round((this.clearedCardsCount / tot) * 100);
  }

  get totalStationCapacity(): number {
    return this.stations.reduce((sum, s) => sum + (s.capacity || 0), 0) || 82200;
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

  get stationHistogram(): { label: string; count: number; cleared: number; heightPercent: number; clearedPercent: number; pendingPercent: number }[] {
    const stationNames = [
      'DUS Central Desk',
      'CoICT Station',
      'CoET Desk',
      'Mabibo Desk',
      'UDBS Desk',
      'Library Unit'
    ];
    const total = Math.max(1, this.totalCardStudents);
    const weights = [0.34, 0.22, 0.18, 0.12, 0.08, 0.06];

    return stationNames.map((name, index) => {
      const estimated = Math.max(1, Math.round(total * weights[index]));
      const clrPct = this.smartCardClearanceRate;
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
      if (this.getRequestOfficeStatus(r, 'Smart Card') === 'Approved') {
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

  get cardStatusPieSlices() {
    const tot = Math.max(1, this.totalCardStudents);
    const items = [
      { label: 'Smart IDs Surrendered & Cleared', count: this.clearedCardsCount, color: '#10b981' },
      { label: 'Pending Physical Handover', count: this.pendingCardsCount, color: '#f59e0b' },
      { label: 'Lost Cards / Penalty Receipt Needed', count: this.flaggedCardsCount, color: '#ef4444' }
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

  get stationSharePieSlices() {
    const stations = this.stations.slice(0, 6);
    const colors = ['#00679b', '#059669', '#7c3aed', '#d97706', '#ea580c', '#0891b2'];
    const totalCap = Math.max(1, stations.reduce((sum, s) => sum + (s.capacity || 0), 0));

    let currentAngle = -90;
    return stations.map((s, i) => {
      const count = s.capacity || 5000;
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
        label: s.name.replace(' Smart Card Center', '').replace(' Student Card Unit', '').replace(' Desk', ''),
        count,
        color: colors[i % colors.length],
        percentage: Math.round((count / totalCap) * 100),
        svgPath
      };
    });
  }

  get collegeCardRankings(): CollegeCardRankingItem[] {
    const colleges = [
      { code: 'CoET', name: 'College of Engineering and Technology' },
      { code: 'CoICT', name: 'College of Information & Communication Technologies' },
      { code: 'UDBS', name: 'University of Dar es Salaam Business School' },
      { code: 'CoNAS', name: 'College of Natural and Applied Sciences' },
      { code: 'CoSS', name: 'College of Social Sciences' },
      { code: 'SoED', name: 'School of Education' }
    ];

    const map = new Map<string, { studentCount: number; clearedCount: number }>();
    colleges.forEach(c => map.set(c.code, { studentCount: 0, clearedCount: 0 }));

    this.analyticsFilteredRequests.forEach(r => {
      const col = (r.college || 'CoET').toUpperCase();
      const matched = colleges.find(c => col.includes(c.code))?.code || 'CoET';
      const rec = map.get(matched)!;
      rec.studentCount++;
      if (this.getRequestOfficeStatus(r, 'Smart Card') === 'Approved') {
        rec.clearedCount++;
      }
    });

    const list: CollegeCardRankingItem[] = colleges.map(c => {
      const rec = map.get(c.code) || { studentCount: 0, clearedCount: 0 };
      const tot = rec.studentCount;
      const clrRate = tot > 0 ? Math.round((rec.clearedCount / tot) * 100) : 0;

      let activityLevel = 'Normal Surrender';
      let badgeClass = 'badge-info';
      if (clrRate >= 75) {
        activityLevel = 'High Clearance';
        badgeClass = 'badge-success';
      } else if (clrRate < 45) {
        activityLevel = 'Surrender Pending';
        badgeClass = 'badge-danger';
      }

      return {
        rank: 0,
        collegeCode: c.code,
        fullName: c.name,
        studentCount: tot,
        clearedCount: rec.clearedCount,
        clearanceRate: clrRate,
        activityLevel,
        badgeClass
      };
    });

    list.sort((a, b) => b.studentCount - a.studentCount);
    list.forEach((item, index) => {
      item.rank = index + 1;
    });

    return list;
  }

  downloadAnalyticsCsv(): void {
    const rows = [
      ['UNIVERSITY OF DAR ES SALAAM - SMART CARD OFFICE CLEARANCE REPORT'],
      [`Date: ${new Date().toLocaleString()}`],
      [],
      ['1. EXECUTIVE METRICS'],
      ['Total Student IDs Analyzed', String(this.totalCardStudents)],
      ['Smart Cards Surrendered & Cleared', String(this.clearedCardsCount)],
      ['Pending Physical Surrenders', String(this.pendingCardsCount)],
      ['Lost Cards / Penalty Receipt Needed', String(this.flaggedCardsCount)],
      ['Overall Smart Card Clearance Rate', `${this.smartCardClearanceRate}%`],
      ['Total Stations Processing Capacity', String(this.totalStationCapacity)],
      [],
      ['2. GENDER CLASSIFICATION'],
      ['Gender', 'Total Students', 'Share %'],
      ['Male', String(this.genderStats.maleTotal), `${this.genderStats.malePercent}%`],
      ['Female', String(this.genderStats.femaleTotal), `${this.genderStats.femalePercent}%`],
      [],
      ['3. CARD STATION CLEARANCE BREAKDOWN'],
      ['Station Name', 'Processing Volume', 'Cleared Count'],
      ...this.stationHistogram.map(s => [s.label, String(s.count), String(s.cleared)]),
      [],
      ['4. COLLEGE SMART CARD CLEARANCE RANKING'],
      ['Rank', 'College Code', 'College Full Name', 'Total Students', 'Cleared', 'Clearance Rate %', 'Status'],
      ...this.collegeCardRankings.map(c => [String(c.rank), c.collegeCode, c.fullName, String(c.studentCount), String(c.clearedCount), `${c.clearanceRate}%`, c.activityLevel])
    ];

    const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `smart-card-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    this.toastService.success('Export Successful', 'Smart Card analytics report exported as CSV.');
  }

  printAnalytics(): void {
    window.print();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
