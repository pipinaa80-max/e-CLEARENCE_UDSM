// clearance-status.component.ts - Fixed for parallel offices
import { Component, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { TranscriptPaymentService } from '../../core/services/transcript-payment.service';

import {
  ClearanceRequest,
  ClearanceOffice
} from '../../core/models/clearance.model';

interface ProcessStep {
  number: number;
  label: string;
  office: ClearanceOffice | 'Parallel Offices' | 'Clearance Offices';
  detail: string;
  status: string;
}

@Component({
  selector: 'app-clearance-status',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    DashboardHeaderComponent
  ],
  templateUrl: './status.html',
  styleUrl: './status.css'
})
export class ClearanceStatusComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly transcriptService = inject(TranscriptPaymentService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  sidebarOpen = false;
  isLoading = false;
  successMessage = '';

  // Receipt submission after rejection
  showReceiptModal = false;
  selectedReceiptFile: File | null = null;
  receiptPreviewUrl: string | null = null;
  receiptFileName: string = '';
  receiptFileSizeText: string = '';
  receiptNote: string = '';
  isSubmittingReceipt = false;
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

  removeReceiptFile(): void {
    this.selectedReceiptFile = null;
    this.receiptPreviewUrl = null;
    this.receiptFileName = '';
    this.receiptFileSizeText = '';
    this.receiptErrorMessage = '';
  }

  get isRejected(): boolean {
    if (!this.request) return false;
    if (this.request.status === 'Rejected') return true;
    return !!this.request.approvals?.some(a => a && a.status === 'Rejected');
  }

  get rejectedOfficeName(): string {
    if (!this.request) return '';
    if (this.request.revisionOffice) return this.request.revisionOffice;
    const rej = this.request.approvals?.find(a => a && a.status === 'Rejected');
    if (rej) return rej.office;
    if (this.request.currentOffice) return this.request.currentOffice;
    return 'Finance';
  }

  get hasReportedReceiptUnderReview(): boolean {
    const r = this.request;
    if (!r) return false;
    return r.status === 'Pending' && r.currentStage === 'Finance' && !!(r.resubmittedWithReceipt || r.financeReceipt);
  }

  async submitRejectionReceipt(): Promise<void> {
    if (!this.selectedReceiptFile && !this.receiptNote?.trim()) {
      this.receiptErrorMessage = 'Please choose a payment receipt file or enter your payment reference / control number.';
      return;
    }

    if (!this.request) {
      this.receiptErrorMessage = 'No active clearance request found.';
      return;
    }

    this.isSubmittingReceipt = true;
    this.receiptErrorMessage = '';

    try {
      let base64Data = '';
      if (this.selectedReceiptFile) {
        base64Data = await this.readFileAsDataUrl(this.selectedReceiptFile);
      }
      const fileName = this.selectedReceiptFile ? this.receiptFileName : ('Payment_Reference_' + Date.now() + '.txt');

      const success = this.clearanceService.submitFinanceReceiptAfterRejection(
        this.request.id,
        base64Data,
        fileName,
        this.receiptNote
      );

      if (success) {
        this.toastService.success('Receipt Submitted', 'Payment receipt submitted successfully! Returned to Finance for review.');
        this.removeReceiptFile();
        this.receiptNote = '';
        this.showReceiptModal = false;
        this.loadData();
        this.notificationService.getStudentNotifications().subscribe();
      } else {
        this.receiptErrorMessage = 'Could not submit receipt. Please try again.';
      }
    } catch (err: any) {
      this.receiptErrorMessage = err?.message || 'Error processing receipt file.';
    } finally {
      this.isSubmittingReceipt = false;
    }
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (file.type.startsWith('image/')) {
          const img = new Image();
          img.onload = () => {
            const maxDim = 1200;
            if (img.width > maxDim || img.height > maxDim) {
              const scale = maxDim / Math.max(img.width, img.height);
              const canvas = document.createElement('canvas');
              canvas.width = Math.round(img.width * scale);
              canvas.height = Math.round(img.height * scale);
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
                return;
              }
            }
            resolve(result);
          };
          img.onerror = () => resolve(result);
          img.src = result;
        } else {
          resolve(result);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  userDropdownOpen = false;
  photoLoadFailed = false;

  get unreadNotifications(): number {
    return this.notificationService.unreadCount;
  }

  get currentUser() {
    return this.student;
  }

  toggleUserDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.userDropdownOpen = !this.userDropdownOpen;
    if (this.userDropdownOpen) {
      this.notificationService.refreshUnreadCount().subscribe();
    }
  }

  closeUserDropdown(): void {
    this.userDropdownOpen = false;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.userDropdownOpen = false;
  }

  hasPhoto(): boolean {
    return !this.photoLoadFailed && !!this.getPhotoSource();
  }

  getPhotoSource(): string | null {
    return this.authService.getProfilePhotoSource(this.currentUser);
  }

  onImageError(): void {
    this.photoLoadFailed = true;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    console.log('Sidebar toggle in status page:', this.sidebarOpen);
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get isTranscriptPaid(): boolean {
    const user = this.student;
    if (!user) return false;
    const requests = this.transcriptService.getStudentRequests(user.id);
    return requests.some(r => r.attemptNumber === 1 && r.status === 'Paid');
  }

  get isTranscriptProcessCompleted(): boolean {
    const user = this.student;
    if (!user || typeof localStorage === 'undefined') return false;

    const firstRequest = this.transcriptService.getStudentRequests(user.id)
      .find(request => request.attemptNumber === 1);
    return localStorage.getItem(`udsm-transcript-acquired-${user.id}`) === 'true' ||
      !!firstRequest?.collectionMethod;
  }

  get clearanceTranscriptRequest() {
    const user = this.student;
    if (!user) return null;
    return this.transcriptService.getStudentRequests(user.id)
      .find(request => request.attemptNumber === 1) ?? null;
  }

  get transcriptProcessStageLabel(): string {
    const request = this.clearanceTranscriptRequest;
    const user = this.student;
    const isAcquired = !!user && localStorage.getItem(`udsm-transcript-acquired-${user.id}`) === 'true';
    const documentsSubmitted = !!user &&
      localStorage.getItem(`udsm-transcript-documents-submitted-${user.id}`) === 'true';

    if (isAcquired) return 'Transcript process completed';
    if (documentsSubmitted) return 'Step 2: Documentation Submitted';
    if (request?.status === 'Paid') return 'Step 2: Upload Documentation';
    if (request?.status === 'Receipt Submitted') return 'Step 1: Waiting for DUS Review';
    return 'Step 1: Transcript Payment';
  }

  get transcriptProcessSteps(): { number: number; label: string; detail: string; status: string }[] {
    const request = this.clearanceTranscriptRequest;
    const user = this.student;
    const documentsSubmitted = !!user &&
      localStorage.getItem(`udsm-transcript-documents-submitted-${user.id}`) === 'true';
    const isAcquired = !!user && localStorage.getItem(`udsm-transcript-acquired-${user.id}`) === 'true';
    const paymentStatus = request?.status;
    const paymentStepStatus =
      paymentStatus === 'Paid' ? 'Approved'
        : paymentStatus === 'Receipt Submitted' ? 'Waiting for Approval'
          : paymentStatus === 'Receipt Rejected' ? 'Rejected' : 'Pending';

    return [
      {
        number: 1,
        label: 'Transcript Payment',
        detail: 'Upload and submit official payment receipt(s).',
        status: paymentStepStatus
      },
      {
        number: 2,
        label: 'Upload Documentation',
        detail: 'Upload and submit required academic clearance documentation.',
        status: documentsSubmitted ? 'Approved' : paymentStatus === 'Paid' ? 'Pending' : 'Locked'
      },
      {
        number: 3,
        label: 'Transcript Collection',
        detail: 'Pick up processed transcript from DUS.',
        status: request?.collectionMethod || isAcquired
          ? 'Approved'
          : documentsSubmitted ? 'Pending' : 'Locked'
      }
    ];
  }

  // =====================================================
  // CURRENT STUDENT REQUEST
  // =====================================================

  get request(): ClearanceRequest | null {
    const user = this.authService.getCurrentUser();

    if (!user) {
      return null;
    }

    const requests = this.clearanceService.getStudentRequests(user.id);
    return requests.length ? requests[requests.length - 1] : null;
  }

  // =====================================================
  // CURRENT STUDENT
  // =====================================================

  get student() {
    return this.authService.getCurrentUser();
  }

  get hasStartedTranscriptProcess(): boolean {
    const user = this.student;
    return !!user && typeof localStorage !== 'undefined' &&
      localStorage.getItem(`udsm-transcript-process-started-${user.id}`) === 'true';
  }

  // =====================================================
  // IN-DASHBOARD TRANSCRIPT REQUEST & MULTI-RECEIPT MODAL
  // =====================================================
  showTranscriptModal = false;
  transcriptCopies = 1;
  transcriptPaymentNote = '';
  isSubmittingTranscript = false;
  transcriptErrorMessage = '';
  transcriptSuccessMessage = '';

  uploadedTranscriptReceipts: {
    file: File;
    fileName: string;
    previewUrl: string | null;
    sizeText: string;
    receiptData: string;
  }[] = [];

  openTranscriptModal(): void {
    const user = this.student;
    if (user && typeof localStorage !== 'undefined') {
      localStorage.setItem(`udsm-transcript-process-started-${user.id}`, 'true');
    }
    this.showTranscriptModal = true;
    this.transcriptErrorMessage = '';
    this.transcriptSuccessMessage = '';
  }

  closeTranscriptModal(): void {
    this.showTranscriptModal = false;
    this.transcriptErrorMessage = '';
    this.transcriptSuccessMessage = '';
  }

  incrementCopies(): void {
    if (this.transcriptCopies < 10) {
      this.transcriptCopies++;
    }
  }

  decrementCopies(): void {
    if (this.transcriptCopies > 1) {
      this.transcriptCopies--;
    }
  }

  onCopiesCountChange(): void {
    if (!this.transcriptCopies || this.transcriptCopies < 1) {
      this.transcriptCopies = 1;
    } else if (this.transcriptCopies > 10) {
      this.transcriptCopies = 10;
    }
  }

  getEstimatedTranscriptCost(): number {
    const copies = Math.max(1, Math.floor(this.transcriptCopies || 1));
    return 15000 + (copies - 1) * 5000;
  }

  async onTranscriptReceiptsSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files: File[] = Array.from(input.files);
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

  removeTranscriptReceipt(index: number): void {
    this.uploadedTranscriptReceipts.splice(index, 1);
  }

  submitTranscriptRequest(): void {
    const user = this.student;
    if (!user) {
      this.transcriptErrorMessage = 'Unable to identify current student.';
      return;
    }

    if (this.uploadedTranscriptReceipts.length === 0) {
      this.transcriptErrorMessage = 'Please upload at least one payment receipt.';
      return;
    }

    this.isSubmittingTranscript = true;
    this.transcriptErrorMessage = '';

    const receiptsPayload = this.uploadedTranscriptReceipts.map(r => ({
      fileName: r.fileName,
      receiptData: r.receiptData,
      sizeText: r.sizeText
    }));

    const copyRequests = this.transcriptService.createMultipleCopyRequests({
      studentId: user.id,
      studentName: user.fullName,
      registrationNumber: user.registrationNumber || user.id,
      award: user.programme || 'Degree Certificate & Transcript',
      graduationYear: '2024',
      totalCopies: this.transcriptCopies,
      collectionMethod: 'Physical Collection',
      receipts: receiptsPayload,
      receiptNote: this.transcriptPaymentNote,
      postingContactPhone: user.phoneNumber || '',
      postingContactEmail: user.email
    });

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`udsm-transcript-process-started-${user.id}`, 'true');
    }

    setTimeout(() => {
      this.isSubmittingTranscript = false;
      this.transcriptSuccessMessage = `Successfully submitted ${copyRequests.length} separate transcript copy ${copyRequests.length === 1 ? 'request' : 'requests'} to DUS!`;
      this.toastService.success('Transcript Requests Submitted', `${copyRequests.length} separate copy requests sent to DUS.`);
      setTimeout(() => {
        this.closeTranscriptModal();
        this.uploadedTranscriptReceipts = [];
        this.transcriptPaymentNote = '';
      }, 1500);
    }, 600);
  }

  get submittedTranscriptCopies() {
    const user = this.student;
    if (!user) return [];
    return this.transcriptService.getStudentRequests(user.id);
  }

  get hasSubmittedTranscriptRequests(): boolean {
    return this.submittedTranscriptCopies.length > 0;
  }

  // =====================================================
  // SEVEN CLEARANCE OFFICES
  // =====================================================

  get officeList(): ClearanceOffice[] {
    return this.clearanceService.getClearanceOffices(this.request?.college ?? '');
  }

  // =====================================================
  // GET OFFICE APPROVAL
  // =====================================================

  getApproval(office: ClearanceOffice | string) {
    return this.request?.approvals.find(approval => approval.office === office) ?? null;
  }

  // =====================================================
  // GET OFFICE STATUS
  // =====================================================

  getOfficeStatus(office: ClearanceOffice | string): string {
    return this.getApproval(office)?.status ?? 'Pending';
  }

  // =====================================================
  // GET REJECTION COMMENT
  // =====================================================

  getRejectionReason(office: ClearanceOffice | string): string {
    const approval = this.getApproval(office);
    if (!approval || approval.status !== 'Rejected') {
      return '';
    }
    return approval.comment ?? '';
  }

  // =====================================================
  // REVIEWED BY
  // =====================================================

  getReviewerContact(office: ClearanceOffice | string): { name: string; email: string; phone: string } {
    const approval = this.getApproval(office);
    const name = approval?.reviewedBy || '';
    let email = approval?.reviewerEmail || '';
    let phone = approval?.reviewerPhone || '';

    // If not recorded directly on approval, search local users
    if (!email || !phone) {
      try {
        const usersJson = localStorage.getItem('udsm-local-users');
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

    // Institutional contacts fallback for offices
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

  // =====================================================
  // CHECK IF CONVOCATION IS APPROVED
  // =====================================================

  get isConvocationApproved(): boolean {
    const request = this.request;
    if (!request) return false;

    const convocationApproval = request.approvals.find(
        approval => approval.office === 'Convocation'
    );

    return convocationApproval?.status === 'Approved';
  }

  // =====================================================
  // ALL SEVEN APPROVED - FIXED
  // =====================================================

  get allClearanceOfficesApproved(): boolean {
    const request = this.request;
    if (!request) return false;

    // Check if all offices required by this student's college are approved
    const allApproved = this.officeList.every(office => {
      const status = this.getOfficeStatus(office);
      return status === 'Approved';
    });

    console.log('All clearance offices approved:', allApproved);
    return allApproved;
  }

  // =====================================================
  // CHECK IF CAN CONTINUE TO NEXT STAGE - FIXED
  // =====================================================

  get canContinueToNextStage(): boolean {
    const request = this.request;
    if (!request) return false;

    // For Convocation stage - check if approved
    if (request.currentStage === 'Convocation') {
      const canContinue = this.isConvocationApproved;
      console.log('Can continue from Convocation:', canContinue);
      return canContinue;
    }

    // For Parallel stage - check if all offices approved
    if (request.currentStage === 'Parallel') {
      const canContinue = this.allClearanceOfficesApproved;
      console.log('Can continue from Parallel:', canContinue);
      return canContinue;
    }

    return false;
  }

  // =====================================================
  // GET NEXT STAGE NAME
  // =====================================================

  getNextStageName(): string {
    const request = this.request;
    if (!request) return '';

    switch (request.currentStage) {
      case 'Convocation':
        return 'Step 2: Parallel Offices';
      case 'Parallel':
        return 'Step 3: Department';
      case 'Department':
        return 'Step 4: Principal';
      case 'Principal':
        return 'Step 5: Finance';
      case 'Finance':
        return 'Clearance Confirmation';
      default:
        return '';
    }
  }

  canAdvanceFromCurrentStage(): boolean {
    const request = this.request;
    if (!request) return false;

    if (request.currentStage === 'Convocation') {
      return this.isConvocationApproved;
    }

    if (request.currentStage === 'Parallel') {
      return this.allClearanceOfficesApproved;
    }

    if (
        request.currentStage === 'Department' ||
        request.currentStage === 'Principal' ||
        request.currentStage === 'Finance'
    ) {
      return this.getOfficeStatus(request.currentStage) === 'Approved';
    }

    return false;
  }

  ngOnInit(): void {
    this.loadData();
    this.checkAndAutoAdvanceStage();
    this.notificationService.refreshUnreadCount().subscribe();
  }

  checkAndAutoAdvanceStage(): void {
    const request = this.request;
    if (!request || request.status === 'Rejected') return;

    if (this.getOfficeStatus('Finance') === 'Approved' || request.status === 'Completed' || request.currentStage === 'Completed') {
      if (request.status !== 'Completed' || request.currentStage !== 'Completed') {
        this.clearanceService.advanceStage(request.id, 'Completed', undefined);
        this.loadData();
      }
      return;
    }

    let iterations = 0;
    while (this.canAdvanceFromCurrentStage() && iterations < 5) {
      iterations++;
      console.log(`Auto-advancing request ${request.id} from stage ${request.currentStage}`);
      this.continueToNextStageSilently();
    }
  }

  continueToNextStageSilently(): void {
    const request = this.request;
    if (!request) return;

    let nextStage: string = '';
    let nextOffice: ClearanceOffice | undefined = undefined;

    if (request.currentStage === 'Convocation' && this.isConvocationApproved) {
      nextStage = 'Parallel';
      nextOffice = undefined;
    } else if (request.currentStage === 'Parallel' && this.allClearanceOfficesApproved) {
      nextStage = 'Department';
      nextOffice = 'Department';
    } else if (request.currentStage === 'Department' && this.getOfficeStatus('Department') === 'Approved') {
      nextStage = 'Principal';
      nextOffice = 'Principal';
    } else if (request.currentStage === 'Principal' && this.getOfficeStatus('Principal') === 'Approved') {
      nextStage = 'Finance';
      nextOffice = 'Finance';
    } else if (request.currentStage === 'Finance' && this.getOfficeStatus('Finance') === 'Approved') {
      nextStage = 'Completed';
      nextOffice = undefined;
    }

    if (nextStage) {
      this.clearanceService.advanceStage(request.id, nextStage as any, nextOffice);
      this.loadData();
    }
  }

  // =====================================================
  // CONTINUE TO NEXT STAGE - FIXED
  // =====================================================

  continueToNextStage(): void {
    this.isLoading = true;
    this.successMessage = '';

    const request = this.request;
    if (!request) {
      this.toastService.warning('Not Found', 'No active clearance request found.');
      this.isLoading = false;
      return;
    }

    try {
      // Get all requests
      const allRequests = this.clearanceService.getAllRequests();
      const requestIndex = allRequests.findIndex(r => r.id === request.id);

      if (requestIndex === -1) {
        this.toastService.error('Error', 'Request not found.');
        this.isLoading = false;
        return;
      }

      // Determine next stage
      let nextStage: string = '';
      let nextOffice: ClearanceOffice | undefined = undefined;

      if (request.currentStage === 'Convocation') {
        nextStage = 'Parallel';
        nextOffice = undefined;
      } else if (request.currentStage === 'Parallel') {
        // Check if all offices are approved before proceeding
        if (!this.allClearanceOfficesApproved) {
          this.toastService.warning('Action Required', 'All parallel offices must approve first.');
          this.isLoading = false;
          return;
        }
        nextStage = 'Department';
        nextOffice = 'Department';
      } else if (request.currentStage === 'Department') {
        if (this.getOfficeStatus('Department') !== 'Approved') {
          this.toastService.warning('Action Required', 'Department approval is required first.');
          this.isLoading = false;
          return;
        }
        nextStage = 'Principal';
        nextOffice = 'Principal';
      } else if (request.currentStage === 'Principal') {
        if (this.getOfficeStatus('Principal') !== 'Approved') {
          this.toastService.warning('Action Required', 'Principal approval is required first.');
          this.isLoading = false;
          return;
        }
        nextStage = 'Finance';
        nextOffice = 'Finance';
      } else if (request.currentStage === 'Finance') {
        if (this.getOfficeStatus('Finance') !== 'Approved') {
          this.toastService.warning('Action Required', 'Finance approval is required first.');
          this.isLoading = false;
          return;
        }
        nextStage = 'Completed';
        nextOffice = undefined;
        allRequests[requestIndex].status = 'Completed';
      } else {
        this.toastService.error('Error', 'Cannot continue from current stage.');
        this.isLoading = false;
        return;
      }

      // Update the request
      this.clearanceService.advanceStage(request.id, nextStage as any, nextOffice);

      // Reload data
      this.loadData();

      this.successMessage = `✅ ${this.getNextStageName()} started successfully!`;

      // Show notification
      this.notificationService.createNotification(
          request.studentId,
          'Next Stage Started',
          `You have successfully moved to ${this.getNextStageName()}.`,
          'success'
      );

      setTimeout(() => {
        this.successMessage = '';
        // Refresh the page data
        window.location.reload();
      }, 3000);

    } catch (error: any) {
      console.error('Error continuing to next stage:', error);
      this.toastService.error('Process Failed', 'Failed to continue to next stage. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  // =====================================================
  // LOAD DATA
  // =====================================================

  loadData(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.clearanceService.getStudentRequests(user.id);
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  // =====================================================
  // CURRENT STEP NUMBER
  // =====================================================

  get currentStepNumber(): number {
    const request = this.request;
    if (!request) return 0;

    if (request.status === 'Completed') {
      return 5;
    }

    switch (request.currentStage) {
      case 'Convocation':
        return 1;
      case 'Parallel':
        return 2;
      case 'Department':
        return 3;
      case 'Principal':
        return 4;
      case 'Finance':
        return 5;
      case 'Completed':
        return 5;
      default:
        return 1;
    }
  }

  // =====================================================
  // CURRENT STAGE LABEL
  // =====================================================

  get currentStageLabel(): string {
    const request = this.request;

    if (!request) {
      return 'No clearance request';
    }

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

      if (rejectedOffice) {
        return `${rejectedOffice} — Action Required`;
      }

      const rejectedStage = request.approvals.find(
          approval => approval.status === 'Rejected'
      );

      if (rejectedStage) {
        return `${rejectedStage.office} — Action Required`;
      }

      return 'Clearance requires action';
    }

    switch (request.currentStage) {
      case 'Convocation':
        return 'Convocation';
      case 'Parallel':
        return 'Parallel Offices';
      case 'Department':
        return 'Department';
      case 'Principal':
        return 'Principal';
      case 'Finance':
        return 'Finance';
      default:
        return 'Clearance completed';
    }
  }

  // =====================================================
  // FIVE MAIN STEPS
  // =====================================================

  get processSteps(): ProcessStep[] {
    const request = this.request;

    if (!request) {
      return [];
    }

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
      detail: this.officeList.join(', ') + '.',
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

  // =====================================================
  // OFFICE DETAIL
  // =====================================================

  getOfficeDetail(office: ClearanceOffice): string {
    const approval = this.getApproval(office);

    if (!approval) {
      return 'Waiting for staff review';
    }

    if (approval.status === 'Approved') {
      return 'Approved by responsible staff';
    }

    if (approval.status === 'Rejected') {
      return 'Rejected — view the reason below';
    }

    return 'Waiting for staff review';
  }

  // =====================================================
  // OFFICE ROUTES
  // =====================================================

  getOfficeRoute(office: string): string {
    const map: Record<string, string> = {
      'Convocation': '/convocation',
      'Games Coach': '/games_coach',
      'Hall Warden': '/hall_warden',
      'USAB': '/usab',
      'DARUSO': '/daruso',
      'Library': '/dashboard/library',
      'Dean of Students': '/dean_of_students',
      'Smart Card': '/smart_card',
      'Workshop': '/dashboard/workshop',
      'Laboratory': '/dashboard/laboratory',
      'Department': '/department/dashboard',
      'Principal': '/principal',
      'Finance': '/dashboard/finance'
    };
    return map[office] || '/clearance/status';
  }

  // =====================================================
  // TYPE CHECK
  // =====================================================

  isClearanceOffice(office: ClearanceOffice | 'Parallel Offices' | 'Clearance Offices'): office is ClearanceOffice {
    return this.officeList.includes(office as ClearanceOffice);
  }
}