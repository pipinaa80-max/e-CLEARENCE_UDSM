// student-dashboard.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationItem } from '../../core/models/notification.model';
import { ClearanceOffice } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { TranscriptPaymentService } from '../../core/services/transcript-payment.service';
import { TranscriptPaymentRequest } from '../../transcript/transcript-payment.model';
import { environment } from '../../environments/environment';

type StudentSystemType = 'clearance' | 'transcript';

interface ProcessStep {
  number: number;
  label: string;
  office: ClearanceOffice | 'Parallel Offices' | 'Clearance Offices';
  detail: string;
  status: string;
}

interface TranscriptDashboardStep {
  number: number;
  label: string;
  detail: string;
  status: 'Approved' | 'Pending' | 'Locked' | 'Waiting for Approval' | 'Rejected';
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, DashboardHeaderComponent],
  templateUrl: './student.html',
  styleUrl: './student.css'
})
export class StudentDashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly transcriptService = inject(TranscriptPaymentService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  profilePhoto: string | null = null;
  photoLoadFailed = false;
  isLoading = true;
  systemType: StudentSystemType = environment.systemType;

  ngOnInit(): void {
    this.loadProfilePhoto();
  }

  refreshInformation(): void {
    this.loadProfilePhoto();
    this.authService.getProfile().subscribe({
      next: () => {
        this.loadProfilePhoto();
      },
      error: (err) => {
        console.error('Dashboard - Failed to refresh profile:', err);
        this.loadProfilePhoto();
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  // =====================================================
  // LOAD PROFILE PHOTO
  // =====================================================

  loadProfilePhoto(): void {
    this.isLoading = true;
    this.photoLoadFailed = false;
    const user = this.currentUser;

    if (!user) {
      this.isLoading = false;
      return;
    }

    const savedPhoto = this.authService.getProfilePhotoSource(user);
    if (savedPhoto) {
      this.profilePhoto = savedPhoto;
      this.isLoading = false;
      return;
    }

    const requests = this.clearanceService.getStudentRequests(user.id);
    for (const request of [...requests].reverse()) {
      const requestPhoto = this.authService.getProfilePhotoSource({ photo: request.photo });
      if (requestPhoto) {
        this.profilePhoto = requestPhoto;
        user.photo = requestPhoto;
        this.authService.updateCurrentUser(user);
        this.isLoading = false;
        return;
      }
    }

    this.profilePhoto = null;
    this.isLoading = false;
  }

  // =====================================================
  // GET PHOTO SOURCE
  // =====================================================

  getPhotoSource(): string | null {
    const userPhoto = this.authService.getProfilePhotoSource(this.currentUser);
    if (userPhoto) return userPhoto;
    if (this.profilePhoto) return this.profilePhoto;

    const request = this.currentRequest;
    return this.authService.getProfilePhotoSource({ photo: request?.photo });
  }

  hasPhoto(): boolean {
    return !this.photoLoadFailed && !!this.getPhotoSource();
  }

  // =====================================================
  // GET OFFICES
  // =====================================================

  get offices() {
    const request = this.currentRequest;

    if (!request) {
      return [];
    }

    return request.approvals.map((approval) => {
      let note = 'Awaiting review';

      switch (approval.office) {
        case 'Convocation':
          note = 'Convocation clearance';
          break;
        case 'Library':
          note = 'Library clearance';
          break;
        case 'Hall Warden':
          note = 'Hall clearance';
          break;
        case 'Games Coach':
          note = 'Sports clearance';
          break;
        case 'USAB':
          note = 'USAB clearance';
          break;
        case 'DARUSO':
          note = 'DARUSO clearance';
          break;
        case 'Dean of Students':
          note = 'Dean of Students clearance';
          break;
        case 'Smart Card':
          note = 'Smart Card clearance';
          break;
        case 'Workshop':
          note = 'Workshop clearance';
          break;
        case 'Laboratory':
          note = 'Laboratory clearance';
          break;
        case 'Department':
          note = 'Department approval';
          break;
        case 'Principal':
          note = 'Principal approval';
          break;
        case 'Finance':
          note = 'Final financial clearance';
          break;
      }

      return {
        name: approval.office,
        note,
        status: approval.status
      };
    });
  }

  // =====================================================
  // PROGRESS PERCENT
  // =====================================================

  get progressPercent(): number {
    const request = this.currentRequest;

    if (!request) {
      return 0;
    }

    const approvals = request.approvals || [];

    if (!approvals.length) {
      return 0;
    }

    const approved = approvals.filter(
        approval => approval.status === 'Approved'
    ).length;

    return Math.round((approved / approvals.length) * 100);
  }

  // =====================================================
  // CURRENT USER
  // =====================================================

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get studentAward(): string {
    return this.currentUser?.award || 'Bachelor Degree';
  }

  get awardType(): 'degree' | 'diploma' | 'certificate' | 'postgraduate' | 'masters' | 'phd' {
    const award = this.studentAward.toLowerCase();
    if (award.includes('phd') || award.includes('doctor')) return 'phd';
    if (award.includes('master')) return 'masters';
    if (award.includes('postgraduate')) return 'postgraduate';
    if (award.includes('diploma')) return 'diploma';
    if (award.includes('certificate')) return 'certificate';
    return 'degree';
  }

  get dashboardEyebrow(): string {
    switch (this.awardType) {
      case 'diploma': return 'Diploma Student Dashboard';
      case 'certificate': return 'Certificate Student Dashboard';
      case 'postgraduate': return 'Postgraduate Diploma Student Dashboard';
      case 'masters': return 'Master Degree Student Dashboard';
      case 'phd': return 'PhD Doctoral Student Dashboard';
      default: return 'Degree Student Dashboard';
    }
  }

  get dashboardSubtitle(): string {
    const process = this.isTranscriptSystem ? 'transcript request and payment process' : 'clearance process';
    return `Manage your ${this.studentAward} student information and ${process}.`;
  }

  get isTranscriptSystem(): boolean {
    return this.systemType === 'transcript';
  }

  get programme(): string | undefined {
    const p = this.currentUser?.programme;
    if (p && p !== 'Not selected' && p !== 'Not available' && p.trim().length > 0) return p;
    return this.currentRequest?.programme;
  }

  get college(): string | undefined {
    const c = this.currentUser?.college;
    if (c && c !== 'Not selected' && c !== 'Not available' && c.trim().length > 0) return c;
    return this.currentRequest?.college;
  }

  // =====================================================
  // CLEARANCE STATUS
  // =====================================================

  get clearanceStatus(): string {
    if (!this.currentUser) {
      return 'Not Requested';
    }

    return this.clearanceService.getClearanceStatus(this.currentUser.id);
  }

  get isClearanceCompleted(): boolean {
    const request = this.currentRequest;
    return !!request && (
      request.status === 'Completed' ||
      request.currentStage === 'Completed' ||
      this.getOfficeStatus('Finance') === 'Approved'
    );
  }

  get hasStartedTranscriptProcess(): boolean {
    const user = this.currentUser;
    return !!user && typeof localStorage !== 'undefined' &&
      localStorage.getItem(`udsm-transcript-process-started-${user.id}`) === 'true';
  }

  get isTranscriptProcessCompleted(): boolean {
    const user = this.currentUser;
    if (!user || typeof localStorage === 'undefined') return false;

    const firstRequest = this.transcriptService.getStudentRequests(user.id)
      .find(request => request.attemptNumber === 1);
    return localStorage.getItem(`udsm-transcript-acquired-${user.id}`) === 'true' ||
      !!firstRequest?.collectionMethod;
  }

  startTranscriptProcess(): void {
    const user = this.currentUser;
    if (!user || typeof localStorage === 'undefined') return;
    localStorage.setItem(`udsm-transcript-process-started-${user.id}`, 'true');
  }

  // =====================================================
  // CURRENT REQUEST
  // =====================================================

  get currentRequest() {
    const user = this.currentUser;
    if (!user) return null;

    const requests = this.clearanceService.getStudentRequests(user.id);
    return requests.length > 0 ? requests[requests.length - 1] : null;
  }

  // =====================================================
  // SEVEN CLEARANCE OFFICES & PROCESS STEPS
  // =====================================================

  get officeList(): ClearanceOffice[] {
    return this.clearanceService.getClearanceOffices(this.currentRequest?.college ?? '');
  }

  getApproval(office: ClearanceOffice) {
    return this.currentRequest?.approvals.find(approval => approval.office === office) ?? null;
  }

  getOfficeStatus(office: ClearanceOffice): string {
    return this.getApproval(office)?.status ?? 'Pending';
  }

  getRejectionReason(office: ClearanceOffice): string {
    const approval = this.getApproval(office);
    if (!approval || approval.status !== 'Rejected') {
      return '';
    }
    return approval.comment ?? '';
  }

  getReviewerContact(office: ClearanceOffice): { name: string; email: string; phone: string } {
    const approval = this.getApproval(office);
    const name = approval?.reviewedBy || '';
    let email = approval?.reviewerEmail || '';
    let phone = approval?.reviewerPhone || '';

    if (!email || !phone) {
      try {
        const usersJson = typeof localStorage !== 'undefined' ? localStorage.getItem('udsm-local-users') : null;
        if (usersJson) {
          const users = JSON.parse(usersJson);
          const nameClean = name.trim().toLowerCase();
          const officeClean = office.trim().toLowerCase();
          const found = users.find((u: any) => {
            const uName = (u.fullName || `${u.firstName || ''} ${u.lastName || ''}`).trim().toLowerCase();
            const uRole = (u.role || '').trim().toLowerCase();
            const uDept = (u.department || '').trim().toLowerCase();
            return (nameClean && uName === nameClean) ||
                   (uRole && (uRole === officeClean || uRole.includes(officeClean) || officeClean.includes(uRole))) ||
                   (uDept && (uDept === officeClean || uDept.includes(officeClean)));
          });
          if (found) {
            email = email || found.email || '';
            phone = phone || found.phoneNumber || found.phone || '';
          }
        }
      } catch (e) {
        console.error('Error looking up staff contact:', e);
      }
    }

    if (!email || !phone) {
      const defaultContacts: Record<string, { email: string; phone: string }> = {
        'Library': { email: 'library@udsm.ac.tz', phone: '+255 22 2410500' },
        'DARUSO': { email: 'daruso@udsm.ac.tz', phone: '+255 22 2410515' },
        'USAB': { email: 'usab@udsm.ac.tz', phone: '+255 22 2410520' },
        'Games Coach': { email: 'sports@udsm.ac.tz', phone: '+255 22 2410530' },
        'Hall Warden': { email: 'warden@udsm.ac.tz', phone: '+255 22 2410540' },
        'Dean of Students': { email: 'dos@udsm.ac.tz', phone: '+255 22 2410510' },
        'Department': { email: 'department@udsm.ac.tz', phone: '+255 22 2410550' },
        'Principal': { email: 'principal@udsm.ac.tz', phone: '+255 22 2410560' },
        'Finance': { email: 'finance@udsm.ac.tz', phone: '+255 22 2410570' },
        'Smart Card': { email: 'smartcard@udsm.ac.tz', phone: '+255 22 2410580' },
        'Workshop': { email: 'workshop@udsm.ac.tz', phone: '+255 22 2410590' },
        'Laboratory': { email: 'lab@udsm.ac.tz', phone: '+255 22 2410595' },
        'Convocation': { email: 'convocation@udsm.ac.tz', phone: '+255 22 2410505' },
      };
      const def = defaultContacts[office] || { email: 'clearance@udsm.ac.tz', phone: '+255 22 2410500' };
      email = email || def.email;
      phone = phone || def.phone;
    }

    return { name, email, phone };
  }

  getReviewedBy(office: ClearanceOffice): string {
    return this.getApproval(office)?.reviewedBy ?? '';
  }

  get isConvocationApproved(): boolean {
    const request = this.currentRequest;
    if (!request) return false;
    const convocationApproval = request.approvals.find(
      approval => approval.office === 'Convocation'
    );
    return convocationApproval?.status === 'Approved';
  }

  get allClearanceOfficesApproved(): boolean {
    const request = this.currentRequest;
    if (!request) return false;
    return this.officeList.every(office => {
      const status = this.getOfficeStatus(office);
      return status === 'Approved';
    });
  }

  get currentStageLabel(): string {
    const request = this.currentRequest;
    if (!request) return 'No clearance request';
    if (
      request.status === 'Completed' ||
      request.currentStage === 'Completed' ||
      this.getOfficeStatus('Finance') === 'Approved'
    ) {
      if (request.status !== 'Completed' || request.currentStage !== 'Completed') {
        request.status = 'Completed';
        request.currentStage = 'Completed';
        this.clearanceService.save(request);
      }
      return 'Clearance completed';
    }
    if (request.status === 'Rejected') {
      const rejectedOffice = this.officeList.find(
        office => this.getOfficeStatus(office) === 'Rejected'
      );
      if (rejectedOffice) return `${rejectedOffice} — Action Required`;
      const rejectedStage = request.approvals.find(
        approval => approval.status === 'Rejected'
      );
      if (rejectedStage) return `${rejectedStage.office} — Action Required`;
      return 'Clearance requires action';
    }
    switch (request.currentStage) {
      case 'Convocation': return 'Convocation';
      case 'Parallel': return 'Parallel Offices';
      case 'Department': return 'Department';
      case 'Principal': return 'Principal';
      case 'Finance': return 'Finance';
      default: return 'Clearance completed';
    }
  }

  get processSteps(): ProcessStep[] {
    const request = this.currentRequest;
    if (!request) return [];

    const steps: ProcessStep[] = [];

    // STEP 1 — CONVOCATION
    let convocationStatus = this.getApproval('Convocation')?.status ?? 'Pending';
    if (
      request.currentStage === 'Parallel' ||
      request.currentStage === 'Department' ||
      request.currentStage === 'Principal' ||
      request.currentStage === 'Finance' ||
      request.status === 'Completed'
    ) {
      convocationStatus = 'Approved';
    }
    steps.push({
      number: 1,
      label: 'Convocation',
      office: 'Convocation',
      detail: 'Submit your payment receipt for Convocation verification.',
      status: convocationStatus
    });

    // STEP 2 — SEVEN CLEARANCE OFFICES
    let officesStatus = this.allClearanceOfficesApproved ? 'Approved' : 'Pending';
    if (
      request.currentStage === 'Department' ||
      request.currentStage === 'Principal' ||
      request.currentStage === 'Finance' ||
      request.status === 'Completed'
    ) {
      officesStatus = 'Approved';
    }
    steps.push({
      number: 2,
      label: 'Parallel Offices',
      office: 'Parallel Offices',
      detail: (this.officeList.join(', ') || 'Games Coach, Hall Warden, USAB, DARUSO, Library, Dean of Students, Smart Card') + '.',
      status: officesStatus
    });

    // STEP 3 — DEPARTMENT
    let departmentStatus = this.getApproval('Department')?.status ?? 'Pending';
    if (
      request.currentStage === 'Principal' ||
      request.currentStage === 'Finance' ||
      request.status === 'Completed'
    ) {
      departmentStatus = 'Approved';
    }
    steps.push({
      number: 3,
      label: 'Department',
      office: 'Department',
      detail: 'Department clearance approval.',
      status: departmentStatus
    });

    // STEP 4 — PRINCIPAL
    let principalStatus = this.getApproval('Principal')?.status ?? 'Pending';
    if (
      request.currentStage === 'Finance' ||
      request.status === 'Completed'
    ) {
      principalStatus = 'Approved';
    }
    steps.push({
      number: 4,
      label: 'Principal',
      office: 'Principal',
      detail: 'Principal clearance approval.',
      status: principalStatus
    });

    // STEP 5 — FINANCE
    let financeStatus = this.getApproval('Finance')?.status ?? 'Pending';
    if (request.status === 'Completed') {
      financeStatus = 'Approved';
    }
    steps.push({
      number: 5,
      label: 'Finance',
      office: 'Finance',
      detail: 'Final financial clearance approval.',
      status: financeStatus
    });

    return steps;
  }

  getOfficeDetail(office: ClearanceOffice): string {
    const approval = this.getApproval(office);
    if (!approval) return 'Waiting for staff review';
    if (approval.status === 'Approved') return 'Approved by responsible staff';
    if (approval.status === 'Rejected') return 'Rejected — view the reason below';
    return 'Waiting for staff review';
  }

  // =====================================================
  // UNREAD NOTIFICATIONS
  // =====================================================

  get unreadNotifications(): number {
    const user = this.currentUser;
    if (!user) return 0;

    return this.notificationService
        .getNotifications(user.id)
        .filter((item) => !item.read).length;
  }

  // =====================================================
  // LATEST NOTIFICATIONS
  // =====================================================

  get latestNotifications(): NotificationItem[] {
    const user = this.currentUser;
    if (!user) return [];

    return this.notificationService
      .getNotifications(user.id)
      .filter(n => !n.read)
      .slice(0, 2); // Show only top 2 unread notifications
  }

  markAsRead(id: string): void {
    this.notificationService.markAsRead(id);
  }

  // =====================================================
  // COMPLETED OFFICES
  // =====================================================

  get completedOffices(): number {
    return this.offices.filter((office) => office.status === 'Approved').length;
  }

  // =====================================================
  // PENDING OFFICES
  // =====================================================

  get pendingOffices(): number {
    return this.offices.filter((office) => office.status === 'Pending').length;
  }

  // =====================================================
  // REJECTED OFFICES
  // =====================================================

  get rejectedOffices(): number {
    return this.offices.filter((office) => office.status === 'Rejected').length;
  }

  // =====================================================
  // TRANSCRIPT LOGIC
  // =====================================================

  get currentTranscriptRequest(): TranscriptPaymentRequest | null {
    const user = this.currentUser;
    if (!user) return null;
    const requests = this.transcriptService.getStudentRequests(user.id);
    return requests.length > 0 ? requests[requests.length - 1] : null;
  }

  get clearanceTranscriptRequest(): TranscriptPaymentRequest | null {
    const user = this.currentUser;
    if (!user) return null;
    return this.transcriptService.getStudentRequests(user.id)
      .find(request => request.attemptNumber === 1) ?? null;
  }

  get transcriptProcessStageLabel(): string {
    const request = this.clearanceTranscriptRequest;
    const user = this.currentUser;
    const isAcquired = !!user && localStorage.getItem(`udsm-transcript-acquired-${user.id}`) === 'true';
    const documentsSubmitted = !!user &&
      localStorage.getItem(`udsm-transcript-documents-submitted-${user.id}`) === 'true';

    if (isAcquired || request?.collectionMethod) return 'Transcript process completed';
    if (documentsSubmitted) return 'Step 3: Transcript Collection';
    if (request?.status === 'Paid') return 'Step 2: Upload Documentation';
    if (request?.status === 'Receipt Submitted') return 'Step 1: Waiting for Payment Approval';
    return 'Step 1: Transcript Payment';
  }

  get transcriptProcessSteps(): TranscriptDashboardStep[] {
    const request = this.clearanceTranscriptRequest;
    const user = this.currentUser;
    const documentsSubmitted = !!user &&
      localStorage.getItem(`udsm-transcript-documents-submitted-${user.id}`) === 'true';
    const isAcquired = !!user && localStorage.getItem(`udsm-transcript-acquired-${user.id}`) === 'true';
    const paymentStatus = request?.status;
    const paymentStepStatus: TranscriptDashboardStep['status'] =
      paymentStatus === 'Paid' ? 'Approved'
        : paymentStatus === 'Receipt Submitted' ? 'Waiting for Approval'
          : paymentStatus === 'Receipt Rejected' ? 'Rejected' : 'Pending';

    return [
      {
        number: 1,
        label: 'Transcript Payment',
        detail: request?.controlNumber
          ? 'Pay the transcript fee using your issued control number.'
          : 'Start your transcript request and obtain a payment control number.',
        status: paymentStepStatus
      },
      {
        number: 2,
        label: 'Upload Documentation',
        detail: 'Upload and submit the required transcript documents.',
        status: documentsSubmitted ? 'Approved' : paymentStatus === 'Paid' ? 'Pending' : 'Locked'
      },
      {
        number: 3,
        label: 'Transcript Collection',
        detail: 'Choose physical collection or delivery by DHL.',
        status: request?.collectionMethod || isAcquired
          ? 'Approved'
          : documentsSubmitted ? 'Pending' : 'Locked'
      }
    ];
  }

  get transcriptStatus(): string {
    const req = this.currentTranscriptRequest;
    return req ? req.status : 'Not Started';
  }

  get isTranscriptPaid(): boolean {
    const user = this.currentUser;
    if (!user) return false;
    const requests = this.transcriptService.getStudentRequests(user.id);
    return requests.some(r => r.attemptNumber === 1 && r.status === 'Paid');
  }

  get transcriptProgressSteps(): number {
    const req = this.currentTranscriptRequest;
    if (!req) return 0;

    // Steps: 1. Requested, 2. Control Number Issued, 3. Receipt Submitted, 4. Paid
    if (req.status === 'Paid') return 4;
    if (req.status === 'Receipt Submitted') return 3;
    if (req.status === 'Awaiting Payment') return 2;
    return 1;
  }

  get transcriptProgressPercent(): number {
    return (this.transcriptProgressSteps / 4) * 100;
  }

  get transcriptSteps() {
    const req = this.currentTranscriptRequest;
    const steps = [
      { name: 'Application', note: 'Request submitted', status: 'Pending' },
      { name: 'Control Number', note: 'Finance issues code', status: 'Pending' },
      { name: 'Payment', note: 'Upload your receipt', status: 'Pending' },
      { name: 'Verification', note: 'Final approval', status: 'Pending' }
    ];

    if (!req) return steps;

    // Map statuses
    steps[0].status = 'Approved'; // Always true if req exists

    if (req.controlNumber || req.status !== 'Pending Control Number') {
      steps[1].status = 'Approved';
    }

    if (req.receiptSubmittedAt || req.status === 'Receipt Submitted' || req.status === 'Paid') {
      steps[2].status = 'Approved';
    }

    if (req.status === 'Paid') {
      steps[3].status = 'Approved';
    }

    return steps;
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // =====================================================
  // REFRESH PHOTO
  // =====================================================

  refreshPhoto(): void {
    console.log('Dashboard - Refreshing all information...');
    this.profilePhoto = null;
    this.refreshInformation();
  }

  // =====================================================
  // HANDLE IMAGE ERROR
  // =====================================================

  onImageError(): void {
    this.profilePhoto = null;
    this.photoLoadFailed = true;
  }
}
