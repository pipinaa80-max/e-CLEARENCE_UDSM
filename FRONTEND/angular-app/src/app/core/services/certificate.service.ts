// src/app/core/services/certificate.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { ConfigService } from './config.service';
import { AuthService } from './auth.service';

export interface CertificateVerificationResponse {
  valid: boolean;
  certificateNumber?: string;
  verificationCode?: string;
  status?: string;
  issuedAt?: string;
  student?: {
    fullName: string;
    registrationNumber: string;
    programme?: string;
    college?: string;
    department?: string;
  };
  error?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CertificateService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly authService = inject(AuthService);

  private get authHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  /**
   * Stream and download the logged-in student's official clearance certificate PDF
   */
  downloadMyCertificate(): Observable<Blob> {
    const url = `${this.config.apiUrl}/clearance/my-certificate`;
    return this.http.get(url, {
      headers: this.authHeaders,
      responseType: 'blob'
    }).pipe(
      map(blob => {
        this.triggerFileDownload(blob, 'UDSM_Clearance_Certificate.pdf');
        return blob;
      })
    );
  }

  /**
   * Stream and download clearance certificate by request ID (staff or student)
   */
  downloadCertificate(requestId: string): Observable<Blob> {
    const url = `${this.config.apiUrl}/clearance/certificate/${encodeURIComponent(requestId)}`;
    return this.http.get(url, {
      headers: this.authHeaders,
      responseType: 'blob'
    }).pipe(
      map(blob => {
        this.triggerFileDownload(blob, `UDSM_Clearance_Certificate_${requestId}.pdf`);
        return blob;
      })
    );
  }

  /**
   * Public certificate verification endpoint (No authentication required)
   */
  verifyCertificate(code: string): Observable<CertificateVerificationResponse> {
    const url = `${this.config.apiUrl}/clearance/certificate/verify/${encodeURIComponent(code.trim())}`;
    return this.http.get<CertificateVerificationResponse>(url).pipe(
      catchError(err => {
        const errorMsg = err.error?.message || err.message || 'Certificate verification failed.';
        return of({
          valid: false,
          error: errorMsg,
          message: errorMsg
        });
      })
    );
  }

  /**
   * Utility helper to trigger browser download of a received binary Blob
   */
  private triggerFileDownload(blob: Blob, filename: string): void {
    if (typeof window === 'undefined') return;
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }
}
