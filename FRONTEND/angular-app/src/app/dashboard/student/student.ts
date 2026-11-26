// student-dashboard.component.ts
import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationItem } from '../../core/models/notification.model';
import { ClearanceOffice } from '../../core/models/clearance.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { TranscriptPaymentService } from '../../core/services/transcript-payment.service';
import { ToastService } from '../../core/services/toast.service';
import { StudentDebtService } from '../../core/services/student-debt.service';
import { StudentDebtFlag } from '../../core/models/student-debt.model';
import { TranscriptPaymentRequest } from '../../transcript/transcript-payment.model';
import { environment } from '../../environments/environment';
import { DocumentService } from '../../core/services/document.service';

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
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, DashboardHeaderComponent],
  templateUrl: './student.html',
  styleUrl: './student.css'
})
export class StudentDashboard implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly studentDebtService = inject(StudentDebtService);
  private readonly transcriptService = inject(TranscriptPaymentService);
  private readonly documentService = inject(DocumentService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private pollSubscription?: Subscription;

  sidebarOpen = false;
  profilePhoto: string | null = null;
  photoLoadFailed = false;
  isLoading = true;
  systemType: StudentSystemType = environment.systemType;
  userDropdownOpen = false;
  activeDebtFlag: StudentDebtFlag | null = null;

  // Control number resubmission after rejection
  showReceiptModal = false;
  receiptNote: string = '';
  isSubmittingReceipt = false;
  receiptSuccessMessage = '';
  receiptErrorMessage = '';

  openReceiptModal(): void {
    this.showReceiptModal = true;
    this.receiptErrorMessage = '';
  }

  closeReceiptModal(): void {
    this.showReceiptModal = false;
  }

  onReceiptFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      this.receiptErrorMessage = 'Receipt file must be an image (PNG, JPG) or PDF document.';
      input.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.receiptErrorMessage = 'Receipt file size must be less than 10MB.';
      input.value = '';
      return;
    }

    this.selectedReceiptFile = file;
    this.receiptFileName = file.name;
    const sizeKb = Math.round(file.size / 1024);
    this.receiptFileSizeText = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
    this.receiptErrorMessage = '';
    this.receiptSuccessMessage = '';

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        this.receiptPreviewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      this.receiptPreviewUrl = null;
    }
  }

  viewReceiptFile(): void {
    if (this.receiptPreviewUrl) {
      window.open(this.receiptPreviewUrl, '_blank');
    } else if (this.selectedReceiptFile) {
      const fileUrl = URL.createObjectURL(this.selectedReceiptFile);
      window.open(fileUrl, '_blank');
    }
  }

  removeReceiptFile(): void {
    this.selectedReceiptFile = null;
    this.receiptPreviewUrl = null;
    this.receiptFileName = '';
    this.receiptFileSizeText = '';
    this.receiptErrorMessage = '';
  }
  async submitRejectionReceipt(): Promise<void> {
    const controlNumber = this.receiptNote.trim();
    if (!/^[A-Za-z0-9-]{4,40}$/.test(controlNumber)) {
      this.receiptErrorMessage = 'Enter a valid payment control number (4 to 40 letters, numbers, or hyphens).';
      return;
    }

    if (!this.currentRequest) {
      this.receiptErrorMessage = 'No active clearance request found.';
      return;
    }

    this.isSubmittingReceipt = true;
    this.receiptErrorMessage = '';
    this.receiptSuccessMessage = '';

    try {
      const success = this.clearanceService.submitFinanceReceiptAfterRejection(
        this.currentRequest.id,
        '',
        `Payment_Control_Number_${controlNumber}.txt`,
        controlNumber
      );

      if (success) {
        this.receiptSuccessMessage = 'Payment control number submitted successfully! Your clearance request has returned to Finance for review.';
        this.receiptNote = '';
        this.showReceiptModal = false;
        this.notificationService.getStudentNotifications().subscribe();
      } else {
        this.receiptErrorMessage = 'Could not submit control number. Please try again.';
      }
    } catch (err: any) {
      this.receiptErrorMessage = err?.message || 'Unable to submit the control number.';
    } finally {
      this.isSubmittingReceipt = false;
    }
  }

  get hasReportedReceiptUnderReview(): boolean {
    const r = this.currentRequest;
    if (!r) return false;
    return r.status === 'Pending' && r.currentStage === 'Finance' && !!(r.resubmittedWithReceipt || r.financeReceipt);
  }

  get rejectedOfficeName(): string {
    const r = this.currentRequest;
    if (!r) return '';
    if (r.revisionOffice) return r.revisionOffice;
    const rej = r.approvals?.find(a => a.status === 'Rejected');
    return rej?.office || 'Clearance Office';
  }

  toggleUserDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.userDropdownOpen = !this.userDropdownOpen;
    if (this.userDropdownOpen) {
      this.notificationService.refreshUnreadCount().subscribe();
    }
  }

  onOpenNotifications(): void {
    this.closeUserDropdown();
  }

  closeUserDropdown(): void {
    this.userDropdownOpen = false;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.userDropdownOpen = false;
  }

  headerTitle = 'Welcome back';
  showWelcomePopup = true;
  private welcomeTimer?: any;

  ngOnInit(): void {
    this.headerTitle = 'Welcome back';
    this.showWelcomePopup = true;
    this.welcomeTimer = setTimeout(() => {
      this.showWelcomePopup = false;
      this.headerTitle = 'Student Dashboard';
    }, 3500);

    this.loadProfilePhoto();
    this.loadActiveStudentDebtFlag();
    if (this.currentUser?.role === 'Student') {
      void this.transcriptService.refreshStudentControlNumberRequests().then(() => {
        this.transcriptStatusLoaded = true;
        this.refreshTranscriptDocumentsStatus();
      }).catch(() => {
        this.transcriptStatusLoadError = 'Transcript payment status could not be verified. Refresh the page or contact support.';
      });
    }
    this.notificationService.getStudentNotifications().subscribe();
    this.pollSubscription = timer(5000, 10000).pipe(
      switchMap(() => {
        this.refreshTranscriptPaymentStatus();
        return this.notificationService.refreshUnreadCount();
      })
    ).subscribe();
  }

  private refreshTranscriptPaymentStatus(): void {
    const user = this.currentUser;
    if (!user || !this.transcriptStatusLoaded) return;
    const hasPendingVerification = this.transcriptService.getStudentRequests(user.id)
      .some(request => request.serverManaged && request.status === 'Receipt Submitted');
    if (hasPendingVerification) {
      void this.transcriptService.refreshStudentControlNumberRequests().then(() => {
        this.refreshTranscriptDocumentsStatus();
      }).catch(() => {});
    } else {
      this.refreshTranscriptDocumentsStatus();
    }
  }

  private refreshTranscriptDocumentsStatus(): void {
    const request = this.clearanceTranscriptRequest;
    if (!request?.serverManaged || request.status !== 'Paid' || !request.paymentBatchId) {
      this.transcriptDocumentsVerified = false;
      return;
    }
    this.documentService.hasRequiredTranscriptDocuments(request.paymentBatchId).subscribe({
      next: complete => this.transcriptDocumentsVerified = complete,
      error: () => this.transcriptDocumentsVerified = false
    });
  }

  ngOnDestroy(): void {
    if (this.welcomeTimer) {
      clearTimeout(this.welcomeTimer);
    }
    this.pollSubscription?.unsubscribe();
  }

  loadActiveStudentDebtFlag(): void {
    const user = this.currentUser;
    if (!user) return;
    this.studentDebtService.listForStudent().subscribe({
      next: (flags) => {
        const found = (Array.isArray(flags) ? flags : []).find(f => f && f.status === 'OPEN');
        this.activeDebtFlag = found || null;
      },
      error: () => {}
    });
  }

  refreshInformation(): void {
    this.loadProfilePhoto();
    this.loadActiveStudentDebtFlag();
    this.notificationService.getStudentNotifications().subscribe();
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
          note = this.isPostgraduate ? 'Financial clearance' : 'Final financial clearance';
          break;
        case 'Supervisor':
          note = 'Supervisor final check';
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

  get isPostgraduate(): boolean {
    const r = this.currentRequest;
    const u = this.currentUser;
    if (r?.isPostgraduate || u?.isPostgraduate) return true;
    return this.awardType === 'postgraduate' || this.awardType === 'masters' || this.awardType === 'phd';
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
    if (!request) return false;
    if (this.isPostgraduate) {
      return (
        request.status === 'Completed' ||
        request.currentStage === 'Completed' ||
        this.getOfficeStatus('Supervisor') === 'Approved'
      );
    }
    return (
      request.status === 'Completed' ||
      request.currentStage === 'Completed' ||
      this.getOfficeStatus('Finance') === 'Approved' ||
      (this.offices.length > 0 && this.completedOffices === this.offices.length)
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

    const firstRequest = this.transcriptService.getStudentRequests(user.id).filter(request => request.serverManaged)
      .find(request => request.attemptNumber === 1);
    return localStorage.getItem(`udsm-transcript-acquired-${user.id}`) === 'true' ||
      !!firstRequest?.collectionMethod;
  }

  startTranscriptProcess(): void {
    const user = this.currentUser;
    if (user && typeof localStorage !== 'undefined') {
      localStorage.setItem(`udsm-transcript-process-started-${user.id}`, 'true');
    }
    this.openTranscriptModal();
  }

  // =====================================================
  // IN-DASHBOARD TRANSCRIPT REQUEST & MULTI-RECEIPT MODAL
  // =====================================================
  showTranscriptModal = false;
  transcriptCollectionMethod: 'Physical Collection' | 'Post by DHL' = 'Physical Collection';
  transcriptRegion = 'Dar es Salaam';
  transcriptWard = '';
  transcriptAddress = '';
  transcriptPoBox = '';
  transcriptPhone = '';
  transcriptPaymentNote = '';
  isSubmittingTranscript = false;
  transcriptErrorMessage = '';
  transcriptSuccessMessage = '';
  transcriptStatusLoaded = false;
  transcriptStatusLoadError = '';
  transcriptDocumentsVerified = false;

  openTranscriptModal(): void {
    if (!this.transcriptStatusLoaded) {
      this.transcriptErrorMessage = this.transcriptStatusLoadError || 'Checking your transcript payment status. Please wait.';
      return;
    }
    const user = this.currentUser;
    if (user && typeof localStorage !== 'undefined') {
      localStorage.setItem(`udsm-transcript-process-started-${user.id}`, 'true');
    }
    this.showTranscriptModal = true;
    this.transcriptPaymentNote = '';
    this.transcriptErrorMessage = '';
    this.transcriptSuccessMessage = '';
  }

  closeTranscriptModal(): void {
    this.showTranscriptModal = false;
    this.transcriptPaymentNote = '';
    this.transcriptErrorMessage = '';
    this.transcriptSuccessMessage = '';
  }

  triggerReceiptUpload(input: HTMLInputElement): void {
    if (this.uploadedTranscriptReceipts.length >= this.transcriptCopies) {
      this.transcriptErrorMessage = `You selected ${this.transcriptCopies} ${this.transcriptCopies === 1 ? 'copy' : 'copies'}. Increase the number of copies above if you wish to upload more receipts.`;
      return;
    }
    this.transcriptErrorMessage = '';
    input.click();
  }

  incrementCopies(): void {
    if (this.transcriptCopies < 10) {
      this.transcriptCopies++;
      this.transcriptErrorMessage = '';
    }
  }

  decrementCopies(): void {
    if (this.transcriptCopies > 1) {
      this.transcriptCopies--;
      if (this.uploadedTranscriptReceipts.length > this.transcriptCopies) {
        this.uploadedTranscriptReceipts = this.uploadedTranscriptReceipts.slice(0, this.transcriptCopies);
      }
      this.transcriptErrorMessage = '';
    }
  }

  onCopiesCountChange(): void {
    if (!this.transcriptCopies || this.transcriptCopies < 1) {
      this.transcriptCopies = 1;
    } else if (this.transcriptCopies > 10) {
      this.transcriptCopies = 10;
    }
    if (this.uploadedTranscriptReceipts.length > this.transcriptCopies) {
      this.uploadedTranscriptReceipts = this.uploadedTranscriptReceipts.slice(0, this.transcriptCopies);
    }
    this.transcriptErrorMessage = '';
  }

  getEstimatedTranscriptCost(): number {
    const copies = Math.max(1, Math.floor(this.transcriptCopies || 1));
    return 15000 + (copies - 1) * 5000;
  }

  async onTranscriptReceiptsSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.transcriptErrorMessage = '';
    const availableSlots = Math.max(0, this.transcriptCopies - this.uploadedTranscriptReceipts.length);
    if (availableSlots <= 0) {
      this.transcriptErrorMessage = `Maximum limit of ${this.transcriptCopies} ${this.transcriptCopies === 1 ? 'receipt' : 'receipts'} reached for ${this.transcriptCopies} ${this.transcriptCopies === 1 ? 'copy' : 'copies'}.`;
      input.value = '';
      return;
    }

    const allFiles: File[] = Array.from(input.files);
    if (allFiles.length > availableSlots) {
      this.transcriptErrorMessage = `You selected ${allFiles.length} files, but only ${availableSlots} more ${availableSlots === 1 ? 'receipt is' : 'receipts are'} allowed for ${this.transcriptCopies} ${this.transcriptCopies === 1 ? 'copy' : 'copies'}.`;
    }

    const files: File[] = allFiles.slice(0, availableSlots);
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        this.transcriptErrorMessage = `File ${file.name} exceeds 10MB limit.`;
        continue;
      }
      const sizeText = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      try {
        const receiptData = await this.readFileAsDataUrl(file);
        const isImage = file.type.startsWith('image/');
        this.uploadedTranscriptReceipts.push({
          file,
          fileName: file.name,
          previewUrl: isImage ? receiptData : null,
          sizeText,
          receiptData
        });
      } catch {
        this.transcriptErrorMessage = `Failed to process ${file.name}.`;
      }
    }
    input.value = '';
  }

  viewTranscriptReceipt(index: number): void {
    const item = this.uploadedTranscriptReceipts[index];
    if (!item) return;
    if (item.previewUrl) {
      window.open(item.previewUrl, '_blank');
    } else if (item.receiptData) {
      window.open(item.receiptData, '_blank');
    }
  }

  removeTranscriptReceipt(index: number): void {
    this.uploadedTranscriptReceipts.splice(index, 1);
  }
  async submitTranscriptRequest(): Promise<void> {
    const user = this.currentUser;
    if (!user) {
      this.transcriptErrorMessage = 'Unable to identify current student.';
      return;
    }

    const controlNumber = this.transcriptPaymentNote.trim();
    if (!/^[A-Za-z0-9-]{4,40}$/.test(controlNumber)) {
      this.transcriptErrorMessage = 'Enter a valid payment control number (4 to 40 letters, numbers, or hyphens).';
      return;
    }

    this.isSubmittingTranscript = true;
    this.transcriptErrorMessage = '';

    try {
      const copyRequests = await this.transcriptService.submitControlNumberBatch(controlNumber);
      const verifiedStudentId = copyRequests[0]?.studentId;
      if (!verifiedStudentId) throw new Error('The server did not confirm the student identity.');

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`udsm-transcript-process-started-${verifiedStudentId}`, 'true');
        localStorage.removeItem(`udsm-transcript-documents-submitted-${verifiedStudentId}`);
        localStorage.removeItem(`udsm-transcript-acquired-${verifiedStudentId}`);
      }

      this.notificationService.createNotification(
        verifiedStudentId,
        'Transcript Payment Submitted',
        'Your TZS 15,000 transcript fee control number has been submitted to Finance for verification.',
        'CLEARANCE_UPDATE' as any
      );

      this.isSubmittingTranscript = false;
      this.transcriptPaymentNote = '';
      this.closeTranscriptModal();
    } catch {
      this.isSubmittingTranscript = false;
      this.transcriptErrorMessage = 'Unable to submit the control number. Please verify it and try again.';
    }
  }

  get submittedTranscriptCopies(): TranscriptPaymentRequest[] {
    const user = this.currentUser;
    if (!user) return [];
    return this.transcriptService.getStudentRequests(user.id).filter(request => request.serverManaged);
  }

  get hasSubmittedTranscriptRequests(): boolean {
    return this.submittedTranscriptCopies.length > 0;
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

  getApproval(office: ClearanceOffice | string) {
    return this.currentRequest?.approvals.find(approval => approval.office === office) ?? null;
  }

  getOfficeStatus(office: ClearanceOffice | string): string {
    return this.getApproval(office)?.status ?? 'Pending';
  }

  getRejectionReason(office: ClearanceOffice | string): string {
    const approval = this.getApproval(office);
    if (!approval || approval.status !== 'Rejected') {
      return '';
    }
    return approval.comment ?? '';
  }

  getReviewerContact(office: ClearanceOffice | string): { name: string; email: string; phone: string } {
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
        'Supervisor': { email: 'postgraduate.clearance@udsm.ac.tz', phone: '+255 22 2410600' },
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

  get parallelOfficesApprovedCount(): number {
    if (!this.officeList.length) return 0;
    return this.officeList.filter(office => this.getOfficeStatus(office) === 'Approved').length;
  }

  get parallelOfficesTotalCount(): number {
    return this.officeList.length;
  }

  get parallelOfficesProgressPercent(): number {
    if (!this.officeList.length) return 0;
    if (this.allClearanceOfficesApproved ||
        this.currentRequest?.currentStage === 'Department' ||
        this.currentRequest?.currentStage === 'Principal' ||
        this.currentRequest?.currentStage === 'Finance' ||
        this.currentRequest?.currentStage === 'Supervisor' ||
        this.currentRequest?.status === 'Completed') {
      return 100;
    }
    return Math.round((this.parallelOfficesApprovedCount / this.officeList.length) * 100);
  }

  get parallelOfficesProgressDegrees(): number {
    return Math.round((this.parallelOfficesProgressPercent / 100) * 360);
  }

  get currentStageLabel(): string {
    const request = this.currentRequest;
    if (!request) return 'No clearance request';
    if (
      request.status === 'Completed' ||
      request.currentStage === 'Completed' ||
      (!this.isPostgraduate && this.getOfficeStatus('Finance') === 'Approved') ||
      (this.isPostgraduate && this.getOfficeStatus('Supervisor') === 'Approved')
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
      case 'Supervisor': return 'Supervisor (Final Check)';
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
      request.currentStage === 'Supervisor' ||
      request.status === 'Completed'
    ) {
      convocationStatus = 'Approved';
    }
    steps.push({
      number: 1,
      label: 'Convocation',
      office: 'Convocation',
      detail: 'Submit your payment control number for Finance verification.',
      status: convocationStatus
    });

    // STEP 2 — SEVEN CLEARANCE OFFICES
    const anyParallelRejected = this.officeList.some(office => this.getOfficeStatus(office) === 'Rejected');
    let officesStatus = this.allClearanceOfficesApproved
      ? 'Approved'
      : (anyParallelRejected ? 'Rejected' : 'Pending');
    if (
      request.currentStage === 'Department' ||
      request.currentStage === 'Principal' ||
      request.currentStage === 'Finance' ||
      request.currentStage === 'Supervisor' ||
      request.status === 'Completed'
    ) {
      officesStatus = 'Approved';
    } else if (request.status === 'Rejected' && request.revisionOffice && this.officeList.includes(request.revisionOffice as ClearanceOffice)) {
      officesStatus = 'Rejected';
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
      request.currentStage === 'Supervisor' ||
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
      request.currentStage === 'Supervisor' ||
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
    if (
      request.currentStage === 'Supervisor' ||
      request.status === 'Completed'
    ) {
      financeStatus = 'Approved';
    }
    steps.push({
      number: 5,
      label: 'Finance',
      office: 'Finance',
      detail: this.isPostgraduate ? 'Financial clearance approval.' : 'Final financial clearance approval.',
      status: financeStatus
    });

    // STEP 6 — SUPERVISOR (Postgraduate Only)
    if (this.isPostgraduate) {
      let supervisorStatus = this.getApproval('Supervisor')?.status ?? 'Pending';
      if (request.status === 'Completed') {
        supervisorStatus = 'Approved';
      }
      steps.push({
        number: 6,
        label: 'Supervisor',
        office: 'Supervisor',
        detail: 'Postgraduate supervisor final thesis & academic clearance check.',
        status: supervisorStatus
      });
    }

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
    return this.notificationService.unreadCount;
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
    const requests = this.transcriptService.getStudentRequests(user.id).filter(request => request.serverManaged);
    return requests.length > 0 ? requests[requests.length - 1] : null;
  }

  get clearanceTranscriptRequest(): TranscriptPaymentRequest | null {
    const user = this.currentUser;
    if (!user) return null;
    const requests = this.transcriptService.getStudentRequests(user.id).filter(request => request.serverManaged);
    return requests.at(-1) ?? null;
  }

  get isTranscriptDocumentsSubmitted(): boolean {
    const user = this.currentUser;
    const req = this.clearanceTranscriptRequest;
    if (!user || !req || req.status !== 'Paid') return false;
    return this.transcriptDocumentsVerified;
  }

  get transcriptProcessStageLabel(): string {
    const request = this.clearanceTranscriptRequest;
    const documentsSubmitted = this.isTranscriptDocumentsSubmitted;

    if (request?.status === 'Paid' && request?.collectionMethod) {
      return 'Transcript Process Completed · Submitted to DUS';
    }
    if (request?.status === 'Paid' && documentsSubmitted) {
      return 'Step 3: Specify Mode of Collection';
    }
    if (request?.status === 'Paid') {
      return 'Step 2: Upload Necessary Certificate';
    }
    if (request?.status === 'Receipt Submitted') {
      return 'Step 1: Waiting for Finance Approval';
    }
      return 'Step 1: Transcript Payment Control Number';
  }

  get transcriptProcessSteps(): TranscriptDashboardStep[] {
    const request = this.clearanceTranscriptRequest;
    const paymentStatus = request?.status;
    const documentsSubmitted = this.isTranscriptDocumentsSubmitted;
    const collectionCompleted = paymentStatus === 'Paid' && !!request?.collectionMethod;

    const paymentStepStatus: TranscriptDashboardStep['status'] =
      paymentStatus === 'Paid' ? 'Approved'
        : paymentStatus === 'Receipt Submitted' ? 'Waiting for Approval'
          : paymentStatus === 'Receipt Rejected' ? 'Rejected' : 'Pending';

    return [
      {
        number: 1,
        label: 'Transcript Payment',
        detail: paymentStatus === 'Receipt Submitted'
          ? 'Control number submitted; awaiting Finance verification.'
          : paymentStatus === 'Paid'
            ? 'Payment verified & approved by Finance.'
            : 'Enter the payment control number shown on your receipt.',
        status: paymentStepStatus
      },
      {
        number: 2,
        label: 'Upload Documentation',
        detail: documentsSubmitted
          ? 'Necessary certificates and documents submitted.'
          : 'Upload necessary academic certificate and clearance documents.',
        status: documentsSubmitted ? 'Approved' : (paymentStatus === 'Paid' ? 'Pending' : 'Locked')
      },
      {
        number: 3,
        label: 'Transcript Collection',
        detail: collectionCompleted
          ? `Mode specified: ${request?.collectionMethod}. Submitted to DUS.`
          : 'Pick up processed transcript from DUS.',
        status: collectionCompleted
          ? 'Approved'
          : (documentsSubmitted ? 'Pending' : 'Locked')
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
    const requests = this.transcriptService.getStudentRequests(user.id).filter(request => request.serverManaged);
    return requests.some(r => r.attemptNumber === 1 && r.status === 'Paid');
  }

  get transcriptProgressSteps(): number {
    const req = this.currentTranscriptRequest;
    if (!req) return 0;

    // Steps: 1. Requested, 2. Control Number Issued, 3. Control Number Submitted, 4. Paid
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
      { name: 'Payment', note: 'Submit your control number', status: 'Pending' },
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
