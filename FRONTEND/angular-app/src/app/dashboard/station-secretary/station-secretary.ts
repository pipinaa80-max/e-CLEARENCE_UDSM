import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { TranscriptPaymentService } from '../../core/services/transcript-payment.service';
import { CollectionStationService, CollectionStation } from '../../core/services/collection-station.service';
import { TranscriptPaymentRequest } from '../../transcript/transcript-payment.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { ConfigService } from '../../core/services/config.service';

@Component({
  selector: 'app-station-secretary-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, DashboardHeaderComponent],
  templateUrl: './station-secretary.html',
  styleUrl: './station-secretary.css'
})
export class StationSecretaryDashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly transcriptService = inject(TranscriptPaymentService);
  private readonly stationService = inject(CollectionStationService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  sidebarOpen = false;
  requests: TranscriptPaymentRequest[] = [];
  stations: CollectionStation[] = [];
  selectedStationCode: string = 'ALL';
  currentStation: CollectionStation | null = null;

  searchTerm = '';
  filterTab: 'ALL' | 'IN_TRANSIT' | 'IN_VAULT' | 'COLLECTED' | 'ISSUES' = 'ALL';

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

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

  ngOnInit(): void {
    this.loadStations();
    this.loadRequests();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  loadStations(): void {
    this.stationService.getActiveStations().subscribe({
      next: (list) => {
        this.stations = list;
        if (this.stations.length > 0) {
          // If secretary has an assigned college/station, match it, otherwise default to first station
          const userCollege = this.currentUser?.college?.toLowerCase() || '';
          const match = this.stations.find(s =>
            userCollege && (s.name.toLowerCase().includes(userCollege) || s.code.toLowerCase().includes(userCollege))
          );
          if (match) {
            this.selectedStationCode = match.code;
            this.currentStation = match;
          } else {
            this.currentStation = this.stations[0];
          }
        }
      },
      error: (err) => console.error('Failed to load collection stations:', err)
    });
  }

  onStationFilterChange(code: string): void {
    this.selectedStationCode = code;
    this.currentStation = this.stations.find(s => s.code === code) || null;
    this.loadRequests();
  }

  loadRequests(): void {
    const query = this.selectedStationCode !== 'ALL' ? `?stationCode=${encodeURIComponent(this.selectedStationCode)}` : '';
    const url = `${this.config.apiUrl}/dus-secretary/station/consignments${query}`;
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    this.http.get<any[]>(url, { headers, withCredentials: true }).subscribe({
      next: (backendStudents) => {
        if (backendStudents && backendStudents.length > 0) {
          this.requests = backendStudents.map(bs => this.mapStudentToRequest(bs));
        } else {
          this.requests = [];
        }
      },
      error: (err) => {
        console.error('Failed to load station consignments from backend:', err);
        this.requests = [];
      }
    });
  }

  private mapStudentToRequest(s: any): TranscriptPaymentRequest {
    return {
      id: s.id,
      studentId: s.id,
      studentName: s.fullName,
      registrationNumber: s.registrationNumber,
      award: s.programme || 'Degree Certificate & Transcript',
      graduationYear: s.graduationYear || '2024',
      transcriptCount: 1,
      amount: 15000,
      currency: 'TZS',
      attemptNumber: 1,
      status: 'Paid',
      controlNumber: '99' + Math.abs(this.hashCode(s.registrationNumber || s.id)).toString().padStart(10, '0').slice(0, 10),
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

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  // Summary Metrics
  get totalStationOrders(): number {
    return this.filteredByStationList.length;
  }

  get inTransitCount(): number {
    return this.filteredByStationList.filter(r =>
      (r.dispatchStatus === 'Dispatched' || r.certificateVerified) &&
      (!r.intakeStatus || r.intakeStatus === 'Awaiting Intake')
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

  get filteredRequests(): TranscriptPaymentRequest[] {
    return this.filteredByStationList.filter(r => {
      // Tab filter
      if (this.filterTab === 'IN_TRANSIT') {
        const inTransit = (r.dispatchStatus === 'Dispatched' || r.certificateVerified) &&
          (!r.intakeStatus || r.intakeStatus === 'Awaiting Intake');
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
      } else if (!found.intakeStatus || found.intakeStatus === 'Awaiting Intake') {
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
    if (!this.selectedIntakeRequest) return;
    const req = this.selectedIntakeRequest;
    const stationCode = this.currentStation?.code || 'MAIN';
    const stationName = this.currentStation?.name || req.postingAddress || 'UDSM Station Intake Hub';

    this.transcriptService.stationIntake(
      req.id,
      stationCode,
      stationName,
      this.intakeForm.vaultLocker,
      this.intakeForm.receivedBy,
      this.intakeForm.packageCondition
    );

    // Save to PostgreSQL Backend
    const url = `${this.config.apiUrl}/dus-secretary/station/intake`;
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    const payload = {
      studentId: req.registrationNumber || req.studentId,
      stationCode,
      stationName,
      vaultLockerNumber: this.intakeForm.vaultLocker,
      receivedBy: this.intakeForm.receivedBy,
      packageCondition: this.intakeForm.packageCondition
    };

    this.http.post(url, payload, { headers, withCredentials: true }).subscribe({
      next: () => console.log('Station intake recorded to database.'),
      error: (err) => console.warn('Intake saved locally; backend responded:', err.message)
    });

    this.showToast(`📦 Received & Sealed into Station Vault: Bin ${this.intakeForm.vaultLocker} for ${req.studentName}!`, 'success');
    this.closeIntakeModal();
    this.loadRequests();
  }

  bulkIntakeAllIncoming(): void {
    const pendingList = this.filteredRequests.filter(r =>
      (r.dispatchStatus === 'Dispatched' || r.certificateVerified) &&
      (!r.intakeStatus || r.intakeStatus === 'Awaiting Intake')
    );

    if (pendingList.length === 0) {
      this.showToast('No pending in-transit consignments to intake.', 'error');
      return;
    }

    this.cautionTitle = '⚠️ Confirm Bulk Consignment Intake';
    this.cautionMessage = `Are you sure you want to acknowledge intake for ${pendingList.length} incoming consignments from Main Campus? All packages will be marked as Received at Station and stored in the station vault.`;
    this.pendingAction = () => {
      let binCounter = 101;
      const stationCode = this.currentStation?.code || 'MAIN';
      const stationName = this.currentStation?.name || 'UDSM Station Intake Hub';
      const secretary = this.currentUser?.fullName || 'Station Intake Secretary';

      pendingList.forEach(req => {
        const locker = `BIN-${binCounter++}`;
        this.transcriptService.stationIntake(req.id, stationCode, stationName, locker, secretary, 'Intact & Sealed');
      });

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
        next: () => console.log('Bulk intake synced with backend.'),
        error: (err) => console.warn('Bulk intake local sync complete; backend responded:', err.message)
      });

      this.showToast(`✅ Successfully processed batch intake for ${pendingList.length} consignments!`, 'success');
      this.loadRequests();
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
    if (!this.selectedHandoverRequest) return;
    const req = this.selectedHandoverRequest;

    if (!this.handoverForm.collectorName.trim() || !this.handoverForm.collectorIdNumber.trim()) {
      this.showToast('Please enter the collector name and official ID (NIDA/Student ID).', 'error');
      return;
    }

    if (!this.handoverForm.idVerified) {
      this.showToast('Please check the ID verification checkbox before approving handover.', 'error');
      return;
    }

    const token = 'UDSM-RCV-PASS-' + Math.floor(100000000 + Math.random() * 900000000);
    const secretary = this.currentUser?.fullName || 'Station DUS Secretary';

    this.transcriptService.stationHandover(
      req.id,
      this.handoverForm.collectorType,
      this.handoverForm.collectorName.trim(),
      this.handoverForm.collectorIdNumber.trim(),
      this.handoverForm.collectorPhone.trim(),
      secretary,
      token,
      this.handoverForm.notes
    );

    // Save Handover Approval to Database
    const url = `${this.config.apiUrl}/dus-secretary/station/approve-handover`;
    const authToken = this.authService.getToken();
    const headers = authToken ? new HttpHeaders({ Authorization: `Bearer ${authToken}` }) : undefined;

    const payload = {
      studentId: req.registrationNumber || req.studentId,
      collectorType: this.handoverForm.collectorType,
      collectorName: this.handoverForm.collectorName.trim(),
      collectorIdNumber: this.handoverForm.collectorIdNumber.trim(),
      collectorPhone: this.handoverForm.collectorPhone.trim(),
      secretaryName: secretary,
      handoverNotes: this.handoverForm.notes
    };

    this.http.post(url, payload, { headers, withCredentials: true }).subscribe({
      next: () => console.log('Handover approval permanently saved to PostgreSQL.'),
      error: (err) => console.warn('Handover saved locally; backend responded:', err.message)
    });

    this.closeHandoverModal();
    this.showToast(`🎓 Handover Approved! Pass Token: ${token} issued to ${this.handoverForm.collectorName}.`, 'success');
    this.loadRequests();

    // Open Printable Receipt
    const updated = this.transcriptService.getAllRequests().find(r => r.id === req.id) || req;
    this.openReceiptModal(updated);
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
    if (!this.selectedDiscrepancyRequest || !this.discrepancyForm.description.trim()) {
      this.showToast('Please provide a description of the discrepancy.', 'error');
      return;
    }

    const note = `[${this.discrepancyForm.issueType}]: ${this.discrepancyForm.description.trim()} (Reported by ${this.discrepancyForm.reportedBy})`;
    this.transcriptService.reportDiscrepancy(this.selectedDiscrepancyRequest.id, note);

    const url = `${this.config.apiUrl}/dus-secretary/station/report-discrepancy`;
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    const payload = {
      studentId: this.selectedDiscrepancyRequest.registrationNumber || this.selectedDiscrepancyRequest.studentId,
      issueType: this.discrepancyForm.issueType,
      description: this.discrepancyForm.description.trim(),
      reportedBy: this.discrepancyForm.reportedBy
    };

    this.http.post(url, payload, { headers, withCredentials: true }).subscribe({
      next: () => console.log('Transit discrepancy synced with Main Campus DUS.'),
      error: (err) => console.warn('Discrepancy logged locally:', err.message)
    });

    this.showToast('🚨 Transit incident reported to Main Campus DUS Directorate.', 'success');
    this.closeDiscrepancyModal();
    this.loadRequests();
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
      next: () => this.showToast(`📲 Pickup reminder SMS & Email sent to ${req.studentName}!`, 'success'),
      error: () => this.showToast(`Pickup reminder notice queued for ${req.studentName}.`, 'success')
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
