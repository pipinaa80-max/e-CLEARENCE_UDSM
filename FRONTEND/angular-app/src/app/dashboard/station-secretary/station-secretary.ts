import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { TranscriptPaymentService } from '../../core/services/transcript-payment.service';
import { CollectionStationService, CollectionStation } from '../../core/services/collection-station.service';
import { TranscriptPaymentRequest } from '../../transcript/transcript-payment.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { ConfigService } from '../../core/services/config.service';
import { NotificationService } from '../../core/services/notification.service';
import { isPostgraduateEntity } from '../../core/utils/postgraduate.util';

@Component({
  selector: 'app-station-secretary-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './station-secretary.html',
  styleUrl: './station-secretary.css'
})
export class StationSecretaryDashboardComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly transcriptService = inject(TranscriptPaymentService);
  private readonly stationService = inject(CollectionStationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly notificationService = inject(NotificationService);
  private unreadSub?: Subscription;

  sidebarOpen = false;
  unreadNotifications = 0;
  requests: TranscriptPaymentRequest[] = [];
  stations: CollectionStation[] = [];
  selectedStationCode: string = 'ALL';
  currentStation: CollectionStation | null = null;

  searchTerm = '';
  filterTab: 'ALL' | 'IN_TRANSIT' | 'IN_VAULT' | 'COLLECTED' | 'ISSUES' = 'ALL';

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  isLoading = false;
  loadError = '';
  isSubmitting = false;
  remindingId: string | null = null;

  // Barcode / Scanner simulation
  scannerActive = false;
  scannerInput = '';

  // Consignment Intake Modal State (Arrival from Main Campus)
  showIntakeModal = false;
  selectedIntakeRequest: TranscriptPaymentRequest | null = null;
  intakeForm = {
    vaultLocker: '',
    packageCondition: 'Intact & Sealed' as 'Intact & Sealed' | 'Minor Packaging Wear' | 'Damaged in Transit',
    receivedBy: '',
    notes: ''
  };

  // Student Handover & Approval Modal State (At Station Counter)
  showHandoverModal = false;
  selectedHandoverRequest: TranscriptPaymentRequest | null = null;
  handoverForm = {
    collectorType: 'Student in Person' as 'Student in Person' | 'Authorized Legal Representative',
    collectorName: '',
    collectorIdNumber: '',
    collectorPhone: '',
    notes: '',
    idVerified: false,
    clearanceConfirmed: true
  };

  // Printable Handover Proof & Release Receipt Modal
  showReceiptModal = false;
  receiptData: TranscriptPaymentRequest | null = null;

  // Transit Discrepancy Reporting Modal State
  showDiscrepancyModal = false;
  selectedDiscrepancyRequest: TranscriptPaymentRequest | null = null;
  discrepancyForm = {
    issueType: 'Damaged Package in Transit' as 'Damaged Package in Transit' | 'Mismatched Certificate Details' | 'Missing Document Enclosure' | 'Other Discrepancy',
    description: '',
    reportedBy: ''
  };

  // Caution & Confirmation Modal State
  showCautionModal = false;
  cautionTitle = '⚠️ Caution & Handover Confirmation';
  cautionMessage = '';
  pendingAction: (() => void) | null = null;

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get isStationSecretary(): boolean {
    return this.currentUser?.role === 'Station Secretary';
  }

  get activeStationName(): string {
    return this.currentStation?.name || this.currentUser?.stationName || this.currentUser?.college || 'Campus Collection Hub';
  }

  get activeStationCode(): string {
    return this.currentStation?.code || this.currentUser?.stationCode || this.selectedStationCode;
  }

  get userInitials(): string {
    const name = String(this.currentUser?.fullName || 'SS');
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase() || '')
      .join('') || 'SS';
  }

  ngOnInit(): void {
    const initialTab = this.route.snapshot.queryParamMap.get('tab');
    if (initialTab && ['ALL', 'IN_TRANSIT', 'IN_VAULT', 'COLLECTED', 'ISSUES'].includes(initialTab)) {
      this.filterTab = initialTab as any;
    }
    this.unreadSub = this.notificationService.unreadCount$.subscribe(count => {
      this.unreadNotifications = count;
    });
    this.notificationService.refreshUnreadCount().subscribe();

    // Resolve station assignment first so station-scoped consignments load cleanly without race
    this.loadStations(true);
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
  }

  refreshAll(): void {
    this.loadRequests();
    this.notificationService.refreshUnreadCount().subscribe();
  }

  setFilterTab(tab: 'ALL' | 'IN_TRANSIT' | 'IN_VAULT' | 'COLLECTED' | 'ISSUES'): void {
    this.filterTab = tab;
    this.currentPage = 1;
  }

  onSearchChange(): void {
    this.currentPage = 1;
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

  loadStations(loadAfter = false): void {
    this.stationService.getActiveStations().subscribe({
      next: (list) => {
        this.stations = (list || []).map(s => ({
          ...s,
          name: s.name.replace(/^udsm/i, 'UDSM'),
          code: s.code.toUpperCase()
        }));
        if (this.stations.length > 0) {
          // If secretary has an assigned stationCode or college/station, match it, otherwise default to first station
          const userStationCode = this.currentUser?.stationCode?.toLowerCase() || '';
          const userCollege = this.currentUser?.college?.toLowerCase() || '';
          const match = this.stations.find(s =>
            (userStationCode && s.code.toLowerCase() === userStationCode) ||
            (userCollege && (s.name.toLowerCase().includes(userCollege) || s.code.toLowerCase().includes(userCollege)))
          );
          if (match) {
            this.selectedStationCode = match.code;
            this.currentStation = match;
          } else {
            this.currentStation = this.stations[0];
            if (this.isStationSecretary) {
              this.selectedStationCode = this.currentStation.code;
            }
          }
        }
        if (loadAfter) {
          this.loadRequests();
        }
      },
      error: (err) => {
        console.error('Failed to load collection stations:', err);
        if (loadAfter) {
          this.loadRequests();
        }
      }
    });
  }

  onStationFilterChange(code: string): void {
    if (this.isStationSecretary) return; // Locked to assigned station for Station Secretaries
    this.selectedStationCode = code;
    this.currentStation = this.stations.find(s => s.code === code) || null;
    this.currentPage = 1;
    this.loadRequests();
  }

  loadRequests(): void {
    this.isLoading = true;
    this.loadError = '';
    const stationParam = this.isStationSecretary ? this.activeStationCode : this.selectedStationCode;
    const query = stationParam !== 'ALL' ? `?stationCode=${encodeURIComponent(stationParam)}` : '';
    const url = `${this.config.apiUrl}/dus-secretary/station/consignments${query}`;
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    this.http.get<any[]>(url, { headers, withCredentials: true }).subscribe({
      next: (backendStudents) => {
        this.isLoading = false;
        if (backendStudents && backendStudents.length > 0) {
          this.requests = backendStudents.map(bs => this.mapStudentToRequest(bs));
        } else {
          this.requests = [];
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.loadError = err?.error?.message || 'Unable to load station consignments from the server.';
        console.error('Failed to load station consignments from backend:', err);
        this.requests = [];
      }
    });
  }

  isPostgraduateReceipt(req: TranscriptPaymentRequest | null): boolean {
    return !!req && isPostgraduateEntity(req);
  }

  private mapStudentToRequest(s: any): TranscriptPaymentRequest {
    return {
      id: s.id,
      studentId: s.id,
      studentName: s.fullName,
      registrationNumber: s.registrationNumber,
      award: s.award || s.programme || 'Degree Certificate & Transcript',
      programme: s.programme || '',
      isPostgraduate: isPostgraduateEntity(s),
      graduationYear: s.graduationYear || '',
      transcriptCount: 1,
      amount: 15000,
      currency: 'TZS',
      attemptNumber: 1,
      status: 'Paid',
      controlNumber: s.controlNumber || '',
      requestedAt: s.createdAt || new Date().toISOString(),
      collectionMethod: 'Physical Collection',
      postingRegion: s.college || this.currentStation?.region || 'Dar es Salaam',
      postingAddress: s.stationName || this.currentStation?.name || 'UDSM Station Intake Hub',
      postingContactPhone: s.phoneNumber || '',
      postingContactEmail: s.email || '',
      dispatchStatus: s.dispatchStatus || 'Pending Dispatch',
      dispatchedAt: s.dispatchedAt,
      certificateVerified: Boolean(s.certificateVerified),
      certificateVerifiedAt: s.certificateVerifiedAt,
      digitalSignatureHash: s.digitalSignatureHash,
      signedBy: s.signedBy,
      signedAt: s.signedAt,
      stationCode: s.stationCode || this.selectedStationCode,
      stationName: s.stationName || this.currentStation?.name,
      intakeStatus: s.intakeStatus || 'Awaiting Intake',
      stationReceivedAt: s.stationReceivedAt,
      stationReceivedBy: s.stationReceivedBy,
      vaultLockerNumber: s.vaultLockerNumber,
      handoverApproved: s.dispatchStatus === 'Collected',
      handoverApprovedAt: s.handoverApprovedAt,
      handoverSecretary: s.handoverSecretary,
      handoverCollectorType: s.handoverCollectorType,
      handoverCollectorName: s.handoverCollectorName,
      handoverCollectorId: s.handoverCollectorId,
      handoverCollectorPhone: s.handoverCollectorPhone,
      handoverReceiptToken: s.handoverReceiptToken,
      transitIssueNotes: s.transitIssueNotes
    };
  }

  // Summary Metrics
  get totalStationOrders(): number {
    return this.filteredByStationList.length;
  }

  get inTransitCount(): number {
    return this.filteredByStationList.filter(r =>
      (r.dispatchStatus === 'Dispatched' || r.certificateVerified) &&
      (!r.intakeStatus || r.intakeStatus === 'Awaiting Intake' || r.intakeStatus === 'In-Transit')
    ).length;
  }

  get inVaultCount(): number {
    return this.filteredByStationList.filter(r =>
      r.intakeStatus === 'Received at Station' && r.dispatchStatus !== 'Collected'
    ).length;
  }

  get collectedCount(): number {
    return this.filteredByStationList.filter(r =>
      r.dispatchStatus === 'Collected' || r.intakeStatus === 'Collected by Student'
    ).length;
  }

  get issuesCount(): number {
    return this.filteredByStationList.filter(r => !!r.transitIssueNotes).length;
  }

  private get filteredByStationList(): TranscriptPaymentRequest[] {
    if (this.selectedStationCode === 'ALL') {
      return this.requests;
    }
    return this.requests.filter(r => {
      if (r.stationCode && r.stationCode.toLowerCase() === this.selectedStationCode.toLowerCase()) return true;
      if (r.postingAddress && this.currentStation && r.postingAddress.toLowerCase().includes(this.currentStation.name.toLowerCase())) return true;
      if (r.postingRegion && this.currentStation && r.postingRegion.toLowerCase() === this.currentStation.region.toLowerCase()) return true;
      return false;
    });
  }

  currentPage = 1;
  pageSize = 25;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRequests.length / this.pageSize));
  }

  get paginatedRequests(): TranscriptPaymentRequest[] {
    const safePage = Math.min(this.currentPage, this.totalPages);
    const start = (safePage - 1) * this.pageSize;
    return this.filteredRequests.slice(start, start + this.pageSize);
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

  get filteredRequests(): TranscriptPaymentRequest[] {
    return this.filteredByStationList.filter(r => {
      // Tab filter
      if (this.filterTab === 'IN_TRANSIT') {
        const inTransit = (r.dispatchStatus === 'Dispatched' || r.certificateVerified) &&
          (!r.intakeStatus || r.intakeStatus === 'Awaiting Intake' || r.intakeStatus === 'In-Transit');
        if (!inTransit) return false;
      } else if (this.filterTab === 'IN_VAULT') {
        const inVault = r.intakeStatus === 'Received at Station' && r.dispatchStatus !== 'Collected';
        if (!inVault) return false;
      } else if (this.filterTab === 'COLLECTED') {
        const collected = r.dispatchStatus === 'Collected' || r.intakeStatus === 'Collected by Student';
        if (!collected) return false;
      } else if (this.filterTab === 'ISSUES') {
        if (!r.transitIssueNotes) return false;
      }

      // Search term
      if (this.searchTerm.trim()) {
        const q = this.searchTerm.trim().toLowerCase();
        const matchName = r.studentName?.toLowerCase().includes(q);
        const matchReg = r.registrationNumber?.toLowerCase().includes(q);
        const matchControl = r.controlNumber?.toLowerCase().includes(q);
        const matchRegion = r.postingRegion?.toLowerCase().includes(q);
        const matchLocker = r.vaultLockerNumber?.toLowerCase().includes(q);
        const matchSig = r.digitalSignatureHash?.toLowerCase().includes(q);
        const matchPass = r.handoverReceiptToken?.toLowerCase().includes(q);
        return matchName || matchReg || matchControl || matchRegion || matchLocker || matchSig || matchPass;
      }

      return true;
    });
  }

  // =========================================================================
  // QUICK BARCODE / QR SCANNER
  // =========================================================================

  toggleScanner(): void {
    this.scannerActive = !this.scannerActive;
    this.scannerInput = '';
  }

  onScanSubmit(): void {
    if (!this.scannerInput.trim()) return;
    const query = this.scannerInput.trim().toLowerCase();

    const found = this.requests.find(r =>
      (r.registrationNumber && r.registrationNumber.toLowerCase() === query) ||
      (r.digitalSignatureHash && r.digitalSignatureHash.toLowerCase() === query) ||
      (r.controlNumber && r.controlNumber.toLowerCase() === query) ||
      (r.studentName && r.studentName.toLowerCase().includes(query))
    );

    if (found) {
      this.showToast(`🎯 Barcode Scanned: Found student ${found.studentName} (${found.registrationNumber})`, 'success');
      this.scannerActive = false;
      this.searchTerm = found.registrationNumber;

      if (found.intakeStatus === 'Received at Station' && found.dispatchStatus !== 'Collected') {
        // Ready for student handover!
        this.openHandoverModal(found);
      } else if (!found.intakeStatus || found.intakeStatus === 'Awaiting Intake' || found.intakeStatus === 'In-Transit') {
        // Needs intake into station vault
        this.openIntakeModal(found);
      } else if (found.dispatchStatus === 'Collected') {
        // View handover receipt
        this.openReceiptModal(found);
      }
    } else {
      this.showToast(`❌ No consignment match found for code "${this.scannerInput}". Please check spelling or Main Campus dispatch.`, 'error');
    }
    this.scannerInput = '';
  }

  // =========================================================================
  // 1. CONSIGNMENT INTAKE WORKFLOW (RECEIVE FROM MAIN CAMPUS DUS)
  // =========================================================================

  openIntakeModal(req: TranscriptPaymentRequest): void {
    this.selectedIntakeRequest = req;
    this.intakeForm.vaultLocker = req.vaultLockerNumber || `BIN-${Math.floor(100 + Math.random() * 900)}`;
    this.intakeForm.packageCondition = 'Intact & Sealed';
    this.intakeForm.receivedBy = this.currentUser?.fullName || 'Station Intake Secretary';
    this.intakeForm.notes = '';
    this.showIntakeModal = true;
  }

  closeIntakeModal(): void {
    this.showIntakeModal = false;
    this.selectedIntakeRequest = null;
  }

  confirmIntake(): void {
    if (!this.selectedIntakeRequest || this.isSubmitting) return;
    const req = this.selectedIntakeRequest;
    const stationCode = this.currentStation?.code || this.currentUser?.stationCode || 'MAIN';
    const stationName = this.currentStation?.name || req.postingAddress || 'UDSM Station Intake Hub';
    const vaultLocker = this.intakeForm.vaultLocker.trim();
    const receivedBy = this.intakeForm.receivedBy.trim();
    const packageCondition = this.intakeForm.packageCondition;

    if (!vaultLocker || !receivedBy) {
      this.showToast('Please provide the vault locker bin and receiving secretary name.', 'error');
      return;
    }

    this.isSubmitting = true;
    const url = `${this.config.apiUrl}/dus-secretary/station/intake`;
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    const payload = {
      studentId: req.registrationNumber || req.studentId,
      stationCode,
      stationName,
      vaultLockerNumber: vaultLocker,
      receivedBy,
      packageCondition
    };

    this.http.post(url, payload, { headers, withCredentials: true }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.transcriptService.stationIntake(
          req.id,
          stationCode,
          stationName,
          vaultLocker,
          receivedBy,
          packageCondition
        );
        this.showToast(`Received & sealed into Station Vault (Bin ${vaultLocker}) for ${req.studentName}.`, 'success');
        this.closeIntakeModal();
        this.loadRequests();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.showToast(err?.error?.message || 'Failed to record station intake on the server.', 'error');
      }
    });
  }

  bulkIntakeAllIncoming(): void {
    const pendingList = this.filteredRequests.filter(r =>
      (r.dispatchStatus === 'Dispatched' || r.certificateVerified) &&
      (!r.intakeStatus || r.intakeStatus === 'Awaiting Intake' || r.intakeStatus === 'In-Transit')
    );

    if (pendingList.length === 0) {
      this.showToast('No pending in-transit consignments to intake.', 'error');
      return;
    }

    this.cautionTitle = 'Confirm Bulk Consignment Intake';
    this.cautionMessage = `Are you sure you want to acknowledge intake for ${pendingList.length} incoming consignments from Main Campus? All packages will be marked as Received at Station and stored in the station vault.`;
    this.pendingAction = () => {
      if (this.isSubmitting) return;
      this.isSubmitting = true;
      const stationCode = this.currentStation?.code || this.currentUser?.stationCode || 'MAIN';
      const stationName = this.currentStation?.name || 'UDSM Station Intake Hub';
      const secretary = this.currentUser?.fullName || 'Station Intake Secretary';

      const url = `${this.config.apiUrl}/dus-secretary/station/bulk-intake`;
      const token = this.authService.getToken();
      const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
      const payload = {
        studentIds: pendingList.map(p => p.registrationNumber || p.studentId),
        stationCode,
        stationName,
        receivedBy: secretary
      };

      this.http.post(url, payload, { headers, withCredentials: true }).subscribe({
        next: () => {
          this.isSubmitting = false;
          let binCounter = 101;
          pendingList.forEach(req => {
            const locker = `BIN-${binCounter++}`;
            this.transcriptService.stationIntake(req.id, stationCode, stationName, locker, secretary, 'Intact & Sealed');
          });
          this.showToast(`Successfully processed batch intake for ${pendingList.length} consignments.`, 'success');
          this.loadRequests();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.showToast(err?.error?.message || 'Failed to complete bulk intake on the server.', 'error');
        }
      });
    };

    this.showCautionModal = true;
  }

  // =========================================================================
  // 2. STUDENT HANDOVER & APPROVAL WORKFLOW (COUNTER APPROVAL)
  // =========================================================================

  openHandoverModal(req: TranscriptPaymentRequest): void {
    this.selectedHandoverRequest = req;
    this.handoverForm.collectorType = 'Student in Person';
    this.handoverForm.collectorName = req.studentName;
    this.handoverForm.collectorIdNumber = req.registrationNumber;
    this.handoverForm.collectorPhone = req.postingContactPhone || '';
    this.handoverForm.notes = '';
    this.handoverForm.idVerified = false;
    this.handoverForm.clearanceConfirmed = true;
    this.showHandoverModal = true;
  }

  closeHandoverModal(): void {
    this.showHandoverModal = false;
    this.selectedHandoverRequest = null;
  }

  onCollectorTypeChange(): void {
    if (this.handoverForm.collectorType === 'Student in Person') {
      this.handoverForm.collectorName = this.selectedHandoverRequest?.studentName || '';
      this.handoverForm.collectorIdNumber = this.selectedHandoverRequest?.registrationNumber || '';
    } else {
      this.handoverForm.collectorName = '';
      this.handoverForm.collectorIdNumber = '';
      this.handoverForm.notes = 'Legal representative Power of Attorney presented & stamped.';
    }
  }

  confirmHandoverApproval(): void {
    if (!this.selectedHandoverRequest || this.isSubmitting) return;
    const req = this.selectedHandoverRequest;
    const collectorName = this.handoverForm.collectorName.trim();
    const collectorIdNumber = this.handoverForm.collectorIdNumber.trim();
    const collectorPhone = this.handoverForm.collectorPhone.trim();
    const collectorType = this.handoverForm.collectorType;
    const notes = this.handoverForm.notes;

    if (!collectorName || !collectorIdNumber) {
      this.showToast('Please enter the collector name and official ID (NIDA/Student ID).', 'error');
      return;
    }

    if (!this.handoverForm.idVerified) {
      this.showToast('Please check the ID verification checkbox before approving handover.', 'error');
      return;
    }

    this.isSubmitting = true;
    const fallbackToken = 'UDSM-RCV-PASS-' + Math.floor(100000000 + Math.random() * 900000000);
    const secretary = this.currentUser?.fullName || 'Station DUS Secretary';

    const url = `${this.config.apiUrl}/dus-secretary/station/approve-handover`;
    const authToken = this.authService.getToken();
    const headers = authToken ? new HttpHeaders({ Authorization: `Bearer ${authToken}` }) : undefined;

    const payload = {
      studentId: req.registrationNumber || req.studentId,
      collectorType,
      collectorName,
      collectorIdNumber,
      collectorPhone,
      secretaryName: secretary,
      handoverNotes: notes
    };

    this.http.post<any>(url, payload, { headers, withCredentials: true }).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        const passToken = res?.handoverReceiptToken || res?.receiptToken || fallbackToken;
        this.transcriptService.stationHandover(
          req.id,
          collectorType,
          collectorName,
          collectorIdNumber,
          collectorPhone,
          secretary,
          passToken,
          notes
        );

        const receiptRecord: TranscriptPaymentRequest = {
          ...req,
          dispatchStatus: 'Collected',
          intakeStatus: 'Collected by Student',
          handoverApproved: true,
          handoverApprovedAt: res?.handoverApprovedAt || new Date().toISOString(),
          handoverSecretary: secretary,
          handoverCollectorType: collectorType,
          handoverCollectorName: collectorName,
          handoverCollectorId: collectorIdNumber,
          handoverCollectorPhone: collectorPhone,
          handoverReceiptToken: passToken
        };

        this.closeHandoverModal();
        this.showToast(`Handover approved! Pass Token: ${passToken} issued to ${collectorName}.`, 'success');
        this.openReceiptModal(receiptRecord);
        this.loadRequests();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.showToast(err?.error?.message || 'Failed to record handover approval on the server.', 'error');
      }
    });
  }

  // =========================================================================
  // 3. PRINTABLE HANDOVER PROOF & RELEASE RECEIPT
  // =========================================================================

  openReceiptModal(req: TranscriptPaymentRequest): void {
    this.receiptData = req;
    this.showReceiptModal = true;
  }

  closeReceiptModal(): void {
    this.showReceiptModal = false;
    this.receiptData = null;
  }

  printReceipt(): void {
    window.print();
  }

  // =========================================================================
  // 4. TRANSIT DISCREPANCY & INCIDENT REPORTING
  // =========================================================================

  openDiscrepancyModal(req: TranscriptPaymentRequest): void {
    this.selectedDiscrepancyRequest = req;
    this.discrepancyForm.issueType = 'Damaged Package in Transit';
    this.discrepancyForm.description = '';
    this.discrepancyForm.reportedBy = this.currentUser?.fullName || 'Station Secretary';
    this.showDiscrepancyModal = true;
  }

  closeDiscrepancyModal(): void {
    this.showDiscrepancyModal = false;
    this.selectedDiscrepancyRequest = null;
  }

  submitDiscrepancyReport(): void {
    if (!this.selectedDiscrepancyRequest || this.isSubmitting) return;
    if (!this.discrepancyForm.description.trim()) {
      this.showToast('Please provide a description of the discrepancy.', 'error');
      return;
    }

    this.isSubmitting = true;
    const targetReq = this.selectedDiscrepancyRequest;
    const description = this.discrepancyForm.description.trim();
    const issueType = this.discrepancyForm.issueType;
    const reportedBy = this.discrepancyForm.reportedBy;

    const url = `${this.config.apiUrl}/dus-secretary/station/report-discrepancy`;
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    const payload = {
      studentId: targetReq.registrationNumber || targetReq.studentId,
      issueType,
      description,
      reportedBy
    };

    this.http.post(url, payload, { headers, withCredentials: true }).subscribe({
      next: () => {
        this.isSubmitting = false;
        const note = `[${issueType}]: ${description} (Reported by ${reportedBy})`;
        this.transcriptService.reportDiscrepancy(targetReq.id, note);
        this.showToast('Transit incident reported to Main Campus DUS Directorate.', 'success');
        this.closeDiscrepancyModal();
        this.loadRequests();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.showToast(err?.error?.message || 'Failed to submit transit incident report to the server.', 'error');
      }
    });
  }

  // =========================================================================
  // 5. CAUTION & CONFIRMATION MODAL HELPERS
  // =========================================================================

  confirmCautionAction(): void {
    if (this.pendingAction) {
      this.pendingAction();
    }
    this.showCautionModal = false;
    this.pendingAction = null;
  }

  cancelCautionAction(): void {
    this.showCautionModal = false;
    this.pendingAction = null;
  }

  // Send automated SMS / Email pickup reminder to student
  sendPickupReminder(req: TranscriptPaymentRequest): void {
    if (this.remindingId) return;
    this.remindingId = req.id;

    const url = `${this.config.apiUrl}/dus-secretary/notify-release`;
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    const payload = {
      studentId: req.registrationNumber || req.studentId,
      studentName: req.studentName,
      releaseType: 'Academic Transcript & Degree Certificate',
      releaseDate: 'Ready in Station Vault',
      instructions: `Your documents are ready for counter collection at ${req.stationName || this.currentStation?.name || 'UDSM Station Hub'}. Vault Bin: ${req.vaultLockerNumber || 'Counter Desk'}. Please bring your original National NIDA ID or Student ID.`,
      trackingNumber: req.vaultLockerNumber || '',
      customNote: 'Reminder notice: Please collect within 14 business days.'
    };

    this.http.post(url, payload, { headers, withCredentials: true }).subscribe({
      next: () => {
        this.remindingId = null;
        this.showToast(`Pickup reminder sent to ${req.studentName}.`, 'success');
      },
      error: (err) => {
        this.remindingId = null;
        this.showToast(err?.error?.message || `Failed to send pickup reminder to ${req.studentName}.`, 'error');
      }
    });
  }

  showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMessage = msg;
    this.toastType = type;
    setTimeout(() => {
      this.toastMessage = '';
    }, 4500);
  }

  getIntakeBadgeClass(status?: string): string {
    switch (status) {
      case 'Received at Station': return 'badge-vault';
      case 'Collected by Student': return 'badge-collected';
      default: return 'badge-transit';
    }
  }
}
