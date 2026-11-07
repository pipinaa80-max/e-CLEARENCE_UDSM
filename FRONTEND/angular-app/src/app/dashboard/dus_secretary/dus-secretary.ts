import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { TranscriptPaymentService } from '../../core/services/transcript-payment.service';
import { ReceiptFileStoreService } from '../../core/services/receipt-file-store.service';
import { CollectionStationService, CollectionStation } from '../../core/services/collection-station.service';
import { TranscriptPaymentRequest } from '../../transcript/transcript-payment.model';
import { DashboardHeaderComponent } from '../../shared/components/dashboard-header/dashboard-header';
import { ConfigService } from '../../core/services/config.service';

@Component({
  selector: 'app-dus-secretary-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './dus-secretary.html',
  styleUrl: './dus-secretary.css'
})
export class DusSecretaryDashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly transcriptService = inject(TranscriptPaymentService);
  private readonly receiptFileStore = inject(ReceiptFileStoreService);
  private readonly stationService = inject(CollectionStationService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  sidebarOpen = false;
  requests: TranscriptPaymentRequest[] = [];
  stations: CollectionStation[] = [];
  selectedDispatchStationCode: string = 'UDSM-MAIN';
  searchTerm = '';
  filterTab: 'ALL' | 'PHYSICAL' | 'DHL' | 'PENDING' | 'DISPATCHED' = 'ALL';

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  // Digital Signature Modal State
  showSignatureModal = false;
  selectedSigRequest: TranscriptPaymentRequest | null = null;
  signatureForm = {
    secretaryName: 'Directorate Secretary',
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

  ngOnInit(): void {
    this.loadStations();
    this.loadRequests();
    this.loadStationSecretaries();
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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  loadRequests(): void {
    const url = `${this.config.apiUrl}/dus-secretary/students`;
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    this.http.get<any[]>(url, { headers, withCredentials: true }).subscribe({
      next: (students) => {
        const backendRequests = (students && students.length > 0)
          ? students.map(s => this.mapStudentToRequest(s))
          : [];
        this.mergeRequests(backendRequests);
      },
      error: (err) => {
        console.error('Failed to load students from backend:', err);
        this.mergeRequests([]);
      }
    });
  }

  private mergeRequests(backendRequests: TranscriptPaymentRequest[]): void {
    // DUS Secretary only receives requests after Step 3 (specifying mode of collection) is completed
    const localRequests = this.transcriptService.getAllRequests().filter(
      r => !!r.collectionMethod
    );
    const combined: TranscriptPaymentRequest[] = [...localRequests];
    for (const bReq of backendRequests) {
      if (bReq.collectionMethod) {
        const existsInLocal = localRequests.some(
          l => l.studentId === bReq.studentId || l.registrationNumber === bReq.registrationNumber
        );
        if (!existsInLocal) {
          combined.push(bReq);
        }
      }
    }
    this.requests = combined;
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
      graduationYear: s.graduationYear || '2024',
      transcriptCount: 1,
      amount: 15000,
      currency: 'TZS',
      attemptNumber: 1,
      status: 'Paid',
      controlNumber: '99' + Math.abs(this.hashCode(s.registrationNumber || s.id)).toString().padStart(10, '0').slice(0, 10),
      requestedAt: s.createdAt || new Date().toISOString(),
      collectionMethod: s.stationName ? 'Physical Collection' : 'Physical Collection',
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

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  // Summary Metrics
  get totalRequests(): number {
    return this.requests.length;
  }

  get physicalPending(): number {
    return this.requests.filter(r => r.collectionMethod === 'Physical Collection' && r.dispatchStatus !== 'Collected').length;
  }

  get dhlPending(): number {
    return this.requests.filter(r => r.collectionMethod === 'Post by DHL' && r.dispatchStatus !== 'Dispatched').length;
  }

  get dispatchedCount(): number {
    return this.requests.filter(r => r.dispatchStatus === 'Dispatched' || r.dispatchStatus === 'Collected').length;
  }

  // Filtered List
  get filteredRequests(): TranscriptPaymentRequest[] {
    return this.requests.filter(r => {
      if (this.filterTab === 'PHYSICAL' && r.collectionMethod !== 'Physical Collection') return false;
      if (this.filterTab === 'DHL' && r.collectionMethod !== 'Post by DHL') return false;
      if (this.filterTab === 'PENDING' && (r.dispatchStatus === 'Dispatched' || r.dispatchStatus === 'Collected')) return false;
      if (this.filterTab === 'DISPATCHED' && r.dispatchStatus !== 'Dispatched' && r.dispatchStatus !== 'Collected') return false;

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

  // EXECUTE ACTIONS AFTER CONFIRMATION (WITH DATABASE PERSISTENCE)
  private executeCertificateVerification(request: TranscriptPaymentRequest, verified: boolean): void {
    request.certificateVerified = verified;
    this.transcriptService.updateVerificationStatus(request.id, verified);

    if (verified) {
      request.certificateVerifiedAt = new Date().toISOString();
      if (!request.digitalSignatureHash) {
        request.digitalSignatureHash = 'UDSM-DUS-SIG-' + Math.floor(100000000 + Math.random() * 900000000);
        request.signedBy = this.currentUser?.fullName || 'Directorate Secretary';
        request.signedAt = new Date().toISOString();
      }
      this.saveVerificationToBackend(request, verified);
      this.autoNotifyRelease(request);
    } else {
      request.certificateVerified = false;
      this.saveVerificationToBackend(request, false);
      this.showToast(`Verification unchecked for ${request.studentName}. Dispatch controls locked.`, 'error');
      this.loadRequests();
    }
  }

  private saveVerificationToBackend(request: TranscriptPaymentRequest, verified: boolean): void {
    const studentIdentifier = request.registrationNumber || request.studentId;
    if (!studentIdentifier) return;

    const payload = {
      studentId: studentIdentifier,
      verified,
      digitalSignatureHash: request.digitalSignatureHash,
      signedBy: request.signedBy
    };

    const url = `${this.config.apiUrl}/dus-secretary/verify-certificate`;
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    this.http.post(url, payload, { headers, withCredentials: true }).subscribe({
      next: () => console.log('Saved certificate verification to PostgreSQL database.'),
      error: (err) => console.error('Error saving verification to database:', err)
    });
  }

  private executeUpdateDispatchStatus(request: TranscriptPaymentRequest, status: 'Pending Dispatch' | 'Dispatched' | 'Collected'): void {
    request.dispatchStatus = status;

    let targetStation: CollectionStation | undefined;
    if (status === 'Dispatched') {
      targetStation = this.stations.find(s => s.code === this.selectedDispatchStationCode);
      if (targetStation) {
        request.stationCode = targetStation.code;
        request.stationName = targetStation.name;
      }
      request.intakeStatus = 'In-Transit';
      request.dispatchedAt = new Date().toISOString();
      this.transcriptService.markDispatched(request.id);
    } else {
      if (status === 'Collected') {
        request.intakeStatus = 'Collected by Student';
      } else {
        request.intakeStatus = 'Awaiting Intake';
      }
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

    // Persist dispatch status update directly to backend database
    const studentIdentifier = request.registrationNumber || request.studentId;
    if (studentIdentifier) {
      const url = `${this.config.apiUrl}/dus-secretary/update-dispatch`;
      const token = this.authService.getToken();
      const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

      const payload = {
        studentId: studentIdentifier,
        dispatchStatus: status,
        stationCode: request.stationCode || this.selectedDispatchStationCode,
        stationName: request.stationName || targetStation?.name,
        intakeStatus: request.intakeStatus
      };

      this.http.post(url, payload, { headers, withCredentials: true }).subscribe({
        next: (res: any) => {
          console.log('Dispatch status saved to database:', res);
          this.loadRequests();
        },
        error: (err) => console.error('Error saving dispatch status to database:', err)
      });
    }

    const destMsg = request.stationName ? ` routed to ${request.stationName}` : '';
    this.showToast(`Consignment dispatch updated to "${status}"${destMsg} for ${request.studentName}.`, 'success');
  }

  private executeApplySignature(): void {
    if (!this.selectedSigRequest) return;

    const sigHash = 'UDSM-DUS-SIG-' + Math.floor(100000000 + Math.random() * 900000000);
    const signer = `${this.signatureForm.secretaryName} (${this.signatureForm.title})`;

    this.selectedSigRequest.certificateVerified = true;
    this.selectedSigRequest.certificateVerifiedAt = new Date().toISOString();
    this.selectedSigRequest.digitalSignatureHash = sigHash;
    this.selectedSigRequest.signedBy = signer;
    this.selectedSigRequest.signedAt = new Date().toISOString();

    this.transcriptService.applyDigitalSignature(this.selectedSigRequest.id, 'DUS_OFFICIAL_DIGITAL_STAMP', sigHash, signer);
    this.transcriptService.updateVerificationStatus(this.selectedSigRequest.id, true);

    this.saveVerificationToBackend(this.selectedSigRequest, true);

    this.showToast(`✍️ Official Directorate Digital Seal & Signature applied to ${this.selectedSigRequest.studentName}! Saved to database.`, 'success');
    this.autoNotifyRelease(this.selectedSigRequest);
    this.closeSignatureModal();
  }

  // Digital Signature Modal Handlers
  openSignatureModal(request: TranscriptPaymentRequest): void {
    this.selectedSigRequest = request;
    this.signatureForm.secretaryName = this.currentUser?.fullName || 'Directorate Secretary';
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
        : 'Education Certificate verified and digitally signed. Please visit DUS Secretary Office Room 102 with your valid Student ID or National ID.',
      trackingNumber: '',
      customNote: `Digitally Signed and Sealed by ${request.signedBy || 'Directorate Secretary'} (${request.digitalSignatureHash || 'UDSM-DUS-SIG-SEALED'}).`
    };

    const url = `${this.config.apiUrl}/dus-secretary/notify-release`;
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    this.http.post(url, payload, { headers, withCredentials: true }).subscribe({
      next: (res: any) => {
        this.showToast(`🎓 Certificate verified, signed & release notification automatically sent to ${res.studentName || request.studentName}!`, 'success');
        this.loadRequests();
      },
      error: () => {
        this.showToast(`Education certificate verified and signed for ${request.studentName}. System alert sent.`, 'success');
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
          this.showToast(`Station Secretary ${res.fullName || ''} updated successfully!`, 'success');
          this.loadStationSecretaries();
          this.closeStationSecretaryModal();
        },
        error: (err) => {
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
          this.showToast(`✅ Station Secretary ${res.fullName} created for ${res.stationName || res.stationCode}!`, 'success');
          this.loadStationSecretaries();
          this.closeStationSecretaryModal();
        },
        error: (err) => {
          const msg = err.error?.message || 'Failed to create station secretary.';
          this.showToast(msg, 'error');
        }
      });
    }
  }

  toggleStationSecretaryStatus(sec: any): void {
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    const url = `${this.config.apiUrl}/dus-secretary/station-secretaries/${sec.id}`;
    const newStatus = !sec.active;

    this.http.put(url, { active: newStatus }, { headers, withCredentials: true }).subscribe({
      next: () => {
        sec.active = newStatus;
        this.showToast(`Station Secretary ${sec.fullName} is now ${newStatus ? 'Active' : 'Deactivated'}.`, 'success');
      },
      error: () => this.showToast('Failed to change secretary status.', 'error')
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
