import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly storage = new StorageService();
  private readonly apiUrl = `${this.config.apiUrl}/admin`;
  private readonly tokenKey = 'udsm-auth-token';

  private getAuthHeaders(): HttpHeaders {
    const token = this.storage.get<string>(this.tokenKey);
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`, { headers: this.getAuthHeaders() });
  }

  getAllRoles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/roles`, { headers: this.getAuthHeaders() });
  }

  createUser(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users`, userData, { headers: this.getAuthHeaders() });
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/users/${userId}`, { headers: this.getAuthHeaders() });
  }

  updateUserRole(userId: string, role: string): Observable<any> {
    const params = new HttpParams().set('role', role);
    return this.http.put<any>(`${this.apiUrl}/users/${userId}/role`, {}, {
      headers: this.getAuthHeaders(), params
    });
  }

  updateUserStatus(userId: string, isActive: boolean): Observable<any> {
    const endpoint = isActive ? 'activate' : 'deactivate';
    return this.http.put<any>(`${this.config.apiUrl}/auth/${endpoint}/${userId}`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  getAllClearanceRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/clearance-requests`, { headers: this.getAuthHeaders() });
  }

  bulkUploadUsers(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/users/bulk-upload`, formData, { headers: this.getAuthHeaders() });
  }

  importLocalStorage(exportData: { users?: any[]; clearanceRequests?: any[]; documents?: any[] }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/import/local-storage`, exportData, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Explicit opt-in bridge for data collected by older clients. The backend
   * validates the supported contract and refuses unsupported records.
   */
  importCurrentLocalStorage(): Observable<any> {
    return this.importLocalStorage({
      users: this.storage.get<any[]>('udsm-local-users') ?? [],
      clearanceRequests: this.storage.get<any[]>('udsm-clearance-requests') ?? [],
      documents: []
    });
  }
}
