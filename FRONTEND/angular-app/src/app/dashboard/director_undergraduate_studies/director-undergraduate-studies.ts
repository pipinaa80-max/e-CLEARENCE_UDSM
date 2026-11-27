import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { ClearanceOffice, ClearanceRequest, OfficeApproval } from '../../core/models/clearance.model';
import { AuthService } from '../../core/services/auth.service';
import { CollectionStation, CollectionStationService } from '../../core/services/collection-station.service';
import { ConfigService } from '../../core/services/config.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { TranscriptPaymentService } from '../../core/services/transcript-payment.service';
import { isPostgraduateEntity } from '../../core/utils/postgraduate.util';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { TranscriptPaymentRequest } from '../../transcript/transcript-payment.model';

export interface OfficeStatusSummary {
  office: string;
  stageGroup: string;
  cleared: number;
  pending: number;
  rejected: number;
  total: number;
  clearanceRate: number;
}

export interface BreakdownItem {
  label: string;
  cleared: number;
  pending: number;
  rejected: number;
  total: number;
  rate: number;
  barWidth: number;
}

export interface StagePipelineItem {
  stage: string;
  title: string;
  description: string;
  count: number;
  percentage: number;
  tone: 'blue' | 'teal' | 'amber' | 'indigo' | 'purple' | 'green';
}

export interface YearHistogramItem {
  yearLabel: string;
  shortLabel: string;
  total: number;
  cleared: number;
  pending: number;
  rejected: number;
  clearanceRate: number;
  barHeightPercent: number;
  clearedPercent: number;
  pendingPercent: number;
  rejectedPercent: number;
}

export interface RegisteredYearBarItem {
  label: string;
  shortLabel: string;
  yearNumber: number;
  totalRegistered: number;
  clearanceRequests: number;
  clearedRequests: number;
  percentage: number;
  barWidth: number;
  color: string;
}

export type DirectorateTab = 'overview' | 'process' | 'offices' | 'students' | 'transcripts' | 'stations';

@Component({
  selector: 'app-director-undergraduate-studies',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './director-undergraduate-studies.html',
  styleUrl: './director-undergraduate-studies.css'
})
export class DirectorUndergraduateStudiesDashboard implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly transcriptService = inject(TranscriptPaymentService);
  private readonly stationService = inject(CollectionStationService);
  private readonly toastService = inject(ToastService);
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  sidebarOpen = false;
  activeTab: DirectorateTab = 'overview';
  isLoading = false;
  loadError = '';
  unreadNotifications = 0;
  generatedAt = new Date();

  // Analytics & Requests Data
  allRequests: ClearanceRequest[] = [];
  studentYearMap = new Map<string, string>();
  backendRegisteredStudentsByYear: Record<string, number> = {};
  totalRegisteredStudents = 0;

  // Overview expand toggles & hover
  showAllRegisteredYears = false;
  showAllColleges = false;
  hoveredYear: string | null = null;

  // Student Tracker Filters & Pagination
  searchTerm = '';
  selectedCollege = 'ALL';
  selectedStatus: 'ALL' | 'Completed' | 'Pending' | 'Rejected' = 'ALL';
  selectedYear = 'ALL';
  selectedOffice = 'ALL';
  requestsPage = 1;
  requestsPageSize = 25;
  selectedRequestForModal: ClearanceRequest | null = null;

  // Transcript Ledger State
  transcriptSearchTerm = '';
  transcriptStatusFilter: 'ALL' | 'Pending' | 'Dispatched' = 'ALL';
  transcriptPage = 1;
  transcriptPageSize = 25;
  issuingTranscriptId: string | null = null;
  selectedTranscriptForModal: TranscriptPaymentRequest | null = null;
  transcriptLoadError = '';
  isLoadingTranscripts = false;

  // Collection Stations Management State
  stations: CollectionStation[] = [];
  editingStation: CollectionStation | null = null;
  stationToDeactivate: CollectionStation | null = null;
  showStationModal = false;
  isSavingStation = false;
  togglingStationId: string | null = null;
  isDeletingStation = false;
  stationSearchTerm = '';
  stationForm = {
    code: '',
    name: '',
    region: 'Dar es Salaam',
    district: '',
    address: '',
    operatingHours: 'Mon - Fri: 08:00 - 16:00',
    contactPhone: '',
    contactEmail: '',
    isActive: true
  };

  private unreadSub: Subscription | null = null;

  readonly yearColorPalette: string[] = [
    '#00679b',
    '#16a34a',
    '#d97706',
    '#7c3aed',
    '#0284c7',
    '#e11d48',
    '#0d9488',
    '#ea580c'
  ];

  // =========================================================
  // ROLE-AWARE DUS / DPGS IDENTITY HELPERS
  // =========================================================

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get isPostgraduateDirector(): boolean {
    return this.currentUser?.role === 'Director of Postgraduate Studies';
  }

  get homeRoute(): string {
    return this.isPostgraduateDirector
      ? '/dashboard/director-postgraduate-studies'
      : '/dashboard/director-undergraduate-studies';
  }

  get directorateShort(): string {
    return this.isPostgraduateDirector ? 'DPGS' : 'DUS';
  }

  get directorateName(): string {
    return this.isPostgraduateDirector
      ? 'Directorate of Postgraduate Studies'
      : 'Directorate of Undergraduate Studies';
  }

  get directorTitle(): string {
    return this.isPostgraduateDirector
      ? 'Director of Postgraduate Studies'
      : 'Director of Undergraduate Studies';
  }

  get studentLevelLabel(): string {
    return this.isPostgraduateDirector ? 'Postgraduate' : 'Undergraduate';
  }

  get headerEyebrow(): string {
    return this.isPostgraduateDirector
      ? 'DPGS Executive Oversight'
      : 'DUS Executive Oversight';
  }

  get userInitials(): string {
    const name = this.currentUser?.fullName?.trim();
    if (!name) return this.isPostgraduateDirector ? 'PG' : 'DU';
    const parts = name.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  get includeSupervisorStage(): boolean {
    if (this.isPostgraduateDirector) return true;
    return this.allRequests.some(
      r => r.isPostgraduate || r.currentStage === 'Supervisor' || (r.approvals || []).some(a => a.office === 'Supervisor')
    );
  }

  get allOfficesOrder(): { office: ClearanceOffice; stageGroup: string }[] {
    const list: { office: ClearanceOffice; stageGroup: string }[] = [
      { office: 'Convocation', stageGroup: 'Stage 1 · Convocation' },
      { office: 'Smart Card', stageGroup: 'Stage 2 · Parallel Offices' },
      { office: 'Library', stageGroup: 'Stage 2 · Parallel Offices' },
      { office: 'Hall Warden', stageGroup: 'Stage 2 · Parallel Offices' },
      { office: 'USAB', stageGroup: 'Stage 2 · Parallel Offices' },
      { office: 'DARUSO', stageGroup: 'Stage 2 · Parallel Offices' },
      { office: 'Games Coach', stageGroup: 'Stage 2 · Parallel Offices' },
      { office: 'Dean of Students', stageGroup: 'Stage 2 · Parallel Offices' },
      { office: 'Workshop', stageGroup: 'Stage 2 · Conditional (CoET)' },
      { office: 'Laboratory', stageGroup: 'Stage 2 · Conditional (MCHAS)' },
      { office: 'Department', stageGroup: 'Stage 3 · Academic Department' },
      { office: 'Principal', stageGroup: 'Stage 4 · College Principal' },
      { office: 'Finance', stageGroup: 'Stage 5 · Finance Clearance' }
    ];
    if (this.includeSupervisorStage) {
      list.push({ office: 'Supervisor', stageGroup: 'Stage 6 · Research Supervisor' });
    }
    return list;
  }

  ngOnInit(): void {
    const initialTab = this.route.snapshot.queryParamMap.get('tab');
    if (initialTab && ['overview', 'process', 'offices', 'students', 'transcripts', 'stations'].includes(initialTab)) {
      this.activeTab = initialTab as any;
    }
    this.unreadSub = this.notificationService.unreadCount$.subscribe(count => {
      this.unreadNotifications = count;
    });
    this.notificationService.refreshUnreadCount().subscribe();
    this.refreshAllData();
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
    this.unreadSub = null;
  }

  refreshAllData(): void {
    this.loadAnalyticsData();
    this.loadStations();
    this.loadTranscriptLedger();
  }

  loadTranscriptLedger(): void {
    this.isLoadingTranscripts = true;
    this.transcriptLoadError = '';
    this.transcriptService.refreshDirectorateControlNumberRequests()
      .then(() => {
        this.isLoadingTranscripts = false;
      })
      .catch(err => {
        this.isLoadingTranscripts = false;
        if (err?.status === 404) {
          this.transcriptLoadError =
            'Transcript ledger sync endpoint (/api/v1/transcript-payments/directorate) is not active on the running backend server yet. Restart the updated backend to enable live transcript sync.';
        } else {
          this.transcriptLoadError =
            err?.error?.message ||
            'Unable to synchronize transcript requests from the server right now.';
        }
      });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  setTab(tab: DirectorateTab): void {
    this.activeTab = tab;
    this.closeSidebar();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
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

  // =========================================================
  // AUTHORITATIVE BACKEND ANALYTICS LOADING
  // =========================================================

  loadAnalyticsData(): void {
    this.isLoading = true;
    this.loadError = '';
    this.generatedAt = new Date();

    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    this.http.get<any>(`${this.config.apiUrl}/clearance/analytics-summary`, headers ? { headers } : {}).subscribe({
      next: summary => {
        this.studentYearMap.clear();
        const rawRequests = Array.isArray(summary?.requests)
          ? summary.requests
          : Array.isArray(summary?.requestList)
            ? summary.requestList
            : [];

        const normalized = rawRequests.map((r: any) => this.normalizeBackendRequest(r));
        const role = this.currentUser?.role;
        const scoped =
          role === 'Director of Postgraduate Studies'
            ? normalized.filter((r: ClearanceRequest) => isPostgraduateEntity(r))
            : role === 'Director of Undergraduate Studies'
              ? normalized.filter((r: ClearanceRequest) => !isPostgraduateEntity(r))
              : normalized;

        this.allRequests = scoped.sort(
          (a: ClearanceRequest, b: ClearanceRequest) =>
            new Date(b.requestDate || 0).getTime() - new Date(a.requestDate || 0).getTime()
        );

        this.backendRegisteredStudentsByYear =
          summary?.registeredStudentsByYear && typeof summary.registeredStudentsByYear === 'object'
            ? { ...summary.registeredStudentsByYear }
            : {};

        this.totalRegisteredStudents =
          typeof summary?.totalRegisteredStudents === 'number'
            ? Math.max(summary.totalRegisteredStudents, this.allRequests.length)
            : this.allRequests.length;

        if (this.requestsPage > this.requestsTotalPages) {
          this.requestsPage = 1;
        }
        this.isLoading = false;
      },
      error: err => {
        this.isLoading = false;
        this.loadError =
          err?.error?.message ||
          `Unable to synchronize ${this.directorateShort} analytics from the server. Please try refreshing.`;
      }
    });
  }

  private normalizeBackendRequest(raw: any): ClearanceRequest {
    const rawStatus = String(raw?.status || 'PENDING').toUpperCase();
    const normalizedStatus: 'Pending' | 'Completed' | 'Rejected' =
      rawStatus === 'COMPLETED' || rawStatus === 'CLEARED' || rawStatus === 'APPROVED'
        ? 'Completed'
        : rawStatus === 'REJECTED'
          ? 'Rejected'
          : 'Pending';

    const approvals: OfficeApproval[] = Array.isArray(raw?.approvals)
      ? raw.approvals.map((a: any) => {
          const st = String(a?.status || 'PENDING').toUpperCase();
          return {
            office: (a?.office || 'Department') as ClearanceOffice,
            status:
              st === 'APPROVED' || st === 'CLEARED' || st === 'COMPLETED'
                ? 'Approved'
                : st === 'REJECTED'
                  ? 'Rejected'
                  : 'Pending',
            comment: a?.comment || undefined,
            reviewedBy: a?.reviewedBy || undefined,
            reviewedAt: a?.reviewedAt || undefined
          };
        })
      : [];

    const currentYear = new Date().getFullYear();
    let rawYr = '';
    if (raw?.yearOfStudy) {
      const str = String(raw.yearOfStudy).trim();
      const m4 = str.match(/\b(20\d{2})\b/);
      if (m4) {
        rawYr = `Year ${m4[1]}`;
      } else {
        const num = parseInt(str.replace(/\D+/g, ''), 10);
        if (!Number.isNaN(num) && num > 0) {
          rawYr = `Year ${currentYear - num + 1}`;
        } else {
          rawYr = `Year ${str}`;
        }
      }
    } else if (raw?.registrationNumber) {
      const m4 = String(raw.registrationNumber).match(/\b(20\d{2})\b/);
      if (m4) rawYr = `Year ${m4[1]}`;
    }

    if (rawYr) {
      if (raw?.studentId) this.studentYearMap.set(String(raw.studentId), rawYr);
      if (raw?.registrationNumber) this.studentYearMap.set(String(raw.registrationNumber), rawYr);
    }

    const award = raw?.award || undefined;
    const programme = raw?.programme || `${this.studentLevelLabel} Programme`;
    const isPostgraduate = isPostgraduateEntity({
      isPostgraduate: raw?.isPostgraduate ?? raw?.is_postgraduate,
      award,
      programme
    });

    return {
      id: String(raw?.id || crypto.randomUUID()),
      studentId: String(raw?.studentId || ''),
      studentName: raw?.studentName || 'Student',
      registrationNumber: raw?.registrationNumber || 'N/A',
      email: raw?.email || '',
      college: raw?.college || 'Unspecified College',
      department: raw?.department || 'Unspecified Department',
      programme,
      award,
      isPostgraduate,
      requestDate: raw?.requestDate || '',
      status: normalizedStatus,
      currentOffice: (raw?.currentOffice || 'Convocation') as ClearanceOffice,
      currentStage: (raw?.currentStage || (normalizedStatus === 'Completed' ? 'Completed' : 'Convocation')) as any,
      approvals
    };
  }

  // =========================================================
  // CORE METRICS & KPI COMPUTATIONS
  // =========================================================

  get totalRequestsCount(): number {
    return this.allRequests.length;
  }

  get clearedCount(): number {
    return this.allRequests.filter(r => r.status === 'Completed').length;
  }

  get pendingCount(): number {
    return this.allRequests.filter(r => r.status === 'Pending').length;
  }

  get rejectedCount(): number {
    return this.allRequests.filter(r => r.status === 'Rejected').length;
  }

  get overallClearanceRate(): number {
    return this.totalRequestsCount > 0 ? Math.round((this.clearedCount / this.totalRequestsCount) * 100) : 0;
  }

  get pendingRate(): number {
    return this.totalRequestsCount > 0 ? Math.round((this.pendingCount / this.totalRequestsCount) * 100) : 0;
  }

  get rejectedRate(): number {
    return this.totalRequestsCount > 0 ? Math.round((this.rejectedCount / this.totalRequestsCount) * 100) : 0;
  }

  getYearLabel(req: ClearanceRequest): string {
    if (req.studentId && this.studentYearMap.has(req.studentId)) {
      return this.studentYearMap.get(req.studentId)!;
    }
    if (req.registrationNumber && this.studentYearMap.has(req.registrationNumber)) {
      return this.studentYearMap.get(req.registrationNumber)!;
    }
    const regMatch = String(req.registrationNumber || '').match(/\b(20\d{2})\b/);
    if (regMatch) return `Year ${regMatch[1]}`;
    const reqYear = req.requestDate ? new Date(req.requestDate).getFullYear() : NaN;
    return Number.isNaN(reqYear) ? `Year ${new Date().getFullYear()}` : `Year ${reqYear}`;
  }

  getYearColor(index: number): string {
    return this.yearColorPalette[index % this.yearColorPalette.length];
  }

  setHoveredYear(label: string | null): void {
    this.hoveredYear = label;
  }

  get collegeBreakdown(): BreakdownItem[] {
    return this.buildBreakdown(req => req.college || 'Unspecified College');
  }

  get displayedCollegeBreakdown(): BreakdownItem[] {
    return this.showAllColleges ? this.collegeBreakdown : this.collegeBreakdown.slice(0, 5);
  }

  get yearBreakdown(): BreakdownItem[] {
    return this.buildBreakdown(req => this.getYearLabel(req));
  }

  get programmeBreakdown(): BreakdownItem[] {
    return this.buildBreakdown(req => req.programme || `${this.studentLevelLabel} Programme`);
  }

  get displayedRegisteredStudentsByYear(): RegisteredYearBarItem[] {
    return this.showAllRegisteredYears ? this.registeredStudentsByYear : this.registeredStudentsByYear.slice(0, 5);
  }

  toggleRegisteredYears(): void {
    this.showAllRegisteredYears = !this.showAllRegisteredYears;
  }

  toggleColleges(): void {
    this.showAllColleges = !this.showAllColleges;
  }

  private buildBreakdown(selector: (req: ClearanceRequest) => string): BreakdownItem[] {
    const groups = new Map<string, { cleared: number; pending: number; rejected: number; total: number }>();
    for (const req of this.allRequests) {
      const key = selector(req).trim() || 'Unspecified';
      const entry = groups.get(key) || { cleared: 0, pending: 0, rejected: 0, total: 0 };
      entry.total += 1;
      if (req.status === 'Completed') entry.cleared += 1;
      else if (req.status === 'Rejected') entry.rejected += 1;
      else entry.pending += 1;
      groups.set(key, entry);
    }

    const items = Array.from(groups.entries()).map(([label, stats]) => ({
      label,
      ...stats,
      rate: stats.total > 0 ? Math.round((stats.cleared / stats.total) * 100) : 0,
      barWidth: 0
    }));

    items.sort((a, b) => b.cleared - a.cleared || b.total - a.total);
    const maxTotal = Math.max(1, ...items.map(i => i.total));
    items.forEach(item => {
      item.barWidth = Math.max(8, Math.round((item.total / maxTotal) * 100));
    });
    return items;
  }

  get topClearedCollege(): BreakdownItem | null {
    return this.collegeBreakdown[0] || null;
  }

  get topClearedYear(): BreakdownItem | null {
    return this.yearBreakdown[0] || null;
  }

  get topClearedProgramme(): BreakdownItem | null {
    return this.programmeBreakdown[0] || null;
  }

  get recentlyClearedStudent(): ClearanceRequest | null {
    return this.allRequests.find(r => r.status === 'Completed') || null;
  }

  get registeredStudentsByYear(): RegisteredYearBarItem[] {
    const registeredCounts = new Map<number, number>();
    const requestCounts = new Map<number, { total: number; cleared: number }>();

    if (this.backendRegisteredStudentsByYear) {
      for (const [key, val] of Object.entries(this.backendRegisteredStudentsByYear)) {
        const m = key.match(/\b(20\d{2})\b/);
        if (m) {
          const yr = parseInt(m[1], 10);
          registeredCounts.set(yr, (registeredCounts.get(yr) || 0) + (Number(val) || 0));
        }
      }
    }

    for (const req of this.allRequests) {
      const label = this.getYearLabel(req);
      const m4 = label.match(/\b(20\d{2})\b/);
      if (!m4) continue;
      const calYr = parseInt(m4[1], 10);
      const entry = requestCounts.get(calYr) || { total: 0, cleared: 0 };
      entry.total += 1;
      if (req.status === 'Completed') entry.cleared += 1;
      requestCounts.set(calYr, entry);
      if ((registeredCounts.get(calYr) || 0) < entry.total) {
        registeredCounts.set(calYr, entry.total);
      }
    }

    const presentYears = new Set<number>();
    registeredCounts.forEach((cnt, yr) => {
      if (cnt > 0) presentYears.add(yr);
    });
    requestCounts.forEach((data, yr) => {
      if (data.total > 0) presentYears.add(yr);
    });

    const sortedYears = Array.from(presentYears).sort((a, b) => b - a);
    if (!sortedYears.length) return [];

    const totalCalculated = Array.from(registeredCounts.values()).reduce((sum, n) => sum + n, 0);
    const effectiveTotal = Math.max(totalCalculated, this.totalRegisteredStudents, 1);
    const maxInAnyYear = Math.max(1, ...Array.from(registeredCounts.values()));

    return sortedYears.map((yr, index) => {
      const regCount = registeredCounts.get(yr) || 0;
      const reqData = requestCounts.get(yr) || { total: 0, cleared: 0 };
      const percentage = Math.round((regCount / effectiveTotal) * 100);
      const barWidth = regCount > 0 ? Math.max(8, Math.round((regCount / maxInAnyYear) * 100)) : 0;

      return {
        label: `Year ${yr}`,
        shortLabel: `${yr}`,
        yearNumber: yr,
        totalRegistered: regCount,
        clearanceRequests: reqData.total,
        clearedRequests: reqData.cleared,
        percentage,
        barWidth,
        color: this.getYearColor(index)
      };
    });
  }

  get yearHistogramData(): YearHistogramItem[] {
    const rawBreakdown = this.yearBreakdown;
    if (!rawBreakdown.length) return [];

    const sorted = [...rawBreakdown].sort((a, b) => {
      const matchA = a.label.match(/\b(20\d{2})\b/);
      const matchB = b.label.match(/\b(20\d{2})\b/);
      const numA = matchA ? parseInt(matchA[1], 10) : 0;
      const numB = matchB ? parseInt(matchB[1], 10) : 0;
      return numA - numB || a.label.localeCompare(b.label);
    });

    const maxCount = Math.max(1, ...sorted.map(i => i.total));

    return sorted.map(item => {
      const total = item.total;
      const yearMatch = item.label.match(/\b(20\d{2})\b/);
      const shortLabel = yearMatch ? yearMatch[1] : item.label.replace(/^Year\s*/i, '');
      const fullLabel = yearMatch ? `Year ${yearMatch[1]}` : item.label;

      return {
        yearLabel: fullLabel,
        shortLabel,
        total,
        cleared: item.cleared,
        pending: item.pending,
        rejected: item.rejected,
        clearanceRate: item.rate,
        barHeightPercent: Math.max(12, Math.round((total / maxCount) * 100)),
        clearedPercent: total > 0 ? Math.round((item.cleared / total) * 100) : 0,
        pendingPercent: total > 0 ? Math.round((item.pending / total) * 100) : 0,
        rejectedPercent: total > 0 ? Math.round((item.rejected / total) * 100) : 0
      };
    });
  }

  get histogramYAxisTicks(): number[] {
    const max = Math.max(1, ...this.yearHistogramData.map(i => i.total));
    if (max <= 1) return [1, 0];
    if (max <= 4) return [max, Math.round(max / 2), 0];
    return [max, Math.round(max * 0.66), Math.round(max * 0.33), 0];
  }

  // =========================================================
  // ACCURATE 5-STAGE (DUS) / 6-STAGE (DPGS) PIPELINE & OFFICES
  // =========================================================

  get stagePipeline(): StagePipelineItem[] {
    const total = Math.max(1, this.totalRequestsCount);
    const active = (stage: string) =>
      this.allRequests.filter(r => r.status !== 'Completed' && r.currentStage === stage).length;

    const convCount = active('Convocation');
    const parallelCount = active('Parallel');
    const deptCount = active('Department');
    const principalCount = active('Principal');
    const financeCount = active('Finance');
    const supervisorCount = active('Supervisor');
    const completedCount = this.clearedCount;

    const stages: StagePipelineItem[] = [
      {
        stage: 'Stage 1',
        title: 'Convocation Office',
        description: 'Alumni registration & convocation payment control number',
        count: convCount,
        percentage: Math.round((convCount / total) * 100),
        tone: 'blue'
      },
      {
        stage: 'Stage 2',
        title: 'Parallel Offices',
        description: 'Smart Card, Library, USAB, Hall Warden, DARUSO, Sports, Dean (+ conditional Workshop/Lab)',
        count: parallelCount,
        percentage: Math.round((parallelCount / total) * 100),
        tone: 'teal'
      },
      {
        stage: 'Stage 3',
        title: 'Academic Department',
        description: 'Departmental approval & Lecturer debt clearance verification',
        count: deptCount,
        percentage: Math.round((deptCount / total) * 100),
        tone: 'amber'
      },
      {
        stage: 'Stage 4',
        title: 'College Principal',
        description: 'Collegiate endorsement by College / School Principal',
        count: principalCount,
        percentage: Math.round((principalCount / total) * 100),
        tone: 'indigo'
      },
      {
        stage: 'Stage 5',
        title: 'Finance Clearance',
        description: 'Bursar financial zero-liability verification',
        count: financeCount,
        percentage: Math.round((financeCount / total) * 100),
        tone: 'teal'
      }
    ];

    if (this.includeSupervisorStage) {
      stages.push({
        stage: 'Stage 6',
        title: 'Research Supervisor',
        description: 'Postgraduate dissertation & undergraduate certificate final check',
        count: supervisorCount,
        percentage: Math.round((supervisorCount / total) * 100),
        tone: 'purple'
      });
    }

    stages.push({
      stage: 'Completed',
      title: 'Fully Cleared',
      description: 'All mandatory clearance stages approved; certificate & transcript unlocked',
      count: completedCount,
      percentage: Math.round((completedCount / total) * 100),
      tone: 'green'
    });

    return stages;
  }

  get officeStatusSummaries(): OfficeStatusSummary[] {
    return this.allOfficesOrder.map(({ office, stageGroup }) => {
      let cleared = 0;
      let pending = 0;
      let rejected = 0;

      for (const req of this.allRequests) {
        const match = (req.approvals || []).find(
          a =>
            String(a.office).toLowerCase() === office.toLowerCase() ||
            (office === 'Department' && String(a.office).toLowerCase() === String(req.department || '').toLowerCase())
        );
        if (!match) continue;
        if (match.status === 'Approved') cleared += 1;
        else if (match.status === 'Rejected') rejected += 1;
        else pending += 1;
      }

      const total = cleared + pending + rejected;
      const clearanceRate = total > 0 ? Math.round((cleared / total) * 100) : 0;

      return {
        office,
        stageGroup,
        cleared,
        pending,
        rejected,
        total,
        clearanceRate
      };
    });
  }

  get totalOfficeApprovalsCount(): number {
    return this.officeStatusSummaries.reduce((sum, o) => sum + o.cleared, 0);
  }

  get totalOfficePendingCount(): number {
    return this.officeStatusSummaries.reduce((sum, o) => sum + o.pending, 0);
  }

  get totalOfficeRejectedCount(): number {
    return this.officeStatusSummaries.reduce((sum, o) => sum + o.rejected, 0);
  }

  // =========================================================
  // STUDENT CLEARANCE TRACKER FILTERING & PAGINATION
  // =========================================================

  get availableColleges(): string[] {
    return Array.from(new Set(this.allRequests.map(r => r.college).filter(Boolean))).sort();
  }

  get availableYears(): string[] {
    return Array.from(new Set(this.allRequests.map(r => this.getYearLabel(r)).filter(Boolean))).sort();
  }

  onStudentFilterChange(): void {
    this.requestsPage = 1;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCollege = 'ALL';
    this.selectedStatus = 'ALL';
    this.selectedYear = 'ALL';
    this.selectedOffice = 'ALL';
    this.requestsPage = 1;
  }

  get filteredRequests(): ClearanceRequest[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.allRequests.filter(req => {
      if (this.selectedCollege !== 'ALL' && req.college !== this.selectedCollege) return false;
      if (this.selectedStatus !== 'ALL' && req.status !== this.selectedStatus) return false;
      if (this.selectedYear !== 'ALL' && this.getYearLabel(req) !== this.selectedYear) return false;
      if (this.selectedOffice !== 'ALL') {
        const hasPendingAtOffice = (req.approvals || []).some(
          a => a.office === this.selectedOffice && a.status === 'Pending'
        );
        if (req.currentOffice !== this.selectedOffice && !hasPendingAtOffice) return false;
      }
      if (term) {
        const haystack = [
          req.studentName,
          req.registrationNumber,
          req.college,
          req.department,
          req.programme,
          req.award,
          req.currentOffice,
          req.status
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }

  get requestsTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRequests.length / this.requestsPageSize));
  }

  get paginatedRequests(): ClearanceRequest[] {
    const safePage = Math.min(this.requestsPage, this.requestsTotalPages);
    const start = (safePage - 1) * this.requestsPageSize;
    return this.filteredRequests.slice(start, start + this.requestsPageSize);
  }

  nextRequestsPage(): void {
    if (this.requestsPage < this.requestsTotalPages) {
      this.requestsPage++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevRequestsPage(): void {
    if (this.requestsPage > 1) {
      this.requestsPage--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getApprovedOfficesCount(req: ClearanceRequest): number {
    return (req.approvals || []).filter(a => a.status === 'Approved').length;
  }

  getTotalOfficesCount(req: ClearanceRequest): number {
    return (req.approvals || []).length || (this.isPostgraduateDirector ? 12 : 11);
  }

  getRequestProgressPercent(req: ClearanceRequest): number {
    if (req.status === 'Completed') return 100;
    const total = this.getTotalOfficesCount(req);
    return total > 0 ? Math.round((this.getApprovedOfficesCount(req) / total) * 100) : 0;
  }

  openStudentModal(req: ClearanceRequest): void {
    this.selectedRequestForModal = req;
  }

  closeStudentModal(): void {
    this.selectedRequestForModal = null;
  }

  // =========================================================
  // TRANSCRIPT ISSUANCE & DISPATCH LEDGER
  // =========================================================

  get transcriptRequests(): TranscriptPaymentRequest[] {
    const base = this.transcriptService
      .getAllRequests()
      .filter(r => !!r.collectionMethod || !!r.receiptFileName || r.status === 'Receipt Submitted' || r.status === 'Paid');

    const role = this.currentUser?.role;
    if (role === 'Director of Postgraduate Studies') {
      return base.filter(r => isPostgraduateEntity(r as any));
    }
    if (role === 'Director of Undergraduate Studies') {
      return base.filter(r => !isPostgraduateEntity(r as any));
    }
    return base;
  }

  get dispatchedCount(): number {
    return this.transcriptRequests.filter(r => r.dispatchStatus === 'Dispatched').length;
  }

  get pendingDispatchCount(): number {
    return this.transcriptRequests.filter(r => r.dispatchStatus !== 'Dispatched').length;
  }

  get issuedByDirectorCount(): number {
    return this.transcriptRequests.filter(r => r.issuedByDirector).length;
  }

  onTranscriptFilterChange(): void {
    this.transcriptPage = 1;
  }

  setTranscriptStatusFilter(status: 'ALL' | 'Pending' | 'Dispatched'): void {
    this.transcriptStatusFilter = status;
    this.transcriptPage = 1;
  }

  resetTranscriptFilters(): void {
    this.transcriptSearchTerm = '';
    this.transcriptStatusFilter = 'ALL';
    this.transcriptPage = 1;
  }

  get filteredTranscriptRequests(): TranscriptPaymentRequest[] {
    let requests = this.transcriptRequests;
    const term = (this.transcriptSearchTerm || '').trim().toLowerCase();
    if (term) {
      requests = requests.filter(
        r =>
          (r.studentName || '').toLowerCase().includes(term) ||
          (r.registrationNumber || '').toLowerCase().includes(term) ||
          (r.postingRegion || '').toLowerCase().includes(term) ||
          (r.postingWard || '').toLowerCase().includes(term) ||
          (r.postingPoBox || '').toLowerCase().includes(term) ||
          (r.postingContactPhone || '').toLowerCase().includes(term) ||
          (r.collectionMethod || '').toLowerCase().includes(term)
      );
    }
    if (this.transcriptStatusFilter === 'Pending') {
      requests = requests.filter(r => r.dispatchStatus !== 'Dispatched');
    } else if (this.transcriptStatusFilter === 'Dispatched') {
      requests = requests.filter(r => r.dispatchStatus === 'Dispatched');
    }
    return requests;
  }

  get transcriptTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTranscriptRequests.length / this.transcriptPageSize));
  }

  get paginatedTranscriptRequests(): TranscriptPaymentRequest[] {
    const safePage = Math.min(this.transcriptPage, this.transcriptTotalPages);
    const start = (safePage - 1) * this.transcriptPageSize;
    return this.filteredTranscriptRequests.slice(start, start + this.transcriptPageSize);
  }

  nextTranscriptPage(): void {
    if (this.transcriptPage < this.transcriptTotalPages) {
      this.transcriptPage++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevTranscriptPage(): void {
    if (this.transcriptPage > 1) {
      this.transcriptPage--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async issueTranscript(tReq: TranscriptPaymentRequest): Promise<void> {
    if (this.issuingTranscriptId) return;
    if (tReq.status !== 'Paid') {
      this.toastService.warning(
        'Finance Verification Required',
        'Finance must verify and approve this transcript payment before the Directorate can issue it.'
      );
      return;
    }

    this.issuingTranscriptId = tReq.id;
    try {
      const updatedList = await this.transcriptService.issueTranscriptByDirectorAsync(tReq.id, this.directorTitle);
      const updated = updatedList.find(item => item.id === tReq.id) || updatedList[0];
      if (this.selectedTranscriptForModal && this.selectedTranscriptForModal.id === tReq.id && updated) {
        this.selectedTranscriptForModal = updated;
      }
      this.toastService.success(
        'Transcript Issued & Forwarded',
        `Issued by ${this.directorTitle} and forwarded to the DUS Examination Office.`
      );
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'Could not issue transcript. Please try again.';
      this.toastService.error('Issuance Failed', msg);
    } finally {
      this.issuingTranscriptId = null;
    }
  }

  markDispatched(requestId: string): void {
    if (this.transcriptService.markDispatched(requestId)) {
      if (this.selectedTranscriptForModal && this.selectedTranscriptForModal.id === requestId) {
        this.selectedTranscriptForModal = {
          ...this.selectedTranscriptForModal,
          dispatchStatus: 'Dispatched',
          dispatchedAt: new Date().toISOString()
        };
      }
      this.toastService.success('Dispatched', 'Transcript dispatch status updated to Dispatched.');
    } else {
      this.toastService.error('Action Failed', 'Could not update dispatch status.');
    }
  }

  // =========================================================
  // COLLECTION STATIONS MANAGEMENT
  // =========================================================

  get filteredStations(): CollectionStation[] {
    const q = (this.stationSearchTerm || '').trim().toLowerCase();
    if (!q) return this.stations;
    return this.stations.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.region.toLowerCase().includes(q) ||
        (s.district && s.district.toLowerCase().includes(q)) ||
        s.address.toLowerCase().includes(q)
    );
  }

  get activeStationsCount(): number {
    return this.stations.filter(s => s.isActive).length;
  }

  get stationRegionsCount(): number {
    return new Set(this.stations.map(s => s.region)).size;
  }

  loadStations(): void {
    this.stationService.getAllStations().subscribe({
      next: list => {
        this.stations = list || [];
      },
      error: err => {
        console.warn('Error loading collection stations:', err);
      }
    });
  }

  openCreateStationModal(): void {
    this.editingStation = null;
    this.stationForm = {
      code: 'HUB-' + Math.floor(100 + Math.random() * 900),
      name: '',
      region: 'Dar es Salaam',
      district: '',
      address: '',
      operatingHours: 'Mon - Fri: 08:00 - 16:00',
      contactPhone: '',
      contactEmail: '',
      isActive: true
    };
    this.showStationModal = true;
  }

  openEditStationModal(st: CollectionStation): void {
    this.editingStation = st;
    this.stationForm = {
      code: st.code,
      name: st.name,
      region: st.region,
      district: st.district || '',
      address: st.address,
      operatingHours: st.operatingHours || 'Mon - Fri: 08:00 - 16:00',
      contactPhone: st.contactPhone || '',
      contactEmail: st.contactEmail || '',
      isActive: st.isActive
    };
    this.showStationModal = true;
  }

  closeStationModal(): void {
    if (this.isSavingStation) return;
    this.showStationModal = false;
    this.editingStation = null;
  }

  saveStation(): void {
    if (this.isSavingStation) return;
    if (!this.stationForm.name.trim() || !this.stationForm.code.trim() || !this.stationForm.address.trim()) {
      this.toastService.error('Missing Fields', 'Station name, code, and physical address are required.');
      return;
    }

    this.isSavingStation = true;
    const request$ = this.editingStation
      ? this.stationService.updateStation(this.editingStation.id, this.stationForm)
      : this.stationService.createStation(this.stationForm);

    const isEdit = !!this.editingStation;
    request$.subscribe({
      next: saved => {
        this.isSavingStation = false;
        this.toastService.success(
          isEdit ? 'Station Updated' : 'Station Created',
          `${isEdit ? 'Updated' : 'Created'} collection station "${saved.name}".`
        );
        this.showStationModal = false;
        this.editingStation = null;
        this.loadStations();
      },
      error: err => {
        this.isSavingStation = false;
        this.toastService.error(
          isEdit ? 'Update Failed' : 'Creation Failed',
          err?.error?.message || `Failed to ${isEdit ? 'update' : 'create'} station.`
        );
      }
    });
  }

  toggleStationActive(st: CollectionStation): void {
    if (this.togglingStationId) return;
    const newStatus = !st.isActive;
    this.togglingStationId = st.id;
    this.stationService.updateStation(st.id, { isActive: newStatus }).subscribe({
      next: () => {
        st.isActive = newStatus;
        this.togglingStationId = null;
        this.toastService.success('Status Changed', `Station "${st.name}" is now ${newStatus ? 'Active' : 'Inactive'}.`);
      },
      error: err => {
        this.togglingStationId = null;
        this.toastService.error('Action Failed', err?.error?.message || 'Could not toggle station status.');
      }
    });
  }

  openDeleteStationModal(st: CollectionStation): void {
    this.stationToDeactivate = st;
  }

  closeDeleteStationModal(): void {
    if (this.isDeletingStation) return;
    this.stationToDeactivate = null;
  }

  confirmDeleteStation(): void {
    if (!this.stationToDeactivate || this.isDeletingStation) return;
    const st = this.stationToDeactivate;
    this.isDeletingStation = true;
    this.stationService.deleteStation(st.id).subscribe({
      next: () => {
        this.isDeletingStation = false;
        this.stationToDeactivate = null;
        this.toastService.success('Station Deactivated', `Station "${st.name}" has been deactivated.`);
        this.loadStations();
      },
      error: err => {
        this.isDeletingStation = false;
        this.toastService.error('Deactivation Failed', err?.error?.message || 'Could not deactivate station.');
      }
    });
  }

  // =========================================================
  // ROLE-AWARE REPORT GENERATION (CSV & PRINTABLE PDF)
  // =========================================================

  downloadComprehensiveReport(): void {
    const rows: string[][] = [
      [`UNIVERSITY OF DAR ES SALAAM (UDSM) - ${this.directorateName.toUpperCase()}`],
      [`OFFICIAL ${this.studentLevelLabel.toUpperCase()} CLEARANCE ANALYTICS REPORT`],
      ['Generated At', new Date().toLocaleString()],
      ['Generated By', this.currentUser?.fullName || this.directorTitle],
      [],
      ['1. EXECUTIVE CLEARANCE SUMMARY', 'VALUE'],
      [`Total Registered ${this.studentLevelLabel} Students`, String(this.totalRegisteredStudents)],
      ['Total Clearance Requests Submitted', String(this.totalRequestsCount)],
      ['Cleared / Completed Students', String(this.clearedCount)],
      ['Pending / In-Progress Students', String(this.pendingCount)],
      ['Rejected / Action Required Students', String(this.rejectedCount)],
      ['Overall System Clearance Rate (%)', `${this.overallClearanceRate}%`],
      [
        'Top Cleared College',
        this.topClearedCollege
          ? `${this.topClearedCollege.label} (${this.topClearedCollege.cleared} / ${this.topClearedCollege.total})`
          : 'N/A'
      ],
      [],
      ['2. CLEARANCE STATUS BY CORRESPONDING OFFICE', 'STAGE', 'CLEARED', 'PENDING', 'REJECTED', 'TOTAL', 'RATE (%)'],
      ...this.officeStatusSummaries.map(o => [
        o.office,
        o.stageGroup,
        String(o.cleared),
        String(o.pending),
        String(o.rejected),
        String(o.total),
        `${o.clearanceRate}%`
      ]),
      [],
      ['3. CLEARANCE ANALYTICS BY COLLEGE / SCHOOL', 'CLEARED', 'PENDING', 'REJECTED', 'TOTAL', 'RATE (%)'],
      ...this.collegeBreakdown.map(c => [
        c.label,
        String(c.cleared),
        String(c.pending),
        String(c.rejected),
        String(c.total),
        `${c.rate}%`
      ]),
      [],
      ['4. STUDENT CLEARANCE LEDGER', 'REG NO.', 'STUDENT NAME', 'COLLEGE', 'DEPARTMENT', 'PROGRAMME', 'YEAR', 'STAGE', 'OFFICES CLEARED', 'STATUS'],
      ...this.filteredRequests.map((r, idx) => [
        String(idx + 1),
        r.registrationNumber || 'N/A',
        r.studentName || 'Student',
        r.college || '',
        r.department || '',
        r.programme || '',
        this.getYearLabel(r),
        r.status === 'Completed' ? 'Completed' : `${r.currentStage} (${r.currentOffice || 'Pending'})`,
        `${this.getApprovedOfficesCount(r)} / ${this.getTotalOfficesCount(r)}`,
        r.status
      ])
    ];

    this.triggerCsvDownload(
      rows,
      `udsm-${this.directorateShort.toLowerCase()}-clearance-analytics-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  private printReportAsPdf(docTitle: string, sectionsHtml: string): void {
    const filename = `${this.directorateShort.toLowerCase()}-${docTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${docTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 28px; color: #173f58; background: #ffffff; line-height: 1.5; font-size: 12px; }
    .report-wrap { max-width: 900px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2.5px solid #002147; padding-bottom: 14px; margin-bottom: 20px; }
    .inst-name { font-size: 17px; font-weight: 800; color: #002147; letter-spacing: 0.5px; text-transform: uppercase; }
    .dir-name { font-size: 12px; font-weight: 700; color: #b45309; letter-spacing: 1px; text-transform: uppercase; margin-top: 3px; }
    .doc-title { font-size: 15px; font-weight: 800; color: #00679b; margin-top: 10px; text-transform: uppercase; }
    .meta-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 11px; color: #64748b; font-weight: 600; }
    .data-table { width: 100%; border-collapse: collapse; margin-top: 14px; margin-bottom: 18px; font-size: 11.5px; }
    .data-table th, .data-table td { padding: 8px 10px; border: 1px solid #dce4e9; text-align: left; }
    .data-table th { background: #f0f7fb; color: #064d78; font-weight: 800; font-size: 11px; text-transform: uppercase; }
    .data-table tr:nth-child(even) { background: #fbfcfd; }
    .data-table tfoot td { font-weight: 800; background: #eaf2f7; border-top: 2px solid #002147; color: #002147; }
    .num-col { text-align: right; }
    .badge-cleared { color: #15803d; font-weight: 700; }
    .badge-pending { color: #b45309; font-weight: 700; }
    .badge-rejected { color: #b91c1c; font-weight: 700; }
    .footer { margin-top: 26px; padding-top: 12px; border-top: 1px solid #dce4e9; display: flex; justify-content: space-between; font-size: 10.5px; color: #64748b; }
    .no-print { text-align: center; margin-top: 20px; }
    .btn-print { padding: 9px 20px; background: #002147; color: #fff; border: none; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; }
    @media print { body { padding: 0; } .no-print { display: none !important; } @page { margin: 15mm; size: auto; } }
  </style>
</head>
<body>
  <div class="report-wrap">
    <div class="header">
      <div class="inst-name">University of Dar es Salaam</div>
      <div class="dir-name">${this.directorateName} (${this.directorateShort})</div>
      <div class="doc-title">${docTitle}</div>
      <div class="meta-bar">
        <span>Generated: ${new Date().toLocaleString()}</span>
        <span>By: ${this.currentUser?.fullName || this.directorTitle}</span>
      </div>
    </div>
    ${sectionsHtml}
    <div class="footer">
      <span>Smart Clearance Management Information System (MIS)</span>
      <span>Official ${this.directorateShort} Institutional Report · University of Dar es Salaam</span>
    </div>
    <div class="no-print">
      <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
    </div>
  </div>
  <script>window.addEventListener('load', () => { setTimeout(() => { window.print(); }, 350); });</script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  downloadRegisteredStudentsPdf(): void {
    const tableRows = this.registeredStudentsByYear
      .map(
        y => `
      <tr>
        <td><strong>${y.label}</strong></td>
        <td class="num-col"><strong>${y.totalRegistered}</strong></td>
        <td class="num-col">${y.percentage}%</td>
        <td class="num-col">${y.clearanceRequests}</td>
        <td class="num-col"><span class="badge-cleared">${y.clearedRequests}</span></td>
      </tr>`
      )
      .join('');

    const html = `
      <table class="data-table">
        <thead><tr><th>Academic Year</th><th class="num-col">Total Registered</th><th class="num-col">Share (%)</th><th class="num-col">Requests</th><th class="num-col">Cleared</th></tr></thead>
        <tbody>${tableRows || '<tr><td colspan="5">No data available.</td></tr>'}</tbody>
        <tfoot><tr><td>TOTAL</td><td class="num-col">${this.totalRegisteredStudents}</td><td class="num-col">100%</td><td class="num-col">${this.totalRequestsCount}</td><td class="num-col">${this.clearedCount}</td></tr></tfoot>
      </table>`;
    this.printReportAsPdf(`Total Registered ${this.studentLevelLabel} Students by Cohort`, html);
  }

  downloadCollegesPdf(): void {
    const tableRows = this.collegeBreakdown
      .map(
        c => `
      <tr>
        <td><strong>${c.label}</strong></td>
        <td class="num-col"><span class="badge-cleared">${c.cleared}</span></td>
        <td class="num-col"><span class="badge-pending">${c.pending}</span></td>
        <td class="num-col"><span class="badge-rejected">${c.rejected}</span></td>
        <td class="num-col"><strong>${c.total}</strong></td>
        <td class="num-col"><strong>${c.rate}%</strong></td>
      </tr>`
      )
      .join('');

    const html = `
      <table class="data-table">
        <thead><tr><th>College / School</th><th class="num-col">Cleared</th><th class="num-col">Pending</th><th class="num-col">Rejected</th><th class="num-col">Total</th><th class="num-col">Rate</th></tr></thead>
        <tbody>${tableRows || '<tr><td colspan="6">No data available.</td></tr>'}</tbody>
        <tfoot><tr><td>TOTAL</td><td class="num-col">${this.clearedCount}</td><td class="num-col">${this.pendingCount}</td><td class="num-col">${this.rejectedCount}</td><td class="num-col">${this.totalRequestsCount}</td><td class="num-col">${this.overallClearanceRate}%</td></tr></tfoot>
      </table>`;
    this.printReportAsPdf(`${this.studentLevelLabel} Clearance Statistics by College`, html);
  }

  downloadYearHistogramPdf(): void {
    const tableRows = this.yearHistogramData
      .map(
        y => `
      <tr>
        <td><strong>${y.yearLabel}</strong></td>
        <td class="num-col"><span class="badge-cleared">${y.cleared}</span></td>
        <td class="num-col"><span class="badge-pending">${y.pending}</span></td>
        <td class="num-col"><span class="badge-rejected">${y.rejected}</span></td>
        <td class="num-col"><strong>${y.total}</strong></td>
        <td class="num-col"><strong>${y.clearanceRate}%</strong></td>
      </tr>`
      )
      .join('');

    const html = `
      <table class="data-table">
        <thead><tr><th>Academic Year</th><th class="num-col">Cleared</th><th class="num-col">Pending</th><th class="num-col">Rejected</th><th class="num-col">Total</th><th class="num-col">Rate</th></tr></thead>
        <tbody>${tableRows || '<tr><td colspan="6">No data available.</td></tr>'}</tbody>
        <tfoot><tr><td>TOTAL</td><td class="num-col">${this.clearedCount}</td><td class="num-col">${this.pendingCount}</td><td class="num-col">${this.rejectedCount}</td><td class="num-col">${this.totalRequestsCount}</td><td class="num-col">${this.overallClearanceRate}%</td></tr></tfoot>
      </table>`;
    this.printReportAsPdf(`${this.studentLevelLabel} Clearance Distribution by Cohort`, html);
  }

  downloadProgrammesPdf(): void {
    const tableRows = this.programmeBreakdown
      .map(
        p => `
      <tr>
        <td><strong>${p.label}</strong></td>
        <td class="num-col"><span class="badge-cleared">${p.cleared}</span></td>
        <td class="num-col"><span class="badge-pending">${p.pending}</span></td>
        <td class="num-col"><span class="badge-rejected">${p.rejected}</span></td>
        <td class="num-col"><strong>${p.total}</strong></td>
        <td class="num-col"><strong>${p.rate}%</strong></td>
      </tr>`
      )
      .join('');

    const html = `
      <table class="data-table">
        <thead><tr><th>${this.studentLevelLabel} Programme</th><th class="num-col">Cleared</th><th class="num-col">Pending</th><th class="num-col">Rejected</th><th class="num-col">Total</th><th class="num-col">Rate</th></tr></thead>
        <tbody>${tableRows || '<tr><td colspan="6">No data available.</td></tr>'}</tbody>
        <tfoot><tr><td>TOTAL</td><td class="num-col">${this.clearedCount}</td><td class="num-col">${this.pendingCount}</td><td class="num-col">${this.rejectedCount}</td><td class="num-col">${this.totalRequestsCount}</td><td class="num-col">${this.overallClearanceRate}%</td></tr></tfoot>
      </table>`;
    this.printReportAsPdf(`${this.studentLevelLabel} Programmes Clearance Report`, html);
  }

  downloadOverallStatusPdf(): void {
    const html = `
      <table class="data-table">
        <thead><tr><th>Clearance Status</th><th class="num-col">Student Count</th><th class="num-col">Proportion (%)</th></tr></thead>
        <tbody>
          <tr><td><strong class="badge-cleared">Cleared (Completed)</strong></td><td class="num-col"><strong>${this.clearedCount}</strong></td><td class="num-col">${this.overallClearanceRate}%</td></tr>
          <tr><td><strong class="badge-pending">Pending (In Progress)</strong></td><td class="num-col"><strong>${this.pendingCount}</strong></td><td class="num-col">${this.pendingRate}%</td></tr>
          <tr><td><strong class="badge-rejected">Rejected (Action Needed)</strong></td><td class="num-col"><strong>${this.rejectedCount}</strong></td><td class="num-col">${this.rejectedRate}%</td></tr>
        </tbody>
        <tfoot><tr><td>TOTAL CLEARANCE REQUESTS</td><td class="num-col">${this.totalRequestsCount}</td><td class="num-col">100%</td></tr></tfoot>
      </table>`;
    this.printReportAsPdf(`Overall ${this.studentLevelLabel} Clearance Status Report`, html);
  }

  downloadOfficeBreakdownPdf(): void {
    const tableRows = this.officeStatusSummaries
      .map(
        o => `
      <tr>
        <td><strong>${o.office}</strong></td>
        <td>${o.stageGroup}</td>
        <td class="num-col"><span class="badge-cleared">${o.cleared}</span></td>
        <td class="num-col"><span class="badge-pending">${o.pending}</span></td>
        <td class="num-col"><span class="badge-rejected">${o.rejected}</span></td>
        <td class="num-col"><strong>${o.total}</strong></td>
        <td class="num-col"><strong>${o.clearanceRate}%</strong></td>
      </tr>`
      )
      .join('');

    const html = `
      <table class="data-table">
        <thead><tr><th>Corresponding Office</th><th>Stage</th><th class="num-col">Cleared</th><th class="num-col">Pending</th><th class="num-col">Rejected</th><th class="num-col">Total</th><th class="num-col">Rate</th></tr></thead>
        <tbody>${tableRows}</tbody>
        <tfoot><tr><td>TOTAL (ALL OFFICES)</td><td>All Stages</td><td class="num-col">${this.totalOfficeApprovalsCount}</td><td class="num-col">${this.totalOfficePendingCount}</td><td class="num-col">${this.totalOfficeRejectedCount}</td><td class="num-col">${this.totalOfficeApprovalsCount + this.totalOfficePendingCount + this.totalOfficeRejectedCount}</td><td class="num-col">${this.overallClearanceRate}%</td></tr></tfoot>
      </table>`;
    this.printReportAsPdf(`Corresponding Offices Clearance Report (${this.directorateShort})`, html);
  }

  downloadTranscriptLedgerPdf(): void {
    const rows = this.transcriptRequests
      .map(
        (r, i) => `
      <tr>
        <td class="num-col">${i + 1}</td>
        <td><strong>${r.studentName}</strong></td>
        <td><code>${r.registrationNumber}</code></td>
        <td>${r.status}</td>
        <td>${r.collectionMethod || 'Physical Collection'}</td>
        <td>${r.postingRegion || 'Dar es Salaam'}${r.postingWard ? ' (' + r.postingWard + ')' : ''}</td>
        <td>${r.postingContactPhone || '—'}</td>
        <td><strong class="${r.dispatchStatus === 'Dispatched' ? 'badge-cleared' : 'badge-pending'}">${r.dispatchStatus || 'Pending Dispatch'}</strong></td>
      </tr>`
      )
      .join('');

    const html = `
      <table class="data-table">
        <thead><tr><th class="num-col">#</th><th>Student Name</th><th>Reg No.</th><th>Payment</th><th>Collection</th><th>Region</th><th>Phone</th><th>Dispatch</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="8" style="text-align:center;">No transcript requests recorded yet.</td></tr>'}</tbody>
        <tfoot><tr><td colspan="3">TOTAL: ${this.transcriptRequests.length}</td><td colspan="2">ISSUED: ${this.issuedByDirectorCount}</td><td colspan="3">DISPATCHED: ${this.dispatchedCount} · PENDING: ${this.pendingDispatchCount}</td></tr></tfoot>
      </table>`;
    this.printReportAsPdf(`Transcript Collection & Delivery Ledger (${this.directorateShort})`, html);
  }

  downloadComprehensivePdf(): void {
    const summaryHtml = `
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px;">
        <div style="padding:10px; border:1px solid #dce4e9; border-radius:6px; background:#f8fafc;">
          <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">Total Registered (${this.directorateShort})</div>
          <div style="font-size:18px; font-weight:800; color:#002147; margin-top:2px;">${this.totalRegisteredStudents}</div>
        </div>
        <div style="padding:10px; border:1px solid #dce4e9; border-radius:6px; background:#f8fafc;">
          <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">Cleared Students</div>
          <div style="font-size:18px; font-weight:800; color:#15803d; margin-top:2px;">${this.clearedCount} (${this.overallClearanceRate}%)</div>
        </div>
        <div style="padding:10px; border:1px solid #dce4e9; border-radius:6px; background:#f8fafc;">
          <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">Pending / Rejected</div>
          <div style="font-size:18px; font-weight:800; color:#b45309; margin-top:2px;">${this.pendingCount} / ${this.rejectedCount}</div>
        </div>
      </div>`;

    const officeRows = this.officeStatusSummaries
      .map(
        o => `
      <tr>
        <td>${o.office}</td><td>${o.stageGroup}</td>
        <td class="num-col">${o.cleared}</td><td class="num-col">${o.pending}</td>
        <td class="num-col">${o.rejected}</td><td class="num-col">${o.total}</td>
        <td class="num-col">${o.clearanceRate}%</td>
      </tr>`
      )
      .join('');

    const collegeRows = this.collegeBreakdown
      .map(
        c => `
      <tr>
        <td>${c.label}</td>
        <td class="num-col">${c.cleared}</td><td class="num-col">${c.pending}</td>
        <td class="num-col">${c.rejected}</td><td class="num-col">${c.total}</td>
        <td class="num-col">${c.rate}%</td>
      </tr>`
      )
      .join('');

    const html = `
      ${summaryHtml}
      <h3 style="font-size:13px; color:#002147; margin: 16px 0 6px; text-transform:uppercase;">1. Clearance By Corresponding Office</h3>
      <table class="data-table">
        <thead><tr><th>Office</th><th>Stage</th><th class="num-col">Cleared</th><th class="num-col">Pending</th><th class="num-col">Rejected</th><th class="num-col">Total</th><th class="num-col">Rate</th></tr></thead>
        <tbody>${officeRows}</tbody>
      </table>
      <h3 style="font-size:13px; color:#002147; margin: 18px 0 6px; text-transform:uppercase;">2. Clearance By College / School</h3>
      <table class="data-table">
        <thead><tr><th>College / School</th><th class="num-col">Cleared</th><th class="num-col">Pending</th><th class="num-col">Rejected</th><th class="num-col">Total</th><th class="num-col">Rate</th></tr></thead>
        <tbody>${collegeRows || '<tr><td colspan="6">No data available.</td></tr>'}</tbody>
      </table>`;

    this.printReportAsPdf(`${this.studentLevelLabel} Clearance Executive Report`, html);
  }

  private triggerCsvDownload(rows: string[][], filename: string): void {
    const csv = rows
      .map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
