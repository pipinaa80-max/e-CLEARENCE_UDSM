// src/app/games-coach/games-coach.ts

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
import { ToastService } from '../../core/services/toast.service';

export interface SportsFacility {
  id: string;
  name: string;
  category: string;
  capacity: number;
  location: string;
  coachName: string;
  coachContact: string;
  sports: string[];
  description: string;
}

export interface GamesAnalyticsItem {
  name: string;
  discipline: string;
  issuedCount: number;
  clearedCount: number;
  pendingCount: number;
  clearanceRate: number;
  heightPercent: number;
  clearedPercent: number;
  pendingPercent: number;
}

export interface CollegeSportsRanking {
  rank: number;
  college: string;
  fullName: string;
  athleteCount: number;
  clearedCount: number;
  clearanceRate: number;
  activityLevel: string;
  badgeClass: string;
}

const DEFAULT_FACILITIES: SportsFacility[] = [
  {
    id: 'main-stadium',
    name: 'University Sports Complex & Stadium',
    category: 'Outdoor Stadium',
    capacity: 12000,
    location: 'Main Campus East Wing',
    coachName: 'Coach M. Kibona',
    coachContact: '+255 22 241 0700',
    sports: ['Football', 'Track & Field', 'Rugby', 'Athletics'],
    description: 'Premier campus sports venue hosting university inter-college leagues, athletic meets, and physical education.'
  },
  {
    id: 'basketball-arena',
    name: 'Indoor Basketball & Volleyball Arena',
    category: 'Indoor Courts',
    capacity: 1500,
    location: 'Sports Zone Block C',
    coachName: 'Coach F. Mwakipesile',
    coachContact: '+255 22 241 0702',
    sports: ['Basketball', 'Volleyball', 'Netball'],
    description: 'Enclosed multi-court facility with wooden sprung flooring for competitive ball games.'
  },
  {
    id: 'fitness-centre',
    name: 'Mlimani Fitness Centre & Gymnasium',
    category: 'Fitness & Gym',
    capacity: 300,
    location: 'Near Student Center',
    coachName: 'Coach S. Ndunguru',
    coachContact: '+255 22 241 0704',
    sports: ['Weightlifting', 'Powerlifting', 'Aerobics', 'Table Tennis'],
    description: 'Modern cardiovascular and strength training gym equipped for students and athletes.'
  },
  {
    id: 'tennis-courts',
    name: 'University Tennis & Racket Courts',
    category: 'Racket Sports',
    capacity: 250,
    location: 'Lower Campus Grounds',
    coachName: 'Coach R. Minja',
    coachContact: '+255 22 241 0706',
    sports: ['Lawn Tennis', 'Badminton', 'Squash'],
    description: 'All-weather hard tennis and racket courts with evening floodlight capabilities.'
  },
  {
    id: 'aquatic-centre',
    name: 'Swimming & Aquatic Sports Centre',
    category: 'Aquatics',
    capacity: 500,
    location: 'North Sports Precinct',
    coachName: 'Coach E. Mushi',
    coachContact: '+255 22 241 0708',
    sports: ['Swimming', 'Lifesaving', 'Water Polo'],
    description: 'Olympic-size 50-meter swimming pool and diving facilities for training and recreation.'
  }
];

@Component({
  selector: 'app-games-coach',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent, ParallelOfficeRequestTableComponent],
  templateUrl: './games_coach.html',
  styleUrl: './games_coach.css'
})
export class GamesCoachComponent {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly Math = Math;
  sidebarOpen = false;
  viewMode: 'overview' | 'requests' | 'facilities' | 'analytics' = 'requests';

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
  hoveredSliceLabel: string | null = null;

  // Facilities Management State
  facilities: SportsFacility[] = [];
  facilitySearchTerm = '';
  showFacilityModal = false;
  editingFacilityId: string | null = null;
  expandedFacilityIds = new Set<string>();

  facilityForm = {
    name: '',
    category: '',
    capacity: null as number | null,
    location: '',
    coachName: '',
    coachContact: '',
    sportsText: '',
    description: ''
  };

  constructor() {
    this.loadFacilities();
  }

  setViewMode(mode: 'overview' | 'requests' | 'facilities' | 'analytics'): void {
    this.viewMode = mode;
    this.sidebarOpen = false;
  }

  loadFacilities(): void {
    const saved = localStorage.getItem('udsm-games-facilities');
    if (saved) {
      try {
        this.facilities = JSON.parse(saved);
      } catch {
        this.facilities = [...DEFAULT_FACILITIES];
      }
    } else {
      this.facilities = [...DEFAULT_FACILITIES];
      this.saveFacilitiesToStorage();
    }
  }

  saveFacilitiesToStorage(): void {
    localStorage.setItem('udsm-games-facilities', JSON.stringify(this.facilities));
  }

  get filteredFacilities(): SportsFacility[] {
    const s = this.facilitySearchTerm.trim().toLowerCase();
    if (!s) return this.facilities;
    return this.facilities.filter(f =>
      f.name.toLowerCase().includes(s) ||
      f.category.toLowerCase().includes(s) ||
      f.location.toLowerCase().includes(s) ||
      f.coachName.toLowerCase().includes(s) ||
      f.sports.some(sp => sp.toLowerCase().includes(s))
    );
  }

  toggleFacilityDetails(id: string): void {
    if (this.expandedFacilityIds.has(id)) {
      this.expandedFacilityIds.delete(id);
    } else {
      this.expandedFacilityIds.add(id);
    }
  }

  isFacilityExpanded(id: string): boolean {
    return this.expandedFacilityIds.has(id);
  }

  openAddFacilityModal(): void {
    this.editingFacilityId = null;
    this.facilityForm = {
      name: '',
      category: 'Outdoor Stadium',
      capacity: null,
      location: '',
      coachName: '',
      coachContact: '',
      sportsText: '',
      description: ''
    };
    this.showFacilityModal = true;
  }

  openEditFacilityModal(facility: SportsFacility): void {
    this.editingFacilityId = facility.id;
    this.facilityForm = {
      name: facility.name,
      category: facility.category,
      capacity: facility.capacity,
      location: facility.location,
      coachName: facility.coachName,
      coachContact: facility.coachContact,
      sportsText: (facility.sports || []).join(', '),
      description: facility.description
    };
    this.showFacilityModal = true;
  }

  closeFacilityModal(): void {
    this.showFacilityModal = false;
    this.editingFacilityId = null;
  }

  saveFacility(): void {
    const name = this.facilityForm.name.trim();
    if (!name) {
      this.toastService.warning('Validation', 'Facility name is required.');
      return;
    }

    const sports = this.facilityForm.sportsText.split(',').map(s => s.trim()).filter(Boolean);
    const id = this.editingFacilityId || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const facility: SportsFacility = {
      id,
      name,
      category: this.facilityForm.category.trim() || 'General Facility',
      capacity: this.facilityForm.capacity ? Number(this.facilityForm.capacity) : 200,
      location: this.facilityForm.location.trim() || 'University Sports Complex',
      coachName: this.facilityForm.coachName.trim() || 'Staff Coach',
      coachContact: this.facilityForm.coachContact.trim() || '+255 22 241 0700',
      sports: sports.length ? sports : ['General Games'],
      description: this.facilityForm.description.trim() || 'University sports and recreation facility.'
    };

    const index = this.facilities.findIndex(f => f.id === id);
    if (index >= 0) {
      this.facilities[index] = facility;
    } else {
      this.facilities.push(facility);
    }

    this.saveFacilitiesToStorage();
    this.closeFacilityModal();
    this.toastService.success('Saved', `Facility "${name}" saved successfully.`);
  }

  deleteFacility(facility: SportsFacility): void {
    if (!confirm(`Are you sure you want to remove "${facility.name}"?`)) return;
    this.facilities = this.facilities.filter(f => f.id !== facility.id);
    this.saveFacilitiesToStorage();
    this.toastService.info('Removed', `Facility "${facility.name}" was removed.`);
  }

  resetFacilities(): void {
    if (!confirm('Reset all sports facilities to defaults?')) return;
    this.facilities = [...DEFAULT_FACILITIES];
    this.saveFacilitiesToStorage();
    this.toastService.success('Reset', 'Sports facilities restored to standard defaults.');
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
    return this.clearanceService.getRequestsForOffice('Games Coach');
  }

  get pendingRequestCount(): number {
    return this.requests.filter(request => this.getRequestOfficeStatus(request, 'Games Coach') === 'Pending').length;
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

    return list.filter(r => this.getRequestOfficeStatus(r, 'Games Coach') === this.filterStatus);
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
    if (!name || name.startsWith('Student')) return 'ST';
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

  getStudentSport(request: ClearanceRequest): string {
    const user = this.getStudentData(request.studentId);
    if (user?.sportsClub) return user.sportsClub;
    const reg = request.registrationNumber || request.studentId;
    const sports = ['Football / Soccer', 'Basketball', 'Track & Field', 'Volleyball', 'Table Tennis', 'Gym & Fitness', 'Swimming'];
    let code = 0;
    for (let i = 0; i < reg.length; i++) code += reg.charCodeAt(i);
    return sports[code % sports.length];
  }

  getStudentKitStatus(request: ClearanceRequest): string {
    const status = this.getRequestOfficeStatus(request, 'Games Coach');
    if (status === 'Approved') return 'All Equipment & Kits Returned in Good Condition';
    if (status === 'Rejected') return 'Outstanding / Unreturned Equipment Flagged';
    return 'Under Verification · No Overdue Penalties Detected';
  }

  hoveredFacilityName: string | null = null;
  setHoveredFacility(name: string | null): void {
    this.hoveredFacilityName = name;
  }

  setHoveredSlice(label: string | null): void {
    this.hoveredSliceLabel = label;
  }

  async approve(request: ClearanceRequest): Promise<void> {
    const staff = this.authService.getCurrentUser();
    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }
    const studentName = this.getStudentName(request);
    if (!await this.clearanceService.approveRequest(
      request.id,
      'Games Coach',
      staff.fullName
    )) return;
    this.notificationService.createNotification(
      request.studentId,
      'Games Coach clearance approved',
      'The Games Coach has verified sports equipment returns and approved your clearance.',
      'success'
    );
    this.toastService.success('Approved', `Games Coach clearance approved for ${studentName}.`);
    this.message = 'Games Coach clearance approved successfully.';
    setTimeout(() => { this.message = ''; }, 4000);
  }

  openRejectForm(request: ClearanceRequest): void {
    this.selectedRequest = request;
    this.rejectionComment = '';
    this.message = '';
  }

  async reject(): Promise<void> {
    const staff = this.authService.getCurrentUser();
    if (!staff || !this.selectedRequest) return;

    if (!this.rejectionComment.trim()) {
      this.toastService.warning('Comment Required', 'Please provide a reason for rejection.');
      return;
    }
    const studentName = this.getStudentName(this.selectedRequest);
    if (!await this.clearanceService.rejectRequest(
      this.selectedRequest.id,
      'Games Coach',
      staff.fullName,
      this.rejectionComment
    )) return;
    this.notificationService.createNotification(
      this.selectedRequest.studentId,
      'Games Coach action required',
      this.rejectionComment.trim(),
      'warning'
    );

    this.toastService.warning('Returned', `Games Coach clearance request returned for ${studentName}.`);
    this.message = 'The student has been notified regarding unreturned sports gear or action required.';
    this.selectedRequest = null;
    this.rejectionComment = '';
    setTimeout(() => { this.message = ''; }, 4000);
  }

  // =========================================================================
  // GAMES COACH STATISTICAL ANALYTICS ENGINE
  // =========================================================================

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

  get totalAthletesCount(): number {
    return this.analyticsFilteredRequests.length;
  }

  get clearedKitsCount(): number {
    return this.analyticsFilteredRequests.filter(r => this.getRequestOfficeStatus(r, 'Games Coach') === 'Approved').length;
  }

  get pendingKitsCount(): number {
    return this.analyticsFilteredRequests.filter(r => this.getRequestOfficeStatus(r, 'Games Coach') === 'Pending').length;
  }

  get flaggedKitsCount(): number {
    return this.analyticsFilteredRequests.filter(r => this.getRequestOfficeStatus(r, 'Games Coach') === 'Rejected').length;
  }

  get gamesClearanceRate(): number {
    const tot = Math.max(1, this.totalAthletesCount);
    return Math.round((this.clearedKitsCount / tot) * 100);
  }

  get totalSportsCapacity(): number {
    return this.facilities.reduce((sum, f) => sum + (f.capacity || 0), 0) || 14050;
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

  get sportsDisciplineHistogram(): GamesAnalyticsItem[] {
    const disciplines = [
      { name: 'Soccer / Football', discipline: 'Football Kits & Balls' },
      { name: 'Basketball', discipline: 'Balls & Team Jerseys' },
      { name: 'Track & Athletics', discipline: 'Spikes & Relay Batons' },
      { name: 'Volleyball / Netball', discipline: 'Nets & Match Balls' },
      { name: 'Gym & Fitness', discipline: 'Locker Keys & Belts' },
      { name: 'Racket Sports', discipline: 'Rackets & Shuttlecocks' }
    ];

    const total = Math.max(1, this.totalAthletesCount);
    const weights = [0.30, 0.22, 0.18, 0.14, 0.10, 0.06];

    return disciplines.map((d, index) => {
      const estimated = Math.max(1, Math.round(total * weights[index]));
      const clrPct = this.gamesClearanceRate;
      const cleared = Math.round(estimated * (clrPct / 100));
      const pending = estimated - cleared;

      return {
        name: d.name,
        discipline: d.discipline,
        issuedCount: estimated,
        clearedCount: cleared,
        pendingCount: pending,
        clearanceRate: clrPct,
        heightPercent: Math.max(15, Math.round(weights[index] * 300)),
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
      if (this.getRequestOfficeStatus(r, 'Games Coach') === 'Approved') {
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

  get statusPieSlices() {
    const tot = Math.max(1, this.totalAthletesCount);
    const items = [
      { label: 'Equipment Cleared & Returned', count: this.clearedKitsCount, color: '#10b981' },
      { label: 'Pending Equipment Returns', count: this.pendingKitsCount, color: '#f59e0b' },
      { label: 'Missing / Damaged Gear Flagged', count: this.flaggedKitsCount, color: '#ef4444' }
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

  get facilityDemandPieSlices() {
    const facilities = this.facilities;
    const colors = ['#00679b', '#059669', '#7c3aed', '#d97706', '#ea580c'];
    const totalCap = Math.max(1, this.totalSportsCapacity);

    let currentAngle = -90;
    return facilities.map((f, i) => {
      const count = f.capacity || 200;
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
        label: f.name.replace('University ', '').replace('Sports Complex & ', ''),
        count,
        color: colors[i % colors.length],
        percentage: Math.round((count / totalCap) * 100),
        svgPath
      };
    });
  }

  get collegeSportsRankings(): CollegeSportsRanking[] {
    const colleges = [
      { code: 'CoET', name: 'College of Engineering and Technology' },
      { code: 'CoICT', name: 'College of Information & Communication Technologies' },
      { code: 'UDBS', name: 'University of Dar es Salaam Business School' },
      { code: 'CoNAS', name: 'College of Natural and Applied Sciences' },
      { code: 'CoSS', name: 'College of Social Sciences' },
      { code: 'SoED', name: 'School of Education' }
    ];

    const map = new Map<string, { athleteCount: number; clearedCount: number }>();
    colleges.forEach(c => map.set(c.code, { athleteCount: 0, clearedCount: 0 }));

    this.analyticsFilteredRequests.forEach(r => {
      const col = (r.college || 'CoET').toUpperCase();
      const matched = colleges.find(c => col.includes(c.code))?.code || 'CoET';
      const rec = map.get(matched)!;
      rec.athleteCount++;
      if (this.getRequestOfficeStatus(r, 'Games Coach') === 'Approved') {
        rec.clearedCount++;
      }
    });

    const list: CollegeSportsRanking[] = colleges.map(c => {
      const rec = map.get(c.code) || { athleteCount: 0, clearedCount: 0 };
      const tot = rec.athleteCount;
      const clrRate = tot > 0 ? Math.round((rec.clearedCount / tot) * 100) : 0;

      let activityLevel = 'Active';
      let badgeClass = 'badge-info';
      if (tot >= 10) {
        activityLevel = 'High Participation';
        badgeClass = 'badge-danger';
      } else if (tot >= 5) {
        activityLevel = 'Moderate';
        badgeClass = 'badge-warning';
      }

      return {
        rank: 0,
        college: c.code,
        fullName: c.name,
        athleteCount: tot,
        clearedCount: rec.clearedCount,
        clearanceRate: clrRate,
        activityLevel,
        badgeClass
      };
    });

    list.sort((a, b) => b.athleteCount - a.athleteCount);
    list.forEach((item, index) => {
      item.rank = index + 1;
    });

    return list;
  }

  downloadAnalyticsCsv(): void {
    const rows = [
      ['UNIVERSITY OF DAR ES SALAAM - GAMES & SPORTS CLEARANCE REPORT'],
      [`Date: ${new Date().toLocaleString()}`],
      [],
      ['1. EXECUTIVE METRICS'],
      ['Total Athletes & Borrowers', String(this.totalAthletesCount)],
      ['Sports Equipment Cleared', String(this.clearedKitsCount)],
      ['Pending Equipment Returns', String(this.pendingKitsCount)],
      ['Overdue / Damaged Flagged', String(this.flaggedKitsCount)],
      ['Overall Clearance Rate', `${this.gamesClearanceRate}%`],
      ['Total Sports Facilities Capacity', String(this.totalSportsCapacity)],
      [],
      ['2. GENDER CLASSIFICATION'],
      ['Gender', 'Total Athletes', 'Share %'],
      ['Male', String(this.genderStats.maleTotal), `${this.genderStats.malePercent}%`],
      ['Female', String(this.genderStats.femaleTotal), `${this.genderStats.femalePercent}%`],
      [],
      ['3. SPORTS DISCIPLINES BREAKDOWN'],
      ['Discipline', 'Kit / Equipment Type', 'Issued Volume', 'Cleared Count', 'Clearance Rate %'],
      ...this.sportsDisciplineHistogram.map(d => [d.name, d.discipline, String(d.issuedCount), String(d.clearedCount), `${d.clearanceRate}%`]),
      [],
      ['4. COLLEGE SPORTS PARTICIPATION & CLEARANCE LEADERBOARD'],
      ['Rank', 'College', 'College Full Name', 'Total Athletes', 'Cleared', 'Clearance Rate %', 'Activity Level'],
      ...this.collegeSportsRankings.map(c => [String(c.rank), c.college, c.fullName, String(c.athleteCount), String(c.clearedCount), `${c.clearanceRate}%`, c.activityLevel])
    ];

    const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `games-coach-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    this.toastService.success('Export Successful', 'Games Coach analytics report exported as CSV.');
  }

  printAnalytics(): void {
    window.print();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
