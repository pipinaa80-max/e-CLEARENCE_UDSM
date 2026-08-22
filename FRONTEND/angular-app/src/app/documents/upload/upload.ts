// clearance.service.ts
import { Injectable } from '@angular/core';
import { Observable, map, catchError, throwError } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import {StorageService} from "../../core/services/storage.service";
import {ConfigService} from "../../core/services/config.service";

export interface ClearanceRequestDTO {
  registrationNumber: string;
  studentName: string;
  email?: string;
  phoneNumber?: string;
  programme: string;
  faculty: string;
  department: string;
  yearOfStudy: string;
  academicYear: string;
  semester: string;
  reason: string;
  comments?: string;
  clearanceType: 'FINAL_YEAR_CLEARANCE' | 'SEMESTER_CLEARANCE' | 'GRADUATION_CLEARANCE' | 'DEPARTMENT_TRANSFER' | 'OTHER';
  selectedDepartments?: string[];
  allDepartments?: boolean;
  documents?: any[];
  hasSupportingDocuments?: boolean;
  additionalInfo?: any;
}

@Injectable({ providedIn: 'root' })
export class ClearanceService {
  private readonly storage = new StorageService();
  private readonly draftKey = 'udsm-clearance-drafts';
  private readonly requestKey = 'udsm-clearance-requests';

  constructor(
      private http: HttpClient,
      private configService: ConfigService
  ) {}

  private get baseUrl(): string {
    return `${this.configService.apiUrl}/clearance`;
  }

  // Draft methods
  saveDraft(studentId: string, clearanceType: string, remarks: string, academicProfile?: any): void {
    const drafts = this.storage.get<Record<string, any>>(this.draftKey) ?? {};
    drafts[studentId] = { clearanceType, remarks, academicProfile };
    this.storage.save(this.draftKey, drafts);
  }

  getDraft(studentId: string): any | null {
    return (this.storage.get<Record<string, any>>(this.draftKey) ?? {})[studentId] ?? null;
  }

  clearDraft(studentId: string): void {
    const drafts = this.storage.get<Record<string, any>>(this.draftKey) ?? {};
    delete drafts[studentId];
    this.storage.save(this.draftKey, drafts);
  }

  // Create request with backend
  createRequest(request: any): Observable<any> {
    const dto: ClearanceRequestDTO = {
      registrationNumber: request.studentId,
      studentName: request.studentName || 'Student',
      programme: request.programme || '',
      faculty: request.college || '',
      department: request.department || '',
      yearOfStudy: '3',
      academicYear: '2024/2025',
      semester: '1',
      reason: request.remarks || 'Clearance request',
      comments: request.remarks,
      clearanceType: this.mapClearanceType(request.clearanceType),
      selectedDepartments: ['Library', 'Finance', 'Academic Affairs', 'ICT Division'],
      allDepartments: false,
      hasSupportingDocuments: false
    };

    return this.http.post(`${this.baseUrl}/request`, dto).pipe(
        catchError(this.handleError)
    );
  }

  private mapClearanceType(type: string): any {
    const map: Record<string, string> = {
      'Graduation Clearance': 'GRADUATION_CLEARANCE',
      'Semester Clearance': 'SEMESTER_CLEARANCE',
      'Final Year Clearance': 'FINAL_YEAR_CLEARANCE',
      'Department Transfer': 'DEPARTMENT_TRANSFER'
    };
    return map[type] || 'OTHER';
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred while processing your request.';
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return throwError(() => new Error(errorMessage));
  }
}