import { ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { AuthService } from '../../core/services/auth.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { TranscriptPaymentService } from '../../core/services/transcript-payment.service';
import { ReceiptFileStoreService } from '../../core/services/receipt-file-store.service';
import { ClearanceRequest } from '../../core/models/clearance.model';
import { TranscriptPaymentRequest } from '../../transcript/transcript-payment.model';
import { sortTranscriptRequestsForFinance } from '../../transcript/finance-payment.utils';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';

export interface UnifiedFinanceItem {
  kind: 'clearance' | 'transcript';
  id: string;
  studentId: string;
  registrationNumber: string;
  studentName: string;
  listName: string;
  email: string;
  phoneNumber: string;
  programme: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedAt?: string;
  hasReceipt: boolean;
  receiptCount: number;
  isResubmittedReceipt: boolean;
  totalCopies?: number;
  totalAmount?: number;
  currency?: string;
  controlNumber?: string;
  receiptNote?: string;
  rejectionReason?: string;
  clearanceRequest?: ClearanceRequest;
  transcriptRequest?: TranscriptPaymentRequest;
  transcriptBatch?: TranscriptPaymentRequest[];
}

export interface ResolvedReceiptPreview {
  index: number;
  fileName: string;
  mimeType: string;
  isPdf: boolean;
  isImage: boolean;
  dataUrl: string | null;
  blobUrl: string | null;
  safeResourceUrl: SafeResourceUrl | null;
  sizeText?: string;
}

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './finance.html',
  styleUrl: './finance.css'
})
export class FinanceDashboard implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly clearanceService = inject(ClearanceService);
  private readonly transcriptPaymentService = inject(TranscriptPaymentService);
  private readonly receiptFileStore = inject(ReceiptFileStoreService);
  private readonly notificationService = inject(NotificationService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  sidebarOpen = false;
  searchTerm = '';
  filterStatus: 'pending' | 'transcript' | 'clearance' | 'approved' | 'rejected' | 'all' = 'pending';

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Modals & messages
  detailsItem: UnifiedFinanceItem | null = null;
  rejectTarget: UnifiedFinanceItem | null = null;
  rejectionComment = '';
  message = '';
  enlargedPhotoUrl: string | null = null;

  // Receipt resolution state for active modal
  isLoadingReceipts = false;
  resolvedReceipts: ResolvedReceiptPreview[] = [];
  activeReceiptIndex = 0;
  private activeBlobUrls: string[] = [];

  private studentCache: Map<string, any> = new Map();

  ngOnDestroy(): void {
    this.revokeActiveBlobUrls();
  }

  private revokeActiveBlobUrls(): void {
    for (const url of this.activeBlobUrls) {
      if (url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Ignore revoke errors
        }
      }
    }
    this.activeBlobUrls = [];
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  setFilterStatus(status: 'pending' | 'transcript' | 'clearance' | 'approved' | 'rejected' | 'all'): void {
    this.filterStatus = status;
    this.currentPage = 1;
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  // =====================================================
  // UNIFIED ITEMS (CLEARANCE + TRANSCRIPT RECEIPTS)
  // =====================================================

  get clearanceRequests(): ClearanceRequest[] {
    return this.clearanceService.getRequestsForOffice('Finance');
  }

  get transcriptBatchItems(): UnifiedFinanceItem[] {
    const raw = sortTranscriptRequestsForFinance(this.transcriptPaymentService.getAllRequests()).filter(
      r =>
        r.status === 'Receipt Submitted' ||
        r.status === 'Paid' ||
        r.status === 'Receipt Rejected' ||
        !!r.receiptData ||
        !!r.receiptStorageId ||
        !!(r.receipts && r.receipts.length > 0)
    );

    const grouped = new Map<string, TranscriptPaymentRequest[]>();
    for (const req of raw) {
      const batchKey = `${req.studentId}::${req.controlNumber || req.requestedAt || req.id}`;
      const existing = grouped.get(batchKey);
      if (existing) {
        existing.push(req);
      } else {
        grouped.set(batchKey, [req]);
      }
    }

    const items: UnifiedFinanceItem[] = [];
    grouped.forEach((batch) => {
      batch.sort((a, b) => (a.copyNumber ?? 1) - (b.copyNumber ?? 1));
      const rep = batch[0];
      const user = this.getStudentData(rep.studentId);

      const fullName = (rep.studentName || user?.fullName || '').trim() || 'Student';
      const regNo = (rep.registrationNumber || user?.registrationNumber || user?.studentId || '—').trim();
      const email = (rep.postingContactEmail || user?.email || '—').trim();
      const phone = (rep.postingContactPhone || user?.phoneNumber || user?.phone || '—').trim();
      const programme = (rep.award || user?.programme || 'Academic Transcript').trim();

      const status: 'Pending' | 'Approved' | 'Rejected' =
        rep.status === 'Paid'
          ? 'Approved'
          : rep.status === 'Receipt Rejected'
            ? 'Rejected'
            : 'Pending';

      const totalCopies = batch.length > 1 ? batch.length : (rep.totalCopies || rep.transcriptCount || 1);
      const totalAmount = batch.length > 1
        ? batch.reduce((sum, item) => sum + (item.amount || 0), 0)
        : rep.amount;

      let receiptCount = 0;
      if (rep.receipts && rep.receipts.length > 0) {
        receiptCount = rep.receipts.length;
      } else if (rep.receiptData || rep.receiptStorageId || rep.receiptFileName) {
        receiptCount = 1;
      }

      items.push({
        kind: 'transcript',
        id: `transcript-${rep.id}`,
        studentId: rep.studentId,
        registrationNumber: regNo,
        studentName: fullName,
        listName: this.formatListName(fullName, user),
        email: email || '—',
        phoneNumber: phone || '—',
        programme: programme || '—',
        status,
        submittedAt: rep.receiptSubmittedAt || rep.requestedAt,
        hasReceipt: receiptCount > 0,
        receiptCount,
        isResubmittedReceipt: false,
        totalCopies,
        totalAmount,
        currency: rep.currency || 'TZS',
        controlNumber: rep.controlNumber,
        receiptNote: rep.receiptNote,
        rejectionReason: rep.rejectionReason,
        transcriptRequest: rep,
        transcriptBatch: batch
      });
    });

    return items;
  }

  get allUnifiedItems(): UnifiedFinanceItem[] {
    const clearanceItems: UnifiedFinanceItem[] = this.clearanceRequests.map((req) => {
      const officeStatus = this.getRequestOfficeStatus(req, 'Finance');
      const status: 'Pending' | 'Approved' | 'Rejected' =
        officeStatus === 'Approved' ? 'Approved' : officeStatus === 'Rejected' ? 'Rejected' : 'Pending';
      const receiptCount = this.countClearanceReceipts(req);

      return {
        kind: 'clearance',
        id: `clearance-${req.id}`,
        studentId: req.studentId,
        registrationNumber: this.getStudentRegNumber(req),
        studentName: this.getStudentName(req),
        listName: this.getStudentListName(req),
        email: this.getStudentEmail(req),
        phoneNumber: this.getStudentPhone(req),
        programme: this.getStudentProgramme(req),
        status,
        submittedAt: this.getReceiptSubmittedAt(req) || req.requestDate,
        hasReceipt: receiptCount > 0,
        receiptCount,
        isResubmittedReceipt: this.isReceiptReported(req),
        receiptNote: this.getReceiptNote(req),
        rejectionReason: status === 'Rejected' ? this.getFinanceRejectionReason(req) : undefined,
        clearanceRequest: req
      };
    });

    const combined = [...this.transcriptBatchItems, ...clearanceItems];
    return combined.sort((a, b) => {
      if (a.status === 'Pending' && b.status !== 'Pending') return -1;
      if (a.status !== 'Pending' && b.status === 'Pending') return 1;
      const ta = a.submittedAt ? Date.parse(a.submittedAt) || 0 : 0;
      const tb = b.submittedAt ? Date.parse(b.submittedAt) || 0 : 0;
      return tb - ta;
    });
  }

  get allPendingCount(): number {
    return this.allUnifiedItems.filter(i => i.status === 'Pending').length;
  }

  get pendingTranscriptCount(): number {
    return this.allUnifiedItems.filter(i => i.kind === 'transcript' && i.status === 'Pending').length;
  }

  get pendingClearanceCount(): number {
    return this.allUnifiedItems.filter(i => i.kind === 'clearance' && i.status === 'Pending').length;
  }

  get approvedCount(): number {
    return this.allUnifiedItems.filter(i => i.status === 'Approved').length;
  }

  get rejectedCount(): number {
    return this.allUnifiedItems.filter(i => i.status === 'Rejected').length;
  }

  get filteredItems(): UnifiedFinanceItem[] {
    let list = this.allUnifiedItems;

    if (this.searchTerm.trim()) {
      const s = this.searchTerm.trim().toLowerCase();
      list = list.filter(item =>
        item.studentName.toLowerCase().includes(s) ||
        item.listName.toLowerCase().includes(s) ||
        item.registrationNumber.toLowerCase().includes(s) ||
        item.programme.toLowerCase().includes(s) ||
        (item.controlNumber || '').toLowerCase().includes(s)
      );
    }

    switch (this.filterStatus) {
      case 'pending':
        list = list.filter(i => i.status === 'Pending');
        break;
      case 'transcript':
        list = list.filter(i => i.kind === 'transcript');
        break;
      case 'clearance':
        list = list.filter(i => i.kind === 'clearance');
        break;
      case 'approved':
        list = list.filter(i => i.status === 'Approved');
        break;
      case 'rejected':
        list = list.filter(i => i.status === 'Rejected');
        break;
      case 'all':
        break;
    }

    return list;
  }

  get paginatedItems(): UnifiedFinanceItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredItems.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredItems.length / this.pageSize) || 1;
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

  // =====================================================
  // MODAL & RECEIPT RESOLUTION (IMAGES + PDFs)
  // =====================================================

  get activeReceipt(): ResolvedReceiptPreview | null {
    return this.resolvedReceipts[this.activeReceiptIndex] ?? null;
  }

  selectReceiptTab(idx: number): void {
    if (idx >= 0 && idx < this.resolvedReceipts.length) {
      this.activeReceiptIndex = idx;
    }
  }

  async openItemDetails(item: UnifiedFinanceItem): Promise<void> {
    this.detailsItem = item;
    this.activeReceiptIndex = 0;
    this.resolvedReceipts = [];
    this.revokeActiveBlobUrls();

    if (!item.hasReceipt) {
      this.isLoadingReceipts = false;
      return;
    }

    this.isLoadingReceipts = true;
    this.cdr.detectChanges();

    try {
      const rawEntries = this.extractRawReceiptEntries(item);
      const previews: ResolvedReceiptPreview[] = [];

      for (let i = 0; i < rawEntries.length; i++) {
        const entry = rawEntries[i];
        const dataUrl = await this.receiptFileStore.resolveDataUrl(entry.receiptData, entry.storageId);
        const mimeType = this.receiptFileStore.detectMimeType(dataUrl ?? undefined, entry.fileName);
        const isPdf = this.receiptFileStore.isPdf(dataUrl ?? undefined, entry.fileName, entry.mimeType || mimeType);
        const isImage = !isPdf && this.receiptFileStore.isImage(dataUrl ?? undefined, entry.fileName, entry.mimeType || mimeType);
        const blobUrl = dataUrl ? this.receiptFileStore.dataUrlToBlobUrl(dataUrl, entry.fileName) : null;

        if (blobUrl && blobUrl.startsWith('blob:')) {
          this.activeBlobUrls.push(blobUrl);
        }

        const safeResourceUrl = blobUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl) : null;

        previews.push({
          index: i,
          fileName: entry.fileName || `Receipt_${i + 1}`,
          mimeType,
          isPdf,
          isImage,
          dataUrl,
          blobUrl,
          safeResourceUrl,
          sizeText: entry.sizeText
        });
      }

      this.resolvedReceipts = previews;
    } finally {
      this.isLoadingReceipts = false;
      this.cdr.detectChanges();
    }
  }

  closeDetails(): void {
    this.detailsItem = null;
    this.resolvedReceipts = [];
    this.activeReceiptIndex = 0;
    this.revokeActiveBlobUrls();
  }

  private extractRawReceiptEntries(item: UnifiedFinanceItem): {
    fileName: string;
    receiptData?: string;
    storageId?: string;
    mimeType?: string;
    sizeText?: string;
  }[] {
    if (item.kind === 'transcript' && item.transcriptRequest) {
      const req = item.transcriptRequest;
      if (req.receipts && req.receipts.length > 0) {
        return req.receipts.map((r, idx) => ({
          fileName: r.fileName || `Transcript_Receipt_${idx + 1}`,
          receiptData: r.receiptData,
          storageId: r.storageId,
          mimeType: r.mimeType,
          sizeText: r.sizeText
        }));
      }
      if (req.receiptData || req.receiptStorageId || req.receiptFileName) {
        return [
          {
            fileName: req.receiptFileName || 'Transcript_Receipt',
            receiptData: req.receiptData,
            storageId: req.receiptStorageId,
            mimeType: req.receiptMimeType
          }
        ];
      }
      return [];
    }

    if (item.kind === 'clearance' && item.clearanceRequest) {
      const cReq = item.clearanceRequest;
      const entries: {
        fileName: string;
        receiptData?: string;
        storageId?: string;
        mimeType?: string;
      }[] = [];

      if (cReq.financeReceipt && (cReq.financeReceipt.receiptData || cReq.financeReceipt.receiptStorageId || cReq.financeReceipt.receiptFileName)) {
        entries.push({
          fileName: cReq.financeReceipt.receiptFileName || 'Finance_Payment_Receipt',
          receiptData: cReq.financeReceipt.receiptData,
          storageId: cReq.financeReceipt.receiptStorageId,
          mimeType: cReq.financeReceipt.receiptMimeType
        });
      }
      if (cReq.convocation && (cReq.convocation.receiptData || cReq.convocation.receiptFileName)) {
        entries.push({
          fileName: cReq.convocation.receiptFileName || 'Convocation_Receipt',
          receiptData: cReq.convocation.receiptData
        });
      }
      return entries;
    }

    return [];
  }

  // =====================================================
  // UNIFIED APPROVE / REJECT / WITHDRAW ACTIONS
  // =====================================================

  async approveItem(item: UnifiedFinanceItem): Promise<void> {
    const staff = this.currentUser;
    if (!staff) {
      this.router.navigate(['/login']);
      return;
    }

    if (item.kind === 'transcript' && item.transcriptRequest) {
      const ok = this.transcriptPaymentService.updateStatus(item.transcriptRequest.id, 'Paid');
      if (!ok) return;

      this.notificationService.createNotification(
        item.studentId,
        'Transcript Payment Approved',
        'Finance has verified and approved your transcript payment receipt. Open your dashboard and click Continue to upload your necessary certificate.',
        'success'
      );

      this.message = `Transcript payment receipt approved for ${item.studentName}.`;
      if (this.detailsItem?.id === item.id) {
        this.closeDetails();
      }
      return;
    }

    if (item.kind === 'clearance' && item.clearanceRequest) {
      if (!await this.clearanceService.approveRequest(item.clearanceRequest.id, 'Finance', staff.fullName)) {
        return;
      }

      this.notificationService.createNotification(
        item.studentId,
        'Clearance completed',
        'Finance has approved your application. Your graduation clearance is now complete.',
        'success'
      );

      this.message = `Clearance approved for ${item.studentName}.`;
      if (this.detailsItem?.id === item.id) {
        this.closeDetails();
      }
    }
  }

  openRejectModal(item: UnifiedFinanceItem): void {
    this.rejectTarget = item;
    this.rejectionComment = '';
    this.message = '';
  }

  closeRejectModal(): void {
    this.rejectTarget = null;
    this.rejectionComment = '';
  }

  async submitRejection(): Promise<void> {
    const staff = this.currentUser;
    const target = this.rejectTarget;
    const reason = this.rejectionComment.trim();

    if (!staff || !target || !reason) {
      return;
    }

    if (target.kind === 'transcript' && target.transcriptRequest) {
      const ok = this.transcriptPaymentService.rejectReceipt(target.transcriptRequest.id, reason);
      if (!ok) return;

      this.notificationService.createNotification(
        target.studentId,
        'Transcript Receipt Returned by Finance',
        reason,
        'warning'
      );

      this.message = `Transcript payment receipt returned to ${target.studentName}.`;
      if (this.detailsItem?.id === target.id) {
        this.closeDetails();
      }
      this.closeRejectModal();
      return;
    }

    if (target.kind === 'clearance' && target.clearanceRequest) {
      if (!await this.clearanceService.rejectRequest(target.clearanceRequest.id, 'Finance', staff.fullName, reason)) {
        return;
      }

      this.notificationService.createNotification(
        target.studentId,
        'Finance action required',
        reason,
        'warning'
      );

      this.message = `Clearance returned to ${target.studentName} with required action.`;
      if (this.detailsItem?.id === target.id) {
        this.closeDetails();
      }
      this.closeRejectModal();
    }
  }

  async withdrawItemDecision(item: UnifiedFinanceItem): Promise<void> {
    if (item.kind === 'transcript' && item.transcriptRequest) {
      if (!this.transcriptPaymentService.updateStatus(item.transcriptRequest.id, 'Receipt Submitted')) {
        return;
      }
      this.message = 'Transcript payment decision withdrawn. The receipt is pending review again.';
      return;
    }

    if (item.kind === 'clearance' && item.clearanceRequest) {
      if (!await this.clearanceService.withdrawOfficeDecision(item.clearanceRequest.id, 'Finance')) {
        return;
      }
      this.message = 'Finance clearance decision withdrawn. The request is pending again.';
    }
  }

  // =====================================================
  // STUDENT & CLEARANCE HELPERS
  // =====================================================

  getRequestOfficeStatus(request: ClearanceRequest, office: string): string {
    return request.approvals.find(approval => approval.office === office)?.status ?? 'Pending';
  }

  isReceiptReported(request: ClearanceRequest): boolean {
    return !!(
      request.resubmittedWithReceipt ||
      (request.financeReceipt && (request.financeReceipt.receiptData || request.financeReceipt.receiptStorageId || request.financeReceipt.receiptSubmittedAt)) ||
      (request.rejectionHistory && request.rejectionHistory.length > 0 && (request.financeReceipt || request.convocation?.receiptData))
    );
  }

  private countClearanceReceipts(request: ClearanceRequest): number {
    let count = 0;
    if (
      request.financeReceipt?.receiptData ||
      request.financeReceipt?.receiptStorageId ||
      request.financeReceipt?.receiptFileName
    ) {
      count++;
    }
    if (request.convocation?.receiptData || request.convocation?.receiptFileName) {
      count++;
    }
    return count;
  }

  getFinanceRejectionReason(request: ClearanceRequest): string {
    return request.approvals.find(approval => approval.office === 'Finance')?.comment || 'No reason was recorded.';
  }

  getRejectionHistory(request: ClearanceRequest) {
    return request.rejectionHistory ?? [];
  }

  getReceiptNote(request: ClearanceRequest): string {
    return request.financeReceipt?.receiptNote || '';
  }

  getReceiptSubmittedAt(request: ClearanceRequest): string | undefined {
    return request.financeReceipt?.receiptSubmittedAt || request.convocation?.receiptSubmittedAt;
  }

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

  private formatListName(fullName: string, user?: any): string {
    const firstName = user?.firstName?.trim();
    const middleName = user?.middleName?.trim();
    const lastName = user?.lastName?.trim();
    if (firstName && lastName) {
      return `${lastName}, ${[firstName, middleName].filter(Boolean).join(' ')}`.toUpperCase();
    }
    const clean = (fullName || '').trim();
    if (!clean) return '—';
    const parts = clean.split(/\s+/).filter(Boolean);
    return parts.length > 1 ? `${parts.pop()}, ${parts.join(' ')}`.toUpperCase() : clean.toUpperCase();
  }

  getStudentName(request: ClearanceRequest): string {
    if (request.studentName) return request.studentName;
    const user = this.getStudentData(request.studentId);
    if (user) {
      return user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.registrationNumber || 'Student';
    }
    return request.registrationNumber || 'Student #' + request.studentId.substring(0, 8);
  }

  getStudentListName(request: ClearanceRequest): string {
    const user = this.getStudentData(request.studentId);
    return this.formatListName(request.studentName || user?.fullName || '', user);
  }

  getStudentRegNumber(request: ClearanceRequest): string {
    const user = this.getStudentData(request.studentId);
    return request.registrationNumber?.trim() || user?.registrationNumber?.trim() || user?.studentId?.trim() || '—';
  }

  getStudentGenderForItem(item: UnifiedFinanceItem): string {
    if (item.clearanceRequest) {
      const cGender = this.getStudentData(item.studentId)?.gender || (item.clearanceRequest as ClearanceRequest & { gender?: string }).gender;
      if (typeof cGender === 'string' && cGender.trim() && cGender.trim() !== '—') {
        return cGender.trim();
      }
    }
    const uGender = this.getStudentData(item.studentId)?.gender;
    if (typeof uGender === 'string' && uGender.trim() && uGender.trim() !== '—') {
      return uGender.trim();
    }
    return '—';
  }

  getStudentEmail(request: ClearanceRequest): string {
    return request.email?.trim() || this.getStudentData(request.studentId)?.email?.trim() || '—';
  }

  getStudentPhone(request: ClearanceRequest): string {
    const user = this.getStudentData(request.studentId);
    return request.phoneNumber?.trim() || user?.phoneNumber?.trim() || user?.phone?.trim() || '—';
  }

  getStudentProgramme(request: ClearanceRequest): string {
    return request.programme?.trim() || this.getStudentData(request.studentId)?.programme?.trim() || '—';
  }

  getItemPhoto(item: UnifiedFinanceItem): string | null {
    let photo = item.clearanceRequest?.photo;
    if (!photo) {
      const user = this.getStudentData(item.studentId);
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

  getItemInitials(item: UnifiedFinanceItem): string {
    const name = item.studentName;
    if (!name || name === 'Student') return 'ST';
    const parts = name.split(' ').filter(Boolean);
    let initials = '';
    for (let i = 0; i < parts.length && i < 2; i++) {
      initials += parts[i].charAt(0);
    }
    return initials.toUpperCase() || 'ST';
  }

  openEnlargedPhoto(photoUrl: string | null): void {
    if (photoUrl) {
      this.enlargedPhotoUrl = photoUrl;
    }
  }

  closeEnlargedPhoto(): void {
    this.enlargedPhotoUrl = null;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
