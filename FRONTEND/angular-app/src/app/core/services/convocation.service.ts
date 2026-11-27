// convocation.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { StorageService } from './storage.service';

export interface ConvocationReceiptRequest {
  studentId?: string;
  controlNumber: string;
  receiptNumber?: string;
  paymentDate?: string;
}

export interface ConvocationReceipt {
  id: string;
  studentId: string;
  studentName: string;
  registrationNumber: string;
  programme?: string;
  department?: string;
  college?: string;
  controlNumber: string;
  receiptNumber?: string;
  paymentDate?: string;
  fileUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  comments?: string;
  submittedAt?: string;
}

export interface ConvocationPendingResponse {
  receipts: ConvocationReceipt[];
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class ConvocationService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly storage = new StorageService();

  private get apiUrl(): string {
    return `${this.config.apiUrl}/convocation`;
  }

  private getAuthHeaders(): HttpHeaders {
    let token = this.storage.get<string>('udsm-auth-token');
    if (!token && typeof localStorage !== 'undefined') {
      token = localStorage.getItem('udsm-auth-token');
    }
    if (!token) return new HttpHeaders();
    token = token.replace(/^"|"$/g, '').trim();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  /**
   * Submit payment control number (clean JSON when no file, or multipart FormData if a receipt file is attached).
   */
  submitReceipt(request: ConvocationReceiptRequest, file?: File | null): Observable<any> {
    const headers = this.getAuthHeaders();
    if (!file) {
      return this.http.post<any>(`${this.apiUrl}/submit-receipt`, request, { headers });
    }

    const formData = new FormData();
    const requestBlob = new Blob([JSON.stringify(request)], {
      type: 'application/json'
    });
    formData.append('receipt', requestBlob);
    formData.append('file', file);

    return this.http.post<any>(`${this.apiUrl}/submit-receipt`, formData, { headers });
  }

  getPendingReceipts(): Observable<ConvocationPendingResponse> {
    return this.http.get<ConvocationPendingResponse>(`${this.apiUrl}/pending`, {
      headers: this.getAuthHeaders()
    });
  }

  approveReceipt(receiptId: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/approve/${encodeURIComponent(receiptId)}`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  rejectReceipt(receiptId: string, reason: string): Observable<{ success: boolean; message: string }> {
    const params = new HttpParams().set('reason', reason);
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/reject/${encodeURIComponent(receiptId)}`,
      { reason },
      { headers: this.getAuthHeaders(), params }
    );
  }

  getReceiptStatus(studentId: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/status/${encodeURIComponent(studentId)}`,
      { headers: this.getAuthHeaders() }
    );
  }
}
