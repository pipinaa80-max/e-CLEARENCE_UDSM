import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { ConfigService } from './config.service';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly storage = new StorageService();
  private readonly apiUrl = `${this.config.apiUrl}/admin`;
  private readonly tokenKey = 'udsm-auth-token';

  private getAuthHeaders(): HttpHeaders {
    const token = this.storage.get<string>(this.tokenKey);
    if (!token) {
        console.warn('No auth token found in storage for AdminService call');
        return new HttpHeaders();
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  private usesLocalProjectData(): boolean {
    const user = this.storage.get<any>('udsm-current-user');
    return user?.role === 'Administrator' && !!user?.projectId;
  }

  private localUsers(): any[] {
    return this.storage.get<any[]>('udsm-local-users') ?? [];
  }

  private localRequests(): any[] {
    return this.storage.get<any[]>('udsm-clearance-requests') ?? [];
  }

  getAllUsers(): Observable<any[]> {
    if (this.usesLocalProjectData()) return of(this.localUsers());
    return this.http.get<any[]>(`${this.apiUrl}/users`, { headers: this.getAuthHeaders() });
  }

  getAllRoles(): Observable<string[]> {
    if (this.usesLocalProjectData()) {
      const roles = this.localUsers().map(user => user.role).filter(Boolean);
      return of([...new Set(['STUDENT', 'ADMINISTRATOR', ...roles])]);
    }
    return this.http.get<string[]>(`${this.apiUrl}/roles`, { headers: this.getAuthHeaders() });
  }

  createUser(userData: any): Observable<any> {
    if (this.usesLocalProjectData()) {
      const users = this.localUsers();
      const user = { ...userData, id: crypto.randomUUID(), fullName: [userData.firstName, userData.middleName, userData.lastName].filter(Boolean).join(' '), isActive: false };
      this.storage.save('udsm-local-users', [...users, user]);
      return of(user);
    }
    return this.http.post<any>(`${this.apiUrl}/users`, userData, { headers: this.getAuthHeaders() });
  }

  deleteUser(userId: string): Observable<any> {
    if (this.usesLocalProjectData()) {
      const users = this.localUsers();
      const exists = users.some(user => user.id === userId);
      if (exists) this.storage.save('udsm-local-users', users.filter(user => user.id !== userId));
      return of({ success: exists, message: exists ? 'User deleted successfully' : 'User not found' });
    }
    return this.http.delete<any>(`${this.apiUrl}/users/${userId}`, { headers: this.getAuthHeaders() });
  }

  updateUserRole(userId: string, role: string): Observable<any> {
    if (this.usesLocalProjectData()) {
      const users = this.localUsers();
      const user = users.find(saved => saved.id === userId);
      if (user) {
        user.role = role;
        this.storage.save('udsm-local-users', users);
      }
      return of(user);
    }
    const params = new HttpParams().set('role', role);
    return this.http.put<any>(`${this.apiUrl}/users/${userId}/role`, {}, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  updateUserStatus(userId: string, isActive: boolean): Observable<any> {
    if (this.usesLocalProjectData()) {
      const users = this.localUsers();
      const user = users.find(saved => saved.id === userId);
      if (user) {
        user.isActive = isActive;
        this.storage.save('udsm-local-users', users);
      }
      return of(user);
    }

    const endpoint = isActive ? 'activate' : 'deactivate';
    return this.http.put<any>(`${this.config.apiUrl}/auth/${endpoint}/${userId}`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  getAllClearanceRequests(): Observable<any[]> {
    if (this.usesLocalProjectData()) return of(this.localRequests());
    return this.http.get<any[]>(`${this.apiUrl}/clearance-requests`, { headers: this.getAuthHeaders() });
  }

  bulkUploadUsers(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/users/bulk-upload`, formData, { headers: this.getAuthHeaders() });
  }
}
