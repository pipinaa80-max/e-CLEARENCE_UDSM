import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User, UserRole } from '../models/user.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = new StorageService();

  private readonly apiUrl = 'http://localhost:8080/api/v1/auth';

  private readonly currentUserKey = 'udsm-current-user';
  private readonly tokenKey = 'udsm-auth-token';

  register(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user);
  }

  login(identifier: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, {
      identifier: identifier,
      password,
      rememberMe: false
    }).pipe(
      tap((response) => {
        // Handle JwtResponse fields
        const token = response.access_token || response.accessToken;
        if (token) {
          this.storage.save(this.tokenKey, token);
        }

        // Map backend response to frontend User model
        const user = this.mapUserResponse(response);
        this.storage.save(this.currentUserKey, user);
      })
    );
  }

  private mapUserResponse(response: any): any {
    // Convert snake_case from backend to camelCase for frontend
    const user = {
      ...response,
      id: response.user_id || response.id,
      fullName: response.full_name || response.fullName,
      registrationNumber: response.registration_number || response.registrationNumber,
      phoneNumber: response.phone_number || response.phoneNumber || response.phone,
      isActive: response.is_active !== undefined ? response.is_active : response.isActive,
      lastLogin: response.last_login || response.lastLogin,
      createdAt: response.created_at || response.createdAt,
      updatedAt: response.updated_at || response.updatedAt,
      clearanceStatus: response.clearance_status || response.clearanceStatus,
      isFinalYear: response.is_final_year !== undefined ? response.is_final_year : response.isFinalYear
    };

    // Map role
    if (user.role) {
      user.role = this.mapRole(user);
    }

    return user;
  }

  private mapRole(user: any): UserRole {
    const backendRole = user.role;
    const department = user.department;

    const map: Record<string, UserRole> = {
      'STUDENT': 'Student',
      'LIBRARY_OFFICER': 'Library',
      'FINANCE_OFFICER': 'Finance',
      'ICT_OFFICER': 'ICT',
      'DEPARTMENT_OFFICER': 'Department',
      'ADMINISTRATOR': 'Administrator',
      'ADMIN': 'Administrator'
    };

    let role = map[backendRole] || (backendRole as UserRole);

    // Distinguish between Department and Academic Staff based on saved department name
    if (backendRole === 'DEPARTMENT_OFFICER' && department === 'Academic Staff') {
      role = 'Academic Staff';
    }

    return role;
  }

  refreshToken(refreshToken: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/refresh?refreshToken=${refreshToken}`, {});
  }

  logout(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/logout`, {}, { headers }).pipe(
      tap(() => {
        this.storage.remove(this.currentUserKey);
        this.storage.remove(this.tokenKey);
      })
    );
  }

  changePassword(data: { oldPassword: string; newPassword: string }): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/change-password`, data, { headers });
  }

  resetPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password?email=${email}`, {});
  }

  resetPasswordConfirm(token: string, newPassword: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/reset-password/confirm?token=${token}&newPassword=${newPassword}`,
      {}
    );
  }

  getProfile(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/profile`, { headers }).pipe(
      tap((response) => {
        const user = this.mapUserResponse(response);
        this.storage.save(this.currentUserKey, user);
      })
    );
  }

  updateProfile(userData: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/profile`, userData, { headers });
  }

  getUserProfile(userId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/profile/${userId}`, { headers });
  }

  activateAccount(userId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/activate/${userId}`, {}, { headers });
  }

  deactivateAccount(userId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/deactivate/${userId}`, {}, { headers });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.storage.get<string>(this.tokenKey);
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  logoutLocal(): void {
    this.storage.remove(this.currentUserKey);
    this.storage.remove(this.tokenKey);
  }

  getCurrentUser(): any | null {
    return this.storage.get<any>(this.currentUserKey);
  }

  getToken(): string | null {
    return this.storage.get<string>(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.getCurrentUser();
  }

  updateCurrentUser(user: any): void {
    this.storage.save(this.currentUserKey, user);
  }
}
