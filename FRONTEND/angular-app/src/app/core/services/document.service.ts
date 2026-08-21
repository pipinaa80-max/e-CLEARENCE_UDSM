// document.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ConfigService } from './config.service';

export interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize: number;
  description?: string;
  uploadDate: string;
  category: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedDate?: string;
  verificationComment?: string;
  studentId: string;
  studentName: string;
}

export interface DocumentUploadRequest {
  studentId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  description?: string;
}

export interface PageableResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private get baseUrl(): string {
    return `${this.configService.apiUrl}/documents`;
  }

  constructor(
      private http: HttpClient,
      private configService: ConfigService
  ) {}

  uploadDocument(documentData: DocumentUploadRequest, file: File): Observable<Document> {
    const formData = new FormData();

    // Create a blob from the document data
    const documentBlob = new Blob([JSON.stringify(documentData)], {
      type: 'application/json'
    });

    formData.append('document', documentBlob);
    formData.append('file', file);

    return this.http.post<{ success: boolean; message: string; data: Document }>(
        `${this.baseUrl}/upload`,
        formData
    ).pipe(map(response => response.data));
  }

  getStudentDocuments(studentId: string, page: number = 0, size: number = 10): Observable<PageableResponse<Document>> {
    const params = new HttpParams()
        .set('page', page.toString())
        .set('size', size.toString());

    return this.http.get<PageableResponse<Document>>(
        `${this.baseUrl}/student/${studentId}`,
        { params }
    );
  }

  getDocumentCategories(studentId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/student/${studentId}/categories`);
  }

  getMissingDocuments(studentId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/student/${studentId}/missing`);
  }

  hasRequiredDocuments(studentId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/student/${studentId}/has-required`);
  }

  verifyDocument(documentId: string, officerId: string, verified: boolean, comment?: string): Observable<any> {
    let params = new HttpParams()
        .set('officerId', officerId)
        .set('verified', verified.toString());

    if (comment) {
      params = params.set('comment', comment);
    }

    return this.http.put(`${this.baseUrl}/verify/${documentId}`, null, { params });
  }

  getVerificationStatus(studentId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/student/${studentId}/verification-status`);
  }

  deleteDocument(documentId: string, studentId: string): Observable<any> {
    const params = new HttpParams().set('studentId', studentId);
    return this.http.delete(`${this.baseUrl}/${documentId}`, { params });
  }
}