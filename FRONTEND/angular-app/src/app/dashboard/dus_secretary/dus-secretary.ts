import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { TranscriptPaymentService } from '../../core/services/transcript-payment.service';
import { ReceiptFileStoreService } from '../../core/services/receipt-file-store.service';
import { CollectionStationService, CollectionStation } from '../../core/services/collection-station.service';
import { TranscriptPaymentRequest } from '../../transcript/transcript-payment.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { ConfigService } from '../../core/services/config.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-dus-secretary-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './dus-secretary.html',
  styleUrl: './dus-secretary.css'
})
export class DusSecretaryDashboardComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly transcriptService = inject(TranscriptPaymentService);
  private readonly receiptFileStore = inject(ReceiptFileStoreService);
  private readonly stationService = inject(CollectionStationService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly notificationService = inject(NotificationService);
  private unreadSub?: Subscription;

  sidebarOpen = false;
  unreadNotifications = 0;
  activeSection: 'verification' | 'dispatch' | 'pipeline' | 'personnel' = 'verification';
  requests: TranscriptPaymentRequest[] = [];
  stations: CollectionStation[] = [];
  selectedDispatchStationCode: string = 'UDSM-MAIN';
  searchTerm = '';
  filterTab: 'ALL' | 'PHYSICAL' | 'DHL' | 'PENDING' | 'DISPATCHED' = 'ALL';

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  loadError = '';
  isProcessing = false;
  isSavingSecretary = false;
  togglingSecretaryId: string | null = null;

  // Digital Signature Modal State
  showSignatureModal = false;
  selectedSigRequest: TranscriptPaymentRequest | null = null;
  signatureForm = {
    secretaryName: 'DUS Examination Office',
    title: 'Directorate of Undergraduate Studies (DUS)',
    stampNote: 'Official Certificate & Transcript Release Verification'
  };

  // Station Secretary Management State
  stationSecretaries: any[] = [];
  showStationSecretaryModal = false;
  showSecretaryListModal = false;
  isEditingSecretary = false;
  secretaryForm = {
    id: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    stationCode: 'COICT-HUB',
    password: '',
    active: true
  };

  // Caution & Confirmation Modal State
  showCautionModal = false;
  cautionTitle = '⚠️ Caution & Action Confirmation';
  cautionMessage = '';
  pendingActionType: 'VERIFY_CERTIFICATE' | 'UPDATE_DISPATCH' | 'APPLY_SIGNATURE' | null = null;
  pendingActionData: { request: TranscriptPaymentRequest; verified?: boolean; status?: 'Pending Dispatch' | 'Dispatched' | 'Collected' } | null = null;

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get userInitials(): string {
    const name = String(this.currentUser?.fullName || 'DUS');
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase() || '')
      .join('') || 'DU';
  }

  isLoadingRequests = false;

  ngOnInit(): void {
    const initialTab = this.route.snapshot.queryParamMap.get('tab');
    if (initialTab && ['verification', 'dispatch', 'pipeline', 'personnel'].includes(initialTab)) {
      this.activeSection = initialTab as any;
    }
    this.unreadSub = this.notificationService.unreadCount$.subscribe(count => {
      this.unreadNotifications = count;
    });
    this.notificationService.refreshUnreadCount().subscribe();

    this.loadStations();
    this.loadRequests();
    this.loadStationSecretaries();
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
    this.closeStudentDocumentsModal();
    this.closeReceiptView();
  }

  refreshAll(): void {
    this.loadStations();
    this.loadRequests();
    this.loadStationSecretaries();
    this.notificationService.refreshUnreadCount().subscribe();
  }

  loadStations(): void {
    this.stationService.getActiveStations().subscribe({
      next: (list) => {
        this.stations = (list || []).map(s => ({
          ...s,
          name: s.name.replace(/^udsm/i, 'UDSM'),
          code: s.code.toUpperCase()
        }));
        if (this.stations.length > 0 && !this.selectedDispatchStationCode) {
          this.selectedDispatchStationCode = this.stations[0].code;
        }
      },
      error: (err) => console.error('Failed to load collection stations:', err)
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Server-side pagination & authoritative SQL KPI counts across the entire registry
  serverStats: {
    totalStudents: number;
    verifiedCount: number;
    unverifiedCount: number;
    pendingDispatchCount: number;
    inTransitCount: number;
    inVaultCount: number;
    collectedCount: number;
  } | null = null;
  serverStationStats: { stationCode: string; total: number; inTransit: number; inVault: number; collected: number }[] = [];
  serverTotalFiltered = 0;
  serverTotalPages = 1;
  private searchDebounceTimer: any = null;

  loadRequests(): void {
    this.isLoadingRequests = true;
    this.loadError = '';
    const params = new URLSearchParams({
      paginated: 'true',
      page: String(this.currentPage),
      pageSize: String(this.pageSize),
      section: this.activeSection,
      filterTab: this.filterTab
    });
    if (this.searchTerm.trim()) {
      params.set('query', this.searchTerm.trim());
    }
    const url = `${this.config.apiUrl}/dus-secretary/students?${params.toString()}`;
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    this.http.get<any>(url, { headers, withCredentials: true }).subscribe({
      next: (resp) => {
        this.isLoadingRequests = false;
        if (resp && !Array.isArray(resp) && Array.isArray(resp.items)) {
          this.requests = resp.items.map((s: any) => this.mapStudentToRequest(s));
          this.serverTotalFiltered = Number(resp.total ?? this.requests.length);
          this.serverTotalPages = Math.max(1, Number(resp.totalPages ?? 1));
          this.currentPage = Math.max(1, Math.min(Number(resp.page ?? this.currentPage), this.serverTotalPages));
          this.serverStats = resp.stats || null;
          this.serverStationStats = Array.isArray(resp.stationStats) ? resp.stationStats : [];
        } else {
          // Legacy array fallback
          const students = Array.isArray(resp) ? resp : [];
          this.serverStats = null;
          this.serverStationStats = [];
          const backendRequests = students.map(s => this.mapStudentToRequest(s));
          this.mergeRequests(backendRequests);
          this.serverTotalFiltered = this.requests.length;
          this.serverTotalPages = Math.max(1, Math.ceil(this.requests.length / this.pageSize));
        }
      },
      error: (err) => {
        this.isLoadingRequests = false;
        this.loadError = err?.error?.message || 'Unable to load certificate verification records from the server.';
        console.error('Failed to load students from backend:', err);
        this.serverStats = null;
        this.mergeRequests([]);
      }
    });
  }

  private mergeRequests(backendRequests: TranscriptPaymentRequest[]): void {
    const localRequests = this.transcriptService.getAllRequests();
    const combinedMap = new Map<string, TranscriptPaymentRequest>();

    // Add local requests
    for (const lReq of localRequests) {
      const key = (lReq.registrationNumber || lReq.studentId || lReq.id || '').trim().toLowerCase();
      if (key) {
        combinedMap.set(key, lReq);
      }
    }

    // Add/merge backend requests
    for (const bReq of backendRequests) {
      const key = (bReq.registrationNumber || bReq.studentId || bReq.id || '').trim().toLowerCase();
      if (key) {
        if (combinedMap.has(key)) {
          const existing = combinedMap.get(key)!;
          combinedMap.set(key, {
            ...existing,
            ...bReq,
            studentName: bReq.studentName || existing.studentName,
            registrationNumber: bReq.registrationNumber || existing.registrationNumber,
            award: bReq.award || existing.award,
            certificateVerified: bReq.certificateVerified ?? existing.certificateVerified,
            certificateVerifiedAt: bReq.certificateVerifiedAt || existing.certificateVerifiedAt,
            digitalSignatureHash: bReq.digitalSignatureHash || existing.digitalSignatureHash,
            signedBy: bReq.signedBy || existing.signedBy,
            dispatchStatus: bReq.dispatchStatus || existing.dispatchStatus,
            intakeStatus: bReq.intakeStatus || existing.intakeStatus,
            vaultLockerNumber: bReq.vaultLockerNumber || existing.vaultLockerNumber,
            stationCode: bReq.stationCode || existing.stationCode,
            stationName: bReq.stationName || existing.stationName
          });
        } else {
          combinedMap.set(key, bReq);
        }
      }
    }

    this.requests = Array.from(combinedMap.values());
  }

  // Selected receipt for preview modal
  selectedReceiptView: {
    fileName: string;
    dataUrl: string;
    blobUrl: string | null;
    safeResourceUrl: SafeResourceUrl | null;
    isPdf: boolean;
    isImage: boolean;
    studentName: string;
    copyNumber?: number;
    totalCopies?: number;
  } | null = null;

  // Student Transcript & Clearance Documents Viewer Modal State
  selectedStudentDocModal: {
    request: TranscriptPaymentRequest;
    documents: any[];
    loading: boolean;
    docLoadError: string;
    activeDoc: any | null;
    activeDocSafeUrl: SafeResourceUrl | null;
    activeDocBlobUrl: string | null;
    isPdf: boolean;
    isImage: boolean;
  } | null = null;

  openStudentDocumentsModal(req: TranscriptPaymentRequest): void {
    this.selectedStudentDocModal = {
      request: req,
      documents: [],
      loading: true,
      docLoadError: '',
      activeDoc: null,
      activeDocSafeUrl: null,
      activeDocBlobUrl: null,
      isPdf: false,
      isImage: false
    };

    const studentIdentifier = req.registrationNumber || req.studentId;
    const url = `${this.config.apiUrl}/dus-secretary/students/${encodeURIComponent(studentIdentifier)}/documents`;
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    const appendPaymentReceiptIfPresent = (existingDocs: any[] = []) => {
      const docsList = [...existingDocs];
      const hasReceipt = req.receiptFileName || req.receiptData || (req.receipts && req.receipts.length > 0);
      if (hasReceipt) {
        const rawData = req.receiptData || (req.receipts && req.receipts[0]?.receiptData) || '';
        const storageId = req.receiptStorageId || (req.receipts && req.receipts[0]?.storageId);
        const fileName = req.receiptFileName || (req.receipts && req.receipts[0]?.fileName) || 'Payment Receipt';

        docsList.unshift({
          id: 'receipt-' + req.id,
          fileName: fileName,
          fileType: 'Bank / Treasury Receipt',
          category: 'Finance Payment',
          rawData: rawData,
          storageId: storageId,
          mimeType: req.receiptMimeType,
          uploadDate: req.receiptSubmittedAt || req.requestedAt,
          verified: true,
          isPaymentReceipt: true
        });
      }
      return docsList;
    };

    this.http.get<any[]>(url, { headers, withCredentials: true }).subscribe({
      next: (docs) => {
        if (!this.selectedStudentDocModal) return;
        this.selectedStudentDocModal.loading = false;
        this.selectedStudentDocModal.docLoadError = '';
        this.selectedStudentDocModal.documents = appendPaymentReceiptIfPresent(docs || []);
        if (this.selectedStudentDocModal.documents.length > 0) {
          this.selectDocForPreview(this.selectedStudentDocModal.documents[0]);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load student documents from server:', err);
        if (!this.selectedStudentDocModal) return;
        this.selectedStudentDocModal.loading = false;
        this.selectedStudentDocModal.docLoadError = err?.error?.message || 'Unable to load uploaded student documents from the server.';
        this.selectedStudentDocModal.documents = appendPaymentReceiptIfPresent([]);
        if (this.selectedStudentDocModal.documents.length > 0) {
          this.selectDocForPreview(this.selectedStudentDocModal.documents[0]);
        }
        this.cdr.detectChanges();
      }
    });
  }

  async selectDocForPreview(doc: any): Promise<void> {
    if (!this.selectedStudentDocModal) return;

    if (this.selectedStudentDocModal.activeDocBlobUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.selectedStudentDocModal.activeDocBlobUrl);
    }

    this.selectedStudentDocModal.activeDoc = doc;
    this.selectedStudentDocModal.activeDocSafeUrl = null;
    this.selectedStudentDocModal.activeDocBlobUrl = null;

    let resolvedDataUrl: string | null = null;
    if (doc.rawData || doc.storageId) {
      resolvedDataUrl = await this.receiptFileStore.resolveDataUrl(doc.rawData || '', doc.storageId);
    } else if (doc.fileUrl) {
      if (doc.fileUrl.startsWith('http://') || doc.fileUrl.startsWith('https://') || doc.fileUrl.startsWith('data:')) {
        resolvedDataUrl = doc.fileUrl;
      } else if (doc.fileUrl.startsWith('/api/') || doc.fileUrl.startsWith('/uploads/')) {
        resolvedDataUrl = `${this.config.apiOrigin}${doc.fileUrl}`;
      } else if (doc.fileUrl.startsWith('/')) {
        resolvedDataUrl = doc.fileUrl;
      } else {
        resolvedDataUrl = `${this.config.apiUrl}/${doc.fileUrl}`;
      }
    }

    const isPdf = this.receiptFileStore.isPdf(resolvedDataUrl ?? undefined, doc.fileName, doc.mimeType);
    const isImage = !isPdf && this.receiptFileStore.isImage(resolvedDataUrl ?? undefined, doc.fileName, doc.mimeType);
    const blobUrl = (resolvedDataUrl && resolvedDataUrl.startsWith('data:'))
      ? this.receiptFileStore.dataUrlToBlobUrl(resolvedDataUrl, doc.fileName)
      : resolvedDataUrl;

    this.selectedStudentDocModal.isPdf = isPdf;
    this.selectedStudentDocModal.isImage = isImage;
    this.selectedStudentDocModal.activeDocBlobUrl = blobUrl;
    this.selectedStudentDocModal.activeDocSafeUrl = blobUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl) : null;
    this.cdr.detectChanges();
  }

  closeStudentDocumentsModal(): void {
    if (this.selectedStudentDocModal?.activeDocBlobUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.selectedStudentDocModal.activeDocBlobUrl);
    }
    this.selectedStudentDocModal = null;
  }

  verifyFromModal(request: TranscriptPaymentRequest): void {
    this.closeStudentDocumentsModal();
    this.onCertificateCheckboxChange(request, true);
  }

  async viewReceipt(req: TranscriptPaymentRequest): Promise<void> {
    const rawData = req.receiptData || (req.receipts && req.receipts[0]?.receiptData) || '';
    const storageId = req.receiptStorageId || (req.receipts && req.receipts[0]?.storageId);
    const fileName = req.receiptFileName || (req.receipts && req.receipts[0]?.fileName) || 'Receipt';
    const resolved = await this.receiptFileStore.resolveDataUrl(rawData, storageId);
    const isPdf = this.receiptFileStore.isPdf(resolved ?? undefined, fileName, req.receiptMimeType);
    const isImage = !isPdf && this.receiptFileStore.isImage(resolved ?? undefined, fileName, req.receiptMimeType);
    const blobUrl = resolved ? this.receiptFileStore.dataUrlToBlobUrl(resolved, fileName) : null;

    this.selectedReceiptView = {
      fileName,
      dataUrl: resolved || '',
      blobUrl,
      safeResourceUrl: blobUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl) : null,
      isPdf,
      isImage,
      studentName: req.studentName,
      copyNumber: req.copyNumber,
      totalCopies: req.totalCopies
    };
    this.cdr.detectChanges();
  }

  closeReceiptView(): void {
    if (this.selectedReceiptView?.blobUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.selectedReceiptView.blobUrl);
    }
    this.selectedReceiptView = null;
  }

  private mapStudentToRequest(s: any): TranscriptPaymentRequest {
    return {
      id: s.id,
      studentId: s.id,
      studentName: s.fullName,
      registrationNumber: s.registrationNumber,
      award: s.programme || 'Degree Certificate & Transcript',
      graduationYear: s.graduationYear || '',
      transcriptCount: 1,
      amount: 15000,
      currency: 'TZS',
      attemptNumber: 1,
      status: 'Paid',
      controlNumber: s.controlNumber || '',
      requestedAt: s.createdAt || new Date().toISOString(),
      collectionMethod: s.collectionMethod || 'Physical Collection',
      postingRegion: s.college || 'Dar es Salaam',
      postingAddress: s.stationName || s.department || 'DUS Directorate Office',
      postingContactPhone: s.phoneNumber || '',
      postingContactEmail: s.email || '',
      dispatchStatus: s.dispatchStatus || 'Pending Dispatch',
      dispatchedAt: s.dispatchedAt,
      certificateVerified: Boolean(s.certificateVerified),
      certificateVerifiedAt: s.certificateVerifiedAt,
      digitalSignatureHash: s.digitalSignatureHash,
      signedBy: s.signedBy,
      signedAt: s.signedAt,
      stationCode: s.stationCode,
      stationName: s.stationName,
      intakeStatus: s.intakeStatus,
      vaultLockerNumber: s.vaultLockerNumber,
      handoverReceiptToken: s.handoverReceiptToken
    };
  }

  setSection(sec: 'verification' | 'dispatch' | 'pipeline' | 'personnel'): void {
    this.activeSection = sec;
    this.filterTab = 'ALL';
    this.searchTerm = '';
    this.currentPage = 1;
    if (sec === 'verification' || sec === 'dispatch' || sec === 'pipeline') {
      this.loadRequests();
    }
  }

  setFilterTab(tab: 'ALL' | 'PHYSICAL' | 'DHL' | 'PENDING' | 'DISPATCHED'): void {
    this.filterTab = tab;
    this.currentPage = 1;
    this.loadRequests();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.loadRequests();
    }, 300);
  }

  // Summary Metrics (Authoritative SQL counts across all 5,316+ students when connected)
  get totalRequests(): number {
    return this.serverStats ? this.serverStats.totalStudents : this.requests.length;
  }

  get unverifiedCount(): number {
    return this.serverStats ? this.serverStats.unverifiedCount : this.requests.filter(r => !r.certificateVerified).length;
  }

  get verifiedCount(): number {
    return this.serverStats ? this.serverStats.verifiedCount : this.requests.filter(r => !!r.certificateVerified).length;
  }

  get pendingDispatchCount(): number {
    return this.serverStats
      ? this.serverStats.pendingDispatchCount
      : this.requests.filter(r => r.certificateVerified && r.dispatchStatus !== 'Dispatched' && r.dispatchStatus !== 'Collected').length;
  }

  get inTransitCount(): number {
    return this.serverStats
      ? this.serverStats.inTransitCount
      : this.requests.filter(r => r.dispatchStatus === 'Dispatched' && r.intakeStatus !== 'Received at Station' && r.intakeStatus !== 'Collected by Student').length;
  }

  get inVaultCount(): number {
    return this.serverStats
      ? this.serverStats.inVaultCount
      : this.requests.filter(r => r.intakeStatus === 'Received at Station').length;
  }

  get physicalPending(): number {
    return this.requests.filter(r => r.collectionMethod === 'Physical Collection' && r.dispatchStatus !== 'Collected').length;
  }

  get dhlPending(): number {
    return this.requests.filter(r => r.collectionMethod === 'Post by DHL' && r.dispatchStatus !== 'Dispatched').length;
  }

  get dispatchedCount(): number {
    return this.serverStats
      ? (this.serverStats.inTransitCount + this.serverStats.inVaultCount + this.serverStats.collectedCount)
      : this.requests.filter(r => r.dispatchStatus === 'Dispatched' || r.dispatchStatus === 'Collected').length;
  }

  // Station pipeline overview across all stations
  get stationPipelineStats(): any[] {
    if (this.serverStats) {
      return this.stations.map(st => {
        const match = this.serverStationStats.find(
          s => s.stationCode && s.stationCode.toLowerCase() === st.code.toLowerCase()
        );
        return {
          station: st,
          inTransit: match?.inTransit || 0,
          inVault: match?.inVault || 0,
          collected: match?.collected || 0,
          total: match?.total || 0
        };
      });
    }
    return this.stations.map(st => {
      const stRequests = this.requests.filter(r =>
        (r.stationCode && r.stationCode.toLowerCase() === st.code.toLowerCase()) ||
        (r.stationName && r.stationName.toLowerCase().includes(st.name.toLowerCase())) ||
        (r.postingRegion && r.postingRegion.toLowerCase() === st.region.toLowerCase())
      );
      return {
        station: st,
        inTransit: stRequests.filter(r => r.dispatchStatus === 'Dispatched' && r.intakeStatus !== 'Received at Station' && r.intakeStatus !== 'Collected by Student').length,
        inVault: stRequests.filter(r => r.intakeStatus === 'Received at Station').length,
        collected: stRequests.filter(r => r.dispatchStatus === 'Collected' || r.intakeStatus === 'Collected by Student').length,
        total: stRequests.length
      };
    });
  }

  // Filtered List & Pagination
  currentPage = 1;
  pageSize = 25;

  get displayTotalRecords(): number {
    return this.serverStats ? this.serverTotalFiltered : this.filteredRequests.length;
  }

  get totalPages(): number {
    if (this.serverStats) {
      return this.serverTotalPages;
    }
    return Math.max(1, Math.ceil(this.filteredRequests.length / this.pageSize));
  }

  get paginatedRequests(): TranscriptPaymentRequest[] {
    if (this.serverStats) {
      return this.requests;
    }
    const safePage = Math.min(this.currentPage, this.totalPages);
    const start = (safePage - 1) * this.pageSize;
    return this.filteredRequests.slice(start, start + this.pageSize);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      if (this.serverStats) {
        this.loadRequests();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      if (this.serverStats) {
        this.loadRequests();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  get filteredRequests(): TranscriptPaymentRequest[] {
    return this.requests.filter(r => {
      // Tab-specific filters
      if (this.activeSection === 'verification') {
        if (this.filterTab === 'PENDING' && r.certificateVerified) return false;
        if (this.filterTab === 'DISPATCHED' && !r.certificateVerified) return false;
      } else if (this.activeSection === 'dispatch') {
        if (this.filterTab === 'PHYSICAL' && r.collectionMethod !== 'Physical Collection') return false;
        if (this.filterTab === 'DHL' && r.collectionMethod !== 'Post by DHL') return false;
        if (this.filterTab === 'PENDING' && (r.dispatchStatus === 'Dispatched' || r.dispatchStatus === 'Collected')) return false;
        if (this.filterTab === 'DISPATCHED' && r.dispatchStatus !== 'Dispatched' && r.dispatchStatus !== 'Collected') return false;
      }

      if (this.searchTerm.trim()) {
        const q = this.searchTerm.trim().toLowerCase();
        const matchName = r.studentName?.toLowerCase().includes(q);
        const matchReg = r.registrationNumber?.toLowerCase().includes(q);
        const matchControl = r.controlNumber?.toLowerCase().includes(q);
        const matchRegion = r.postingRegion?.toLowerCase().includes(q);
        const matchPhone = r.postingContactPhone?.toLowerCase().includes(q);
        const matchSig = r.digitalSignatureHash?.toLowerCase().includes(q);
        return matchName || matchReg || matchControl || matchRegion || matchPhone || matchSig;
      }
      return true;
    });
  }

  // CAUTION & CONFIRMATION TRIGGERS
  onCertificateCheckboxChange(request: TranscriptPaymentRequest, verified: boolean): void {
    this.pendingActionType = 'VERIFY_CERTIFICATE';
    this.pendingActionData = { request, verified };
    this.cautionTitle = verified ? '⚠️ Confirm Certificate Verification' : '⚠️ Lock Certificate Verification';
    this.cautionMessage = verified
      ? `Are you sure you want to verify the Education Certificate for ${request.studentName} (${request.registrationNumber})? This will automatically generate a digital signature seal, save to database, notify the student, and unlock dispatch state controls.`
      : `Are you sure you want to uncheck certificate verification for ${request.studentName}? Dispatch state controls will be locked.`;
    this.showCautionModal = true;
  }

  onDispatchSelectChange(request: TranscriptPaymentRequest, newStatus: 'Pending Dispatch' | 'Dispatched' | 'Collected'): void {
    this.pendingActionType = 'UPDATE_DISPATCH';
    this.pendingActionData = { request, status: newStatus };

    if (newStatus === 'Dispatched') {
      // Auto-determine best default station for this student
      let defaultCode = request.stationCode;
      if (!defaultCode) {
        const regionOrCollege = (request.postingRegion || request.postingAddress || '').toLowerCase();
        const found = this.stations.find(s =>
          (s.code && regionOrCollege.includes(s.code.toLowerCase())) ||
          (s.name && s.name.toLowerCase().includes(regionOrCollege)) ||
          (s.region && regionOrCollege.includes(s.region.toLowerCase()))
        );
        defaultCode = found ? found.code : (this.stations.length > 0 ? this.stations[0].code : 'UDSM-MAIN');
      }
      this.selectedDispatchStationCode = defaultCode;
      this.cautionTitle = '📦 Dispatch Consignment to Station Secretary';
      this.cautionMessage = `Select the destination DUS Station Secretary where the Certificate & Transcript for ${request.studentName} (${request.registrationNumber}) will be routed:`;
    } else {
      this.cautionTitle = '⚠️ Confirm Dispatch State Update';
      this.cautionMessage = `Are you sure you want to change dispatch status to "${newStatus}" for ${request.studentName}? This will save to the database and update the student's status.`;
    }
    this.showCautionModal = true;
  }

  onApplySignatureClick(): void {
    if (!this.selectedSigRequest) return;
    this.pendingActionType = 'APPLY_SIGNATURE';
    this.pendingActionData = { request: this.selectedSigRequest };
    this.cautionTitle = '⚠️ Confirm Directorate Digital Seal & Signature';
    this.cautionMessage = `Are you sure you want to apply the official Directorate Digital Seal and Signature token to ${this.selectedSigRequest.studentName}? This action will permanently sign and certify the release record in the database.`;
    this.showCautionModal = true;
  }

  confirmCautionAction(): void {
    if (!this.pendingActionData || !this.pendingActionType) return;

    this.showCautionModal = false;
    const { request, verified, status } = this.pendingActionData;

    switch (this.pendingActionType) {
      case 'VERIFY_CERTIFICATE':
        if (verified !== undefined) {
          this.executeCertificateVerification(request, verified);
        }
        break;
      case 'UPDATE_DISPATCH':
        if (status) {
          this.executeUpdateDispatchStatus(request, status);
        }
        break;
      case 'APPLY_SIGNATURE':
        this.executeApplySignature();
        break;
    }

    this.pendingActionType = null;
    this.pendingActionData = null;
  }

  cancelCautionAction(): void {
    this.showCautionModal = false;
    this.pendingActionType = null;
    this.pendingActionData = null;
    this.loadRequests();
  }

  // EXECUTE ACTIONS AFTER CONFIRMATION (WITH SERVER-VERIFIED DATABASE PERSISTENCE)
  private executeCertificateVerification(request: TranscriptPaymentRequest, verified: boolean): void {
    if (this.isProcessing) return;
    const studentIdentifier = request.registrationNumber || request.studentId;
    if (!studentIdentifier) {
      this.showToast('Missing student identifier for verification.', 'error');
      return;
    }

    this.isProcessing = true;
    const sigHash = verified
      ? (request.digitalSignatureHash || 'UDSM-DUS-SIG-' + Math.floor(100000000 + Math.random() * 900000000))
      : request.digitalSignatureHash;
    const signer = verified
      ? (request.signedBy || this.currentUser?.fullName || 'DUS Examination Office')
      : request.signedBy;

    const payload = {
      studentId: studentIdentifier,
      verified,
      digitalSignatureHash: sigHash,
      signedBy: signer
    };

    const url = `${this.config.apiUrl}/dus-secretary/verify-certificate`;
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    this.http.post(url, payload, { headers, withCredentials: true }).subscribe({
      next: () => {
        this.isProcessing = false;
        request.certificateVerified = verified;
        this.transcriptService.updateVerificationStatus(request.id, verified);

        if (verified) {
          request.certificateVerifiedAt = new Date().toISOString();
          request.digitalSignatureHash = sigHash;
          request.signedBy = signer;
          request.signedAt = new Date().toISOString();
          this.autoNotifyRelease(request);
          this.loadRequests();
        } else {
          this.showToast(`Verification unchecked for ${request.studentName}. Dispatch controls locked.`, 'error');
          this.loadRequests();
        }
      },
      error: (err) => {
        this.isProcessing = false;
        this.showToast(err?.error?.message || 'Failed to save certificate verification to server.', 'error');
        this.loadRequests();
      }
    });
  }

  private executeUpdateDispatchStatus(request: TranscriptPaymentRequest, status: 'Pending Dispatch' | 'Dispatched' | 'Collected'): void {
    if (this.isProcessing) return;
    const studentIdentifier = request.registrationNumber || request.studentId;
    if (!studentIdentifier) {
      this.showToast('Missing student identifier for dispatch update.', 'error');
      return;
    }

    this.isProcessing = true;
    const targetStation = status === 'Dispatched'
      ? this.stations.find(s => s.code === this.selectedDispatchStationCode)
      : undefined;
    const nextStationCode = status === 'Dispatched'
      ? (targetStation?.code || this.selectedDispatchStationCode)
      : (request.stationCode || this.selectedDispatchStationCode);
    const nextStationName = status === 'Dispatched'
      ? (targetStation?.name || request.stationName)
      : request.stationName;
    const nextIntakeStatus: 'In-Transit' | 'Collected by Student' | 'Awaiting Intake' =
      status === 'Dispatched'
        ? 'In-Transit'
        : (status === 'Collected' ? 'Collected by Student' : 'Awaiting Intake');

    const url = `${this.config.apiUrl}/dus-secretary/update-dispatch`;
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    const payload = {
      studentId: studentIdentifier,
      dispatchStatus: status,
      stationCode: nextStationCode,
      stationName: nextStationName,
      intakeStatus: nextIntakeStatus
    };

    this.http.post(url, payload, { headers, withCredentials: true }).subscribe({
      next: () => {
        this.isProcessing = false;
        request.dispatchStatus = status;
        request.stationCode = nextStationCode;
        request.stationName = nextStationName;
        request.intakeStatus = nextIntakeStatus;

        if (status === 'Dispatched') {
          request.dispatchedAt = new Date().toISOString();
          this.transcriptService.markDispatched(request.id);
        } else {
          this.transcriptService.updateCollectionDetails(
            request.id,
            request.collectionMethod || 'Physical Collection',
            request.postingAddress || '',
            request.postingRegion,
            request.postingWard,
            request.postingPoBox,
            request.postingContactPhone,
            request.postingContactEmail
          );
        }

        const destMsg = nextStationName ? ` routed to ${nextStationName}` : '';
        this.showToast(`Consignment dispatch updated to "${status}"${destMsg} for ${request.studentName}.`, 'success');
        this.loadRequests();
      },
      error: (err) => {
        this.isProcessing = false;
        this.showToast(err?.error?.message || 'Failed to update consignment dispatch status on the server.', 'error');
        this.loadRequests();
      }
    });
  }

  private executeApplySignature(): void {
    if (!this.selectedSigRequest || this.isProcessing) return;
    const targetReq = this.selectedSigRequest;
    const studentIdentifier = targetReq.registrationNumber || targetReq.studentId;
    if (!studentIdentifier) {
      this.showToast('Missing student identifier for digital seal.', 'error');
      return;
    }

    this.isProcessing = true;
    const sigHash = 'UDSM-DUS-SIG-' + Math.floor(100000000 + Math.random() * 900000000);
    const signer = `${this.signatureForm.secretaryName} (${this.signatureForm.title})`;

    const url = `${this.config.apiUrl}/dus-secretary/verify-certificate`;
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    this.http.post(url, {
      studentId: studentIdentifier,
      verified: true,
      digitalSignatureHash: sigHash,
      signedBy: signer
    }, { headers, withCredentials: true }).subscribe({
      next: () => {
        this.isProcessing = false;
        targetReq.certificateVerified = true;
        targetReq.certificateVerifiedAt = new Date().toISOString();
        targetReq.digitalSignatureHash = sigHash;
        targetReq.signedBy = signer;
        targetReq.signedAt = new Date().toISOString();

        this.transcriptService.applyDigitalSignature(targetReq.id, 'DUS_OFFICIAL_DIGITAL_STAMP', sigHash, signer);
        this.transcriptService.updateVerificationStatus(targetReq.id, true);

        this.closeSignatureModal();
        this.autoNotifyRelease(targetReq);
      },
      error: (err) => {
        this.isProcessing = false;
        this.showToast(err?.error?.message || 'Failed to apply Directorate Digital Seal on the server.', 'error');
        this.loadRequests();
      }
    });
  }

  // Digital Signature Modal Handlers
  openSignatureModal(request: TranscriptPaymentRequest): void {
    this.selectedSigRequest = request;
    this.signatureForm.secretaryName = this.currentUser?.fullName || 'DUS Examination Office';
    this.showSignatureModal = true;
  }

  closeSignatureModal(): void {
    this.showSignatureModal = false;
    this.selectedSigRequest = null;
  }

  autoNotifyRelease(request: TranscriptPaymentRequest): void {
    const studentIdentifier = request.registrationNumber || request.studentId;
    if (!studentIdentifier) return;

    const payload = {
      studentId: studentIdentifier,
      studentName: request.studentName,
      releaseType: 'Academic Transcript & Degree Certificate',
      releaseDate: new Date().toISOString().split('T')[0],
      instructions: request.collectionMethod === 'Post by DHL'
        ? `Education Certificate verified and digitally signed. Dispatched via DHL Courier Service to ${request.postingRegion || 'specified address'}.`
        : 'Education Certificate verified and digitally signed. Please visit DUS Examination Office Room 102 with your valid Student ID or National ID.',
      trackingNumber: '',
      customNote: `Digitally Signed and Sealed by ${request.signedBy || 'DUS Examination Office'} (${request.digitalSignatureHash || 'UDSM-DUS-SIG-SEALED'}).`
    };

    const url = `${this.config.apiUrl}/dus-secretary/notify-release`;
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    this.http.post(url, payload, { headers, withCredentials: true }).subscribe({
      next: (res: any) => {
        this.showToast(`Certificate verified, sealed & release notification sent to ${res.studentName || request.studentName}.`, 'success');
        this.loadRequests();
      },
      error: () => {
        this.showToast(`Certificate verified and sealed for ${request.studentName}, but the release notification could not be sent.`, 'error');
        this.loadRequests();
      }
    });
  }

  // =========================================================================
  // STATION SECRETARY USER MANAGEMENT
  // =========================================================================

  loadStationSecretaries(): void {
    const url = `${this.config.apiUrl}/dus-secretary/station-secretaries`;
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    this.http.get<any[]>(url, { headers, withCredentials: true }).subscribe({
      next: (list) => {
        this.stationSecretaries = list || [];
      },
      error: (err) => {
        console.error('Failed to load station secretaries:', err);
        this.stationSecretaries = [];
      }
    });
  }

  openAddStationSecretaryModal(): void {
    const defaultStation = this.stations.length > 0 ? this.stations[0].code : 'COICT-HUB';
    this.isEditingSecretary = false;
    this.secretaryForm = {
      id: '',
      fullName: '',
      email: '',
      phoneNumber: '',
      stationCode: defaultStation,
      password: '',
      active: true
    };
    this.showStationSecretaryModal = true;
  }

  openEditStationSecretaryModal(sec: any): void {
    this.isEditingSecretary = true;
    this.secretaryForm = {
      id: sec.id,
      fullName: sec.fullName,
      email: sec.email,
      phoneNumber: sec.phoneNumber || '',
      stationCode: sec.stationCode || 'COICT-HUB',
      password: '',
      active: sec.active
    };
    this.showStationSecretaryModal = true;
  }

  closeStationSecretaryModal(): void {
    this.showStationSecretaryModal = false;
  }

  saveStationSecretary(): void {
    if (this.isSavingSecretary) return;
    if (!this.secretaryForm.fullName || !this.secretaryForm.fullName.trim()) {
      this.showToast('Full name is required.', 'error');
      return;
    }
    if (!this.secretaryForm.email || !this.secretaryForm.email.trim()) {
      this.showToast('Email address is required.', 'error');
      return;
    }
    if (!this.secretaryForm.stationCode) {
      this.showToast('Please select a collection station.', 'error');
      return;
    }

    this.isSavingSecretary = true;
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    if (this.isEditingSecretary && this.secretaryForm.id) {
      const url = `${this.config.apiUrl}/dus-secretary/station-secretaries/${this.secretaryForm.id}`;
      const payload: any = {
        fullName: this.secretaryForm.fullName.trim(),
        phoneNumber: this.secretaryForm.phoneNumber ? this.secretaryForm.phoneNumber.trim() : '',
        stationCode: this.secretaryForm.stationCode,
        active: this.secretaryForm.active
      };
      if (this.secretaryForm.password && this.secretaryForm.password.trim()) {
        payload.password = this.secretaryForm.password.trim();
      }

      this.http.put(url, payload, { headers, withCredentials: true }).subscribe({
        next: (res: any) => {
          this.isSavingSecretary = false;
          this.showToast(`Station Secretary ${res.fullName || ''} updated successfully.`, 'success');
          this.loadStationSecretaries();
          this.closeStationSecretaryModal();
        },
        error: (err) => {
          this.isSavingSecretary = false;
          const msg = err.error?.message || 'Failed to update station secretary.';
          this.showToast(msg, 'error');
        }
      });
    } else {
      const url = `${this.config.apiUrl}/dus-secretary/station-secretaries`;
      const payload = {
        fullName: this.secretaryForm.fullName.trim(),
        email: this.secretaryForm.email.trim().toLowerCase(),
        phoneNumber: this.secretaryForm.phoneNumber ? this.secretaryForm.phoneNumber.trim() : '',
        stationCode: this.secretaryForm.stationCode,
        password: this.secretaryForm.password && this.secretaryForm.password.trim() ? this.secretaryForm.password.trim() : 'UDSM@Station2026'
      };

      this.http.post(url, payload, { headers, withCredentials: true }).subscribe({
        next: (res: any) => {
          this.isSavingSecretary = false;
          this.showToast(`Station Secretary ${res.fullName} created for ${res.stationName || res.stationCode}.`, 'success');
          this.loadStationSecretaries();
          this.closeStationSecretaryModal();
        },
        error: (err) => {
          this.isSavingSecretary = false;
          const msg = err.error?.message || 'Failed to create station secretary.';
          this.showToast(msg, 'error');
        }
      });
    }
  }

  toggleStationSecretaryStatus(sec: any): void {
    if (this.togglingSecretaryId) return;
    this.togglingSecretaryId = sec.id;
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    const url = `${this.config.apiUrl}/dus-secretary/station-secretaries/${sec.id}`;
    const newStatus = !sec.active;

    this.http.put(url, { active: newStatus }, { headers, withCredentials: true }).subscribe({
      next: () => {
        this.togglingSecretaryId = null;
        sec.active = newStatus;
        this.showToast(`Station Secretary ${sec.fullName} is now ${newStatus ? 'Active' : 'Deactivated'}.`, 'success');
      },
      error: (err) => {
        this.togglingSecretaryId = null;
        this.showToast(err?.error?.message || 'Failed to change secretary status.', 'error');
      }
    });
  }

  showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMessage = msg;
    this.toastType = type;
    setTimeout(() => {
      this.toastMessage = '';
    }, 4000);
  }

  getStatusClass(status?: string): string {
    return status ? status.toLowerCase().replace(/\s+/g, '-') : 'pending';
  }
}
