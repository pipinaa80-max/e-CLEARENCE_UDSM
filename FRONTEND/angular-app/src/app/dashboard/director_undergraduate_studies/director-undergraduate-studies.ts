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
  totalRegisteredStudents = 0;

  // Filters
  searchTerm = '';
  selectedCollege = 'ALL';
  selectedStatus: 'ALL' | 'Completed' | 'Pending' | 'Rejected' = 'ALL';
  selectedYear = 'ALL';
  selectedOffice = 'ALL';

  selectedRequestForModal: ClearanceRequest | null = null;

  readonly allOfficesOrder: { office: ClearanceOffice; stageGroup: string }[] = [
    { office: 'Convocation', stageGroup: 'Stage 1 · Entry' },
    { office: 'Games Coach', stageGroup: 'Stage 2 · Parallel' },
    { office: 'Hall Warden', stageGroup: 'Stage 2 · Parallel' },
    { office: 'USAB', stageGroup: 'Stage 2 · Parallel' },
    { office: 'DARUSO', stageGroup: 'Stage 2 · Parallel' },
    { office: 'Library', stageGroup: 'Stage 2 · Parallel' },
    { office: 'Dean of Students', stageGroup: 'Stage 2 · Parallel' },
    { office: 'Smart Card', stageGroup: 'Stage 2 · Parallel' },
    { office: 'Workshop', stageGroup: 'Stage 2 · College Specific' },
    { office: 'Laboratory', stageGroup: 'Stage 2 · College Specific' },
    { office: 'Department', stageGroup: 'Stage 3 · Academic' },
    { office: 'Principal', stageGroup: 'Stage 4 · College Principal' },
    { office: 'Finance', stageGroup: 'Stage 5 · Final Bursar' }
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
      if (u?.id && u?.yearOfStudy) {
        this.studentYearMap.set(String(u.id), `Year ${u.yearOfStudy}`);
      }
      if (u?.registrationNumber && u?.yearOfStudy) {
        this.studentYearMap.set(String(u.registrationNumber), `Year ${u.yearOfStudy}`);
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

    if (raw?.yearOfStudy) {
      if (raw?.studentId) this.studentYearMap.set(String(raw.studentId), `Year ${raw.yearOfStudy}`);
      if (raw?.registrationNumber) this.studentYearMap.set(String(raw.registrationNumber), `Year ${raw.yearOfStudy}`);
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
    // Infer cohort year from registration number (e.g. 2022-04-12345 -> Cohort 2022) or requestDate
    const regMatch = String(req.registrationNumber || '').match(/^(20\d{2})[-/]/);
    if (regMatch) {
      const admissionYear = Number(regMatch[1]);
      const currentYear = new Date().getFullYear();
      const studyYear = Math.min(5, Math.max(1, currentYear - admissionYear));
      return `Year ${studyYear} (${admissionYear} Cohort)`;
    }
    const reqYear = new Date(req.requestDate).getFullYear();
    return Number.isNaN(reqYear) ? 'Academic Year 2026' : `Academic Year ${reqYear}`;
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

  get stagePipeline(): StagePipelineItem[] {
    const total = Math.max(1, this.totalRequestsCount);
    const convocationCount = this.allRequests.filter(r => r.status === 'Pending' && r.currentStage === 'Convocation').length;
    const parallelCount = this.allRequests.filter(r => r.status === 'Pending' && r.currentStage === 'Parallel').length;
    const deptCount = this.allRequests.filter(r => r.status === 'Pending' && r.currentStage === 'Department').length;
    const principalCount = this.allRequests.filter(r => r.status === 'Pending' && r.currentStage === 'Principal').length;
    const financeCount = this.allRequests.filter(r => r.status === 'Pending' && r.currentStage === 'Finance').length;
    const completedCount = this.clearedCount;

    return [
      {
        stage: 'Stage 1',
        title: 'Convocation Office',
        description: 'Control number issuance & convocation fee verification',
        count: convocationCount,
        percentage: Math.round((convocationCount / total) * 100),
        tone: 'blue'
      },
      {
        stage: 'Stage 2',
        title: 'Parallel Clearance Offices',
        description: 'Library, Hall Warden, USAB, DARUSO, Games Coach, Dean, Smart Card',
        count: parallelCount,
        percentage: Math.round((parallelCount / total) * 100),
        tone: 'teal'
      },
      {
        stage: 'Stage 3',
        title: 'Academic Department',
        description: 'Departmental property & Lecturer debt register verification',
        count: deptCount,
        percentage: Math.round((deptCount / total) * 100),
        tone: 'amber'
      },
      {
        stage: 'Stage 4',
        title: 'College Principal & Finance',
        description: 'College Principal endorsement & final Bursar financial clearance',
        count: principalCount + financeCount,
        percentage: Math.round(((principalCount + financeCount) / total) * 100),
        tone: 'indigo'
      },
      {
        stage: 'Stage 5',
        title: 'Fully Cleared & Certified',
        description: 'All offices approved; clearance certificate & transcript unlocked',
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
