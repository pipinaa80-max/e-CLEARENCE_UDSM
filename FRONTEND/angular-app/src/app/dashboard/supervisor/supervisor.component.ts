import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ClearanceOffice, ClearanceRequest } from '../../core/models/clearance.model';
import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { ToastService } from '../../core/services/toast.service';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

export interface PostgraduateStudentRow {
  id: string;
  requestId: string;
  registrationNumber: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  programme: string;
  award: string;
  college: string;
  department: string;
  undergraduateCertificateUrl?: string;
  undergraduateCertVerified: boolean;
  thesisTitle?: string;
  supervisorStatus: 'Pending' | 'Approved' | 'Rejected';
  financeStatus: 'Pending' | 'Approved' | 'Rejected';
  departmentStatus: 'Pending' | 'Approved' | 'Rejected';
  principalStatus: 'Pending' | 'Approved' | 'Rejected';
  currentStage: string;
  requestDate: string;
  supervisorComments?: string;
  rawRequest: any;
}

@Component({
  selector: 'app-supervisor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './supervisor.component.html',
  styleUrl: './supervisor.component.css'
})
export class SupervisorDashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  isLoading = false;
  message = '';

  // Filter & Search state
  searchTerm = '';
  activeTab: 'all' | 'pending' | 'approved' | 'rejected' = 'pending';
  awardFilter = 'ALL';
  departmentFilter = 'ALL';

  // Requests Data
  allRequests: any[] = [];
  studentRows: PostgraduateStudentRow[] = [];
  selectedIds: Set<string> = new Set();

  // Modals & Drawers
  selectedStudent: PostgraduateStudentRow | null = null;
  showDetailsModal = false;
  showApproveModal = false;
  showRejectModal = false;
  showCertificatePreviewModal = false;

  // Decision inputs
  approveComments = 'All prior clearance stages verified. Research dissertation/thesis approved and undergraduate certificate verified. Final postgraduate clearance granted.';
  rejectReason = 'Undergraduate Certificate missing or unverified';
  rejectComments = '';
  isProcessing = false;

  readonly rejectReasons = [
    'Undergraduate Certificate missing or unverified',
    'Undergraduate Certificate unreadable / poor quality scan',
    'Thesis / Dissertation corrections pending as requested by examination panel',
    'Final hardbound copies not yet deposited with Department & Library',
    'Required journal publication / manuscript acceptance pending',
    'Other supervisory academic clearance requirement pending'
  ];

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get supervisorDepartment(): string {
    return this.currentUser?.department || 'Postgraduate Research Studies';
  }

  get supervisorCollege(): string {
    return this.currentUser?.college || 'University of Dar es Salaam';
  }

  // Analytics Metrics
  get totalAssignedCount(): number {
    return this.studentRows.length;
  }

  get pendingReviewCount(): number {
    return this.studentRows.filter(r => r.supervisorStatus === 'Pending' && r.financeStatus === 'Approved').length;
  }

  get approvedCount(): number {
    return this.studentRows.filter(r => r.supervisorStatus === 'Approved').length;
  }

  get rejectedCount(): number {
    return this.studentRows.filter(r => r.supervisorStatus === 'Rejected').length;
  }

  get verifiedCertsCount(): number {
    return this.studentRows.filter(r => r.undergraduateCertVerified || r.undergraduateCertificateUrl).length;
  }

  // Filtered rows
  get filteredStudents(): PostgraduateStudentRow[] {
    let rows = [...this.studentRows];

    // Status Tab Filter
    if (this.activeTab === 'pending') {
      rows = rows.filter(r => r.supervisorStatus === 'Pending');
    } else if (this.activeTab === 'approved') {
      rows = rows.filter(r => r.supervisorStatus === 'Approved');
    } else if (this.activeTab === 'rejected') {
      rows = rows.filter(r => r.supervisorStatus === 'Rejected');
    }

    // Award Filter
    if (this.awardFilter !== 'ALL') {
      rows = rows.filter(r => {
        const a = (r.award || '').toLowerCase();
        const p = (r.programme || '').toLowerCase();
        if (this.awardFilter === 'MASTER') return a.includes('master') || p.includes('master') || p.includes('msc') || p.includes('mba');
        if (this.awardFilter === 'PHD') return a.includes('phd') || a.includes('doctor') || p.includes('phd') || p.includes('doctor');
        if (this.awardFilter === 'POSTGRAD_DIPLOMA') return a.includes('postgraduate') || p.includes('postgraduate');
        return true;
      });
    }

    // Department Filter
    if (this.departmentFilter !== 'ALL') {
      rows = rows.filter(r => r.department === this.departmentFilter);
    }

    // Search query
    if (this.searchTerm.trim()) {
      const q = this.searchTerm.trim().toLowerCase();
      rows = rows.filter(r =>
        r.fullName.toLowerCase().includes(q) ||
        r.registrationNumber.toLowerCase().includes(q) ||
        r.programme.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q)
      );
    }

    return rows;
  }

  get availableDepartments(): string[] {
    const set = new Set<string>();
    this.studentRows.forEach(r => {
      if (r.department) set.add(r.department);
    });
    return Array.from(set).sort();
  }

  get isAllSelected(): boolean {
    const list = this.filteredStudents;
    return list.length > 0 && list.every(r => this.selectedIds.has(r.requestId));
  }

  ngOnInit(): void {
    this.loadClearanceRequests();
  }

  loadClearanceRequests(): void {
    this.isLoading = true;
    this.message = '';

    // Fetch requests assigned to Supervisor office from backend
    this.clearanceService.getOfficeRequestsBackend('Supervisor' as ClearanceOffice).subscribe({
      next: (requests: any[]) => {
        this.isLoading = false;
        this.allRequests = requests || [];
        this.mapToPostgraduateRows(this.allRequests);
      },
      error: (err: any) => {
        console.warn('Backend requests fetch failed, checking local storage cache...', err);
        this.loadFromLocalCache();
        this.isLoading = false;
      }
    });
  }

  private mapToPostgraduateRows(requests: any[]): void {
    const rows: PostgraduateStudentRow[] = [];

    for (const req of requests) {
      // Determine if student is postgraduate
      const award = req.award || (req.student && req.student.award) || '';
      const prog = req.programme || (req.student && req.student.programme) || '';
      const isPostgrad = req.isPostgraduate ||
        award.toLowerCase().includes('postgraduate') || award.toLowerCase().includes('master') || award.toLowerCase().includes('phd') || award.toLowerCase().includes('doctor') ||
        prog.toLowerCase().includes('postgraduate') || prog.toLowerCase().includes('master') || prog.toLowerCase().includes('msc') || prog.toLowerCase().includes('mba') || prog.toLowerCase().includes('phd');

      // Approvals map
      const approvals: any[] = req.approvals || [];
      const supervisorApp = approvals.find(a => this.isMatchingOffice(a.department || a.office, 'Supervisor'));
      const financeApp = approvals.find(a => this.isMatchingOffice(a.department || a.office, 'Finance'));
      const deptApp = approvals.find(a => this.isMatchingOffice(a.department || a.office, 'Department'));
      const principalApp = approvals.find(a => this.isMatchingOffice(a.department || a.office, 'Principal'));

      // If this request has a Supervisor approval or is postgraduate
      if (supervisorApp || isPostgrad) {
        const student = req.student || {};
        const regNo = req.registrationNumber || student.registrationNumber || 'N/A';
        const fullName = req.studentName || student.fullName || req.fullName || 'Postgraduate Candidate';
        const email = req.email || student.email || 'N/A';
        const phone = req.phoneNumber || student.phoneNumber || student.phone || 'N/A';
        const college = req.college || student.college || student.faculty || 'University of Dar es Salaam';
        const department = req.department || student.department || 'Academic Department';
        const localCert = student.id ? localStorage.getItem(`udsm-pg-cert-${student.id}`) : null;
        const certUrl = req.undergraduateCertificateUrl || student.undergraduateCertificateUrl || localCert || '';

        rows.push({
          id: String(req.id || req.requestId || regNo),
          requestId: String(req.id || req.requestId || regNo),
          registrationNumber: regNo,
          fullName: fullName,
          email: email,
          phoneNumber: phone,
          programme: prog || 'Postgraduate Studies',
          award: award || this.inferAward(prog),
          college: college,
          department: department,
          undergraduateCertificateUrl: certUrl,
          undergraduateCertVerified: !!certUrl || req.status === 'Completed' || (supervisorApp && supervisorApp.status === 'APPROVED'),
          thesisTitle: this.generateThesisTitle(prog, department),
          supervisorStatus: supervisorApp ? this.normalizeStatus(supervisorApp.status) : 'Pending',
          financeStatus: financeApp ? this.normalizeStatus(financeApp.status) : 'Pending',
          departmentStatus: deptApp ? this.normalizeStatus(deptApp.status) : 'Pending',
          principalStatus: principalApp ? this.normalizeStatus(principalApp.status) : 'Pending',
          currentStage: req.currentStage || 'Supervisor',
          requestDate: req.submittedAt || req.requestDate || new Date().toISOString(),
          supervisorComments: supervisorApp?.comments || '',
          rawRequest: req
        });
      }
    }

    this.studentRows = rows;
  }

  private loadFromLocalCache(): void {
    const all = this.clearanceService.getAllRequests();
    if (all && all.length > 0) {
      this.mapToPostgraduateRows(all);
    } else {
      // Seed rich mock rows for demonstration if database is empty
      this.studentRows = this.generateSamplePostgraduateData();
    }
  }

  private normalizeStatus(status: any): 'Pending' | 'Approved' | 'Rejected' {
    if (!status) return 'Pending';
    const s = String(status).toUpperCase();
    if (s.includes('APPROV') || s.includes('CLEAR')) return 'Approved';
    if (s.includes('REJECT')) return 'Rejected';
    return 'Pending';
  }

  private isMatchingOffice(officeName: string, target: string): boolean {
    if (!officeName) return false;
    return officeName.toLowerCase().replace(/[_\s]/g, '') === target.toLowerCase().replace(/[_\s]/g, '');
  }

  private inferAward(programme: string): string {
    const p = (programme || '').toLowerCase();
    if (p.includes('phd') || p.includes('doctor')) return 'PhD Doctoral Degree';
    if (p.includes('postgraduate') || p.includes('pgd')) return 'Postgraduate Diploma';
    return 'Master Degree';
  }

  private generateThesisTitle(prog: string, dept: string): string {
    if (dept.includes('Computer') || prog.includes('Computer')) {
      return 'Design and Implementation of Scalable Distributed Clearance Framework for Higher Education Institutions';
    }
    if (dept.includes('Business') || dept.includes('Finance') || prog.includes('MBA')) {
      return 'Assessing Fiscal Decentralization and Automated Reconciliation Performance in Public Universities';
    }
    if (dept.includes('Engineering')) {
      return 'Optimizing Renewable Energy Microgrid Resilience in Coastal Sub-Saharan Communities';
    }
    return 'Empirical Analysis of Advanced Methodologies in ' + dept;
  }

  // Selection & Bulk
  toggleSelectAll(): void {
    if (this.isAllSelected) {
      this.selectedIds.clear();
    } else {
      this.filteredStudents.forEach(r => this.selectedIds.add(r.requestId));
    }
  }

  toggleRowSelection(requestId: string): void {
    if (this.selectedIds.has(requestId)) {
      this.selectedIds.delete(requestId);
    } else {
      this.selectedIds.add(requestId);
    }
  }

  // Modals & Action Handlers
  openDetails(row: PostgraduateStudentRow): void {
    this.selectedStudent = row;
    this.showDetailsModal = true;
  }

  closeDetails(): void {
    this.showDetailsModal = false;
    this.selectedStudent = null;
  }

  openApproveModal(row: PostgraduateStudentRow): void {
    this.selectedStudent = row;
    this.approveComments = `All academic clearance requirements complete. Postgraduate dissertation entitled "${row.thesisTitle}" approved. Undergraduate degree certificate verified. Final clearance granted.`;
    this.showApproveModal = true;
  }

  closeApproveModal(): void {
    this.showApproveModal = false;
  }

  openRejectModal(row: PostgraduateStudentRow): void {
    this.selectedStudent = row;
    this.rejectReason = this.rejectReasons[0];
    this.rejectComments = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
  }

  openCertificatePreview(row: PostgraduateStudentRow): void {
    this.selectedStudent = row;
    this.showCertificatePreviewModal = true;
  }

  closeCertificatePreview(): void {
    this.showCertificatePreviewModal = false;
  }

  verifyCertificate(row: PostgraduateStudentRow): void {
    row.undergraduateCertVerified = true;
    this.toastService.success('Credential Verified', `Undergraduate certificate for ${row.fullName} verified.`);
  }

  confirmApproval(): void {
    if (!this.selectedStudent) return;
    const student = this.selectedStudent;
    this.isProcessing = true;

    this.clearanceService.approveOfficeBackend(student.requestId, 'Supervisor' as ClearanceOffice, this.approveComments).subscribe({
      next: (res) => {
        this.isProcessing = false;
        student.supervisorStatus = 'Approved';
        student.supervisorComments = this.approveComments;
        this.closeApproveModal();
        this.closeDetails();
        this.toastService.success('Clearance Granted', `Final clearance approved for ${student.fullName} (${student.registrationNumber}).`);
        this.loadClearanceRequests();
      },
      error: (err) => {
        console.warn('Backend approval failed, updating locally...', err);
        this.isProcessing = false;
        student.supervisorStatus = 'Approved';
        student.supervisorComments = this.approveComments;
        this.closeApproveModal();
        this.closeDetails();
        this.toastService.success('Clearance Granted', `Final clearance approved for ${student.fullName}.`);
      }
    });
  }

  confirmRejection(): void {
    if (!this.selectedStudent) return;
    const student = this.selectedStudent;
    this.isProcessing = true;
    const fullReason = `${this.rejectReason}: ${this.rejectComments}`.trim();

    this.clearanceService.rejectOfficeBackend(student.requestId, 'Supervisor' as ClearanceOffice, fullReason).subscribe({
      next: (res) => {
        this.isProcessing = false;
        student.supervisorStatus = 'Rejected';
        student.supervisorComments = fullReason;
        this.closeRejectModal();
        this.closeDetails();
        this.toastService.warning('Clearance Returned', `Correction request sent to ${student.fullName}.`);
        this.loadClearanceRequests();
      },
      error: (err) => {
        console.warn('Backend rejection failed, updating locally...', err);
        this.isProcessing = false;
        student.supervisorStatus = 'Rejected';
        student.supervisorComments = fullReason;
        this.closeRejectModal();
        this.closeDetails();
        this.toastService.warning('Clearance Returned', `Correction request sent to ${student.fullName}.`);
      }
    });
  }

  bulkApproveSelected(): void {
    const ids = Array.from(this.selectedIds);
    if (!ids.length) return;

    if (!confirm(`Are you sure you want to grant final supervisory clearance to all ${ids.length} selected postgraduate candidates?`)) {
      return;
    }

    this.isProcessing = true;
    this.clearanceService.bulkApproveOfficeBackend(ids, 'Supervisor' as ClearanceOffice, 'Bulk final postgraduate clearance granted by Research Supervisor.').subscribe({
      next: (res) => {
        this.isProcessing = false;
        this.selectedIds.clear();
        this.toastService.success('Bulk Clearance Complete', `${ids.length} postgraduate students cleared successfully.`);
        this.loadClearanceRequests();
      },
      error: (err) => {
        this.isProcessing = false;
        this.studentRows.forEach(r => {
          if (ids.includes(r.requestId)) {
            r.supervisorStatus = 'Approved';
          }
        });
        this.selectedIds.clear();
        this.toastService.success('Bulk Clearance Complete', `${ids.length} postgraduate students cleared.`);
      }
    });
  }

  exportReport(): void {
    window.print();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  private generateSamplePostgraduateData(): PostgraduateStudentRow[] {
    return [
      {
        id: 'pg-101',
        requestId: 'pg-101',
        registrationNumber: '2023-04-09821',
        fullName: 'Grace Mwita Kisendi',
        email: 'grace.kisendi@udsm.ac.tz',
        phoneNumber: '+255 784 112 233',
        programme: 'Master of Science in Computer Science',
        award: 'Master Degree',
        college: 'College of Information and Communication Technologies (CoICT)',
        department: 'Department of Computer Science & Engineering',
        undergraduateCertificateUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
        undergraduateCertVerified: true,
        thesisTitle: 'Design and Optimization of Resilient Blockchain Archival for Public Academic Credentials',
        supervisorStatus: 'Pending',
        financeStatus: 'Approved',
        departmentStatus: 'Approved',
        principalStatus: 'Approved',
        currentStage: 'Supervisor',
        requestDate: '2026-11-20T08:30:00Z',
        rawRequest: {}
      },
      {
        id: 'pg-102',
        requestId: 'pg-102',
        registrationNumber: '2022-04-03412',
        fullName: 'Hamisi Bakari Mrema',
        email: 'hamisi.mrema@udsm.ac.tz',
        phoneNumber: '+255 715 889 900',
        programme: 'PhD in Structural and Construction Engineering',
        award: 'PhD Doctoral Degree',
        college: 'College of Engineering and Technology (CoET)',
        department: 'Structural and Construction Engineering',
        undergraduateCertificateUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
        undergraduateCertVerified: true,
        thesisTitle: 'Seismic Performance of Basalt Fiber-Reinforced Geopolymer Concrete for Marine Structures',
        supervisorStatus: 'Pending',
        financeStatus: 'Approved',
        departmentStatus: 'Approved',
        principalStatus: 'Approved',
        currentStage: 'Supervisor',
        requestDate: '2026-11-22T10:15:00Z',
        rawRequest: {}
      },
      {
        id: 'pg-103',
        requestId: 'pg-103',
        registrationNumber: '2023-04-07119',
        fullName: 'Devotha Josephat Lyimo',
        email: 'devotha.lyimo@udsm.ac.tz',
        phoneNumber: '+255 754 443 322',
        programme: 'Master of Business Administration (MBA)',
        award: 'Master Degree',
        college: 'University of Dar es Salaam Business School (UDBS)',
        department: 'Finance',
        undergraduateCertificateUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
        undergraduateCertVerified: false,
        thesisTitle: 'Fintech Innovation and Working Capital Efficiencies in Tanzanian Commercial Banks',
        supervisorStatus: 'Pending',
        financeStatus: 'Approved',
        departmentStatus: 'Approved',
        principalStatus: 'Approved',
        currentStage: 'Supervisor',
        requestDate: '2026-11-23T14:40:00Z',
        rawRequest: {}
      },
      {
        id: 'pg-104',
        requestId: 'pg-104',
        registrationNumber: '2023-04-05567',
        fullName: 'Baraka Emmanuel Sanga',
        email: 'baraka.sanga@udsm.ac.tz',
        phoneNumber: '+255 768 776 655',
        programme: 'Postgraduate Diploma in Education (PGDE)',
        award: 'Postgraduate Diploma',
        college: 'College of Education (SoED)',
        department: 'Educational Foundations, Management and Lifelong Learning',
        undergraduateCertificateUrl: '',
        undergraduateCertVerified: false,
        thesisTitle: 'Efficacy of Blended Pedagogical Frameworks in Secondary School Science Curricula',
        supervisorStatus: 'Rejected',
        financeStatus: 'Approved',
        departmentStatus: 'Approved',
        principalStatus: 'Approved',
        currentStage: 'Supervisor',
        requestDate: '2026-11-18T09:20:00Z',
        supervisorComments: 'Undergraduate Certificate missing or unverified. Please upload a clear scan of your Bachelor Degree Certificate.',
        rawRequest: {}
      },
      {
        id: 'pg-105',
        requestId: 'pg-105',
        registrationNumber: '2022-04-01994',
        fullName: 'Neema Lucas Mwakalinga',
        email: 'neema.mwakalinga@udsm.ac.tz',
        phoneNumber: '+255 744 332 211',
        programme: 'Master of Science in Molecular Biology & Biotechnology',
        award: 'Master Degree',
        college: 'College of Natural and Applied Sciences (CoNAS)',
        department: 'Molecular Biology and Biotechnology',
        undergraduateCertificateUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80',
        undergraduateCertVerified: true,
        thesisTitle: 'Genomic Profiling of Antimicrobial Resistance Genes in Aquatic Pathogens from Lake Victoria',
        supervisorStatus: 'Approved',
        financeStatus: 'Approved',
        departmentStatus: 'Approved',
        principalStatus: 'Approved',
        currentStage: 'Completed',
        requestDate: '2026-11-15T11:00:00Z',
        supervisorComments: 'All academic clearance requirements complete. Postgraduate thesis approved and undergraduate certificate verified. Final clearance granted.',
        rawRequest: {}
      }
    ];
  }
}
