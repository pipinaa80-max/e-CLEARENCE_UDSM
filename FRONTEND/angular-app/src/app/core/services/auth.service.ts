import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, tap, map, catchError, timeout, throwError } from 'rxjs';
import { UserRole } from '../models/user.model';
import { StorageService } from './storage.service';
import { SubdomainService } from './subdomain.service';

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
    const isControlPlaneAccount = normalized.toLowerCase().endsWith('@admin.local');
    // Only control-plane accounts need a fallback request after the main login fails.
    const headers = isControlPlaneAccount
      ? new HttpHeaders({ 'X-Skip-Error-Toast': 'true' })
      : undefined;

    return this.http.post<any>(`${this.apiUrl}/login`, { identifier: normalized, password }, headers ? { headers } : {}).pipe(
      timeout(15000),
      map(response => {
        const data = response.data || response;
        const user = this.mapUserResponse(data);

        if (this.isUserSuspended(user)) {
          this.logoutLocal();
          throw {
            status: 403,
            error: { message: 'Institutional Access Suspended: Access to all institutional staff and dashboards has been suspended.' },
            message: 'Institutional Access Suspended: Access to all institutional staff and dashboards has been suspended.'
          };
        }

        this.persist(user, data.access_token || data.accessToken || data.token);
        return user;
      }),
      catchError(error => {
        // Fallback to superuser backend (this request will show a toast if it fails)
        if (isControlPlaneAccount && (error?.status === 0 || error?.status === 401 || error?.status === 403)) {
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
      CONVOCATION: 'Convocation',
      GAMES_COACH: 'Games Coach',
      'GAMES COACH': 'Games Coach',
      HALL_WARDEN: 'Hall Warden',
      'HALL WARDEN': 'Hall Warden',
      USAB_OFFICER: 'USAB',
      USAB: 'USAB',
      DARUSO_OFFICER: 'DARUSO',
      DARUSO: 'DARUSO',
      LIBRARY_OFFICER: 'Library',
      LIBRARY: 'Library',
      DEAN_OF_STUDENTS: 'Dean of Students',
      'DEAN OF STUDENTS': 'Dean of Students',
      SMART_CARD_OFFICER: 'Smart Card',
      'SMART CARD': 'Smart Card',
      WORKSHOP_OFFICER: 'Workshop',
      WORKSHOP: 'Workshop',
      PRINCIPAL: 'Principal',
      FINANCE_OFFICER: 'Finance',
      FINANCE: 'Finance',
      ICT_OFFICER: 'ICT',
      ICT: 'ICT',
      DEPARTMENT_OFFICER: 'Department',
      DEPARTMENT: 'Department',
      LABORATORY_OFFICER: 'Laboratory',
      LABORATORY: 'Laboratory',
      'ACADEMIC STAFF': 'Academic Staff',
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
      award: response.award || 'Bachelor Degree',
      college: response.college || response.faculty,
      programme: response.programme,
      department: response.department,
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

  private isUserSuspended(user: any): boolean {
    if (!user) return false;

    // Check individual user active status
    if (user.isActive === false || user.active === false || user.is_active === false) {
      return true;
    }

    // Check tenant active status
    try {
      const subdomainService = inject(SubdomainService);
      const tenants = subdomainService.getSubdomains();
      const userEmail = (user.email || user.username || '').toLowerCase();
      const domain = userEmail.includes('@') ? userEmail.split('@')[1] : '';

      for (const t of tenants) {
        if (t.active === false) {
          const tDomain = (t.adminEmail || '').toLowerCase().split('@')[1];
          if (tDomain && domain && tDomain === domain) {
            return true;
          }
          if (user.projectId && t.id.includes(user.projectId)) {
            return true;
          }
          if (userEmail.includes('udom') || (user.college && user.college.toLowerCase().includes('dodoma'))) {
            if (t.subdomain === 'udom' || t.adminEmail.includes('udom')) {
              return true;
            }
          }
        }
      }
    } catch (_) {
      // Ignore injection error outside component context
    }

    return false;
  }

  private cachedUser: any | null = null;

  getCurrentUser(): any | null {
    const user = this.cachedUser || this.storage.get<any>(this.currentUserKey);
    if (!user) return null;

    if (this.isUserSuspended(user)) {
      this.logoutLocal();
      return null;
    }

    this.cachedUser = { ...user, role: this.mapRole(user.role) };
    return this.cachedUser;
  }

  getToken(): string | null {
    return this.storage.get<string>(this.tokenKey)?.replace(/^"|"$/g, '') || null;
  }

  isLoggedIn(): boolean {
    const user = this.getCurrentUser();
    const token = this.getToken();
    if (!token || !user) return false;
    return !this.isUserSuspended(user);
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
