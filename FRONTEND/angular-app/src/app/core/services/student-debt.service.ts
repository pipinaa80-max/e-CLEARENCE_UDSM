import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { StudentClearanceLookup, StudentDebtFlag } from '../models/student-debt.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class StudentDebtService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly endpoint = `${this.config.apiUrl}/student-debts`;
  private readonly storage = new StorageService();

  listForLecturer(): Observable<StudentDebtFlag[]> {
    return this.http.get<StudentDebtFlag[]>(this.endpoint, { headers: this.headers() });
  }

  lookupClearance(registrationNumber: string): Observable<StudentClearanceLookup> {
    const params = { registrationNumber: registrationNumber.trim() };
    return this.http.get<StudentClearanceLookup>(`${this.endpoint}/student-clearance`, {
      headers: this.headers(), params
    });
  }

  create(data: { registrationNumber: string; amount: number; reason: string; negotiationNotes?: string }): Observable<StudentDebtFlag> {
    return this.http.post<StudentDebtFlag>(this.endpoint, data, { headers: this.headers() });
  }

  resolve(id: string, resolutionNote: string): Observable<StudentDebtFlag> {
    return this.http.patch<StudentDebtFlag>(`${this.endpoint}/${encodeURIComponent(id)}/resolve`, { resolutionNote }, { headers: this.headers() });
  }

  listOpenForDepartment(): Observable<StudentDebtFlag[]> {
    return this.http.get<StudentDebtFlag[]>(`${this.endpoint}/department/open`, { headers: this.headers() });
  }

  private headers(): HttpHeaders {
    const token = this.storage.get<string>('udsm-auth-token')?.replace(/^"|"$/g, '') || null;
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
