import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import {
  TranscriptPaymentRequest,
  TranscriptPaymentStatus
} from '../../transcript/transcript-payment.model';

@Injectable({ providedIn: 'root' })
export class TranscriptPaymentService {
  private readonly storage = new StorageService();
  private readonly requestKey = 'udsm-transcript-payment-requests';

  getAllRequests(): TranscriptPaymentRequest[] {
    return this.storage.get<TranscriptPaymentRequest[]>(this.requestKey) ?? [];
  }

  getStudentRequests(studentId: string): TranscriptPaymentRequest[] {
    return this.getAllRequests().filter(request => request.studentId === studentId);
  }

  createRequest(data: Omit<TranscriptPaymentRequest, 'id' | 'amount' | 'currency' | 'attemptNumber' | 'status' | 'requestedAt' | 'controlNumberRequestedAt'>): TranscriptPaymentRequest {
    const requests = this.getAllRequests();
    const studentRequests = requests.filter(request => request.studentId === data.studentId);
    const transcriptCount = Math.max(1, Math.floor(data.transcriptCount));
    const request: TranscriptPaymentRequest = {
      ...data,
      id: crypto.randomUUID(),
      transcriptCount,
      amount: studentRequests.length === 0
        ? 15000 + (transcriptCount - 1) * 5000
        : transcriptCount * 5000,
      currency: 'TZS',
      attemptNumber: studentRequests.length + 1,
      status: 'Pending Control Number',
      requestedAt: new Date().toISOString(),
      controlNumberRequestedAt: new Date().toISOString()
    };

    requests.push(request);
    this.storage.save(this.requestKey, requests);
    return request;
  }

  issueControlNumber(requestId: string, controlNumber: string): boolean {
    const request = this.getAllRequests().find(item => item.id === requestId);
    if (!request || request.status !== 'Pending Control Number' || !controlNumber.trim()) {
      return false;
    }

    request.controlNumber = controlNumber.trim();
    request.controlNumberIssuedAt = new Date().toISOString();
    request.status = 'Awaiting Payment';
    this.save(request);
    return true;
  }

  submitReceipt(requestId: string, fileName: string, receiptData: string): boolean {
    const request = this.getAllRequests().find(item => item.id === requestId);
    if (!request || request.status !== 'Awaiting Payment' || !request.controlNumber) {
      return false;
    }

    request.receiptFileName = fileName;
    request.receiptData = receiptData;
    request.receiptSubmittedAt = new Date().toISOString();
    request.status = 'Receipt Submitted';
    this.save(request);
    return true;
  }

  updateStatus(requestId: string, status: TranscriptPaymentStatus): boolean {
    const request = this.getAllRequests().find(item => item.id === requestId);
    if (!request) return false;
    request.status = status;
    this.save(request);
    return true;
  }

  updateCollection(requestId: string, collectionMethod: 'Physical Collection' | 'Post', postingAddress?: string): boolean {
    const request = this.getAllRequests().find(item => item.id === requestId);
    if (!request) return false;
    request.collectionMethod = collectionMethod;
    request.postingAddress = collectionMethod === 'Post' ? postingAddress?.trim() : undefined;
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