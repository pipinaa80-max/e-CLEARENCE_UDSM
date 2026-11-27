// src/app/dashboard/daruso/daruso.ts
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

export interface GuildChapterItem {
  id: string;
  name: string;
  category: string;
  capacity: number;
  location: string;
  leaderTitle: string;
  leaderContact: string;
  committees: string[];
  description: string;
}

export interface DarusoBreakdownStat {
  label: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  clearanceRate: number;
}

const STORAGE_KEY = 'udsm-daruso-guilds';

const DEFAULT_GUILDS: GuildChapterItem[] = [
  {
    id: 'daruso-central',
    name: 'DARUSO Central Government',
    category: 'Executive Cabinet',
    capacity: 25000,
    location: 'Student Center, 1st Floor',
    leaderTitle: 'DARUSO President & Secretary General Office',
    leaderContact: '+255 22 241 0500',
    committees: ['Executive Cabinet', 'University Students Representative Council (USRC)', 'Student Welfare Desk'],
    description: 'Central student government office overseeing DARUSO membership verification, union clearance, and student affairs.'
  },
  {
    id: 'daruso-coict',
    name: 'DARUSO CoICT Guild Sub-Government',
    category: 'Collegiate Guild',
    capacity: 3200,
    location: 'Kijitonyama Campus, Block B',
    leaderTitle: 'CoICT Guild Secretariat',
    leaderContact: '+255 22 241 0500',
    committees: ['Academic Affairs', 'ICT Projects Committee', 'Student Welfare Desk'],
    description: 'College of Information and Communication Technologies student guild secretariat.'
  },
  {
    id: 'daruso-coet',
    name: 'DARUSO CoET Guild Sub-Government',
    category: 'Collegiate Guild',
    capacity: 4800,
    location: 'Engineering Complex, Block E',
    leaderTitle: 'CoET Guild Secretariat',
    leaderContact: '+255 22 241 0500',
    committees: ['Engineering Guild', 'Practical Training Liaison', 'Social & Sports Committee'],
    description: 'College of Engineering and Technology student guild coordinating engineering student representation.'
  },
  {
    id: 'daruso-udbs',
    name: 'DARUSO UDBS Guild Sub-Government',
    category: 'Collegiate Guild',
    capacity: 4100,
    location: 'Business School Building, Ground Floor',
    leaderTitle: 'UDBS Guild Secretariat',
    leaderContact: '+255 22 241 0500',
    committees: ['Finance & Auditing', 'Career Development', 'Student Societies Liaison'],
    description: 'University of Dar es Salaam Business School student government sub-cabinet.'
  },
  {
    id: 'daruso-conas',
    name: 'DARUSO CoNAS Guild Sub-Government',
    category: 'Collegiate Guild',
    capacity: 2900,
    location: 'Science Complex, Main Campus',
    leaderTitle: 'CoNAS Guild Secretariat',
    leaderContact: '+255 22 241 0500',
    committees: ['Science Forum', 'Laboratory Welfare Liaison', 'Undergraduate Research Desk'],
    description: 'College of Natural and Applied Sciences student representative council.'
  },
  {
    id: 'daruso-coss-cohu',
    name: 'DARUSO CoSS & CoHU Guild Sub-Government',
    category: 'Collegiate Guild',
    capacity: 3600,
    location: 'Arts Building, Main Campus',
    leaderTitle: 'CoSS & CoHU Guild Secretariat',
    leaderContact: '+255 22 241 0500',
    committees: ['Humanities Forum', 'Public Debate Council', 'Student Welfare Desk'],
    description: 'College of Social Sciences and College of Humanities student guild representation.'
  },
  {
    id: 'daruso-soed',
    name: 'DARUSO SoED Guild Sub-Government',
    category: 'Collegiate Guild',
    capacity: 3400,
    location: 'School of Education Complex',
    leaderTitle: 'SoED Guild Secretariat',
    leaderContact: '+255 22 241 0500',
    committees: ['Teaching Practice Committee', 'Student Teachers Union', 'Ethics & Welfare Desk'],
    description: 'School of Education student government sub-cabinet.'
  }
];

@Component({
  selector: 'app-daruso',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent, ParallelOfficeRequestTableComponent],
  templateUrl: './daruso.html',
  styleUrl: './daruso.css'
})
export class DarusoComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  sidebarOpen = false;
  viewMode: 'requests' | 'analytics' | 'guilds' = 'requests';

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

  // Local Guilds Directory
  guilds: GuildChapterItem[] = [];
  guildSearchTerm = '';
  showGuildModal = false;
  editingGuildId: string | null = null;
  guildForm = this.createEmptyGuildForm();

  private readonly studentCache = new Map<string, any>();

  ngOnInit(): void {
    const initialTab = this.route.snapshot.queryParamMap.get('tab');
    if (initialTab && ['requests', 'analytics', 'guilds'].includes(initialTab)) {
      this.viewMode = initialTab as any;
    }
    this.loadGuilds();
    this.loadRequests();
  }

  loadRequests(showToast = false): void {
    this.isLoading = true;
    this.clearanceService.fetchOfficeRequests('DARUSO').subscribe({
      next: () => {
        this.isLoading = false;
        this.clampPage();
        if (showToast) {
          this.toastService.success('Refreshed', 'DARUSO clearance queue updated.');
        }
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Unable to load DARUSO clearance requests.';
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
    return this.clearanceService.getRequestsForOffice('DARUSO');
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

  get collegeBreakdown(): DarusoBreakdownStat[] {
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

  setViewMode(mode: 'requests' | 'analytics' | 'guilds'): void {
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
    return request.approvals?.find(a => a.office === 'DARUSO');
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
    if (status === 'Approved') return 'Cleared by DARUSO — no outstanding student union liabilities';
    if (status === 'Rejected') return 'Action required — flagged by DARUSO officer';
    return 'Awaiting DARUSO verification of union dues and guild property';
  }

  getStudentGuildBranch(request: ClearanceRequest): string {
    const col = (request.college || '').toUpperCase();
    if (col.includes('COICT')) return 'DARUSO CoICT Guild Branch';
    if (col.includes('COET')) return 'DARUSO CoET Guild Branch';
    if (col.includes('UDBS')) return 'DARUSO UDBS Guild Branch';
    if (col.includes('CONAS')) return 'DARUSO CoNAS Guild Branch';
    if (col.includes('COSS') || col.includes('COHU')) return 'DARUSO CoSS & CoHU Guild Branch';
    if (col.includes('SOED')) return 'DARUSO SoED Guild Branch';
    return 'DARUSO Central Government';
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
      const ok = await this.clearanceService.approveRequest(request.id, 'DARUSO', staff.fullName || 'DARUSO Officer');
      if (!ok) {
        this.messageState = 'error';
        this.message = 'DARUSO approval could not be completed. Refresh the dashboard and try again.';
        this.toastService.error('Approval Failed', this.message);
        return;
      }

      this.viewingRequest = null;
      this.messageState = 'success';
      this.message = `DARUSO clearance approved for ${studentName} (${this.getStudentRegNumber(request)}).`;
      this.toastService.success('DARUSO Cleared', `${studentName} has been cleared by DARUSO.`);
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
      const ok = await this.clearanceService.rejectRequest(target.id, 'DARUSO', staff.fullName || 'DARUSO Officer', trimmed);
      if (!ok) {
        this.messageState = 'error';
        this.message = 'DARUSO return could not be processed. Refresh the dashboard and try again.';
        this.toastService.error('Rejection Failed', this.message);
        return;
      }

      this.selectedRequest = null;
      this.rejectionComment = '';
      this.messageState = 'success';
      this.message = `DARUSO clearance returned for ${studentName}. Student has been notified.`;
      this.toastService.warning('DARUSO Rejected', `${studentName} was flagged for DARUSO follow-up.`);
      this.clampPage();
    } finally {
      this.isSubmitting = false;
    }
  }

  onTableMutated(): void {
    this.loadRequests();
  }

  /* =========================
     LOCAL GUILDS DIRECTORY CRUD
  ========================= */

  private createEmptyGuildForm() {
    return {
      name: '',
      category: 'Collegiate Guild',
      capacity: null as number | null,
      location: 'Main Campus',
      leaderTitle: '',
      leaderContact: '',
      committeesText: '',
      description: ''
    };
  }

  loadGuilds(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          this.guilds = parsed.map((g: any) => ({
            ...g,
            leaderTitle: g.leaderTitle || g.leaderName || 'Guild Secretariat',
            committees: Array.isArray(g.committees) ? g.committees : []
          }));
          return;
        }
      }
    } catch {
      // Fall back to defaults
    }
    this.guilds = [...DEFAULT_GUILDS];
  }

  private saveGuildsToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.guilds));
    } catch {
      // Ignore storage errors
    }
  }

  get filteredGuilds(): GuildChapterItem[] {
    const q = this.guildSearchTerm.trim().toLowerCase();
    if (!q) return this.guilds;
    return this.guilds.filter(g =>
      g.name.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      g.location.toLowerCase().includes(q) ||
      g.leaderTitle.toLowerCase().includes(q) ||
      g.committees.some(c => c.toLowerCase().includes(q))
    );
  }

  openAddGuildModal(): void {
    this.editingGuildId = null;
    this.guildForm = this.createEmptyGuildForm();
    this.showGuildModal = true;
  }

  openEditGuildModal(guild: GuildChapterItem): void {
    this.editingGuildId = guild.id;
    this.guildForm = {
      name: guild.name,
      category: guild.category,
      capacity: guild.capacity,
      location: guild.location,
      leaderTitle: guild.leaderTitle,
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
      this.toastService.warning('Validation Error', 'Guild chapter name is required.');
      return;
    }

    const committees = this.guildForm.committeesText.split(',').map(c => c.trim()).filter(Boolean);
    const id = this.editingGuildId || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const guild: GuildChapterItem = {
      id,
      name,
      category: this.guildForm.category.trim() || 'Collegiate Guild',
      capacity: this.guildForm.capacity ? Number(this.guildForm.capacity) : 0,
      location: this.guildForm.location.trim() || 'Main Campus',
      leaderTitle: this.guildForm.leaderTitle.trim() || 'Guild Secretariat',
      leaderContact: this.guildForm.leaderContact.trim() || '+255 22 241 0500',
      committees: committees.length ? committees : ['Executive Committee'],
      description: this.guildForm.description.trim() || 'Student government chapter.'
    };

    const idx = this.guilds.findIndex(g => g.id === id);
    if (idx >= 0) this.guilds[idx] = guild;
    else this.guilds.push(guild);

    this.saveGuildsToStorage();
    this.closeGuildModal();
    this.toastService.success('Saved', `"${name}" saved to local DARUSO directory.`);
  }

  deleteGuild(guild: GuildChapterItem): void {
    if (!confirm(`Remove "${guild.name}" from the local DARUSO guilds directory?`)) return;
    this.guilds = this.guilds.filter(g => g.id !== guild.id);
    this.saveGuildsToStorage();
    this.toastService.info('Removed', `"${guild.name}" removed from local directory.`);
  }

  resetGuilds(): void {
    if (!confirm('Reset the local DARUSO guilds directory to defaults?')) return;
    this.guilds = [...DEFAULT_GUILDS];
    this.saveGuildsToStorage();
    this.toastService.success('Restored', 'DARUSO guilds directory restored to defaults.');
  }

  /* =========================
     CSV EXPORT & LOGOUT
  ========================= */

  downloadAnalyticsCsv(): void {
    const rows: string[][] = [
      ['UNIVERSITY OF DAR ES SALAAM - DARUSO CLEARANCE REPORT'],
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
    link.download = `daruso-clearance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toastService.success('Export Ready', 'DARUSO clearance report downloaded as CSV.');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
