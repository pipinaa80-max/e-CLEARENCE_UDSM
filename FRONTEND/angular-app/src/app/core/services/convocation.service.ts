// convocation.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ConfigService } from './config.service';
import { StorageService } from './storage.service';

export interface ConvocationReceiptRequest {
  studentId: string;
  controlNumber: string;
  receiptNumber?: string;
  paymentDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConvocationService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly storage = new StorageService();
  private readonly apiUrl = `${this.config.apiUrl}/convocation`;
  private readonly tokenKey = 'udsm-auth-token';

  private getAuthHeaders(): HttpHeaders {
    const token = this.storage.get<string>(this.tokenKey);
    if (!token) {
        console.warn('No auth token found in storage for ConvocationService call');
        return new HttpHeaders();
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  submitReceipt(request: ConvocationReceiptRequest, file: File): Observable<any> {
    const formData = new FormData();

    // Create a blob from the request data
    const requestBlob = new Blob([JSON.stringify(request)], {
      type: 'application/json'
    });

    formData.append('receipt', requestBlob);
    formData.append('file', file);

    return this.http.post<any>(`${this.apiUrl}/submit-receipt`, formData, {
      headers: this.getAuthHeaders()
    });
  }

  getPendingReceipts(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/pending`, {
      headers: this.getAuthHeaders()
    });
  }

  approveReceipt(receiptId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/approve/${receiptId}`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  rejectReceipt(receiptId: string, reason: string): Observable<any> {
    const params = new HttpParams().set('reason', reason);
    return this.http.post<any>(`${this.apiUrl}/reject/${receiptId}`, {}, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  getReceiptStatus(studentId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/status/${studentId}`, {
      headers: this.getAuthHeaders()
    });
  }
}
