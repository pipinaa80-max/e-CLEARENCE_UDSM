import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, tap, throwError, map, catchError, timeout } from 'rxjs';
import { User, UserRole } from '../models/user.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = new StorageService();

  private readonly apiUrl = 'http://localhost:8080/api/v1/auth';

  private readonly currentUserKey = 'udsm-current-user';
  private readonly tokenKey = 'udsm-auth-token';
  private readonly usersKey = 'udsm-local-users';

  register(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user).pipe(
      timeout(3000),
      tap(() => {
        // We don't save to local storage anymore, backend handles persistence
      }),
      catchError(() => this.registerLocally(user))
    );
  }

  private registerLocally(user: any): Observable<any> {
    const users = this.getLocalUsers();
    const email = String(user.email ?? '').trim().toLowerCase();
    if (users.some(saved => String(saved.email ?? '').toLowerCase() === email)) {
      return throwError(() => ({ error: { message: 'An account with this email already exists.' } }));
    }

    const localUser = {
      ...user,
      id: crypto.randomUUID(),
      email,
      fullName: [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' '),
      password: user.password,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    this.storage.save(this.usersKey, [...users, localUser]);
    return of({ message: 'Local staff account created successfully.', user: localUser });
  }

  login(identifier: string, password: string): Observable<any> {
    const normalizedIdentifier = identifier.trim();

    const loginWithProjectBackend = () => this.http.post<any>(`${this.apiUrl}/login`, { identifier: normalizedIdentifier, password }).pipe(
      timeout(3000),
      map((response) => {
        const data = response.data || response;
        const authenticatedUser = this.mapUserResponse(data);
        this.storage.save(this.currentUserKey, authenticatedUser);

        const token = data.access_token || data.accessToken || data.token;
        if (token) {
          this.storage.save(this.tokenKey, token);
          console.log('✅ Auth token saved successfully');
        } else {
          console.error('❌ No access token found in login response data', response);
        }

        return authenticatedUser;
      }),
      catchError((error) => {
        if (normalizedIdentifier.toLowerCase().endsWith('@admin.local')) {
          return this.loginWithSuperuserBackend(normalizedIdentifier, password);
        }

        return this.loginWithLocalUser(normalizedIdentifier, password).pipe(
          catchError(() => {
            const status = error?.status ?? 0;
            if (status === 0 || status === 401 || status === 403 || status === 404) {
              return this.loginWithSuperuserBackend(normalizedIdentifier, password);
            }
            return throwError(() => error);
          })
        );
      })
    );

    if (normalizedIdentifier.toLowerCase().endsWith('@admin.local')) {
      return this.loginWithSuperuserBackend(normalizedIdentifier, password);
    }

    return loginWithProjectBackend();
  }

  private loginWithLocalUser(identifier: string, password: string): Observable<any> {
    const user = this.getLocalUsers().find(saved =>
      String(saved.email ?? '').toLowerCase() === identifier.toLowerCase() && saved.password === password
    );
    if (!user) return throwError(() => new Error('Local account not found'));

    const authenticatedUser = this.mapUserResponse(user);
    this.storage.save(this.currentUserKey, authenticatedUser);
    this.storage.save(this.tokenKey, `local-${user.id}`);
    return of(authenticatedUser);
  }

  private loginWithSuperuserBackend(identifier: string, password: string): Observable<any> {
    return this.http.post<any>('http://localhost:8090/api/login', { email: identifier, password }).pipe(
      map((response) => {
        const admin = response.user ?? {};
        const authenticatedUser = {
          ...admin,
          id: admin.adminId ?? admin.id ?? admin.email,
          fullName: admin.name ?? admin.fullName ?? admin.email,
          email: admin.email,
          role: 'Administrator' as UserRole,
          projectId: admin.projectId,
          permissions: admin.permissions ?? []
        };

        this.storage.save(this.currentUserKey, authenticatedUser);
        this.storage.save(this.tokenKey, response.token);
        return authenticatedUser;
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
      college: response.college || response.faculty,
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
    const backendRole = String(user.role ?? '').trim().toUpperCase();
    const department = user.department;

    const map: Record<string, UserRole> = {
      'STUDENT': 'Student',
      'CONVOCATION_OFFICER': 'Convocation',
      'CONVOCATION': 'Convocation',
      'GAMES_COACH': 'Games Coach',
      'GAMES_COACH_OFFICER': 'Games Coach',
      'HALL_WARDEN': 'Hall Warden',
      'HALL_WARDEN_OFFICER': 'Hall Warden',
      'USAB_OFFICER': 'USAB',
      'USAB': 'USAB',
      'DARUSO_OFFICER': 'DARUSO',
      'DARUSO': 'DARUSO',
      'LIBRARY_OFFICER': 'Library',
      'LIBRARY': 'Library',
      'DEAN_OF_STUDENTS': 'Dean of Students',
      'SMART_CARD_OFFICER': 'Smart Card',
      'SMART_CARD': 'Smart Card',
      'WORKSHOP_OFFICER': 'Workshop',
      'WORKSHOP': 'Workshop',
      'PRINCIPAL': 'Principal',
      'FINANCE_OFFICER': 'Finance',
      'FINANCE': 'Finance',
      'ICT_OFFICER': 'ICT',
      'ICT': 'ICT',
      'DEPARTMENT_OFFICER': 'Department',
      'DEPARTMENT': 'Department',
      'LABORATORY_OFFICER': 'Laboratory',
      'LABORATORY': 'Laboratory',
      'ADMINISTRATOR': 'Administrator',
      'ADMIN': 'Administrator'
    };

    let role = map[backendRole] || (user.role as UserRole);

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
    this.storage.remove(this.currentUserKey);
    this.storage.remove(this.tokenKey);
    return of({});
  }

  changePassword(data: { currentPassword: string; newPassword: string }): Observable<any> {
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
    const token = this.getToken();
    if (!token) {
      return new HttpHeaders();
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  logoutLocal(): void {
    this.storage.remove(this.currentUserKey);
    this.storage.remove(this.tokenKey);
  }

  getCurrentUser(): any | null {
    const user = this.storage.get<any>(this.currentUserKey);
    if (!user) {
      return null;
    }

    const normalizedUser = {
      ...user,
      role: this.mapRole(user)
    };

    if (normalizedUser.role !== user.role) {
      this.storage.save(this.currentUserKey, normalizedUser);
    }

    return normalizedUser;
  }

  getToken(): string | null {
    const token = this.storage.get<string>(this.tokenKey);
    return token?.replace(/^"|"$/g, '') || null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.getCurrentUser();
  }

  updateCurrentUser(user: any): void {
    this.storage.save(this.currentUserKey, user);
    const users = this.getLocalUsers().map((saved) => saved.id === user.id ? user : saved);
    this.storage.save(this.usersKey, users);
  }

  private getLocalUsers(): any[] {
    return this.storage.get<any[]>(this.usersKey) ?? [];
  }
}
