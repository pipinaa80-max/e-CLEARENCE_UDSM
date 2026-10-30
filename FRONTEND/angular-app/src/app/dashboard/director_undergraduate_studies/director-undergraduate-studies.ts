import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { ClearanceOffice, ClearanceRequest, OfficeApproval } from '../../core/models/clearance.model';
import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { ConfigService } from '../../core/services/config.service';
import { StorageService } from '../../core/services/storage.service';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

export interface OfficeStatusSummary {
  office: string;
  stageGroup: string;
  cleared: number;
  pending: number;
  rejected: number;
  total: number;
  clearanceRate: number;
  clearedWidth: number;
  pendingWidth: number;
  rejectedWidth: number;
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
  tone: 'blue' | 'teal' | 'amber' | 'indigo' | 'green';
}

export interface YearHistogramItem {
  yearLabel: string;
  shortLabel: string;
  cohort: string;
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

export interface YearPieSlice {
  yearLabel: string;
  shortLabel: string;
  cohort: string;
  total: number;
  cleared: number;
  pending: number;
  rejected: number;
  percentage: number;
  color: string;
  svgPath: string;
  startAngle: number;
  endAngle: number;
}

export interface RegisteredYearBarItem {
  label: string;
  shortLabel: string;
  yearNumber: number;
  cohort: string;
  totalRegistered: number;
  clearanceRequests: number;
  clearedRequests: number;
  percentage: number;
  barWidth: number;
  color: string;
}

@Component({
  selector: 'app-director-undergraduate-studies',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, DashboardHeaderComponent],
  templateUrl: './director-undergraduate-studies.html',
  styleUrl: './director-undergraduate-studies.css'
})
export class DirectorUndergraduateStudiesDashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly router = inject(Router);
  private readonly storage = new StorageService();

  sidebarOpen = false;
  activeTab: 'overview' | 'offices' | 'colleges' | 'students' = 'overview';
  isLoading = false;
  generatedAt = new Date();

  allRequests: ClearanceRequest[] = [];
  studentYearMap = new Map<string, string>();
  backendRegisteredStudentsByYear: Record<string, number> = {};
  totalRegisteredStudents = 0;

  // Filters
  searchTerm = '';
  selectedCollege = 'ALL';
  selectedStatus: 'ALL' | 'Completed' | 'Pending' | 'Rejected' = 'ALL';
  selectedYear = 'ALL';
  selectedOffice = 'ALL';

  selectedRequestForModal: ClearanceRequest | null = null;

  readonly allOfficesOrder: { office: ClearanceOffice; stageGroup: string }[] = [
    { office: 'Games Coach', stageGroup: 'Stage 1 · Clearance Offices' },
    { office: 'Hall Warden', stageGroup: 'Stage 1 · Clearance Offices' },
    { office: 'USAB', stageGroup: 'Stage 1 · Clearance Offices' },
    { office: 'DARUSO', stageGroup: 'Stage 1 · Clearance Offices' },
    { office: 'Library', stageGroup: 'Stage 1 · Clearance Offices' },
    { office: 'Dean of Students', stageGroup: 'Stage 1 · Clearance Offices' },
    { office: 'Smart Card', stageGroup: 'Stage 1 · Clearance Offices' },
    { office: 'Workshop', stageGroup: 'Stage 1 · College Specific' },
    { office: 'Laboratory', stageGroup: 'Stage 1 · College Specific' },
    { office: 'Department', stageGroup: 'Stage 2 · Academic Dept' },
    { office: 'Principal', stageGroup: 'Stage 3 · College Principal' },
    { office: 'Finance', stageGroup: 'Stage 4 · Final Finance' },
    { office: 'Convocation', stageGroup: 'Stage 4 · Convocation' }
  ];

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.loadAnalyticsData();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  setTab(tab: 'overview' | 'offices' | 'colleges' | 'students'): void {
    this.activeTab = tab;
    this.closeSidebar();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  loadAnalyticsData(): void {
    this.isLoading = true;
    this.generatedAt = new Date();

    // Load local storage requests & users first
    const localRequests = this.clearanceService.getAllRequests() || [];
    const localUsers = this.storage.get<any[]>('udsm-users') || [];
    localUsers.forEach(u => {
      let yrLabel = '';
      if (u?.yearOfStudy) {
        const str = String(u.yearOfStudy).trim();
        const m4 = str.match(/\b(20\d{2})\b/);
        if (m4) {
          yrLabel = `Year ${m4[1]}`;
        } else {
          const num = parseInt(str.replace(/\D+/g, ''), 10);
          if (!isNaN(num) && num > 0) {
            const calYear = 2026 - num + 1;
            yrLabel = `Year ${calYear}`;
          }
        }
      }
      if (!yrLabel && u?.registrationNumber) {
        const m4 = String(u.registrationNumber).match(/\b(20\d{2})\b/);
        if (m4) yrLabel = `Year ${m4[1]}`;
      }
      if (yrLabel) {
        if (u?.id) this.studentYearMap.set(String(u.id), yrLabel);
        if (u?.registrationNumber) this.studentYearMap.set(String(u.registrationNumber), yrLabel);
      }
    });

    const localStudentCount = localUsers.filter(u => String(u?.role || '').toUpperCase() === 'STUDENT').length;
    this.totalRegisteredStudents = localStudentCount;

    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    this.http.get<any>(`${this.config.apiUrl}/clearance/analytics-summary`, headers ? { headers } : {}).subscribe({
      next: (summary) => {
        const backendRequests: ClearanceRequest[] = Array.isArray(summary?.requests)
          ? summary.requests.map((r: any) => this.normalizeBackendRequest(r))
          : [];
        this.allRequests = this.mergeRequests(localRequests, backendRequests);
        if (summary?.registeredStudentsByYear && typeof summary.registeredStudentsByYear === 'object') {
          this.backendRegisteredStudentsByYear = summary.registeredStudentsByYear;
        }
        if (typeof summary?.totalRegisteredStudents === 'number') {
          this.totalRegisteredStudents = Math.max(localStudentCount, summary.totalRegisteredStudents, this.allRequests.length);
        } else {
          this.totalRegisteredStudents = Math.max(localStudentCount, this.allRequests.length);
        }
        this.isLoading = false;
      },
      error: () => {
        this.allRequests = localRequests;
        this.totalRegisteredStudents = Math.max(localStudentCount, this.allRequests.length);
        this.isLoading = false;
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
            status: st === 'APPROVED' || st === 'CLEARED' || st === 'COMPLETED'
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

    let rawYr = '';
    if (raw?.yearOfStudy) {
      const str = String(raw.yearOfStudy).trim();
      const m4 = str.match(/\b(20\d{2})\b/);
      if (m4) {
        rawYr = `Year ${m4[1]}`;
      } else {
        const num = parseInt(str.replace(/\D+/g, ''), 10);
        if (!isNaN(num) && num > 0) {
          rawYr = `Year ${2026 - num + 1}`;
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

    return {
      id: String(raw?.id || crypto.randomUUID()),
      studentId: String(raw?.studentId || ''),
      studentName: raw?.studentName || 'Student',
      registrationNumber: raw?.registrationNumber || 'N/A',
      email: raw?.email || '',
      college: raw?.college || 'Unspecified College',
      department: raw?.department || 'Unspecified Department',
      programme: raw?.programme || 'Undergraduate Programme',
      requestDate: raw?.requestDate || new Date().toISOString(),
      status: normalizedStatus,
      currentOffice: (raw?.currentOffice || 'Convocation') as ClearanceOffice,
      currentStage: (raw?.currentStage || (normalizedStatus === 'Completed' ? 'Completed' : 'Convocation')) as any,
      approvals
    };
  }

  private mergeRequests(localList: ClearanceRequest[], backendList: ClearanceRequest[]): ClearanceRequest[] {
    const byKey = new Map<string, ClearanceRequest>();
    for (const req of [...backendList, ...localList]) {
      const key = (req.registrationNumber && req.registrationNumber !== 'N/A')
        ? `reg:${req.registrationNumber.toLowerCase()}`
        : `id:${req.id}`;
      byKey.set(key, req);
    }
    return Array.from(byKey.values()).sort(
      (a, b) => new Date(b.requestDate || 0).getTime() - new Date(a.requestDate || 0).getTime()
    );
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
    return this.totalRequestsCount > 0
      ? Math.round((this.clearedCount / this.totalRequestsCount) * 100)
      : 0;
  }

  get pendingRate(): number {
    return this.totalRequestsCount > 0
      ? Math.round((this.pendingCount / this.totalRequestsCount) * 100)
      : 0;
  }

  get rejectedRate(): number {
    return this.totalRequestsCount > 0
      ? Math.round((this.rejectedCount / this.totalRequestsCount) * 100)
      : 0;
  }

  // Donut SVG Stroke Dasharray helpers (circumference = 2 * pi * 42 ≈ 263.89)
  readonly donutCircumference = 263.89;

  get clearedDashArray(): string {
    const len = (this.overallClearanceRate / 100) * this.donutCircumference;
    return `${len} ${this.donutCircumference}`;
  }

  get pendingDashArray(): string {
    const len = (this.pendingRate / 100) * this.donutCircumference;
    return `${len} ${this.donutCircumference}`;
  }

  get pendingDashOffset(): number {
    return -((this.overallClearanceRate / 100) * this.donutCircumference);
  }

  get rejectedDashArray(): string {
    const len = (this.rejectedRate / 100) * this.donutCircumference;
    return `${len} ${this.donutCircumference}`;
  }

  get rejectedDashOffset(): number {
    return -(((this.overallClearanceRate + this.pendingRate) / 100) * this.donutCircumference);
  }

  // =========================================================
  // COLLEGE, YEAR, PROGRAMME & STUDENT RANKINGS
  // =========================================================

  getYearLabel(req: ClearanceRequest): string {
    if (req.studentId && this.studentYearMap.has(req.studentId)) {
      return this.studentYearMap.get(req.studentId)!;
    }
    if (req.registrationNumber && this.studentYearMap.has(req.registrationNumber)) {
      return this.studentYearMap.get(req.registrationNumber)!;
    }
    const regMatch = String(req.registrationNumber || '').match(/\b(20\d{2})\b/);
    if (regMatch) {
      return `Year ${regMatch[1]}`;
    }
    const reqYear = new Date(req.requestDate).getFullYear();
    return Number.isNaN(reqYear) ? 'Year 2026' : `Year ${reqYear}`;
  }

  get collegeBreakdown(): BreakdownItem[] {
    return this.buildBreakdown(req => req.college || 'Unspecified College');
  }

  get yearBreakdown(): BreakdownItem[] {
    return this.buildBreakdown(req => this.getYearLabel(req));
  }

  get programmeBreakdown(): BreakdownItem[] {
    return this.buildBreakdown(req => req.programme || 'Undergraduate Programme');
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

  get topClearedStudents(): ClearanceRequest[] {
    const cleared = this.allRequests.filter(r => r.status === 'Completed');
    return (cleared.length ? cleared : this.allRequests).slice(0, 6);
  }

  // =========================================================
  // CLEARANCE PROCESS STAGE PIPELINE & OFFICE STATUS MATRIX
  // =========================================================

  // =========================================================
  // ACADEMIC YEAR HISTOGRAM & PIE CHART DATA GENERATORS
  // =========================================================

  hoveredYear: string | null = null;

  readonly yearColorPalette: string[] = [
    '#00679b', // Year 1: UDSM Classic Blue
    '#16a34a', // Year 2: Forest Emerald
    '#d97706', // Year 3: Amber Gold
    '#7c3aed', // Year 4: Royal Purple
    '#0284c7', // Year 5: Sky Blue
    '#e11d48', // Year 6/Postgrad: Rose Crimson
    '#0d9488', // Teal
    '#ea580c'  // Tangerine
  ];

  getYearColor(index: number): string {
    return this.yearColorPalette[index % this.yearColorPalette.length];
  }

  setHoveredYear(label: string | null): void {
    this.hoveredYear = label;
  }

  filterByYear(yearLabel: string): void {
    this.selectedYear = yearLabel;
    const el = document.getElementById('student-tracker');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  get registeredStudentsByYear(): RegisteredYearBarItem[] {
    const localUsers = this.storage.get<any[]>('udsm-users') || [];
    const studentUsers = localUsers.filter(u => String(u?.role || '').toUpperCase() === 'STUDENT');

    // Maps keyed by calendar year (e.g. 2026, 2025, 2024, 2023, 2022)
    const registeredCounts = new Map<number, number>();
    const requestCounts = new Map<number, { total: number; cleared: number }>();

    // Baseline undergraduate calendar years
    const baseYears = [2026, 2025, 2024, 2023, 2022];
    for (const yr of baseYears) {
      registeredCounts.set(yr, 0);
      requestCounts.set(yr, { total: 0, cleared: 0 });
    }

    // 1. Tally from local registered students
    for (const u of studentUsers) {
      let calYr = 2026;
      if (u?.yearOfStudy) {
        const str = String(u.yearOfStudy).trim();
        const m4 = str.match(/\b(20\d{2})\b/);
        if (m4) {
          calYr = parseInt(m4[1], 10);
        } else {
          const num = parseInt(str.replace(/\D+/g, ''), 10);
          if (!isNaN(num) && num > 0) {
            calYr = 2026 - num + 1;
          }
        }
      } else if (u?.registrationNumber) {
        const m = String(u.registrationNumber).match(/\b(20\d{2})\b/);
        if (m) calYr = parseInt(m[1], 10);
      }
      registeredCounts.set(calYr, (registeredCounts.get(calYr) || 0) + 1);
    }

    // 2. Merge backend breakdown if present
    if (this.backendRegisteredStudentsByYear) {
      for (const [key, val] of Object.entries(this.backendRegisteredStudentsByYear)) {
        const m = key.match(/\b(20\d{2})\b/);
        if (m) {
          const yr = parseInt(m[1], 10);
          const current = registeredCounts.get(yr) || 0;
          registeredCounts.set(yr, Math.max(current, Number(val) || 0));
        }
      }
    }

    // 3. Tally clearance requests by calendar year
    for (const req of this.allRequests) {
      let calYr = 2026;
      const label = this.getYearLabel(req);
      const m4 = label.match(/\b(20\d{2})\b/);
      if (m4) {
        calYr = parseInt(m4[1], 10);
      } else {
        const regMatch = String(req.registrationNumber || '').match(/\b(20\d{2})\b/);
        if (regMatch) calYr = parseInt(regMatch[1], 10);
      }

      const entry = requestCounts.get(calYr) || { total: 0, cleared: 0 };
      entry.total += 1;
      if (req.status === 'Completed') entry.cleared += 1;
      requestCounts.set(calYr, entry);

      // Student with request is registered
      if ((registeredCounts.get(calYr) || 0) < entry.total) {
        registeredCounts.set(calYr, entry.total);
      }
    }

    // Visible years: baseYears plus any years with data, sorted descending (2026, 2025, 2024...)
    const presentYears = new Set<number>(baseYears);
    registeredCounts.forEach((cnt, yr) => { if (cnt > 0) presentYears.add(yr); });
    requestCounts.forEach((data, yr) => { if (data.total > 0) presentYears.add(yr); });

    const sortedYears = Array.from(presentYears).sort((a, b) => b - a);

    const totalCalculated = Array.from(registeredCounts.values()).reduce((sum, n) => sum + n, 0);
    const effectiveTotal = Math.max(totalCalculated, this.totalRegisteredStudents, 1);
    const maxInAnyYear = Math.max(1, ...Array.from(registeredCounts.values()));

    return sortedYears.map((yr, index) => {
      const regCount = registeredCounts.get(yr) || 0;
      const reqData = requestCounts.get(yr) || { total: 0, cleared: 0 };
      const percentage = effectiveTotal > 0 ? Math.round((regCount / effectiveTotal) * 100) : 0;
      const barWidth = regCount > 0 ? Math.max(8, Math.round((regCount / maxInAnyYear) * 100)) : 0;

      return {
        label: `Year ${yr}`,
        shortLabel: `${yr}`,
        yearNumber: yr,
        cohort: `${yr} Cohort`,
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

    // Sort years chronologically by calendar year (e.g. 2022, 2023, 2024, 2025, 2026)
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
        cohort: yearMatch ? `${yearMatch[1]} Cohort` : '',
        total: item.total,
        cleared: item.cleared,
        pending: item.pending,
        rejected: item.rejected,
        clearanceRate: item.rate,
        barHeightPercent: Math.max(12, Math.round((item.total / maxCount) * 100)),
        clearedPercent: total > 0 ? Math.round((item.cleared / total) * 100) : 0,
        pendingPercent: total > 0 ? Math.round((item.pending / total) * 100) : 0,
        rejectedPercent: total > 0 ? Math.round((item.rejected / total) * 100) : 0
      };
    });
  }

  get histogramMaxCount(): number {
    return Math.max(1, ...this.yearHistogramData.map(i => i.total));
  }

  get histogramYAxisTicks(): number[] {
    const max = this.histogramMaxCount;
    if (max <= 1) return [1, 0];
    if (max <= 4) return [max, Math.round(max / 2), 0];
    return [max, Math.round(max * 0.66), Math.round(max * 0.33), 0];
  }

  get yearPieSlices(): YearPieSlice[] {
    const years = this.yearHistogramData;
    const grandTotal = years.reduce((sum, y) => sum + y.total, 0);
    if (grandTotal === 0) return [];

    const cx = 120;
    const cy = 120;
    const R = 95; // outer radius
    const r = 55; // inner radius (donut hole)

    if (years.length === 1 || years.filter(y => y.total > 0).length === 1) {
      const active = years.find(y => y.total > 0) || years[0];
      // Full ring donut using two 180-deg arcs
      const path = `M ${cx} ${cy - R} ` +
        `A ${R} ${R} 0 1 1 ${cx} ${cy + R} ` +
        `A ${R} ${R} 0 1 1 ${cx} ${cy - R} ` +
        `M ${cx} ${cy - r} ` +
        `A ${r} ${r} 0 1 0 ${cx} ${cy + r} ` +
        `A ${r} ${r} 0 1 0 ${cx} ${cy - r} Z`;
      return [{
        yearLabel: active.yearLabel,
        shortLabel: active.shortLabel,
        cohort: active.cohort,
        total: active.total,
        cleared: active.cleared,
        pending: active.pending,
        rejected: active.rejected,
        percentage: 100,
        color: this.getYearColor(0),
        svgPath: path,
        startAngle: 0,
        endAngle: 360
      }];
    }

    let currentAngle = -90; // Start at 12 o'clock
    const slices: YearPieSlice[] = [];

    years.forEach((item, index) => {
      if (item.total === 0) return;
      const sliceAngle = (item.total / grandTotal) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;

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

      const largeArcFlag = sliceAngle > 180 ? 1 : 0;

      const svgPath = `M ${x1} ${y1} ` +
        `A ${R} ${R} 0 ${largeArcFlag} 1 ${x2} ${y2} ` +
        `L ${x3} ${y3} ` +
        `A ${r} ${r} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;

      const pct = Math.round((item.total / grandTotal) * 100);

      slices.push({
        yearLabel: item.yearLabel,
        shortLabel: item.shortLabel,
        cohort: item.cohort,
        total: item.total,
        cleared: item.cleared,
        pending: item.pending,
        rejected: item.rejected,
        percentage: pct,
        color: this.getYearColor(index),
        svgPath,
        startAngle,
        endAngle
      });

      currentAngle += sliceAngle;
    });

    return slices;
  }

  get stagePipeline(): StagePipelineItem[] {
    const total = Math.max(1, this.totalRequestsCount);
    const parallelCount = this.allRequests.filter(r => r.status === 'Pending' && r.currentStage === 'Parallel').length;
    const deptCount = this.allRequests.filter(r => r.status === 'Pending' && r.currentStage === 'Department').length;
    const principalCount = this.allRequests.filter(r => r.status === 'Pending' && r.currentStage === 'Principal').length;
    const financeCount = this.allRequests.filter(r => r.status === 'Pending' && r.currentStage === 'Finance').length;
    const completedCount = this.clearedCount;

    return [
      {
        stage: 'Stage 1',
        title: 'Clearance Offices',
        description: 'Library, Hall Warden, USAB, DARUSO, Sports, Dean of Students, Smart Card',
        count: parallelCount,
        percentage: Math.round((parallelCount / total) * 100),
        tone: 'blue'
      },
      {
        stage: 'Stage 2',
        title: 'Academic Department',
        description: 'Departmental review & Lecturer debt clearance',
        count: deptCount,
        percentage: Math.round((deptCount / total) * 100),
        tone: 'amber'
      },
      {
        stage: 'Stage 3',
        title: 'College Principal',
        description: 'Principal review and college endorsement',
        count: principalCount,
        percentage: Math.round((principalCount / total) * 100),
        tone: 'indigo'
      },
      {
        stage: 'Stage 4',
        title: 'Finance & Convocation',
        description: 'Bursar financial clearance & Convocation fee verification',
        count: financeCount,
        percentage: Math.round((financeCount / total) * 100),
        tone: 'teal'
      },
      {
        stage: 'Stage 5',
        title: 'Fully Cleared & Certified',
        description: 'All 4 stages approved; clearance certificate & transcript unlocked',
        count: completedCount,
        percentage: Math.round((completedCount / total) * 100),
        tone: 'green'
      }
    ];
  }

  get officeStatusSummaries(): OfficeStatusSummary[] {
    return this.allOfficesOrder.map(({ office, stageGroup }) => {
      let cleared = 0;
      let pending = 0;
      let rejected = 0;

      for (const req of this.allRequests) {
        const match = (req.approvals || []).find(
          a => String(a.office).toLowerCase() === office.toLowerCase()
            || (office === 'Department' && String(a.office).toLowerCase() === String(req.department || '').toLowerCase())
        );
        if (!match) continue;
        if (match.status === 'Approved') cleared += 1;
        else if (match.status === 'Rejected') rejected += 1;
        else pending += 1;
      }

      const total = cleared + pending + rejected;
      const clearanceRate = total > 0 ? Math.round((cleared / total) * 100) : 0;
      const clearedWidth = total > 0 ? Math.round((cleared / total) * 100) : 0;
      const pendingWidth = total > 0 ? Math.round((pending / total) * 100) : 0;
      const rejectedWidth = total > 0 ? Math.max(0, 100 - clearedWidth - pendingWidth) : 0;

      return {
        office,
        stageGroup,
        cleared,
        pending,
        rejected,
        total,
        clearanceRate,
        clearedWidth,
        pendingWidth,
        rejectedWidth
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
  // FILTERING & STUDENT PROGRESS HELPERS
  // =========================================================

  get availableColleges(): string[] {
    return Array.from(new Set(this.allRequests.map(r => r.college).filter(Boolean))).sort();
  }

  get availableYears(): string[] {
    return Array.from(new Set(this.allRequests.map(r => this.getYearLabel(r)).filter(Boolean))).sort();
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
          req.currentOffice,
          req.status
        ].join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }

  getApprovedOfficesCount(req: ClearanceRequest): number {
    return (req.approvals || []).filter(a => a.status === 'Approved').length;
  }

  getTotalOfficesCount(req: ClearanceRequest): number {
    return (req.approvals || []).length || 11;
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

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCollege = 'ALL';
    this.selectedStatus = 'ALL';
    this.selectedYear = 'ALL';
    this.selectedOffice = 'ALL';
  }

  // =========================================================
  // REPORT GENERATION & DOWNLOADS (CSV + PRINTABLE PDF)
  // =========================================================

  downloadComprehensiveReport(): void {
    const rows: string[][] = [
      ['UNIVERSITY OF DAR ES SALAAM (UDSM) - DIRECTORATE OF UNDERGRADUATE STUDIES'],
      ['OFFICIAL CLEARANCE SYSTEM ANALYTICS & STATISTICAL REPORT'],
      ['Generated At', new Date().toLocaleString()],
      ['Generated By', this.currentUser?.fullName || 'Director of Undergraduate Studies'],
      [],
      ['1. EXECUTIVE CLEARANCE SUMMARY', 'VALUE'],
      ['Total Registered Undergraduate Students', String(this.totalRegisteredStudents)],
      ['Total Clearance Requests Submitted', String(this.totalRequestsCount)],
      ['Cleared / Completed Students', String(this.clearedCount)],
      ['Pending / In-Progress Students', String(this.pendingCount)],
      ['Rejected / Action Required Students', String(this.rejectedCount)],
      ['Overall System Clearance Rate (%)', `${this.overallClearanceRate}%`],
      ['Most Frequently Cleared College', this.topClearedCollege ? `${this.topClearedCollege.label} (${this.topClearedCollege.cleared} cleared / ${this.topClearedCollege.total} total)` : 'N/A'],
      ['Most Frequently Cleared Year / Cohort', this.topClearedYear ? `${this.topClearedYear.label} (${this.topClearedYear.cleared} cleared / ${this.topClearedYear.total} total)` : 'N/A'],
      ['Most Frequently Cleared Programme', this.topClearedProgramme ? `${this.topClearedProgramme.label} (${this.topClearedProgramme.cleared} cleared)` : 'N/A'],
      [],
      ['2. CLEARANCE STATUS BY CORRESPONDING OFFICE', 'STAGE', 'CLEARED', 'PENDING', 'REJECTED', 'TOTAL', 'CLEARANCE RATE (%)'],
      ...this.officeStatusSummaries.map(o => [
        o.office,
        o.stageGroup,
        String(o.cleared),
        String(o.pending),
        String(o.rejected),
        String(o.total),
        `${o.clearanceRate}%`
      ]),
      [
        'TOTAL OFFICE APPROVAL ACTIONS',
        'All Stages',
        String(this.totalOfficeApprovalsCount),
        String(this.totalOfficePendingCount),
        String(this.totalOfficeRejectedCount),
        String(this.totalOfficeApprovalsCount + this.totalOfficePendingCount + this.totalOfficeRejectedCount),
        '—'
      ],
      [],
      ['3. CLEARANCE ANALYTICS BY COLLEGE / SCHOOL', 'CLEARED', 'PENDING', 'REJECTED', 'TOTAL', 'CLEARANCE RATE (%)'],
      ...this.collegeBreakdown.map(c => [
        c.label,
        String(c.cleared),
        String(c.pending),
        String(c.rejected),
        String(c.total),
        `${c.rate}%`
      ]),
      [],
      ['4. CLEARANCE FREQUENCY BY ACADEMIC / STUDY YEAR', 'CLEARED', 'PENDING', 'REJECTED', 'TOTAL', 'CLEARANCE RATE (%)'],
      ...this.yearBreakdown.map(y => [
        y.label,
        String(y.cleared),
        String(y.pending),
        String(y.rejected),
        String(y.total),
        `${y.rate}%`
      ]),
      [],
      ['5. STUDENT CLEARANCE STATUS LEDGER', 'REGISTRATION NO.', 'STUDENT NAME', 'COLLEGE', 'DEPARTMENT', 'PROGRAMME', 'YEAR', 'CURRENT STAGE / OFFICE', 'OFFICES CLEARED', 'STATUS', 'SUBMITTED DATE'],
      ...this.filteredRequests.map((r, idx) => [
        String(idx + 1),
        r.registrationNumber || 'N/A',
        r.studentName || 'Student',
        r.college || '',
        r.department || '',
        r.programme || '',
        this.getYearLabel(r),
        r.status === 'Completed' ? 'Completed (All Offices)' : `${r.currentStage} (${r.currentOffice || 'Pending'})`,
        `${this.getApprovedOfficesCount(r)} / ${this.getTotalOfficesCount(r)}`,
        r.status,
        r.requestDate ? new Date(r.requestDate).toLocaleDateString() : ''
      ])
    ];

    this.triggerCsvDownload(
      rows,
      `udsm-undergraduate-clearance-analytics-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  downloadOfficeBreakdownCsv(): void {
    const rows: string[][] = [
      ['UDSM DIRECTORATE OF UNDERGRADUATE STUDIES - CORRESPONDING OFFICES CLEARANCE REPORT'],
      ['Generated At', new Date().toLocaleString()],
      [],
      ['Office Name', 'Clearance Stage', 'Cleared (Approved)', 'Pending', 'Rejected', 'Total Requests', 'Clearance Rate (%)'],
      ...this.officeStatusSummaries.map(o => [
        o.office,
        o.stageGroup,
        String(o.cleared),
        String(o.pending),
        String(o.rejected),
        String(o.total),
        `${o.clearanceRate}%`
      ]),
      [
        'TOTAL',
        'All Offices',
        String(this.totalOfficeApprovalsCount),
        String(this.totalOfficePendingCount),
        String(this.totalOfficeRejectedCount),
        String(this.totalOfficeApprovalsCount + this.totalOfficePendingCount + this.totalOfficeRejectedCount),
        `${this.overallClearanceRate}%`
      ]
    ];

    this.triggerCsvDownload(
      rows,
      `udsm-office-clearance-breakdown-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  private printReportAsPdf(docTitle: string, sectionsHtml: string): void {
    const filename = `${docTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${docTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 28px; color: #173f58; background: #ffffff; line-height: 1.5; font-size: 12px; }
    .report-wrap { max-width: 900px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2.5px solid #00679b; padding-bottom: 14px; margin-bottom: 20px; }
    .inst-name { font-size: 17px; font-weight: 800; color: #063f66; letter-spacing: 0.5px; text-transform: uppercase; }
    .dir-name { font-size: 12px; font-weight: 700; color: #bf8511; letter-spacing: 1px; text-transform: uppercase; margin-top: 3px; }
    .doc-title { font-size: 15px; font-weight: 800; color: #00679b; margin-top: 10px; text-transform: uppercase; }
    .meta-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 11px; color: #617381; font-weight: 600; }
    .data-table { width: 100%; border-collapse: collapse; margin-top: 14px; margin-bottom: 18px; font-size: 11.5px; }
    .data-table th, .data-table td { padding: 8px 10px; border: 1px solid #dce4e9; text-align: left; }
    .data-table th { background: #f0f7fb; color: #064d78; font-weight: 800; font-size: 11px; text-transform: uppercase; }
    .data-table tr:nth-child(even) { background: #fbfcfd; }
    .data-table tfoot td { font-weight: 800; background: #eaf2f7; border-top: 2px solid #00679b; color: #063f66; }
    .num-col { text-align: right; }
    .badge-cleared { color: #167344; font-weight: 700; }
    .badge-pending { color: #b45309; font-weight: 700; }
    .badge-rejected { color: #b42318; font-weight: 700; }
    .footer { margin-top: 26px; padding-top: 12px; border-top: 1px solid #dce4e9; display: flex; justify-content: space-between; font-size: 10.5px; color: #71818b; }
    .no-print { text-align: center; margin-top: 20px; }
    .btn-print { padding: 9px 20px; background: #00679b; color: #fff; border: none; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      @page { margin: 15mm; size: auto; }
    }
  </style>
</head>
<body>
  <div class="report-wrap">
    <div class="header">
      <div class="inst-name">University of Dar es Salaam</div>
      <div class="dir-name">Directorate of Undergraduate Studies</div>
      <div class="doc-title">${docTitle}</div>
      <div class="meta-bar">
        <span>Generated: ${new Date().toLocaleString()}</span>
        <span>By: ${this.currentUser?.fullName || 'Director of Undergraduate Studies'}</span>
      </div>
    </div>

    ${sectionsHtml}

    <div class="footer">
      <span>Smart Clearance Management Information System (MIS)</span>
      <span>Official Institutional Report · University of Dar es Salaam</span>
    </div>

    <div class="no-print">
      <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
    </div>
  </div>
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => { window.print(); }, 350);
    });
  </script>
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
    const tableRows = this.registeredStudentsByYear.map(y => `
      <tr>
        <td><strong>${y.label}</strong></td>
        <td class="num-col"><strong>${y.totalRegistered}</strong></td>
        <td class="num-col">${y.percentage}%</td>
        <td class="num-col">${y.clearanceRequests}</td>
        <td class="num-col"><span class="badge-cleared">${y.clearedRequests}</span></td>
      </tr>
    `).join('');

    const html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Academic Year</th>
            <th class="num-col">Total Registered Students</th>
            <th class="num-col">Enrollment Share (%)</th>
            <th class="num-col">Clearance Requests Submitted</th>
            <th class="num-col">Cleared Students</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
        <tfoot>
          <tr>
            <td>TOTAL</td>
            <td class="num-col">${this.totalRegisteredStudents}</td>
            <td class="num-col">100%</td>
            <td class="num-col">${this.totalRequestsCount}</td>
            <td class="num-col">${this.clearedCount}</td>
          </tr>
        </tfoot>
      </table>
    `;
    this.printReportAsPdf('Total Registered Students by Study Year Report', html);
  }

  downloadCollegesPdf(): void {
    const tableRows = this.collegeBreakdown.map(c => `
      <tr>
        <td><strong>${c.label}</strong></td>
        <td class="num-col"><span class="badge-cleared">${c.cleared}</span></td>
        <td class="num-col"><span class="badge-pending">${c.pending}</span></td>
        <td class="num-col"><span class="badge-rejected">${c.rejected}</span></td>
        <td class="num-col"><strong>${c.total}</strong></td>
        <td class="num-col"><strong>${c.rate}%</strong></td>
      </tr>
    `).join('');

    const html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>College / School Name</th>
            <th class="num-col">Cleared</th>
            <th class="num-col">Pending</th>
            <th class="num-col">Rejected</th>
            <th class="num-col">Total Requests</th>
            <th class="num-col">Clearance Rate</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
        <tfoot>
          <tr>
            <td>TOTAL (ALL COLLEGES)</td>
            <td class="num-col">${this.clearedCount}</td>
            <td class="num-col">${this.pendingCount}</td>
            <td class="num-col">${this.rejectedCount}</td>
            <td class="num-col">${this.totalRequestsCount}</td>
            <td class="num-col">${this.overallClearanceRate}%</td>
          </tr>
        </tfoot>
      </table>
    `;
    this.printReportAsPdf('Clearance Statistics by College and School', html);
  }

  downloadYearHistogramPdf(): void {
    const tableRows = this.yearHistogramData.map(y => `
      <tr>
        <td><strong>${y.yearLabel}</strong></td>
        <td class="num-col"><span class="badge-cleared">${y.cleared}</span></td>
        <td class="num-col"><span class="badge-pending">${y.pending}</span></td>
        <td class="num-col"><span class="badge-rejected">${y.rejected}</span></td>
        <td class="num-col"><strong>${y.total}</strong></td>
        <td class="num-col"><strong>${y.clearanceRate}%</strong></td>
      </tr>
    `).join('');

    const html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Academic Year</th>
            <th class="num-col">Cleared</th>
            <th class="num-col">Pending</th>
            <th class="num-col">Rejected</th>
            <th class="num-col">Total Clearance Requests</th>
            <th class="num-col">Clearance Rate</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
        <tfoot>
          <tr>
            <td>TOTAL (ALL COHORTS)</td>
            <td class="num-col">${this.clearedCount}</td>
            <td class="num-col">${this.pendingCount}</td>
            <td class="num-col">${this.rejectedCount}</td>
            <td class="num-col">${this.totalRequestsCount}</td>
            <td class="num-col">${this.overallClearanceRate}%</td>
          </tr>
        </tfoot>
      </table>
    `;
    this.printReportAsPdf('Academic Year Clearance Distribution (Histogram Data)', html);
  }

  downloadYearPiePdf(): void {
    const tableRows = this.yearPieSlices.map(s => `
      <tr>
        <td><strong>${s.yearLabel}</strong></td>
        <td class="num-col"><strong>${s.total}</strong></td>
        <td class="num-col"><strong>${s.percentage}%</strong></td>
        <td class="num-col"><span class="badge-cleared">${s.cleared}</span></td>
        <td class="num-col"><span class="badge-pending">${s.pending}</span></td>
        <td class="num-col"><span class="badge-rejected">${s.rejected}</span></td>
      </tr>
    `).join('');

    const html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Academic Year</th>
            <th class="num-col">Total Students</th>
            <th class="num-col">Share Proportion</th>
            <th class="num-col">Cleared</th>
            <th class="num-col">Pending</th>
            <th class="num-col">Rejected</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
        <tfoot>
          <tr>
            <td>TOTAL</td>
            <td class="num-col">${this.totalRequestsCount}</td>
            <td class="num-col">100%</td>
            <td class="num-col">${this.clearedCount}</td>
            <td class="num-col">${this.pendingCount}</td>
            <td class="num-col">${this.rejectedCount}</td>
          </tr>
        </tfoot>
      </table>
    `;
    this.printReportAsPdf('Clearance Share and Cohort Proportion by Academic Year', html);
  }

  downloadProgrammesPdf(): void {
    const tableRows = this.programmeBreakdown.map(p => `
      <tr>
        <td><strong>${p.label}</strong></td>
        <td class="num-col"><span class="badge-cleared">${p.cleared}</span></td>
        <td class="num-col"><span class="badge-pending">${p.pending}</span></td>
        <td class="num-col"><span class="badge-rejected">${p.rejected}</span></td>
        <td class="num-col"><strong>${p.total}</strong></td>
        <td class="num-col"><strong>${p.rate}%</strong></td>
      </tr>
    `).join('');

    const html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Undergraduate Programme</th>
            <th class="num-col">Cleared</th>
            <th class="num-col">Pending</th>
            <th class="num-col">Rejected</th>
            <th class="num-col">Total Requests</th>
            <th class="num-col">Clearance Rate</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
        <tfoot>
          <tr>
            <td>TOTAL</td>
            <td class="num-col">${this.clearedCount}</td>
            <td class="num-col">${this.pendingCount}</td>
            <td class="num-col">${this.rejectedCount}</td>
            <td class="num-col">${this.totalRequestsCount}</td>
            <td class="num-col">${this.overallClearanceRate}%</td>
          </tr>
        </tfoot>
      </table>
    `;
    this.printReportAsPdf('Undergraduate Programmes Clearance Report', html);
  }

  downloadOverallStatusPdf(): void {
    const html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Clearance Status</th>
            <th class="num-col">Student Count</th>
            <th class="num-col">Proportion (%)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong class="badge-cleared">Cleared (Completed)</strong></td>
            <td class="num-col"><strong>${this.clearedCount}</strong></td>
            <td class="num-col">${this.overallClearanceRate}%</td>
          </tr>
          <tr>
            <td><strong class="badge-pending">Pending (In Progress)</strong></td>
            <td class="num-col"><strong>${this.pendingCount}</strong></td>
            <td class="num-col">${this.pendingRate}%</td>
          </tr>
          <tr>
            <td><strong class="badge-rejected">Rejected (Action Needed)</strong></td>
            <td class="num-col"><strong>${this.rejectedCount}</strong></td>
            <td class="num-col">${this.rejectedRate}%</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>TOTAL CLEARANCE REQUESTS</td>
            <td class="num-col">${this.totalRequestsCount}</td>
            <td class="num-col">100%</td>
          </tr>
        </tfoot>
      </table>
    `;
    this.printReportAsPdf('Overall Institutional Clearance Status Report', html);
  }

  downloadOfficeBreakdownPdf(): void {
    const tableRows = this.officeStatusSummaries.map(o => `
      <tr>
        <td><strong>${o.office}</strong></td>
        <td>${o.stageGroup}</td>
        <td class="num-col"><span class="badge-cleared">${o.cleared}</span></td>
        <td class="num-col"><span class="badge-pending">${o.pending}</span></td>
        <td class="num-col"><span class="badge-rejected">${o.rejected}</span></td>
        <td class="num-col"><strong>${o.total}</strong></td>
        <td class="num-col"><strong>${o.clearanceRate}%</strong></td>
      </tr>
    `).join('');

    const html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Corresponding Office</th>
            <th>Clearance Stage</th>
            <th class="num-col">Cleared</th>
            <th class="num-col">Pending</th>
            <th class="num-col">Rejected</th>
            <th class="num-col">Total</th>
            <th class="num-col">Clearance Rate</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
        <tfoot>
          <tr>
            <td>TOTAL (ALL OFFICES)</td>
            <td>All Stages</td>
            <td class="num-col">${this.totalOfficeApprovalsCount}</td>
            <td class="num-col">${this.totalOfficePendingCount}</td>
            <td class="num-col">${this.totalOfficeRejectedCount}</td>
            <td class="num-col">${this.totalOfficeApprovalsCount + this.totalOfficePendingCount + this.totalOfficeRejectedCount}</td>
            <td class="num-col">${this.overallClearanceRate}%</td>
          </tr>
        </tfoot>
      </table>
    `;
    this.printReportAsPdf('Corresponding Offices Clearance Status Report', html);
  }

  downloadComprehensivePdf(): void {
    const summaryHtml = `
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px;">
        <div style="padding:10px; border:1px solid #dce4e9; border-radius:6px; background:#f8fafc;">
          <div style="font-size:10px; font-weight:800; color:#617381; text-transform:uppercase;">Total Registered</div>
          <div style="font-size:18px; font-weight:800; color:#064d78; margin-top:2px;">${this.totalRegisteredStudents}</div>
        </div>
        <div style="padding:10px; border:1px solid #dce4e9; border-radius:6px; background:#f8fafc;">
          <div style="font-size:10px; font-weight:800; color:#617381; text-transform:uppercase;">Cleared Students</div>
          <div style="font-size:18px; font-weight:800; color:#167344; margin-top:2px;">${this.clearedCount} (${this.overallClearanceRate}%)</div>
        </div>
        <div style="padding:10px; border:1px solid #dce4e9; border-radius:6px; background:#f8fafc;">
          <div style="font-size:10px; font-weight:800; color:#617381; text-transform:uppercase;">Active / Pending</div>
          <div style="font-size:18px; font-weight:800; color:#b45309; margin-top:2px;">${this.pendingCount} (${this.pendingRate}%)</div>
        </div>
      </div>
    `;

    const officeRows = this.officeStatusSummaries.map(o => `
      <tr>
        <td>${o.office}</td>
        <td>${o.stageGroup}</td>
        <td class="num-col">${o.cleared}</td>
        <td class="num-col">${o.pending}</td>
        <td class="num-col">${o.rejected}</td>
        <td class="num-col">${o.total}</td>
        <td class="num-col">${o.clearanceRate}%</td>
      </tr>
    `).join('');

    const collegeRows = this.collegeBreakdown.map(c => `
      <tr>
        <td>${c.label}</td>
        <td class="num-col">${c.cleared}</td>
        <td class="num-col">${c.pending}</td>
        <td class="num-col">${c.rejected}</td>
        <td class="num-col">${c.total}</td>
        <td class="num-col">${c.rate}%</td>
      </tr>
    `).join('');

    const html = `
      ${summaryHtml}
      <h3 style="font-size:13px; color:#063f66; margin: 16px 0 6px; text-transform:uppercase;">1. Clearance By Corresponding Office</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Office</th><th>Stage</th><th class="num-col">Cleared</th><th class="num-col">Pending</th><th class="num-col">Rejected</th><th class="num-col">Total</th><th class="num-col">Rate</th>
          </tr>
        </thead>
        <tbody>${officeRows}</tbody>
      </table>

      <h3 style="font-size:13px; color:#063f66; margin: 18px 0 6px; text-transform:uppercase;">2. Clearance By College / School</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>College / School</th><th class="num-col">Cleared</th><th class="num-col">Pending</th><th class="num-col">Rejected</th><th class="num-col">Total</th><th class="num-col">Rate</th>
          </tr>
        </thead>
        <tbody>${collegeRows}</tbody>
      </table>
    `;

    this.printReportAsPdf('Institution-Wide Clearance Executive Report', html);
  }

  downloadRegisteredStudentsExcel(): void {
    const rows: string[][] = [
      ['UNIVERSITY OF DAR ES SALAAM (UDSM) - DIRECTORATE OF UNDERGRADUATE STUDIES'],
      ['TOTAL REGISTERED UNDERGRADUATE STUDENTS BY STUDY YEAR REPORT'],
      ['Generated At', new Date().toLocaleString()],
      ['Generated By', this.currentUser?.fullName || 'Director of Undergraduate Studies'],
      ['Total Registered Students', String(this.totalRegisteredStudents)],
      [],
      ['Academic Year', 'Total Registered Students', 'Enrollment Share (%)', 'Clearance Requests Submitted', 'Cleared Requests'],
      ...this.registeredStudentsByYear.map(y => [
        y.label,
        String(y.totalRegistered),
        `${y.percentage}%`,
        String(y.clearanceRequests),
        String(y.clearedRequests)
      ]),
      [
        'TOTAL',
        String(this.totalRegisteredStudents),
        '100%',
        String(this.totalRequestsCount),
        String(this.clearedCount)
      ]
    ];
    this.triggerCsvDownload(rows, `udsm-registered-students-by-year-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  downloadCollegesExcel(): void {
    const rows: string[][] = [
      ['UNIVERSITY OF DAR ES SALAAM (UDSM) - DIRECTORATE OF UNDERGRADUATE STUDIES'],
      ['CLEARANCE STATISTICS BY COLLEGE / SCHOOL REPORT'],
      ['Generated At', new Date().toLocaleString()],
      ['Generated By', this.currentUser?.fullName || 'Director of Undergraduate Studies'],
      [],
      ['College / School Name', 'Cleared Requests', 'Pending Requests', 'Rejected Requests', 'Total Requests', 'Clearance Rate (%)'],
      ...this.collegeBreakdown.map(c => [
        c.label,
        String(c.cleared),
        String(c.pending),
        String(c.rejected),
        String(c.total),
        `${c.rate}%`
      ]),
      [
        'TOTAL',
        String(this.clearedCount),
        String(this.pendingCount),
        String(this.rejectedCount),
        String(this.totalRequestsCount),
        `${this.overallClearanceRate}%`
      ]
    ];
    this.triggerCsvDownload(rows, `udsm-college-clearance-stats-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  downloadYearHistogramExcel(): void {
    const rows: string[][] = [
      ['UNIVERSITY OF DAR ES SALAAM (UDSM) - DIRECTORATE OF UNDERGRADUATE STUDIES'],
      ['ACADEMIC YEAR CLEARANCE VOLUME & STATUS DISTRIBUTION (HISTOGRAM DATA)'],
      ['Generated At', new Date().toLocaleString()],
      ['Generated By', this.currentUser?.fullName || 'Director of Undergraduate Studies'],
      [],
      ['Academic Year', 'Cleared (Completed)', 'Pending (In Progress)', 'Rejected', 'Total Clearance Requests', 'Clearance Rate (%)'],
      ...this.yearHistogramData.map(y => [
        y.yearLabel,
        String(y.cleared),
        String(y.pending),
        String(y.rejected),
        String(y.total),
        `${y.clearanceRate}%`
      ]),
      [
        'TOTAL',
        String(this.clearedCount),
        String(this.pendingCount),
        String(this.rejectedCount),
        String(this.totalRequestsCount),
        `${this.overallClearanceRate}%`
      ]
    ];
    this.triggerCsvDownload(rows, `udsm-year-clearance-histogram-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  downloadYearPieExcel(): void {
    const rows: string[][] = [
      ['UNIVERSITY OF DAR ES SALAAM (UDSM) - DIRECTORATE OF UNDERGRADUATE STUDIES'],
      ['CLEARANCE SHARE & COHORT PROPORTION BY ACADEMIC YEAR (PIE CHART DATA)'],
      ['Generated At', new Date().toLocaleString()],
      ['Generated By', this.currentUser?.fullName || 'Director of Undergraduate Studies'],
      [],
      ['Academic Year', 'Total Students', 'Share Proportion (%)', 'Cleared', 'Pending', 'Rejected'],
      ...this.yearPieSlices.map(s => [
        s.yearLabel,
        String(s.total),
        `${s.percentage}%`,
        String(s.cleared),
        String(s.pending),
        String(s.rejected)
      ]),
      [
        'TOTAL',
        String(this.totalRequestsCount),
        '100%',
        String(this.clearedCount),
        String(this.pendingCount),
        String(this.rejectedCount)
      ]
    ];
    this.triggerCsvDownload(rows, `udsm-year-clearance-share-pie-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  downloadProgrammesExcel(): void {
    const rows: string[][] = [
      ['UNIVERSITY OF DAR ES SALAAM (UDSM) - DIRECTORATE OF UNDERGRADUATE STUDIES'],
      ['UNDERGRADUATE PROGRAMMES CLEARANCE STATISTICS REPORT'],
      ['Generated At', new Date().toLocaleString()],
      ['Generated By', this.currentUser?.fullName || 'Director of Undergraduate Studies'],
      [],
      ['Programme Name', 'Cleared', 'Pending', 'Rejected', 'Total Requests', 'Clearance Rate (%)'],
      ...this.programmeBreakdown.map(p => [
        p.label,
        String(p.cleared),
        String(p.pending),
        String(p.rejected),
        String(p.total),
        `${p.rate}%`
      ]),
      [
        'TOTAL',
        String(this.clearedCount),
        String(this.pendingCount),
        String(this.rejectedCount),
        String(this.totalRequestsCount),
        `${this.overallClearanceRate}%`
      ]
    ];
    this.triggerCsvDownload(rows, `udsm-programmes-clearance-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  downloadOverallStatusExcel(): void {
    const rows: string[][] = [
      ['UNIVERSITY OF DAR ES SALAAM (UDSM) - DIRECTORATE OF UNDERGRADUATE STUDIES'],
      ['OVERALL INSTITUTIONAL CLEARANCE SYSTEM STATUS REPORT'],
      ['Generated At', new Date().toLocaleString()],
      ['Generated By', this.currentUser?.fullName || 'Director of Undergraduate Studies'],
      [],
      ['Clearance Status', 'Student Count', 'Percentage (%)'],
      ['Cleared (Completed)', String(this.clearedCount), `${this.overallClearanceRate}%`],
      ['Pending (In Progress)', String(this.pendingCount), `${this.pendingRate}%`],
      ['Rejected (Action Needed)', String(this.rejectedCount), `${this.rejectedRate}%`],
      ['TOTAL REQUESTS', String(this.totalRequestsCount), '100%']
    ];
    this.triggerCsvDownload(rows, `udsm-overall-clearance-status-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  printExecutiveReport(): void {
    window.print();
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
    link.click();
    URL.revokeObjectURL(url);
  }
}
