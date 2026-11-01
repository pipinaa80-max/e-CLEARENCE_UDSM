// src/app/dashboard/daruso/daruso.ts

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

export interface GuildChapterItem {
  id: string;
  name: string;
  category: string;
  capacity: number;
  location: string;
  leaderName: string;
  leaderContact: string;
  committees: string[];
  description: string;
}

export interface GuildRankingItem {
  rank: number;
  guildName: string;
  collegeCode: string;
  location: string;
  memberCount: number;
  clearedCount: number;
  clearanceRate: number;
  statusBadge: string;
  badgeClass: string;
}

const DEFAULT_GUILDS: GuildChapterItem[] = [
  {
    id: 'daruso-central',
    name: 'DARUSO Central Government',
    category: 'Supreme Executive Cabinet',
    capacity: 25000,
    location: 'Student Center 1st Floor',
    leaderName: 'President E. John',
    leaderContact: '+255 22 241 0601',
    committees: ['Executive Cabinet', 'University Students Representative Council (USRC)', 'Electoral Commission'],
    description: 'Supreme student government organ overseeing student affairs, union fee clearance, and welfare.'
  },
  {
    id: 'daruso-coict',
    name: 'DARUSO CoICT Guild Sub-Government',
    category: 'Collegiate Guild',
    capacity: 3200,
    location: 'Kijitonyama Campus Block B',
    leaderName: 'Minister M. Kassim',
    leaderContact: '+255 22 241 0602',
    committees: ['Academic Committee', 'ICT Projects Committee', 'Student Welfare Desk'],
    description: 'College of Information & Communication Technologies student guild secretariat.'
  },
  {
    id: 'daruso-coet',
    name: 'DARUSO CoET Guild Sub-Government',
    category: 'Collegiate Guild',
    capacity: 4800,
    location: 'Engineering Complex Block E',
    leaderName: 'Minister B. Mwamba',
    leaderContact: '+255 22 241 0603',
    committees: ['Engineering Guild', 'Industrial Training Liaison', 'Sports & Social Committee'],
    description: 'College of Engineering & Technology guild sub-government coordinating engineering students.'
  },
  {
    id: 'daruso-udbs',
    name: 'DARUSO UDBS Guild Sub-Government',
    category: 'Collegiate Guild',
    capacity: 4100,
    location: 'Business School Building Ground Floor',
    leaderName: 'Minister S. Komba',
    leaderContact: '+255 22 241 0604',
    committees: ['Finance & Auditing', 'Career Development', 'Entrepreneurship Club Liaison'],
    description: 'University of Dar es Salaam Business School student government representation.'
  },
  {
    id: 'daruso-conas',
    name: 'DARUSO CoNAS Guild Sub-Government',
    category: 'Collegiate Guild',
    capacity: 2900,
    location: 'Science Complex Botany Wing',
    leaderName: 'Minister D. Mrema',
    leaderContact: '+255 22 241 0605',
    committees: ['Science Forum', 'Laboratory Welfare Liaison', 'Undergraduate Research Committee'],
    description: 'College of Natural and Applied Sciences student representative council.'
  },
  {
    id: 'daruso-coss',
    name: 'DARUSO CoSS & CHIS Guild Sub-Government',
    category: 'Collegiate Guild',
    capacity: 3600,
    location: 'Arts Building Room 108',
    leaderName: 'Minister H. Bakari',
    leaderContact: '+255 22 241 0606',
    committees: ['Humanities Forum', 'Public Debate Council', 'Social Justice Desk'],
    description: 'College of Social Sciences & College of Humanities student guild body.'
  },
  {
    id: 'daruso-soed',
    name: 'DARUSO SoED Guild Sub-Government',
    category: 'Collegiate Guild',
    capacity: 3400,
    location: 'School of Education Complex',
    leaderName: 'Minister G. Tarimo',
    leaderContact: '+255 22 241 0607',
    committees: ['Teaching Practice Committee', 'Student Teachers Union', 'Welfare & Ethics Desk'],
    description: 'School of Education student government sub-cabinet.'
  },
  {
    id: 'daruso-mabibo',
    name: 'DARUSO Mabibo Campus Secretariat',
    category: 'Residential Campus Guild',
    capacity: 4500,
    location: 'Mabibo Center Ground Floor',
    leaderName: 'Minister R. Kijazi',
    leaderContact: '+255 22 241 0608',
    committees: ['Hostel Welfare Council', 'Cafeteria Quality Inspection', 'Transport Liaison'],
    description: 'Mabibo external campus student union liaison and residential affairs branch.'
  }
];

@Component({
  selector: 'app-daruso',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent, ParallelOfficeRequestTableComponent],
  templateUrl: './daruso.html',
  styleUrl: './daruso.css'
})
export class DarusoComponent {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly Math = Math;
  sidebarOpen = false;
  viewMode: 'all' | 'requests' | 'guilds' | 'analytics' = 'all';

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
  hoveredGuildName: string | null = null;
  hoveredSliceLabel: string | null = null;

  // Guilds Directory State
  guilds: GuildChapterItem[] = [];
  guildSearchTerm = '';
  showGuildModal = false;
  editingGuildId: string | null = null;
  expandedGuildIds = new Set<string>();

  guildForm = {
    name: '',
    category: 'Collegiate Guild',
    capacity: null as number | null,
    location: 'Main Campus',
    leaderName: '',
    leaderContact: '',
    committeesText: '',
    description: ''
  };

  constructor() {
    this.loadGuilds();
  }

  setViewMode(mode: 'all' | 'requests' | 'guilds' | 'analytics'): void {
    this.viewMode = mode;
  }

  loadGuilds(): void {
    const saved = localStorage.getItem('udsm-daruso-guilds');
    if (saved) {
      try {
        this.guilds = JSON.parse(saved);
      } catch {
        this.guilds = [...DEFAULT_GUILDS];
      }
    } else {
      this.guilds = [...DEFAULT_GUILDS];
      this.saveGuildsToStorage();
    }
  }

  saveGuildsToStorage(): void {
    localStorage.setItem('udsm-daruso-guilds', JSON.stringify(this.guilds));
  }

  get filteredGuilds(): GuildChapterItem[] {
    const s = this.guildSearchTerm.trim().toLowerCase();
    if (!s) return this.guilds;
    return this.guilds.filter(g =>
      g.name.toLowerCase().includes(s) ||
      g.category.toLowerCase().includes(s) ||
      g.location.toLowerCase().includes(s) ||
      g.leaderName.toLowerCase().includes(s) ||
      g.committees.some(c => c.toLowerCase().includes(s))
    );
  }

  toggleGuildDetails(id: string): void {
    if (this.expandedGuildIds.has(id)) {
      this.expandedGuildIds.delete(id);
    } else {
      this.expandedGuildIds.add(id);
    }
  }

  isGuildExpanded(id: string): boolean {
    return this.expandedGuildIds.has(id);
  }

  openAddGuildModal(): void {
    this.editingGuildId = null;
    this.guildForm = {
      name: '',
      category: 'Collegiate Guild',
      capacity: null,
      location: 'Main Campus',
      leaderName: '',
      leaderContact: '',
      committeesText: '',
      description: ''
    };
    this.showGuildModal = true;
  }

  openEditGuildModal(guild: GuildChapterItem): void {
    this.editingGuildId = guild.id;
    this.guildForm = {
      name: guild.name,
      category: guild.category,
      capacity: guild.capacity,
      location: guild.location,
      leaderName: guild.leaderName,
      leaderContact: guild.leaderContact,
      committeesText: (guild.committees || []).join(', '),
      description: guild.description
    };
    this.showGuildModal = true;
  }

  closeGuildModal(): void {
    this.showGuildModal = false;
    this.editingGuildId = null;
  }

  saveGuild(): void {
    const name = this.guildForm.name.trim();
    if (!name) {
      this.toastService.warning('Validation', 'Guild chapter name is required.');
      return;
    }

    const committees = this.guildForm.committeesText.split(',').map(c => c.trim()).filter(Boolean);
    const id = this.editingGuildId || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const guild: GuildChapterItem = {
      id,
      name,
      category: this.guildForm.category.trim() || 'Student Guild',
      capacity: this.guildForm.capacity ? Number(this.guildForm.capacity) : 3000,
      location: this.guildForm.location.trim() || 'Student Center',
      leaderName: this.guildForm.leaderName.trim() || 'Guild Minister',
      leaderContact: this.guildForm.leaderContact.trim() || '+255 22 241 0600',
      committees: committees.length ? committees : ['Executive Committee'],
      description: this.guildForm.description.trim() || 'Student government representation chapter.'
    };

    const index = this.guilds.findIndex(g => g.id === id);
    if (index >= 0) {
      this.guilds[index] = guild;
    } else {
      this.guilds.push(guild);
    }

    this.saveGuildsToStorage();
    this.closeGuildModal();
    this.toastService.success('Saved', `Guild Chapter "${name}" saved successfully.`);
  }

  deleteGuild(guild: GuildChapterItem): void {
    if (!confirm(`Are you sure you want to delete "${guild.name}"?`)) return;
    this.guilds = this.guilds.filter(g => g.id !== guild.id);
    this.saveGuildsToStorage();
    this.toastService.info('Removed', `Guild Chapter "${guild.name}" removed.`);
  }

  resetGuilds(): void {
    if (!confirm('Reset all student guilds & union chapters to defaults?')) return;
    this.guilds = [...DEFAULT_GUILDS];
    this.saveGuildsToStorage();
    this.toastService.success('Reset', 'Student guilds restored to standard defaults.');
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

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  getRequestOfficeStatus(request: ClearanceRequest, office: string): string {
    return request.approvals.find(a => a.office === office)?.status ?? 'Pending';
  }

  get requests(): ClearanceRequest[] {
    return this.clearanceService.getRequestsForOffice('DARUSO');
  }

  get pendingRequestCount(): number {
    return this.requests.filter(request => this.getRequestOfficeStatus(request, 'DARUSO') === 'Pending').length;
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

    return list.filter(r => this.getRequestOfficeStatus(r, 'DARUSO') === this.filterStatus);
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

  getStudentGuildBranch(request: ClearanceRequest): string {
    const col = (this.getStudentCollege(request) || '').toUpperCase();
    if (col.includes('COICT')) return 'DARUSO CoICT Guild Branch';
    if (col.includes('COET')) return 'DARUSO CoET Guild Branch';
    if (col.includes('UDBS')) return 'DARUSO UDBS Guild Branch';
    if (col.includes('CONAS')) return 'DARUSO CoNAS Guild Branch';
    if (col.includes('SOED')) return 'DARUSO SoED Guild Branch';
    return 'DARUSO Central Government';
  }

  getStudentDuesStatus(request: ClearanceRequest): string {
    const status = this.getRequestOfficeStatus(request, 'DARUSO');
    if (status === 'Approved') return 'Union Dues Fully Settled · No Outstanding Government Liabilities';
    if (status === 'Rejected') return 'Unpaid Annual Union Dues / Committee Assets Flagged';
    return 'Dues Verification In Progress · Good Standing';
  }

  approve(request: ClearanceRequest): void {
    const staff = this.authService.getCurrentUser();
    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }

    const studentName = this.getStudentName(request);
    const confirmApprove = confirm(
      `⚠️ Attention: Approve Clearance\n\nAre you sure you want to APPROVE DARUSO clearance for ${studentName}?`
    );
    if (!confirmApprove) return;

    this.clearanceService.approveRequest(request.id, 'DARUSO', staff.fullName);
    this.notificationService.createNotification(
      request.studentId,
      'DARUSO clearance approved',
      'DARUSO has verified student union dues and approved your clearance.',
      'success'
    );
    this.message = 'DARUSO clearance was approved successfully.';
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

    const studentName = this.getStudentName(this.selectedRequest);
    const confirmReject = confirm(
      `⚠️ Attention: Reject Clearance\n\nAre you sure you want to REJECT DARUSO clearance for ${studentName}?`
    );
    if (!confirmReject) return;

    this.clearanceService.rejectRequest(this.selectedRequest.id, 'DARUSO', staff.fullName, this.rejectionComment);
    this.notificationService.createNotification(
      this.selectedRequest.studentId,
      'DARUSO action required',
      this.rejectionComment,
      'warning'
    );

    this.message = 'The student has been notified regarding DARUSO dues or committee liabilities.';
    this.selectedRequest = null;
    this.rejectionComment = '';
    setTimeout(() => { this.message = ''; }, 4000);
  }

  // =========================================================================
  // DARUSO STATISTICAL ANALYTICS ENGINE
  // =========================================================================

  setHoveredGuild(name: string | null): void {
    this.hoveredGuildName = name;
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

  get totalUnionStudents(): number {
    return this.analyticsFilteredRequests.length;
  }

  get duesClearedCount(): number {
    return this.analyticsFilteredRequests.filter(r => this.getRequestOfficeStatus(r, 'DARUSO') === 'Approved').length;
  }

  get pendingDuesCount(): number {
    return this.analyticsFilteredRequests.filter(r => this.getRequestOfficeStatus(r, 'DARUSO') === 'Pending').length;
  }

  get flaggedDuesCount(): number {
    return this.analyticsFilteredRequests.filter(r => this.getRequestOfficeStatus(r, 'DARUSO') === 'Rejected').length;
  }

  get darusoClearanceRate(): number {
    const tot = Math.max(1, this.totalUnionStudents);
    return Math.round((this.duesClearedCount / tot) * 100);
  }

  get totalGuildCapacity(): number {
    return this.guilds.reduce((sum, g) => sum + (g.capacity || 0), 0) || 51500;
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

  get collegeGuildHistogram(): { label: string; count: number; cleared: number; heightPercent: number; clearedPercent: number; pendingPercent: number }[] {
    const colleges = ['CoET', 'CoICT', 'UDBS', 'CoNAS', 'CoSS', 'SoED'];
    const map = new Map<string, { count: number; cleared: number }>();
    colleges.forEach(c => map.set(c, { count: 0, cleared: 0 }));

    this.analyticsFilteredRequests.forEach(r => {
      const col = (r.college || 'CoET').toUpperCase();
      const matched = colleges.find(c => col.includes(c)) || 'CoET';
      const rec = map.get(matched)!;
      rec.count++;
      if (this.getRequestOfficeStatus(r, 'DARUSO') === 'Approved') {
        rec.cleared++;
      }
    });

    const maxCount = Math.max(1, ...Array.from(map.values()).map(v => v.count));

    return colleges.map(c => {
      const rec = map.get(c) || { count: 0, cleared: 0 };
      const tot = Math.max(1, rec.count);
      const clrPct = Math.round((rec.cleared / tot) * 100);
      return {
        label: c + ' Guild',
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
      if (this.getRequestOfficeStatus(r, 'DARUSO') === 'Approved') {
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

  get duesStatusPieSlices() {
    const tot = Math.max(1, this.totalUnionStudents);
    const items = [
      { label: 'Dues Cleared & Verified', count: this.duesClearedCount, color: '#10b981' },
      { label: 'Pending Dues Check', count: this.pendingDuesCount, color: '#f59e0b' },
      { label: 'Outstanding Dues / Sanctions', count: this.flaggedDuesCount, color: '#ef4444' }
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

  get guildSharePieSlices() {
    const guilds = this.guilds.slice(0, 6);
    const colors = ['#00679b', '#059669', '#7c3aed', '#d97706', '#ea580c', '#0891b2'];
    const totalCap = Math.max(1, guilds.reduce((sum, g) => sum + (g.capacity || 0), 0));

    let currentAngle = -90;
    return guilds.map((g, i) => {
      const count = g.capacity || 3000;
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
        label: g.name.replace('DARUSO ', '').replace(' Guild Sub-Government', ''),
        count,
        color: colors[i % colors.length],
        percentage: Math.round((count / totalCap) * 100),
        svgPath
      };
    });
  }

  get guildRankings(): GuildRankingItem[] {
    const colleges = [
      { code: 'CoET', name: 'DARUSO CoET Engineering Guild', loc: 'CoET Complex' },
      { code: 'CoICT', name: 'DARUSO CoICT Technology Guild', loc: 'Kijitonyama' },
      { code: 'UDBS', name: 'DARUSO UDBS Business Guild', loc: 'UDBS Building' },
      { code: 'CoNAS', name: 'DARUSO CoNAS Science Guild', loc: 'Science Wing' },
      { code: 'CoSS', name: 'DARUSO CoSS Social Sciences Guild', loc: 'Arts Building' },
      { code: 'SoED', name: 'DARUSO SoED Education Guild', loc: 'SoED Complex' }
    ];

    const map = new Map<string, { memberCount: number; clearedCount: number }>();
    colleges.forEach(c => map.set(c.code, { memberCount: 0, clearedCount: 0 }));

    this.analyticsFilteredRequests.forEach(r => {
      const col = (r.college || 'CoET').toUpperCase();
      const matched = colleges.find(c => col.includes(c.code))?.code || 'CoET';
      const rec = map.get(matched)!;
      rec.memberCount++;
      if (this.getRequestOfficeStatus(r, 'DARUSO') === 'Approved') {
        rec.clearedCount++;
      }
    });

    const list: GuildRankingItem[] = colleges.map(c => {
      const rec = map.get(c.code) || { memberCount: 0, clearedCount: 0 };
      const tot = rec.memberCount;
      const clrRate = tot > 0 ? Math.round((rec.clearedCount / tot) * 100) : 0;

      let statusBadge = 'In Progress';
      let badgeClass = 'badge-info';
      if (clrRate >= 75) {
        statusBadge = 'High Settlement';
        badgeClass = 'badge-success';
      } else if (clrRate < 45) {
        statusBadge = 'Action Required';
        badgeClass = 'badge-danger';
      }

      return {
        rank: 0,
        guildName: c.name,
        collegeCode: c.code,
        location: c.loc,
        memberCount: tot,
        clearedCount: rec.clearedCount,
        clearanceRate: clrRate,
        statusBadge,
        badgeClass
      };
    });

    list.sort((a, b) => b.memberCount - a.memberCount);
    list.forEach((item, index) => {
      item.rank = index + 1;
    });

    return list;
  }

  downloadAnalyticsCsv(): void {
    const rows = [
      ['UNIVERSITY OF DAR ES SALAAM - DARUSO STUDENT UNION CLEARANCE REPORT'],
      [`Date: ${new Date().toLocaleString()}`],
      [],
      ['1. EXECUTIVE METRICS'],
      ['Total Union Members Analyzed', String(this.totalUnionStudents)],
      ['Union Dues Cleared & Verified', String(this.duesClearedCount)],
      ['Pending Dues Verification', String(this.pendingDuesCount)],
      ['Outstanding Liabilities / Sanctions', String(this.flaggedDuesCount)],
      ['DARUSO Clearance Rate', `${this.darusoClearanceRate}%`],
      ['Total Campus Guild Capacity', String(this.totalGuildCapacity)],
      [],
      ['2. GENDER CLASSIFICATION'],
      ['Gender', 'Total Members', 'Share %'],
      ['Male', String(this.genderStats.maleTotal), `${this.genderStats.malePercent}%`],
      ['Female', String(this.genderStats.femaleTotal), `${this.genderStats.femalePercent}%`],
      [],
      ['3. COLLEGIATE GUILD BREAKDOWN'],
      ['Guild Chapter', 'Total Registered', 'Cleared Dues'],
      ...this.collegeGuildHistogram.map(g => [g.label, String(g.count), String(g.cleared)]),
      [],
      ['4. GUILD CHAPTER CLEARANCE RANKING'],
      ['Rank', 'Guild Chapter', 'College Code', 'Location', 'Registered Members', 'Cleared', 'Clearance Rate %', 'Status'],
      ...this.guildRankings.map(g => [String(g.rank), g.guildName, g.collegeCode, g.location, String(g.memberCount), String(g.clearedCount), `${g.clearanceRate}%`, g.statusBadge])
    ];

    const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `daruso-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    this.toastService.success('Export Successful', 'DARUSO analytics report exported as CSV.');
  }

  printAnalytics(): void {
    window.print();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
