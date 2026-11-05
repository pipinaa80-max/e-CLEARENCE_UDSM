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
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, DashboardHeaderComponent],
  templateUrl: './student.html',
  styleUrl: './student.css'
})
export class StudentDashboard implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly transcriptService = inject(TranscriptPaymentService);
  private readonly router = inject(Router);
  private pollSubscription?: Subscription;

  sidebarOpen = false;
  profilePhoto: string | null = null;
  photoLoadFailed = false;
  isLoading = true;
  systemType: StudentSystemType = environment.systemType;
  userDropdownOpen = false;

  // Receipt submission after rejection
  showReceiptModal = false;
  selectedReceiptFile: File | null = null;
  receiptPreviewUrl: string | null = null;
  receiptFileName: string = '';
  receiptFileSizeText: string = '';
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

  removeReceiptFile(): void {
    this.selectedReceiptFile = null;
    this.receiptPreviewUrl = null;
    this.receiptFileName = '';
    this.receiptFileSizeText = '';
    this.receiptErrorMessage = '';
  }

  async submitRejectionReceipt(): Promise<void> {
    if (!this.selectedReceiptFile && !this.receiptNote?.trim()) {
      this.receiptErrorMessage = 'Please choose a payment receipt file or enter your payment reference / control number.';
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
      let base64Data = '';
      if (this.selectedReceiptFile) {
        base64Data = await this.readFileAsDataUrl(this.selectedReceiptFile);
      }
      const fileName = this.selectedReceiptFile ? this.receiptFileName : ('Payment_Reference_' + Date.now() + '.txt');

      const success = this.clearanceService.submitFinanceReceiptAfterRejection(
        this.currentRequest.id,
        base64Data,
        fileName,
        this.receiptNote
      );

      if (success) {
        this.receiptSuccessMessage = 'Payment receipt submitted successfully! Your clearance request has returned to Finance for review.';
        this.removeReceiptFile();
        this.receiptNote = '';
        this.showReceiptModal = false;
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

  ngOnInit(): void {
    this.loadProfilePhoto();
    this.notificationService.getStudentNotifications().subscribe();
    this.pollSubscription = timer(5000, 10000).pipe(
      switchMap(() => this.notificationService.refreshUnreadCount())
    ).subscribe();
  }

  ngOnDestroy(): void {
    this.pollSubscription?.unsubscribe();
  }

  refreshInformation(): void {
    this.loadProfilePhoto();
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
    if (!request) return false;
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

    const firstRequest = this.transcriptService.getStudentRequests(user.id)
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
  transcriptCopies = 1;
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

  uploadedTranscriptReceipts: {
    file: File;
    fileName: string;
    previewUrl: string | null;
    sizeText: string;
    receiptData: string;
  }[] = [];

  openTranscriptModal(): void {
    const user = this.currentUser;
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
    const user = this.currentUser;
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
      setTimeout(() => {
        this.closeTranscriptModal();
        this.uploadedTranscriptReceipts = [];
        this.transcriptPaymentNote = '';
      }, 1500);
    }, 600);
  }

  get submittedTranscriptCopies(): TranscriptPaymentRequest[] {
    const user = this.currentUser;
    if (!user) return [];
    return this.transcriptService.getStudentRequests(user.id);
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

    if (isAcquired) return 'Transcript process completed';
    if (documentsSubmitted) return 'Step 2: Documentation Submitted';
    if (request?.status === 'Paid') return 'Step 2: Upload Documentation';
    if (request?.status === 'Receipt Submitted') return 'Step 1: Waiting for DUS Review';
    return 'Step 1: Transcript Payment & Receipt';
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
