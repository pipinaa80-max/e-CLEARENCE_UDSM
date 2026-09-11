import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, tap, map, catchError, timeout, throwError } from 'rxjs';
import { UserRole } from '../models/user.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = new StorageService();
  private readonly apiUrl = 'http://localhost:8080/api/v1/auth';
  private readonly currentUserKey = 'udsm-current-user';
  private readonly tokenKey = 'udsm-auth-token';

  register(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user).pipe(timeout(30000));
  }

  login(identifier: string, password: string): Observable<any> {
    const normalized = identifier.trim();
    return this.http.post<any>(`${this.apiUrl}/login`, { identifier: normalized, password }).pipe(
      timeout(15000),
      map(response => {
        const data = response.data || response;
        const user = this.mapUserResponse(data);
        this.persist(user, data.access_token || data.accessToken || data.token);
        return user;
      }),
      catchError(error => {
        if (error?.status === 0 || error?.status === 401 || error?.status === 403 || normalized.toLowerCase().endsWith('@admin.local')) {
          return this.loginWithSuperuserBackend(normalized, password);
        }
        return throwError(() => error);
      })
    );
  }

  private loginWithSuperuserBackend(email: string, password: string): Observable<any> {
    return this.http.post<any>('http://localhost:8090/api/login', { email, password }).pipe(
      map(response => {
        const admin = response.user ?? {};
        const user = {
          ...admin,
          id: admin.adminId ?? admin.id ?? admin.email,
          fullName: admin.name ?? admin.fullName ?? admin.email,
          email: admin.email,
          role: admin.role === 'SUPERUSER' ? 'Administrator' as UserRole : 'Administrator' as UserRole,
          projectId: admin.projectId,
          permissions: admin.permissions ?? []
        };
        this.persist(user, response.token);
        return user;
      })
    );
  }

  public mapRole(roleInput: any): UserRole {
    // Safety check: deeply unwrap role if it's nested as an object (due to previous bug)
    let current = roleInput;
    let depth = 0;
    while (current && typeof current === 'object' && depth < 5) {
      current = current.role;
      depth++;
    }

    const roleString = String(current || '').trim().toUpperCase();
    const map: Record<string, UserRole> = {
      STUDENT: 'Student',
      CONVOCATION_OFFICER: 'Convocation',
      GAMES_COACH: 'Games Coach',
      HALL_WARDEN: 'Hall Warden',
      USAB_OFFICER: 'USAB',
      DARUSO_OFFICER: 'DARUSO',
      LIBRARY_OFFICER: 'Library',
      DEAN_OF_STUDENTS: 'Dean of Students',
      SMART_CARD_OFFICER: 'Smart Card',
      WORKSHOP_OFFICER: 'Workshop',
      PRINCIPAL: 'Principal',
      FINANCE_OFFICER: 'Finance',
      ICT_OFFICER: 'ICT',
      DEPARTMENT_OFFICER: 'Department',
      LABORATORY_OFFICER: 'Laboratory',
      ADMINISTRATOR: 'Administrator',
      ADMIN: 'Administrator',
      SUPERUSER: 'Administrator'
    };

    if (map[roleString]) return map[roleString];
    if (roleString === 'ACADEMIC STAFF') return 'Academic Staff';

    // Default to Student to prevent infinite redirect loops if role is invalid
    return 'Student';
  }

  public mapUserResponse(response: any): any {
    const user = {
      ...response,
      id: response.user_id || response.id,
      fullName: response.full_name || response.fullName,
      registrationNumber: response.registration_number || response.registrationNumber,
      college: response.college || response.faculty,
      phoneNumber: response.phone_number || response.phoneNumber || response.phone,
      isActive: response.isActive !== undefined ? response.isActive : (response.active !== undefined ? response.active : response.is_active),
      lastLogin: response.last_login || response.lastLogin,
      createdAt: response.created_at || response.createdAt,
      updatedAt: response.updated_at || response.updatedAt,
      clearanceStatus: response.clearance_status || response.clearanceStatus,
      isFinalYear: response.isFinalYear !== undefined ? response.isFinalYear : (response.finalYear !== undefined ? response.finalYear : response.is_final_year)
    };
    if (user.role) user.role = this.mapRole(user.role);
    return user;
  }

  refreshToken(refreshToken: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/refresh?refreshToken=${refreshToken}`, {});
  }

  logout(): Observable<any> {
    this.storage.remove(this.currentUserKey);
    this.storage.remove(this.tokenKey);
    return of({});
  }

  changePassword(data: { currentPassword: string; newPassword: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/change-password`, data, { headers: this.getAuthHeaders() });
  }

  resetPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password?email=${email}`, {});
  }

  resetPasswordConfirm(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password/confirm?token=${token}&newPassword=${newPassword}`, {});
  }

  getProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/profile`, { headers: this.getAuthHeaders() }).pipe(
      tap(response => this.storage.save(this.currentUserKey, this.mapUserResponse(response)))
    );
  }

  updateProfile(userData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile`, userData, { headers: this.getAuthHeaders() });
  }

  getUserProfile(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/profile/${userId}`, { headers: this.getAuthHeaders() });
  }

  activateAccount(userId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/activate/${userId}`, {}, { headers: this.getAuthHeaders() });
  }

  deactivateAccount(userId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/deactivate/${userId}`, {}, { headers: this.getAuthHeaders() });
  }

  private cachedUser: any | null = null;

  getCurrentUser(): any | null {
    if (this.cachedUser) return this.cachedUser;

    const user = this.storage.get<any>(this.currentUserKey);
    if (!user) return null;

    this.cachedUser = { ...user, role: this.mapRole(user.role) };
    return this.cachedUser;
  }

  getToken(): string | null {
    return this.storage.get<string>(this.tokenKey)?.replace(/^"|"$/g, '') || null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.getCurrentUser();
  }

  updateCurrentUser(user: any): void {
    this.cachedUser = this.mapUserResponse(user);
    this.storage.save(this.currentUserKey, this.cachedUser);
  }

  logoutLocal(): void {
    this.cachedUser = null;
    this.storage.remove(this.currentUserKey);
    this.storage.remove(this.tokenKey);
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private persist(user: any, token: string | undefined): void {
    this.cachedUser = user;
    this.storage.save(this.currentUserKey, user);
    if (token) this.storage.save(this.tokenKey, token);
  }
}
