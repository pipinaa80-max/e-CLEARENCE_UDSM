import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { ReceiptFileStoreService } from './receipt-file-store.service';
import {
  TranscriptPaymentRequest,
  TranscriptPaymentStatus
} from '../../transcript/transcript-payment.model';

@Injectable({ providedIn: 'root' })
export class TranscriptPaymentService {
  private readonly storage = new StorageService();
  private readonly receiptFileStore = inject(ReceiptFileStoreService);
  private readonly requestKey = 'udsm-transcript-payment-requests';

  getAllRequests(): TranscriptPaymentRequest[] {
    const requests = this.storage.get<TranscriptPaymentRequest[]>(this.requestKey) ?? [];
    let updated = false;
    for (const r of requests) {
      if (r.status === 'Pending Control Number') {
        r.controlNumber = r.controlNumber || ('99' + Math.floor(1000000000 + Math.random() * 9000000000).toString());
        r.controlNumberIssuedAt = r.controlNumberIssuedAt || new Date().toISOString();
        r.status = 'Awaiting Payment';
        updated = true;
      }
    }
    if (updated) {
      this.storage.save(this.requestKey, requests);
    }
    return requests;
  }

  getStudentRequests(studentId: string): TranscriptPaymentRequest[] {
    return this.getAllRequests().filter(request => request.studentId === studentId);
  }

  createRequest(data: Omit<TranscriptPaymentRequest, 'id' | 'amount' | 'currency' | 'attemptNumber' | 'status' | 'requestedAt' | 'controlNumberRequestedAt'>): TranscriptPaymentRequest {
    const requests = this.getAllRequests();
    const studentRequests = requests.filter(request => request.studentId === data.studentId);

    // First request is always 1 copy at 15,000.
    // Subsequent requests are 5,000 per copy.
    const isFirstRequest = studentRequests.length === 0;
    const transcriptCount = isFirstRequest ? 1 : Math.max(1, Math.floor(data.transcriptCount));
    const autoControlNumber = '99' + Math.floor(1000000000 + Math.random() * 9000000000).toString();

    const request: TranscriptPaymentRequest = {
      ...data,
      id: crypto.randomUUID(),
      transcriptCount,
      amount: isFirstRequest ? 15000 : transcriptCount * 5000,
      currency: 'TZS',
      attemptNumber: studentRequests.length + 1,
      controlNumber: autoControlNumber,
      controlNumberIssuedAt: new Date().toISOString(),
      status: 'Awaiting Payment',
      requestedAt: new Date().toISOString(),
      controlNumberRequestedAt: new Date().toISOString()
    };

    requests.push(request);
    this.storage.save(this.requestKey, requests);
    return request;
  }

  async createMultipleCopyRequestsAsync(params: {
    studentId: string;
    studentName: string;
    registrationNumber: string;
    award: string;
    graduationYear: string;
    totalCopies: number;
    collectionMethod?: 'Physical Collection' | 'Post by DHL';
    receipts: { fileName: string; receiptData: string; sizeText?: string }[];
    receiptNote?: string;
    postingRegion?: string;
    postingWard?: string;
    postingPoBox?: string;
    postingAddress?: string;
    postingContactPhone?: string;
    postingContactEmail?: string;
  }): Promise<TranscriptPaymentRequest[]> {
    const preparedReceipts = await Promise.all(
      params.receipts.map(async (r) => {
        const storageId = 'rcpt-' + crypto.randomUUID();
        const mimeType = this.receiptFileStore.detectMimeType(r.receiptData, r.fileName);
        await this.receiptFileStore.saveReceipt(storageId, r.receiptData, r.fileName);
        return {
          fileName: r.fileName,
          receiptData: r.receiptData,
          sizeText: r.sizeText,
          storageId,
          mimeType
        };
      })
    );

    return this.buildAndSaveMultipleCopyRequests({
      ...params,
      receipts: preparedReceipts
    });
  }

  createMultipleCopyRequests(params: {
    studentId: string;
    studentName: string;
    registrationNumber: string;
    award: string;
    graduationYear: string;
    totalCopies: number;
    collectionMethod?: 'Physical Collection' | 'Post by DHL';
    receipts: { fileName: string; receiptData: string; sizeText?: string; storageId?: string; mimeType?: string }[];
    receiptNote?: string;
    postingRegion?: string;
    postingWard?: string;
    postingPoBox?: string;
    postingAddress?: string;
    postingContactPhone?: string;
    postingContactEmail?: string;
  }): TranscriptPaymentRequest[] {
    const preparedReceipts = params.receipts.map((r) => {
      const storageId = r.storageId || ('rcpt-' + crypto.randomUUID());
      const mimeType = r.mimeType || this.receiptFileStore.detectMimeType(r.receiptData, r.fileName);
      void this.receiptFileStore.saveReceipt(storageId, r.receiptData, r.fileName);
      return {
        fileName: r.fileName,
        receiptData: r.receiptData,
        sizeText: r.sizeText,
        storageId,
        mimeType
      };
    });

    return this.buildAndSaveMultipleCopyRequests({
      ...params,
      receipts: preparedReceipts
    });
  }

  private buildAndSaveMultipleCopyRequests(params: {
    studentId: string;
    studentName: string;
    registrationNumber: string;
    award: string;
    graduationYear: string;
    totalCopies: number;
    collectionMethod?: 'Physical Collection' | 'Post by DHL';
    receipts: { fileName: string; receiptData: string; sizeText?: string; storageId: string; mimeType: string }[];
    receiptNote?: string;
    postingRegion?: string;
    postingWard?: string;
    postingPoBox?: string;
    postingAddress?: string;
    postingContactPhone?: string;
    postingContactEmail?: string;
  }): TranscriptPaymentRequest[] {
    // Replace any previously rejected receipt batch for this student so active submission is clean
    const all = this.getAllRequests().filter(
      existing => !(existing.studentId === params.studentId && existing.status === 'Receipt Rejected')
    );
    const count = Math.max(1, Math.floor(params.totalCopies));
    const created: TranscriptPaymentRequest[] = [];
    const now = new Date().toISOString();
    const sharedControlNo = '99' + Math.floor(1000000000 + Math.random() * 9000000000).toString();

    // Store lightweight IDB pointers in receipts[] array to avoid duplicating MBs across copies
    const lightweightReceipts = params.receipts.map(r => ({
      fileName: r.fileName,
      receiptData: r.receiptData.length <= 200000 ? r.receiptData : `IDB:${r.storageId}`,
      sizeText: r.sizeText,
      storageId: r.storageId,
      mimeType: r.mimeType
    }));

    for (let i = 1; i <= count; i++) {
      const costForThisCopy = i === 1 ? 15000 : 5000;
      const primaryReceipt = params.receipts.length > 0
        ? (params.receipts[(i - 1) % params.receipts.length] || params.receipts[0])
        : undefined;

      const inlineOrIdbData = primaryReceipt
        ? (primaryReceipt.receiptData.length <= 350000 ? primaryReceipt.receiptData : `IDB:${primaryReceipt.storageId}`)
        : undefined;

      const req: TranscriptPaymentRequest = {
        id: crypto.randomUUID(),
        studentId: params.studentId,
        studentName: params.studentName,
        registrationNumber: params.registrationNumber,
        award: params.award || 'Degree Certificate & Transcript',
        graduationYear: params.graduationYear || '2024',
        transcriptCount: 1,
        copyNumber: i,
        totalCopies: count,
        amount: costForThisCopy,
        currency: 'TZS',
        controlNumber: sharedControlNo,
        controlNumberIssuedAt: now,
        attemptNumber: i,
        requestedAt: now,
        status: 'Receipt Submitted',
        receiptSubmittedAt: now,
        receiptFileName: primaryReceipt?.fileName,
        receiptData: inlineOrIdbData,
        receiptStorageId: primaryReceipt?.storageId,
        receiptMimeType: primaryReceipt?.mimeType,
        receipts: lightweightReceipts,
        receiptNote: params.receiptNote,
        collectionMethod: params.collectionMethod,
        postingRegion: params.postingRegion,
        postingWard: params.postingWard,
        postingPoBox: params.postingPoBox,
        postingAddress: params.postingAddress,
        postingContactPhone: params.postingContactPhone,
        postingContactEmail: params.postingContactEmail,
        dispatchStatus: params.collectionMethod ? 'Pending Dispatch' : undefined
      };

      all.push(req);
      created.push(req);
    }

    const saved = this.storage.save(this.requestKey, all);
    if (!saved) {
      // Quota fallback: replace inline base64 across all rows with IDB references (data is safely in IndexedDB)
      for (const item of all) {
        if (item.receiptStorageId) {
          item.receiptData = `IDB:${item.receiptStorageId}`;
        }
        if (item.receipts) {
          item.receipts = item.receipts.map(r => ({
            ...r,
            receiptData: r.storageId ? `IDB:${r.storageId}` : ''
          }));
        }
      }
      this.storage.save(this.requestKey, all);
    }

    return created;
  }

  issueControlNumber(requestId: string, controlNumber: string): boolean {
    const request = this.getAllRequests().find(item => item.id === requestId);
    if (!request || !controlNumber.trim()) {
      return false;
    }

    request.controlNumber = controlNumber.trim();
    request.controlNumberIssuedAt = new Date().toISOString();
    request.status = 'Awaiting Payment';
    this.save(request);
    return true;
  }

  rejectReceipt(requestId: string, reason: string): boolean {
    const all = this.getAllRequests();
    const request = all.find(item => item.id === requestId);
    if (!request || request.status !== 'Receipt Submitted') {
      return false;
    }

    all.forEach(item => {
      if (item.studentId === request.studentId && item.status === 'Receipt Submitted') {
        item.status = 'Receipt Rejected';
        item.rejectionReason = reason;
      }
    });
    this.storage.save(this.requestKey, all);
    return true;
  }

  submitReceipt(requestId: string, fileName: string, receiptData: string): boolean {
    const all = this.getAllRequests();
    const request = all.find(item => item.id === requestId);
    if (!request) {
      return false;
    }

    const storageId = 'rcpt-' + crypto.randomUUID();
    const mimeType = this.receiptFileStore.detectMimeType(receiptData, fileName);
    void this.receiptFileStore.saveReceipt(storageId, receiptData, fileName);

    request.receiptFileName = fileName;
    request.receiptStorageId = storageId;
    request.receiptMimeType = mimeType;
    request.receiptData = receiptData.length <= 350000 ? receiptData : `IDB:${storageId}`;
    request.receiptSubmittedAt = new Date().toISOString();
    request.status = 'Receipt Submitted';

    const index = all.findIndex(item => item.id === request.id);
    all[index] = request;

    const saved = this.storage.save(this.requestKey, all);
    if (!saved) {
      request.receiptData = `IDB:${storageId}`;
      all[index] = request;
      return this.storage.save(this.requestKey, all);
    }
    return true;
  }

  updateStatus(requestId: string, status: TranscriptPaymentStatus): boolean {
    const all = this.getAllRequests();
    const request = all.find(item => item.id === requestId);
    if (!request) return false;
    request.status = status;
    // Update all matching batch copy requests for the same student
    all.forEach(item => {
      if (item.studentId === request.studentId && (item.status === 'Receipt Submitted' || status === 'Paid')) {
        item.status = status;
      }
    });
    this.storage.save(this.requestKey, all);
    return true;
  }

  updateVerificationStatus(requestId: string, verified: boolean): boolean {
    const request = this.getAllRequests().find(item => item.id === requestId);
    if (!request) return false;
    request.certificateVerified = verified;
    request.certificateVerifiedAt = verified ? new Date().toISOString() : undefined;
    if (verified && !request.digitalSignatureHash) {
      request.digitalSignatureHash = 'UDSM-DUS-SIG-' + Math.floor(100000000 + Math.random() * 900000000);
      request.signedBy = 'DUS Directorate Secretary';
      request.signedAt = new Date().toISOString();
    }
    this.save(request);
    return true;
  }

  applyDigitalSignature(requestId: string, signatureData: string, signatureHash: string, signedBy: string): boolean {
    const request = this.getAllRequests().find(item => item.id === requestId);
    if (!request) return false;
    request.digitalSignature = signatureData;
    request.digitalSignatureHash = signatureHash;
    request.signedBy = signedBy;
    request.signedAt = new Date().toISOString();
    this.save(request);
    return true;
  }

  updateCollection(requestId: string, collectionMethod: 'Physical Collection' | 'Post by DHL', postingAddress?: string): boolean {
    const request = this.getAllRequests().find(item => item.id === requestId);
    if (!request) return false;
    request.collectionMethod = collectionMethod;
    request.postingAddress = collectionMethod === 'Post by DHL' ? postingAddress?.trim() : undefined;
    this.save(request);
    return true;
  }

  updateCollectionDetails(
    requestId: string,
    collectionMethod: 'Physical Collection' | 'Post by DHL',
    postingAddress: string,
    postingRegion?: string,
    postingWard?: string,
    postingPoBox?: string,
    postingContactPhone?: string,
    postingContactEmail?: string
  ): boolean {
    const all = this.getAllRequests();
    const request = all.find(item => item.id === requestId);
    if (!request) return false;

    // Update target request and all copy requests belonging to this student
    all.forEach(item => {
      if (item.id === requestId || item.studentId === request.studentId) {
        item.collectionMethod = collectionMethod;
        item.postingAddress = postingAddress;
        item.postingRegion = postingRegion;
        item.postingWard = postingWard;
        item.postingPoBox = postingPoBox;
        item.postingContactPhone = postingContactPhone;
        item.postingContactEmail = postingContactEmail;
        item.dispatchStatus = item.dispatchStatus || 'Pending Dispatch';
      }
    });

    this.storage.save(this.requestKey, all);
    return true;
  }

  markDispatched(requestId: string): boolean {
    const request = this.getAllRequests().find(item => item.id === requestId);
    if (!request) return false;
    request.dispatchStatus = 'Dispatched';
    request.dispatchedAt = new Date().toISOString();
    this.save(request);
    return true;
  }

  stationIntake(
    requestId: string,
    stationCode: string,
    stationName: string,
    vaultLocker: string,
    receivedBy: string,
    condition?: string
  ): boolean {
    const request = this.getAllRequests().find(item => item.id === requestId);
    if (!request) return false;
    request.stationCode = stationCode;
    request.stationName = stationName;
    request.vaultLockerNumber = vaultLocker;
    request.stationReceivedBy = receivedBy;
    request.packageCondition = condition || 'Intact & Sealed';
    request.intakeStatus = 'Received at Station';
    request.stationReceivedAt = new Date().toISOString();
    this.save(request);
    return true;
  }

  stationHandover(
    requestId: string,
    collectorType: 'Student in Person' | 'Authorized Legal Representative',
    collectorName: string,
    collectorId: string,
    collectorPhone: string,
    secretary: string,
    token: string,
    notes?: string
  ): boolean {
    const request = this.getAllRequests().find(item => item.id === requestId);
    if (!request) return false;
    request.dispatchStatus = 'Collected';
    request.intakeStatus = 'Collected by Student';
    request.handoverApproved = true;
    request.handoverApprovedAt = new Date().toISOString();
    request.handoverSecretary = secretary;
    request.handoverCollectorType = collectorType;
    request.handoverCollectorName = collectorName;
    request.handoverCollectorId = collectorId;
    request.handoverCollectorPhone = collectorPhone;
    request.handoverReceiptToken = token;
    request.handoverNotes = notes;
    this.save(request);
    return true;
  }

  reportDiscrepancy(requestId: string, note: string): boolean {
    const request = this.getAllRequests().find(item => item.id === requestId);
    if (!request) return false;
    request.transitIssueNotes = note;
    this.save(request);
    return true;
  }

  private save(request: TranscriptPaymentRequest): void {
    const requests = this.getAllRequests();
    const index = requests.findIndex(item => item.id === request.id);
    if (index === -1) return;
    requests[index] = request;
    this.storage.save(this.requestKey, requests);
  }
}